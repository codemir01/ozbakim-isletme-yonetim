using System.Net.Http.Json;
using System.Text.Json;
using IsletmeYonetim.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/rota")]
[Authorize]
public class RotaController(IHttpClientFactory httpClientFactory) : ControllerBase
{
    // POST /api/v1/rota/optimize — teknisyenin ziyaret edeceği konumların en kısa
    // sırasını (TSP) Python servisinden hesaplatır. AI servisi haversine + 2-opt kullanır.
    [HttpPost("optimize")]
    public async Task<ActionResult<ApiResponse<RotaOptimizeYanit>>> Optimize([FromBody] RotaOptimizeIstek istek)
    {
        if (istek?.Noktalar is null || istek.Noktalar.Count < 2)
            return BadRequest(ApiResponse<RotaOptimizeYanit>.HataDon("Rota için en az 2 konum gerekli."));

        try
        {
            var client = httpClientFactory.CreateClient("AiService");
            var httpYanit = await client.PostAsJsonAsync("/rota-optimize", new { noktalar = istek.Noktalar });
            if (!httpYanit.IsSuccessStatusCode)
            {
                var hataGovde = await httpYanit.Content.ReadAsStringAsync();
                var detay = "Rota servisi yanıt vermedi.";
                try
                {
                    using var doc = JsonDocument.Parse(hataGovde);
                    if (doc.RootElement.TryGetProperty("detail", out var d))
                        detay = d.GetString() ?? detay;
                }
                catch { /* JSON değilse genel mesaj */ }
                return StatusCode(502, ApiResponse<RotaOptimizeYanit>.HataDon($"Rota hesaplanamadı: {detay}"));
            }

            var json = await httpYanit.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var sonuc = JsonSerializer.Deserialize<RotaOptimizeYanit>(json, options);
            if (sonuc is null)
                return StatusCode(502, ApiResponse<RotaOptimizeYanit>.HataDon("Rota yanıtı çözümlenemedi."));

            return Ok(ApiResponse<RotaOptimizeYanit>.BasariVeri(sonuc));
        }
        catch (HttpRequestException)
        {
            return StatusCode(503, ApiResponse<RotaOptimizeYanit>.HataDon(
                "AI servisi şu an çalışmıyor. Lütfen servisi başlatın."));
        }
    }
}
