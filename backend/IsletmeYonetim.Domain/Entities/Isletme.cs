namespace IsletmeYonetim.Domain.Entities;

// Isletmeler tablosu — sistemdeki her bir "kiracı" (tenant) işletme.
// Multi-tenancy'nin kökü: her veri satırı bir Isletme'ye aittir (IsletmeId).
// Bir işletme kayıt olduğunda burada yeni bir kayıt oluşur ve tüm verisi izole edilir.
public class Isletme
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Ad { get; set; } = string.Empty;          // İşletme adı (örn. "Yıldız Teknik Servis")
    public string AdminEposta { get; set; } = string.Empty; // Kaydı yapan ilk admin'in e-postası
    public DateTime OlusturmaTarihi { get; set; } = DateTime.UtcNow;

    // İşletmenin (depo/merkez) konumu — teknisyen rotası buradan başlar
    public double? Enlem { get; set; }
    public double? Boylam { get; set; }
}
