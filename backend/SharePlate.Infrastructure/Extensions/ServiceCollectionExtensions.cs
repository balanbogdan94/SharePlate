using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SharePlate.Core.Configuration;
using SharePlate.Core.Services;
using SharePlate.Infrastructure.Services;

namespace SharePlate.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructureStorageServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AzureStorageOptions>(configuration.GetSection(AzureStorageOptions.SectionName));
        services.AddSingleton<IStorageService, BlobStorageService>();

        return services;
    }
}
