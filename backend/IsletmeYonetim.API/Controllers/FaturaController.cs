using IsletmeYonetim.API.Extensions;
using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/faturalar")]
[Authorize]
public class FaturaController(IFaturaService faturaService) : ControllerBase
{
    // GET /api/v1/faturalar — tüm faturaları listele
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<FaturaListeDto>>>> Liste()
    {
        var response = await faturaService.GetListeAsync();
        return Ok(response);
    }

    // GET /api/v1/faturalar/{id} — fatura detayı (müşteri, ürün, satış bilgileri dahil)
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<FaturaDetayDto>>> Detay(Guid id)
    {
        var response = await faturaService.GetByIdAsync(id);
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    // GET /api/v1/faturalar/{id}/pdf — fatura PDF indir
    [HttpGet("{id}/pdf")]
    public async Task<IActionResult> Pdf(Guid id)
    {
        var pdf = await faturaService.GetPdfAsync(id);
        if (pdf is null) return NotFound();
        return File(pdf, "application/pdf", $"fatura-{id.ToString()[..8].ToUpper()}.pdf");
    }

    // POST /api/v1/faturalar — satış için fatura kes (Admin veya SalesConsultant)
    [HttpPost]
    [Authorize(Roles = "Admin,SalesConsultant")]
    public async Task<ActionResult<ApiResponse<FaturaListeDto>>> Olustur([FromBody] FaturaOlusturRequest request)
    {
        var response = await faturaService.CreateAsync(request, User.GetKullaniciId());
        return response.Basarili ? StatusCode(201, response) : BadRequest(response);
    }
}
