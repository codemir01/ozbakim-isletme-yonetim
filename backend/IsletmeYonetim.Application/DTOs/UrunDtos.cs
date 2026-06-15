using IsletmeYonetim.Domain.Enums;

namespace IsletmeYonetim.Application.DTOs;

// Ürün listesinde her satır için dönen veri
public record UrunListeDto(
    Guid Id,
    string UrunAdi,
    string Kategori, // "Cihaz" veya "YedekParca" (string olarak dönüştürülmüş enum)
    string StokKodu,
    int StokAdedi,
    int KritikStokSeviyesi,
    decimal AlisFiyati,
    string Durum     // "Aktif" veya "Pasif"
);

// Yeni ürün oluştururken gelen veri (enum direkt alınır)
public record UrunOlusturRequest(
    string UrunAdi,
    UrunKategori Kategori,
    string StokKodu,
    int StokAdedi,
    decimal AlisFiyati,
    int KritikStokSeviyesi = 3
);

// Ürün güncellenirken gelen veri (durum da değiştirilebilir)
public record UrunGuncelleRequest(
    string UrunAdi,
    UrunKategori Kategori,
    string StokKodu,
    int StokAdedi,
    decimal AlisFiyati,
    UrunDurum Durum,
    int KritikStokSeviyesi = 3
);
