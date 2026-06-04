using FluentValidation;
using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Validators;

public class MusteriOlusturValidator : AbstractValidator<MusteriOlusturRequest>
{
    public MusteriOlusturValidator()
    {
        RuleFor(x => x.Ad)
            .NotEmpty().WithMessage("Ad boş olamaz.")
            .MaximumLength(100).WithMessage("Ad en fazla 100 karakter olabilir.");

        RuleFor(x => x.Soyad)
            .NotEmpty().WithMessage("Soyad boş olamaz.")
            .MaximumLength(100).WithMessage("Soyad en fazla 100 karakter olabilir.");

        RuleFor(x => x.Telefon)
            .NotEmpty().WithMessage("Telefon boş olamaz.")
            .MaximumLength(20).WithMessage("Telefon en fazla 20 karakter olabilir.");

        RuleFor(x => x.Adres)
            .NotEmpty().WithMessage("Adres boş olamaz.");
    }
}

public class MusteriGuncelleValidator : AbstractValidator<MusteriGuncelleRequest>
{
    public MusteriGuncelleValidator()
    {
        RuleFor(x => x.Ad)
            .NotEmpty().WithMessage("Ad boş olamaz.")
            .MaximumLength(100).WithMessage("Ad en fazla 100 karakter olabilir.");

        RuleFor(x => x.Soyad)
            .NotEmpty().WithMessage("Soyad boş olamaz.")
            .MaximumLength(100).WithMessage("Soyad en fazla 100 karakter olabilir.");

        RuleFor(x => x.Telefon)
            .NotEmpty().WithMessage("Telefon boş olamaz.")
            .MaximumLength(20).WithMessage("Telefon en fazla 20 karakter olabilir.");

        RuleFor(x => x.Adres)
            .NotEmpty().WithMessage("Adres boş olamaz.");
    }
}
