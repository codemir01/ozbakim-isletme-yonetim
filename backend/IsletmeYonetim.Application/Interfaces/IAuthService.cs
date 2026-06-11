using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request);
    // Yeni işletme + ilk admin + deneme lisansı oluşturur, otomatik giriş yapar
    Task<ApiResponse<LoginResponse>> KayitAsync(KayitRequest request);
}
