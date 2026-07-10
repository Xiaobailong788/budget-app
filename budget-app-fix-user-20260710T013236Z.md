# User Log — Budget App Fixes

## What was fixed

### Issue 1: Pie chart click drill-down in expanded view
**Problem:** Clicking a pie slice in the expanded (modal) view to drill into subcategories didn't work reliably. The old code created a brand new canvas in the modal and tried to wrap the click handler after a fixed 700ms timeout, creating a fragile timing race.

**Fix:** Instead of creating a new canvas, the code now **moves the original pie chart canvas** into the modal. This means the existing click handlers are preserved. A new `window._expandedPieActive` flag is set when the pie is expanded. In the click handler, when a slice is clicked in expanded mode, the modal automatically closes after drilling down (or just closes if clicking a leaf category that has no subcategories).

Three changes were made:
1. **`drawPieChart()` click handler** — Added checks for `window._expandedPieActive` to auto-close the overlay
2. **`expandPie()` function** — Rewritten to move the original canvas into the modal instead of creating a new one
3. **`shrinkChart()` function** — Updated to move the canvas back to its original location and clear the expanded flag

### Issue 2: Enlarge the modal
**Problem:** The expanded chart modal was limited to `560px` wide, which felt cramped on larger screens.

**Fix:** 
- Modal inner container widened from `560px` to `720px`
- Canvas max-height increased from `55vh` to `65vh` for more vertical room
- Heatmap grid and day cells enlarged to fit the bigger modal

## Agents involved
- **Team Leader (self)**: All changes executed directly via file editing tools
- **Tester (self)**: Verification via `node` syntax checking and grep pattern validation

## Verification
- JavaScript syntax passes validation
- All old `expandPieChart` references removed (none remain)
- New `_expandedPieActive` flag properly set, checked, and cleared
- New `_pieOriginalParent` variable properly tracked and cleaned up
- CSS dimensions updated as specified
