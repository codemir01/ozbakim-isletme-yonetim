using FluentValidation;
using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Validators;

public class UrunOlusturValidator : AbstractValidator<UrunOlusturRequest>
{
    public UrunOlusturValidator()
    {
        RuleFor(x => x.UrunAdi)
            .NotEmpty().WithMessage("Ürün adı boş olamaz.")
            .MaximumLength(200).WithMessage("Ürün adı en fazla 200 karakter olabilir.");

        RuleFor(x => x.StokKodu)
            .NotEmpty().WithMessage("Stok kodu boş olamaz.")
            .MaximumLength(50).WithMessage("Stok kodu en fazla 50 karakter olabilir.");

        RuleFor(x => x.StokAdedi)
            .GreaterThanOrEqualTo(0).WithMessage("Stok adedi 0 veya daha büyük olmalıdır.");

        RuleFor(x => x.AlisFiyati)
            .GreaterThan(0).WithMessage("Alış fiyatı 0'dan büyük olmalıdır.");
    }
}

public class UrunGuncelleValidator : AbstractValidator<UrunGuncelleRequest>
{
    public UrunGuncelleValidator()
    {
        RuleFor(x => x.UrunAdi)
            .NotEmpty().WithMessage("Ürün adı boş olamaz.")
            .MaximumLength(200).WithMessage("Ürün adı en fazla 200 karakter olabilir.");

        RuleFor(x => x.StokKodu)
            .NotEmpty().WithMessage("Stok kodu boş olamaz.")
            .MaximumLength(50).WithMessage("Stok kodu en fazla 50 karakter olabilir.");

        RuleFor(x => x.StokAdedi)
            .GreaterThanOrEqualTo(0).WithMessage("Stok adedi 0 veya daha büyük olmalıdır.");

        RuleFor(x => x.AlisFiyati)
            .GreaterThan(0).WithMessage("Alış fiyatı 0'dan büyük olmalıdır.");
    }
}
