using System.Diagnostics;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Trace;
using SharePlate.API.Telemetry;
using Xunit;

namespace SharePlate.Tests;

[Collection("Telemetry")]
public class TelemetryApiTests
{
    [Fact]
    public async Task UnexpectedExceptionHasOneSafeLogAndGenericProblemWithTraceId()
    {
        var logs = new List<string>();
        var traces = new List<string>();
        using var exporter = new TelemetryPrivacyTests.LogExporter(logs);
        using var traceExporter = new TelemetryPrivacyTests.ActivityExporter(traces);
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Logging.ClearProviders();
        builder.AddAppTelemetry();
        builder.Services.AddOpenTelemetry().WithTracing(tracing => tracing
            .AddAspNetCoreInstrumentation()
            .AddProcessor(new PrivacyProcessor())
            .AddProcessor(new SimpleActivityExportProcessor(traceExporter)));
        builder.Logging.AddOpenTelemetry(options =>
        {
            options.AddProcessor(new LogPrivacyProcessor());
            options.AddProcessor(new SimpleLogRecordExportProcessor(exporter));
        });
        await using var app = builder.Build();
        app.Services.GetRequiredService<TracerProvider>();
        app.UseExceptionHandler();
        app.MapGet("/api/recipes/{id:guid}", () => Throw());
        app.MapGet("/validation", () => Microsoft.AspNetCore.Http.Results.BadRequest("Existing validation"));
        await app.StartAsync();
        using var client = app.GetTestClient();
        var traceId = ActivityTraceId.CreateRandom().ToString();
        client.DefaultRequestHeaders.Add("traceparent", $"00-{traceId}-a4d902cb1ed94218-01");
        var response = await client.GetAsync("/api/recipes/11111111-1111-1111-1111-111111111111?private=private-marker");
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("private-marker", body);
        using var problem = JsonDocument.Parse(body);
        Assert.Equal("An unexpected error occurred.", problem.RootElement.GetProperty("title").GetString());
        Assert.Equal(traceId, problem.RootElement.GetProperty("traceId").GetString());
        var failures = logs.Where(log => log.Contains("\"Code\",\"Value\":\"api.unhandled\"", StringComparison.Ordinal)).ToArray();
        Assert.Single(failures);
        Assert.DoesNotContain("private-marker", failures[0]);
        Assert.Contains(traceId, failures[0]);
        await traceExporter.Exported.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.Contains(traces, trace => trace.Contains(traceId, StringComparison.Ordinal) && !trace.Contains("private-marker"));
        var validation = await client.GetAsync("/validation");
        Assert.Equal(HttpStatusCode.BadRequest, validation.StatusCode);
        Assert.Contains("Existing validation", await validation.Content.ReadAsStringAsync());
    }

    [Fact]
    public void EnabledTelemetryRequiresConfigurationAndRejectsActiveAgent()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Telemetry:Enabled"] = "true"
        });
        Assert.Throws<InvalidOperationException>(() => builder.AddAppTelemetry());
        var withAgent = WebApplication.CreateBuilder();
        withAgent.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Telemetry:Enabled"] = "true",
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "InstrumentationKey=11111111-1111-1111-1111-111111111111",
            ["ApplicationInsightsAgent_EXTENSION_VERSION"] = "~3"
        });
        Assert.Throws<InvalidOperationException>(() => withAgent.AddAppTelemetry());
    }

    [Theory]
    [InlineData("json", 400)]
    [InlineData("query", 400)]
    [InlineData("missing-query", 400)]
    [InlineData("too-large", 413)]
    public async Task BadRequestExceptionsKeepTheirStatusWithoutInternalErrorLogs(string scenario, int status)
    {
        var logs = new List<string>();
        using var exporter = new TelemetryPrivacyTests.LogExporter(logs);
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = Environments.Development });
        builder.WebHost.UseTestServer();
        builder.Logging.ClearProviders();
        builder.AddAppTelemetry();
        builder.Logging.AddOpenTelemetry(options =>
        {
            options.AddProcessor(new LogPrivacyProcessor());
            options.AddProcessor(new SimpleLogRecordExportProcessor(exporter));
        });
        await using var app = builder.Build();
        app.UseExceptionHandler();
        app.MapPost("/binding/json", (BindingRequest request) => Microsoft.AspNetCore.Http.Results.Ok(request.Name));
        app.MapGet("/binding/query", (int quantity) => Microsoft.AspNetCore.Http.Results.Ok(quantity));
        app.MapGet("/too-large", () => ThrowPayloadTooLarge());
        await app.StartAsync();
        using var client = app.GetTestClient();
        using var response = scenario switch
        {
            "json" => await client.PostAsync("/binding/json", new StringContent("{private-marker", System.Text.Encoding.UTF8, "application/json")),
            "query" => await client.GetAsync("/binding/query?quantity=private-marker"),
            "missing-query" => await client.GetAsync("/binding/query"),
            _ => await client.GetAsync("/too-large")
        };
        Assert.Equal(status, (int)response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("private-marker", body);
        using var problem = JsonDocument.Parse(body);
        Assert.Equal(status, problem.RootElement.GetProperty("status").GetInt32());
        Assert.DoesNotContain(logs, log => log.Contains("api.unhandled", StringComparison.Ordinal));
    }

    private sealed record BindingRequest(string Name);
    private static Microsoft.AspNetCore.Http.IResult ThrowPayloadTooLarge() =>
        throw new Microsoft.AspNetCore.Http.BadHttpRequestException("private-marker", 413);

    private static Microsoft.AspNetCore.Http.IResult Throw() => throw new InvalidOperationException("private-marker");
}
