using System.Security.Claims;
using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/gorevler")]
[Authorize]
public class GorevController(IGorevService gorevService) : ControllerBase
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

    // GET /api/v1/gorevler/personeller — görev atama dropdown'u için aktif personel listesi
    [HttpGet("personeller")]
    public async Task<ActionResult<ApiResponse<List<PersonelOzetDto>>>> Personeller()
    {
        var response = await gorevService.GetPersonellerAsync();
        return Ok(response);
    }
}
