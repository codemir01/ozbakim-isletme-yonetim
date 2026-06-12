using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IsletmeYonetim.Infrastructure.Services;

public class LisansService(AppDbContext db, IOdemeService odemeService) : ILisansService
{
    public async Task<ApiResponse<LisansDto>> GetLisansAsync()
    {
        var lisans = await db.Lisanslar.FirstOrDefaultAsync();
        if (lisans is null)
            return new ApiResponse<LisansDto>(false, null, "Lisans kaydı bulunamadı.", null);

        var kalanGun = (int)(lisans.BitisTarihi.Date - DateTime.UtcNow.Date).TotalDays;
        var dto = new LisansDto(
            lisans.Id, lisans.IsletmeAdi, lisans.AdminEposta,
            lisans.BaslangicTarihi, lisans.BitisTarihi,
            lisans.Aktif, kalanGun);

        return new ApiResponse<LisansDto>(true, dto, null, null);
    }

    public async Task<bool> LisansGecerliMiAsync()
    {
        var lisans = await db.Lisanslar.FirstOrDefaultAsync();
        if (lisans is null || !lisans.Aktif) return false;
        return lisans.BitisTarihi >= DateTime.UtcNow;
    }

    // Login'de: tenant henüz JWT'de olmadığı için global filtreyi atlayıp işletmeye göre bak
    public async Task<bool> LisansGecerliMiAsync(Guid isletmeId)
    {
        var lisans = await db.Lisanslar
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(l => l.IsletmeId == isletmeId);
        if (lisans is null || !lisans.Aktif) return false;
        return lisans.BitisTarihi >= DateTime.UtcNow;
    }

    // Plan kodu → (eklenecek gün, ₺ fiyat). Fiyatlar frontend'deki plan kartlarıyla aynı.
    private static readonly Dictionary<string, (int Gun, decimal Fiyat)> Planlar = new()
    {
        ["aylik"] = (30, 499m),
        ["uc_aylik"] = (90, 1299m),
        ["yillik"] = (365, 4990m),
    };

    public async Task<ApiResponse<LisansDto>> SatinAlAsync(string plan, KartBilgisi kart)
    {
        if (!Planlar.TryGetValue(plan, out var bilgi))
            return new ApiResponse<LisansDto>(false, null, "Geçersiz plan.", null);
        var (gun, fiyat) = bilgi;

        // Aktif işletmenin lisansı (global filtre tenant'a göre kısıtlar)
        var lisans = await db.Lisanslar.FirstOrDefaultAsync();
        if (lisans is null)
            return new ApiResponse<LisansDto>(false, null, "Lisans kaydı bulunamadı.", null);

        // ÖNCE ödemeyi al — başarısızsa lisansa dokunma
        var odeme = await odemeService.OdemeAlAsync(
            kart, fiyat, $"Lisans aboneliği ({gun} gün)",
            lisans.IsletmeAdi, lisans.AdminEposta);
        if (!odeme.Basarili)
            return new ApiResponse<LisansDto>(false, null, odeme.HataMesaji ?? "Ödeme alınamadı.", null);

        // Kalan günler kaybolmasın: mevcut bitiş ileride ise oradan, değilse bugünden uzat.
        // PostgreSQL timestamptz UTC bekler → SpecifyKind ile Kind=Utc garanti edilir.
        var simdi = DateTime.UtcNow;
        var mevcutBitis = DateTime.SpecifyKind(lisans.BitisTarihi, DateTimeKind.Utc);
        var baz = mevcutBitis > simdi ? mevcutBitis : simdi;
        lisans.BitisTarihi = baz.AddDays(gun);
        lisans.Aktif = true;
        await db.SaveChangesAsync();

        var kalanGun = (int)(lisans.BitisTarihi.Date - DateTime.UtcNow.Date).TotalDays;
        var dto = new LisansDto(lisans.Id, lisans.IsletmeAdi, lisans.AdminEposta,
            lisans.BaslangicTarihi, lisans.BitisTarihi, lisans.Aktif, kalanGun);
        return new ApiResponse<LisansDto>(true, dto, null, $"Ödeme alındı, aboneliğiniz {gun} gün uzatıldı.");
    }
}
