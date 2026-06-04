using IsletmeYonetim.Application.Interfaces;
using IsletmeYonetim.Domain.Entities;
using IsletmeYonetim.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IsletmeYonetim.Infrastructure.Jobs;

public class BakimBildirimJob(
    AppDbContext db,
    IEmailService emailService,
    IBildirimService bildirimService,
    IConfiguration config,
    ILogger<BakimBildirimJob> logger)
{
    // Her gün sabah 08:00'de çalışır.
    // Önümüzdeki 7 gün içinde bakımı gelen cihazları bulur ve admin'e e-posta gönderir.
    public async Task YaklasanBakimlariGonderAsync()
    {
        var bugun = DateTime.UtcNow.Date;
        var yediGunSonra = bugun.AddDays(7);

        // Gecikmiş (tarihi geçmiş ama hâlâ yapılmamış) bakımlar EN ACİL olduğu için
        // bildirime onları da dahil ediyoruz. Üst sınır gelecek 7 gün.
        var yaklasanlar = await db.BakimServisler
            .Include(b => b.Musteri)
            .Where(b => b.BakimYapilacakTarih.Date <= yediGunSonra)
            .OrderBy(b => b.BakimYapilacakTarih)
            .ToListAsync();

        if (yaklasanlar.Count == 0)
        {
            logger.LogInformation("Yaklaşan bakım yok, e-posta gönderilmedi.");
            return;
        }

        var satirlar = yaklasanlar.Select(b =>
        {
            var gun = (b.BakimYapilacakTarih.Date - bugun).Days;
            var gunMetin = gun < 0 ? $"<strong style='color:#dc2626'>{-gun} gün gecikti</strong>"
                         : gun == 0 ? "<strong style='color:#ef4444'>Bugün</strong>"
                         : gun == 1 ? "<strong style='color:#f59e0b'>Yarın</strong>"
                         : $"{gun} gün sonra";

            return $"""
                <tr>
                  <td style='padding:10px 16px;border-bottom:1px solid #f1f5f9'>{b.Musteri.Ad} {b.Musteri.Soyad}</td>
                  <td style='padding:10px 16px;border-bottom:1px solid #f1f5f9'>{b.Musteri.Telefon}</td>
                  <td style='padding:10px 16px;border-bottom:1px solid #f1f5f9'>{b.BakimYapilacakTarih:dd.MM.yyyy}</td>
                  <td style='padding:10px 16px;border-bottom:1px solid #f1f5f9'>{gunMetin}</td>
                  <td style='padding:10px 16px;border-bottom:1px solid #f1f5f9'>{b.KartTipi}</td>
                </tr>
                """;
        });

        var html = $"""
            <!DOCTYPE html>
            <html>
            <head><meta charset='utf-8'></head>
            <body style='font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px'>
              <div style='max-width:640px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'>

                <div style='background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px 32px'>
                  <h1 style='color:white;margin:0;font-size:20px'>ÖzBakım — Yaklaşan Bakım Bildirimi</h1>
                  <p style='color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px'>
                    {bugun:dd MMMM yyyy} — Gecikmiş ve önümüzdeki 7 gün içindeki bakımlar
                  </p>
                </div>

                <div style='padding:24px 32px'>
                  <p style='color:#64748b;font-size:14px;margin:0 0 16px'>
                    Toplam <strong>{yaklasanlar.Count}</strong> müşterinin bakımı yaklaşıyor.
                  </p>

                  <table style='width:100%;border-collapse:collapse;font-size:14px'>
                    <thead>
                      <tr style='background:#f8fafc'>
                        <th style='text-align:left;padding:10px 16px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em'>Müşteri</th>
                        <th style='text-align:left;padding:10px 16px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em'>Telefon</th>
                        <th style='text-align:left;padding:10px 16px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em'>Tarih</th>
                        <th style='text-align:left;padding:10px 16px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em'>Kalan</th>
                        <th style='text-align:left;padding:10px 16px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em'>Tür</th>
                      </tr>
                    </thead>
                    <tbody>
                      {string.Join("\n", satirlar)}
                    </tbody>
                  </table>
                </div>

                <div style='padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9'>
                  <p style='color:#94a3b8;font-size:12px;margin:0'>
                    Bu e-posta ÖzBakım sistemi tarafından otomatik olarak gönderilmiştir.
                  </p>
                </div>
              </div>
            </body>
            </html>
            """;

        var alici = config["EmailSettings:AliciEmail"]!;
        try
        {
            await emailService.GonderAsync(alici, $"Bakım Bildirimi — {yaklasanlar.Count} yaklaşan bakım", html);
            logger.LogInformation("{Count} yaklaşan bakım için bildirim e-postası gönderildi.", yaklasanlar.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Bakım bildirimi e-postası gönderilemedi. Alıcı: {Alici}", alici);
        }

        // Admin kullanıcılarına uygulama içi bildirim gönder
        var adminler = await db.Kullanicilar
            .Where(k => k.AktifMi && k.Rol == IsletmeYonetim.Domain.Enums.Rol.Admin)
            .Select(k => k.Id)
            .ToListAsync();

        var gecikmisSayisi = yaklasanlar.Count(b => b.BakimYapilacakTarih.Date < bugun);
        var bildirimMesaji = gecikmisSayisi > 0
            ? $"{yaklasanlar.Count} bakım dikkat bekliyor ({gecikmisSayisi} tanesi gecikmiş)."
            : $"Önümüzdeki 7 günde {yaklasanlar.Count} bakım randevusu var.";

        foreach (var adminId in adminler)
        {
            await bildirimService.CreateAsync(adminId, bildirimMesaji, BildirimTip.Uyari);
        }
    }
}
