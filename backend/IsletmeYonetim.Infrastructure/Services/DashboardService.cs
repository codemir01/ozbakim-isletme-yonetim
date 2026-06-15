using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Domain.Enums;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IsletmeYonetim.Infrastructure.Services;

public class DashboardService(AppDbContext db, ITenantProvider tenant) : IDashboardService
{
    public async Task<ApiResponse<DashboardOzetDto>> GetOzetAsync()
    {
        // EF Core DbContext thread-safe değil; aynı context üzerinden paralel sorgu atılamaz.
        // Bu nedenle bağımsız sorgular gruplanarak toplam round-trip sayısı azaltıldı.

        // Müşteri toplamları tek sorguda: COUNT + SUM + SUM
        var musteriOzet = await db.Musteriler
            .Where(m => !m.SilindiMi)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Sayisi = g.Count(),
                ToplamBorc = g.Sum(m => (decimal?)m.ToplamBorc) ?? 0,
                ToplamTahsilat = g.Sum(m => (decimal?)m.ToplamTahsilat) ?? 0
            })
            .FirstOrDefaultAsync();

        // Satış toplamları tek sorguda: COUNT + SUM
        var satisOzet = await db.Satislar
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Sayisi = g.Count(),
                Ciro = g.Sum(s => (decimal?)s.SatisFiyati) ?? 0
            })
            .FirstOrDefaultAsync();

        var toplamUrun = await db.Urunler.CountAsync(u => !u.SilindiMi);
        var bekleyenGorev = await db.Gorevler.CountAsync(g => g.Durum == GorevDurum.Bekliyor);
        var yaklasanBakim = await db.BakimServisler
            .CountAsync(b => b.BakimYapilacakTarih <= DateTime.UtcNow.AddDays(7));
        var personelSayisi = await db.Kullanicilar.CountAsync(k => k.AktifMi);

        var bugun = DateTime.UtcNow.Date;
        // Proaktif uyarı sayaçları
        var kritikStokSayisi = await db.Urunler
            .CountAsync(u => !u.SilindiMi && u.Durum == UrunDurum.Aktif && u.StokAdedi <= u.KritikStokSeviyesi);
        var gecikenBakim = await db.BakimServisler
            .CountAsync(b => b.BakimYapilacakTarih < bugun);
        var gecikenGorev = await db.Gorevler
            .CountAsync(g => g.SonTeslimTarihi < bugun && g.Durum != GorevDurum.Tamamlandi);

        var ozet = new DashboardOzetDto(
            musteriOzet?.Sayisi ?? 0,
            toplamUrun,
            satisOzet?.Sayisi ?? 0,
            satisOzet?.Ciro ?? 0,
            bekleyenGorev,
            yaklasanBakim,
            musteriOzet?.ToplamBorc ?? 0,
            musteriOzet?.ToplamTahsilat ?? 0,
            personelSayisi,
            kritikStokSayisi,
            gecikenBakim,
            gecikenGorev);

        return new ApiResponse<DashboardOzetDto>(true, ozet, null, null);
    }

    public async Task<ApiResponse<List<SatisGrafikDto>>> GetSatisGrafikAsync()
    {
        var son7Gun = DateTime.UtcNow.Date.AddDays(-6);

        // Son 7 günün satışlarını gün gün grupla
        var veriler = await db.Satislar
            .Where(s => s.SatisTarihi >= son7Gun)
            .GroupBy(s => s.SatisTarihi.Date)
            .Select(g => new
            {
                Tarih = g.Key,
                Adet = g.Count(),
                Ciro = g.Sum(s => s.SatisFiyati)
            })
            .ToListAsync();

        // Satış olmayan günler için 0 değer ekle — grafik boşluk göstermesin
        var sonuc = new List<SatisGrafikDto>();
        for (int i = 0; i < 7; i++)
        {
            var tarih = son7Gun.AddDays(i);
            var tarihStr = tarih.ToString("dd MMM");
            var mevcut = veriler.FirstOrDefault(v => v.Tarih == tarih);
            sonuc.Add(new SatisGrafikDto(
                tarihStr,
                mevcut?.Adet ?? 0,
                mevcut?.Ciro ?? 0m
            ));
        }

        return new ApiResponse<List<SatisGrafikDto>>(true, sonuc, null, null);
    }

    public async Task<ApiResponse<YaklasanBakimlarDto>> GetYaklasanBakimlarAsync()
    {
        var bugun = DateTime.UtcNow.Date;
        var haftaSonu = bugun.AddDays(7);

        // Tek sorguda çek, C#'ta grupla.
        // Navigation property'e .Select() içinden erişim EF Core 7+ ile desteklenir;
        // include'suz projeksiyonda EF Core gerekli JOIN'i otomatik üretir.
        var tumBakimlar = await db.BakimServisler
            .Where(b => b.BakimYapilacakTarih <= haftaSonu)
            .Select(b => new
            {
                b.Id,
                MusteriAd = b.Musteri != null ? b.Musteri.Ad + " " + b.Musteri.Soyad : "Bilinmiyor",
                Telefon = b.Musteri != null ? b.Musteri.Telefon : "-",
                b.BakimYapilacakTarih,
                KartTipi = b.KartTipi.ToString()
            })
            .AsNoTracking()
            .ToListAsync();

        static BakimYaklasimiDto ToDto(dynamic b) =>
            new(b.Id, b.MusteriAd, b.BakimYapilacakTarih, b.KartTipi, b.Telefon);

        var dto = new YaklasanBakimlarDto(
            tumBakimlar.Where(b => b.BakimYapilacakTarih.Date < bugun).Select(ToDto).ToList(),
            tumBakimlar.Where(b => b.BakimYapilacakTarih.Date == bugun).Select(ToDto).ToList(),
            tumBakimlar.Where(b => b.BakimYapilacakTarih.Date > bugun).Select(ToDto).ToList()
        );

        return new ApiResponse<YaklasanBakimlarDto>(true, dto, null, null);
    }

    public async Task<ApiResponse<List<EnCokSatanDto>>> GetEnCokSatanlarAsync()
    {
        // GroupBy + Include birlikte güvenilmez — EF Core Include'u ignore eder.
        // Çözüm: FK (UrunId) üzerinden grupla, sonra Join ile ürün adını getir.
        var liste = await db.Satislar
            .GroupBy(s => s.UrunId)
            .Select(g => new
            {
                UrunId = g.Key,
                SatisAdedi = g.Count(),
                ToplamGelir = g.Sum(s => s.SatisFiyati)
            })
            .OrderByDescending(g => g.SatisAdedi)
            .Take(10)
            .Join(db.Urunler,
                g => g.UrunId,
                u => u.Id,
                (g, u) => new EnCokSatanDto(
                    u.UrunAdi,
                    u.Kategori.ToString(),
                    g.SatisAdedi,
                    g.ToplamGelir))
            .ToListAsync();

        return new ApiResponse<List<EnCokSatanDto>>(true, liste, null, null);
    }

    public async Task<ApiResponse<List<BakimServisCihazDto>>> GetBakimServisCihazlarAsync()
    {
        // DİKKAT: Ham SQL, EF global tenant filtresini ATLAR. Bu yüzden IsletmeId
        // filtresini ELLE ekliyoruz — yoksa tüm işletmelerin verisi karışır (izolasyon kaçağı).
        var isletmeId = tenant.IsletmeId ?? Guid.Empty;
        var liste = await db.Database.SqlQuery<BakimServisCihazDto>($"""
            SELECT u."UrunAdi" AS "Cihaz", COUNT(*) AS "Adet"
            FROM "BakimGecmisi" bg
            JOIN "BakimServisler" bs ON bg."BakimServisId" = bs."Id"
            JOIN "Satislar" s ON bs."SatisId" = s."Id"
            JOIN "Urunler" u ON s."UrunId" = u."Id"
            WHERE bg."IsletmeId" = {isletmeId}
            GROUP BY u."UrunAdi"
            ORDER BY "Adet" DESC
            LIMIT 10
            """).ToListAsync();

        return new ApiResponse<List<BakimServisCihazDto>>(true, liste, null, null);
    }
}
