using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface IProfilService
{
    Task<ApiResponse<ProfilDto>> GetProfilAsync(Guid kullaniciId);
    Task<ApiResponse<object>> UpdateProfilAsync(Guid kullaniciId, ProfilGuncelleRequest request);
    Task<ApiResponse<object>> UpdateSifreAsync(Guid kullaniciId, SifreGuncelleRequest request);
    // İlk girişte şifre belirleme (eski şifre sorulmaz, IlkGiris bayrağı temizlenir)
    Task<ApiResponse<object>> IlkSifreBelirleAsync(Guid kullaniciId, IlkSifreRequest request);
}
