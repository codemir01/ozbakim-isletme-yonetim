namespace IsletmeYonetim.Domain.Entities;

// BakimGecmisi tablosu — bir bakım kartına kaç kez bakım yapıldığının kaydı.
// Her bakım yapıldığında buraya bir satır eklenir ve bakım kartındaki tarih güncellenir.
public class BakimGecmis : ITenantEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IsletmeId { get; set; }   // Hangi işletmeye (tenant) ait
    public Guid BakimServisId { get; set; }    // FK: hangi bakım kartına ait
    public Guid YapanPersonelId { get; set; }  // FK: bakımı yapan teknisyen
    public DateTime YapilmaTarihi { get; set; }
    public string Aciklama { get; set; } = string.Empty; // Yapılan işlemlerin açıklaması

    public BakimServis BakimServis { get; set; } = null!;
    public Kullanici YapanPersonel { get; set; } = null!;
}
