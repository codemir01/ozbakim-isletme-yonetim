namespace IsletmeYonetim.Application.DTOs;

// Dashboard ana özet kartları — tek sorguda tüm sayaçlar
public record DashboardOzetDto(
    int ToplamMusteri,
    int ToplamUrun,
    int ToplamSatis,
    decimal ToplamCiro,
    int BekleyenGorev,
    int YaklasanBakim,
    decimal ToplamBorc,
    decimal ToplamTahsilat,
    int PersonelSayisi
);

// Son 7 günün satış grafiği için — her gün bir satır
public record SatisGrafikDto(string Tarih, int Adet, decimal Ciro);

// Yaklaşan bakımlar listesindeki her bir bakım kaydı
public record BakimYaklasimiDto(
    Guid Id,
    string MusteriAdi,
    DateTime BakimYapilacakTarih,
    string KartTipi,
    string Telefon
);

// Yaklaşan bakımları 3 kategoride döner: geçmiş, bugün, bu hafta
public record YaklasanBakimlarDto(
    List<BakimYaklasimiDto> Gecmis,
    List<BakimYaklasimiDto> Bugun,
    List<BakimYaklasimiDto> BuHafta
);

// En çok satan 10 ürün için
public record EnCokSatanDto(
    string UrunAdi,
    string Kategori,
    int SatisAdedi,
    decimal ToplamGelir
);

// Bakımı en çok yapılan cihazlar için — BakimGecmisi sayısına göre sıralanır
public record BakimServisCihazDto(string Cihaz, int Adet);
