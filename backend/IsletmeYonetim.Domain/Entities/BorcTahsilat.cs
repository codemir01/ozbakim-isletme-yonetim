using IsletmeYonetim.Domain.Enums;

namespace IsletmeYonetim.Domain.Entities;

// BorcTahsilatlar tablosu — müşteriyle yapılan her borç/tahsilat işleminin geçmişi
public class BorcTahsilat : ITenantEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IsletmeId { get; set; }   // Hangi işletmeye (tenant) ait
    public Guid MusteriId { get; set; }
    public BorcTahsilatTip Tip { get; set; } // Borc veya Tahsilat
    public decimal Miktar { get; set; }
    public DateTime Tarih { get; set; } = DateTime.UtcNow;
    public string Aciklama { get; set; } = string.Empty;

    public Musteri Musteri { get; set; } = null!;
}
