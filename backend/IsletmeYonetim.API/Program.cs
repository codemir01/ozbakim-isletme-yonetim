using System.Text;
using System.Threading.RateLimiting;
using FluentValidation;
using FluentValidation.AspNetCore;
using Hangfire;
using Hangfire.PostgreSql;
using QuestPDF.Infrastructure;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Application.Validators;
using IsletmeYonetim.Infrastructure.Data;
using IsletmeYonetim.Infrastructure.Jobs;
using IsletmeYonetim.Infrastructure.Services;
using IsletmeYonetim.API.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// 1. Veritabanı bağlantısı
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. Hangfire — arka plan job'ları için PostgreSQL storage
var connStr = builder.Configuration.GetConnectionString("DefaultConnection")!;
builder.Services.AddHangfire(cfg => cfg
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(o => o.UseNpgsqlConnection(connStr)));
builder.Services.AddHangfireServer();

// 3. Servis kayıtları (DI)
// Multi-tenancy: aktif işletmeyi JWT'den okuyan sağlayıcı + HttpContext erişimi
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantProvider, IsletmeYonetim.API.Tenancy.TenantProvider>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<BakimBildirimJob>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IMusteriService, MusteriService>();
builder.Services.AddScoped<IUrunService, UrunService>();
builder.Services.AddScoped<ISatisService, SatisService>();
builder.Services.AddScoped<IBakimService, BakimService>();
builder.Services.AddScoped<IGorevService, GorevService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IKullaniciService, KullaniciService>();
builder.Services.AddScoped<IGelirGiderService, GelirGiderService>();
builder.Services.AddScoped<IFaturaService, FaturaService>();
builder.Services.AddScoped<IProfilService, ProfilService>();
builder.Services.AddScoped<IBildirimService, BildirimService>();
builder.Services.AddScoped<IOdemeService, IyzicoOdemeService>();
builder.Services.AddScoped<ILisansService, LisansService>();
builder.Services.AddScoped<IRaporService, RaporService>();
builder.Services.AddScoped<IIsletmeService, IsletmeService>();

// AI servisi için HttpClient — Python FastAPI port 8001'de çalışır
// BaseUrl appsettings.json > AiService bölümünden okunur (sabit kodlanmadı)
var aiBaseUrl = builder.Configuration["AiService:BaseUrl"] ?? "http://localhost:8001";
builder.Services.AddHttpClient("AiService", client =>
{
    client.BaseAddress = new Uri(aiBaseUrl);
    // Risk tahmini hızlıdır; ama fatura OCR (Gemini Vision) görsel analiz yaptığı için
    // daha uzun sürebilir → 30 sn timeout.
    client.Timeout = TimeSpan.FromSeconds(30);
});

// 4. FluentValidation — tüm validatorları Application katmanından otomatik kaydet
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<LoginRequestValidator>();

// 5. JWT kimlik doğrulama
var jwtSecret = builder.Configuration["JwtSettings:Secret"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false; // "sub" claim'ini ClaimTypes.NameIdentifier'a çevirme
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
            ValidAudience = builder.Configuration["JwtSettings:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            // JWT'deki "rol" claim'ini ASP.NET Core'un [Authorize(Roles="...")] özelliğine bağla
            RoleClaimType = "rol"
        };
    });

builder.Services.AddAuthorization();

// 6. JSON ayarları: enum'ları string olarak döndür
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// 7. CORS: Frontend'in erişimine izin ver
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// 8. Rate Limiting — login endpoint'e IP başına dakikada max 10 istek
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("login", context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        }));
    options.RejectionStatusCode = 429;
});

// 9. Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "İşletme Yönetim API", Version = "v1" });
});

var app = builder.Build();

// Python AI servisini arka planda başlat — port 8001 boşsa çalıştır
// AutoStart=false yapılırsa hiç denemez (örn. AI servisi ayrı çalıştırılıyorsa)
if (app.Configuration.GetValue("AiService:AutoStart", true))
{
    var aiHealthUrl = $"{aiBaseUrl.TrimEnd('/')}/health";
    var uvicornPath = app.Configuration["AiService:UvicornPath"];
    _ = Task.Run(async () =>
    {
        try
        {
            // Servis zaten ayakta mı kontrol et — ayaktaysa ikinci kez başlatma
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
            try { await http.GetAsync(aiHealthUrl); return; } catch { }

            var aiPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "ai-service");
            aiPath = Path.GetFullPath(aiPath);
            if (!Directory.Exists(aiPath)) return;

            // 1) appsettings'teki uvicorn.exe yolu varsa onu kullan
            // 2) yoksa taşınabilir "python -m uvicorn" komutuna düş (PATH'teki python yeter)
            var (fileName, arguments) =
                !string.IsNullOrWhiteSpace(uvicornPath) && File.Exists(uvicornPath)
                    ? (uvicornPath, "main:app --port 8001 --host 0.0.0.0")
                    : ("python", "-m uvicorn main:app --port 8001 --host 0.0.0.0");

            new System.Diagnostics.Process
            {
                StartInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = fileName,
                    Arguments = arguments,
                    WorkingDirectory = aiPath,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                }
            }.Start();
        }
        catch { /* Python/uvicorn kurulu değilse sessizce geç */ }
    });
}

// Middleware sırası (kritik)
app.UseMiddleware<ExceptionMiddleware>(); // Global hata yakalayıcı — en başta olmalı

// Yüklenen kanıt fotoğraflarını statik olarak servis et: /uploads/gorevler/xxx.jpg
// wwwroot yoksa oluştur; explicit PhysicalFileProvider ile WebRootPath null olsa da çalışır.
// Auth'tan ÖNCE — <img> etiketleri token göndermeden resmi yükleyebilsin.
var wwwrootYolu = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(Path.Combine(wwwrootYolu, "uploads", "gorevler"));
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(wwwrootYolu)
});

// Swagger sadece geliştirme ortamında açık
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "İşletme Yönetim API v1");
        c.RoutePrefix = "swagger"; // http://localhost:5096/swagger adresinden aç
    });
}

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Hangfire Dashboard — http://localhost:5096/hangfire adresinden izlenebilir
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = [new Hangfire.Dashboard.LocalRequestsOnlyAuthorizationFilter()]
});

// Her gün sabah 08:00'de yaklaşan bakımları e-posta ile bildir (Cron ifadesi: "0 8 * * *")
RecurringJob.AddOrUpdate<BakimBildirimJob>(
    "bakim-bildirimi",
    job => job.YaklasanBakimlariGonderAsync(),
    "0 8 * * *");

// Tabloları oluştur (yoksa), varsa dokunma
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    db.Database.EnsureCreated();

    // === MULTI-TENANCY bootstrap ===
    // Isletmeler (tenant) tablosu + tüm tenant tablolarına IsletmeId kolonu (idempotent)
    // + sabit bir DEMO işletmesi. Mevcut demo verisi bu işletmeye bağlanır (en sonda backfill).
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS "Isletmeler" (
            "Id"              UUID      NOT NULL PRIMARY KEY,
            "Ad"              TEXT      NOT NULL,
            "AdminEposta"     TEXT      NOT NULL,
            "OlusturmaTarihi" TIMESTAMP NOT NULL DEFAULT NOW()
        );

        ALTER TABLE "Isletmeler"        ADD COLUMN IF NOT EXISTS "Enlem" DOUBLE PRECISION;
        ALTER TABLE "Isletmeler"        ADD COLUMN IF NOT EXISTS "Boylam" DOUBLE PRECISION;

        ALTER TABLE "Kullanicilar"      ADD COLUMN IF NOT EXISTS "IsletmeId" UUID;
        ALTER TABLE "Kullanicilar"      ADD COLUMN IF NOT EXISTS "IlkGiris" BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE "Musteriler"        ADD COLUMN IF NOT EXISTS "IsletmeId" UUID;
        ALTER TABLE "Urunler"           ADD COLUMN IF NOT EXISTS "IsletmeId" UUID;
        ALTER TABLE "Satislar"          ADD COLUMN IF NOT EXISTS "IsletmeId" UUID;
        ALTER TABLE "BakimServisler"    ADD COLUMN IF NOT EXISTS "IsletmeId" UUID;
        ALTER TABLE "BakimGecmisi"      ADD COLUMN IF NOT EXISTS "IsletmeId" UUID;
        ALTER TABLE "Gorevler"          ADD COLUMN IF NOT EXISTS "IsletmeId" UUID;
        ALTER TABLE "PersonelMusteriler" ADD COLUMN IF NOT EXISTS "IsletmeId" UUID;
        ALTER TABLE "BorcTahsilatlar"   ADD COLUMN IF NOT EXISTS "IsletmeId" UUID;
        ALTER TABLE "GelirGiderler"     ADD COLUMN IF NOT EXISTS "IsletmeId" UUID;

        INSERT INTO "Isletmeler" ("Id","Ad","AdminEposta","OlusturmaTarihi")
        SELECT '11111111-1111-1111-1111-111111111111','Demo İşletme','admin@isletme.com',NOW()
        WHERE NOT EXISTS (SELECT 1 FROM "Isletmeler" WHERE "Id" = '11111111-1111-1111-1111-111111111111');
    """);

    // Faturalar tablosunu doğru şemayla oluştur (yoksa)
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS "Faturalar" (
            "Id"              UUID      NOT NULL PRIMARY KEY,
            "FaturaNo"        TEXT      NOT NULL,
            "SatisId"         UUID      NOT NULL REFERENCES "Satislar"("Id"),
            "KullaniciId"     UUID      NOT NULL REFERENCES "Kullanicilar"("Id"),
            "OlusturmaTarihi" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        ALTER TABLE "Faturalar" ADD COLUMN IF NOT EXISTS "IsletmeId" UUID;
    """);

    // Demo kullanıcıları ekle (yoksa) — runtime'da BCrypt ile hash üret. Hepsi DEMO işletmesine bağlı.
    var adminHash = global::BCrypt.Net.BCrypt.HashPassword("Admin123!");
    var satisHash = global::BCrypt.Net.BCrypt.HashPassword("Satis123!");
    var tekniHash = global::BCrypt.Net.BCrypt.HashPassword("Teknis123!");

    db.Database.ExecuteSql($"""
        INSERT INTO "Kullanicilar" ("Id","IsletmeId","Ad","Soyad","Eposta","SifreHash","Rol","Unvan","AktifMi","OlusturmaTarihi")
        SELECT 'a1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Ahmet','Yılmaz','admin@isletme.com',{adminHash},'Admin','Yönetici',TRUE,NOW()
        WHERE NOT EXISTS (SELECT 1 FROM "Kullanicilar" WHERE "Eposta" = 'admin@isletme.com');

        INSERT INTO "Kullanicilar" ("Id","IsletmeId","Ad","Soyad","Eposta","SifreHash","Rol","Unvan","AktifMi","OlusturmaTarihi")
        SELECT 'b1000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Ayşe','Kaya','satis@isletme.com',{satisHash},'SalesConsultant','Satış Danışmanı',TRUE,NOW()
        WHERE NOT EXISTS (SELECT 1 FROM "Kullanicilar" WHERE "Eposta" = 'satis@isletme.com');

        INSERT INTO "Kullanicilar" ("Id","IsletmeId","Ad","Soyad","Eposta","SifreHash","Rol","Unvan","AktifMi","OlusturmaTarihi")
        SELECT 'c1000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Mehmet','Demir','teknisyen@isletme.com',{tekniHash},'Technician','Saha Teknisyeni',TRUE,NOW()
        WHERE NOT EXISTS (SELECT 1 FROM "Kullanicilar" WHERE "Eposta" = 'teknisyen@isletme.com');
    """);

    // Mevcut DB'ye yeni kolonları ve indexleri ekle (IF NOT EXISTS — idempotent, defalarca çalışabilir)
    db.Database.ExecuteSqlRaw("""
        ALTER TABLE "Musteriler" ADD COLUMN IF NOT EXISTS "SilindiMi" BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE "Urunler"    ADD COLUMN IF NOT EXISTS "SilindiMi" BOOLEAN NOT NULL DEFAULT FALSE;

        CREATE INDEX IF NOT EXISTS "ix_musteriler_silinmedi"     ON "Musteriler"    ("SilindiMi");
        CREATE INDEX IF NOT EXISTS "ix_urunler_silinmedi"        ON "Urunler"       ("SilindiMi");
        CREATE INDEX IF NOT EXISTS "ix_satislar_musteriid"       ON "Satislar"      ("MusteriId");
        CREATE INDEX IF NOT EXISTS "ix_bakimservisler_tarih"     ON "BakimServisler"("BakimYapilacakTarih");
        CREATE INDEX IF NOT EXISTS "ix_gorevler_durum"           ON "Gorevler"      ("Durum");
        CREATE INDEX IF NOT EXISTS "ix_borctahsilatlar_musteriid" ON "BorcTahsilatlar"("MusteriId");
    """);

    // Gorevler tablosuna MusteriId + teknisyen kanıt fotoğrafı kolonları (yoksa — idempotent)
    db.Database.ExecuteSqlRaw("""
        ALTER TABLE "Gorevler" ADD COLUMN IF NOT EXISTS "MusteriId" UUID;
        ALTER TABLE "Gorevler" ADD COLUMN IF NOT EXISTS "TamamlanmaFotografi" TEXT;
        ALTER TABLE "Gorevler" ADD COLUMN IF NOT EXISTS "TamamlanmaTarihi" TIMESTAMPTZ;
    """);

    // Eski DB'lerde "OlusturanId" kolonu artık entity'de olmadığı halde NOT NULL kalmış
    // olabilir. EF bu kolonu bilmediği için INSERT'e koymaz → kayıt eklerken
    // "null value violates not-null" hatası verir. BorcTahsilatlar VE GelirGiderler
    // tablolarında bu kısıtı kaldır (varsa) — idempotent.
    db.Database.ExecuteSqlRaw("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'BorcTahsilatlar' AND column_name = 'OlusturanId') THEN
                ALTER TABLE "BorcTahsilatlar" ALTER COLUMN "OlusturanId" DROP NOT NULL;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'GelirGiderler' AND column_name = 'OlusturanId') THEN
                ALTER TABLE "GelirGiderler" ALTER COLUMN "OlusturanId" DROP NOT NULL;
            END IF;
        END $$;
    """);

    // Bildirimler tablosunu oluştur (yoksa)
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS "Bildirimler" (
            "Id"              UUID      NOT NULL PRIMARY KEY,
            "KullaniciId"     UUID      NOT NULL REFERENCES "Kullanicilar"("Id"),
            "Mesaj"           TEXT      NOT NULL,
            "Tip"             TEXT      NOT NULL DEFAULT 'Bilgi',
            "OkunduMu"        BOOLEAN   NOT NULL DEFAULT FALSE,
            "OlusturmaTarihi" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS "ix_bildirimler_kullanici_okundu"
            ON "Bildirimler"("KullaniciId","OkunduMu");
        ALTER TABLE "Bildirimler" ADD COLUMN IF NOT EXISTS "IsletmeId" UUID;
    """);

    // Lisans tablosunu oluştur ve demo lisansı ekle (yoksa)
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS "Lisanslar" (
            "Id"              UUID      NOT NULL PRIMARY KEY,
            "IsletmeAdi"      TEXT      NOT NULL,
            "AdminEposta"     TEXT      NOT NULL,
            "BaslangicTarihi" TIMESTAMP NOT NULL,
            "BitisTarihi"     TIMESTAMP NOT NULL,
            "Aktif"           BOOLEAN   NOT NULL DEFAULT TRUE
        );
        ALTER TABLE "Lisanslar" ADD COLUMN IF NOT EXISTS "IsletmeId" UUID;

        INSERT INTO "Lisanslar" ("Id","IsletmeId","IsletmeAdi","AdminEposta","BaslangicTarihi","BitisTarihi","Aktif")
        SELECT gen_random_uuid(),'11111111-1111-1111-1111-111111111111','Demo İşletme','admin@isletme.com',NOW(),NOW() + INTERVAL '2 years',TRUE
        WHERE NOT EXISTS (SELECT 1 FROM "Lisanslar");
    """);

    // === MULTI-TENANCY backfill ===
    // Mevcut (tenant'sız) tüm satırları DEMO işletmesine bağla. Idempotent — sadece NULL olanlar.
    db.Database.ExecuteSqlRaw("""
        UPDATE "Kullanicilar"       SET "IsletmeId" = '11111111-1111-1111-1111-111111111111' WHERE "IsletmeId" IS NULL;
        UPDATE "Musteriler"         SET "IsletmeId" = '11111111-1111-1111-1111-111111111111' WHERE "IsletmeId" IS NULL;
        UPDATE "Urunler"            SET "IsletmeId" = '11111111-1111-1111-1111-111111111111' WHERE "IsletmeId" IS NULL;
        UPDATE "Satislar"           SET "IsletmeId" = '11111111-1111-1111-1111-111111111111' WHERE "IsletmeId" IS NULL;
        UPDATE "BakimServisler"     SET "IsletmeId" = '11111111-1111-1111-1111-111111111111' WHERE "IsletmeId" IS NULL;
        UPDATE "BakimGecmisi"       SET "IsletmeId" = '11111111-1111-1111-1111-111111111111' WHERE "IsletmeId" IS NULL;
        UPDATE "Gorevler"           SET "IsletmeId" = '11111111-1111-1111-1111-111111111111' WHERE "IsletmeId" IS NULL;
        UPDATE "PersonelMusteriler" SET "IsletmeId" = '11111111-1111-1111-1111-111111111111' WHERE "IsletmeId" IS NULL;
        UPDATE "BorcTahsilatlar"    SET "IsletmeId" = '11111111-1111-1111-1111-111111111111' WHERE "IsletmeId" IS NULL;
        UPDATE "GelirGiderler"      SET "IsletmeId" = '11111111-1111-1111-1111-111111111111' WHERE "IsletmeId" IS NULL;
        UPDATE "Faturalar"          SET "IsletmeId" = '11111111-1111-1111-1111-111111111111' WHERE "IsletmeId" IS NULL;
        UPDATE "Bildirimler"        SET "IsletmeId" = '11111111-1111-1111-1111-111111111111' WHERE "IsletmeId" IS NULL;
        UPDATE "Lisanslar"          SET "IsletmeId" = '11111111-1111-1111-1111-111111111111' WHERE "IsletmeId" IS NULL;
    """);
}

app.Run();
