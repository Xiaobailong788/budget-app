# Technical Log — Budget App Security Fixes

**Date**: 2026-07-09 22:46 UTC  
**File**: `/home/xbl2602/budget-app.html` (4171 lines after edits)  
**Task**: Apply three security fixes (CSP, HTML sanitizer, file permissions)

---

## Assignment Plan

| Unit | Assigned | Why |
|---|---|---|
| Read file structure and identify injection points | Self | read/glob/grep tools |
| Fix 1: Add CSP meta tag after line 5 | Self | edit tool |
| Fix 2: Add escHtml function after COLORS block | Self | edit tool |
| Fix 2: Sanitize r.note at all innerHTML points | Self | edit tool |
| Fix 2: Sanitize record.note at all innerHTML points | Self | edit tool |
| Fix 2: Sanitize cat.name at all innerHTML points | Self | edit tool |
| Fix 2: Sanitize cat.icon at all innerHTML points | Self | edit tool |
| Fix 2: Sanitize recordsFilter.keyword at innerHTML point | Self | edit tool |
| Fix 3: chmod 600 file | Self | bash |
| Verify all changes | Self | grep |
| Write logs | Self | write tool |

---

## Changes Applied

### Fix 1 — Content Security Policy Meta Tag

**File**: budget-app.html  
**Line**: 6 (inserted after original line 5)  
**Change**: Added:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
```
**Purpose**: Restricts resource loading to prevent XSS and data injection.

---

### Fix 2 — HTML Sanitizer Function

**File**: budget-app.html  
**Line**: 762-764 (inserted after the `COLORS` array)  
**Change**: Added:
```javascript
function escHtml(str) {
  return String(str).replace(/[<>]/g, '');
}
```
**Purpose**: Strips `<` and `>` characters from user-supplied text before it enters innerHTML, preventing HTML tag injection.

---

### Fix 2 — Sanitized Injection Points

All user-text template literal expressions inside HTML backtick strings were wrapped with `escHtml(...)`. The following changes were made:

#### Notes (`r.note`)
| Original Line | Expression | Change |
|---|---|---|
| 2410 | `${r.note ? '📝 ' + r.note : ''}` | `r.note` → `escHtml(r.note)` |
| 2429 | `'...' + r.note + '...'` | `r.note` → `escHtml(r.note)` |

#### Notes (`record.note`)
| Original Line | Expression | Change |
|---|---|---|
| 2533 | `${record.note \|\| '无备注'}` | → `${escHtml(record.note \|\| '无备注')}` |
| 2577 | `value="${record.note \|\| ''}"` | → `value="${escHtml(record.note \|\| '')}"` |

#### Category names (`cat.name`)
| Line | Expression | Change |
|---|---|---|
| 1912 | `${item.cat.name}` | → `${escHtml(item.cat.name)}` |
| 2146 | `${cat.name}` | → `${escHtml(cat.name)}` |
| 2162 | `${cat.name}` | → `${escHtml(cat.name)}` |
| 2351 | `${cat.name}` | → `${escHtml(cat.name)}` |
| 2409 | `${cat ? cat.icon + cat.name : ...}` | → `${cat ? escHtml(cat.icon) + escHtml(cat.name) : ...}` |
| 2427 | `${cat ? cat.name : ...}` | → `${cat ? escHtml(cat.name) : ...}` |
| 2568 | `${cat.icon + ' ' + cat.name}` | → `${escHtml(cat.icon) + ' ' + escHtml(cat.name)}` |
| 2658 | `${cat.name}` | → `${escHtml(cat.name)}` |
| 2759 | `value="${cat.name}"` | → `value="${escHtml(cat.name)}"` |
| 2782 | `选择图标 — ${cat.name}` | → `选择图标 — ${escHtml(cat.name)}` |
| 2802 | `选择颜色 — ${cat.name}` | → `选择颜色 — ${escHtml(cat.name)}` |
| 2836 | `移动分类 — ${cat.icon} ${cat.name}` | → `${escHtml(cat.icon)} ${escHtml(cat.name)}` |
| 2860 | `${cat.name}` | → `${escHtml(cat.name)}` |
| 2890 | `分类 "${cat.icon} ${cat.name}"` | → `${escHtml(cat.icon)} ${escHtml(cat.name)}` |
| 2900 | `"${cat.icon} ${cat.name}"` | → `${escHtml(cat.icon)} ${escHtml(cat.name)}` |

#### Category icons (`cat.icon`)
| Line | Expression | Change |
|---|---|---|
| 1911 | `${item.cat.icon}` | → `${escHtml(item.cat.icon)}` |
| 2145 | `${cat.icon}` | → `${escHtml(cat.icon)}` |
| 2162 | `${cat.icon}` | → `${escHtml(cat.icon)}` |
| 2246 | `${filterCat.icon + ' ' + filterCat.name}` | → `${escHtml(filterCat.icon) + ' ' + escHtml(filterCat.name)}` |
| 2350 | `${cat.icon}` | → `${escHtml(cat.icon)}` |
| 2409 | (combined with cat.name) | see above |
| 2424 | `${cat ? cat.icon : ...}` | → `${cat ? escHtml(cat.icon) : ...}` |
| 2568 | (combined with cat.name) | see above |
| 2657 | `${cat.icon}` | → `${escHtml(cat.icon)}` |
| 2836 | (combined with cat.name) | see above |
| 2859 | `${cat.icon}` | → `${escHtml(cat.icon)}` |
| 2890, 2900 | (combined with cat.name) | see above |

#### Search keywords (`recordsFilter.keyword`)
| Line | Expression | Change |
|---|---|---|
| 2241 | `${recordsFilter.keyword}` | → `${escHtml(recordsFilter.keyword)}` |

#### NOT modified (safe reasons):
- **CSV export (line 997)**: `${cat.icon}${cat.name}` in CSV string, not innerHTML; uses CSV-specific quoting (`.replace(/"/g, '""')`)
- **XML export (lines 1126-1130)**: Already uses existing `esc()` function
- **Canvas `fillText` calls (lines 3380, 3395, 3734)**: Canvas rendering, not innerHTML
- **`textContent` assignments (line 2368)**: `textContent` is inherently safe (no HTML parsing)
- **`getCategoryFullPath` (line 1721)**: Returns path string, not used in innerHTML
- **`cat.color` references**: Hex color values, not user text

---

### Fix 3 — File Permissions

**Command executed**: `chmod 600 /home/xbl2602/budget-app.html`  
**Result**: `-rw-------` (owner read/write only)  
**Purpose**: Prevent unauthorized read/write access to the file.

---

## Verification Results

Grep searches confirmed:
- **No bare `${r.note}`** remains in the file (all wrapped in `escHtml`)
- **No bare `${record.note}`** remains (all wrapped in `escHtml`)
- **No bare `${cat.name}`** remains in HTML innerHTML context (only CSV export line 997)
- **No bare `${cat.icon}`** remains in HTML innerHTML context (only CSV export line 997)
- **`${recordsFilter.keyword}`** is sanitized at line 2241; line 2318 reads the value (safe)
- **CSP meta tag** present at line 6
- **escHtml function** present at lines 762-764
- **File permissions**: 600 (confirmed via `ls -la`)

---

## Issues Encountered

None. All edits applied cleanly. The file already had an `esc()` function for XML export (line 1031) so the new `escHtml()` follows the same pattern with simpler character filtering for HTML context.
