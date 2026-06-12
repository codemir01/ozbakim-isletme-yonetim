using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Domain.Entities;
using IsletmeYonetim.Domain.Enums;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IsletmeYonetim.Infrastructure.Services;

public class BakimService(AppDbContext db) : IBakimService
{
    public async Task<ApiResponse<List<BakimListeDto>>> GetBakimlarAsync()
    {
        var bugun = DateTime.UtcNow.Date;

        // Navigation property null olabilir, önce yükle sonra C#'ta işle
        // AsNoTracking: sadece okuma işlemi, EF Core change tracker'ı kullanmaya gerek yok
        var bakimlar = await db.BakimServisler
            .Include(b => b.Musteri)
            .OrderBy(b => b.BakimYapilacakTarih)
            .AsNoTracking()
            .ToListAsync();

        var liste = bakimlar.Select(b => new BakimListeDto(
            b.Id,
            b.Musteri != null ? b.Musteri.Ad + " " + b.Musteri.Soyad : "Bilinmiyor",
            b.Musteri?.Telefon ?? "-",
            b.KartTipi.ToString(),
            b.SonBakimTarihi,
            b.BakimYapilacakTarih,
            b.Notlar,
            (int)(b.BakimYapilacakTarih.Date - bugun).TotalDays, // Negatifse geçmiş
            b.BakimYapilacakTarih.Date < bugun,                  // Tarih geçtiyse Gecmis = true
            b.Musteri?.Adres ?? "",
            b.Musteri?.Enlem,
            b.Musteri?.Boylam
        )).ToList();

        return new ApiResponse<List<BakimListeDto>>(true, liste, null, null);
    }

    public async Task<ApiResponse<BakimDetayDto>> GetBakimByIdAsync(Guid id)
    {
        var bugun = DateTime.UtcNow.Date;

        // Detay sayfası için bakım geçmişini de yükle
        var bakim = await db.BakimServisler
            .Include(b => b.Musteri)
            .Include(b => b.Satis)            // Cihaz yaşı için montaj tarihini taşır (varsa)
            .Include(b => b.BakimGecmisi)
                .ThenInclude(g => g.YapanPersonel)
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id);

        if (bakim is null)
            return new ApiResponse<BakimDetayDto>(false, null, "Kayıt bulunamadı.", null);

        var dto = new BakimDetayDto(
            bakim.Id,
            bakim.Musteri != null ? $"{bakim.Musteri.Ad} {bakim.Musteri.Soyad}" : "Bilinmiyor",
            bakim.Musteri?.Telefon ?? "-",
            bakim.KartTipi.ToString(),
            bakim.SonBakimTarihi,
            bakim.BakimYapilacakTarih,
            bakim.Notlar,
            (int)(bakim.BakimYapilacakTarih.Date - bugun).TotalDays,
            bakim.BakimYapilacakTarih.Date < bugun,
            bakim.Musteri?.Adres ?? "",
            bakim.Musteri?.Enlem,
            bakim.Musteri?.Boylam,
            bakim.Satis?.MontajTarihi, // Satıştan oluşan kartlarda cihazın kurulum tarihi
            // Geçmişi en yeniden eskiye sırala
            bakim.BakimGecmisi
                .OrderByDescending(g => g.YapilmaTarihi)
                .Select(g => new BakimGecmisDto(
                    g.Id,
                    g.YapanPersonel != null ? $"{g.YapanPersonel.Ad} {g.YapanPersonel.Soyad}" : "Bilinmiyor",
                    g.YapilmaTarihi,
                    g.Aciklama))
                .ToList()
        );

        return new ApiResponse<BakimDetayDto>(true, dto, null, null);
    }

    public async Task<ApiResponse<object>> GecmisEkleAsync(Guid id, BakimGecmisEkleRequest request, Guid personelId)
    {
        // FirstOrDefaultAsync tenant filtresini uygular (FindAsync ATLAR) → başka işletmenin bakım kartına geçmiş eklenemez
        var bakim = await db.BakimServisler.FirstOrDefaultAsync(b => b.Id == id);
        if (bakim is null)
            return new ApiResponse<object>(false, null, "Kayıt bulunamadı.", null);

        // Tarih UTC formatında saklanmalı — frontend ISO string gönderir (DateTimeKind.Unspecified olabilir)
        var yapilmaTarihiUtc = DateTime.SpecifyKind(request.YapilmaTarihi, DateTimeKind.Utc);

        // Yeni bakım geçmiş kaydı oluştur
        var gecmis = new BakimGecmis
        {
            BakimServisId = id,
            YapanPersonelId = personelId,
            YapilmaTarihi = yapilmaTarihiUtc,
            Aciklama = request.Aciklama
        };

        db.BakimGecmisi.Add(gecmis);

        // İş kuralı: Bakım yapılınca kart otomatik güncellenir
        bakim.SonBakimTarihi = yapilmaTarihiUtc;
        bakim.BakimYapilacakTarih = yapilmaTarihiUtc.AddDays(request.YeniBakimAraligiGun);

        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Bakım geçmişi eklendi.");
    }

    public async Task<ApiResponse<object>> CreateManuelBakimAsync(ManuelBakimOlusturRequest request)
    {
        // String'i enum'a dönüştür — geçersiz değer gelirse hata döndür
        if (!Enum.TryParse<KartTipi>(request.KartTipi, true, out var kartTipi))
            return new ApiResponse<object>(false, null, "Geçersiz kart tipi değeri.", null);

        var bakim = new BakimServis
        {
            MusteriId = request.MusteriId,
            KartTipi = kartTipi,
            SonBakimTarihi = request.SonBakimTarihi,
            BakimYapilacakTarih = request.SonBakimTarihi.AddDays(request.BakimAraligiGun),
            Notlar = request.Notlar
            // SatisId yok — manuel kart, satışa bağlı değil
        };

        db.BakimServisler.Add(bakim);
        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Bakım kartı oluşturuldu.");
    }
}
