using System.Security.Claims;
using IsletmeYonetim.Application.Interfaces;

namespace IsletmeYonetim.API.Tenancy;

// JWT içindeki "isletmeId" claim'inden aktif işletmeyi okur.
// Scoped — her HTTP isteği için ayrı örnek oluşur.
public class TenantProvider(IHttpContextAccessor accessor) : ITenantProvider
{
    private Guid? _override;

    public Guid? IsletmeId
    {
        get
        {
            if (_override is not null) return _override;     // manuel ayarlandıysa onu kullan
            var deger = accessor.HttpContext?.User?.FindFirst("isletmeId")?.Value;
            return Guid.TryParse(deger, out var id) ? id : null;
        }
    }

    public void SetIsletme(Guid isletmeId) => _override = isletmeId;
}
