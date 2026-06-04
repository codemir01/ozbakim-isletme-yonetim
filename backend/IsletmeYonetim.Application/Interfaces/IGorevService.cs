using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface IGorevService
{
    Task<ApiResponse<List<GorevListeDto>>> GetGorevlerAsync();
    Task<ApiResponse<object>> CreateGorevAsync(GorevOlusturRequest request, Guid olusturanId);
    Task<ApiResponse<object>> UpdateDurumAsync(Guid id, GorevDurumGuncelleRequest request);
    Task<ApiResponse<List<PersonelOzetDto>>> GetPersonellerAsync();
}
