namespace IsletmeYonetim.Application.DTOs;

// Python AI servisine gönderilecek istek
public record RiskTahminIstek(int CihazYasi, int BakimSayisi, int SonBakimGunSayisi);

// Python AI servisinden dönecek yanıt
public record RiskTahminYanit(string Risk, double Olasilik);
