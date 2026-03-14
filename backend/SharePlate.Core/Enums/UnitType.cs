using System.Text.Json.Serialization;

namespace SharePlate.Core.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UnitType
{
    Kilogram = 1,
    Gram = 2,
    Liter = 3,
    Milliliter = 4,
    Piece = 5,
    Portion = 6
}
