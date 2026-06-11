using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace IsletmeYonetim.Infrastructure.Services;

public class JwtService(IConfiguration config) : IJwtService
{
    public string TokenOlustur(Kullanici kullanici)
    {
        // Gizli anahtar — appsettings.json'daki JwtSettings:Secret değeri
        var secret = config["JwtSettings:Secret"]!;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Token içine gömülen bilgiler (claim'ler)
        // "sub" = kullanıcı ID — controller'da User.FindFirstValue("sub") ile okunur
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, kullanici.Id.ToString()),
            new Claim("ad", $"{kullanici.Ad} {kullanici.Soyad}"),
            new Claim("rol", kullanici.Rol.ToString()),
            new Claim("isletmeId", kullanici.IsletmeId.ToString()), // Multi-tenancy: hangi işletme
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()) // Token'a benzersiz ID
        };

        var token = new JwtSecurityToken(
            issuer: config["JwtSettings:Issuer"],
            audience: config["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(
                int.Parse(config["JwtSettings:AccessExpireMin"] ?? "15")), // Varsayılan 15 dk
            signingCredentials: creds
        );

        // Token'ı string'e çevir — frontend bu string'i header'da gönderir
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
