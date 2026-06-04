using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface IBakimService
{
    Task<ApiResponse<List<BakimListeDto>>> GetBakimlarAsync();
    Task<ApiResponse<BakimDetayDto>> GetBakimByIdAsync(Guid id);
    Task<ApiResponse<object>> GecmisEkleAsync(Guid id, BakimGecmisEkleRequest request, Guid personelId);
    Task<ApiResponse<object>> CreateManuelBakimAsync(ManuelBakimOlusturRequest request);
}
