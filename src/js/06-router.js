/* ============================================================
   ROUTER
   ============================================================ */
(function() {
'use strict';

const pageTitles = {
  overview: '总览',
  add: '记账',
  records: '流水',
  categories: '分类',
  stats: '统计',
  report: '月度报告',
  whatif: '假设分析',
  settings: '设置'
};

let currentTab = 'overview';

function navigateTo(tab) {
  if (tab === currentTab && tab !== 'add') {
    // Force re-render if page is empty (e.g., on initial load)
    const pageEl = document.getElementById('page-' + tab);
    if (pageEl && pageEl.innerHTML.trim()) return;
  }
  const prevTab = currentTab;
  currentTab = tab;
  window.currentTab = tab;

  // Update page sections
  document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
  const pageEl = document.getElementById('page-' + tab);
  if (pageEl) pageEl.classList.add('active');

  // Update nav items
  document.querySelectorAll('.nav-item, .sidebar-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });

  // Update title
  document.getElementById('pageTitle').textContent = pageTitles[tab] || tab;

  // Trigger render
  if (tab === 'overview') renderOverview();
  else if (tab === 'add') renderAddPage();
  else if (tab === 'records') renderRecords();
  else if (tab === 'categories') renderCategories();
  else if (tab === 'stats') renderStats();
  else if (tab === 'report') renderReport();
  else if (tab === 'whatif') renderWhatIf();
  else if (tab === 'settings') renderSettings();
}

// Navigation event listeners
document.querySelectorAll('.nav-item, .sidebar-item').forEach(el => {
  el.addEventListener('click', () => {
    const tab = el.dataset.tab;
    if (tab) {
      location.hash = '#' + tab;
    }
  });
});

  // === EXPORTS ===
  window.pageTitles = pageTitles;
  window.currentTab = currentTab;
  window.navigateTo = navigateTo;
})();
