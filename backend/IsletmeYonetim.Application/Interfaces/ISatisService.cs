using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface ISatisService
{
    Task<PagedResponse<SatisListeDto>> GetSatislarAsync(int sayfa = 1, int boyut = 20);
    Task<ApiResponse<object>> CreateSatisAsync(SatisOlusturRequest request, Guid personelId);
    Task<ApiResponse<object>> GetOzetAsync();
}
