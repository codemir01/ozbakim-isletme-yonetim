using IsletmeYonetim.Application.DTOs;
using IsletmeYonetim.Domain.Entities;

namespace IsletmeYonetim.Application.Interfaces;

public interface IBildirimService
{
    Task<ApiResponse<List<BildirimDto>>> GetBildirimlerAsync(Guid kullaniciId);
    Task<ApiResponse<object>> OkuAsync(Guid bildirimId, Guid kullaniciId);
    Task<ApiResponse<object>> HepsiniOkuAsync(Guid kullaniciId);
    // Diğer servisler bu metodu çağırarak bildirim oluşturur
    Task CreateAsync(Guid kullaniciId, string mesaj, BildirimTip tip = BildirimTip.Bilgi);
}
