using IsletmeYonetim.Application.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;

namespace IsletmeYonetim.Infrastructure.Services;

public class EmailService(IConfiguration config) : IEmailService
{
    public async Task GonderAsync(string alici, string konu, string htmlIcerik)
    {
        var ayarlar = config.GetSection("EmailSettings");

        var mesaj = new MimeMessage();
        mesaj.From.Add(new MailboxAddress(
            ayarlar["GonderenAd"],
            ayarlar["GonderenEmail"]!));
        mesaj.To.Add(MailboxAddress.Parse(alici));
        mesaj.Subject = konu;
        mesaj.Body = new TextPart("html") { Text = htmlIcerik };

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(
            ayarlar["SmtpHost"]!,
            int.Parse(ayarlar["SmtpPort"]!),
            SecureSocketOptions.StartTls);

        await smtp.AuthenticateAsync(
            ayarlar["GonderenEmail"]!,
            ayarlar["AppPassword"]!);

        await smtp.SendAsync(mesaj);
        await smtp.DisconnectAsync(true);
    }
}
