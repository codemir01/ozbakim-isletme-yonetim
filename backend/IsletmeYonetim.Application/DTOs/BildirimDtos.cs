namespace IsletmeYonetim.Application.DTOs;

public record BildirimDto(
    Guid Id,
    string Mesaj,
    string Tip,
    bool OkunduMu,
    DateTime OlusturmaTarihi
);
