using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using SharePlate.Core.Services.Auth;
using SharePlate.Infrastructure.Services.Auth;

namespace SharePlate.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructureAuthServices(this IServiceCollection services)
    {
        services.AddScoped<IPasswordHasher<string>, PasswordHasher<string>>();
        services.AddScoped<IPasswordHashingService, PasswordHashingService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ITokenService, TokenService>();

        return services;
    }
}
