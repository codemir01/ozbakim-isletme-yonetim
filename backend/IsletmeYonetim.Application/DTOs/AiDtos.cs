namespace IsletmeYonetim.Application.DTOs;

// Python AI servisine gönderilecek istek
public record RiskTahminIstek(int CihazYasi, int BakimSayisi, int SonBakimGunSayisi);

// Python AI servisinden dönecek yanıt
public record RiskTahminYanit(string Risk, double Olasilik);

// Fatura/fiş görselinden AI (Gemini Vision OCR) ile çıkarılan yapılandırılmış veri.
// Python /fatura-oku ucundan döner; frontend onay ekranında düzenlenebilir.
public record FaturaOkumaYanit(
    string Firma,
    string Tarih,                 // "YYYY-AA-GG" (boş olabilir)
    decimal ToplamTutar,
    List<FaturaKalemDto> Kalemler
);

public record FaturaKalemDto(
    string Ad,
    int Adet,
    decimal BirimFiyat
);
