using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Domain.Entities;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IsletmeYonetim.Infrastructure.Services;

public class BildirimService(AppDbContext db) : IBildirimService
{
    public async Task<ApiResponse<List<BildirimDto>>> GetBildirimlerAsync(Guid kullaniciId)
    {
        var liste = await db.Bildirimler
            .Where(b => b.KullaniciId == kullaniciId)
            .OrderBy(b => b.OkunduMu)          // Okunmamışlar önce
            .ThenByDescending(b => b.OlusturmaTarihi)
            .Select(b => new BildirimDto(
                b.Id, b.Mesaj, b.Tip.ToString(), b.OkunduMu, b.OlusturmaTarihi))
            .Take(50)  // Son 50 bildirim yeterli
            .AsNoTracking()
            .ToListAsync();

        return new ApiResponse<List<BildirimDto>>(true, liste, null, null);
    }

    public async Task<ApiResponse<object>> OkuAsync(Guid bildirimId, Guid kullaniciId)
    {
        var bildirim = await db.Bildirimler
            .FirstOrDefaultAsync(b => b.Id == bildirimId && b.KullaniciId == kullaniciId);

        if (bildirim is null)
            return new ApiResponse<object>(false, null, "Bildirim bulunamadı.", null);

        bildirim.OkunduMu = true;
        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Bildirim okundu olarak işaretlendi.");
    }

    public async Task<ApiResponse<object>> HepsiniOkuAsync(Guid kullaniciId)
    {
        await db.Bildirimler
            .Where(b => b.KullaniciId == kullaniciId && !b.OkunduMu)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.OkunduMu, true));

        return new ApiResponse<object>(true, null, null, "Tüm bildirimler okundu olarak işaretlendi.");
    }

    public async Task CreateAsync(Guid kullaniciId, string mesaj, BildirimTip tip = BildirimTip.Bilgi)
    {
        db.Bildirimler.Add(new Bildirim
        {
            KullaniciId = kullaniciId,
            Mesaj = mesaj,
            Tip = tip
        });
        await db.SaveChangesAsync();
    }
}
