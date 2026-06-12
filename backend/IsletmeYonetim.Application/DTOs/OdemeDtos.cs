namespace IsletmeYonetim.Application.DTOs;

// Frontend'den gelen kart bilgisi (iyzico sandbox test kartı kullanılır — gerçek kart değil)
public record KartBilgisi(
    string KartSahibi,   // Kart üzerindeki isim
    string KartNo,       // 16 haneli (boşluklu gelebilir, temizlenir)
    string SonAy,        // Son kullanma ayı  "12"
    string SonYil,       // Son kullanma yılı "2030"
    string Cvc           // 3 haneli güvenlik kodu
);

// Ödeme servisinin sonucu — başarılı mı, değilse neden?
public record OdemeSonuc(bool Basarili, string? HataMesaji);
