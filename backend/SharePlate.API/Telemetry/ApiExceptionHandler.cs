using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;

namespace SharePlate.API.Telemetry;

public sealed class ApiExceptionHandler(
    ILogger<ApiExceptionHandler> logger,
    IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is OperationCanceledException && context.RequestAborted.IsCancellationRequested)
            return false;

        var clientError = exception is BadHttpRequestException { StatusCode: >= 400 and < 500 };
        var status = clientError ? ((BadHttpRequestException)exception).StatusCode : StatusCodes.Status500InternalServerError;
        if (!clientError)
            logger.LogFailure(exception, new EventId(1001, "api.unhandled"), context);
        context.Response.StatusCode = status;
        var problem = new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails =
            {
                Status = status,
                Title = clientError ? "The request could not be processed." : "An unexpected error occurred.",
                Extensions = { ["traceId"] = Activity.Current?.TraceId.ToString() ?? context.TraceIdentifier }
            }
        };
        if (!await problemDetails.TryWriteAsync(problem))
            await context.Response.WriteAsJsonAsync(problem.ProblemDetails,
                options: null, contentType: "application/problem+json", cancellationToken);
        return true;
    }
}
