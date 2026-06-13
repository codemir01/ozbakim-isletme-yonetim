using System.Net;
using System.Text.Json;
using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.API.Middleware;

// Tüm controller'lardan fırlayan beklenmedik hataları yakalar,
// kullanıcıya standart ApiResponse formatında, doğru HTTP status koduyla hata döner.
// Çiğ exception detayı (stack trace vb.) ASLA istemciye sızdırılmaz.
public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex, logger);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception ex, ILogger logger)
    {
        // Bilinen hata tiplerini doğru HTTP status'e eşle; gerisi 500.
        var (status, mesaj) = ex switch
        {
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "Yetkisiz erişim."),
            KeyNotFoundException        => (HttpStatusCode.NotFound, "Kayıt bulunamadı."),
            FluentValidation.ValidationException ve
                => (HttpStatusCode.BadRequest, ve.Errors.FirstOrDefault()?.ErrorMessage ?? "Geçersiz veri."),
            _                           => (HttpStatusCode.InternalServerError, "Sunucu hatası oluştu.")
        };

        // İsteği takip etmek için TraceId — destek/log korelasyonu için istemciye de dönülür.
        var traceId = context.TraceIdentifier;

        // Sadece beklenmedik (500) hataları Error seviyesinde logla; bilinenler Warning yeter.
        if (status == HttpStatusCode.InternalServerError)
            logger.LogError(ex, "Beklenmedik hata. TraceId={TraceId}", traceId);
        else
            logger.LogWarning("İşlenen hata ({Status}): {Message}. TraceId={TraceId}",
                (int)status, ex.Message, traceId);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)status;

        var response = new ApiResponse<object>(
            Basarili: false,
            Veri: null,
            Hata: mesaj,
            Mesaj: traceId // istemci destek talebinde bu TraceId'yi paylaşabilir
        );

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
