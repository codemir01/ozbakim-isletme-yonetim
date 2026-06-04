using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface ILisansService
{
    Task<ApiResponse<LisansDto>> GetLisansAsync();
    // Login'de kullanılır: lisans geçerli mi?
    Task<bool> LisansGecerliMiAsync();
}
