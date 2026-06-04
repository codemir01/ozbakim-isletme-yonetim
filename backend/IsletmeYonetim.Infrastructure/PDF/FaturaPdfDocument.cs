using IsletmeYonetim.Application.DTOs;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace IsletmeYonetim.Infrastructure.PDF;

public class FaturaPdfDocument(FaturaDetayDto fatura) : IDocument
{
    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(40);
            page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial"));

            page.Content().Column(col =>
            {
                // Başlık
                col.Item().Row(row =>
                {
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text("İŞLETME YÖNETİM SİSTEMİ")
                            .FontSize(18).Bold().FontColor(Color.FromHex("#4f46e5"));
                        c.Item().Text("Ticari Fatura").FontSize(11).FontColor(Color.FromHex("#64748b"));
                    });
                    row.ConstantItem(160).Column(c =>
                    {
                        c.Item().AlignRight().Text($"Fatura No:").Bold();
                        c.Item().AlignRight().Text(fatura.Id.ToString()[..8].ToUpper())
                            .FontColor(Color.FromHex("#4f46e5"));
                        c.Item().PaddingTop(4).AlignRight().Text($"Tarih: {fatura.SatisTarihi:dd.MM.yyyy}");
                        c.Item().AlignRight().Text($"Düzenleme: {fatura.OlusturmaTarihi:dd.MM.yyyy}");
                    });
                });

                col.Item().PaddingTop(16).LineHorizontal(1).LineColor(Color.FromHex("#e2e8f0"));

                // Müşteri Bilgileri
                col.Item().PaddingTop(16).Column(c =>
                {
                    c.Item().Text("MÜŞTERİ BİLGİLERİ").Bold().FontSize(9)
                        .FontColor(Color.FromHex("#94a3b8")).LetterSpacing(0.05f);
                    c.Item().PaddingTop(6).Background(Color.FromHex("#f8fafc"))
                        .Border(1).BorderColor(Color.FromHex("#e2e8f0")).Padding(12).Column(inner =>
                    {
                        inner.Item().Text($"{fatura.MusteriAd} {fatura.MusteriSoyad}").Bold().FontSize(12);
                        if (!string.IsNullOrWhiteSpace(fatura.MusteriTelefon))
                            inner.Item().PaddingTop(2).Text($"Tel: {fatura.MusteriTelefon}");
                        if (!string.IsNullOrWhiteSpace(fatura.MusteriAdres))
                            inner.Item().PaddingTop(2).Text($"Adres: {fatura.MusteriAdres}");
                    });
                });

                // Ürün/Hizmet Tablosu
                col.Item().PaddingTop(20).Column(c =>
                {
                    c.Item().Text("FATURA KALEMLERİ").Bold().FontSize(9)
                        .FontColor(Color.FromHex("#94a3b8")).LetterSpacing(0.05f);

                    c.Item().PaddingTop(6).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(4);
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(2);
                        });

                        // Tablo başlığı
                        static IContainer HeaderCell(IContainer container) =>
                            container.Background(Color.FromHex("#4f46e5")).Padding(8);

                        table.Header(header =>
                        {
                            header.Cell().Element(HeaderCell).Text("Ürün / Hizmet")
                                .FontColor(Colors.White).Bold().FontSize(9);
                            header.Cell().Element(HeaderCell).AlignCenter().Text("Kategori")
                                .FontColor(Colors.White).Bold().FontSize(9);
                            header.Cell().Element(HeaderCell).AlignRight().Text("KDV (%20)")
                                .FontColor(Colors.White).Bold().FontSize(9);
                            header.Cell().Element(HeaderCell).AlignRight().Text("Toplam")
                                .FontColor(Colors.White).Bold().FontSize(9);
                        });

                        var kdvOrani = 0.20m;
                        var kdvsizTutar = fatura.Tutar / (1 + kdvOrani);
                        var kdvTutar = fatura.Tutar - kdvsizTutar;

                        static IContainer DataCell(IContainer container) =>
                            container.BorderBottom(1).BorderColor(Color.FromHex("#f1f5f9")).Padding(8);

                        table.Cell().Element(DataCell).Text(fatura.UrunAdi);
                        table.Cell().Element(DataCell).AlignCenter().Text(fatura.UrunKategori)
                            .FontColor(Color.FromHex("#64748b"));
                        table.Cell().Element(DataCell).AlignRight()
                            .Text($"₺{kdvTutar:N2}").FontColor(Color.FromHex("#64748b"));
                        table.Cell().Element(DataCell).AlignRight()
                            .Text($"₺{fatura.Tutar:N2}").Bold();
                    });
                });

                // Toplam
                col.Item().PaddingTop(8).AlignRight().Width(220).Column(c =>
                {
                    void SatirEkle(string etiket, string deger, bool kalın = false)
                    {
                        c.Item().Row(r =>
                        {
                            r.RelativeItem().Text(etiket).FontColor(Color.FromHex("#64748b"));
                            var t = r.ConstantItem(90).AlignRight().Text(deger);
                            if (kalın) t.Bold().FontColor(Color.FromHex("#4f46e5"));
                            else t.FontColor(Colors.Black);
                        });
                        c.Item().PaddingBottom(4).LineHorizontal(1).LineColor(Color.FromHex("#f1f5f9"));
                    }

                    var kdvOrani = 0.20m;
                    var kdvsiz = fatura.Tutar / (1 + kdvOrani);
                    var kdv = fatura.Tutar - kdvsiz;

                    SatirEkle("Ara Toplam:", $"₺{kdvsiz:N2}");
                    SatirEkle("KDV (%20):", $"₺{kdv:N2}");
                    SatirEkle("GENEL TOPLAM:", $"₺{fatura.Tutar:N2}", kalın: true);
                });

                // Bakım notu
                if (fatura.BakimTakibiAktif)
                {
                    col.Item().PaddingTop(16).Background(Color.FromHex("#eff6ff"))
                        .Border(1).BorderColor(Color.FromHex("#bfdbfe")).Padding(10)
                        .Text("Bu ürün bakım takibine alınmıştır. Periyodik bakım hatırlatmaları gönderilecektir.")
                        .FontColor(Color.FromHex("#1d4ed8")).FontSize(9);
                }

                // Alt bilgi
                col.Item().PaddingTop(24).LineHorizontal(1).LineColor(Color.FromHex("#e2e8f0"));
                col.Item().PaddingTop(8).Row(row =>
                {
                    row.RelativeItem().Text($"Düzenleyen: {fatura.OlusturanAdi}")
                        .FontSize(9).FontColor(Color.FromHex("#94a3b8"));
                    row.RelativeItem().AlignRight()
                        .Text($"Bu belge {DateTime.Now:dd.MM.yyyy HH:mm} tarihinde oluşturulmuştur.")
                        .FontSize(9).FontColor(Color.FromHex("#94a3b8"));
                });
            });
        });
    }
}
