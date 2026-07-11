let selectedCategoryId = null;

function openCategoryPicker(context) {
  const cats = DataStore.getRootCategories();
  const billCats = DataStore.getBillCategories();
  let html = '<div class="modal-title">选择分类</div><div style="max-height:50vh;overflow-y:auto">';

  // Regular categories section
  html += '<div class="text-sm font-semibold" style="padding:6px 4px;color:var(--text-secondary)">日常消费</div>';
  html += buildCategoryTreePicker(cats, 0, context);

  // Bill categories section
  if (billCats.length > 0) {
    html += '<div class="picker-section-header">📋 月账单</div>';
    billCats.forEach(cat => {
      html += `
        <div class="picker-bill-item"
             onclick="selectCategory('${cat.id}','${context}')">
          <span style="width:10px;height:10px;border-radius:50%;background:${cat.color};display:inline-block"></span>
          <span>${escHtml(cat.icon)}</span>
          <span>${escHtml(cat.name)}</span>
          <span class="picker-bill-badge">📋 账单</span>
        </div>
      `;
    });
  }

  html += '</div><div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">取消</button></div>';
  showModal(html);
}

function buildCategoryTreePicker(cats, depth, context) {
  let html = '';
  cats.forEach(cat => {
    const children = DataStore.getChildren(cat.id);
    const indent = depth * 20;
    html += `
      <div style="padding:8px 12px;cursor:pointer;border-radius:var(--radius-sm);transition:var(--transition-fast);display:flex;align-items:center;gap:8px;margin-left:${indent}px"
           onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''"
           onclick="selectCategory('${cat.id}','${context}')">
        <span style="width:10px;height:10px;border-radius:50%;background:${cat.color};display:inline-block"></span>
        <span>${escHtml(cat.icon)}</span>
        <span>${escHtml(cat.name)}</span>
      </div>
    `;
    if (children.length) {
      html += buildCategoryTreePicker(children, depth + 1, context);
    }
  });
  return html;
}

function selectCategory(catId, context) {
  const cat = DataStore.getCategory(catId);
  if (!cat) return;
  selectedCategoryId = catId;
  const displayAdd = document.getElementById('addCategoryDisplay');
  const displayEdit = document.getElementById('editCategoryDisplay');
  const html = `<span style="width:10px;height:10px;border-radius:50%;background:${cat.color};display:inline-block;vertical-align:middle"></span> ${escHtml(cat.icon)} ${escHtml(cat.name)}`;
  if (displayAdd) {
    displayAdd.innerHTML = html;
    displayAdd.style.color = 'var(--text-primary)';
  }
  if (displayEdit) {
    displayEdit.innerHTML = html;
    displayEdit.style.color = 'var(--text-primary)';
  }
  closeModal();
}

