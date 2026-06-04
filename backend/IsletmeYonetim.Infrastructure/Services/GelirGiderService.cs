using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Domain.Entities;
using IsletmeYonetim.Domain.Enums;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IsletmeYonetim.Infrastructure.Services;

public class GelirGiderService(AppDbContext db) : IGelirGiderService
{
    public async Task<ApiResponse<List<GelirGiderListeDto>>> GetListeAsync()
    {
        var liste = await db.GelirGiderler
            .OrderByDescending(g => g.Tarih)
            .Select(g => new GelirGiderListeDto(
                g.Id, g.Tip.ToString(), g.Miktar, g.Aciklama, g.Tarih))
            .AsNoTracking()
            .ToListAsync();

        return new ApiResponse<List<GelirGiderListeDto>>(true, liste, null, null);
    }

    public async Task<ApiResponse<GelirGiderOzetDto>> GetOzetAsync()
    {
        // Tek sorguda tüm agregasyonları hesapla
        var ozet = await db.GelirGiderler
            .GroupBy(_ => 1)
            .Select(g => new
            {
                ToplamGelir = g.Where(x => x.Tip == GelirGiderTip.Gelir).Sum(x => (decimal?)x.Miktar) ?? 0,
                ToplamGider = g.Where(x => x.Tip == GelirGiderTip.Gider).Sum(x => (decimal?)x.Miktar) ?? 0,
                GelirSayisi = g.Count(x => x.Tip == GelirGiderTip.Gelir),
                GiderSayisi = g.Count(x => x.Tip == GelirGiderTip.Gider)
            })
            .FirstOrDefaultAsync();

        var toplamGelir = ozet?.ToplamGelir ?? 0;
        var toplamGider = ozet?.ToplamGider ?? 0;

        var dto = new GelirGiderOzetDto(
            toplamGelir,
            toplamGider,
            toplamGelir - toplamGider,
            ozet?.GelirSayisi ?? 0,
            ozet?.GiderSayisi ?? 0);

        return new ApiResponse<GelirGiderOzetDto>(true, dto, null, null);
    }

    public async Task<ApiResponse<GelirGiderListeDto>> CreateAsync(GelirGiderOlusturRequest request)
    {
        if (request.Miktar <= 0)
            return new ApiResponse<GelirGiderListeDto>(false, null, "Miktar 0'dan büyük olmalıdır.", null);

        var kayit = new GelirGider
        {
            Tip = request.Tip,
            Miktar = request.Miktar,
            Aciklama = request.Aciklama,
            Tarih = request.Tarih?.ToUniversalTime() ?? DateTime.UtcNow
        };

        db.GelirGiderler.Add(kayit);
        await db.SaveChangesAsync();

        var dto = new GelirGiderListeDto(kayit.Id, kayit.Tip.ToString(), kayit.Miktar, kayit.Aciklama, kayit.Tarih);
        return new ApiResponse<GelirGiderListeDto>(true, dto, null, "Kayıt oluşturuldu.");
    }

    public async Task<ApiResponse<object>> DeleteAsync(Guid id)
    {
        var kayit = await db.GelirGiderler.FindAsync(id);
        if (kayit is null)
            return new ApiResponse<object>(false, null, "Kayıt bulunamadı.", null);

        db.GelirGiderler.Remove(kayit);
        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Kayıt silindi.");
    }
}
