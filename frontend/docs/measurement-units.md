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

## Adding recipe ingredients

The same ingredient sheet is used for creating and editing a recipe. **Add**
stages one validated ingredient in the current batch and leaves the sheet open.
Name and quantity are cleared, the unit is retained, and focus returns to the
name. The latest staged ingredient and batch count are shown inside the sheet.
Duplicate ingredient names are allowed; rows are not combined automatically.

**Close** keeps the batch in the recipe form and closes the sheet. This does not
save the recipe to the server. An unfinished ingredient is never added implicitly:
the sheet shows a reminder, and its input remains available on reopening while
the recipe form stays mounted. A new session without unfinished input starts
with the normal default unit.

**X, backdrop and Escape** take the discard route. A nonempty batch or unfinished
name/quantity requires confirmation. Continuing leaves everything unchanged;
confirming discard removes only this session's batch and unfinished input, never
previously confirmed recipe ingredients. Choosing a unit alone does not require
confirmation. There is no undo action inside the sheet.

The existing per-recipe `sessionStorage` draft also stores the provisional batch.
Refreshing in the same tab recovers the batch and reopens the sheet; it is still
provisional until **Close**. Unadded name/quantity input is not persisted across
refresh. Create/edit drafts remain separate, and older drafts without a batch
continue to work. Only confirmed ingredients enter the recipe API payload.

Keyboard Enter in the name/quantity fields adds a valid ingredient, without
submitting the recipe. Repeated keys and IME composition do not add rows; the
native unit picker keeps its own keyboard behavior. The active sheet and its
discard confirmation use native modal dialogs for focus containment. Additions
are announced politely, errors stay inside the sheet, and closing restores focus.
The sheet follows the visual viewport, scrolls internally and leaves safe-area
space for its two footer actions.

### Manual interaction checks

- Add three ingredients without reopening; verify reset fields, retained unit,
  name focus, latest-row feedback and count. **Close**, reopen and check that
  all three rows appear exactly once.
- Start another batch, cancel its discard confirmation, then discard it. Confirm
  that the previous three rows remain, and that the discarded session is empty
  when reopened.
- Refresh with a provisional batch; test both completing and discarding the
  recovered batch. Unadded input must not reappear after refresh.
- Check Tab/Shift+Tab containment, Enter, Escape, focus after confirmation
  cancellation and focus return to the opener. Test both English and Romanian.
- At a narrow viewport, check scrolling and touch targets. On real iOS Safari
  and Android Chrome, check focus and the software keyboard, including access
  to **Add**, **Close**, and both confirmation actions. Desktop emulation alone
  does not verify real-device keyboard behavior.
