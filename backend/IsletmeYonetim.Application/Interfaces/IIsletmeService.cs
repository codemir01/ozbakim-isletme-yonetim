using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface IIsletmeService
{
    // Aktif işletmenin (depo) konumunu getirir
    Task<ApiResponse<IsletmeKonumDto>> GetKonumAsync();

    // Aktif işletmenin konumunu günceller (rota başlangıç noktası)
    Task<ApiResponse<IsletmeKonumDto>> SetKonumAsync(IsletmeKonumGuncelleRequest request);
}
