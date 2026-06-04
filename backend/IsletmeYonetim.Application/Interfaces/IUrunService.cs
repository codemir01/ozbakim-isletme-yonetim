using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface IUrunService
{
    Task<ApiResponse<List<UrunListeDto>>> GetUrunlerAsync();
    Task<ApiResponse<UrunListeDto>> CreateUrunAsync(UrunOlusturRequest request);
    Task<ApiResponse<object>> UpdateUrunAsync(Guid id, UrunGuncelleRequest request);
    Task<ApiResponse<object>> DeleteUrunAsync(Guid id);
    Task<ApiResponse<object>> GetOzetAsync();
}
