using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Domain.Entities;
using IsletmeYonetim.Domain.Enums;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace IsletmeYonetim.Infrastructure.Services;

public class SatisService(
    AppDbContext db,
    IBildirimService bildirimService,
    ILogger<SatisService> logger) : ISatisService
{
    // Müşteri toplam borcu bu tutarı aşınca işletmenin admin'ine bildirim gider
    private const decimal YuksekBorcEsigi = 50000m;

    public async Task<PagedResponse<SatisListeDto>> GetSatislarAsync(int sayfa = 1, int boyut = 20)
    {
        sayfa = Math.Max(1, sayfa);
        boyut = Math.Clamp(boyut, 1, 100);

        var sorgu = db.Satislar
            .Include(s => s.Musteri)
            .Include(s => s.Urun)
            .Include(s => s.Personel)
            .OrderByDescending(s => s.SatisTarihi)
            .AsNoTracking();

        var toplam = await sorgu.CountAsync();

        var satislar = await sorgu
            .Skip((sayfa - 1) * boyut)
            .Take(boyut)
            .ToListAsync();

        var liste = satislar.Select(s => new SatisListeDto(
            s.Id,
            s.Musteri != null ? s.Musteri.Ad + " " + s.Musteri.Soyad : "Bilinmiyor",
            s.Urun != null ? s.Urun.UrunAdi : "Bilinmiyor",
            s.Personel != null ? s.Personel.Ad + " " + s.Personel.Soyad : "Bilinmiyor",
            s.SatisTarihi,
            s.SatisFiyati,
            s.BakimTakibiAktif
        )).ToList();

        return new PagedResponse<SatisListeDto>(true, liste, toplam, (int)Math.Ceiling(toplam / (double)boyut), sayfa, boyut);
    }

    public async Task<ApiResponse<object>> CreateSatisAsync(SatisOlusturRequest request, Guid personelId)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            // İş kuralı 1: Müşteri kontrolü
            var musteri = await db.Musteriler.FirstOrDefaultAsync(m => m.Id == request.MusteriId && !m.SilindiMi);
            if (musteri is null)
                return new ApiResponse<object>(false, null, "Müşteri bulunamadı.", null);

            // İş kuralı 2: Stok kontrolü — koşullu UPDATE ile race condition önlenir
            var etkilenen = await db.Urunler
                .Where(u => u.Id == request.UrunId && u.StokAdedi > 0)
                .ExecuteUpdateAsync(u => u.SetProperty(x => x.StokAdedi, x => x.StokAdedi - 1));

            if (etkilenen == 0)
            {
                var urunVar = await db.Urunler.AnyAsync(u => u.Id == request.UrunId);
                return new ApiResponse<object>(false, null,
                    urunVar ? "Ürün stokta yok." : "Ürün bulunamadı.", null);
            }

            // FirstOrDefaultAsync tenant filtresini uygular (FindAsync ATLAR).
            // Ürün adı yalnızca borç açıklamasında kullanılıyor; stok düşümü zaten doğruladı.
            var urun = await db.Urunler.FirstOrDefaultAsync(u => u.Id == request.UrunId);

            var satis = new Satis
            {
                MusteriId = request.MusteriId,
                UrunId = request.UrunId,
                PersonelId = personelId,
                SatisFiyati = request.SatisFiyati,
                BakimTakibiAktif = request.BakimTakibiAktif,
                MontajTarihi = request.MontajTarihi,
                BakimAraligi = request.BakimAraligi
            };
            db.Satislar.Add(satis);

            // İş kuralı 3: Borç ekle + audit kaydı
            decimal eskiBorc = musteri.ToplamBorc;
            musteri.ToplamBorc += request.SatisFiyati;
            db.BorcTahsilatlar.Add(new BorcTahsilat
            {
                MusteriId = request.MusteriId,
                Tip = BorcTahsilatTip.Borc,
                Miktar = request.SatisFiyati,
                Aciklama = $"Satış: {urun?.UrunAdi ?? "Ürün"}"
            });

            // İş kuralı 4: Bakım takibi aktifse otomatik bakım kartı
            if (request.BakimTakibiAktif && request.MontajTarihi.HasValue && request.BakimAraligi.HasValue)
            {
                db.BakimServisler.Add(new BakimServis
                {
                    MusteriId = request.MusteriId,
                    SatisId = satis.Id,
                    KartTipi = KartTipi.Bakim,
                    SonBakimTarihi = request.MontajTarihi.Value,
                    BakimYapilacakTarih = request.MontajTarihi.Value.AddDays(request.BakimAraligi.Value),
                    Notlar = "Satıştan otomatik oluşturuldu."
                });
            }

            await db.SaveChangesAsync();

            // İş kuralı 5: Stok kritik seviyeye düştüyse işletmenin admin'ine bildirim gönder.
            // urun.StokAdedi düşüm SONRASI değerdir (yukarıdaki ExecuteUpdate DB'ye işledi).
            // Spam olmasın diye yalnızca eşiğe YENİ düştüğünde ya da stok tamamen bittiğinde uyarır.
            if (urun is not null)
            {
                int yeniStok = urun.StokAdedi;
                int esik = urun.KritikStokSeviyesi;
                bool kritigeYeniDustu = yeniStok <= esik && (yeniStok + 1) > esik;
                if (kritigeYeniDustu || yeniStok == 0)
                {
                    try
                    {
                        var mesaj = yeniStok == 0
                            ? $"🔴 STOK BİTTİ: {urun.UrunAdi} ürününün stoğu tükendi."
                            : $"🟠 KRİTİK STOK: {urun.UrunAdi} ürününden yalnızca {yeniStok} adet kaldı.";

                        // Tenant filtresi sayesinde yalnızca BU işletmenin aktif admin'leri gelir
                        var adminIdleri = await db.Kullanicilar
                            .Where(k => k.Rol == Rol.Admin && k.AktifMi)
                            .Select(k => k.Id)
                            .ToListAsync();

                        foreach (var adminId in adminIdleri)
                            await bildirimService.CreateAsync(adminId, mesaj, BildirimTip.Uyari);
                    }
                    catch (Exception ex)
                    {
                        // Bildirim hatası satışı geri almasın — sessizce yutma, logla.
                        logger.LogWarning(ex, "Kritik stok bildirimi gönderilemedi. UrunId={UrunId}", request.UrunId);
                    }
                }
            }

            // İş kuralı 6: Müşteri toplam borcu yüksek borç eşiğini YENİ aştıysa admine bildirim
            if (eskiBorc <= YuksekBorcEsigi && musteri.ToplamBorc > YuksekBorcEsigi)
            {
                try
                {
                    var mesaj = $"⚠️ YÜKSEK BORÇ: {musteri.Ad} {musteri.Soyad} müşterisinin toplam borcu " +
                                $"{musteri.ToplamBorc:N0}₺ ile {YuksekBorcEsigi:N0}₺ eşiğini aştı.";
                    var adminIdleri = await db.Kullanicilar
                        .Where(k => k.Rol == Rol.Admin && k.AktifMi)
                        .Select(k => k.Id)
                        .ToListAsync();
                    foreach (var adminId in adminIdleri)
                        await bildirimService.CreateAsync(adminId, mesaj, BildirimTip.Uyari);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Yüksek borç bildirimi gönderilemedi. MusteriId={MusteriId}", request.MusteriId);
                }
            }

            await transaction.CommitAsync();
            return new ApiResponse<object>(true, null, null, "Satış kaydedildi.");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<ApiResponse<object>> GetOzetAsync()
    {
        var bugun = DateTime.UtcNow.Date;
        // Hafta başı: Pazartesi günü — DayOfWeek: Pazar=0, Pazartesi=1 ... Cumartesi=6
        // Pazar (0) için 6 gün geri git, diğer günler için (DayOfWeek-1) gün geri git
        var gunNo = (int)bugun.DayOfWeek;
        var haftaBasi = bugun.AddDays(gunNo == 0 ? -6 : -(gunNo - 1));
        var ayBasi = new DateTime(bugun.Year, bugun.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // Tek sorguda tüm özet — veritabanına 5 ayrı trip yerine 1 trip
        var ozet = await db.Satislar
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Toplam = g.Count(),
                ToplamCiro = g.Sum(s => (decimal?)s.SatisFiyati) ?? 0,
                AylikSatis = g.Count(s => s.SatisTarihi >= ayBasi),
                HaftalikSatis = g.Count(s => s.SatisTarihi >= haftaBasi),
                GunlukSatis = g.Count(s => s.SatisTarihi.Date == bugun)
            })
            .FirstOrDefaultAsync();

        return new ApiResponse<object>(true, new
        {
            toplam = ozet?.Toplam ?? 0,
            toplamCiro = ozet?.ToplamCiro ?? 0,
            aylikSatis = ozet?.AylikSatis ?? 0,
            haftalikSatis = ozet?.HaftalikSatis ?? 0,
            gunlukSatis = ozet?.GunlukSatis ?? 0
        }, null, null);
    }
}
