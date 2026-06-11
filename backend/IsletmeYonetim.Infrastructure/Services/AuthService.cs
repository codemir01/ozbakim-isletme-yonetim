using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Domain.Entities;
using IsletmeYonetim.Domain.Enums;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IsletmeYonetim.Infrastructure.Services;

public class AuthService(AppDbContext db, IJwtService jwtService, ILisansService lisansService) : IAuthService
{
    // Deneme lisansı süresi (gün)
    private const int DenemeGun = 14;

    public async Task<ApiResponse<LoginResponse>> KayitAsync(KayitRequest request)
    {
        // 1. Temel doğrulama
        if (string.IsNullOrWhiteSpace(request.IsletmeAdi) || string.IsNullOrWhiteSpace(request.Eposta) ||
            string.IsNullOrWhiteSpace(request.Sifre) || string.IsNullOrWhiteSpace(request.Ad))
            return new ApiResponse<LoginResponse>(false, null, "Lütfen tüm alanları doldurun.", null);

        if (request.Sifre.Length < 6)
            return new ApiResponse<LoginResponse>(false, null, "Şifre en az 6 karakter olmalı.", null);

        var eposta = request.Eposta.Trim().ToLower();

        // 2. E-posta sistemde GLOBAL benzersiz olmalı (1 e-posta = 1 işletme) → filtreyi atla
        var varMi = await db.Kullanicilar.IgnoreQueryFilters().AnyAsync(k => k.Eposta == eposta);
        if (varMi)
            return new ApiResponse<LoginResponse>(false, null, "Bu e-posta zaten kayıtlı.", null);

        // 3. Yeni işletme (tenant) oluştur
        var isletme = new Isletme { Ad = request.IsletmeAdi.Trim(), AdminEposta = eposta };

        // 4. İlk admin kullanıcı — IsletmeId ELLE atanır (kayıt anonim, aktif tenant yok)
        var admin = new Kullanici
        {
            IsletmeId = isletme.Id,
            Ad = request.Ad.Trim(),
            Soyad = request.Soyad?.Trim() ?? "",
            Eposta = eposta,
            SifreHash = BCrypt.Net.BCrypt.HashPassword(request.Sifre),
            Rol = Rol.Admin,
            Unvan = "Yönetici",
            AktifMi = true,
        };

        // 5. 14 günlük deneme lisansı
        var lisans = new Lisans
        {
            IsletmeId = isletme.Id,
            IsletmeAdi = isletme.Ad,
            AdminEposta = eposta,
            BaslangicTarihi = DateTime.UtcNow,
            BitisTarihi = DateTime.UtcNow.AddDays(DenemeGun),
            Aktif = true,
        };

        db.Isletmeler.Add(isletme);
        db.Kullanicilar.Add(admin);
        db.Lisanslar.Add(lisans);
        await db.SaveChangesAsync();

        // 6. Otomatik giriş — token üret
        var token = jwtService.TokenOlustur(admin);
        var response = new LoginResponse(token, admin.Ad, admin.Soyad, admin.Rol.ToString(), admin.Id);
        return new ApiResponse<LoginResponse>(true, response, null, $"İşletmeniz oluşturuldu. {DenemeGun} günlük deneme başladı.");
    }


    public async Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request)
    {
        // 1. E-posta ile aktif kullanıcıyı bul.
        // DİKKAT: Login anında JWT (dolayısıyla tenant) henüz yok → global filtreyi ATLA.
        // E-posta sistemde GLOBAL benzersizdir (1 e-posta = 1 işletme), o yüzden tek kullanıcı döner.
        var kullanici = await db.Kullanicilar
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(k => k.Eposta == request.Eposta && k.AktifMi);

        // 2. Kullanıcı yoksa veya şifre yanlışsa genel hata döndür
        // BCrypt.Verify: düz metni hash ile karşılaştırır — güvenli
        if (kullanici is null || !BCrypt.Net.BCrypt.Verify(request.Sifre, kullanici.SifreHash))
            return new ApiResponse<LoginResponse>(false, null, "E-posta veya şifre hatalı.", null);

        // 3. Kullanıcının işletmesinin lisansı geçerli mi?
        if (!await lisansService.LisansGecerliMiAsync(kullanici.IsletmeId))
            return new ApiResponse<LoginResponse>(false, null, "Lisansınız sona erdi. Lütfen yöneticinizle iletişime geçin.", null);

        // 3. JWT token üret — içinde kullanıcı ID ve rolü şifreli şekilde taşır
        var token = jwtService.TokenOlustur(kullanici);

        var response = new LoginResponse(
            token,
            kullanici.Ad,
            kullanici.Soyad,
            kullanici.Rol.ToString(),
            kullanici.Id,
            kullanici.IlkGiris
        );

        return new ApiResponse<LoginResponse>(true, response, null, "Giriş başarılı.");
    }
}
