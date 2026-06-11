namespace IsletmeYonetim.Domain.Entities;

// Kullanıcılara gönderilen uygulama içi bildirimler
public class Bildirim : ITenantEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IsletmeId { get; set; }   // Hangi işletmeye (tenant) ait
    public Guid KullaniciId { get; set; }
    public Kullanici Kullanici { get; set; } = null!;
    public string Mesaj { get; set; } = string.Empty;
    // Tip: bilgi=0, uyarı=1, hata=2 (string olarak saklanır)
    public BildirimTip Tip { get; set; } = BildirimTip.Bilgi;
    public bool OkunduMu { get; set; } = false;
    public DateTime OlusturmaTarihi { get; set; } = DateTime.UtcNow;
}

public enum BildirimTip
{
    Bilgi,
    Uyari,
    Hata
}
