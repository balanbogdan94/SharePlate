using System.Diagnostics;

namespace SharePlate.API.Telemetry;

public sealed class SafeException : Exception
{
    private readonly string safeStack;

    public string OriginalType { get; }
    public override string StackTrace => safeStack;

    public SafeException(Exception exception, string code) : base(code)
    {
        OriginalType = exception.GetType().FullName ?? nameof(Exception);
        safeStack = string.Join(Environment.NewLine,
            new StackTrace(exception, false).GetFrames()
                .Select(frame => frame.GetMethod())
                .Where(method => method?.DeclaringType is not null)
                .Take(30)
                .Select(method => $"   at {method!.DeclaringType!.FullName}.{method.Name}()"));
        if (safeStack.Length > 6000)
            safeStack = safeStack[..6000];
    }
}
