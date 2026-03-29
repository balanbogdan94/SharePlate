using System.ComponentModel.DataAnnotations;
using SharePlate.Core.Enums;

namespace SharePlate.API.Contracts.Plans;

public sealed class PlanDayRequest
{
    [Required]
    public DateOnly Date { get; init; }

    [Required]
    public Dictionary<CategoryType, List<Guid>> Categories { get; init; } = [];
}

public sealed class CreatePlanRequest
{
    [Required]
    public DateOnly StartDate { get; init; }

    [Required]
    public DateOnly EndDate { get; init; }

    [Required]
    public List<PlanDayRequest> Days { get; init; } = [];
}

public sealed class UpdatePlanRequest
{
    [Required]
    public DateOnly StartDate { get; init; }

    [Required]
    public DateOnly EndDate { get; init; }

    [Required]
    public List<PlanDayRequest> Days { get; init; } = [];
}

public record PlanListResponse(
    Guid Id,
    DateOnly StartDate,
    DateOnly EndDate,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record PlanDayResponse(
    DateOnly Date,
    Dictionary<CategoryType, List<Guid>> Categories
);

public record PlanDetailsResponse(
    Guid Id,
    DateOnly StartDate,
    DateOnly EndDate,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<PlanDayResponse> Days
);
