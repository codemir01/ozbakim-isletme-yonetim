using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface IFaturaService
{
    Task<ApiResponse<List<FaturaListeDto>>> GetListeAsync();
    Task<ApiResponse<FaturaDetayDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<FaturaListeDto>> CreateAsync(FaturaOlusturRequest request, Guid kullaniciId);
    Task<byte[]?> GetPdfAsync(Guid id);
}
