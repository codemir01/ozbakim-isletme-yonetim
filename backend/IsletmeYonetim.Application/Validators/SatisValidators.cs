using FluentValidation;
using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Validators;

public class SatisOlusturValidator : AbstractValidator<SatisOlusturRequest>
{
    public SatisOlusturValidator()
    {
        RuleFor(x => x.MusteriId)
            .NotEmpty().WithMessage("Müşteri seçilmelidir.");

        RuleFor(x => x.UrunId)
            .NotEmpty().WithMessage("Ürün seçilmelidir.");

        RuleFor(x => x.SatisFiyati)
            .GreaterThan(0).WithMessage("Satış fiyatı 0'dan büyük olmalıdır.");

        // Bakım takibi aktifse montaj tarihi ve aralığı zorunlu
        When(x => x.BakimTakibiAktif, () =>
        {
            RuleFor(x => x.MontajTarihi)
                .NotNull().WithMessage("Bakım takibi aktifse montaj tarihi gereklidir.");

            RuleFor(x => x.BakimAraligi)
                .NotNull().WithMessage("Bakım takibi aktifse bakım aralığı gereklidir.")
                .GreaterThan(0).WithMessage("Bakım aralığı 0'dan büyük olmalıdır.");
        });
    }
}
