using ClosedXML.Excel;
using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Domain.Enums;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace IsletmeYonetim.Infrastructure.Services;

public class RaporService(AppDbContext db) : IRaporService
{
    // ------------------------------------------------------------------
    // AYLIK ÖZET PDF
    // ------------------------------------------------------------------
    public async Task<byte[]> AylikOzetPdfAsync(int yil, int ay)
    {
        var ayBaslangic = new DateTime(yil, ay, 1, 0, 0, 0, DateTimeKind.Utc);
        var ayBitis = ayBaslangic.AddMonths(1);

        // Satış verileri
        var satislar = await db.Satislar
            .Include(s => s.Urun)
            .Where(s => s.SatisTarihi >= ayBaslangic && s.SatisTarihi < ayBitis)
            .ToListAsync();

        var toplamSatis = satislar.Count;
        var toplamSatisGelir = satislar.Sum(s => s.SatisFiyati);

        // En çok satan ürünler (ilk 5)
        var enCokSatanlar = satislar
            .GroupBy(s => s.Urun?.UrunAdi ?? "Bilinmiyor")
            .Select(g => new { UrunAdi = g.Key, Adet = g.Count(), Gelir = g.Sum(s => s.SatisFiyati) })
            .OrderByDescending(x => x.Adet)
            .Take(5)
            .ToList();

        // Gelir/gider verileri
        var gelirGiderler = await db.GelirGiderler
            .Where(g => g.Tarih >= ayBaslangic && g.Tarih < ayBitis)
            .ToListAsync();

        var toplamGelir = gelirGiderler.Where(g => g.Tip == GelirGiderTip.Gelir).Sum(g => g.Miktar);
        var toplamGider = gelirGiderler.Where(g => g.Tip == GelirGiderTip.Gider).Sum(g => g.Miktar);

        // Bakım istatistikleri
        var bakimSayisi = await db.BakimServisler
            .CountAsync(b => b.BakimYapilacakTarih >= ayBaslangic && b.BakimYapilacakTarih < ayBitis);

        var ayAdi = new System.Globalization.CultureInfo("tr-TR")
            .DateTimeFormat.GetMonthName(ay);

        // QuestPDF ile PDF oluştur
        var doc = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial"));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("İŞLETME YÖNETİM SİSTEMİ")
                                .FontSize(18).Bold().FontColor(Color.FromHex("#4f46e5"));
                            c.Item().Text($"Aylık Özet Raporu — {ayAdi} {yil}")
                                .FontSize(12).FontColor(Color.FromHex("#64748b"));
                        });
                        row.ConstantItem(80).AlignRight().Column(c =>
                        {
                            c.Item().Text(DateTime.UtcNow.ToString("dd.MM.yyyy"))
                                .FontSize(10).FontColor(Color.FromHex("#94a3b8"));
                        });
                    });
                    col.Item().PaddingTop(4).LineHorizontal(1).LineColor(Color.FromHex("#e2e8f0"));
                });

                page.Content().PaddingTop(20).Column(col =>
                {
                    // Özet kutular
                    col.Item().Row(row =>
                    {
                        void OzetKart(string baslik, string deger, string renk)
                        {
                            row.RelativeItem().Border(1).BorderColor(Color.FromHex("#e2e8f0"))
                                .Padding(12).Column(c =>
                                {
                                    c.Item().Text(baslik).FontSize(9).FontColor(Color.FromHex("#94a3b8"));
                                    c.Item().Text(deger).FontSize(14).Bold().FontColor(Color.FromHex(renk));
                                });
                        }

                        OzetKart("Toplam Satış", toplamSatis.ToString(), "#1e293b");
                        OzetKart("Satış Geliri", $"₺{toplamSatisGelir:N2}", "#4f46e5");
                        OzetKart("Net Gelir/Gider", $"₺{(toplamGelir - toplamGider):N2}", toplamGelir >= toplamGider ? "#16a34a" : "#dc2626");
                        OzetKart("Bakım Sayısı", bakimSayisi.ToString(), "#0ea5e9");
                    });

                    col.Item().PaddingTop(20).Text("En Çok Satan Ürünler")
                        .FontSize(12).Bold().FontColor(Color.FromHex("#1e293b"));

                    col.Item().PaddingTop(8).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(3);
                            cols.RelativeColumn(1);
                            cols.RelativeColumn(2);
                        });

                        void HucreBaslik(string metin) =>
                            table.Cell().Background(Color.FromHex("#f8fafc")).Padding(8)
                                .Text(metin).Bold().FontSize(9).FontColor(Color.FromHex("#64748b"));

                        HucreBaslik("Ürün Adı");
                        HucreBaslik("Adet");
                        HucreBaslik("Toplam Gelir");

                        foreach (var u in enCokSatanlar)
                        {
                            table.Cell().BorderBottom(1).BorderColor(Color.FromHex("#f1f5f9")).Padding(8).Text(u.UrunAdi);
                            table.Cell().BorderBottom(1).BorderColor(Color.FromHex("#f1f5f9")).Padding(8).Text(u.Adet.ToString());
                            table.Cell().BorderBottom(1).BorderColor(Color.FromHex("#f1f5f9")).Padding(8).Text($"₺{u.Gelir:N2}");
                        }

                        if (enCokSatanlar.Count == 0)
                        {
                            table.Cell().ColumnSpan(3).Padding(8)
                                .Text("Bu ay satış kaydı yok.").FontColor(Color.FromHex("#94a3b8"));
                        }
                    });

                    col.Item().PaddingTop(20).Text("Gelir / Gider Özeti")
                        .FontSize(12).Bold().FontColor(Color.FromHex("#1e293b"));

                    col.Item().PaddingTop(8).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(2);
                        });

                        void HucreBaslik(string metin) =>
                            table.Cell().Background(Color.FromHex("#f8fafc")).Padding(8)
                                .Text(metin).Bold().FontSize(9).FontColor(Color.FromHex("#64748b"));

                        HucreBaslik("Toplam Gelir");
                        HucreBaslik("Toplam Gider");
                        HucreBaslik("Net Bakiye");

                        table.Cell().BorderBottom(1).BorderColor(Color.FromHex("#f1f5f9")).Padding(8)
                            .Text($"₺{toplamGelir:N2}").FontColor(Color.FromHex("#16a34a"));
                        table.Cell().BorderBottom(1).BorderColor(Color.FromHex("#f1f5f9")).Padding(8)
                            .Text($"₺{toplamGider:N2}").FontColor(Color.FromHex("#dc2626"));
                        table.Cell().BorderBottom(1).BorderColor(Color.FromHex("#f1f5f9")).Padding(8)
                            .Text($"₺{(toplamGelir - toplamGider):N2}");
                    });
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Sayfa ").FontSize(9).FontColor(Color.FromHex("#94a3b8"));
                    x.CurrentPageNumber().FontSize(9).FontColor(Color.FromHex("#94a3b8"));
                });
            });
        });

        return doc.GeneratePdf();
    }

    // ------------------------------------------------------------------
    // MÜŞTERİLER EXCEL
    // ------------------------------------------------------------------
    public async Task<byte[]> MusterilerExcelAsync()
    {
        var musteriler = await db.Musteriler
            .Where(m => !m.SilindiMi)
            .OrderBy(m => m.Soyad)
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Müşteriler");

        // Başlık satırı
        string[] basliklar = ["Ad", "Soyad", "Telefon", "Adres", "Toplam Borç", "Toplam Tahsilat", "Net Bakiye", "Kayıt Tarihi"];
        for (int i = 0; i < basliklar.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = basliklar[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#4f46e5");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        // Veri satırları
        for (int i = 0; i < musteriler.Count; i++)
        {
            var m = musteriler[i];
            var satir = i + 2;
            ws.Cell(satir, 1).Value = m.Ad;
            ws.Cell(satir, 2).Value = m.Soyad;
            ws.Cell(satir, 3).Value = m.Telefon;
            ws.Cell(satir, 4).Value = m.Adres;
            ws.Cell(satir, 5).Value = m.ToplamBorc;
            ws.Cell(satir, 6).Value = m.ToplamTahsilat;
            ws.Cell(satir, 7).Value = m.ToplamBorc - m.ToplamTahsilat;
            ws.Cell(satir, 8).Value = m.OlusturmaTarihi.ToString("dd.MM.yyyy");

            // Satır rengi (zebra)
            if (i % 2 == 1)
            {
                ws.Row(satir).Style.Fill.BackgroundColor = XLColor.FromHtml("#f8fafc");
            }

            // Net bakiye negatifse kırmızı (borçlu müşteri)
            var net = m.ToplamBorc - m.ToplamTahsilat;
            if (net > 0)
                ws.Cell(satir, 7).Style.Font.FontColor = XLColor.FromHtml("#dc2626");
        }

        // Sütun genişliklerini otomatik ayarla
        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }
}
