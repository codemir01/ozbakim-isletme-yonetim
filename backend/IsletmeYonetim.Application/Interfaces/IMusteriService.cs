using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface IMusteriService
{
    Task<PagedResponse<MusteriListeDto>> GetMusterilerAsync(int sayfa = 1, int boyut = 20);
    Task<ApiResponse<MusteriListeDto>> GetMusteriByIdAsync(Guid id);
    Task<ApiResponse<MusteriListeDto>> CreateMusteriAsync(MusteriOlusturRequest request);
    Task<ApiResponse<object>> UpdateMusteriAsync(Guid id, MusteriGuncelleRequest request);
    Task<ApiResponse<object>> DeleteMusteriAsync(Guid id);
    Task<ApiResponse<object>> AddBorcAsync(Guid id, BorcEkleRequest request);
    Task<ApiResponse<object>> AddTahsilatAsync(Guid id, TahsilatEkleRequest request);
    Task<ApiResponse<List<BorcTahsilatDto>>> GetBorcGecmisAsync(Guid id);
    Task<ApiResponse<object>> UpdateKonumAsync(Guid id, KonumGuncelleRequest request);
}
