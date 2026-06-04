namespace IsletmeYonetim.Application.DTOs;

// GET /api/v1/profil — mevcut kullanıcı bilgileri
public record ProfilDto(
    Guid Id,
    string Ad,
    string Soyad,
    string Eposta,
    string Unvan,
    string Rol,
    DateTime OlusturmaTarihi
);

// PUT /api/v1/profil — ad, soyad, unvan güncelle
public record ProfilGuncelleRequest(
    string Ad,
    string Soyad,
    string Unvan
);

// PUT /api/v1/profil/sifre — şifre değiştir
public record SifreGuncelleRequest(
    string EskiSifre,
    string YeniSifre
);
