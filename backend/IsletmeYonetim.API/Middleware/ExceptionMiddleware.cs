using System.Net;
using System.Text.Json;
using IsletmeYonetim.Application.DTOs;

namespace IsletmeYonetim.API.Middleware;

// Tüm controller'lardan fırlayan beklenmedik hataları yakalar,
// kullanıcıya standart ApiResponse formatında hata döner.
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
            logger.LogError(ex, "Beklenmedik hata: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var response = new ApiResponse<object>(
            Basarili: false,
            Veri: null,
            Hata: "Sunucu hatası oluştu.",
            Mesaj: null
        );

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
