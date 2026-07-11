/* ===== THEME-AWARE COLORS ===== */
(function() {
'use strict';

function getThemeColors() {
  const s = getComputedStyle(document.documentElement);
  return {
    text: s.getPropertyValue('--text-primary').trim() || '#1E293B',
    textSecondary: s.getPropertyValue('--text-secondary').trim() || '#64748B',
    textMuted: s.getPropertyValue('--text-muted').trim() || '#94A3B8',
    border: s.getPropertyValue('--border').trim() || '#E2E8F0',
    bg: s.getPropertyValue('--bg').trim() || '#F8FAFC',
    cardBg: s.getPropertyValue('--card-bg').trim() || '#FFFFFF',
  };
}

  // === EXPORTS ===
  window.getThemeColors = getThemeColors;
})();
