using System.Security.Claims;
using System.Text.Json;
using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/bakim")]
[Authorize]
public class BakimController(IBakimService bakimService, IHttpClientFactory httpClientFactory) : ControllerBase
{
    // GET /api/v1/bakim — tüm bakım kartlarını listele
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<BakimListeDto>>>> Liste()
    {
        var response = await bakimService.GetBakimlarAsync();
        return Ok(response);
    }

    // GET /api/v1/bakim/{id} — bakım kartı detayı (geçmiş dahil)
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<BakimDetayDto>>> Detay(Guid id)
    {
        var response = await bakimService.GetBakimByIdAsync(id);
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    // POST /api/v1/bakim/{id}/gecmis — bakım kartına yeni bakım geçmişi ekle
    // Bakım yapıldıktan sonra teknisyen bu endpoint'i çağırır
    [HttpPost("{id}/gecmis")]
    public async Task<ActionResult<ApiResponse<object>>> GecmisEkle(Guid id, [FromBody] BakimGecmisEkleRequest request)
    {
        var kullaniciId = Guid.Parse(User.FindFirstValue("sub")
                          ?? throw new UnauthorizedAccessException());

        var response = await bakimService.GecmisEkleAsync(id, request, kullaniciId);
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    // GET /api/v1/bakim/{id}/risk-tahmini — Python AI servisine istek at, risk döndür
    [HttpGet("{id}/risk-tahmini")]
    public async Task<ActionResult<ApiResponse<RiskTahminYanit>>> RiskTahmini(Guid id)
    {
        // 1. Bakım kartını bul
        var bakimResponse = await bakimService.GetBakimByIdAsync(id);
        if (!bakimResponse.Basarili)
            return NotFound(new ApiResponse<RiskTahminYanit>(false, null, "Bakım kartı bulunamadı.", null));

        var bakim = bakimResponse.Veri!;

        // 2. Bakım parametrelerini hesapla
        // Cihaz yaşı: cihazın ne kadar süredir kullanıldığı (montaj tarihinden bugüne).
        // Öncelik sırası:
        //   1) Satıştan gelen MontajTarihi (en doğru — cihazın gerçek kurulum tarihi)
        //   2) Hiç bakım yapılmamışsa en eski bakım kaydının tarihi
        //   3) İkisi de yoksa kart üzerindeki SonBakimTarihi (kaba tahmin)
        var enEskiKayit = bakim.Gecmisler is { Count: > 0 }
            ? bakim.Gecmisler.Min(g => g.YapilmaTarihi)
            : (DateTime?)null;
        var baslangic = bakim.MontajTarihi ?? enEskiKayit ?? bakim.SonBakimTarihi;

        var cihazYasi = Math.Max(0, (int)(DateTime.UtcNow - baslangic).TotalDays / 365);
        var bakimSayisi = bakim.Gecmisler?.Count ?? 0;
        var sonBakimGunSayisi = (int)(DateTime.UtcNow - bakim.SonBakimTarihi).TotalDays;

        // 3. Python servisine istek at
        try
        {
            var client = httpClientFactory.CreateClient("AiService");
            var istek = new
            {
                cihazYasi = Math.Max(0, cihazYasi),
                bakimSayisi = Math.Max(0, bakimSayisi),
                sonBakimGunSayisi = Math.Max(0, sonBakimGunSayisi)
            };

            var httpYanit = await client.PostAsJsonAsync("/predict", istek);
            if (!httpYanit.IsSuccessStatusCode)
                return StatusCode(502, new ApiResponse<RiskTahminYanit>(false, null, "AI servisine ulaşılamadı.", null));

            var json = await httpYanit.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var sonuc = JsonSerializer.Deserialize<RiskTahminYanit>(json, options)!;

            return Ok(new ApiResponse<RiskTahminYanit>(true, sonuc, null, null));
        }
        catch (HttpRequestException)
        {
            return StatusCode(503, new ApiResponse<RiskTahminYanit>(false, null,
                "AI servisi şu an çalışmıyor. Lütfen servisi başlatın.", null));
        }
    }

    // POST /api/v1/bakim — satışa bağlı olmayan manuel bakım kartı oluştur
    [HttpPost]
    [Authorize(Roles = "Admin,SalesConsultant")]
    public async Task<ActionResult<ApiResponse<object>>> Olustur([FromBody] ManuelBakimOlusturRequest request)
    {
        var response = await bakimService.CreateManuelBakimAsync(request);
        return Ok(response);
    }
}
