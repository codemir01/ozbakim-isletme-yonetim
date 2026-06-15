using FluentValidation;
using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Validators;

// Tüm "yeni şifre belirleme" akışlarında kullanılan ORTAK şifre kuralı.
// Sistem genelinde tek bir politika: en az 8 karakter + büyük/küçük harf + rakam.
public static class SifreKurali
{
    public static IRuleBuilderOptions<T, string> GecerliSifre<T>(this IRuleBuilder<T, string> rb) =>
        rb.NotEmpty().WithMessage("Şifre boş olamaz.")
          .MinimumLength(8).WithMessage("Şifre en az 8 karakter olmalıdır.")
          .Matches("[A-Z]").WithMessage("Şifre en az bir büyük harf içermelidir.")
          .Matches("[a-z]").WithMessage("Şifre en az bir küçük harf içermelidir.")
          .Matches("[0-9]").WithMessage("Şifre en az bir rakam içermelidir.");
}

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Eposta)
            .NotEmpty().WithMessage("E-posta boş olamaz.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi girin.");

        // Girişte mevcut şifre doğrulanır; yeni şifre kuralı burada DEĞİL,
        // şifre belirleme akışlarında (kayıt/profil/ilk şifre) uygulanır.
        RuleFor(x => x.Sifre).NotEmpty().WithMessage("Şifre boş olamaz.");
    }
}

// İşletme self-signup: ilk admin şifresi de sistem politikasına uymalı
public class KayitRequestValidator : AbstractValidator<KayitRequest>
{
    public KayitRequestValidator()
    {
        RuleFor(x => x.IsletmeAdi).NotEmpty().WithMessage("İşletme adı boş olamaz.");
        RuleFor(x => x.Ad).NotEmpty().WithMessage("Ad boş olamaz.");
        RuleFor(x => x.Soyad).NotEmpty().WithMessage("Soyad boş olamaz.");
        RuleFor(x => x.Eposta)
            .NotEmpty().WithMessage("E-posta boş olamaz.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi girin.");
        RuleFor(x => x.Sifre).GecerliSifre();
    }
}

// Profilden şifre değiştirme
public class SifreGuncelleRequestValidator : AbstractValidator<SifreGuncelleRequest>
{
    public SifreGuncelleRequestValidator()
    {
        RuleFor(x => x.EskiSifre).NotEmpty().WithMessage("Mevcut şifre boş olamaz.");
        RuleFor(x => x.YeniSifre).GecerliSifre();
    }
}

// İlk girişte şifre belirleme
public class IlkSifreRequestValidator : AbstractValidator<IlkSifreRequest>
{
    public IlkSifreRequestValidator()
    {
        RuleFor(x => x.YeniSifre).GecerliSifre();
    }
}
