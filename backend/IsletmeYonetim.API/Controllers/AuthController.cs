using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace IsletmeYonetim.API.Controllers;

// [Authorize] yok — giriş yapmadan erişilebilir olması gerekiyor
[ApiController]
[Route("api/v1/auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login([FromBody] LoginRequest request)
    {
        var response = await authService.LoginAsync(request);
        // Başarılıysa 200, değilse 401 Unauthorized döner
        return response.Basarili ? Ok(response) : Unauthorized(response);
    }

    // Yeni işletme kaydı (self-signup) — giriş yapmadan erişilebilir
    [HttpPost("kayit")]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Kayit([FromBody] KayitRequest request)
    {
        var response = await authService.KayitAsync(request);
        return response.Basarili ? Ok(response) : BadRequest(response);
    }
}
