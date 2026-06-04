namespace IsletmeYonetim.Application.DTOs;

// Bakım listesindeki her kart için özet bilgi
public record BakimListeDto(
    Guid Id,
    string MusteriAdSoyad,
    string MusteriTelefon,
    string KartTipi,
    DateTime SonBakimTarihi,
    DateTime BakimYapilacakTarih,
    string Notlar,
    int GunKaldi,   // Kaç gün sonra bakım yapılacak (negatifse geçmiş)
    bool Gecmis,    // true ise bakım tarihi geçmiş demektir
    string MusteriAdres,     // Teknisyenin gideceği adres
    double? MusteriEnlem,    // Konuma git butonu için GPS koordinatı
    double? MusteriBoylam
);

// Bakım detay sayfasında gösterilen tam bilgi (geçmiş dahil)
public record BakimDetayDto(
    Guid Id,
    string MusteriAdSoyad,
    string MusteriTelefon,
    string KartTipi,
    DateTime SonBakimTarihi,
    DateTime BakimYapilacakTarih,
    string Notlar,
    int GunKaldi,
    bool Gecmis,
    string MusteriAdres,
    double? MusteriEnlem,
    double? MusteriBoylam,
    DateTime? MontajTarihi, // Satıştan geldiyse cihazın kurulum tarihi (AI cihaz yaşı için)
    List<BakimGecmisDto> Gecmisler // Bu karta yapılan tüm bakımların listesi
);

// Tek bir bakım geçmiş kaydı
public record BakimGecmisDto(
    Guid Id,
    string PersonelAdSoyad,
    DateTime YapilmaTarihi,
    string Aciklama
);

// Bakım geçmişi eklerken frontend'den gelen veri
public record BakimGecmisEkleRequest(
    string Aciklama,
    DateTime YapilmaTarihi,
    int YeniBakimAraligiGun // Bir sonraki bakım için yeni aralık (gün)
);

// Manuel bakım kartı oluştururken gelen veri (satışa bağlı değil)
public record ManuelBakimOlusturRequest(
    Guid MusteriId,
    string KartTipi,
    DateTime SonBakimTarihi,
    int BakimAraligiGun,
    string Notlar
);
