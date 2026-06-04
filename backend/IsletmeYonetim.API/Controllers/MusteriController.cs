using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

// [Authorize]: Bu controller'a JWT token olmadan istek atılamaz
[ApiController]
[Route("api/v1/musteriler")]
[Authorize]
public class MusteriController(IMusteriService musteriService) : ControllerBase
{
    // GET /api/v1/musteriler?sayfa=1&boyut=20
    [HttpGet]
    public async Task<ActionResult<PagedResponse<MusteriListeDto>>> Liste([FromQuery] int sayfa = 1, [FromQuery] int boyut = 20)
    {
        var response = await musteriService.GetMusterilerAsync(sayfa, boyut);
        return Ok(response);
    }

    // GET /api/v1/musteriler/{id} — tek müşteri detayı
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<MusteriListeDto>>> Detay(Guid id)
    {
        var response = await musteriService.GetMusteriByIdAsync(id);
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    // POST /api/v1/musteriler — yeni müşteri oluştur
    [HttpPost]
    public async Task<ActionResult<ApiResponse<MusteriListeDto>>> Olustur([FromBody] MusteriOlusturRequest request)
    {
        var response = await musteriService.CreateMusteriAsync(request);
        // 201 Created: kaynak başarıyla oluşturuldu — REST standardı
        return response.Basarili
            ? StatusCode(201, response)
            : BadRequest(response);
    }

    // PUT /api/v1/musteriler/{id} — müşteri bilgilerini güncelle
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Guncelle(Guid id, [FromBody] MusteriGuncelleRequest request)
    {
        var response = await musteriService.UpdateMusteriAsync(id, request);
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    // DELETE /api/v1/musteriler/{id} — müşteriyi sil (ilişkili kayıt varsa engellenir)
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> Sil(Guid id)
    {
        var response = await musteriService.DeleteMusteriAsync(id);
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    // POST /api/v1/musteriler/{id}/borc-ekle — manuel borç ekle (audit kaydı oluşturur)
    [HttpPost("{id}/borc-ekle")]
    public async Task<ActionResult<ApiResponse<object>>> BorcEkle(Guid id, [FromBody] BorcEkleRequest request)
    {
        var response = await musteriService.AddBorcAsync(id, request);
        return response.Basarili ? Ok(response) : BadRequest(response);
    }

    // POST /api/v1/musteriler/{id}/tahsilat-ekle — tahsilat yap (kalan borçtan fazla olamaz)
    [HttpPost("{id}/tahsilat-ekle")]
    public async Task<ActionResult<ApiResponse<object>>> TahsilatEkle(Guid id, [FromBody] TahsilatEkleRequest request)
    {
        var response = await musteriService.AddTahsilatAsync(id, request);
        return response.Basarili ? Ok(response) : BadRequest(response);
    }

    // PUT /api/v1/musteriler/{id}/konum — sadece enlem/boylam güncelle
    [HttpPut("{id}/konum")]
    public async Task<ActionResult<ApiResponse<object>>> KonumGuncelle(Guid id, [FromBody] KonumGuncelleRequest request)
    {
        var response = await musteriService.UpdateKonumAsync(id, request);
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    // GET /api/v1/musteriler/{id}/borc-gecmis — borç/tahsilat geçmişini listele
    [HttpGet("{id}/borc-gecmis")]
    public async Task<ActionResult<ApiResponse<List<BorcTahsilatDto>>>> BorcGecmis(Guid id)
    {
        var response = await musteriService.GetBorcGecmisAsync(id);
        return Ok(response);
    }
}
