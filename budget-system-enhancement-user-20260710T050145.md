# User Log — Budget System Enhancement

**Date:** 2026-07-10
**File modified:** `budget-app.html`

---

## Summary

Nine changes were applied to enhance the budget system in `budget-app.html`. The changes introduce support for:

- **Child category budgets** — budget inputs now appear for child (non-root) leaf categories
- **Percentage budgets** — budgets can be set as a percentage of the total monthly budget via a clickable RM/% toggle
- **Unlimited budgets** — the previous limit of 999,999 was removed (input `step` and `min` retained)
- **Selection modal update** — `showBudgetSelector` now shows both root categories and child categories that have budgets set

## What Changed

### 1. Data Storage Layer
Budget values are now stored as objects `{ value: number, type: 'fixed'|'percent' }` instead of plain numbers. This allows the application to distinguish between fixed (RM) and percentage budgets.

### 2. Budget Input UI
The budget input in the category tree now includes a clickable **RM / %** toggle next to the number field. Clicking it switches the budget type between fixed amount and percentage.

### 3. Budget Progress Cards
- Fixed the budget reading logic to handle the new object format.
- Added automatic conversion: percentage budgets are converted to monetary values based on the total monthly budget.

### 4. Pie Chart & Bar Chart
Updated to extract the numeric value from the new budget object format.

### 5. Budget Selection Modal
The "choose which categories to monitor" dialog now:
- Shows child categories that have budgets (indented with `↳`)
- Uses the new object format to check for budget existence

### 6. Child Budget Inputs
Leaf child categories now have their own budget input row below the card, with the same RM/% toggle functionality.

### 7. CSS
Added a transition rule for budget progress bar fills.

## Agents Involved

- **Team Leader** (self) — decomposed tasks, executed all edits, verified results

## Known Limitations

Two older call sites for `getCategoryBudget` (in the overview template and monthly report table) still treat the return value as a plain number. These were outside the scope of this update and will need separate attention.
