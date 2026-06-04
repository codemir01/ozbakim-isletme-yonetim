using System.Security.Claims;
using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/bildirimler")]
[Authorize]
public class BildirimController(IBildirimService bildirimService) : ControllerBase
{
    private Guid KullaniciId =>
        Guid.Parse(User.FindFirstValue("sub") ?? throw new UnauthorizedAccessException());

    // GET /api/v1/bildirimler — kullanıcının bildirimlerini getir (okunmamış önce)
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<BildirimDto>>>> Liste()
    {
        var response = await bildirimService.GetBildirimlerAsync(KullaniciId);
        return Ok(response);
    }

    // PUT /api/v1/bildirimler/{id}/oku — bildirimi okundu işaretle
    [HttpPut("{id}/oku")]
    public async Task<ActionResult<ApiResponse<object>>> Oku(Guid id)
    {
        var response = await bildirimService.OkuAsync(id, KullaniciId);
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    // PUT /api/v1/bildirimler/hepsini-oku — tümünü okundu yap
    [HttpPut("hepsini-oku")]
    public async Task<ActionResult<ApiResponse<object>>> HepsiniOku()
    {
        var response = await bildirimService.HepsiniOkuAsync(KullaniciId);
        return Ok(response);
    }
}
