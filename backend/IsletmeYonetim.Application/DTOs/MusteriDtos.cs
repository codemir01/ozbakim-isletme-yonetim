namespace IsletmeYonetim.Application.DTOs;

// Müşteri listesinde ve detay sayfasında kullanılan veri
public record MusteriListeDto(
    Guid Id,
    string Ad,
    string Soyad,
    string Telefon,
    string Adres,
    double? Enlem,         // Harita için (opsiyonel)
    double? Boylam,        // Harita için (opsiyonel)
    decimal ToplamBorc,
    decimal ToplamTahsilat,
    DateTime OlusturmaTarihi
);

// Yeni müşteri oluştururken frontend'den gelen form verisi
public record MusteriOlusturRequest(
    string Ad,
    string Soyad,
    string Telefon,
    string Adres,
    double? Enlem,
    double? Boylam
);

// Müşteri güncellenirken gelen veri (ID URL'den alınır, buraya girmez)
public record MusteriGuncelleRequest(
    string Ad,
    string Soyad,
    string Telefon,
    string Adres,
    double? Enlem,
    double? Boylam
);

// Sadece konum güncellemek için kullanılan istek (diğer alanlar değişmez)
public record KonumGuncelleRequest(double? Enlem, double? Boylam);

// Borç veya tahsilat eklerken gelen form verisi
public record BorcEkleRequest(decimal Miktar, string Aciklama = "");
public record TahsilatEkleRequest(decimal Miktar, string Aciklama = "");

// Borç/tahsilat geçmişi listesi için dönen DTO
public record BorcTahsilatDto(
    Guid Id,
    string Tip,         // "Borc" veya "Tahsilat"
    decimal Miktar,
    DateTime Tarih,
    string Aciklama
);
