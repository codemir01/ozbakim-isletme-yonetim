using IsletmeYonetim.Domain.Enums;

namespace IsletmeYonetim.Domain.Entities;

// BakimServisler tablosu — her müşteri için bir bakım kartı.
// Bu kart satıştan otomatik oluşabilir (SatisId dolu) veya manuel eklenebilir (SatisId null).
public class BakimServis : ITenantEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IsletmeId { get; set; }   // Hangi işletmeye (tenant) ait
    public Guid MusteriId { get; set; }
    public Guid? SatisId { get; set; }          // Opsiyonel: satıştan oluştuysa dolu
    public KartTipi KartTipi { get; set; }      // Bakim veya Servis
    public DateTime SonBakimTarihi { get; set; }       // En son bakım yapılan tarih
    public DateTime BakimYapilacakTarih { get; set; }  // Bir sonraki bakım tarihi
    public string Notlar { get; set; } = string.Empty;

    public Musteri Musteri { get; set; } = null!;
    public Satis? Satis { get; set; }                           // Satıştan geldiyse dolu
    public ICollection<BakimGecmis> BakimGecmisi { get; set; } = []; // Bu karta yapılan tüm bakımlar
}
