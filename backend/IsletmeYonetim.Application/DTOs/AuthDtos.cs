namespace IsletmeYonetim.Application.DTOs;

// Tüm API yanıtları bu standart yapıyı kullanır.
// Frontend her zaman "basarili" alanına bakarak işlemin başarılı olup olmadığını anlar.
public record ApiResponse<T>(bool Basarili, T? Veri, string? Hata, string? Mesaj);

public record PagedResponse<T>(
    bool Basarili,
    List<T> Veri,
    int ToplamKayit,
    int ToplamSayfa,
    int GecerliSayfa,
    int SayfaBoyutu);

// Giriş ekranından gelen istek
public record LoginRequest(string Eposta, string Sifre);

// İşletme kayıt (self-signup) isteği — yeni işletme + ilk admin oluşturur
public record KayitRequest(
    string IsletmeAdi,
    string Ad,
    string Soyad,
    string Eposta,
    string Sifre
);

// Başarılı girişte frontend'e gönderilen cevap
public record LoginResponse(
    string Token,       // JWT access token (15 dakika geçerli)
    string Ad,
    string Soyad,
    string Rol,         // "Admin", "Technician" vb.
    Guid KullaniciId
);
