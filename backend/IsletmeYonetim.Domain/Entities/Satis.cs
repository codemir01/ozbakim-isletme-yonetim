namespace IsletmeYonetim.Domain.Entities;

// Satislar tablosu — her satış işlemi bir kayıt oluşturur
public class Satis
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MusteriId { get; set; }   // FK: hangi müşteriye satıldı
    public Guid UrunId { get; set; }      // FK: hangi ürün satıldı
    public Guid PersonelId { get; set; }  // FK: satışı yapan personel (JWT'den gelir)
    public decimal SatisFiyati { get; set; }
    public bool BakimTakibiAktif { get; set; } // true ise satış sonrası otomatik bakım kartı oluşur
    public DateTime? MontajTarihi { get; set; } // Ürünün kurulduğu tarih (bakım için başlangıç noktası)
    public int? BakimAraligi { get; set; }      // Kaç günde bir bakım yapılacak
    public DateTime SatisTarihi { get; set; } = DateTime.UtcNow;

    // Navigation property'ler — Include() ile yüklenir
    public Musteri Musteri { get; set; } = null!;
    public Urun Urun { get; set; } = null!;
    public Kullanici Personel { get; set; } = null!;
    public BakimServis? BakimServis { get; set; } // Varsa bu satışa bağlı bakım kartı
}
