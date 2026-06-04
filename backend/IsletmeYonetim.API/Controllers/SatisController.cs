using System.Security.Claims;
using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/satislar")]
[Authorize]
public class SatisController(ISatisService satisService) : ControllerBase
{
    // GET /api/v1/satislar?sayfa=1&boyut=20
    [HttpGet]
    public async Task<ActionResult<PagedResponse<SatisListeDto>>> Liste([FromQuery] int sayfa = 1, [FromQuery] int boyut = 20)
    {
        var response = await satisService.GetSatislarAsync(sayfa, boyut);
        return Ok(response);
    }

    // POST /api/v1/satislar — yeni satış oluştur (sadece Admin ve Satış Danışmanı yapabilir)
    [HttpPost]
    [Authorize(Roles = "Admin,SalesConsultant")]
    public async Task<ActionResult<ApiResponse<object>>> Olustur([FromBody] SatisOlusturRequest request)
    {
        // JWT token'dan kullanıcı ID'sini al — "sub" claim'i Program.cs'de MapInboundClaims = false
        // ayarı sayesinde orijinal adıyla ("sub") okunabilir
        var kullaniciId = Guid.Parse(User.FindFirstValue("sub")
                          ?? throw new UnauthorizedAccessException());

        var response = await satisService.CreateSatisAsync(request, kullaniciId);
        return Ok(response);
    }

    // GET /api/v1/satislar/ozet — satış özet istatistikleri (dashboard ve satışlar sayfası için)
    [HttpGet("ozet")]
    public async Task<ActionResult<ApiResponse<object>>> Ozet()
    {
        var response = await satisService.GetOzetAsync();
        return Ok(response);
    }
}
