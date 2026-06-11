namespace IsletmeYonetim.Domain.Entities;

// Musteriler tablosunu temsil eden entity sınıfı.
// EF Core bu sınıfa bakarak veritabanında "Musteriler" tablosunu oluşturur.
public class Musteri : ITenantEntity
{
    public Guid Id { get; set; } = Guid.NewGuid(); // Birincil anahtar — her müşteri için benzersiz ID
    public Guid IsletmeId { get; set; }   // Hangi işletmeye (tenant) ait
    public string Ad { get; set; } = string.Empty;
    public string Soyad { get; set; } = string.Empty;
    public string Telefon { get; set; } = string.Empty;
    public string Adres { get; set; } = string.Empty;
    public double? Enlem { get; set; }  // Harita için GPS koordinatı (opsiyonel)
    public double? Boylam { get; set; } // Harita için GPS koordinatı (opsiyonel)
    public decimal ToplamBorc { get; set; } = 0;
    public decimal ToplamTahsilat { get; set; } = 0;
    public bool SilindiMi { get; set; } = false;
    public DateTime OlusturmaTarihi { get; set; } = DateTime.UtcNow;

    // Navigation property'ler: EF Core Include() ile bu ilişkili kayıtları da getirebilir
    public ICollection<Satis> Satislar { get; set; } = [];
    public ICollection<BakimServis> BakimServisler { get; set; } = [];
    public ICollection<Gorev> Gorevler { get; set; } = [];
    public ICollection<PersonelMusteri> PersonelMusteriler { get; set; } = [];
    public ICollection<BorcTahsilat> BorcTahsilatlar { get; set; } = [];
}
