using System.Diagnostics;
using System.Reflection;
using Microsoft.OpenTelemetry;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Extensions.Options;
using Azure.Monitor.OpenTelemetry.Exporter;
using OpenTelemetry.Instrumentation.AspNetCore;
using OpenTelemetry.Instrumentation.Http;
using OpenTelemetry.Logs;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace SharePlate.API.Telemetry;

public static class TelemetryExtensions
{
    public static void AddAppTelemetry(this WebApplicationBuilder builder)
    {
        builder.Logging.AddJsonConsole(options =>
        {
            options.UseUtcTimestamp = true;
            options.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ";
        });
        builder.Services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
        {
            if (context.ProblemDetails.Status == StatusCodes.Status500InternalServerError)
                context.ProblemDetails.Extensions["traceId"] = Activity.Current?.TraceId.ToString() ?? context.HttpContext.TraceIdentifier;
        });
        builder.Services.AddExceptionHandler<ApiExceptionHandler>();

        if (!builder.Configuration.GetValue<bool>("Telemetry:Enabled"))
            return;

        var connectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Telemetry is enabled but APPLICATIONINSIGHTS_CONNECTION_STRING is missing.");
        if (builder.Configuration["ApplicationInsightsAgent_EXTENSION_VERSION"] is "~2" or "~3")
            throw new InvalidOperationException("Disable the Application Insights agent before enabling SDK telemetry.");

        // Register privacy processors before the distro registers its exporters.
        builder.Services.AddOpenTelemetry()
            .WithTracing(tracing => tracing
                .AddProcessor(new PrivacyProcessor())
                .AddSource("Npgsql")
                .SetSampler(new AlwaysOnSampler()));
        builder.Logging.AddOpenTelemetry(options =>
        {
            options.IncludeScopes = false;
            options.IncludeFormattedMessage = true;
            options.AddProcessor(new LogPrivacyProcessor());
        });
        builder.Services.Configure<AspNetCoreTraceInstrumentationOptions>(options => options.RecordException = false);
        builder.Services.Configure<HttpClientTraceInstrumentationOptions>(options => options.RecordException = false);
        builder.Services.AddSingleton<IPostConfigureOptions<AzureMonitorExporterOptions>, ConfigureExporterPrivacy>();
        builder.Services.PostConfigure<OpenTelemetryLoggerOptions>(options => options.IncludeScopes = false);

        builder.UseMicrosoftOpenTelemetry(options =>
        {
            options.Exporters = ExportTarget.AzureMonitor;
            options.AzureMonitor.ConnectionString = connectionString;
            options.AzureMonitor.SamplingRatio = 1;
            options.AzureMonitor.TracesPerSecond = null;
            options.AzureMonitor.EnableTraceBasedLogsSampler = false;
            options.AzureMonitor.EnableLiveMetrics = false;
            options.AzureMonitor.EnableStandardMetrics = false;
            options.AzureMonitor.EnablePerfCounters = false;
            options.AzureMonitor.DisableOfflineStorage = true;
            options.Instrumentation.EnableMetrics = false;
            options.Instrumentation.EnableSqlClientInstrumentation = false;
            options.Instrumentation.EnableAgent365Instrumentation = false;
            options.Instrumentation.EnableAgentFrameworkInstrumentation = false;
            options.Instrumentation.EnableOpenAIInstrumentation = false;
            options.Instrumentation.EnableSemanticKernelInstrumentation = false;
        });
        builder.Logging.AddFilter<OpenTelemetryLoggerProvider>((category, level) =>
            category?.StartsWith("SharePlate.", StringComparison.Ordinal) == true && level >= LogLevel.Information);
        builder.Services.AddOpenTelemetry().ConfigureResource(resource => resource
            .Clear()
            .AddService("SharePlate.API", serviceVersion: typeof(TelemetryExtensions).Assembly
                .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
                autoGenerateServiceInstanceId: false)
            .AddAttributes([new("deployment.environment.name", builder.Environment.EnvironmentName)]));
        builder.Services.AddOpenTelemetry().WithTracing(tracing => tracing.SetSampler(new AlwaysOnSampler()));
    }

    public static void LogFailure(this ILogger logger, Exception exception, EventId eventId, HttpContext? context = null)
    {
        var safe = new SafeException(exception, eventId.Name ?? "application.failed");
        var endpoint = context?.Features.Get<IExceptionHandlerFeature>()?.Endpoint ?? context?.GetEndpoint();
        var route = PrivacyProcessor.SafeRoute((endpoint as RouteEndpoint)?.RoutePattern.RawText ?? "/unmatched");
        logger.Log(eventId.Id == 1002 ? LogLevel.Critical : LogLevel.Error, eventId, safe,
            "{Code} {ExceptionType} {Method} {Route} {TraceId} {SpanId}",
            eventId.Name, safe.OriginalType, PrivacyProcessor.SafeMethod(context?.Request.Method), route,
            Activity.Current?.TraceId.ToString(), Activity.Current?.SpanId.ToString());
    }
}
