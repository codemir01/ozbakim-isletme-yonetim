namespace IsletmeYonetim.Application.DTOs;

public record LisansDto(
    Guid Id,
    string IsletmeAdi,
    string AdminEposta,
    DateTime BaslangicTarihi,
    DateTime BitisTarihi,
    bool Aktif,
    int KalanGun  // Hesaplanmış: BitisTarihi - Bugün
);

// Abonelik satın alma isteği — plan kodu (aylik / uc_aylik / yillik)
public record LisansSatinAlRequest(string Plan);
