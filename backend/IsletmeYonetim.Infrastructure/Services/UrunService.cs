using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Domain.Entities;
using IsletmeYonetim.Domain.Enums;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IsletmeYonetim.Infrastructure.Services;

public class UrunService(AppDbContext db) : IUrunService
{
    public async Task<ApiResponse<List<UrunListeDto>>> GetUrunlerAsync()
    {
        var liste = await db.Urunler
            .Where(u => !u.SilindiMi)
            .Select(u => new UrunListeDto(
                u.Id, u.UrunAdi, u.Kategori.ToString(),
                u.StokKodu, u.StokAdedi, u.AlisFiyati, u.Durum.ToString()))
            .ToListAsync();

        return new ApiResponse<List<UrunListeDto>>(true, liste, null, null);
    }

    public async Task<ApiResponse<UrunListeDto>> CreateUrunAsync(UrunOlusturRequest request)
    {
        var urun = new Urun
        {
            UrunAdi = request.UrunAdi,
            Kategori = request.Kategori,
            StokKodu = request.StokKodu,
            StokAdedi = request.StokAdedi,
            AlisFiyati = request.AlisFiyati
        };

        db.Urunler.Add(urun);
        await db.SaveChangesAsync();

        var dto = new UrunListeDto(urun.Id, urun.UrunAdi, urun.Kategori.ToString(),
            urun.StokKodu, urun.StokAdedi, urun.AlisFiyati, urun.Durum.ToString());

        return new ApiResponse<UrunListeDto>(true, dto, null, "Ürün oluşturuldu.");
    }

    public async Task<ApiResponse<object>> UpdateUrunAsync(Guid id, UrunGuncelleRequest request)
    {
        var urun = await db.Urunler.FindAsync(id);
        if (urun is null)
            return new ApiResponse<object>(false, null, "Ürün bulunamadı.", null);

        urun.UrunAdi = request.UrunAdi;
        urun.Kategori = request.Kategori;
        urun.StokKodu = request.StokKodu;
        urun.StokAdedi = request.StokAdedi;
        urun.AlisFiyati = request.AlisFiyati;
        urun.Durum = request.Durum;

        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Ürün güncellendi.");
    }

    public async Task<ApiResponse<object>> DeleteUrunAsync(Guid id)
    {
        var urun = await db.Urunler.FirstOrDefaultAsync(u => u.Id == id && !u.SilindiMi);
        if (urun is null)
            return new ApiResponse<object>(false, null, "Ürün bulunamadı.", null);

        // Soft delete — satış kaydı olan ürünler de güvenle işaretlenebilir
        urun.SilindiMi = true;
        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Ürün silindi.");
    }

    public async Task<ApiResponse<object>> GetOzetAsync()
    {
        // SilindiMi = true olan ürünler soft-delete ile kaldırılmış sayılır — sayıma dahil etme
        var ozet = await db.Urunler
            .Where(u => !u.SilindiMi)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Toplam = g.Count(),
                Cihaz = g.Count(u => u.Kategori == UrunKategori.Cihaz),
                YedekParca = g.Count(u => u.Kategori == UrunKategori.YedekParca)
            })
            .FirstOrDefaultAsync();

        var toplam = ozet?.Toplam ?? 0;
        var cihaz = ozet?.Cihaz ?? 0;
        var yedekParca = ozet?.YedekParca ?? 0;

        return new ApiResponse<object>(true, new { toplam, cihaz, yedekParca }, null, null);
    }
}
