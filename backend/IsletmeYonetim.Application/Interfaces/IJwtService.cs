using IsletmeYonetim.Domain.Entities;

namespace IsletmeYonetim.Application.Interfaces;

public interface IJwtService
{
    string TokenOlustur(Kullanici kullanici);
}
