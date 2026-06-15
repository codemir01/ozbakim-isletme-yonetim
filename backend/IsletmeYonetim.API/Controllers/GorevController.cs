using IsletmeYonetim.API.Extensions;
using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/gorevler")]
[Authorize]
public class GorevController(IGorevService gorevService, IWebHostEnvironment env) : ControllerBase
{
    private const int MaxDosyaBoyutu = 5 * 1024 * 1024; // 5 MB

    // Uzantı → kabul edilen dosya imzaları (magic bytes). JPEG: FF D8 FF, PNG: 89 50 4E 47
    private static readonly Dictionary<string, byte[][]> GecerliImzalar = new()
    {
        [".jpg"]  = [[0xFF, 0xD8, 0xFF]],
        [".jpeg"] = [[0xFF, 0xD8, 0xFF]],
        [".png"]  = [[0x89, 0x50, 0x4E, 0x47]],
    };

    // GET /api/v1/gorevler — tüm görevleri listele
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<GorevListeDto>>>> Liste()
    {
        var response = await gorevService.GetGorevlerAsync();
        return Ok(response);
    }

    // POST /api/v1/gorevler — yeni görev oluştur (yalnızca yönetici görev atayabilir)
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> Olustur([FromBody] GorevOlusturRequest request)
    {
        // Görevi kimin oluşturduğunu JWT'den al
        var response = await gorevService.CreateGorevAsync(request, User.GetKullaniciId());
        return response.Basarili ? StatusCode(201, response) : BadRequest(response);
    }

    // PUT /api/v1/gorevler/{id}/durum — görev durumunu güncelle (Bekliyor→Devam→Tamamlandi)
    [HttpPut("{id}/durum")]
    public async Task<ActionResult<ApiResponse<object>>> DurumGuncelle(Guid id, [FromBody] GorevDurumGuncelleRequest request)
    {
        var response = await gorevService.UpdateDurumAsync(id, request, User.GetKullaniciId(), User.IsInRole("Admin"));
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    // PUT /api/v1/gorevler/{id}/tamamla — teknisyen kanıt fotoğrafı yükleyerek görevi tamamlar (multipart/form-data)
    [HttpPut("{id}/tamamla")]
    [RequestSizeLimit(MaxDosyaBoyutu)] // İstek gövdesini 5 MB ile sınırla (DoS / disk dolması koruması)
    public async Task<ActionResult<ApiResponse<object>>> Tamamla(Guid id, IFormFile foto)
    {
        if (foto is null || foto.Length == 0)
            return BadRequest(ApiResponse<object>.HataDon("Kanıt fotoğrafı gerekli."));

        if (foto.Length > MaxDosyaBoyutu)
            return BadRequest(ApiResponse<object>.HataDon("Dosya 5 MB'tan büyük olamaz."));

        // Sadece resim uzantılarına izin ver
        var ext = Path.GetExtension(foto.FileName).ToLowerInvariant();
        if (!GecerliImzalar.TryGetValue(ext, out var imzalar))
            return BadRequest(ApiResponse<object>.HataDon("Sadece JPG veya PNG yüklenebilir."));

        // İçerik doğrulaması: dosyanın gerçekten resim olduğunu "magic byte" (dosya imzası)
        // ile teyit et. Böylece zararlı bir dosyaya .jpg uzantısı verip yüklemek engellenir.
        await using (var imzaOku = foto.OpenReadStream())
        {
            var bas = new byte[8];
            var okunan = await imzaOku.ReadAsync(bas);
            if (!imzalar.Any(sig => okunan >= sig.Length && bas.Take(sig.Length).SequenceEqual(sig)))
                return BadRequest(ApiResponse<object>.HataDon("Dosya geçerli bir resim değil."));
        }

        // wwwroot/uploads/gorevler altına benzersiz isimle kaydet
        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var klasor = Path.Combine(webRoot, "uploads", "gorevler");
        Directory.CreateDirectory(klasor);

        var dosyaAdi = $"{Guid.NewGuid()}{ext}";
        var tamYol = Path.Combine(klasor, dosyaAdi);
        await using (var stream = System.IO.File.Create(tamYol))
            await foto.CopyToAsync(stream);

        // DB'ye göreli URL kaydet (istemci kendi API adresiyle birleştirir)
        var fotografYolu = $"/uploads/gorevler/{dosyaAdi}";
        var response = await gorevService.TamamlaAsync(id, fotografYolu, User.GetKullaniciId(), User.IsInRole("Admin"));
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    // GET /api/v1/gorevler/personeller — görev atama dropdown'u için aktif personel listesi
    [HttpGet("personeller")]
    public async Task<ActionResult<ApiResponse<List<PersonelOzetDto>>>> Personeller()
    {
        var response = await gorevService.GetPersonellerAsync();
        return Ok(response);
    }
}
