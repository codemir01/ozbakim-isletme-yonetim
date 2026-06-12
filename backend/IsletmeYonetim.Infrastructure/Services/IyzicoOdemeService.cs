using System.Globalization;
using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Application.Interfaces;
using Iyzipay;
using Iyzipay.Model;
using Iyzipay.Request;
using Microsoft.Extensions.Configuration;

namespace IsletmeYonetim.Infrastructure.Services;

// iyzico ile gerçek ödeme entegrasyonu (sandbox/test ortamı).
// Anahtarlar appsettings "Iyzico" bölümünden okunur (gerçek değer Development.json'da).
// Test kartları iyzico'nun RESMİ dokümanından gelir (gerçek kart değil):
// https://docs.iyzico.com/ek-bilgiler/test-kartlari
// Canlıya geçiş: BaseUrl -> https://api.iyzipay.com, üretim anahtarları, 3D Secure ekle.
public class IyzicoOdemeService(IConfiguration config) : IOdemeService
{
    public async Task<OdemeSonuc> OdemeAlAsync(KartBilgisi kart, decimal tutar, string aciklama, string aliciAd, string aliciEposta)
    {
        var options = new Options
        {
            ApiKey = config["Iyzico:ApiKey"],
            SecretKey = config["Iyzico:SecretKey"],
            BaseUrl = config["Iyzico:BaseUrl"] ?? "https://sandbox-api.iyzipay.com"
        };

        if (string.IsNullOrWhiteSpace(options.ApiKey) || options.ApiKey.Contains("BURAYA"))
            return new OdemeSonuc(false, "Ödeme altyapısı yapılandırılmamış (iyzico anahtarı eksik).");

        // iyzico tutarı nokta ondalıklı string ister: "499.00"
        var tutarStr = tutar.ToString("F2", CultureInfo.InvariantCulture);

        // Alıcı adını ad/soyad olarak böl (iyzico ikisini ayrı ister)
        var parcalar = aliciAd.Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var ad = parcalar.Length > 0 ? parcalar[0] : "Isletme";
        var soyad = parcalar.Length > 1 ? parcalar[1] : "Sahibi";

        var request = new CreatePaymentRequest
        {
            Locale = Locale.TR.ToString(),
            ConversationId = Guid.NewGuid().ToString(),
            Price = tutarStr,
            PaidPrice = tutarStr,
            Currency = Currency.TRY.ToString(),
            Installment = 1,
            BasketId = "LISANS-" + DateTime.UtcNow.Ticks,
            PaymentChannel = PaymentChannel.WEB.ToString(),
            PaymentGroup = PaymentGroup.SUBSCRIPTION.ToString(),
            PaymentCard = new PaymentCard
            {
                CardHolderName = kart.KartSahibi,
                CardNumber = kart.KartNo.Replace(" ", ""),
                ExpireMonth = kart.SonAy,
                ExpireYear = kart.SonYil,
                Cvc = kart.Cvc,
                RegisterCard = 0
            },
            Buyer = new Buyer
            {
                Id = "BY" + Guid.NewGuid().ToString("N")[..10],
                Name = ad,
                Surname = soyad,
                Email = aliciEposta,
                IdentityNumber = "11111111111",     // sandbox için sahte TC
                RegistrationAddress = "Türkiye",
                City = "İstanbul",
                Country = "Turkey",
                Ip = "85.34.78.112"
            }
        };

        var adres = new Address
        {
            ContactName = aliciAd,
            City = "İstanbul",
            Country = "Turkey",
            Description = "Türkiye"
        };
        request.ShippingAddress = adres;
        request.BillingAddress = adres;
        request.BasketItems = new List<BasketItem>
        {
            new()
            {
                Id = "LISANS",
                Name = aciklama,
                Category1 = "Abonelik",
                ItemType = BasketItemType.VIRTUAL.ToString(),
                Price = tutarStr
            }
        };

        try
        {
            var payment = await Payment.Create(request, options);
            return payment.Status == "success"
                ? new OdemeSonuc(true, null)
                : new OdemeSonuc(false, payment.ErrorMessage ?? "Ödeme reddedildi.");
        }
        catch (Exception ex)
        {
            return new OdemeSonuc(false, "Ödeme servisine ulaşılamadı: " + ex.Message);
        }
    }
}
