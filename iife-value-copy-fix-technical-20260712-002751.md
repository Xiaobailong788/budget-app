# Technical Log — IIFE Variable Sharing Bug Fix

**Date:** 2026-07-12  
**Task:** Find and fix variable sharing bugs caused by IIFE refactoring  
**Working directory:** `/home/xbl2602/budget app`

---

## ASSIGNMENT PLAN

| Unit | Agent | Description |
|------|-------|-------------|
| 1 | self | Discover all `selectedCategoryId` references and analyze the flow |
| 2 | self | Search for ALL cross-IIFE shared primitive variables exported via `window.X = X` |
| 3 | self | Read each affected source file and determine which variables are buggy |
| 4 | self | Fix `09-category-picker.js` — `selectCategory()` must update `window.selectedCategoryId` |
| 5 | self | Fix `06-router.js` — `navigateTo()` must update `window.currentTab` |
| 6 | self | Fix `17-stats-charts.js` — `changeStatsMonth()`, `changeStatsCustom()`, `resetStatsDrill()` must keep window properties in sync |
| 7 | self | Fix `12-budget-progress.js` — `renderBudgetProgressCard` and `renderBudgetProgressCardInner` must read from `window.budgetProgressSort` |
| 8 | self | Build and syntax-check |
| 9 | ui-agent | Polish log files |
| 10 | self | Handoff to Director |

---

## Background

The budget app was refactored from a single HTML file into 22 JS files, each wrapped in an IIFE. Variables shared across files are exported via `window.variableName = variableName`. For **primitive** values (numbers, strings, booleans), this creates a **value COPY** at IIFE execution time — not a reference. If an IIFE later modifies its local `let variable`, the `window.variable` property still holds the old value. Other IIFEs reading `variable` through the scope chain get `window.variable` (the stale copy).

## Investigation

### Step 1: Found all `selectedCategoryId` references

```bash
$ grep -rn "selectedCategoryId" src/js/
09-category-picker.js:4:    let selectedCategoryId = null;
09-category-picker.js:59:    selectedCategoryId = catId;
09-category-picker.js:75:    window.selectedCategoryId = selectedCategoryId;
14-render-add.js:7:     selectedCategoryId = null;
14-render-add.js:72:    const categoryId = selectedCategoryId;
14-render-add.js:108:   selectedCategoryId = null;
15-render-records.js:591: selectedCategoryId = record.categoryId;
15-render-records.js:648: if (!selectedCategoryId) { ... }
15-render-records.js:652:   categoryId: selectedCategoryId,
15-render-records.js:658: selectedCategoryId = null;
```

### Step 2: Trace the bug

1. `09-category-picker.js` declares `let selectedCategoryId = null` (IIFE-local)
2. At IIFE execution, `window.selectedCategoryId = selectedCategoryId` copies `null` one-time
3. When user clicks a category, `selectCategory(catId)` sets **local** `selectedCategoryId = catId` — but `window.selectedCategoryId` remains `null`
4. `14-render-add.js` reads `selectedCategoryId` (→ window, still `null`)
5. `submitRecord()` sees `!categoryId` → shows "请选择分类" error

### Step 3: Search ALL cross-IIFE shared variables

Searched every `window.X = X` export across all 22 files. Analyzed each for:
- Is X a **primitive** (number/string/boolean)?
- Is the local `let X` **modified after** the export?
- Is X **read by other IIFEs** (not just the declaring file)?

### Step 4: Complete findings

#### BUGGY variables (fixed):

| # | Variable | File | Type | Root Cause |
|---|----------|------|------|------------|
| 1 | `selectedCategoryId` | `09-category-picker.js` | string/null | `selectCategory()` sets **local** var but not `window.selectedCategoryId` |
| 2 | `currentTab` | `06-router.js` | string | `navigateTo()` sets **local** var but not `window.currentTab` — other IIFEs always read stale `'overview'` |
| 3 | `statsMonth` | `17-stats-charts.js` | string | `changeStatsMonth()` sets **local**; inline onclicks reference `window.statsMonth` (stale) |
| 4 | `statsStartDate` | `17-stats-charts.js` | string | Same pattern — `changeStatsCustom()` updates local only |
| 5 | `statsEndDate` | `17-stats-charts.js` | string | Same as above |
| 6 | `statsDrillStack` | `17-stats-charts.js` | array* | In-place `.push()` works via ref, but `= []` reassign breaks sync with window |
| 7 | `budgetProgressSort` | `12-budget-progress.js` | string | Inline onchange writes to `window.budgetProgressSort`, but render functions read **local** (never updated) |

*\* `statsDrillStack` is an array (reference), so in-place mutations work. But reassignment (`= []`) breaks the link.*

#### Variables checked and confirmed OK:

| Variable | Type | Reason OK |
|----------|------|-----------|
| `recordsFilter` | Object | Reference type — shared by reference |
| `recordsPage` | Number | Already writes directly to `window.recordsPage` |
| `recordsPerPage` | Number | Already uses both local and window in sync |
| `batchMode` | Boolean | Single-file usage only; all reads/writes within same IIFE |
| `selectedRecordIds` | Set | Reference type |
| `compactRecordsView` | Boolean | Single-file usage only |
| `whatIfExpandStates` | Object | Reference type |
| `reportMonth` | String | Single-file usage only |
| `showMonthCompare` | Boolean | Single-file usage; no inline onclick references |
| `budgetProgressView` | String | `toggleBudgetView()` updates local then calls render — fine |

---

## Fixes Applied

### Fix 1: `src/js/09-category-picker.js:60`
Added `window.selectedCategoryId = catId;` inside `selectCategory()` after the local assignment. This ensures that when the inline onclick `selectCategory('catId', 'add')` fires, both the local variable and the window property are updated.

### Fix 2: `src/js/06-router.js:28`
Added `window.currentTab = tab;` inside `navigateTo()` after the local assignment. This fixes:
- `07-ui-core.js:19` — `toggleTheme()` now correctly re-renders settings page
- `07-ui-core.js:164-166` — `closeBillsCenter()` now re-renders the correct page
- `22-init.js:26` — `resize` event handler now re-renders the correct tab
- `21-month-rollover.js:47` — inline onclick now evaluates correct tab

### Fix 3: `src/js/17-stats-charts.js`
Updated three functions to sync window properties:
- `changeStatsMonth()` — now sets `window.statsMonth`, `window.statsStartDate`, `window.statsEndDate`, `window.statsDrillStack`
- `changeStatsCustom()` — now sets `window.statsStartDate`, `window.statsEndDate`, `window.statsMonth`, `window.statsDrillStack`
- `resetStatsDrill()` (line 927) — now sets `window.statsDrillStack = []` on full reset
- `renderStats()` — added `window.statsMonth = statsMonth` after initialization

### Fix 4: `src/js/12-budget-progress.js`
Changed two render functions and the dropdown template to read from `window.budgetProgressSort`:
- `renderBudgetProgressCard()` (sort logic line 162) — reads from `window.budgetProgressSort || budgetProgressSort`
- `renderBudgetProgressCardInner()` (sort logic line 253) — same pattern
- Dropdown `selected` attribute (line 185) — reads from `window.budgetProgressSort || budgetProgressSort`

This fixes the sort dropdown: inline onchange writes to `window.budgetProgressSort`, and now the render functions read from there instead of the stale local.

---

## Verification

### Build
```bash
$ bash build.sh
```
Exit code: 0 (success)

### Syntax check
```bash
$ node -e "new Function(scriptContent)"
```
**SYNTAX CHECK PASSED** — All JavaScript parses successfully.

### Git diff summary
```
src/js/09-category-picker.js    — +1 line (window.selectedCategoryId = catId)
src/js/06-router.js             — +1 line (window.currentTab = tab)
src/js/17-stats-charts.js       — +12 lines (window property syncs)
src/js/12-budget-progress.js    — +4 lines, -4 lines (window reads)
index.html                      — rebuilt (contains all fixes)
```

---

## Files modified
- `src/js/09-category-picker.js` — PRIMARY FIX
- `src/js/06-router.js` — SECONDARY FIX
- `src/js/17-stats-charts.js` — SECONDARY FIX
- `src/js/12-budget-progress.js` — SECONDARY FIX
- `index.html` — rebuilt concatenated output
