using IsletmeYonetim.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace IsletmeYonetim.Infrastructure.Data;

// EF Core'un veritabanıyla konuştuğu merkezi sınıf.
// Her DbSet bir tabloya karşılık gelir.
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Kullanici> Kullanicilar => Set<Kullanici>();
    public DbSet<Musteri> Musteriler => Set<Musteri>();
    public DbSet<Urun> Urunler => Set<Urun>();
    public DbSet<Satis> Satislar => Set<Satis>();
    public DbSet<BakimServis> BakimServisler => Set<BakimServis>();
    public DbSet<BakimGecmis> BakimGecmisi => Set<BakimGecmis>();
    public DbSet<Gorev> Gorevler => Set<Gorev>();
    public DbSet<PersonelMusteri> PersonelMusteriler => Set<PersonelMusteri>();
    public DbSet<BorcTahsilat> BorcTahsilatlar => Set<BorcTahsilat>();
    public DbSet<Fatura> Faturalar => Set<Fatura>();
    public DbSet<GelirGider> GelirGiderler => Set<GelirGider>();
    public DbSet<Yetki> Yetkiler => Set<Yetki>();
    public DbSet<Bildirim> Bildirimler => Set<Bildirim>();
    public DbSet<Lisans> Lisanslar => Set<Lisans>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // PersonelMusteri tablosunun birincil anahtarı bileşik — PersonelId + MusteriId
        modelBuilder.Entity<PersonelMusteri>()
            .HasKey(pm => new { pm.PersonelId, pm.MusteriId });

        // Gorev entity'sinde iki ayrı Kullanici FK'sı var (Atanan ve Olusturan).
        // EF Core bunu otomatik ayırt edemez, elle tanımlamazsak migration hatası verir.
        modelBuilder.Entity<Gorev>()
            .HasOne(g => g.Atanan)
            .WithMany()
            .HasForeignKey(g => g.AtananId)
            .OnDelete(DeleteBehavior.Restrict); // Kullanıcı silinince görev silinmesin

        modelBuilder.Entity<Gorev>()
            .HasOne(g => g.Olusturan)
            .WithMany()
            .HasForeignKey(g => g.OlusturanId)
            .OnDelete(DeleteBehavior.Restrict);

        // MusteriId opsiyonel — eski görevlerde null olabilir
        modelBuilder.Entity<Gorev>()
            .HasOne(g => g.Musteri)
            .WithMany(m => m.Gorevler)
            .HasForeignKey(g => g.MusteriId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        // Müşteri silinince satışlar CASCADE ile silinmesin — önce satışlar silinmeli
        modelBuilder.Entity<Satis>()
            .HasOne(s => s.Musteri)
            .WithMany(m => m.Satislar)
            .HasForeignKey(s => s.MusteriId)
            .OnDelete(DeleteBehavior.Restrict);

        // BakimServis ile Satis arasında bire-bir opsiyonel ilişki
        // Satış silinirse bakım kartı silinmez, SatisId = null yapılır
        modelBuilder.Entity<BakimServis>()
            .HasOne(b => b.Satis)
            .WithOne(s => s.BakimServis)
            .HasForeignKey<BakimServis>(b => b.SatisId)
            .OnDelete(DeleteBehavior.SetNull);

        // Para alanlarında hassasiyet ayarı: toplam 18 basamak, 2'si ondalık
        modelBuilder.Entity<Musteri>()
            .Property(m => m.ToplamBorc).HasPrecision(18, 2);
        modelBuilder.Entity<Musteri>()
            .Property(m => m.ToplamTahsilat).HasPrecision(18, 2);
        modelBuilder.Entity<Satis>()
            .Property(s => s.SatisFiyati).HasPrecision(18, 2);
        modelBuilder.Entity<Urun>()
            .Property(u => u.AlisFiyati).HasPrecision(18, 2);
        modelBuilder.Entity<BorcTahsilat>()
            .Property(b => b.Miktar).HasPrecision(18, 2);
        modelBuilder.Entity<GelirGider>()
            .Property(g => g.Miktar).HasPrecision(18, 2);

        // Enum'ları integer yerine string olarak sakla — veritabanı okunabilirliği için
        modelBuilder.Entity<Kullanici>()
            .Property(k => k.Rol).HasConversion<string>();
        modelBuilder.Entity<Urun>()
            .Property(u => u.Kategori).HasConversion<string>();
        modelBuilder.Entity<Urun>()
            .Property(u => u.Durum).HasConversion<string>();
        modelBuilder.Entity<BakimServis>()
            .Property(b => b.KartTipi).HasConversion<string>();
        modelBuilder.Entity<Gorev>()
            .Property(g => g.Oncelik).HasConversion<string>();
        modelBuilder.Entity<Gorev>()
            .Property(g => g.Durum).HasConversion<string>();
        modelBuilder.Entity<BorcTahsilat>()
            .Property(b => b.Tip).HasConversion<string>();
        modelBuilder.Entity<GelirGider>()
            .Property(g => g.Tip).HasConversion<string>();
        modelBuilder.Entity<Yetki>()
            .Property(y => y.Rol).HasConversion<string>();
        modelBuilder.Entity<Yetki>()
            .Property(y => y.ErisimTipi).HasConversion<string>();
        modelBuilder.Entity<Bildirim>()
            .Property(b => b.Tip).HasConversion<string>();
        modelBuilder.Entity<Bildirim>()
            .HasIndex(b => new { b.KullaniciId, b.OkunduMu })
            .HasDatabaseName("ix_bildirimler_kullanici_okundu");

        // Performans indexleri — sık sorgulanan alanlarda arama hızlanır
        modelBuilder.Entity<Musteri>()
            .HasIndex(m => m.SilindiMi).HasDatabaseName("ix_musteriler_silinmedi");
        modelBuilder.Entity<Urun>()
            .HasIndex(u => u.SilindiMi).HasDatabaseName("ix_urunler_silinmedi");
        modelBuilder.Entity<Satis>()
            .HasIndex(s => s.MusteriId).HasDatabaseName("ix_satislar_musteriid");
        modelBuilder.Entity<BakimServis>()
            .HasIndex(b => b.BakimYapilacakTarih).HasDatabaseName("ix_bakimservisler_tarih");
        modelBuilder.Entity<Gorev>()
            .HasIndex(g => g.Durum).HasDatabaseName("ix_gorevler_durum");
        modelBuilder.Entity<BorcTahsilat>()
            .HasIndex(b => b.MusteriId).HasDatabaseName("ix_borctahsilatlar_musteriid");
    }
}
