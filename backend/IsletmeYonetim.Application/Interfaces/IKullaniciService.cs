using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface IKullaniciService
{
    Task<ApiResponse<List<KullaniciListeDto>>> GetKullanicilarAsync();
    Task<ApiResponse<KullaniciListeDto>> CreateKullaniciAsync(KullaniciOlusturRequest request);
    Task<ApiResponse<object>> UpdateKullaniciAsync(Guid id, KullaniciGuncelleRequest request);
    Task<ApiResponse<object>> DeleteKullaniciAsync(Guid id);
}
