using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/gelir-gider")]
[Authorize]
public class GelirGiderController(IGelirGiderService gelirGiderService) : ControllerBase
{
    // GET /api/v1/gelir-gider — tüm kayıtları listele
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<GelirGiderListeDto>>>> Liste()
    {
        var response = await gelirGiderService.GetListeAsync();
        return Ok(response);
    }

    // GET /api/v1/gelir-gider/ozet — toplam gelir/gider/net bakiye
    [HttpGet("ozet")]
    public async Task<ActionResult<ApiResponse<GelirGiderOzetDto>>> Ozet()
    {
        var response = await gelirGiderService.GetOzetAsync();
        return Ok(response);
    }

    // POST /api/v1/gelir-gider — yeni kayıt ekle (sadece Admin)
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<GelirGiderListeDto>>> Olustur([FromBody] GelirGiderOlusturRequest request)
    {
        var response = await gelirGiderService.CreateAsync(request);
        return response.Basarili ? Ok(response) : BadRequest(response);
    }

    // DELETE /api/v1/gelir-gider/{id} — kayıt sil (sadece Admin)
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> Sil(Guid id)
    {
        var response = await gelirGiderService.DeleteAsync(id);
        return response.Basarili ? Ok(response) : NotFound(response);
    }
}
