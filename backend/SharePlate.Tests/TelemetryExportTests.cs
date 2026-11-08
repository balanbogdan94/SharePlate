using System.Collections.Concurrent;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Azure;
using Azure.Core;
using Azure.Core.Pipeline;
using Azure.Monitor.OpenTelemetry.Exporter;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenTelemetry.Logs;
using OpenTelemetry.Trace;
using SharePlate.API.Telemetry;
using Xunit;

namespace SharePlate.Tests;

[Collection("Telemetry")]
public class TelemetryExportTests
{
    [Fact]
    public async Task ActualSdkFiltersSerializedPayloadIncludingImmutableExceptionEvents()
    {
        var transport = new CapturingTransport();
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Telemetry:Enabled"] = "true",
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "InstrumentationKey=11111111-1111-1111-1111-111111111111"
        });
        builder.AddAppTelemetry();
        builder.Services.PostConfigureAll<AzureMonitorExporterOptions>(options => options.Transport = transport);
        await using var app = builder.Build();
        await app.StartAsync();
        using var source = new ActivitySource("Npgsql");
        var traceId = ActivityTraceId.CreateRandom();
        var parent = new ActivityContext(traceId, ActivitySpanId.CreateRandom(), ActivityTraceFlags.None);
        using (var activity = source.StartActivity("private-marker", ActivityKind.Client, parent))
        {
            Assert.NotNull(activity);
            Assert.True(activity.Recorded);
            activity.SetTag("db.statement", "private-marker");
            activity.AddEvent(new ActivityEvent("exception", tags: new ActivityTagsCollection
            {
                ["exception.type"] = "private-marker",
                ["exception.message"] = "private-marker",
                ["exception.stacktrace"] = "private-marker"
            }));
            var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("SharePlate.API.Tests");
            using var scope = logger.BeginScope(new Dictionary<string, object> { ["UserId"] = "private-marker" });
            var exception = CaptureThrownException();
            logger.LogFailure(exception, new EventId(1001, "api.unhandled"));
            logger.LogFailure(exception, new EventId(1002, "startup.failed"));
        }
        app.Services.GetRequiredService<TracerProvider>().ForceFlush();
        app.Services.GetRequiredService<LoggerProvider>().ForceFlush();
        Assert.NotEmpty(transport.Payloads);
        var payload = string.Join("\n", transport.Payloads);
        Assert.DoesNotContain("private-marker", payload);
        Assert.Contains("PostgreSQL", payload);
        Assert.Contains("api.unhandled", payload);
        Assert.Contains(traceId.ToString(), payload);
        var items = transport.Payloads.SelectMany(value => value.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            .Select(value => JsonDocument.Parse(value).RootElement.Clone())
            .Where(item => item.GetProperty("tags").TryGetProperty("ai.operation.id", out var id) && id.GetString() == traceId.ToString())
            .ToArray();
        Assert.Equal(3, items.Length);
        Assert.All(items, item => Assert.True(!item.TryGetProperty("sampleRate", out var rate) || rate.GetDouble() == 100));
        var exceptions = items.Where(item => item.GetProperty("data").GetProperty("baseType").GetString() == "ExceptionData").ToArray();
        Assert.Equal(2, exceptions.Length);
        Assert.All(exceptions, item =>
        {
            var data = item.GetProperty("data").GetProperty("baseData");
            var details = data.GetProperty("exceptions")[0];
            Assert.Equal(typeof(InvalidOperationException).FullName, details.GetProperty("typeName").GetString());
            Assert.Contains(nameof(ThrowSyntheticFailure), details.GetProperty("stack").GetString());
            Assert.Contains(details.GetProperty("parsedStack").EnumerateArray(),
                frame => frame.GetProperty("method").GetString()!.Contains(nameof(ThrowSyntheticFailure), StringComparison.Ordinal));
            Assert.DoesNotContain("/Users/", details.GetProperty("stack").GetString());
            Assert.False(data.GetProperty("properties").TryGetProperty("SafeStackTrace", out _));
        });
        await app.StopAsync();
    }

    private static Exception CaptureThrownException()
    {
        try
        {
            ThrowSyntheticFailure();
            throw new InvalidOperationException("Expected the synthetic failure.");
        }
        catch (InvalidOperationException exception)
        {
            return exception;
        }
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static void ThrowSyntheticFailure() => throw new InvalidOperationException("private-marker");

    private sealed class CapturingTransport : HttpPipelineTransport
    {
        public ConcurrentQueue<string> Payloads { get; } = new();

        public override Request CreateRequest() => HttpClientTransport.Shared.CreateRequest();

        public override void Process(HttpMessage message)
        {
            using var buffer = new MemoryStream();
            message.Request.Content?.WriteTo(buffer, message.CancellationToken);
            Payloads.Enqueue(Encoding.UTF8.GetString(buffer.ToArray()));
            message.Response = new AcceptedResponse();
        }

        public override ValueTask ProcessAsync(HttpMessage message)
        {
            Process(message);
            return ValueTask.CompletedTask;
        }
    }

    private sealed class AcceptedResponse : Response
    {
        public override int Status => 200;
        public override string ReasonPhrase => "OK";
        public override Stream? ContentStream { get; set; } =
            new MemoryStream(Encoding.UTF8.GetBytes("{\"itemsReceived\":1,\"itemsAccepted\":1,\"errors\":[]}"));
        public override string ClientRequestId { get; set; } = "";
        public override void Dispose() => ContentStream?.Dispose();
        protected override IEnumerable<HttpHeader> EnumerateHeaders() => [];
        protected override bool TryGetHeader(string name, out string value) { value = ""; return false; }
        protected override bool TryGetHeaderValues(string name, out IEnumerable<string> values) { values = []; return false; }
        protected override bool ContainsHeader(string name) => false;
    }
}

[CollectionDefinition("Telemetry", DisableParallelization = true)]
public sealed class TelemetryCollection;
