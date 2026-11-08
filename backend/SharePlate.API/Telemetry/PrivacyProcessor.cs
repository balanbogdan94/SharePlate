using System.Diagnostics;
using OpenTelemetry;
using OpenTelemetry.Logs;

namespace SharePlate.API.Telemetry;

public sealed class PrivacyProcessor : BaseProcessor<Activity>
{
    private static readonly HashSet<string> RouteSegments =
    [
        "api", "health", "unmatched", "dependency", "plans", "recipes", "house", "houses",
        "users", "me", "session", "provision", "units", "ingredients", "state", "members",
        "join-requests", "join", "leave", "name", "approve", "reject", "search", "my", "avatar", "by-email"
    ];

    public override void OnEnd(Activity activity)
    {
        var method = SafeMethod(activity.GetTagItem("http.request.method") ?? activity.GetTagItem("http.method"));
        var isRequest = activity.Kind == ActivityKind.Server;
        var route = isRequest ? SafeRoute(activity.GetTagItem("http.route") as string ?? "/unmatched") : "/dependency";
        var status = activity.GetTagItem("http.response.status_code") ?? activity.GetTagItem("http.status_code");
        var database = activity.Source.Name == "Npgsql";

        foreach (var tag in activity.TagObjects.ToArray())
            activity.SetTag(tag.Key, null);
        foreach (var baggage in activity.Baggage.ToArray())
            activity.SetBaggage(baggage.Key, null);
        activity.TraceStateString = null;
        activity.SetStatus(activity.Status);
        activity.DisplayName = database ? "PostgreSQL" : $"{method} {route}";

        if (database)
            activity.SetTag("db.system", "postgresql");
        else
        {
            activity.SetTag("http.request.method", method);
            activity.SetTag("http.route", route);
            activity.SetTag("url.full", $"https://shareplate.invalid{route}");
            if (status is int or long)
                activity.SetTag("http.response.status_code", status);
        }

        // Activity events are immutable; the exporter policy removes their raw exception data.
    }

    public static string SafeMethod(object? value) => value is string method
        && method is "GET" or "POST" or "PUT" or "DELETE" or "PATCH" or "HEAD" or "OPTIONS"
            ? method : "HTTP";

    public static string SafeRoute(string value) => value.StartsWith('/') && !value.StartsWith("//")
        ? string.Join("/", value.Split('?', '#')[0].Split('/')
            .Select(segment => segment.Length == 0 || RouteSegments.Contains(segment) ? segment : "*"))
        : "/unmatched";
}

public sealed class LogPrivacyProcessor : BaseProcessor<LogRecord>
{
    public override void OnEnd(LogRecord record)
    {
        var code = record.EventId.Id switch
        {
            1001 => "api.unhandled",
            1002 => "startup.failed",
            1003 => "startup.completed",
            1004 => "telemetry.privacy.failed",
            _ => "application.log"
        };
        var exception = record.Exception;
        var safe = exception is null ? null : exception as SafeException ?? new SafeException(exception, code);
        record.Exception = safe;
        record.Body = code;
        record.FormattedMessage = code;
        var attributes = record.Attributes ?? [];
        record.Attributes =
        [
            new("Code", code),
            new("Method", PrivacyProcessor.SafeMethod(attributes.FirstOrDefault(item => item.Key == "Method").Value)),
            new("Route", PrivacyProcessor.SafeRoute(attributes.FirstOrDefault(item => item.Key == "Route").Value as string ?? "/unmatched")),
            new("TraceId", record.TraceId == default ? null : record.TraceId.ToString()),
            new("SpanId", record.SpanId == default ? null : record.SpanId.ToString()),
            new("ExceptionType", safe?.OriginalType),
            new("SafeStackTrace", safe?.StackTrace)
        ];
    }
}
