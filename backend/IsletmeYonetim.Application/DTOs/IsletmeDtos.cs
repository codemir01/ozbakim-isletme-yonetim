namespace IsletmeYonetim.Application.DTOs;

// İşletmenin (depo/merkez) konumu — teknisyen rotası buradan başlar
public record IsletmeKonumDto(double? Enlem, double? Boylam);

// İşletme konumu güncelleme isteği (null gönderilirse konum kaldırılır)
public record IsletmeKonumGuncelleRequest(double? Enlem, double? Boylam);
