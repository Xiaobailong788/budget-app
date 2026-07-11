# User Log — IIFE Variable Sharing Bug Fix

**Date:** 2026-07-12  
**Task:** Fix "请选择分类" error after selecting a category in the add-record page

---

## What was the problem?

After the budget app was split from one big file into 22 smaller JavaScript files (each wrapped in an IIFE), some shared variables stopped working correctly. The most visible symptom: on the **Add Record** page, even after clicking a category in the picker, submitting would still show "请选择分类" (please select a category).

## Root cause

When variables are shared across IIFE files via `window.variableName = variableName`, **primitives** (strings, numbers, booleans) are **copied by value** — not by reference. So when one file modifies its copy of the variable, other files don't see the change because they're reading from a stale copy.

In this case, the category picker (`09-category-picker.js`) updated its local `selectedCategoryId` variable when a user selected a category, but the `window.selectedCategoryId` property remained `null`. The add-record page (`14-render-add.js`) was reading from `window.selectedCategoryId` — getting `null` every time.

## What was fixed?

### Primary fix: `selectedCategoryId`
- **File:** `src/js/09-category-picker.js`
- **Change:** The `selectCategory()` function now also updates `window.selectedCategoryId` when a category is selected.
- **Result:** The add-record form now correctly remembers the selected category.

### Secondary fixes (same type of bug, different variables)

1. **`currentTab`** (`src/js/06-router.js`)
   - The navigation function wasn't updating `window.currentTab`. Other parts of the app (theme toggling, bills center, resize handler) always thought the active tab was "overview".
   - Fixed by adding `window.currentTab = tab` in `navigateTo()`.

2. **`statsMonth` / `statsStartDate` / `statsEndDate` / `statsDrillStack`** (`src/js/17-stats-charts.js`)
   - The statistics page's month/date pickers and drill-down navigation weren't properly syncing their values to `window`. Inline buttons in the drill-down UI were reading stale values.
   - Fixed by adding `window.X = X` after every assignment in `changeStatsMonth()`, `changeStatsCustom()`, `resetStatsDrill()`, and `renderStats()`.

3. **`budgetProgressSort`** (`src/js/12-budget-progress.js`)
   - The budget progress sort dropdown (按使用率/按金额/按名称) didn't actually change the sort order within the same page session. The dropdown's `onchange` handler wrote to `window.budgetProgressSort`, but the render functions were reading a stale local copy.
   - Fixed by making the render functions read from `window.budgetProgressSort` instead.

## Variables checked but OK

- `recordsFilter` — object (shared by reference, fine)
- `recordsPage` — already fixed previously
- `recordsPerPage` — already fixed previously
- `batchMode` — only used within one file
- `selectedRecordIds` — Set (shared by reference, fine)
- `compactRecordsView` — only used within one file
- `reportMonth` — only used within one file
- `whatIfExpandStates` — object (shared by reference, fine)

## How to verify

1. Open the app in a browser
2. Go to **记账** (Add Record)
3. Click the category picker button and select a category
4. You should see the category name/icon appear instead of "请选择分类"
5. Fill in an amount and submit — it should save successfully without the "请选择分类" error

## Technical details

- **Files modified:** 4 source files + 1 rebuilt output (`index.html`)
- **Lines added:** ~18
- **Build:** passes (syntax check confirmed)
- **No breaking changes** — all existing functionality preserved
