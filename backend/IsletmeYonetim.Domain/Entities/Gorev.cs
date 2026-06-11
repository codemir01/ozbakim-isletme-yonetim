using IsletmeYonetim.Domain.Enums;

namespace IsletmeYonetim.Domain.Entities;

// Gorevler tablosu — bir personele atanan iş.
// Bir görevin hem "oluşturanı" hem de "atananı" var; ikisi de Kullanici tablosuna FK.
// EF Core bunları otomatik ayırt edemez, bu yüzden AppDbContext'te elle tanımlandı.
public class Gorev
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string GorevAdi { get; set; } = string.Empty;
    public string GorevDetayi { get; set; } = string.Empty;
    public GorevOncelik Oncelik { get; set; } // Yuksek, Orta, Dusuk
    public GorevDurum Durum { get; set; } = GorevDurum.Bekliyor; // Bekliyor, Devam, Tamamlandi
    public Guid AtananId { get; set; }    // FK: görevi yapacak personel
    public Guid OlusturanId { get; set; } // FK: görevi oluşturan personel (JWT'den gelir)
    public Guid? MusteriId { get; set; }   // FK: görevin ilgili olduğu müşteri (opsiyonel — eski kayıtlarda null olabilir)
    public DateTime SonTeslimTarihi { get; set; }
    public DateTime OlusturmaTarihi { get; set; } = DateTime.UtcNow;

    // Teknisyen görevi tamamlarken çektiği "iş yapıldı" kanıt fotoğrafının yolu (ör. /uploads/gorevler/abc.jpg)
    public string? TamamlanmaFotografi { get; set; }
    public DateTime? TamamlanmaTarihi { get; set; }

    public Kullanici Atanan { get; set; } = null!;
    public Kullanici Olusturan { get; set; } = null!;
    public Musteri? Musteri { get; set; }  // Nullable — MusteriId null olabilir
}
