using IsletmeYonetim.Domain.Enums;

namespace IsletmeYonetim.Domain.Entities;

// Urunler tablosu — satılabilen cihaz ve yedek parçalar
public class Urun
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UrunAdi { get; set; } = string.Empty;
    public UrunKategori Kategori { get; set; }  // Cihaz veya YedekParca
    public string StokKodu { get; set; } = string.Empty;
    public int StokAdedi { get; set; }          // Satış yapıldıkça azaltılır
    public decimal AlisFiyati { get; set; }
    public UrunDurum Durum { get; set; } = UrunDurum.Aktif;
    public bool SilindiMi { get; set; } = false;

    public ICollection<Satis> Satislar { get; set; } = [];
}
