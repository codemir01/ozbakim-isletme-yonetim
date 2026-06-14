using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/isletme")]
[Authorize]
public class IsletmeController(IIsletmeService isletmeService) : ControllerBase
{
    // GET /api/v1/isletme/konum — işletmenin (depo) konumu
    [HttpGet("konum")]
    public async Task<ActionResult<ApiResponse<IsletmeKonumDto>>> Konum()
        => Ok(await isletmeService.GetKonumAsync());

    // PUT /api/v1/isletme/konum — işletme konumunu belirle/güncelle (sadece Admin)
    [HttpPut("konum")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<IsletmeKonumDto>>> KonumGuncelle([FromBody] IsletmeKonumGuncelleRequest request)
    {
        var response = await isletmeService.SetKonumAsync(request);
        return response.Basarili ? Ok(response) : NotFound(response);
    }
}
