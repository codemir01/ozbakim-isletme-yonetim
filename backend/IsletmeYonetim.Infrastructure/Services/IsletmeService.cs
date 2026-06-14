using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IsletmeYonetim.Infrastructure.Services;

// Aktif işletmenin (tenant) kendi bilgilerini yönetir. Isletme tablosu tenant'ın
// kökü olduğu için global query filter'a tabi değil; doğrudan Id ile bulunur.
public class IsletmeService(AppDbContext db, ITenantProvider tenant) : IIsletmeService
{
    public async Task<ApiResponse<IsletmeKonumDto>> GetKonumAsync()
    {
        var isletme = await db.Isletmeler.FirstOrDefaultAsync(i => i.Id == tenant.IsletmeId);
        if (isletme is null)
            return ApiResponse<IsletmeKonumDto>.HataDon("İşletme bulunamadı.");

        return ApiResponse<IsletmeKonumDto>.BasariVeri(new IsletmeKonumDto(isletme.Enlem, isletme.Boylam));
    }

    public async Task<ApiResponse<IsletmeKonumDto>> SetKonumAsync(IsletmeKonumGuncelleRequest request)
    {
        var isletme = await db.Isletmeler.FirstOrDefaultAsync(i => i.Id == tenant.IsletmeId);
        if (isletme is null)
            return ApiResponse<IsletmeKonumDto>.HataDon("İşletme bulunamadı.");

        isletme.Enlem = request.Enlem;
        isletme.Boylam = request.Boylam;
        await db.SaveChangesAsync();

        return ApiResponse<IsletmeKonumDto>.BasariVeri(
            new IsletmeKonumDto(isletme.Enlem, isletme.Boylam), "İşletme konumu güncellendi.");
    }
}
