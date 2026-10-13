# Measurement units

Recipes, ingredient forms, shopping review and exported lists share the same
unit labels and number formatting. English and Romanian are supported.

| Unit       | Display (English)              | Meaning                 |
| ---------- | ------------------------------ | ----------------------- |
| Kilogram   | kg                             | Mass                    |
| Gram       | g                              | Mass                    |
| Liter      | L                              | Volume                  |
| Milliliter | ml                             | Volume                  |
| Piece      | pcs                            | Count                   |
| Portion    | portion / portions             | Count                   |
| Teaspoon   | teaspoon / teaspoons           | 5 ml                    |
| Tablespoon | tablespoon / tablespoons       | 15 ml                   |
| Can        | can / cans                     | Variable-size packaging |
| Cup        | measuring cup / measuring cups | 250 ml                  |
| Pinch      | pinch / pinches                | Approximate amount      |
| Clove      | clove / cloves                 | Count, not a whole head |
| Bunch      | bunch / bunches                | Variable-size bunch     |
| Slice      | slice / slices                 | Variable-size slice     |
| Package    | package / packages             | Variable-size packaging |

The selector uses descriptive localized names. Fixed culinary volumes appear
in the selector, not as additional conversions on every ingredient row.
Options are grouped by task: Weight, Volume, Kitchen measures, Pieces & portions,
and Packaging. These are navigation groups, not conversion categories; a pinch
belongs with kitchen measures but still has no fixed volume. Only groups present
in the API catalog are shown. Native option groups preserve keyboard navigation
and the operating system's mobile picker.
Help text is contextual: package sizes, pinches and counted units receive their
own explanation instead of showing a generic warning for every selection.
The 5/15/250 ml convention is explicit: cups in external recipes may differ.
Package sizes, pinches, bunches and slices have no universal conversion.

All units allow decimal quantities, including partial packages. Input accepts
either a comma or a point as the decimal separator, regardless of language.
The minimum is 0.001. Expressions such as `1/2`, mixed separators, grouping
separators and nonfinite values are rejected. A single separator is always
decimal: `1,000` means one, never one thousand.

JSON stores numbers, not localized strings. Display uses up to 15 significant
digits with no thousands grouping or unnecessary trailing zeros, comma in
Romanian and point in English. Formatting does not mutate saved quantities.
Small amounts such as 0.001 and 0.125 are not rounded to two decimal places.

Shopping quantities merge only for the same normalized ingredient name and
exact unit. Grams and kilograms, or cans and pieces, remain separate. There
are no automatic conversions, density calculations or whole-package rounding.
