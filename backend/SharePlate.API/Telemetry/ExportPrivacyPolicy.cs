using System.IO.Compression;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text;
using Azure.Core;
using Azure.Core.Pipeline;
using Azure.Monitor.OpenTelemetry.Exporter;
using Microsoft.Extensions.Options;

namespace SharePlate.API.Telemetry;

public sealed class ExportPrivacyPolicy(ILogger<ExportPrivacyPolicy> logger) : HttpPipelinePolicy
{
    private static readonly HashSet<string> AllowedTags =
    [
        "ai.operation.id", "ai.operation.parentId", "ai.operation.name", "ai.cloud.role",
        "ai.application.ver", "ai.internal.sdkVersion"
    ];
    private static readonly HashSet<string> AllowedProperties =
    [
        "Code", "Route", "Method", "TraceId", "SpanId", "ExceptionType"
    ];

    public override void Process(HttpMessage message, ReadOnlyMemory<HttpPipelinePolicy> pipeline)
    {
        Redact(message);
        ProcessNext(message, pipeline);
    }

    public override async ValueTask ProcessAsync(HttpMessage message, ReadOnlyMemory<HttpPipelinePolicy> pipeline)
    {
        Redact(message);
        await ProcessNextAsync(message, pipeline);
    }

    private void Redact(HttpMessage message)
    {
        if (message.Request.Content is null)
            return;
        using var buffer = new MemoryStream();
        message.Request.Content.WriteTo(buffer, message.CancellationToken);
        buffer.Position = 0;
        try
        {
            using var gzip = message.Request.Headers.TryGetValue("Content-Encoding", out var encoding) && encoding == "gzip"
                ? new GZipStream(buffer, CompressionMode.Decompress, leaveOpen: true) : null;
            using var reader = new StreamReader((Stream?)gzip ?? buffer, Encoding.UTF8, leaveOpen: true);
            var text = reader.ReadToEnd().Trim();
            var isArray = text.StartsWith('[');
            var batch = isArray
                ? JsonNode.Parse(text) as JsonArray ?? throw new JsonException("Unexpected telemetry payload shape.")
                : new JsonArray(text.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                    .Select(line => JsonNode.Parse(line)).ToArray());
            for (var index = batch.Count - 1; index >= 0; index--)
                if (!RedactItem(batch[index] as JsonObject ?? throw new JsonException("Invalid telemetry item.")))
                    batch.RemoveAt(index);
            var payload = isArray ? batch.ToJsonString() : string.Join('\n', batch.Select(item => item!.ToJsonString()));
            message.Request.Content = RequestContent.Create(BinaryData.FromString(payload));
            message.Request.Headers.Remove("Content-Encoding");
            message.Request.Headers.Remove("Content-Length");
        }
        catch (Exception exception) when (exception is JsonException or InvalidDataException)
        {
            logger.LogWarning(new EventId(1004, "telemetry.privacy.failed"), "Telemetry payload could not be filtered.");
            throw;
        }
    }

    private static bool RedactItem(JsonObject item)
    {
        if (item["tags"] is JsonObject tags)
            foreach (var key in tags.Select(property => property.Key).Where(key => !AllowedTags.Contains(key)).ToArray())
                tags.Remove(key);
        if (item["data"]?["baseData"] is not JsonObject data)
            throw new JsonException("Missing telemetry data.");
        var properties = data["properties"] as JsonObject ?? [];
        var safeStack = properties["SafeStackTrace"]?.GetValue<string>() ?? "";
        foreach (var key in properties.Select(property => property.Key).Where(key => !AllowedProperties.Contains(key)).ToArray())
            properties.Remove(key);
        data["properties"] = properties.Parent is null ? properties : properties.DeepClone();
        if (data["exceptions"] is not JsonArray exceptions)
            return true;
        var code = properties["Code"]?.GetValue<string>() ?? "dependency.failed";
        var manual = code is "api.unhandled" or "startup.failed";
        if (!manual)
            return false;
        data["problemId"] = code;
        foreach (var value in exceptions)
        {
            if (value is not JsonObject exception)
                throw new JsonException("Invalid exception telemetry.");
            exception["message"] = code;
            exception["typeName"] = properties["ExceptionType"]?.GetValue<string>() ?? nameof(Exception);
            exception["stack"] = safeStack;
            exception["hasFullStack"] = false;
            exception["parsedStack"] = new JsonArray(safeStack
                .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select((frame, level) => (JsonNode)new JsonObject
                {
                    ["level"] = level,
                    ["method"] = frame.Trim().StartsWith("at ", StringComparison.Ordinal)
                        ? frame.Trim()[3..] : frame.Trim(),
                    ["assembly"] = "SharePlate",
                    ["fileName"] = "",
                    ["line"] = 0
                }).ToArray());
        }
        return true;
    }
}

public sealed class ConfigureExporterPrivacy(ILogger<ExportPrivacyPolicy> logger)
    : IPostConfigureOptions<AzureMonitorExporterOptions>
{
    public void PostConfigure(string? name, AzureMonitorExporterOptions options) =>
        options.AddPolicy(new ExportPrivacyPolicy(logger), HttpPipelinePosition.PerCall);
}
