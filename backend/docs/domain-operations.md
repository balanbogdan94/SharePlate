# SharePlate — Domain Operations Reference

Use this document to validate that all business rules are correctly implemented across entities, services, and API endpoints.

---

## Entities & Relationships

```
User ──< Recipe ──< RecipeIngredient >── Ingredient ── Unit (DefaultUnit)
                          └── Unit
User ──< HouseMember >── House ──< MealPlan ──< MealPlanRecipe >── Recipe
                         House ──< ShoppingItem >── Ingredient ── Unit
Unit (seeded, read-only)
```

**Key ownership rules:**

- `Recipe` is owned by `User` (no house FK — recipes are global and reusable across any house)
- `MealPlan` is owned by `House` (created by a member, available to all members)
- `ShoppingItem` belongs to `House` via `MealPlan` — it is never created manually

---

## 1. User

### 1.1 Register

**Preconditions:**

- `name` is not null/whitespace
- `email` is not null/whitespace — must be unique across all users
- `passwordHash` is not null/whitespace — hashing must occur before calling `User.Create()`

**Output:** A new `User` with `Id`, `CreatedAt`, `UpdatedAt` set.

**Business Rules:**

- A user starts with no houses (`HouseMembers` is empty)
- Password is never stored in plain text — only the hash arrives at the entity

### 1.2 Update Name

**Preconditions:** `name` is not null/whitespace

**Side effects:** `UpdatedAt` is refreshed

### 1.3 Update Email

**Preconditions:**

- `email` is not null/whitespace
- New email must be unique across all users ← **validated at service layer, not entity**

**Side effects:** `UpdatedAt` is refreshed

---

## 2. House

### 2.1 Create House

**Preconditions:**

- `name` is not null/whitespace
- `code` is not null/whitespace — should be unique (invite code) ← **validated at service layer**

**Output:** A new `House`. The creator is **automatically added as `Owner`** in the same transaction — a house with no members is an orphan.

**Implementation note:** `HouseService.CreateHouse()` must:

1. Call `House.Create()` → insert house
2. Call `HouseMember.Create(houseId, creatorId, HouseMemberRole.Owner)` → insert member
   Both operations in a single DB transaction.

### 2.2 Get House Members

**Returns:** All `HouseMember` records for the house, with `User`, `Role`, `JoinedAt`.

### 2.3 Get House by Invite Code

**Preconditions:** `code` matches an existing `House.Code`  
**Used by:** Join House flow (see 3.1)

---

## 3. HouseMember (User ↔ House relationship)

### 3.1 Join House (Create HouseMember)

**Preconditions:**

- `houseId` refers to an existing house
- `userId` refers to an existing user
- The user is **not already a member** of this house ← **validated at service layer**

**Default role:** `Member`. `Owner` is only assigned to the creator on house creation.

**Output:** A `HouseMember` with `JoinedAt = UtcNow`.

### 3.2 Change Member Role

**Preconditions:**

- Requester must be an `Owner` of the house ← **authorization check**
- Cannot demote the last `Owner` ← **business rule, service layer**

**Side effects:** `UpdatedAt` on `HouseMember`.

### 3.3 Leave / Remove Member

**Preconditions:**

- A member can leave voluntarily **or** be removed by an Owner
- Cannot remove the last `Owner` of a house

**Business rule:** When a user leaves a house:

- Their `HouseMember` record is deleted (or soft-deleted)
- `MealPlan.CreatedById` and `Recipe.AuthorId` FKs are **retained** — the user record still exists
- The user simply loses access to the house's meal plans and shopping list
- Recipes authored by the user remain visible globally (they own the recipe, not the house)

---

## 4. Unit (Read-Only, Seeded)

Units are **never created or modified by users**. They are seeded once via EF Core migrations.

| Id  | Name       | Symbol | Category | ToBaseUnitFactor |
| --- | ---------- | ------ | -------- | ---------------- |
| 1   | Kilogram   | kg     | Weight   | 1.0              |
| 2   | Gram       | g      | Weight   | 0.001            |
| 3   | Liter      | l      | Volume   | 1.0              |
| 4   | Milliliter | ml     | Volume   | 0.001            |
| 5   | Piece      | pc     | Quantity | 1.0              |
| 6   | Portion    | ptn    | Quantity | 1.0              |

**Conversion rule:** Only units within the same `UnitCategory` can be compared or summed.

```
convertedQty = quantity * unit.ToBaseUnitFactor
// 500g → 500 * 0.001 = 0.5 kg
```

---

## 5. Ingredient

### 5.1 Create Ingredient

**Preconditions:**

- `name` is not null/whitespace — should be unique ← **validated at service layer**
- `defaultUnitId` refers to an existing `Unit`

**Note:** Ingredients are **global** (not per-house). Any authenticated user can create an ingredient and any recipe can reference it.

### 5.2 Search Ingredients

Used when adding ingredients to a recipe. Should support partial name matching.

---

## 6. Recipe

### 6.1 Create Recipe

**Preconditions:**

- `name` is not null/whitespace
- `authorId` refers to an existing user
- `description` can be empty
- `imageUrl` is optional

**Ownership:** Recipe belongs to the `User` who created it — **not to any house**. It is globally visible and can be added to any meal plan by any house member.

**Output:** A `Recipe` with an empty `RecipeIngredients` list. Ingredients are added separately (see 6.2).

**Edit / Delete:** Only the `Author` can edit or delete their own recipe.

### 6.2 Add Ingredient to Recipe (Create RecipeIngredient)

**Preconditions:**

- `recipeId` refers to an existing recipe
- `ingredientId` refers to an existing ingredient
- `quantity > 0` ← **validated at entity level**
- `unitId` refers to an existing `Unit`
- The unit's `UnitCategory` must match the ingredient's `DefaultUnit.Category` ← **validated at service layer**
- The same ingredient should not be added twice to the same recipe ← **validated at service layer**

### 6.3 Update Recipe Ingredient Quantity

**Preconditions:** `quantity > 0`  
**Side effects:** `UpdatedAt` on `RecipeIngredient`.

### 6.4 Remove Ingredient from Recipe

Deletes the `RecipeIngredient` row.

### 6.5 Get Recipe with Ingredients

Returns the recipe with all `RecipeIngredients`, each including `Ingredient.Name`, `Unit.Symbol`, and `Quantity`.

---

## 7. MealPlan

### 7.1 Create Meal Plan

**Preconditions:**

- `name` is not null/whitespace
- `startDate <= endDate` ← **validated at entity level**
- `houseId` refers to an existing house
- `createdById` refers to a user who **is a member of that house** ← **validated at service layer**

**Output:** An empty `MealPlan` (no recipes scheduled yet).

### 7.2 Schedule Recipe in Meal Plan (Create MealPlanRecipe)

**Preconditions:**

- `mealPlanId` refers to an existing plan
- `recipeId` refers to an existing recipe — can be any recipe authored by any user
- `plannedDate` must fall within `MealPlan.StartDate` ↔ `MealPlan.EndDate` ← **validated at service layer**
- `servings > 0` ← **validated at entity level**
- Same recipe on the same date and same `MealTime` should not be added twice ← **validated at service layer**

**Side effect:** After adding the `MealPlanRecipe`, the shopping list for the meal plan is **synchronised** — new `Pending` items are inserted for any ingredients not already present (see 8.1).

### 7.3 Remove Recipe from Meal Plan

Deletes the `MealPlanRecipe` row.

**Side effect:** Any `ShoppingItem` with `Status = Pending` that was contributed solely by this recipe is **removed**. Items already `Purchased` or `Removed` are left untouched.

### 7.4 Get Meal Plan with Schedule

Returns the plan with all `MealPlanRecipes`, each with `PlannedDate`, `MealTime`, `Servings`, and `Recipe.Name`.

---

## 8. ShoppingItem (Live Sync from Meal Plan)

Shopping items are **never created or edited manually**. They are kept in sync with the meal plan automatically. Each time a recipe is added to or removed from a meal plan, the shopping list is updated.

### 8.1 Sync Shopping List (triggered by 7.2 and 7.3)

This is an internal service operation, not a direct user action.

**On recipe added to meal plan:**

1. Load the added `Recipe.RecipeIngredients` (ingredient + quantity + unit)
2. Scale each quantity by `MealPlanRecipe.Servings`
3. For each scaled ingredient:
   - If a `Pending` `ShoppingItem` for the same `(IngredientId, UnitId)` already exists → **increment its quantity**
   - If a `ShoppingItem` exists but is `Purchased` or `Removed` → **insert a new `Pending` item** alongside it (do not modify already-actioned items)
   - Otherwise → **insert a new `Pending` ShoppingItem**

**On recipe removed from meal plan:**

1. Recalculate the total required quantity of each ingredient from the **remaining** `MealPlanRecipes`
2. For each ingredient:
   - If the ingredient is **no longer needed at all** → delete its `Pending` `ShoppingItem` (never touch `Purchased`/`Removed`)
   - If the quantity **decreased** → update the `Pending` item's quantity to the new total

**Conversion rule:** Only units within the same `UnitCategory` can be summed. Convert to base unit first:

```
effectiveQty = quantity * unit.ToBaseUnitFactor
// 500g + 1kg → (500 * 0.001) + (1 * 1.0) = 1.5 kg
```

### 8.2 Mark Item as Purchased

**Preconditions:**

- `modifiedById` refers to a user who is a member of the house

**Side effects:** `Status → Purchased`, `ModifiedById` set, `UpdatedAt` refreshed.

**Business rule:** A `Purchased` item is never auto-deleted by a subsequent recipe removal from the meal plan. The user bought it — it stays on record.

### 8.3 Remove Item from Shopping List

**Preconditions:** Same membership check as above.

**Side effects:** `Status → Removed`, `ModifiedById` set, `UpdatedAt` refreshed.

**Business rule:** A `Removed` item is never re-added automatically even if the recipe is still in the meal plan. The user explicitly dismissed it.

**Status transition rules:**

```
Pending   → Purchased  (user bought it)
Pending   → Removed    (user dismissed it)
Purchased → Pending    (user un-marks it — undo support)
Removed   → Pending    (user restores it)
```

**Note:** Allowing reverse transitions (Purchased/Removed → Pending) is recommended for undo support on mobile.

---

## 9. Authorization Matrix

| Operation                        | Any Auth User | House Member | House Owner |
| -------------------------------- | ------------- | ------------ | ----------- |
| Register / Login                 | ✅            |              |             |
| Create House                     | ✅            |              |             |
| Join House (by invite code)      | ✅            |              |             |
| View House members               |               | ✅           |             |
| Remove a member                  |               |              | ✅          |
| Change member role               |               |              | ✅          |
| Create Ingredient                | ✅            |              |             |
| Create Recipe                    | ✅            |              |             |
| Edit / Delete own Recipe         | ✅ (author)   |              |             |
| View any Recipe                  | ✅            |              |             |
| Create Meal Plan                 |               | ✅           |             |
| Add / Remove Recipe in Meal Plan |               | ✅           |             |
| View Meal Plan                   |               | ✅           |             |
| View Shopping List               |               | ✅           |             |
| Mark Item Purchased / Removed    |               | ✅           |             |
| Revert Item to Pending           |               | ✅           |             |

---

## 10. Resolved Decisions

| #    | Question                                                   | Resolution                                                             |
| ---- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| OQ-1 | Should House.Create() auto-add creator as Owner?           | ✅ Yes — in the same transaction                                       |
| OQ-2 | What happens to Recipe/MealPlan FK when user leaves house? | ✅ Retain FK; user record stays, access revoked via HouseMember only   |
| OQ-3 | Are Ingredients global or per-house?                       | ✅ Global — any authenticated user can create                          |
| OQ-4 | Should shopping list generation merge or replace?          | ✅ Additive sync — adding recipes adds items; removing adjusts Pending |
| OQ-5 | Can a Purchased shopping item revert to Pending?           | ✅ Yes — undo support, all reverse transitions allowed                 |
| OQ-6 | Are Recipes public or per-house?                           | ✅ Global — owned by User, usable in any house's meal plan             |
| OQ-7 | Can a MealPlan span multiple houses?                       | ✅ No — `MealPlan.HouseId` is a required FK                            |

---

## 11. API Authentication Flow (JWT + Refresh)

### 11.1 Endpoints

- `POST /api/auth/register` — creates a user account.
- `POST /api/auth/login` — validates credentials and issues tokens.
- `POST /api/auth/refresh` — rotates refresh token and returns new tokens.
- `POST /api/auth/logout` — revokes refresh token(s).
- `POST /api/auth/reset-password/initiate` and `POST /api/auth/reset-password/complete` — password reset flow.

### 11.2 Token Model

- Access token: short-lived JWT, sent as `Authorization: Bearer <token>`.
- Refresh token: long-lived opaque token, stored hashed in `RefreshTokens` and rotated on refresh.
- Refresh token reuse (already revoked token) must be treated as invalid and denied.

### 11.3 Legacy Password Policy

- Accounts with legacy SHA-256 password hashes are blocked from login.
- Login returns `password_reset_required`.
- User must complete reset-password flow before obtaining tokens.

### 11.4 Hybrid Transition Rule (Claims preferred)

- During migration, endpoints that previously accepted `userId` in request body still accept it.
- If authenticated claim user id exists (`shareplate:user_id`, then `nameidentifier`, then `sub`), claim value is authoritative.
- Body `userId` is fallback only for compatibility during transition.
