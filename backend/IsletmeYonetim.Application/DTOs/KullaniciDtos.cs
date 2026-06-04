using IsletmeYonetim.Domain.Enums;

namespace IsletmeYonetim.Application.DTOs;

// Kullanıcı listesinde dönen veri (şifre hash'i asla dışarı çıkmaz)
public record KullaniciListeDto(
    Guid Id,
    string Ad,
    string Soyad,
    string Eposta,
    string Telefon,
    string Unvan,
    string Rol,
    bool AktifMi,
    DateTime OlusturmaTarihi
);

// Yeni kullanıcı oluştururken gelen veri
// Şifre burada düz metin gelir, serviste BCrypt ile hash'lenerek kaydedilir
public record KullaniciOlusturRequest(
    string Ad,
    string Soyad,
    string Eposta,
    string Telefon,
    string Sifre,
    string Unvan,
    Rol Rol
);

// Kullanıcı güncellenirken gelen veri (şifre değiştirilemez — ayrı endpoint gerekir)
public record KullaniciGuncelleRequest(
    string Ad,
    string Soyad,
    string Eposta,
    string Telefon,
    string Unvan,
    Rol Rol,
    bool AktifMi
);
