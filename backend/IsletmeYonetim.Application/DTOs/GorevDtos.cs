namespace IsletmeYonetim.Application.DTOs;

// Görev listesindeki her satır için veri
public record GorevListeDto(
    Guid Id,
    string GorevAdi,
    string GorevDetayi,
    string Oncelik,          // "Yuksek", "Orta", "Dusuk"
    string Durum,            // "Bekliyor", "Devam", "Tamamlandi"
    string AtananAdSoyad,
    string MusteriAdSoyad,
    DateTime SonTeslimTarihi,
    DateTime OlusturmaTarihi,
    bool Gecikti,            // Son teslim tarihi geçtiyse ve tamamlanmadıysa true
    string? TamamlanmaFotografi, // Teknisyenin yüklediği kanıt fotoğrafı yolu (null = yok)
    DateTime? TamamlanmaTarihi
);

// Yeni görev oluştururken frontend'den gelen veri
public record GorevOlusturRequest(
    string GorevAdi,
    string GorevDetayi,
    string Oncelik,   // String olarak gelir, serviste Enum.TryParse ile dönüştürülür
    Guid AtananId,
    Guid MusteriId,
    DateTime SonTeslimTarihi
);

// Görev durumu güncellenirken gelen veri (sadece durum değişir)
public record GorevDurumGuncelleRequest(string Durum);

// Görev atama dropdown'u için personel özeti
public record PersonelOzetDto(Guid Id, string AdSoyad, string Rol);
