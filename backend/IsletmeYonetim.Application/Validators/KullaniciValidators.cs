using FluentValidation;
using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Validators;

public class KullaniciOlusturValidator : AbstractValidator<KullaniciOlusturRequest>
{
    public KullaniciOlusturValidator()
    {
        RuleFor(x => x.Ad)
            .NotEmpty().WithMessage("Ad boş olamaz.")
            .MaximumLength(100).WithMessage("Ad en fazla 100 karakter olabilir.");

        RuleFor(x => x.Soyad)
            .NotEmpty().WithMessage("Soyad boş olamaz.")
            .MaximumLength(100).WithMessage("Soyad en fazla 100 karakter olabilir.");

        RuleFor(x => x.Eposta)
            .NotEmpty().WithMessage("E-posta boş olamaz.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi girin.")
            .MaximumLength(200).WithMessage("E-posta en fazla 200 karakter olabilir.");

        RuleFor(x => x.Sifre)
            .NotEmpty().WithMessage("Şifre boş olamaz.")
            .MinimumLength(8).WithMessage("Şifre en az 8 karakter olmalıdır.")
            .Matches("[A-Z]").WithMessage("Şifre en az bir büyük harf içermelidir.")
            .Matches("[a-z]").WithMessage("Şifre en az bir küçük harf içermelidir.")
            .Matches("[0-9]").WithMessage("Şifre en az bir rakam içermelidir.");

        RuleFor(x => x.Telefon)
            .NotEmpty().WithMessage("Telefon boş olamaz.")
            .MaximumLength(20).WithMessage("Telefon en fazla 20 karakter olabilir.");

        RuleFor(x => x.Unvan)
            .NotEmpty().WithMessage("Ünvan boş olamaz.")
            .MaximumLength(100).WithMessage("Ünvan en fazla 100 karakter olabilir.");
    }
}

public class KullaniciGuncelleValidator : AbstractValidator<KullaniciGuncelleRequest>
{
    public KullaniciGuncelleValidator()
    {
        RuleFor(x => x.Ad)
            .NotEmpty().WithMessage("Ad boş olamaz.")
            .MaximumLength(100).WithMessage("Ad en fazla 100 karakter olabilir.");

        RuleFor(x => x.Soyad)
            .NotEmpty().WithMessage("Soyad boş olamaz.")
            .MaximumLength(100).WithMessage("Soyad en fazla 100 karakter olabilir.");

        RuleFor(x => x.Eposta)
            .NotEmpty().WithMessage("E-posta boş olamaz.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi girin.")
            .MaximumLength(200).WithMessage("E-posta en fazla 200 karakter olabilir.");

        RuleFor(x => x.Telefon)
            .NotEmpty().WithMessage("Telefon boş olamaz.")
            .MaximumLength(20).WithMessage("Telefon en fazla 20 karakter olabilir.");

        RuleFor(x => x.Unvan)
            .NotEmpty().WithMessage("Ünvan boş olamaz.")
            .MaximumLength(100).WithMessage("Ünvan en fazla 100 karakter olabilir.");
    }
}
