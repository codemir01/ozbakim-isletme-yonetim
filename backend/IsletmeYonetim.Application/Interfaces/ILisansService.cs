using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface ILisansService
{
    Task<ApiResponse<LisansDto>> GetLisansAsync();
    // Aktif işletmenin (JWT tenant'ı) lisansı geçerli mi?
    Task<bool> LisansGecerliMiAsync();
    // Login'de kullanılır: belirli bir işletmenin lisansı geçerli mi? (tenant henüz JWT'de yok)
    Task<bool> LisansGecerliMiAsync(Guid isletmeId);
}
