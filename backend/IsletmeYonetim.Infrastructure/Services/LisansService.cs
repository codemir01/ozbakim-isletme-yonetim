using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IsletmeYonetim.Infrastructure.Services;

public class LisansService(AppDbContext db) : ILisansService
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
}
