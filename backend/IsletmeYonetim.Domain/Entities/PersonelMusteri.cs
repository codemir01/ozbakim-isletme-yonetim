namespace IsletmeYonetim.Domain.Entities;

public class PersonelMusteri : ITenantEntity
{
    public Guid IsletmeId { get; set; }   // Hangi işletmeye (tenant) ait
    public Guid PersonelId { get; set; }
    public Guid MusteriId { get; set; }

    public Kullanici Personel { get; set; } = null!;
    public Musteri Musteri { get; set; } = null!;
}
