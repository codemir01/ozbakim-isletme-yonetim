using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Domain.Entities;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IsletmeYonetim.Infrastructure.Services;

public class KullaniciService(AppDbContext db) : IKullaniciService
{
    public async Task<ApiResponse<List<KullaniciListeDto>>> GetKullanicilarAsync()
    {
        var liste = await db.Kullanicilar
            .OrderBy(k => k.Ad)
            .Select(k => new KullaniciListeDto(
                k.Id, k.Ad, k.Soyad, k.Eposta, k.Telefon,
                k.Unvan, k.Rol.ToString(), k.AktifMi, k.OlusturmaTarihi))
            .AsNoTracking()
            .ToListAsync();

        return new ApiResponse<List<KullaniciListeDto>>(true, liste, null, null);
    }

    public async Task<ApiResponse<KullaniciListeDto>> CreateKullaniciAsync(KullaniciOlusturRequest request)
    {
        if (await db.Kullanicilar.AnyAsync(k => k.Eposta == request.Eposta))
            return new ApiResponse<KullaniciListeDto>(false, null, "Bu e-posta zaten kayıtlı.", null);

        var kullanici = new Kullanici
        {
            Ad = request.Ad,
            Soyad = request.Soyad,
            Eposta = request.Eposta,
            Telefon = request.Telefon,
            SifreHash = BCrypt.Net.BCrypt.HashPassword(request.Sifre),
            Unvan = request.Unvan,
            Rol = request.Rol
        };

        db.Kullanicilar.Add(kullanici);
        await db.SaveChangesAsync();

        var dto = new KullaniciListeDto(kullanici.Id, kullanici.Ad, kullanici.Soyad,
            kullanici.Eposta, kullanici.Telefon, kullanici.Unvan,
            kullanici.Rol.ToString(), kullanici.AktifMi, kullanici.OlusturmaTarihi);

        return new ApiResponse<KullaniciListeDto>(true, dto, null, "Kullanıcı oluşturuldu.");
    }

    public async Task<ApiResponse<object>> UpdateKullaniciAsync(Guid id, KullaniciGuncelleRequest request)
    {
        var kullanici = await db.Kullanicilar.FindAsync(id);
        if (kullanici is null)
            return new ApiResponse<object>(false, null, "Kullanıcı bulunamadı.", null);

        if (await db.Kullanicilar.AnyAsync(k => k.Eposta == request.Eposta && k.Id != id))
            return new ApiResponse<object>(false, null, "Bu e-posta başka bir kullanıcıya ait.", null);

        kullanici.Ad = request.Ad;
        kullanici.Soyad = request.Soyad;
        kullanici.Eposta = request.Eposta;
        kullanici.Telefon = request.Telefon;
        kullanici.Unvan = request.Unvan;
        kullanici.Rol = request.Rol;
        kullanici.AktifMi = request.AktifMi;

        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Kullanıcı güncellendi.");
    }

    public async Task<ApiResponse<object>> DeleteKullaniciAsync(Guid id)
    {
        var kullanici = await db.Kullanicilar.FindAsync(id);
        if (kullanici is null)
            return new ApiResponse<object>(false, null, "Kullanıcı bulunamadı.", null);

        kullanici.AktifMi = false; // Soft delete
        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Kullanıcı pasife alındı.");
    }
}
