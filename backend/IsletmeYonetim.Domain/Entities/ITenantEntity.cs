namespace IsletmeYonetim.Domain.Entities;

// Multi-tenancy işaretleyici arayüzü.
// Bu arayüzü uygulayan her entity bir işletmeye (tenant) aittir.
// AppDbContext, bu arayüzü uygulayan TÜM entity'lere otomatik olarak:
//   1) global sorgu filtresi ekler (sadece aktif işletmenin verisi gelir),
//   2) kayıt eklenirken IsletmeId'yi otomatik doldurur.
public interface ITenantEntity
{
    Guid IsletmeId { get; set; }
}
