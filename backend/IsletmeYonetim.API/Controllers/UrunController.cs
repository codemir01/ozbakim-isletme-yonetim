using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/urunler")]
[Authorize]
public class UrunController(IUrunService urunService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<UrunListeDto>>>> Liste()
    {
        var response = await urunService.GetUrunlerAsync();
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,SalesConsultant")]
    public async Task<ActionResult<ApiResponse<UrunListeDto>>> Olustur([FromBody] UrunOlusturRequest request)
    {
        var response = await urunService.CreateUrunAsync(request);
        return response.Basarili ? StatusCode(201, response) : BadRequest(response);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,SalesConsultant")]
    public async Task<ActionResult<ApiResponse<object>>> Guncelle(Guid id, [FromBody] UrunGuncelleRequest request)
    {
        var response = await urunService.UpdateUrunAsync(id, request);
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,SalesConsultant")]
    public async Task<ActionResult<ApiResponse<object>>> Sil(Guid id)
    {
        var response = await urunService.DeleteUrunAsync(id);
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    [HttpGet("ozet")]
    public async Task<ActionResult<ApiResponse<object>>> Ozet()
    {
        var response = await urunService.GetOzetAsync();
        return Ok(response);
    }
}
