using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/raporlar")]
[Authorize(Roles = "Admin")]
public class RaporController(IRaporService raporService) : ControllerBase
{
    // GET /api/v1/raporlar/aylik-ozet?yil=2025&ay=5 — aylık özet PDF indir
    [HttpGet("aylik-ozet")]
    public async Task<IActionResult> AylikOzetPdf([FromQuery] int yil, [FromQuery] int ay)
    {
        if (yil < 2000 || yil > 2100 || ay < 1 || ay > 12)
            return BadRequest("Geçersiz yıl veya ay.");

        var pdf = await raporService.AylikOzetPdfAsync(yil, ay);

        return File(pdf, "application/pdf",
            $"aylik-ozet-{yil}-{ay:D2}.pdf");
    }

    // GET /api/v1/raporlar/musteriler-excel — müşteri listesi Excel indir
    [HttpGet("musteriler-excel")]
    public async Task<IActionResult> MusterilerExcel()
    {
        var excel = await raporService.MusterilerExcelAsync();

        return File(excel,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"musteriler-{DateTime.UtcNow:yyyy-MM-dd}.xlsx");
    }
}
