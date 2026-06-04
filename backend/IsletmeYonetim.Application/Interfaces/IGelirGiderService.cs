using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface IGelirGiderService
{
    Task<ApiResponse<List<GelirGiderListeDto>>> GetListeAsync();
    Task<ApiResponse<GelirGiderOzetDto>> GetOzetAsync();
    Task<ApiResponse<GelirGiderListeDto>> CreateAsync(GelirGiderOlusturRequest request);
    Task<ApiResponse<object>> DeleteAsync(Guid id);
}
