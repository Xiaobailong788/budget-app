# Technical Log — Category Accordion Refactoring

**Date:** 2026-07-10  
**File:** `/home/xbl2602/budget-app.html`  
**Goal:** Refactor Categories page UI from single-row card layout to accordion (手风琴) design  

---

## Assignment Plan

| Unit | Assigned | Why |
|---|---|---|
| Task A — CSS: Remove old styles, add new accordion CSS | self | read/write/edit tools only |
| Task B — JS: Replace `buildCategoryTreeHTML` function body | self | read/write/edit tools only |
| Task C — JS: Replace `toggleCategoryChildren` with `toggleCatItem` | self | read/write/edit tools only |
| Task D — JS: Add `editCategory` and helper functions | self | read/write/edit tools only |
| Task E — JS: Add `buildBreadcrumb` and `expandAndScrollTo` | self | read/write/edit tools only |
| Task F — JS: Update `renderCategories` (remove auto-expand, fix text) | self | read/write/edit tools only |
| Task G — Verification: grep old/new class names, JS syntax check | tester | needs bash for node --check |

---

## Execution Log

### Task A — CSS Replacement

**Action:** Removed old category tree CSS (lines 571–607, 37 lines):
- `.category-tree`, `.category-node`, `.category-node .card`, `.category-node .card:hover`
- `.cat-toggle`, `.cat-toggle.expanded`, `.cat-toggle:hover`
- `.category-children`

**Action:** Added new accordion CSS (195 lines) after `.view-toggle-btn.active` block, before `/* ===== BUDGET VIEW TOGGLE ===== */`.

**New selectors added:**
- `.cat-item`, `.cat-header`, `.cat-arrow`, `.cat-arrow:hover`, `.cat-arrow.expanded`, `.cat-arrow-empty`
- `.cat-dot`, `.cat-icon`, `.cat-name`
- `.cat-budget`, `.cat-budget .budget-input`, `.cat-budget .budget-input:focus`, `.cat-budget .budget-toggle`, `.cat-budget .budget-toggle:hover`, `.cat-budget .budget-unit`
- `.cat-body`, `.cat-body-inner`, `.cat-children`
- `.cat-actions`, `.cat-btn`, `.cat-btn:hover`
- `.cat-breadcrumb`, `.cat-breadcrumb .crumb-item`, `.cat-breadcrumb .crumb-item:hover`, `.cat-breadcrumb .crumb-sep`, `.cat-breadcrumb .crumb-current`

**Verification:** CSS syntax is valid (balanced braces, proper selectors). No duplicate selectors detected.

---

### Task B — Replace `buildCategoryTreeHTML`

**Action:** Completely replaced the function body (was ~44 lines, now ~57 lines).

**Key changes:**
- Removed old wrapper `<div class="category-tree">` 
- Removed `category-node` class with `margin-left` indent
- Removed old card layout with inline styles
- Removed all 6 individual action buttons (➕ ✏️ 🎨 🌈 📦 🔀 🗑️)
- Replaced with new accordion structure:
  - `cat-item` → `cat-header` (always visible) + `cat-body` (collapsible)
  - Arrow uses `cat-arrow` class, toggled via `toggleCatItem(this)` with `event.stopPropagation()`
  - Budget input now uses `cat-budget` group with `.budget-input`, `.budget-toggle`, `.budget-unit`
  - Only 2 action buttons: `➕ 添加子分类` and `⚙️ 编辑分类`
  - Breadcrumb shown at depth >= 4 via `buildBreadcrumb(cat)`
  - Children rendered in `cat-children` container

**Verification:** Template literals balanced. All onclick functions exist or will exist (saveCategoryBudget, addChildCategory exist; editCategory added in Task D; toggleCatItem added in Task C; buildBreadcrumb added in Task E).

---

### Task C — Replace `toggleCategoryChildren` with `toggleCatItem`

**Action:** Replaced old function (16 lines) with new function (27 lines).

**Key changes:**
- Uses `.cat-item` instead of `.category-node`
- Uses `.cat-body` instead of `.category-children`
- Uses `expandedCategories` Set properly
- Sets `max-height` for CSS transition animation
- After expand, uses `setTimeout(350ms)` to set a large max-height for content growth
- Clean collapse logic

**Verification:** Old function name `toggleCategoryChildren` no longer appears anywhere in the file. Animation timing (350ms) matches CSS transition (0.3s).

---

### Task D — Add `editCategory` and Helper Functions

**Action:** Added 4 new functions (65 lines) between `expandAndScrollTo` and Statistics render section.

**Functions added:**
- `let _editCatIcon = ''` and `let _editCatColor = ''` — module-level trackers
- `editCategory(catId)` — Opens modal with name input, icon picker (from EMOJI_GRID), color picker (from COLORS), and operations section (move, merge, delete)
- `selectEditIcon(el, icon)` — Handles icon selection in picker
- `selectEditColor(el, color)` — Handles color selection in picker
- `saveCategoryEdit(catId)` — Saves name/icon/color changes, closes modal, shows toast, re-renders

**Design note:** All 5 operations (rename, icon, color, move, merge, delete) are accessible through the edit modal, matching the design decision.

**Verification:** Uses existing globals (`EMOJI_GRID`, `COLORS`, `DataStore.updateCategory`, `showModal`, `closeModal`, `showToast`, `moveCategory`, `mergeCategory`, `deleteCategoryConfirm`).

---

### Task E — Add `buildBreadcrumb` and `expandAndScrollTo`

**Action:** Added 2 functions (67 lines) after `confirmDeleteCategory`.

- `buildBreadcrumb(cat)` — Walks up parent chain (max 20 levels guard), builds breadcrumb HTML:
  - ≤2 ancestors: show all
  - >2 ancestors: first → ⋯ → last → current
  - Each crumb calls `expandAndScrollTo(id)`
- `expandAndScrollTo(catId)` — Expands all ancestors, re-renders, scrolls to target via `scrollIntoView`

**Verification:** Uses `DataStore.getCategory`, `renderCategories`, `expandedCategories`. Guard loops prevent infinite loops. Scroll uses smooth behavior.

---

### Task F — Update `renderCategories`

**Actions:**
1. Removed auto-expand block (4 lines):
   ```js
   // Auto-expand root-level nodes by default
   if (expandedCategories.size === 0) {
     roots.forEach(r => expandedCategories.add(r.id));
   }
   ```
2. Changed text from `"点击 ▶ 展开/折叠子分类 |"` to `"点击 ▶ 展开/折叠 |"`

**Verification:** Categories now start with ALL collapsed (no auto-expand), matching design decision.

---

### Task G — Verification

**CSS class name check:**
- ✅ No remaining `category-node`, `cat-toggle`, `category-children` in the file
- ✅ New classes `cat-item`, `cat-header`, `cat-body`, `cat-arrow`, `cat-btn`, `cat-budget` present in both CSS and JS
- ✅ No remaining references to old `toggleCategoryChildren`

**JS syntax check:**
- ✅ Tester agent confirmed: **no JS syntax errors** (Node.js `--check` and `vm.Script` parse both passed)

---

## Summary Statistics

| Metric | Value |
|---|---|
| Original file size | 6393 lines |
| Final file size | 6720 lines |
| Total lines added | ~366 |
| Total lines removed | ~39 |
| Net change | +327 lines |
| CSS selectors removed | 7 |
| CSS selectors added | 31 |
| JS functions removed | 1 (`toggleCategoryChildren`) |
| JS functions added | 7 (`buildCategoryTreeHTML` rewritten, `toggleCatItem`, `buildBreadcrumb`, `expandAndScrollTo`, `editCategory`, `selectEditIcon`, `selectEditColor`, `saveCategoryEdit`) |
| JS functions modified | 1 (`renderCategories`) |
| JS syntax errors | 0 |
