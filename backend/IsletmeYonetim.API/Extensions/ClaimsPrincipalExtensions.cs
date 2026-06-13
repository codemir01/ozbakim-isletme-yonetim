using System.Security.Claims;

namespace IsletmeYonetim.API.Extensions;

// JWT'deki kullanıcı kimliğini okumak için ortak yardımcı.
// Eskiden her controller'da tekrarlanan
// Guid.Parse(User.FindFirstValue("sub") ?? throw ...) kalıbı buraya taşındı.
public static class ClaimsPrincipalExtensions
{
    // Oturum açmış kullanıcının ID'sini JWT "sub" claim'inden çözer.
    // Token yoksa/bozuksa UnauthorizedAccessException → middleware bunu 401'e çevirir.
    public static Guid GetKullaniciId(this ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var id))
            throw new UnauthorizedAccessException("Geçersiz veya eksik kimlik bilgisi.");
        return id;
    }
}
