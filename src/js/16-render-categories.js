/* ============================================================
   RENDER: Categories Page
   ============================================================ */
// Track expanded category nodes
let expandedCategories = new Set();

function renderCategories() {
  const el = document.getElementById('page-categories');
  const roots = DataStore.getRootCategories();

  el.innerHTML = `
    <div class="mb-16">
      <button class="btn btn-primary btn-lg btn-block" onclick="addRootCategory()">➕ 添加根分类</button>
    </div>
    <p class="text-sm text-secondary mb-8" style="line-height:1.5">
      ${DataStore.getCategories().length} 个分类 · 点击 ▶ 展开查看子分类 · 预算输入框始终可见 · 
      <span class="text-xs text-muted" style="cursor:pointer" onclick="document.querySelectorAll('.cat-item').forEach(function(e){expandedCategories.add(e.dataset.id);});renderCategories()">展开全部</span>
      · 
      <span class="text-xs text-muted" style="cursor:pointer" onclick="expandedCategories.clear();renderCategories()">折叠全部</span>
    </p>
    <div id="categoryTree">${buildCategoryTreeHTML(roots, 0)}</div>
  `;
}

function getBudgetMonth() {
  const now = new Date();
  return getMonthKey(now.toISOString());
}

function buildCategoryTreeHTML(cats, depth) {
  let html = '';
  const currentMonth = getBudgetMonth();
  cats.forEach(cat => {
    const children = DataStore.getChildren(cat.id);
    const hasChildren = children.length > 0;
    const expanded = expandedCategories.has(cat.id);
    const catBudget = DataStore.getCategoryBudget(cat.id, currentMonth);
    const budgetVal = catBudget.value || '';
    const budgetType = catBudget.type || 'fixed';
    
    html += `<div class="cat-item" data-id="${cat.id}">`;
    
    // === HEADER (always visible) ===
    html += `<div class="cat-header">`;
    if (hasChildren) {
      html += `<span class="cat-arrow${expanded ? ' expanded' : ''}" onclick="event.stopPropagation();toggleCatItem(this)" title="展开/折叠">▶</span>`;
    } else {
      html += `<span class="cat-arrow-empty"></span>`;
    }
    html += `<span class="cat-dot" style="background:${cat.color}"></span>`;
    html += `<span class="cat-icon">${escHtml(cat.icon)}</span>`;
    html += `<span class="cat-name">${escHtml(cat.name)}</span>`;
    // Action icons (visible on every row)
    html += `<span class="cat-action-icons">`;
    html += `<span class="cat-action-icon" onclick="event.stopPropagation();addChildCategory('${cat.id}')" title="添加子分类">➕</span>`;
    html += `<span class="cat-action-icon" onclick="event.stopPropagation();editCategory('${cat.id}')" title="编辑分类">⚙️</span>`;
    html += `</span>`;
    // Budget input group
    html += `<div class="cat-budget">`;
    html += `<input type="number" class="budget-input" value="${budgetVal}" placeholder="0" onchange="saveCategoryBudget('${cat.id}','${currentMonth}',this.value,'${budgetType}')" min="0" step="0.01">`;
    html += `<button class="budget-toggle" onclick="var inp=this.parentElement.querySelector('.budget-input');var nxt=this.innerText==='RM'?'%':'RM';this.innerText=nxt;saveCategoryBudget('${cat.id}','${currentMonth}',inp.value,nxt==='%'?'percent':'fixed')">${budgetType === 'percent' ? '%' : 'RM'}</button>`;
    html += `<span class="budget-unit">/月</span>`;
    html += `</div>`;
    html += `</div>`; // end header

    // === BODY (collapsible) ===
    html += `<div class="cat-body" style="max-height:${expanded ? '2000px' : '0'}">`;
    html += `<div class="cat-body-inner">`;

    // Breadcrumb for deep nesting (depth >= 4)
    if (depth >= 4) {
      html += buildBreadcrumb(cat);
    }

    // Children (recursive)
    if (hasChildren) {
      html += `<div class="cat-children">${buildCategoryTreeHTML(children, depth + 1)}</div>`;
    }
    
    html += `</div>`; // end cat-body-inner
    html += `</div>`; // end cat-body
    html += `</div>`; // end cat-item
  });
  return html;
}

function saveCategoryBudget(catId, month, value, type) {
  const amount = parseFloat(value) || 0;
  const budgetType = type || 'fixed';
  
  // Validate: child budget cannot exceed parent's budget
  const cat = DataStore.getCategory(catId);
  if (cat && cat.parentId && amount > 0) {
    const parentBudget = DataStore.getCategoryBudget(cat.parentId, month).value || 0;
    // Sum of all children's budgets (including this new one)
    const siblings = DataStore.getChildren(cat.parentId);
    let siblingSum = 0;
    siblings.forEach(s => {
      if (s.id === catId) return; // exclude current
      const sb = DataStore.getCategoryBudget(s.id, month).value || 0;
      siblingSum += sb;
    });
    if (siblingSum + amount > parentBudget) {
      showToast('⚠️ 子项预算总和 (' + formatMoney(siblingSum + amount) + ') 超过了父级预算 (' + formatMoney(parentBudget) + ')，未保存', 'error');
      return;
    }
  }
  
  DataStore.setCategoryBudget(catId, month, amount, budgetType);
  showToast(amount > 0 ? '✅ 预算已保存' : 'ℹ️ 预算已清除');
}

/* ===== CATEGORY MERGE ===== */
function mergeCategory(sourceId) {
  const sourceCat = DataStore.getCategory(sourceId);
  if (!sourceCat) return;
  _mergeSourceId = sourceId;
  _mergeTargetId = null;
  const children = DataStore.getChildren(sourceId);
  const descendants = DataStore.getDescendantIds(sourceId);
  const allCats = DataStore.getCategories().filter(c => !descendants.includes(c.id) && c.id !== sourceId);

  let html = `
    <div class="modal-title">合并分类</div>
    <p class="text-sm text-secondary mb-8">
      将 <strong>${sourceCat.icon} ${escHtml(sourceCat.name)}</strong> 合并到其他分类。
      <br>所有记录将重新归类到目标分类。
    </p>
    <div class="input-group">
      <label class="input-label">选择目标分类</label>
      <div style="max-height:30vh;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);padding:4px">`;
  html += buildMergeTargetTree(allCats.filter(c => !c.parentId), 0, sourceId, descendants);
  html += `</div></div>`;

  // If source has children, ask what to do with them
  if (children.length > 0) {
    html += `
      <div class="input-group">
        <label class="input-label">处理子分类 (${children.length} 个)</label>
        <div class="flex flex-col gap-4" style="padding:4px 0">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 8px;border-radius:var(--radius-sm);background:var(--bg)">
            <input type="radio" name="mergeChildren" value="move" checked>
            <span class="text-sm">将子分类移至目标分类下</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 8px;border-radius:var(--radius-sm);background:var(--bg)">
            <input type="radio" name="mergeChildren" value="delete">
            <span class="text-sm" style="color:var(--danger)">删除所有子分类</span>
          </label>
        </div>
      </div>`;
  }

  html += `
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="confirmMergeCategory()" id="mergeConfirmBtn" disabled>请先选择目标分类</button>
    </div>`;
  showModal(html);
}

function buildMergeTargetTree(cats, depth, sourceId, excludeIds) {
  let html = '';
  cats.forEach(cat => {
    if (excludeIds && excludeIds.includes(cat.id)) return;
    if (cat.id === sourceId) return;
    const children = DataStore.getChildren(cat.id);
    const indent = depth * 20;
    html += `
      <div style="padding:6px 10px;cursor:pointer;border-radius:var(--radius-sm);transition:var(--transition-fast);display:flex;align-items:center;gap:6px;margin-left:${indent}px"
           onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''"
           onclick="selectMergeTarget('${cat.id}','${escHtml(cat.icon)} ${escHtml(cat.name)}')">
        <span style="width:10px;height:10px;border-radius:50%;background:${cat.color};display:inline-block"></span>
        <span>${escHtml(cat.icon)}</span>
        <span class="text-sm">${escHtml(cat.name)}</span>
      </div>`;
    if (children.length) {
      html += buildMergeTargetTree(children, depth + 1, sourceId, excludeIds);
    }
  });
  return html;
}

let _mergeSourceId = null;
let _mergeTargetId = null;

function selectMergeTarget(catId, displayName) {
  _mergeTargetId = catId;
  const btn = document.getElementById('mergeConfirmBtn');
  if (btn) {
    btn.disabled = false;
    btn.textContent = `合并到 ${displayName}`;
  }
}

function confirmMergeCategory() {
  const sourceId = _mergeSourceId;
  const targetId = _mergeTargetId;
  if (!sourceId || !targetId) {
    showToast('请选择目标分类', 'error');
    return;
  }
  if (sourceId === targetId) {
    showToast('不能合并到自身', 'error');
    return;
  }

  // Determine children handling
  const children = DataStore.getChildren(sourceId);
  let handleChildren = 'move';
  const childrenRadios = document.querySelectorAll('input[name="mergeChildren"]');
  if (childrenRadios.length > 0) {
    childrenRadios.forEach(r => { if (r.checked) handleChildren = r.value; });
  }

  const sourceCat = DataStore.getCategory(sourceId);
  const targetCat = DataStore.getCategory(targetId);
  if (!sourceCat || !targetCat) { showToast('分类不存在', 'error'); return; }

  // Get all descendant IDs of source (including source)
  const descIds = DataStore.getDescendantIds(sourceId);

  // Update all records belonging to source or its descendants
  const records = DataStore.getRecords();
  let updatedCount = 0;
  records.forEach(r => {
    if (descIds.includes(r.categoryId)) {
      r.categoryId = targetId;
      r.updatedAt = new Date().toISOString();
      updatedCount++;
    }
  });

  // Handle children categories
  if (handleChildren === 'move') {
    children.forEach(child => {
      child.parentId = targetId;
    });
  } else if (handleChildren === 'delete') {
    // Delete all children (and recursively their children)
    const deleteRecursive = (id) => {
      const grandChildren = DataStore.getChildren(id);
      grandChildren.forEach(gc => deleteRecursive(gc.id));
      DataStore._data.categories = DataStore._data.categories.filter(c => c.id !== id);
    };
    children.forEach(child => deleteRecursive(child.id));
  }

  // Delete the source category itself
  DataStore._data.categories = DataStore._data.categories.filter(c => c.id !== sourceId);
  DataStore.save();

  closeModal();
  _mergeSourceId = null;
  _mergeTargetId = null;
  showToast(`✅ 合并完成，已更新 ${updatedCount} 条记录`);
  renderCategories();
}

function toggleCatItem(arrowEl) {
  const item = arrowEl.closest('.cat-item');
  if (!item) return;
  const body = item.querySelector('.cat-body');
  const catId = item.dataset.id;
  if (!body || !catId) return;
  const isExpanded = expandedCategories.has(catId);
  
  if (isExpanded) {
    // Collapse: lock current height instantly, then animate to 0
    body.style.transition = 'none';
    body.style.maxHeight = body.scrollHeight + 'px';
    expandedCategories.delete(catId);
    arrowEl.classList.remove('expanded');
    requestAnimationFrame(() => {
      body.style.transition = '';
      body.style.maxHeight = '0';
    });
  } else {
    // Expand
    expandedCategories.add(catId);
    arrowEl.classList.add('expanded');
    requestAnimationFrame(() => {
      const h = body.scrollHeight;
      body.style.maxHeight = h + 'px';
      // After animation, free constraint so nested expansions work
      setTimeout(() => {
        if (expandedCategories.has(catId)) {
          body.style.maxHeight = 'none';
        }
      }, 400);
    });
  }
}

function addRootCategory() {
  showModal(`
    <div class="modal-title">添加根分类</div>
    <div class="input-group">
      <label class="input-label">名称</label>
      <input type="text" id="newCatName" class="input-field" placeholder="分类名称">
    </div>
    <div class="input-group">
      <label class="input-label">图标 (Emoji)</label>
      <input type="text" id="newCatIcon" class="input-field" value="📁" placeholder="输入 emoji">
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="confirmAddRootCategory()">添加</button>
    </div>
  `);
}

function confirmAddRootCategory() {
  const name = document.getElementById('newCatName').value.trim();
  const icon = document.getElementById('newCatIcon').value.trim();
  if (!name) { showToast('请输入分类名称', 'error'); return; }
  DataStore.addCategory({ name, icon: icon || '📁', parentId: null, sortOrder: DataStore.getRootCategories().length });
  closeModal();
  showToast('✅ 分类已添加');
  renderCategories();
}

function addChildCategory(parentId) {
  showModal(`
    <div class="modal-title">添加子分类</div>
    <div class="input-group">
      <label class="input-label">名称</label>
      <input type="text" id="newChildName" class="input-field" placeholder="子分类名称">
    </div>
    <div class="input-group">
      <label class="input-label">图标 (Emoji)</label>
      <input type="text" id="newChildIcon" class="input-field" value="📁" placeholder="输入 emoji">
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="confirmAddChildCategory('${parentId}')">添加</button>
    </div>
  `);
}

function confirmAddChildCategory(parentId) {
  const name = document.getElementById('newChildName').value.trim();
  const icon = document.getElementById('newChildIcon').value.trim();
  if (!name) { showToast('请输入分类名称', 'error'); return; }
  const children = DataStore.getChildren(parentId);
  DataStore.addCategory({ name, icon: icon || '📁', parentId, sortOrder: children.length });
  closeModal();
  showToast('✅ 子分类已添加');
  renderCategories();
}

function renameCategory(id) {
  const cat = DataStore.getCategory(id);
  if (!cat) return;
  showModal(`
    <div class="modal-title">重命名</div>
    <div class="input-group">
      <label class="input-label">名称</label>
      <input type="text" id="renameInput" class="input-field" value="${escHtml(cat.name)}">
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="confirmRenameCategory('${id}')">保存</button>
    </div>
  `);
}

function confirmRenameCategory(id) {
  const name = document.getElementById('renameInput').value.trim();
  if (!name) { showToast('名称不能为空', 'error'); return; }
  DataStore.updateCategory(id, { name });
  closeModal();
  showToast('✅ 名称已更新');
  renderCategories();
}

const EMOJI_GRID = ['🍜','🥐','🍱','🍽️','☕','🚗','⛽','🅿️','🚇','🚕','🛒','🧴','👕','📱','🎮','🎬','🎯','⚽','🏠','🏢','💡','📶','💊','🏥','📚','📖','🎓','📦','🍕','🍔','🍟','🌮','🥗','🍣','🍤','🥟','🍦','🍰','🥤','🧋','🍵','🏪','💈','✈️','🎒','👟','🧢','💄','👜','⌚','🎧','📷','💻','🖥️','🖨️','🎨','🔧','🔨','🧰','🎁','💎','🔑','🧸','🎈','🌸','🌻','🔥','⭐','🌈','☀️','🌙','💧','❄️','🍀','🎵','🎶','🎉','🎊','🕹️','📌','📍','✉️','📝','🗂️','🔒','🔓','🔔','🚀','🛸','⚡','💫'];

function changeCategoryIcon(id) {
  const cat = DataStore.getCategory(id);
  if (!cat) return;
  let html = `<div class="modal-title">选择图标 — ${escHtml(cat.name)}</div><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;max-height:50vh;overflow-y:auto">`;
  EMOJI_GRID.forEach(emoji => {
    html += `<div style="font-size:1.5rem;padding:8px;text-align:center;cursor:pointer;border-radius:var(--radius-sm);transition:var(--transition-fast)" 
                  onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''"
                  onclick="confirmChangeIcon('${id}','${emoji}')">${emoji}</div>`;
  });
  html += '</div><div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">取消</button></div>';
  showModal(html);
}

function confirmChangeIcon(id, icon) {
  DataStore.updateCategory(id, { icon });
  closeModal();
  showToast('✅ 图标已更新');
  renderCategories();
}

function changeCategoryColor(id) {
  const cat = DataStore.getCategory(id);
  if (!cat) return;
  let html = `<div class="modal-title">选择颜色 — ${escHtml(cat.name)}</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:12px">`;
  COLORS.forEach(c => {
    const isSelected = c === cat.color;
    html += `<div style="width:36px;height:36px;border-radius:50%;background:${c};cursor:pointer;border:${isSelected ? '3px solid #000' : '2px solid transparent'};transition:var(--transition-fast)"
                  onclick="confirmChangeColor('${id}','${c}')"></div>`;
  });
  html += '</div>';
  html += `<div class="input-group"><label class="input-label">自定义颜色 (HEX)</label><input type="text" id="customColorInput" class="input-field" placeholder="#RRGGBB" value="${cat.color}"></div>`;
  html += `<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="confirmCustomColor('${id}')">应用</button></div>`;
  showModal(html);
}

function confirmChangeColor(id, color) {
  DataStore.updateCategory(id, { color });
  closeModal();
  showToast('✅ 颜色已更新');
  renderCategories();
}

function confirmCustomColor(id) {
  const color = document.getElementById('customColorInput').value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) { showToast('请输入有效HEX颜色', 'error'); return; }
  DataStore.updateCategory(id, { color });
  closeModal();
  showToast('✅ 颜色已更新');
  renderCategories();
}

function moveCategory(id) {
  const cat = DataStore.getCategory(id);
  if (!cat) return;
  const cats = DataStore.getRootCategories();
  const descendants = DataStore.getDescendantIds(id);

  let html = `<div class="modal-title">移动分类 — ${escHtml(cat.icon)} ${escHtml(cat.name)}</div>
    <p class="text-sm text-secondary mb-8">选择目标父分类（留空则移至根级别）</p>
    <div style="max-height:50vh;overflow-y:auto">`;
  html += buildMoveTree(cats, 0, descendants, id);
  html += '</div>';
  html += `<div class="modal-actions">
    <button class="btn btn-ghost" onclick="closeModal()">取消</button>
    <button class="btn btn-ghost" onclick="confirmMoveCategory('${id}','')">移至根级别</button>
  </div>`;
  showModal(html);
}

function buildMoveTree(cats, depth, excludeIds, movingId) {
  let html = '';
  cats.forEach(cat => {
    if (excludeIds.includes(cat.id)) return;
    const children = DataStore.getChildren(cat.id);
    const indent = depth * 20;
    html += `
      <div style="padding:8px 12px;cursor:pointer;border-radius:var(--radius-sm);transition:var(--transition-fast);display:flex;align-items:center;gap:8px;margin-left:${indent}px"
           onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''"
           onclick="confirmMoveCategory('${movingId}','${cat.id}')">
        <span style="width:10px;height:10px;border-radius:50%;background:${cat.color};display:inline-block"></span>
        <span>${escHtml(cat.icon)}</span>
        <span>${escHtml(cat.name)}</span>
      </div>
    `;
    if (children.length) {
      html += buildMoveTree(children, depth + 1, excludeIds, movingId);
    }
  });
  return html;
}

function confirmMoveCategory(id, newParentId) {
  // Prevent circular reference
  if (newParentId && DataStore.getDescendantIds(id).includes(newParentId)) {
    showToast('不能将分类移到自己或子分类下', 'error');
    return;
  }
  DataStore.updateCategory(id, { parentId: newParentId || null });
  closeModal();
  showToast('✅ 分类已移动');
  renderCategories();
}

function deleteCategoryConfirm(id) {
  const cat = DataStore.getCategory(id);
  if (!cat) return;
  const children = DataStore.getChildren(id);

  if (children.length) {
    showModal(`
      <div class="modal-title">删除分类</div>
      <p style="color:var(--text-secondary);margin-bottom:12px">分类 "${escHtml(cat.icon)} ${escHtml(cat.name)}" 有 ${children.length} 个子分类，如何处理？</p>
      <div class="flex flex-col gap-8 mb-16">
        <button class="btn btn-outline btn-block" onclick="confirmDeleteCategory('${id}','deleteChildren')">🗑️ 同时删除所有子分类</button>
        <button class="btn btn-outline btn-block" onclick="showMoveBeforeDelete('${id}')">📦 将子分类移至上级</button>
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">取消</button></div>
    `);
  } else {
    showModal(`
      <div class="modal-title">确认删除</div>
      <p style="color:var(--text-secondary);margin-bottom:16px">确定要删除分类 "${escHtml(cat.icon)} ${escHtml(cat.name)}" 吗？</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn btn-danger" onclick="confirmDeleteCategory('${id}','delete')">删除</button>
      </div>
    `);
  }
}

function showMoveBeforeDelete(id) {
  const cat = DataStore.getCategory(id);
  const parentId = cat.parentId;
  showModal(`
    <div class="modal-title">移动子分类</div>
    <p class="text-sm text-secondary mb-8">子分类将被移至：${parentId ? DataStore.getCategory(parentId).icon + ' ' + DataStore.getCategory(parentId).name : '根级别'}</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="deleteCategoryConfirm('${id}')">返回</button>
      <button class="btn btn-danger" onclick="confirmDeleteCategory('${id}','moveToParent')">确认删除</button>
    </div>
  `);
}

function confirmDeleteCategory(id, mode) {
  if (mode === 'delete' || mode === 'deleteChildren') {
    DataStore.deleteCategory(id, { deleteChildren: true });
  } else if (mode === 'moveToParent') {
    const cat = DataStore.getCategory(id);
    DataStore.deleteCategory(id, { moveToParent: cat.parentId });
  }
  closeModal();
  showToast('✅ 分类已删除');
  renderCategories();
}

function buildBreadcrumb(cat) {
  // Walk up the parent chain to collect ancestors
  const ancestors = [];
  let current = cat;
  let guard = 0;
  while (current && current.parentId && guard < 20) {
    current = DataStore.getCategory(current.parentId);
    if (current) ancestors.unshift(current);
    guard++;
  }
  
  let html = '<div class="cat-breadcrumb">';
  
  if (ancestors.length <= 2) {
    // Show all ancestors
    ancestors.forEach(a => {
      html += `<span class="crumb-item" onclick="expandAndScrollTo('${a.id}')">${escHtml(a.icon)} ${escHtml(a.name)}</span>`;
      html += '<span class="crumb-sep">/</span>';
    });
  } else {
    // First ancestor
    html += `<span class="crumb-item" onclick="expandAndScrollTo('${ancestors[0].id}')">${escHtml(ancestors[0].icon)} ${escHtml(ancestors[0].name)}</span>`;
    html += '<span class="crumb-sep">/</span>';
    // Ellipsis for hidden levels
    html += '<span class="crumb-item" style="cursor:default;color:var(--text-muted)">⋯</span>';
    html += '<span class="crumb-sep">/</span>';
    // Last ancestor (the direct parent)
    html += `<span class="crumb-item" onclick="expandAndScrollTo('${ancestors[ancestors.length - 1].id}')">${escHtml(ancestors[ancestors.length - 1].icon)} ${escHtml(ancestors[ancestors.length - 1].name)}</span>`;
    html += '<span class="crumb-sep">/</span>';
  }

  // Current category
  html += `<span class="crumb-current">${escHtml(cat.icon)} ${escHtml(cat.name)}</span>`;
  html += '</div>';

  return html;
}

function expandAndScrollTo(catId) {
  // Expand all ancestors so this category becomes visible
  const cat = DataStore.getCategory(catId);
  if (!cat) return;
  
  // Walk up and expand each ancestor
  let current = cat;
  let guard = 0;
  while (current && current.parentId && guard < 30) {
    const parent = DataStore.getCategory(current.parentId);
    if (parent) {
      expandedCategories.add(parent.id);
      current = parent;
    } else break;
    guard++;
  }
  
  // Re-render the tree
  renderCategories();
  
  // Scroll to the target element (after DOM update)
  setTimeout(() => {
    const el = document.querySelector(`.cat-item[data-id="${catId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
}

function editCategory(catId) {
  const cat = DataStore.getCategory(catId);
  if (!cat) return;
  
  const breadcrumbHtml = buildBreadcrumb(cat);
  
  let html = `<div class="modal-title">编辑分类</div>`;
  html += breadcrumbHtml;
  
  // Name
  html += `<div class="input-group">
    <label class="input-label">名称</label>
    <input type="text" id="editCatName" class="input-field" value="${escHtml(cat.name)}">
  </div>`;
  
  // Icon — opens existing changeCategoryIcon modal
  html += `<div class="input-group">
    <label class="input-label">图标</label>
    <div style="display:flex;align-items:center;gap:8px;padding:4px 0">
      <span style="font-size:1.5rem">${escHtml(cat.icon)}</span>
      <button class="btn btn-outline btn-sm" onclick="closeModal();setTimeout(function(){changeCategoryIcon('${catId}')},100)">🎨 更改图标</button>
    </div>
  </div>`;
  
  // Color — opens existing changeCategoryColor modal
  html += `<div class="input-group">
    <label class="input-label">颜色</label>
    <div style="display:flex;align-items:center;gap:8px;padding:4px 0">
      <span style="width:22px;height:22px;border-radius:50%;background:${cat.color};display:inline-block;border:1px solid var(--border)"></span>
      <button class="btn btn-outline btn-sm" onclick="closeModal();setTimeout(function(){changeCategoryColor('${catId}')},100)">🌈 更改颜色</button>
    </div>
  </div>`;
  
  // Operations
  html += `<div style="border-top:1px solid var(--border);padding-top:12px;margin-top:12px">
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-outline btn-sm" onclick="closeModal();moveCategory('${catId}')">📦 移动到…</button>
      <button class="btn btn-outline btn-sm" onclick="closeModal();mergeCategory('${catId}')">🔀 合并到…</button>
      <button class="btn btn-danger btn-sm" onclick="closeModal();deleteCategoryConfirm('${catId}')">🗑️ 删除</button>
    </div>
  </div>`;
  
  // Actions
  html += `<div class="modal-actions">
    <button class="btn btn-ghost" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="saveCategoryEdit('${catId}')">保存</button>
  </div>`;
  
  showModal(html);
}

function saveCategoryEdit(catId) {
  const name = document.getElementById('editCatName').value.trim();
  if (name) DataStore.updateCategory(catId, { name });
  closeModal();
  showToast('✅ 名称已更新');
  renderCategories();
}
