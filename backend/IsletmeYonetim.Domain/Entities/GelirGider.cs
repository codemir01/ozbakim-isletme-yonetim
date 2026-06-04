using IsletmeYonetim.Domain.Enums;

namespace IsletmeYonetim.Domain.Entities;

public class GelirGider
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public GelirGiderTip Tip { get; set; }
    public decimal Miktar { get; set; }
    public string Aciklama { get; set; } = string.Empty;
    public DateTime Tarih { get; set; } = DateTime.UtcNow;
}
