using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Domain.Entities;
using IsletmeYonetim.Domain.Enums;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace IsletmeYonetim.Infrastructure.Services;

public class GorevService(AppDbContext db, IBildirimService bildirimService, ILogger<GorevService> logger) : IGorevService
{
    public async Task<ApiResponse<List<GorevListeDto>>> GetGorevlerAsync()
    {
        var bugun = DateTime.UtcNow.Date;

        // Navigation property'leri önce yükle, sonra C#'ta işle
        // (LINQ-to-SQL'de navigation property null kontrolü sorun çıkarır)
        var gorevler = await db.Gorevler
            .Include(g => g.Atanan)
            .Include(g => g.Musteri)
            .OrderBy(g => g.SonTeslimTarihi)
            .AsNoTracking()
            .ToListAsync();

        var liste = gorevler.Select(g => new GorevListeDto(
            g.Id,
            g.GorevAdi,
            g.GorevDetayi,
            g.Oncelik.ToString(),
            g.Durum.ToString(),
            g.Atanan != null ? g.Atanan.Ad + " " + g.Atanan.Soyad : "Bilinmiyor",
            g.Musteri != null ? g.Musteri.Ad + " " + g.Musteri.Soyad : "Bilinmiyor",
            g.SonTeslimTarihi,
            g.OlusturmaTarihi,
            // Gecikti: son teslim tarihi geçmiş VE hâlâ tamamlanmamış
            g.SonTeslimTarihi.Date < bugun && g.Durum != GorevDurum.Tamamlandi,
            g.TamamlanmaFotografi,
            g.TamamlanmaTarihi
        )).ToList();

        return new ApiResponse<List<GorevListeDto>>(true, liste, null, null);
    }

    public async Task<ApiResponse<object>> CreateGorevAsync(GorevOlusturRequest request, Guid olusturanId)
    {
        // Frontend string gönderir ("Yuksek"), biz enum'a dönüştürürüz
        // TryParse: geçersizse crash olmaz, false döner
        if (!Enum.TryParse<GorevOncelik>(request.Oncelik, true, out var oncelik))
            return ApiResponse<object>.HataDon("Geçersiz öncelik değeri.");

        // Atanan personel bu işletmede ve aktif mi? (global filtre tenant'ı zaten uygular)
        // Doğrulamazsak geçersiz/başka tenant'ın Id'si FK kısıtını patlatıp 500 verir.
        if (!await db.Kullanicilar.AnyAsync(k => k.Id == request.AtananId && k.AktifMi))
            return ApiResponse<object>.HataDon("Atanan personel bulunamadı veya pasif.");

        // Müşteri opsiyonel — boş (Guid.Empty) gelirse "müşteri yok" demektir → null sakla.
        // Dolu geldiyse gerçekten bu işletmede mi diye doğrula (yoksa FK 500 verir).
        Guid? musteriId = request.MusteriId == Guid.Empty ? null : request.MusteriId;
        if (musteriId is { } mid && !await db.Musteriler.AnyAsync(m => m.Id == mid && !m.SilindiMi))
            return ApiResponse<object>.HataDon("Seçilen müşteri bulunamadı.");

        var gorev = new Gorev
        {
            GorevAdi = request.GorevAdi,
            GorevDetayi = request.GorevDetayi,
            Oncelik = oncelik,
            AtananId = request.AtananId,
            MusteriId = musteriId,
            SonTeslimTarihi = DateTime.SpecifyKind(request.SonTeslimTarihi, DateTimeKind.Utc),
            OlusturanId = olusturanId, // JWT'den gelen kullanıcı ID'si
            Durum = GorevDurum.Bekliyor
        };

        db.Gorevler.Add(gorev);
        await db.SaveChangesAsync();

        // Atanan kişiye bildirim gönder — hata olursa görev kaydını engellesin
        try
        {
            if (request.AtananId != olusturanId)
            {
                await bildirimService.CreateAsync(
                    request.AtananId,
                    $"Size yeni bir görev atandı: {request.GorevAdi}",
                    Domain.Entities.BildirimTip.Bilgi);
            }
        }
        catch (Exception ex)
        {
            // Bildirim hatası görev oluşturmayı engellemesin — ama sessizce yutma, logla.
            logger.LogWarning(ex, "Görev bildirimi gönderilemedi. AtananId={AtananId}", request.AtananId);
        }

        return ApiResponse<object>.Basari("Görev oluşturuldu.");
    }

    public async Task<ApiResponse<object>> UpdateDurumAsync(Guid id, GorevDurumGuncelleRequest request)
    {
        // FirstOrDefaultAsync tenant filtresini uygular (FindAsync ATLAR) → başka işletmenin görevi güncellenemez
        var gorev = await db.Gorevler.FirstOrDefaultAsync(g => g.Id == id);
        if (gorev is null)
            return new ApiResponse<object>(false, null, "Görev bulunamadı.", null);

        if (!Enum.TryParse<GorevDurum>(request.Durum, true, out var yeniDurum))
            return new ApiResponse<object>(false, null, "Geçersiz durum değeri.", null);

        gorev.Durum = yeniDurum;
        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Durum güncellendi.");
    }

    // Teknisyen görevi kanıt fotoğrafıyla tamamlar: fotoğraf yolu kaydedilir, durum Tamamlandi olur.
    public async Task<ApiResponse<object>> TamamlaAsync(Guid id, string fotografYolu)
    {
        // FirstOrDefaultAsync tenant filtresini uygular (FindAsync ATLAR) → başka işletmenin görevi tamamlanamaz
        var gorev = await db.Gorevler.FirstOrDefaultAsync(g => g.Id == id);
        if (gorev is null)
            return new ApiResponse<object>(false, null, "Görev bulunamadı.", null);

        gorev.Durum = GorevDurum.Tamamlandi;
        gorev.TamamlanmaFotografi = fotografYolu;
        gorev.TamamlanmaTarihi = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Görev fotoğrafla tamamlandı.");
    }

    public async Task<ApiResponse<List<PersonelOzetDto>>> GetPersonellerAsync()
    {
        // Görev atama formunda dropdown için aktif personel listesi
        var personeller = await db.Kullanicilar
            .Where(k => k.AktifMi)
            .OrderBy(k => k.Ad)
            .Select(k => new PersonelOzetDto(k.Id, k.Ad + " " + k.Soyad, k.Rol.ToString()))
            .ToListAsync();

        return new ApiResponse<List<PersonelOzetDto>>(true, personeller, null, null);
    }
}
