namespace IsletmeYonetim.Application.Interfaces;

// Aktif isteğin hangi işletmeye (tenant) ait olduğunu söyler.
// Normalde JWT içindeki "isletmeId" claim'inden okunur (API katmanındaki implementasyon).
// HTTP dışı durumlarda (kayıt akışı, Hangfire job) elle ayarlanabilir.
public interface ITenantProvider
{
    Guid? IsletmeId { get; }

    // Manuel override — örn. yeni işletme kaydında veya arka plan işinde
    void SetIsletme(Guid isletmeId);
}
