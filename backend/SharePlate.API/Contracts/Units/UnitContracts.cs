using SharePlate.Core.Enums;

namespace SharePlate.API.Contracts.Units;

public record UnitResponse(
    UnitType Id,
    string Name,
    string Symbol,
    string Category
);
