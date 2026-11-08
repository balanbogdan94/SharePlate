using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Trace;
using SharePlate.API.Telemetry;
using Xunit;

namespace SharePlate.Tests;

[Collection("Telemetry")]
public class TelemetryPrivacyTests
{
    [Fact]
    public void FiltersActivityBeforeExportAndPreservesW3cContext()
    {
        var exported = new List<string>();
        using var exporter = new ActivityExporter(exported);
        using var provider = Sdk.CreateTracerProviderBuilder()
            .AddSource("PrivacyTests")
            .SetSampler(new AlwaysOnSampler())
            .AddProcessor(new PrivacyProcessor())
            .AddProcessor(new SimpleActivityExportProcessor(exporter))
            .Build();
        using var source = new ActivitySource("PrivacyTests");
        var parent = new ActivityContext(ActivityTraceId.CreateRandom(), ActivitySpanId.CreateRandom(), ActivityTraceFlags.None);
        using (var activity = source.StartActivity("private-marker", ActivityKind.Server, parent))
        {
            Assert.NotNull(activity);
            activity.SetTag("http.request.method", "GET");
            activity.SetTag("http.route", "/api/recipes/private-marker?token=private-marker");
            activity.SetTag("url.full", "https://example/api/recipes/private-marker?token=private-marker");
            activity.SetTag("db.statement", "private-marker");
            activity.SetBaggage("user.id", "private-marker");
            activity.TraceStateString = "vendor=private-marker";
            activity.SetStatus(ActivityStatusCode.Error, "private-marker");
            activity.AddEvent(new ActivityEvent("exception", tags: new ActivityTagsCollection
            {
                ["exception.message"] = "private-marker",
                ["exception.stacktrace"] = "private-marker"
            }));
            Assert.Equal(parent.TraceId, activity.TraceId);
            Assert.True(activity.Recorded);
        }
        var payload = Assert.Single(exported);
        using var document = JsonDocument.Parse(payload);
        Assert.DoesNotContain("private-marker", document.RootElement.GetProperty("Tags").ToString());
        Assert.Null(document.RootElement.GetProperty("StatusDescription").GetString());
        Assert.Null(document.RootElement.GetProperty("TraceStateString").GetString());
        Assert.Contains("/api/recipes/*", payload);
        Assert.Contains(parent.TraceId.ToString(), payload);
    }

    [Fact]
    public void FiltersLogMessagesStateAndExceptionsBeforeExport()
    {
        var exported = new List<string>();
        using var exporter = new LogExporter(exported);
        using var factory = LoggerFactory.Create(logging => logging.AddOpenTelemetry(options =>
        {
            options.IncludeFormattedMessage = true;
            options.AddProcessor(new LogPrivacyProcessor());
            options.AddProcessor(new SimpleLogRecordExportProcessor(exporter));
        }));
        var logger = factory.CreateLogger("SharePlate.Tests");
        logger.LogError(new EventId(1001, "api.unhandled"), new InvalidOperationException("private-marker"),
            "private-marker {Body} {Route}", "private-marker", "/api/recipes/private-marker");
        var payload = Assert.Single(exported);
        Assert.DoesNotContain("private-marker", payload);
        Assert.Contains("api.unhandled", payload);
        Assert.Contains("InvalidOperationException", payload);
        Assert.Contains("/api/recipes/*", payload);
    }

    internal sealed class ActivityExporter(List<string> output) : BaseExporter<Activity>
    {
        public TaskCompletionSource Exported { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public override ExportResult Export(in Batch<Activity> batch)
        {
            foreach (var activity in batch)
                output.Add(JsonSerializer.Serialize(new
                {
                    activity.DisplayName, TraceId = activity.TraceId.ToString(), Tags = activity.TagObjects,
                    Events = activity.Events.Select(item => new { item.Name, item.Tags }),
                    activity.StatusDescription, activity.TraceStateString, activity.Baggage
                }));
            Exported.TrySetResult();
            return ExportResult.Success;
        }
    }

    internal sealed class LogExporter(List<string> output) : BaseExporter<LogRecord>
    {
        public override ExportResult Export(in Batch<LogRecord> batch)
        {
            foreach (var record in batch)
                output.Add(JsonSerializer.Serialize(new
                {
                    record.FormattedMessage, record.Body, record.Attributes,
                    Exception = record.Exception?.ToString(), TraceId = record.TraceId.ToString()
                }));
            return ExportResult.Success;
        }
    }
}
