# Technical Log — Chart Expand Feature Fix

**File:** `/home/xbl2602/budget-app.html`
**Date:** 2026-07-10 01:22 UTC
**Author:** Team Leader (execution coordinator)

---

## Assignment Plan

| # | Unit | Assigned | Status |
|---|---|---|---|
| 1 | Extract JS baseline & `node --check` | self → tester | ✅ Passed |
| 2 | CSS: `.chart-expand-overlay` → use `inset: 0` instead of `top/left/width/height` | self | ✅ Done |
| 3 | CSS: `.chart-expand-inner canvas` max-height `60vh` → `55vh` | self | ✅ Done |
| 4 | CSS: `.chart-expand-inner .heatmap-grid` max-width `400px` → `380px` | self | ✅ Done |
| 5 | CSS: `.chart-expand-inner .heatmap-day` width/height `48px` → `44px`, font-size `.85rem` → `.8rem` | self | ✅ Done |
| 6 | JS: `expandHeatmap()` — remove `card` guard, change `max-width:420px` → `400px` | self | ✅ Done |
| 7 | JS: `expandPie()` — remove `height:auto;aspect-ratio:500/440;` from canvas style | self | ✅ Done |
| 8 | UI polish pass | ui-agent | ✅ Done |
| 9 | Final verification (`node --check`, grep checks) | self + tester | ✅ Passed |

---

## Detailed Changes

### Issue 1 & 4 — Expand animation + Centered modal

**CSS — `.chart-expand-overlay` (line 897-906)**
Changed from:
```css
top: 0 !important; left: 0 !important;
width: 100% !important; height: 100% !important;
```
To:
```css
inset: 0 !important;
```
This is functionally identical but cleaner. The rule still has `display: flex; align-items: center; justify-content: center;` for centered modal layout with dimmed backdrop.

**CSS — `.chart-expand-inner canvas` (line 922-928)**
Changed `max-height: 60vh` → `55vh` to prevent oversized canvas in the modal.

**CSS — Animation keyframes (lines 960-967)**
Already present: `expandFadeIn` (0.25s ease) for backdrop, `expandSlideIn` (0.25s ease) for inner card slide-up with scale.

**JS — `expandHeatmap()` (line 3960)**
- Removed `const card = document.getElementById('heatmapCard'); if (!card) return;` guard (not needed; `statsMonth` is always set).
- Changed inner wrapper from `max-width:420px` → `max-width:400px` to match centered modal spec.

**JS — `expandPie()` (line 3980)**
- Removed `height:auto;aspect-ratio:500/440;` from canvas style attribute. Canvas now uses `width="500" height="440"` with CSS `width:100%;max-width:460px;margin:0 auto;display:block`.
- The `drawPieChart` function uses `canvas.parentElement.getBoundingClientRect()` for sizing, which works correctly when the parent is `.chart-expand-inner` (max-width:560px).

### Issue 2 — Heatmap cells too large in expanded view

**CSS — `.chart-expand-inner .heatmap-grid` (line 949-952)**
Changed `max-width: 400px` → `max-width: 380px` to better constrain the grid inside the modal.

**CSS — `.chart-expand-inner .heatmap-day` (line 953-957)**
Changed from `width:48px; height:48px; font-size:0.85rem` → `width:44px; height:44px; font-size:0.8rem` to make cells appropriately sized inside the 380px grid.

### Issue 3 — Expanded pie chart sizing

The canvas element in `expandPie()` has `width:500`/`height:440` with `max-width:460px`. The `drawPieChart` function sizes itself based on `canvas.parentElement.getBoundingClientRect()`. The parent is `.chart-expand-inner` with `max-width:560px`, which provides sufficient room. No additional changes needed beyond the aspect-ratio fix above.

### Issue 5 — Pie click drill-down closes overlay

The `expandPie()` function already had the click override logic (setTimeout chain: draw → wait 700ms → wrap onclick to call `shrinkChart()` after drill). This was already implemented correctly; we only cleaned up the canvas style.

---

## Verification Results

| Check | Result |
|---|---|
| `node --check` on extracted JS (baseline) | ✅ Passed |
| `node --check` after CSS changes | ✅ Passed |
| `node --check` after JS changes | ✅ Passed |
| `node --check` after ui-agent polish | ✅ Passed |
| `.chart-expand-overlay` uses `inset: 0` (not `100vw`/`100vh`) | ✅ Verified |
| `@keyframes expandFadeIn` present | ✅ Verified |
| `@keyframes expandSlideIn` present | ✅ Verified |
| `shrinkChart()` called on overlay backdrop click | ✅ Verified (both expandHeatmap and expandPie) |

---

## Key Decisions

1. **Kept `_expandedChart` variable** — The spec's code snippets omitted it for brevity, but it's used by `shrinkChart()` to reset state. We preserved it.
2. **Removed `card` guard from `expandHeatmap()`** — Following spec; the guard was unnecessary since `renderCalendarHeatmap(statsMonth)` works regardless of heatmapCard's DOM presence.
3. **No `setupPieClick` override needed** — The existing click-wrap pattern (setTimeout chain) already implements Issue 5 correctly.
