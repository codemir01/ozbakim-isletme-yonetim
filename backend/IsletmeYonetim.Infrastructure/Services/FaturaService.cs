using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Domain.Entities;
using IsletmeYonetim.Infrastructure.Data;
using IsletmeYonetim.Infrastructure.PDF;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;

namespace IsletmeYonetim.Infrastructure.Services;

public class FaturaService(AppDbContext db) : IFaturaService
{
    public async Task<ApiResponse<List<FaturaListeDto>>> GetListeAsync()
    {
        var faturalar = await db.Faturalar
            .Include(f => f.Satis).ThenInclude(s => s.Musteri)
            .Include(f => f.Satis).ThenInclude(s => s.Urun)
            .Include(f => f.Kullanici)
            .OrderByDescending(f => f.OlusturmaTarihi)
            .AsNoTracking()
            .ToListAsync();

        var liste = faturalar.Select(f => new FaturaListeDto(
            f.Id,
            f.Satis.Musteri != null ? f.Satis.Musteri.Ad + " " + f.Satis.Musteri.Soyad : "Bilinmiyor",
            f.Satis.Urun?.UrunAdi ?? "Bilinmiyor",
            f.Satis.SatisFiyati,
            f.Satis.SatisTarihi,
            f.Kullanici != null ? f.Kullanici.Ad + " " + f.Kullanici.Soyad : "Bilinmiyor",
            f.OlusturmaTarihi
        )).ToList();

        return new ApiResponse<List<FaturaListeDto>>(true, liste, null, null);
    }

    public async Task<ApiResponse<FaturaDetayDto>> GetByIdAsync(Guid id)
    {
        var fatura = await db.Faturalar
            .Include(f => f.Satis).ThenInclude(s => s.Musteri)
            .Include(f => f.Satis).ThenInclude(s => s.Urun)
            .Include(f => f.Kullanici)
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == id);

        if (fatura is null)
            return new ApiResponse<FaturaDetayDto>(false, null, "Fatura bulunamadı.", null);

        var musteri = fatura.Satis.Musteri;
        var urun = fatura.Satis.Urun;

        var dto = new FaturaDetayDto(
            fatura.Id,
            fatura.SatisId,
            musteri?.Ad ?? "",
            musteri?.Soyad ?? "",
            musteri?.Telefon ?? "",
            musteri?.Adres ?? "",
            urun?.UrunAdi ?? "Bilinmiyor",
            urun?.Kategori.ToString() ?? "",
            fatura.Satis.SatisFiyati,
            fatura.Satis.SatisTarihi,
            fatura.Satis.BakimTakibiAktif,
            fatura.Kullanici != null ? fatura.Kullanici.Ad + " " + fatura.Kullanici.Soyad : "Bilinmiyor",
            fatura.OlusturmaTarihi
        );

        return new ApiResponse<FaturaDetayDto>(true, dto, null, null);
    }

    public async Task<ApiResponse<FaturaListeDto>> CreateAsync(FaturaOlusturRequest request, Guid kullaniciId)
    {
        // İş kuralı: aynı satış için ikinci fatura kesilemez
        var mevcutFatura = await db.Faturalar.FirstOrDefaultAsync(f => f.SatisId == request.SatisId);
        if (mevcutFatura is not null)
            return new ApiResponse<FaturaListeDto>(false, null, "Bu satış için zaten fatura oluşturulmuş.", null);

        var satis = await db.Satislar
            .Include(s => s.Musteri)
            .Include(s => s.Urun)
            .FirstOrDefaultAsync(s => s.Id == request.SatisId);

        if (satis is null)
            return new ApiResponse<FaturaListeDto>(false, null, "Satış bulunamadı.", null);

        var kullanici = await db.Kullanicilar.FindAsync(kullaniciId);
        if (kullanici is null)
            return new ApiResponse<FaturaListeDto>(false, null, "Kullanıcı bulunamadı.", null);

        var fatura = new Fatura
        {
            SatisId = request.SatisId,
            KullaniciId = kullaniciId
        };

        db.Faturalar.Add(fatura);
        await db.SaveChangesAsync();

        var dto = new FaturaListeDto(
            fatura.Id,
            satis.Musteri != null ? satis.Musteri.Ad + " " + satis.Musteri.Soyad : "Bilinmiyor",
            satis.Urun?.UrunAdi ?? "Bilinmiyor",
            satis.SatisFiyati,
            satis.SatisTarihi,
            kullanici.Ad + " " + kullanici.Soyad,
            fatura.OlusturmaTarihi
        );

        return new ApiResponse<FaturaListeDto>(true, dto, null, "Fatura oluşturuldu.");
    }

    static FaturaService()
    {
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
    }

    public async Task<byte[]?> GetPdfAsync(Guid id)
    {
        var result = await GetByIdAsync(id);
        if (!result.Basarili || result.Veri is null) return null;

        return new FaturaPdfDocument(result.Veri).GeneratePdf();
    }
}
