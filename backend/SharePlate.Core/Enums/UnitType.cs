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
    Portion = 6,
    Teaspoon = 7,
    Tablespoon = 8,
    Can = 9,
    Cup = 10,
    Pinch = 11,
    Clove = 12,
    Bunch = 13,
    Slice = 14,
    Package = 15
}
