/* ============================================================
   MONTH ROLLOVER DETECTION
   ============================================================ */
(function() {
'use strict';
function checkMonthRollover() {
  const now = new Date();
  const currentMonth = getMonthKey(now.toISOString());
  const lastMonth = DataStore.getLastActiveMonth();

  if (!lastMonth) {
    DataStore.setLastActiveMonth(currentMonth);
    return;
  }

  if (lastMonth !== currentMonth) {
    const lastAmounts = DataStore.getBillAmounts(lastMonth);
    const currentAmounts = DataStore.getBillAmounts(currentMonth);

    if (Object.keys(currentAmounts).length === 0 && Object.keys(lastAmounts).length > 0) {
      DataStore._data.billAmounts[currentMonth] = JSON.parse(JSON.stringify(lastAmounts));

      const lastIncome = DataStore.getMonthlyIncome(lastMonth);
      if (lastIncome > 0 && DataStore.getMonthlyIncome(currentMonth) === 0) {
        DataStore.setMonthlyIncome(currentMonth, lastIncome);
      }

      DataStore.save();
      setTimeout(() => showBillRolloverReminder(lastMonth, currentMonth), 500);
    }

    DataStore.setLastActiveMonth(currentMonth);
  }
}

function showBillRolloverReminder(lastMonth, currentMonth) {
  const lastAmounts = DataStore.getBillAmounts(currentMonth);
  const total = Object.values(lastAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const year = currentMonth.split('-')[0];
  const mon = currentMonth.split('-')[1];
  showModal(`
    <div class="modal-title">📋 新月份已开始</div>
    <div style="padding:8px 0 16px">
      <p style="margin-bottom:12px">已沿用上月账单设置 <strong>${formatMoney(total)}</strong></p>
      <div class="flex flex-col gap-8">
        <button class="btn btn-primary" onclick="closeModal();openBillsCenter()">🔧 查看并调整</button>
        <button class="btn btn-ghost" onclick="closeModal();if(currentTab==='overview')renderOverview();else if(currentTab==='stats')renderStats();">✅ 保持不变</button>
      </div>
    </div>
  `);
}

  // === EXPORTS ===
  window.checkMonthRollover = checkMonthRollover;
  window.showBillRolloverReminder = showBillRolloverReminder;
})();
