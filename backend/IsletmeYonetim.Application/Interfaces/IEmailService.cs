namespace IsletmeYonetim.Application.Interfaces;

public interface IEmailService
{
    Task GonderAsync(string alici, string konu, string htmlIcerik);
}
