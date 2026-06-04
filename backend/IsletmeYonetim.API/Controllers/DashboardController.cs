using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

// Dashboard sayfası için tüm istatistik endpoint'leri
// Frontend bunları Promise.allSettled ile paralel çağırır
[ApiController]
[Route("api/v1/dashboard")]
[Authorize]
public class DashboardController(IDashboardService dashboardService) : ControllerBase
{
    // Üst kartlar: müşteri, ürün, satış sayısı, ciro, borç/tahsilat
    [HttpGet("ozet")]
    public async Task<ActionResult<ApiResponse<DashboardOzetDto>>> Ozet()
        => Ok(await dashboardService.GetOzetAsync());

    // Son 7 günlük satış trendi (alan grafiği)
    [HttpGet("satis-grafik")]
    public async Task<ActionResult<ApiResponse<List<SatisGrafikDto>>>> SatisGrafik()
        => Ok(await dashboardService.GetSatisGrafikAsync());

    // Geçmiş / bugün / bu hafta bakımlar (sekmeli liste)
    [HttpGet("yaklasan-bakimlar")]
    public async Task<ActionResult<ApiResponse<YaklasanBakimlarDto>>> YaklasanBakimlar()
        => Ok(await dashboardService.GetYaklasanBakimlarAsync());

    // En çok satan 10 ürün
    [HttpGet("en-cok-satanlar")]
    public async Task<ActionResult<ApiResponse<List<EnCokSatanDto>>>> EnCokSatanlar()
        => Ok(await dashboardService.GetEnCokSatanlarAsync());

    // Bakımı en çok yapılan cihazlar (BakimGecmisi sayısına göre)
    [HttpGet("bakim-servis-cihazlar")]
    public async Task<ActionResult<ApiResponse<List<BakimServisCihazDto>>>> BakimServisCihazlar()
        => Ok(await dashboardService.GetBakimServisCihazlarAsync());
}
