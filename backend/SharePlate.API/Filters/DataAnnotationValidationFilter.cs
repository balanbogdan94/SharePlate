using System;
using System.ComponentModel.DataAnnotations;

namespace SharePlate.API.Filters;

public class DataAnnotationValidationFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var errors = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var arg in context.Arguments)
        {
            if (arg is null) continue;
            if (IsSimpleType(arg.GetType())) continue;

            var validationResults = new List<ValidationResult>();
            var validationContext = new ValidationContext(arg);

            var isValid = Validator.TryValidateObject(
                arg,
                validationContext,
                validationResults,
                validateAllProperties: true);

            if (isValid) continue;

            foreach (var result in validationResults)
            {
                var members = result.MemberNames?.Any() == true
                    ? result.MemberNames
                    : new[] { string.Empty };

                foreach (var member in members)
                {
                    if (!errors.TryGetValue(member, out var list))
                    {
                        list = new List<string>();
                        errors[member] = list;
                    }

                    list.Add(result.ErrorMessage ?? "Invalid value.");
                }
            }
        }

        if (errors.Count > 0)
        {
            return Results.ValidationProblem(
                errors.ToDictionary(k => k.Key, v => v.Value.Distinct().ToArray()));
        }

        return await next(context);
    }

    private static bool IsSimpleType(Type type) =>
        type.IsPrimitive ||
        type.IsEnum ||
        type == typeof(string) ||
        type == typeof(decimal) ||
        type == typeof(DateTime) ||
        type == typeof(DateTimeOffset) ||
        type == typeof(Guid) ||
        type == typeof(TimeSpan);
}
