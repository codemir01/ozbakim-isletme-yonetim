using IsletmeYonetim.Domain.Enums;

namespace IsletmeYonetim.Domain.Entities;

public class Yetki
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Rol Rol { get; set; }
    public string Sayfa { get; set; } = string.Empty;
    public ErisimTipi ErisimTipi { get; set; }
}
