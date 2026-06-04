using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IsletmeYonetim.Infrastructure.Services;

public class ProfilService(AppDbContext db) : IProfilService
{
    public async Task<ApiResponse<ProfilDto>> GetProfilAsync(Guid kullaniciId)
    {
        var k = await db.Kullanicilar.FindAsync(kullaniciId);
        if (k is null)
            return new ApiResponse<ProfilDto>(false, null, "Kullanıcı bulunamadı.", null);

        var dto = new ProfilDto(k.Id, k.Ad, k.Soyad, k.Eposta, k.Unvan,
                                k.Rol.ToString(), k.OlusturmaTarihi);
        return new ApiResponse<ProfilDto>(true, dto, null, null);
    }

    public async Task<ApiResponse<object>> UpdateProfilAsync(Guid kullaniciId, ProfilGuncelleRequest request)
    {
        var k = await db.Kullanicilar.FindAsync(kullaniciId);
        if (k is null)
            return new ApiResponse<object>(false, null, "Kullanıcı bulunamadı.", null);

        k.Ad = request.Ad;
        k.Soyad = request.Soyad;
        k.Unvan = request.Unvan;

        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Profil güncellendi.");
    }

    public async Task<ApiResponse<object>> UpdateSifreAsync(Guid kullaniciId, SifreGuncelleRequest request)
    {
        var k = await db.Kullanicilar.FindAsync(kullaniciId);
        if (k is null)
            return new ApiResponse<object>(false, null, "Kullanıcı bulunamadı.", null);

        // Eski şifreyi BCrypt ile doğrula
        if (!BCrypt.Net.BCrypt.Verify(request.EskiSifre, k.SifreHash))
            return new ApiResponse<object>(false, null, "Mevcut şifre yanlış.", null);

        if (string.IsNullOrWhiteSpace(request.YeniSifre) || request.YeniSifre.Length < 6)
            return new ApiResponse<object>(false, null, "Yeni şifre en az 6 karakter olmalıdır.", null);

        k.SifreHash = BCrypt.Net.BCrypt.HashPassword(request.YeniSifre);
        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Şifre başarıyla güncellendi.");
    }
}
