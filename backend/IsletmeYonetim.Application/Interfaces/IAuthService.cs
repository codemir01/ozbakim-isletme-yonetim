using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request);
}
