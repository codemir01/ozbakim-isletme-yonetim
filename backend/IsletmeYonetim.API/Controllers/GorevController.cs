using System.Security.Claims;
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
    // GET /api/v1/gorevler — tüm görevleri listele
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<GorevListeDto>>>> Liste()
    {
        var response = await gorevService.GetGorevlerAsync();
        return Ok(response);
    }

    // POST /api/v1/gorevler — yeni görev oluştur
    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Olustur([FromBody] GorevOlusturRequest request)
    {
        // Görevi kimin oluşturduğunu JWT'den al
        var kullaniciId = Guid.Parse(User.FindFirstValue("sub")
                          ?? throw new UnauthorizedAccessException());

        var response = await gorevService.CreateGorevAsync(request, kullaniciId);
        return Ok(response);
    }

    // PUT /api/v1/gorevler/{id}/durum — görev durumunu güncelle (Bekliyor→Devam→Tamamlandi)
    [HttpPut("{id}/durum")]
    public async Task<ActionResult<ApiResponse<object>>> DurumGuncelle(Guid id, [FromBody] GorevDurumGuncelleRequest request)
    {
        var response = await gorevService.UpdateDurumAsync(id, request);
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    // PUT /api/v1/gorevler/{id}/tamamla — teknisyen kanıt fotoğrafı yükleyerek görevi tamamlar (multipart/form-data)
    [HttpPut("{id}/tamamla")]
    public async Task<ActionResult<ApiResponse<object>>> Tamamla(Guid id, IFormFile foto)
    {
        if (foto is null || foto.Length == 0)
            return BadRequest(new ApiResponse<object>(false, null, "Kanıt fotoğrafı gerekli.", null));

        // Sadece resim uzantılarına izin ver
        var ext = Path.GetExtension(foto.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png"))
            return BadRequest(new ApiResponse<object>(false, null, "Sadece JPG veya PNG yüklenebilir.", null));

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
        var response = await gorevService.TamamlaAsync(id, fotografYolu);
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
