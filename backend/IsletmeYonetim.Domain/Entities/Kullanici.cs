using IsletmeYonetim.Domain.Enums;

namespace IsletmeYonetim.Domain.Entities;

// Kullanicilar tablosu — sisteme giriş yapabilen personel ve yöneticiler
public class Kullanici : ITenantEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IsletmeId { get; set; }   // Hangi işletmeye (tenant) ait
    public string Ad { get; set; } = string.Empty;
    public string Soyad { get; set; } = string.Empty;
    public string Eposta { get; set; } = string.Empty;  // Giriş için kullanılır
    public string Telefon { get; set; } = string.Empty;
    public string Unvan { get; set; } = string.Empty;   // Örn: "Saha Teknisyeni"
    public string SifreHash { get; set; } = string.Empty; // BCrypt ile hashlenen şifre — düz metin saklanmaz
    public Rol Rol { get; set; }      // Admin, SalesConsultant, Technician, Worker
    public bool AktifMi { get; set; } = true; // Soft delete: silmek yerine pasife alıyoruz
    // Admin tarafından oluşturulan elemanlar için true; ilk girişte şifre değiştirmeye zorlanır
    public bool IlkGiris { get; set; } = false;
    public DateTime OlusturmaTarihi { get; set; } = DateTime.UtcNow;
}
