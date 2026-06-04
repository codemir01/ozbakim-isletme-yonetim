namespace IsletmeYonetim.Domain.Entities;

public class PersonelMusteri
{
    public Guid PersonelId { get; set; }
    public Guid MusteriId { get; set; }

    public Kullanici Personel { get; set; } = null!;
    public Musteri Musteri { get; set; } = null!;
}
