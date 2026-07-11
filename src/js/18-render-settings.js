/* ============================================================
   RENDER: Settings Page
   ============================================================ */
(function() {
'use strict';
function renderSettings() {
  const el = document.getElementById('page-settings');
  const now = new Date();
  const month = getMonthKey(now.toISOString());
  const budgets = DataStore.getBudgets();
  const savings = DataStore.getSavingsTarget();

  el.innerHTML = `
    <!-- Theme Toggle -->
    <div class="card mb-16">
      <div class="card-title">显示设置</div>
      <div class="flex items-center justify-between">
        <span class="text-sm">🌙 深色模式</span>
        <button class="btn ${document.documentElement.getAttribute('data-theme') === 'dark' ? 'btn-primary' : 'btn-outline'}" onclick="toggleTheme()" id="themeToggleBtn">
          ${document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️ 浅色模式' : '🌙 深色模式'}
        </button>
      </div>
    </div>

    <!-- Budget → moved to Bills Center -->
    <div class="card mb-16 settings-nav-card" onclick="openBillsCenter()">
      <div class="flex items-center gap-8">
        <span class="settings-nav-icon">📋</span>
        <div>
          <div class="settings-nav-title">月账单中心</div>
          <div class="settings-nav-subtitle">管理月收入、账单分类及金额</div>
        </div>
        <span class="settings-nav-arrow">前往 →</span>
      </div>
      <div class="settings-nav-hint">💡 月收入与账单管理已移至概览页「月账单中心」</div>
    </div>

    <!-- Savings Target -->
    <div class="card mb-16">
      <div class="card-title">储蓄目标</div>
      <div class="input-group">
        <label class="input-label">类型</label>
        <div class="flex gap-8">
          <label class="btn btn-sm ${savings.type === 'fixed' ? 'btn-primary' : 'btn-outline'}" onclick="setSavingsType('fixed')">
            <input type="radio" name="savingsType" value="fixed" ${savings.type === 'fixed' ? 'checked' : ''} style="display:none"> 固定金额
          </label>
          <label class="btn btn-sm ${savings.type === 'percent' ? 'btn-primary' : 'btn-outline'}" onclick="setSavingsType('percent')">
            <input type="radio" name="savingsType" value="percent" ${savings.type === 'percent' ? 'checked' : ''} style="display:none"> 百分比
          </label>
          <label class="btn btn-sm ${savings.type === 'both' ? 'btn-primary' : 'btn-outline'}" onclick="setSavingsType('both')">
            <input type="radio" name="savingsType" value="both" ${savings.type === 'both' ? 'checked' : ''} style="display:none"> 两者
          </label>
        </div>
      </div>
      <div id="savingsFixedInput" class="input-group" style="display:${savings.type === 'fixed' || savings.type === 'both' ? 'block' : 'none'}">
        <label class="input-label">固定金额 (RM)</label>
        <input type="number" id="savingsFixedAmount" class="input-field" value="${savings.fixedAmount || ''}" placeholder="0">
      </div>
      <div id="savingsPercentInput" class="input-group" style="display:${savings.type === 'percent' || savings.type === 'both' ? 'block' : 'none'}">
        <label class="input-label">预算百分比 (%)</label>
        <input type="number" id="savingsPercent" class="input-field" value="${savings.percent || ''}" placeholder="0" min="0" max="100">
      </div>
      <div class="input-group percent-base-group ${savings.type === 'percent' || savings.type === 'both' ? 'visible' : ''}" id="percentBaseGroup">
        <label class="input-label">百分比基准</label>
        <div class="flex gap-8">
          <label class="btn btn-sm ${(DataStore.getPercentBase()) === 'gross' ? 'btn-primary' : 'btn-outline'}" onclick="setPercentBase('gross')">纯收入</label>
          <label class="btn btn-sm ${(DataStore.getPercentBase()) === 'net' ? 'btn-primary' : 'btn-outline'}" onclick="setPercentBase('net')">净收入(除去账单)</label>
        </div>
      </div>
      <button class="btn btn-primary" onclick="saveSavingsTarget()">💾 保存目标</button>
    </div>

    <!-- Data Management -->
    <div class="card mb-16">
      <div class="card-title">数据管理</div>
      <div class="flex flex-col gap-8">
        <button class="btn btn-outline btn-block" onclick="exportJSON()">📥 导出 JSON</button>
        <button class="btn btn-outline btn-block" onclick="document.getElementById('importJSONInput').click()">📤 导入 JSON</button>
        <input type="file" id="importJSONInput" accept=".json" style="display:none" onchange="importJSON(event)">
        <button class="btn btn-outline btn-block" onclick="exportToExcel()">📥 导出 Excel (可修改·含公式)</button>
        <button class="btn btn-outline btn-block" onclick="exportCSV()">📊 导出 CSV</button>
        <button class="btn btn-primary btn-block" onclick="if(window.LANSync)LANSync.open();else showToast('lan-sync.js 未加载','error')">📶 局域网同步</button>
        <button class="btn btn-danger btn-block" onclick="clearAllData()">🗑️ 清除所有数据</button>
      </div>
    </div>

    <!-- Data Sync Verification -->
    <div class="card mb-16" style="border-left:4px solid #818CF8">
      <div class="card-title" style="display:flex;align-items:center;gap:8px">
        <span>🔄 数据同步校验</span>
        <button class="btn btn-sm btn-primary" onclick="refreshSyncFingerprint()" style="font-size:0.72rem">刷新</button>
      </div>
      <div id="syncFingerprint">
        <div class="text-sm text-secondary" style="margin-bottom:8px">
          对比两台设备的数据指纹，确认同步是否成功。
        </div>
        <div class="flex items-center gap-8" style="padding:6px 10px;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:6px">
          <span class="text-xs text-muted" style="min-width:60px">指纹码</span>
          <span id="syncFingerprintCode" style="font-family:monospace;font-size:1.3rem;font-weight:700;letter-spacing:2px;color:var(--primary)">------</span>
        </div>
        <div class="flex items-center gap-8" style="padding:6px 10px;background:var(--bg);border-radius:var(--radius-sm)">
          <span class="text-xs text-muted" style="min-width:60px">最新变更</span>
          <span id="syncFingerprintTime" class="text-sm" style="font-weight:500">—</span>
        </div>
      </div>
      <div class="text-xs text-muted" style="margin-top:6px;line-height:1.4">
        💡 两台设备数据完全一致时指纹码相同。导入/导出/同步后请点击「刷新」重新计算。
      </div>
    </div>
    <div style="text-align:center;padding:16px 0 8px;font-size:0.65rem;color:var(--text-muted);opacity:0.5">v2.2.0</div>
  `;
  setTimeout(refreshSyncFingerprint, 100);
}

function setSavingsType(type) {
  const savings = DataStore.getSavingsTarget();
  savings.type = type;
  DataStore.setSavingsTarget(savings);
  renderSettings();
}

function saveBudget() {
  const month = document.getElementById('budgetMonth').value;
  const amount = parseFloat(document.getElementById('budgetAmount').value) || 0;
  DataStore.setBudget(month, amount);
  showToast('✅ 预算已保存');
}

function saveSavingsTarget() {
  const type = DataStore.getSavingsTarget().type;
  const fixedAmount = parseFloat(document.getElementById('savingsFixedAmount')?.value) || 0;
  const percent = parseFloat(document.getElementById('savingsPercent')?.value) || 0;
  DataStore.setSavingsTarget({ type, fixedAmount, percent });
  showToast('✅ 储蓄目标已保存');
}

function setPercentBase(base) {
  DataStore.setPercentBase(base);
  renderSettings();
  showToast('✅ 百分比基准已切换为' + (base === 'gross' ? '纯收入' : '净收入'));
}

function exportJSON() {
  const data = DataStore.exportJSON();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'budget-data-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ JSON 已导出');
}

let importJSONContent = null;

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    importJSONContent = e.target.result;
    showModal(`
      <div class="modal-title">导入数据</div>
      <p class="text-sm text-secondary mb-16">选择导入方式：</p>
      <div class="flex flex-col gap-8">
        <button class="btn btn-primary btn-block" onclick="confirmImportJSON('replace')">🔄 替换当前数据</button>
        <button class="btn btn-outline btn-block" onclick="confirmImportJSON('merge')">🔀 合并到当前数据</button>
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">取消</button></div>
    `);
  };
  reader.readAsText(file);
  event.target.value = '';
}

function confirmImportJSON(mode) {
  if (!importJSONContent) { showToast('没有可导入的数据', 'error'); return; }
  const success = DataStore.importJSON(importJSONContent, mode);
  importJSONContent = null;
  closeModal();
  if (success) {
    showToast('✅ 数据导入成功');
    renderSettings();
  } else {
    showToast('❌ 导入失败，文件格式无效', 'error');
  }
}

function exportCSV() {
  const csv = DataStore.exportCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'budget-records-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ CSV 已导出');
}

function clearAllData() {
  showModal(`
    <div class="modal-title">⚠️ 清除所有数据</div>
    <p style="color:var(--danger);margin-bottom:16px">此操作不可恢复！所有记录、分类、预算设置将被删除。</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-danger" onclick="confirmClearAll()">确认清除</button>
    </div>
  `);
}

function confirmClearAll() {
  DataStore.clearAll();
  closeModal();
  showToast('✅ 所有数据已清除');
  navigateTo('overview');
}

function refreshSyncFingerprint() {
  const codeEl = document.getElementById('syncFingerprintCode');
  const timeEl = document.getElementById('syncFingerprintTime');
  if (codeEl) codeEl.textContent = DataStore.getDataHash();
  if (timeEl) {
    const t = DataStore.getLastUpdateTime();
    timeEl.textContent = t ? t.replace('T', ' ').substring(0, 19) : '无数据';
  }
}

  // === EXPORTS ===
  window.renderSettings = renderSettings;
  window.setSavingsType = setSavingsType;
  window.saveBudget = saveBudget;
  window.saveSavingsTarget = saveSavingsTarget;
  window.setPercentBase = setPercentBase;
  window.exportJSON = exportJSON;
  window.importJSON = importJSON;
  window.confirmImportJSON = confirmImportJSON;
  window.exportCSV = exportCSV;
  window.clearAllData = clearAllData;
  window.confirmClearAll = confirmClearAll;
  window.refreshSyncFingerprint = refreshSyncFingerprint;
})();
