namespace IsletmeYonetim.Application.DTOs;

// Satış listesinde her satır için dönen veri
public record SatisListeDto(
    Guid Id,
    string MusteriAdSoyad,
    string UrunAdi,
    string PersonelAdSoyad,
    DateTime SatisTarihi,
    decimal SatisFiyati,
    bool BakimTakibiAktif
);

// Yeni satış oluştururken frontend'den gelen istek
public record SatisOlusturRequest(
    Guid MusteriId,
    Guid UrunId,
    decimal SatisFiyati,
    bool BakimTakibiAktif,
    DateTime? MontajTarihi, // BakimTakibiAktif = true ise zorunlu
    int? BakimAraligi       // BakimTakibiAktif = true ise zorunlu (gün cinsinden)
);
