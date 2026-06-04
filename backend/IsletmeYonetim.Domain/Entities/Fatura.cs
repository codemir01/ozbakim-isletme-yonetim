namespace IsletmeYonetim.Domain.Entities;

public class Fatura
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FaturaNo { get; set; } = $"FTR-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";
    public Guid SatisId { get; set; }
    public Guid KullaniciId { get; set; }
    public DateTime OlusturmaTarihi { get; set; } = DateTime.UtcNow;

    public Satis Satis { get; set; } = null!;
    public Kullanici Kullanici { get; set; } = null!;
}
