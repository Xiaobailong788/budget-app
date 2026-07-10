# Technical Log — Budget App Pie Chart Fix

**File:** `/home/xbl2602/budget-app.html`
**Timestamp:** 2026-07-10 01:32:36 UTC
**Changes:** Issue 1 (pie click drill-down in expanded view) + Issue 2 (enlarge modal)

---

## Assignment Plan

| Unit | Assigned | Description |
|------|----------|-------------|
| CSS changes (Issue 2) | self | Update `.chart-expand-inner` max-width, canvas max-height, heatmap constraints |
| Change A — canvas.onclick in `drawPieChart()` | self | Add `window._expandedPieActive` checks to auto-close overlay on drill / leaf click |
| Change B — `expandPie()` rewrite | self | Replace fragile timing-dependent logic with canvas-move approach |
| Change C — `shrinkChart()` update | self | Add canvas move-back + flag clearing |
| Verification | self (bash/node) | `node` syntax check + grep pattern verification |

---

## Unit 1: CSS Changes (Issue 2)

### Changes made
1. **`.chart-expand-inner`** (line 921): `max-width: 560px` → `max-width: 720px`
2. **`.chart-expand-inner canvas`** (line 932): `max-height: 55vh` → `max-height: 65vh`
3. **`.chart-expand-inner .heatmap-grid`** (line 960): `max-width: 380px` → `max-width: 480px`
4. **`.chart-expand-inner .heatmap-day`** (lines 964-966): width/height `44px` → `54px`, font-size `0.8rem` → `0.85rem`

### Verification
- Grep confirmed `max-width: 720px` present at line 921
- Grep confirmed `max-height: 65vh` present at line 932
- Grep confirmed heatmap-day width `54px` present at line 964

---

## Unit 2: Change A — `canvas.onclick` in `drawPieChart()`

### Location
Lines 4766-4781 (inside `setupInteractions()` within `drawPieChart()`)

### Changes
- Inside the `if (children && children.length > 0)` block, added after `updateDrillCharts()`:
  ```javascript
  if (window._expandedPieActive) {
    shrinkChart();
  }
  ```
- Added new `else if (window._expandedPieActive)` branch to close overlay when a leaf category is clicked in expanded view.

### Rationale
No timing dependency — the handler is set up directly by `setupInteractions()` after animation completes, and it checks the `window._expandedPieActive` flag synchronously.

---

## Unit 3: Change B — `expandPie()` rewrite

### Location
Lines 3990-4032

### Old approach (removed)
- Created a **new** `<canvas id="expandPieChart">` in the modal HTML
- Called `drawPieChart('expandPieChart', ...)` which drew on the new canvas
- Waited 700ms after the 50ms draw timeout to wrap `onclick` — fragile timing dependency

### New approach
- Added global `let _pieOriginalParent = null;` to track the canvas's original DOM parent
- `expandPie()` sets `window._expandedPieActive = true`
- Creates modal with a **placeholder** `<canvas id="pieChart">` in the innerHTML
- **Moves** the original `#pieChart` canvas from the stats page into the modal using `placeholder.replaceWith(pieCanvas)`
- Calls `drawPieChart('pieChart', ...)` at modal size — this triggers `setupInteractions()` which sets `canvas.onclick` with the updated handler (Change A)
- No second timeout, no handler wrapping

### Benefits
- The original canvas already has all its event handlers from `renderStats()`
- The redraw via `drawPieChart()` replaces the handler with one that already includes the `_expandedPieActive` checks
- No timing race conditions

---

## Unit 4: Change C — `shrinkChart()` update

### Location
Lines 4034-4048

### Changes
- Before removing the overlay, looks up `#pieChart` canvas and `_pieOriginalParent` and moves the canvas back: `_pieOriginalParent.appendChild(pieCanvas)`
- Clears `_pieOriginalParent = null` after move
- Clears `window._expandedPieActive = false`

---

## Verification Results

| Check | Result |
|-------|--------|
| `node` syntax check on extracted JS | PASS |
| `_expandedPieActive` references | 5 found (set, comment, cleared, 2× checked in onclick) |
| `_pieOriginalParent` references | 5 found (declared, set, 2× used + cleared in shrinkChart) |
| `max-width: 720px` in `.chart-expand-inner` | PASS (line 921) |
| `max-height: 65vh` in `.chart-expand-inner canvas` | PASS (line 932) |
| No `expandPieChart` references remain | PASS (0 found) |

---

## Summary of all edits

1. **Line 921**: `max-width` 560px → 720px
2. **Line 932**: `max-height` 55vh → 65vh
3. **Lines 959-967**: Heatmap constraints enlarged
4. **Lines 3990-4032**: `expandPie()` rewritten, `_pieOriginalParent` added
5. **Lines 4034-4048**: `shrinkChart()` canvas move-back + flag clearing
6. **Lines 4766-4781**: `canvas.onclick` expanded-pie-aware handling
