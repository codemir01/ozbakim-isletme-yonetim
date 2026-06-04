namespace IsletmeYonetim.Application.DTOs;

// Fatura oluştururken gönderilecek veri — hangi satış için fatura kesilecek
public record FaturaOlusturRequest(Guid SatisId);

// Fatura listesinde her satır için dönen veri
public record FaturaListeDto(
    Guid Id,
    string MusteriAdSoyad,
    string UrunAdi,
    decimal Tutar,
    DateTime SatisTarihi,
    string OlusturanAdi,
    DateTime OlusturmaTarihi
);

// Fatura detay sayfası — Müşteri + ürün + satış bilgilerinin tamamı
public record FaturaDetayDto(
    Guid Id,
    Guid SatisId,
    string MusteriAd,
    string MusteriSoyad,
    string MusteriTelefon,
    string MusteriAdres,
    string UrunAdi,
    string UrunKategori,
    decimal Tutar,
    DateTime SatisTarihi,
    bool BakimTakibiAktif,
    string OlusturanAdi,
    DateTime OlusturmaTarihi
);
