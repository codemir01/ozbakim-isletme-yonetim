using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IsletmeYonetim.Infrastructure.Services;

public class AuthService(AppDbContext db, IJwtService jwtService, ILisansService lisansService) : IAuthService
{
    public async Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request)
    {
        // 0. Lisans kontrolü — süresi dolmuşsa giriş engellenir
        if (!await lisansService.LisansGecerliMiAsync())
            return new ApiResponse<LoginResponse>(false, null, "Lisansınız sona erdi. Lütfen yöneticinizle iletişime geçin.", null);

        // 1. E-posta ile aktif kullanıcıyı bul
        var kullanici = await db.Kullanicilar
            .FirstOrDefaultAsync(k => k.Eposta == request.Eposta && k.AktifMi);

        // 2. Kullanıcı yoksa veya şifre yanlışsa genel hata döndür
        // BCrypt.Verify: düz metni hash ile karşılaştırır — güvenli
        if (kullanici is null || !BCrypt.Net.BCrypt.Verify(request.Sifre, kullanici.SifreHash))
            return new ApiResponse<LoginResponse>(false, null, "E-posta veya şifre hatalı.", null);

        // 3. JWT token üret — içinde kullanıcı ID ve rolü şifreli şekilde taşır
        var token = jwtService.TokenOlustur(kullanici);

        var response = new LoginResponse(
            token,
            kullanici.Ad,
            kullanici.Soyad,
            kullanici.Rol.ToString(),
            kullanici.Id
        );

        return new ApiResponse<LoginResponse>(true, response, null, "Giriş başarılı.");
    }
}
