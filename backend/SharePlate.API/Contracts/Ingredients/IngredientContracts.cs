using SharePlate.Core.Enums;

namespace SharePlate.API.Contracts.Ingredients;

public record IngredientResponse(
    Guid Id,
    string Name,
    UnitType DefaultUnitId
);
