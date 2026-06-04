namespace IsletmeYonetim.Application.Interfaces;

public interface IRaporService
{
    // Aylık özet PDF — byte[] olarak döner, controller FileContentResult'a çevirir
    Task<byte[]> AylikOzetPdfAsync(int yil, int ay);

    // Tüm müşteriler Excel — byte[] olarak döner
    Task<byte[]> MusterilerExcelAsync();
}
