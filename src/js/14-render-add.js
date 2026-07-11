/* ============================================================
   RENDER: Add Record Page
   ============================================================ */
(function() {
'use strict';
function renderAddPage() {
  selectedCategoryId = null;
  const el = document.getElementById('page-add');
  el.innerHTML = `
    <div class="card">
      <div class="card-title mb-16">新增记录</div>
      <form id="addForm" onsubmit="submitRecord(event)">
        <div class="input-group">
          <label class="input-label">金额 (RM)</label>
          <div style="position:relative">
            <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-weight:700;color:var(--primary);font-size:1.1rem">RM</span>
            <input type="text" id="addAmount" class="input-field" placeholder="0.00" style="padding-left:44px;font-size:1.2rem;font-weight:700" inputmode="decimal" autocomplete="off">
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">分类</label>
          <button type="button" class="input-field" id="addCategoryBtn" style="text-align:left;cursor:pointer" onclick="openCategoryPicker('add')">
            <span id="addCategoryDisplay" style="color:var(--text-muted)">请选择分类</span>
          </button>
        </div>

        <div class="input-group">
          <label class="input-label">日期时间</label>
          <input type="datetime-local" id="addDateTime" class="input-field">
        </div>

        <div class="input-group">
          <label class="input-label">备注</label>
          <input type="text" id="addNote" class="input-field" placeholder="例如：Nasi Lemak" maxlength="200">
        </div>

        <div class="input-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 0">
            <input type="checkbox" id="addExcludeAvg" style="width:18px;height:18px;cursor:pointer">
            <span class="text-sm text-secondary">📌 不计日均（一次性大额消费）</span>
          </label>
        </div>

        <button type="submit" class="btn btn-primary btn-lg btn-block" id="submitBtn" style="font-size:1.05rem">
          ✅ 保存记录
        </button>
      </form>
    </div>
  `;

  // Set default date/time
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  document.getElementById('addDateTime').value = local.toISOString().slice(0, 16);

  // Amount input formatting
  const amountInput = document.getElementById('addAmount');
  amountInput.addEventListener('input', function() {
    let val = this.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    if (parts[1] && parts[1].length > 2) val = parts[0] + '.' + parts[1].slice(0, 2);
    this.value = val;
  });
}
function submitRecord(e) {
  e.preventDefault();
  const amountEl = document.getElementById('addAmount');
  const amount = parseFloat(amountEl.value);
  const categoryId = selectedCategoryId;
  const date = document.getElementById('addDateTime').value;
  const note = document.getElementById('addNote').value.trim();
  const form = document.getElementById('addForm');

  function shakeForm() {
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 500);
  }

  if (!amount || amount <= 0) {
    showToast('请输入有效金额', 'error');
    amountEl.focus();
    shakeForm();
    return;
  }
  if (!categoryId) {
    showToast('请选择分类', 'error');
    shakeForm();
    return;
  }

  const record = {
    amount,
    categoryId,
    date: date || new Date().toISOString().slice(0, 16),
    note,
    excludeFromAvg: document.getElementById('addExcludeAvg').checked,
    createdAt: new Date().toISOString()
  };

  DataStore.addRecord(record);
  showToast('✅ 记录已保存');

  // Reset form
  amountEl.value = '';
  selectedCategoryId = null;
  document.getElementById('addCategoryDisplay').textContent = '请选择分类';
  document.getElementById('addCategoryDisplay').style.color = 'var(--text-muted)';
  document.getElementById('addNote').value = '';
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  document.getElementById('addDateTime').value = local.toISOString().slice(0, 16);
}

  // === EXPORTS ===
  window.renderAddPage = renderAddPage;
  window.submitRecord = submitRecord;
})();

