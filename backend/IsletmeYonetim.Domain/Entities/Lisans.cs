namespace IsletmeYonetim.Domain.Entities;

// İşletmenin kullandığı lisans bilgisi — tek kayıt olması beklenir
public class Lisans : ITenantEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IsletmeId { get; set; }   // Hangi işletmeye (tenant) ait
    public string IsletmeAdi { get; set; } = string.Empty;
    public string AdminEposta { get; set; } = string.Empty;
    public DateTime BaslangicTarihi { get; set; }
    public DateTime BitisTarihi { get; set; }
    public bool Aktif { get; set; } = true;
}
