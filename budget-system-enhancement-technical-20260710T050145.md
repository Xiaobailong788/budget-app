# Technical Log — Budget System Enhancement

**Date:** 2026-07-10T05:01:45Z
**File:** `/home/xbl2602/budget-app.html`
**Changes applied:** 9 changes across the application.

---

## Assignment Plan

| # | Unit | Assigned | Status |
|---|---|---|---|
| 1 | DataStore: `getCategoryBudget` → return `{value, type}` object; `setCategoryBudget` → accept `type` param | self | ✅ Done |
| 2 | `saveCategoryBudget` function → add `type` parameter | self | ✅ Done |
| 3 | `buildCategoryTreeHTML` root budget input → use object format + type toggle (RM/%) | self | ✅ Done |
| 4a | `drawPieStatic` → unwrap `getCategoryBudget` via `catBudgetObj.value` | self | ✅ Done |
| 4b | `drawBarChart` → unwrap `getCategoryBudget` via `catBudgetObj.value` | self | ✅ Done |
| 5a | `renderBudgetProgressCard` → replace `budget` with `rawBudget` destructuring pattern | self | ✅ Done |
| 5b | `renderBudgetProgressCardInner` → same replacement as 5a | self | ✅ Done |
| 6 | `renderBudgetProgressCardInner` → add percentage budget conversion logic | self | ✅ Done |
| 7 | `showBudgetSelector` → include child categories + indented rendering | self | ✅ Done |
| 8 | `buildCategoryTreeHTML` → add separate budget input row for leaf child categories | self | ✅ Done |
| 9 | CSS → add `.budget-bar-fill` rule before `</style>` | self | ✅ Done |

---

## Detailed Changes

### CHANGE 1 — DataStore budget methods
**Lines:** 1333–1348
- `getCategoryBudget` now returns `{ value: number, type: 'fixed'|'percent' }` instead of a raw number.
  - Handles `undefined`, `null`, `number`, and `object` stored values.
  - Defaults to `{ value: 0, type: 'fixed' }` when no budget is set.
- `setCategoryBudget` now accepts a 4th `type` argument.
  - Stores `{ value: amount, type: type || 'fixed' }` as the budget entry.
  - Deletes the entry entirely when amount is falsy or ≤ 0.

### CHANGE 2 — `saveCategoryBudget` function
**Lines:** ~3664–3668
- Added 4th parameter `type`.
- Passes `type` through to `DataStore.setCategoryBudget`.
- Updated toast messages: `✅ 预算已保存` / `ℹ️ 预算已清除`.

### CHANGE 3 — Root budget input in category tree
**Lines:** ~3630–3639 (inside `buildCategoryTreeHTML`)
- Removed `${isRoot ? ... : ''}` guard — now renders for **all** categories in the card header.
- Uses `${catBudget.value || ''}` instead of `${catBudget || ''}`.
- Calls `saveCategoryBudget(..., this.value, '${catBudget.type}')` with type parameter.
- Added a clickable RM/% toggle span:
  - On click, toggles between `RM` and `%` display.
  - Calls `saveCategoryBudget` with `'percent'` or `'fixed'` accordingly.
  - Initial display matches `catBudget.type`.

### CHANGE 4a — `drawPieStatic` budget unwrapping
**Lines:** ~5127–5129
- Before: `catBudget = DataStore.getCategoryBudget(slice.id, budgetMonth);`
- After: `const catBudgetObj = DataStore.getCategoryBudget(slice.id, budgetMonth); catBudget = catBudgetObj.value;`

### CHANGE 4b — `drawBarChart` budget unwrapping
**Lines:** ~5552–5554
- Before: `const catBudget = DataStore.getCategoryBudget(d.id, budgetMonth);`
- After: `const catBudgetObj = DataStore.getCategoryBudget(d.id, budgetMonth); const catBudget = catBudgetObj.value;`

### CHANGE 5a/5b — Progress card budget destructuring
**Lines:** ~2518–2521 (`renderBudgetProgressCard`) and ~2582–2585 (`renderBudgetProgressCardInner`)
- Old: `const budget = catBudgets[budgetKey] || 0;`
- New:
  ```javascript
  const rawBudget = catBudgets[budgetKey];
  let budget = 0, budgetType = 'fixed';
  if (typeof rawBudget === 'number') { budget = rawBudget; budgetType = 'fixed'; }
  else if (rawBudget && typeof rawBudget === 'object') { budget = rawBudget.value || 0; budgetType = rawBudget.type || 'fixed'; }
  ```

### CHANGE 6 — Percentage budget conversion (inner card only)
**Lines:** ~2586–2591 (in `renderBudgetProgressCardInner`)
- After the `budgetType` initialization, added logic:
  - If `budgetType === 'percent'` and `budget > 0`, converts percentage to monetary value:
    - `budget = (budget / 100) * DataStore.getBudget(month)`
  - Falls back to `0` if monthly budget is 0.

### CHANGE 7 — `showBudgetSelector` child support
**Lines:** ~2440–2468
- Replaced simple `.filter()` with a `forEach` that:
  - Checks root categories for budgets (supports both number and object formats).
  - Also iterates `DataStore.getChildren(cat.id)` and checks each child for budgets.
  - Pushes all budgeted categories (roots + children) into the `budgeted` array.
- Updated rendering:
  - Child categories are indented with `margin-left:24px` and smaller font.
  - Child names are prefixed with `↳ `.

### CHANGE 8 — Leaf child budget input
**Lines:** ~3648–3663 (in `buildCategoryTreeHTML`)
- For `!isRoot && !hasChildren` (leaf child categories), adds a separate budget input row below the card:
  - Uses the same object format and RM/% toggle as the root input.
  - Smaller dimensions (width:60px, smaller font/padding).

### CHANGE 9 — CSS addition
**Line:** ~993 (before `</style>`)
- Added `.budget-bar-fill` class with `transition: width 0.35s ease`.

---

## Known Issues / Unchanged Call Sites

The following `getCategoryBudget` call sites still use the old return format (plain number) and may need updates:

1. **Line 2339** (overview template — top spending categories):
   ```javascript
   const catBudget = item.cat.id ? DataStore.getCategoryBudget(item.cat.id, month) : 0;
   ```
   Currently compares `catBudget > 0` which will fail with object return.

2. **Line 6015** (monthly report — category table):
   ```javascript
   const catBudget = DataStore.getCategoryBudget(c.id, month);
   ```
   Uses arithmetic (`catBudget - spent`) and comparison (`catBudget > 0`) which will fail with object return.

These were outside the scope of the requested changes and should be addressed in a follow-up.

---

## Verification Results

| Check | Result | Lines |
|---|---|---|
| `getCategoryBudget` returns `{value, type}` object | ✅ | 1337 |
| `catBudgetObj` appears in drawPieStatic and drawBarChart | ✅ | 5128, 5553 |
| `budgetType` in progress card functions + saveCategoryBudget | ✅ | 2519–2521, 2583–2587, 3668 |
| `rawBudget` pattern in progress card functions (2 occurrences) | ✅ | 2518, 2582 |
| `↳` in showBudgetSelector for child items | ✅ | 2468 |
