using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Interfaces;

// Ödeme alma soyutlaması — şu an iyzico (sandbox). İleride PayTR/Stripe'a geçilse
// LisansService değişmez, sadece bu arayüzün implementasyonu değişir.
public interface IOdemeService
{
    // Karttan tutarı çeker. aliciAd/aliciEposta iyzico'nun zorunlu "buyer" alanları için.
    Task<OdemeSonuc> OdemeAlAsync(KartBilgisi kart, decimal tutar, string aciklama, string aliciAd, string aliciEposta);
}
