using IsletmeYonetim.API.Extensions;
using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsletmeYonetim.API.Controllers;

[ApiController]
[Route("api/v1/profil")]
[Authorize]
public class ProfilController(IProfilService profilService) : ControllerBase
{
    // JWT'den oturum açmış kullanıcının ID'sini alır
    private Guid KullaniciId => User.GetKullaniciId();

    // GET /api/v1/profil — mevcut kullanıcı bilgilerini döndür
    [HttpGet]
    public async Task<ActionResult<ApiResponse<ProfilDto>>> Get()
    {
        var response = await profilService.GetProfilAsync(KullaniciId);
        return response.Basarili ? Ok(response) : NotFound(response);
    }

    // PUT /api/v1/profil — ad, soyad, unvan güncelle
    [HttpPut]
    public async Task<ActionResult<ApiResponse<object>>> Guncelle([FromBody] ProfilGuncelleRequest request)
    {
        var response = await profilService.UpdateProfilAsync(KullaniciId, request);
        return response.Basarili ? Ok(response) : BadRequest(response);
    }

    // PUT /api/v1/profil/sifre — şifre değiştir
    [HttpPut("sifre")]
    public async Task<ActionResult<ApiResponse<object>>> SifreGuncelle([FromBody] SifreGuncelleRequest request)
    {
        var response = await profilService.UpdateSifreAsync(KullaniciId, request);
        return response.Basarili ? Ok(response) : BadRequest(response);
    }

    // PUT /api/v1/profil/ilk-sifre — ilk girişte şifre belirle (eski şifre sorulmaz)
    [HttpPut("ilk-sifre")]
    public async Task<ActionResult<ApiResponse<object>>> IlkSifre([FromBody] IlkSifreRequest request)
    {
        var response = await profilService.IlkSifreBelirleAsync(KullaniciId, request);
        return response.Basarili ? Ok(response) : BadRequest(response);
    }
}
