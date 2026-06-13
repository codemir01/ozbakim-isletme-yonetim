using System.Net.Http.Headers;
using System.Text.Json;
using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/gelir-gider")]
[Authorize]
public class GelirGiderController(
    IGelirGiderService gelirGiderService,
    IHttpClientFactory httpClientFactory) : ControllerBase
{
    private const int MaxDosyaBoyutu = 5 * 1024 * 1024; // 5 MB

    // Uzantı → kabul edilen dosya imzaları (magic bytes). JPEG: FF D8 FF, PNG: 89 50 4E 47
    private static readonly Dictionary<string, byte[][]> GecerliImzalar = new()
    {
        [".jpg"]  = [[0xFF, 0xD8, 0xFF]],
        [".jpeg"] = [[0xFF, 0xD8, 0xFF]],
        [".png"]  = [[0x89, 0x50, 0x4E, 0x47]],
    };

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
        return response.Basarili ? StatusCode(201, response) : BadRequest(response);
    }

    // POST /api/v1/gelir-gider/fatura-oku — fatura/fiş görselini AI (Gemini Vision) ile oku,
    // yapılandırılmış veri döndür. KAYIT YAPMAZ; sadece okur. Admin onayladıktan sonra
    // frontend mevcut POST /gelir-gider ile gideri kaydeder. (sadece Admin)
    [HttpPost("fatura-oku")]
    [Authorize(Roles = "Admin")]
    [RequestSizeLimit(MaxDosyaBoyutu)] // istek gövdesini 5 MB ile sınırla (DoS koruması)
    public async Task<ActionResult<ApiResponse<FaturaOkumaYanit>>> FaturaOku(IFormFile foto)
    {
        if (foto is null || foto.Length == 0)
            return BadRequest(ApiResponse<FaturaOkumaYanit>.HataDon("Fatura görseli gerekli."));

        if (foto.Length > MaxDosyaBoyutu)
            return BadRequest(ApiResponse<FaturaOkumaYanit>.HataDon("Dosya 5 MB'tan büyük olamaz."));

        // Uzantı + içerik (magic byte) doğrulaması — sahte uzantılı dosyayı engelle
        var ext = Path.GetExtension(foto.FileName).ToLowerInvariant();
        if (!GecerliImzalar.TryGetValue(ext, out var imzalar))
            return BadRequest(ApiResponse<FaturaOkumaYanit>.HataDon("Sadece JPG veya PNG yüklenebilir."));

        await using (var imzaOku = foto.OpenReadStream())
        {
            var bas = new byte[8];
            var okunan = await imzaOku.ReadAsync(bas);
            if (!imzalar.Any(sig => okunan >= sig.Length && bas.Take(sig.Length).SequenceEqual(sig)))
                return BadRequest(ApiResponse<FaturaOkumaYanit>.HataDon("Dosya geçerli bir resim değil."));
        }

        // Görseli Python AI servisine ilet (multipart) — Gemini Vision orada çalışır
        try
        {
            var client = httpClientFactory.CreateClient("AiService");
            using var content = new MultipartFormDataContent();
            await using var stream = foto.OpenReadStream();
            var streamContent = new StreamContent(stream);
            streamContent.Headers.ContentType = new MediaTypeHeaderValue(foto.ContentType ?? "image/jpeg");
            content.Add(streamContent, "foto", foto.FileName);

            var httpYanit = await client.PostAsync("/fatura-oku", content);
            if (!httpYanit.IsSuccessStatusCode)
            {
                // AI servisinin gerçek hata sebebini ({"detail":"..."}) yüzeye çıkar — bare 502 yerine
                var hataGovde = await httpYanit.Content.ReadAsStringAsync();
                var detay = "AI servisi yanıt vermedi.";
                try
                {
                    using var doc = JsonDocument.Parse(hataGovde);
                    if (doc.RootElement.TryGetProperty("detail", out var d))
                        detay = d.GetString() ?? detay;
                }
                catch { /* JSON değilse genel mesaj kalsın */ }
                return StatusCode(502, ApiResponse<FaturaOkumaYanit>.HataDon($"Fatura okunamadı: {detay}"));
            }

            var json = await httpYanit.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var sonuc = JsonSerializer.Deserialize<FaturaOkumaYanit>(json, options);
            if (sonuc is null)
                return StatusCode(502, ApiResponse<FaturaOkumaYanit>.HataDon("Fatura verisi çözümlenemedi."));

            return Ok(ApiResponse<FaturaOkumaYanit>.BasariVeri(sonuc));
        }
        catch (HttpRequestException)
        {
            return StatusCode(503, ApiResponse<FaturaOkumaYanit>.HataDon(
                "AI servisi şu an çalışmıyor. Lütfen servisi başlatın."));
        }
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
