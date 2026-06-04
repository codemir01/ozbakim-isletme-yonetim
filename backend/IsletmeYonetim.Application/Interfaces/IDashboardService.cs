using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface IDashboardService
{
    Task<ApiResponse<DashboardOzetDto>> GetOzetAsync();
    Task<ApiResponse<List<SatisGrafikDto>>> GetSatisGrafikAsync();
    Task<ApiResponse<YaklasanBakimlarDto>> GetYaklasanBakimlarAsync();
    Task<ApiResponse<List<EnCokSatanDto>>> GetEnCokSatanlarAsync();
    Task<ApiResponse<List<BakimServisCihazDto>>> GetBakimServisCihazlarAsync();
}
