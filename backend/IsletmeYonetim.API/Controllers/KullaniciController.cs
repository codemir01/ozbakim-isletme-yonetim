using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/kullanicilar")]
[Authorize(Roles = "Admin")]
public class KullaniciController(IKullaniciService kullaniciService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<KullaniciListeDto>>>> Liste()
    {
        var response = await kullaniciService.GetKullanicilarAsync();
        return Ok(response);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<KullaniciListeDto>>> Olustur([FromBody] KullaniciOlusturRequest request)
    {
        var response = await kullaniciService.CreateKullaniciAsync(request);
        return response.Basarili ? Ok(response) : BadRequest(response);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Guncelle(Guid id, [FromBody] KullaniciGuncelleRequest request)
    {
        var response = await kullaniciService.UpdateKullaniciAsync(id, request);
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Sil(Guid id)
    {
        var response = await kullaniciService.DeleteKullaniciAsync(id);
        return response.Basarili ? Ok(response) : NotFound(response);
    }
}
