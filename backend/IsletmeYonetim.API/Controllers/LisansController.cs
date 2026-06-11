using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/lisans")]
[Authorize(Roles = "Admin")]
public class LisansController(ILisansService lisansService) : ControllerBase
{
    // GET /api/v1/lisans — lisans bilgilerini getir [Admin only]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<LisansDto>>> Get()
    {
        var response = await lisansService.GetLisansAsync();
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    // POST /api/v1/lisans/satin-al — abonelik satın al / uzat (simüle ödeme) [Admin only]
    [HttpPost("satin-al")]
    public async Task<ActionResult<ApiResponse<LisansDto>>> SatinAl([FromBody] LisansSatinAlRequest request)
    {
        var response = await lisansService.SatinAlAsync(request.Plan);
        return response.Basarili ? Ok(response) : BadRequest(response);
    }
}
