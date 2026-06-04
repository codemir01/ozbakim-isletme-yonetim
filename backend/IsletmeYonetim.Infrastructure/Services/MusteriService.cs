using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Domain.Entities;
using IsletmeYonetim.Domain.Enums;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IsletmeYonetim.Infrastructure.Services;

public class MusteriService(AppDbContext db) : IMusteriService
{
    public async Task<PagedResponse<MusteriListeDto>> GetMusterilerAsync(int sayfa = 1, int boyut = 20)
    {
        sayfa = Math.Max(1, sayfa);
        boyut = Math.Clamp(boyut, 1, 100);

        var sorgu = db.Musteriler.Where(m => !m.SilindiMi);
        var toplam = await sorgu.CountAsync();

        var liste = await sorgu
            .OrderByDescending(m => m.OlusturmaTarihi)
            .Skip((sayfa - 1) * boyut)
            .Take(boyut)
            .Select(m => new MusteriListeDto(
                m.Id, m.Ad, m.Soyad, m.Telefon, m.Adres,
                m.Enlem, m.Boylam, m.ToplamBorc, m.ToplamTahsilat, m.OlusturmaTarihi))
            .AsNoTracking()
            .ToListAsync();

        return new PagedResponse<MusteriListeDto>(true, liste, toplam, (int)Math.Ceiling(toplam / (double)boyut), sayfa, boyut);
    }

    public async Task<ApiResponse<MusteriListeDto>> GetMusteriByIdAsync(Guid id)
    {
        var m = await db.Musteriler.FirstOrDefaultAsync(m => m.Id == id && !m.SilindiMi);
        if (m is null)
            return new ApiResponse<MusteriListeDto>(false, null, "Müşteri bulunamadı.", null);

        var dto = new MusteriListeDto(m.Id, m.Ad, m.Soyad, m.Telefon, m.Adres,
            m.Enlem, m.Boylam, m.ToplamBorc, m.ToplamTahsilat, m.OlusturmaTarihi);

        return new ApiResponse<MusteriListeDto>(true, dto, null, null);
    }

    public async Task<ApiResponse<MusteriListeDto>> CreateMusteriAsync(MusteriOlusturRequest request)
    {
        var musteri = new Musteri
        {
            Ad = request.Ad,
            Soyad = request.Soyad,
            Telefon = request.Telefon,
            Adres = request.Adres,
            Enlem = request.Enlem,
            Boylam = request.Boylam
            // ToplamBorc ve ToplamTahsilat default 0 — entity sınıfında tanımlandı
        };

        db.Musteriler.Add(musteri);
        await db.SaveChangesAsync();

        var dto = new MusteriListeDto(musteri.Id, musteri.Ad, musteri.Soyad, musteri.Telefon,
            musteri.Adres, musteri.Enlem, musteri.Boylam, musteri.ToplamBorc, musteri.ToplamTahsilat, musteri.OlusturmaTarihi);

        return new ApiResponse<MusteriListeDto>(true, dto, null, "Müşteri oluşturuldu.");
    }

    public async Task<ApiResponse<object>> UpdateMusteriAsync(Guid id, MusteriGuncelleRequest request)
    {
        var musteri = await db.Musteriler.FirstOrDefaultAsync(m => m.Id == id && !m.SilindiMi);
        if (musteri is null)
            return new ApiResponse<object>(false, null, "Müşteri bulunamadı.", null);

        // Sadece bilgi alanlarını güncelle — borç/tahsilat burada değişmez
        musteri.Ad = request.Ad;
        musteri.Soyad = request.Soyad;
        musteri.Telefon = request.Telefon;
        musteri.Adres = request.Adres;
        musteri.Enlem = request.Enlem;
        musteri.Boylam = request.Boylam;

        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Müşteri güncellendi.");
    }

    public async Task<ApiResponse<object>> DeleteMusteriAsync(Guid id)
    {
        var musteri = await db.Musteriler.FirstOrDefaultAsync(m => m.Id == id && !m.SilindiMi);
        if (musteri is null)
            return new ApiResponse<object>(false, null, "Müşteri bulunamadı.", null);

        // Soft delete — kayıt fiziksel olarak silinmez, geri alınabilir
        musteri.SilindiMi = true;
        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Müşteri silindi.");
    }

    public async Task<ApiResponse<object>> AddBorcAsync(Guid id, BorcEkleRequest request)
    {
        if (request.Miktar <= 0)
            return new ApiResponse<object>(false, null, "Borç miktarı 0'dan büyük olmalıdır.", null);

        var musteri = await db.Musteriler.FirstOrDefaultAsync(m => m.Id == id && !m.SilindiMi);
        if (musteri is null)
            return new ApiResponse<object>(false, null, "Müşteri bulunamadı.", null);

        musteri.ToplamBorc += request.Miktar;

        // Her borç işlemi için audit kaydı oluştur
        db.BorcTahsilatlar.Add(new BorcTahsilat
        {
            MusteriId = id,
            Tip = BorcTahsilatTip.Borc,
            Miktar = request.Miktar,
            Aciklama = request.Aciklama
        });

        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, new { musteri.ToplamBorc }, null, "Borç eklendi.");
    }

    public async Task<ApiResponse<object>> AddTahsilatAsync(Guid id, TahsilatEkleRequest request)
    {
        if (request.Miktar <= 0)
            return new ApiResponse<object>(false, null, "Tahsilat miktarı 0'dan büyük olmalıdır.", null);

        var musteri = await db.Musteriler.FirstOrDefaultAsync(m => m.Id == id && !m.SilindiMi);
        if (musteri is null)
            return new ApiResponse<object>(false, null, "Müşteri bulunamadı.", null);

        var kalanBorc = musteri.ToplamBorc - musteri.ToplamTahsilat;
        if (request.Miktar > kalanBorc)
            return new ApiResponse<object>(false, null, $"Tahsilat miktarı kalan borçtan ({kalanBorc:N2} ₺) fazla olamaz.", null);

        musteri.ToplamTahsilat += request.Miktar;

        // Her tahsilat işlemi için audit kaydı oluştur
        db.BorcTahsilatlar.Add(new BorcTahsilat
        {
            MusteriId = id,
            Tip = BorcTahsilatTip.Tahsilat,
            Miktar = request.Miktar,
            Aciklama = request.Aciklama
        });

        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, new { musteri.ToplamTahsilat }, null, "Tahsilat eklendi.");
    }

    public async Task<ApiResponse<object>> UpdateKonumAsync(Guid id, KonumGuncelleRequest request)
    {
        var musteri = await db.Musteriler.FirstOrDefaultAsync(m => m.Id == id && !m.SilindiMi);
        if (musteri is null)
            return new ApiResponse<object>(false, null, "Müşteri bulunamadı.", null);

        musteri.Enlem = request.Enlem;
        musteri.Boylam = request.Boylam;

        await db.SaveChangesAsync();
        return new ApiResponse<object>(true, null, null, "Konum güncellendi.");
    }

    public async Task<ApiResponse<List<BorcTahsilatDto>>> GetBorcGecmisAsync(Guid id)
    {
        var gecmis = await db.BorcTahsilatlar
            .Where(b => b.MusteriId == id)
            .OrderByDescending(b => b.Tarih)
            .Select(b => new BorcTahsilatDto(
                b.Id,
                b.Tip.ToString(),
                b.Miktar,
                b.Tarih,
                b.Aciklama))
            .ToListAsync();

        return new ApiResponse<List<BorcTahsilatDto>>(true, gecmis, null, null);
    }
}
