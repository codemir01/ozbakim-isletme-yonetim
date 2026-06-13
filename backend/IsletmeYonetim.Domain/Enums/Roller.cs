namespace IsletmeYonetim.Domain.Enums;

// Kullanıcı rolleri — kim neye erişebilir bunu belirler
public enum Rol
{
    Admin,           // Yönetici: her şeye erişir
    SalesConsultant, // Satış Danışmanı
    Technician,      // Teknisyen: bakım/servis işlemleri
    Worker           // İşçi: sınırlı erişim
}

// Ürünün hangi kategoride olduğunu belirtir
public enum UrunKategori
{
    Cihaz,      // Satılabilen bir cihaz
    YedekParca  // Bakımda kullanılan yedek parça
}

// Ürünün stokta aktif mi yoksa pasif mi olduğunu belirtir
public enum UrunDurum
{
    Aktif,
    Pasif
}

// Bakım kartının tipi — bakım mı yoksa servis mi
public enum KartTipi
{
    Bakim,
    Servis
}

// Görev öncelik sırası
public enum GorevOncelik
{
    Yuksek,
    Orta,
    Dusuk
}

// Görevin şu anki durumu
public enum GorevDurum
{
    Bekliyor,
    Devam,
    Tamamlandi
}

// Borç/tahsilat kaydının tipi
public enum BorcTahsilatTip
{
    Borc,
    Tahsilat
}

// Gelir/gider kaydının tipi
public enum GelirGiderTip
{
    Gelir,
    Gider
}
