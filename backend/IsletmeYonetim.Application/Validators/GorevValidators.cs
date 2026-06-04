using FluentValidation;
using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Validators;

public class GorevOlusturValidator : AbstractValidator<GorevOlusturRequest>
{
    public GorevOlusturValidator()
    {
        RuleFor(x => x.GorevAdi)
            .NotEmpty().WithMessage("Görev adı boş olamaz.")
            .MaximumLength(200).WithMessage("Görev adı en fazla 200 karakter olabilir.");

        RuleFor(x => x.GorevDetayi)
            .MaximumLength(1000).WithMessage("Görev detayı en fazla 1000 karakter olabilir.");

        RuleFor(x => x.Oncelik)
            .NotEmpty().WithMessage("Öncelik seçilmelidir.");

        RuleFor(x => x.AtananId)
            .NotEmpty().WithMessage("Görev atanacak personel seçilmelidir.");

        RuleFor(x => x.MusteriId)
            .NotEmpty().WithMessage("Müşteri seçilmelidir.");

        RuleFor(x => x.SonTeslimTarihi)
            .NotEmpty().WithMessage("Son teslim tarihi boş olamaz.")
            // DateTime.UtcNow.Date kullanarak server timezone bağımsız karşılaştırma
            .Must(d => d.Date >= DateTime.UtcNow.Date).WithMessage("Son teslim tarihi geçmiş bir tarih olamaz.");
    }
}

public class GorevDurumGuncelleValidator : AbstractValidator<GorevDurumGuncelleRequest>
{
    public GorevDurumGuncelleValidator()
    {
        RuleFor(x => x.Durum)
            .NotEmpty().WithMessage("Durum boş olamaz.");
    }
}
