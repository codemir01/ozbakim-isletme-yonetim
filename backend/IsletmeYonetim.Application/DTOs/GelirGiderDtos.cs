using IsletmeYonetim.Domain.Enums;

namespace IsletmeYonetim.Application.DTOs;

// Yeni gelir veya gider kaydı eklerken frontend'den gelen veri
public record GelirGiderOlusturRequest(
    GelirGiderTip Tip,
    decimal Miktar,
    string Aciklama,
    DateTime? Tarih   // null gelirse UtcNow kullanılır
);

// Gelir/gider listesinde her satır için dönen veri
public record GelirGiderListeDto(
    Guid Id,
    string Tip,
    decimal Miktar,
    string Aciklama,
    DateTime Tarih
);

// Özet: toplam gelir, toplam gider, net bakiye
public record GelirGiderOzetDto(
    decimal ToplamGelir,
    decimal ToplamGider,
    decimal NetBakiye,
    int GelirSayisi,
    int GiderSayisi
);
