using FluentValidation;
using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.Application.Validators;

public class BakimGecmisEkleValidator : AbstractValidator<BakimGecmisEkleRequest>
{
    public BakimGecmisEkleValidator()
    {
        RuleFor(x => x.Aciklama)
            .NotEmpty().WithMessage("Açıklama boş olamaz.")
            .MaximumLength(1000).WithMessage("Açıklama en fazla 1000 karakter olabilir.");

        RuleFor(x => x.YapilmaTarihi)
            .NotEmpty().WithMessage("Yapılma tarihi boş olamaz.");

        RuleFor(x => x.YeniBakimAraligiGun)
            .GreaterThan(0).WithMessage("Bakım aralığı 0'dan büyük olmalıdır.");
    }
}

public class ManuelBakimOlusturValidator : AbstractValidator<ManuelBakimOlusturRequest>
{
    public ManuelBakimOlusturValidator()
    {
        RuleFor(x => x.MusteriId)
            .NotEmpty().WithMessage("Müşteri seçilmelidir.");

        RuleFor(x => x.KartTipi)
            .NotEmpty().WithMessage("Kart tipi boş olamaz.");

        RuleFor(x => x.SonBakimTarihi)
            .NotEmpty().WithMessage("Son bakım tarihi boş olamaz.");

        RuleFor(x => x.BakimAraligiGun)
            .GreaterThan(0).WithMessage("Bakım aralığı 0'dan büyük olmalıdır.");
    }
}
