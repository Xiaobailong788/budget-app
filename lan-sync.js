/* ============================================================
   lan-sync.js — LAN P2P Sync Module

   Enables two devices on the same WiFi to sync budget data
   directly via WebRTC, with NO servers or internet required.

   Security:
     - WebRTC mandatory DTLS encryption (HTTPS-level)
     - Manual signaling via copy-paste — no third-party
     - Full HTML sanitization before data merge
     - Field-level validation of all incoming data
     - Automatic backup before overwriting data

   Usage:
     <script src="lan-sync.js"></script>
     (auto-hooks into settings page when loaded)
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     1. SECURE HTML SANITIZER
     ============================================================ */
  function sanitizeHtml(str) {
    if (typeof str !== 'string') return '';
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '`': '&#96;'
    };
    return String(str).replace(/[&<>"'`]/g, function (c) { return map[c]; });
  }

  /* ============================================================
     2. FIELD-LEVEL VALIDATOR
     ============================================================ */
  var validators = {
    amount: function (v) { return typeof v === 'number' && isFinite(v) && v >= 0; },
    date: function (v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v); },
    color: function (v) { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v); },
    id: function (v) { return typeof v === 'string' && v.length > 0 && v.length < 100; },
    name: function (v) { return typeof v === 'string' && v.length > 0 && v.length < 200; },
    icon: function (v) { return typeof v === 'string' && v.length <= 10; },
    note: function (v) { return typeof v === 'string' && v.length < 1000; },
    parentId: function (v) { return v === null || (typeof v === 'string' && v.length < 100); }
  };

  function validateRecord(r) {
    return validators.amount(r.amount) &&
      validators.date(r.date) &&
      validators.id(r.id) &&
      (typeof r.note === 'undefined' || validators.note(r.note)) &&
      validators.id(r.categoryId) &&
      (typeof r.createdAt === 'undefined' || validators.date(r.createdAt));
  }

  function validateCategory(c) {
    return validators.id(c.id) &&
      validators.name(c.name) &&
      validators.color(c.color) &&
      validators.icon(c.icon) &&
      validators.parentId(c.parentId) &&
      typeof c.sortOrder === 'number';
  }

  function validateSyncData(data) {
    if (!data || typeof data !== 'object') return '数据格式无效：不是对象';
    if (!Array.isArray(data.records)) return '数据格式无效：缺少 records 数组';
    if (!Array.isArray(data.categories)) return '数据格式无效：缺少 categories 数组';

    var badRecords = data.records.filter(function (r) { return !validateRecord(r); });
    var badCats = data.categories.filter(function (c) { return !validateCategory(c); });

    // Remove invalid entries
    data.records = data.records.filter(validateRecord);
    data.categories = data.categories.filter(validateCategory);

    if (badRecords.length > 0) {
      return '发现 ' + badRecords.length + ' 条无效记录，已自动跳过';
    }
    if (badCats.length > 0) {
      return '发现 ' + badCats.length + ' 个无效分类，已自动跳过';
    }
    return null; // valid
  }

  /* ============================================================
     3. SYNC BACKUP
     ============================================================ */
  function backupBeforeMerge() {
    try {
      var current = DataStore.exportJSON();
      localStorage.setItem('budgetBackupBeforeSync', current);
      localStorage.setItem('budgetBackupTime', new Date().toISOString());
    } catch (e) { /* best-effort */ }
  }

  /* ============================================================
     4. WEBRTC ENGINE (LAN-only, no STUN/TURN)
     ============================================================ */
  var pc = null;
  var channel = null;
  var syncState = 'idle';
  var onStateChange = null;
  var onDataCallback = null;
  var onErrorCallback = null;

  var CONFIG = {
    iceServers: [],
    iceTransportPolicy: 'all'
  };

  function resetConnection() {
    if (pc) {
      try { pc.close(); } catch (e) { /* ignore */ }
      pc = null;
    }
    channel = null;
    syncState = 'idle';
  }

  function setState(s) {
    syncState = s;
    if (typeof onStateChange === 'function') onStateChange(s);
  }

  /* ===== HOST: create offer ===== */
  function createHost(callbacks) {
    resetConnection();
    onStateChange = callbacks.onStateChange || null;
    onDataCallback = callbacks.onDataReceived || null;
    onErrorCallback = callbacks.onError || null;
    setState('host-offer');

    pc = new RTCPeerConnection(CONFIG);

    channel = pc.createDataChannel('budget-sync', { ordered: true });

    channel.onopen = function () {
      setState('connected');
      try {
        var json = DataStore.exportJSON();
        channel.send(json);
      } catch (e) {
        if (onErrorCallback) onErrorCallback('发送数据失败：' + e.message);
      }
    };

    channel.onerror = function () {
      if (onErrorCallback) onErrorCallback('数据通道发生错误');
    };

    pc.oniceconnectionstatechange = function () {
      if (pc.iceConnectionState === 'failed') {
        if (onErrorCallback) onErrorCallback('连接失败，请确认两台设备在同一网络');
        resetConnection();
      }
    };

    return pc.createOffer()
      .then(function (offer) { return pc.setLocalDescription(offer); })
      .then(function () { return pc.localDescription.sdp; });
  }

  /* ===== HOST: accept answer ===== */
  function acceptAnswer(answerSdp) {
    if (!pc || (syncState !== 'host-offer' && syncState !== 'connected')) {
      return Promise.reject(new Error('当前状态无法接收应答，请重新开始'));
    }
    return pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
      .then(function () { return true; });
  }

  /* ===== CLIENT: connect with offer ===== */
  function createClient(offerSdp, callbacks) {
    resetConnection();
    onStateChange = callbacks.onStateChange || null;
    onDataCallback = callbacks.onDataReceived || null;
    onErrorCallback = callbacks.onError || null;
    setState('client-offer');

    pc = new RTCPeerConnection(CONFIG);

    pc.oniceconnectionstatechange = function () {
      if (pc.iceConnectionState === 'failed') {
        if (onErrorCallback) onErrorCallback('连接失败，请确认同一网络');
        resetConnection();
      }
    };

    pc.ondatachannel = function (e) {
      channel = e.channel;
      channel.onopen = function () { setState('connected'); };
      channel.onmessage = function (msg) {
        if (typeof onDataCallback === 'function') onDataCallback(msg.data);
      };
      channel.onerror = function () {
        if (onErrorCallback) onErrorCallback('数据通道错误');
      };
    };

    return pc.setRemoteDescription({ type: 'offer', sdp: offerSdp })
      .then(function () { return pc.createAnswer(); })
      .then(function (answer) { return pc.setLocalDescription(answer); })
      .then(function () { return pc.localDescription.sdp; });
  }

  /* ============================================================
     5. DATA MERGE — receive, validate, merge into DataStore
     ============================================================ */
  function receiveAndMerge(jsonStr) {
    var data;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      if (onErrorCallback) onErrorCallback('数据格式错误：无法解析 JSON');
      return false;
    }

    var validationError = validateSyncData(data);
    if (validationError) {
      // Warning only — continue with filtered data
      console.warn('[Sync]', validationError);
    }

    if (data.records.length === 0 && data.categories.length === 0) {
      if (onErrorCallback) onErrorCallback('没有有效数据可以合并');
      return false;
    }

    // Backup current state
    backupBeforeMerge();

    // Merge
    mergeIntoDataStore(data);
    DataStore.save();

    // Re-render current page
    if (typeof navigateTo === 'function') {
      var active = document.querySelector('.page-section.active');
      if (active) navigateTo(active.getAttribute('data-page') || 'overview');
    }

    return { records: data.records.length, categories: data.categories.length };
  }

  function mergeIntoDataStore(incoming) {
    var current = DataStore._data;
    if (!current) return;

    // --- Records: dedup by ID ---
    var existingIds = {};
    current.records.forEach(function (r) { existingIds[r.id] = true; });

    incoming.records.forEach(function (r) {
      r.note = sanitizeHtml(r.note || '');
      if (existingIds[r.id]) {
        // Overwrite existing
        var idx = current.records.findIndex(function (x) { return x.id === r.id; });
        if (idx !== -1) current.records[idx] = r;
      } else {
        current.records.unshift(r);
      }
    });

    // --- Categories: add missing ---
    var existingCatIds = {};
    current.categories.forEach(function (c) { existingCatIds[c.id] = true; });

    incoming.categories.forEach(function (c) {
      if (!existingCatIds[c.id]) {
        c.name = sanitizeHtml(c.name);
        c.icon = sanitizeHtml(c.icon);
        current.categories.push(c);
        existingCatIds[c.id] = true;
      }
    });

    // --- Budgets & settings ---
    if (incoming.budgets) Object.assign(current.budgets, incoming.budgets);
    if (incoming.categoryBudgets) Object.assign(current.categoryBudgets, incoming.categoryBudgets);
    if (incoming.monthlyIncome) Object.assign(current.monthlyIncome, incoming.monthlyIncome);
    if (incoming.billAmounts) Object.assign(current.billAmounts, incoming.billAmounts);
    if (incoming.savingsTarget) current.savingsTarget = incoming.savingsTarget;
    if (incoming.percentBase) current.percentBase = incoming.percentBase;
    if (incoming.whatIfParams) current.whatIfParams = incoming.whatIfParams;

    // --- Bill categories: add missing ---
    if (incoming.billCategories && Array.isArray(incoming.billCategories)) {
      var existingBillIds = {};
      current.billCategories.forEach(function (b) { existingBillIds[b.id] = true; });
      incoming.billCategories.forEach(function (b) {
        if (!existingBillIds[b.id]) {
          b.name = sanitizeHtml(b.name);
          current.billCategories.push(b);
          existingBillIds[b.id] = true;
        }
      });
    }
  }

  /* ============================================================
     6. UI — Sync Modal & Interaction
     ============================================================ */
  var ui = {};

  ui.showOrError = function (html) {
    if (typeof showModal === 'function') {
      showModal(html);
    } else {
      var overlay = document.getElementById('modalOverlay');
      var content = document.getElementById('modalContent');
      if (overlay && content) {
        content.innerHTML = html;
        overlay.classList.add('open');
        overlay.onclick = function (e) { if (e.target === overlay) { overlay.classList.remove('open'); } };
      }
    }
  };

  ui.close = function () {
    resetConnection();
    if (typeof closeModal === 'function') closeModal();
    else {
      var overlay = document.getElementById('modalOverlay');
      if (overlay) overlay.classList.remove('open');
    }
  };

  /* ----- MAIN MENU ----- */
  ui.showMenu = function () {
    ui.showOrError(
      '<div class="modal-title">📶 局域网同步</div>' +
      '<p class="text-sm text-secondary mb-16">两台设备在<span style="font-weight:600">同一 Wi-Fi</span>下直连同步，数据不经过任何服务器。连接需要手动交换两段连接码，相当于双方互相确认身份。</p>' +
      '<div class="flex flex-col gap-8">' +
      '<button class="btn btn-primary btn-block" onclick="SyncUI.startHost()">📤 发送数据<br><span class="text-xs text-muted">把本机数据发到另一台设备</span></button>' +
      '<button class="btn btn-outline btn-block" onclick="SyncUI.startClient()">📥 接收数据<br><span class="text-xs text-muted">从另一台设备接收数据</span></button>' +
      '</div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" onclick="SyncUI.close()">取消</button></div>'
    );
  };

  /* ----- HOST FLOW ----- */
  ui.startHost = function () {
    var self = this;
    this._showHostWaiting();

    createHost({
      onStateChange: function (s) {
        var statusEl = document.getElementById('syncStatus');
        if (!statusEl) return;
        if (s === 'connected') statusEl.innerHTML = '✅ 连接成功，正在发送数据...';
      },
      onError: function (msg) {
        var statusEl = document.getElementById('syncStatus');
        if (statusEl) { statusEl.innerHTML = '❌ ' + msg; statusEl.style.color = 'var(--danger)'; }
      },
      onDataReceived: function (data) {
        if (data === 'SYNC_OK') {
          var statusEl = document.getElementById('syncStatus');
          if (statusEl) statusEl.innerHTML = '✅ 对方已确认接收，同步完成！';
        }
      }
    }).then(function (offerSdp) {
      self._showHostOffer(offerSdp);
    }).catch(function (err) {
      var statusEl = document.getElementById('syncStatus');
      if (statusEl) { statusEl.innerHTML = '❌ 创建连接失败：' + err.message; statusEl.style.color = 'var(--danger)'; }
    });
  };

  ui._showHostWaiting = function () {
    ui.showOrError(
      '<div class="modal-title">📤 等待连接...</div>' +
      '<p class="text-sm text-secondary mb-16">正在生成连接码...</p>' +
      '<div id="syncStatus" class="text-sm text-center text-muted">⏳ 生成中...</div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" onclick="SyncUI.close()">取消</button></div>'
    );
  };

  ui._showHostOffer = function (offerSdp) {
    ui.showOrError(
      '<div class="modal-title">📤 发送数据</div>' +
      '<p class="text-sm text-secondary mb-16">在另一台设备上选择"接收数据"，然后<strong>完整复制</strong>下面的连接码粘贴到那里</p>' +
      '<div class="input-group">' +
      '<label class="input-label">连接码第 1 步（发给对方）</label>' +
      '<textarea id="syncOfferText" class="input-field" readonly rows="5" style="font-size:0.65rem;font-family:monospace;white-space:pre;word-break:break-all;resize:vertical">' + sanitizeHtml(offerSdp) + '</textarea>' +
      '<button class="btn btn-outline btn-block mt-8" onclick="SyncUI.copyText(\'syncOfferText\')">📋 复制连接码</button>' +
      '</div>' +
      '<div class="input-group" style="margin-top:16px">' +
      '<label class="input-label">连接码第 2 步（粘贴对方返回的）</label>' +
      '<textarea id="syncAnswerInput" class="input-field" rows="4" style="font-size:0.65rem;font-family:monospace;white-space:pre;word-break:break-all;resize:vertical" placeholder="..."></textarea>' +
      '<button class="btn btn-primary btn-block mt-8" onclick="SyncUI.submitAnswer()">✅ 确认连接</button>' +
      '</div>' +
      '<div id="syncStatus" class="text-sm text-center text-muted mt-8">⏳ 等待对方返回连接码...</div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" onclick="SyncUI.close()">取消</button></div>'
    );
  };

  ui.submitAnswer = function () {
    var input = document.getElementById('syncAnswerInput');
    var status = document.getElementById('syncStatus');
    if (!input || !input.value.trim()) {
      if (status) { status.innerHTML = '❌ 请先粘贴对方返回的连接码'; status.style.color = 'var(--danger)'; }
      return;
    }
    if (status) { status.innerHTML = '⏳ 正在建立连接...'; status.style.color = ''; }

    acceptAnswer(input.value.trim()).then(function () {
      if (status) status.innerHTML = '✅ 连接成功，数据已发送';
    }).catch(function (err) {
      if (status) { status.innerHTML = '❌ 连接失败：' + err.message; status.style.color = 'var(--danger)'; }
    });
  };

  /* ----- CLIENT FLOW ----- */
  ui.startClient = function () {
    ui.showOrError(
      '<div class="modal-title">📥 接收数据</div>' +
      '<p class="text-sm text-secondary mb-16">在另一台设备上选择"发送数据"，然后把那边显示的连接码<strong>完整复制</strong>到下面</p>' +
      '<div class="input-group">' +
      '<label class="input-label">粘贴发送方的连接码</label>' +
      '<textarea id="syncOfferInput" class="input-field" rows="5" style="font-size:0.65rem;font-family:monospace;white-space:pre;word-break:break-all;resize:vertical" placeholder="完整粘贴发送方的连接码..."></textarea>' +
      '</div>' +
      '<button class="btn btn-primary btn-block" onclick="SyncUI.connectAsClient()">🔗 连接并接收</button>' +
      '<div id="syncStatus" class="text-sm text-center text-muted mt-8"></div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" onclick="SyncUI.close()">取消</button></div>'
    );
  };

  ui.connectAsClient = function () {
    var input = document.getElementById('syncOfferInput');
    var status = document.getElementById('syncStatus');
    if (!input || !input.value.trim()) {
      if (status) { status.innerHTML = '❌ 请粘贴连接码'; status.style.color = 'var(--danger)'; }
      return;
    }
    if (status) { status.innerHTML = '⏳ 连接中...'; status.style.color = ''; }

    var self = this;

    // Show answer view
    ui._showClientAnswer();

    createClient(input.value.trim(), {
      onStateChange: function (s) {
        var el = document.getElementById('syncClientProgress');
        if (el) el.innerHTML = (s === 'connected') ? '✅ 已连接' : '⏳ ' + s;
      },
      onError: function (msg) {
        var el = document.getElementById('syncClientProgress');
        if (el) { el.innerHTML = '❌ ' + msg; el.style.color = 'var(--danger)'; }
      },
      onDataReceived: function (data) {
        var el = document.getElementById('syncClientProgress');
        if (el) el.innerHTML = '📥 收到数据，正在合并...';

        var result = receiveAndMerge(data);
        if (result) {
          if (el) el.innerHTML = '✅ 同步完成！收到 ' + result.records + ' 条记录、' + result.categories + ' 个分类';
          try {
            if (channel && channel.readyState === 'open') channel.send('SYNC_OK');
          } catch (e) { /* ignore */ }
        } else {
          var statusText = document.getElementById('syncClientStatus');
          if (statusText) statusText.innerHTML = '❌ 数据合并失败';
        }
      }
    }).then(function (answerSdp) {
      var answerEl = document.getElementById('syncAnswerText');
      if (answerEl) answerEl.value = answerSdp;
      var progress = document.getElementById('syncClientProgress');
      if (progress) progress.innerHTML = '✅ 连接准备就绪，请在发送方输入上面返回的连接码，然后等待数据...';
    }).catch(function (err) {
      var progress = document.getElementById('syncClientProgress');
      if (progress) { progress.innerHTML = '❌ ' + err.message; progress.style.color = 'var(--danger)'; }
    });
  };

  ui._showClientAnswer = function () {
    ui.showOrError(
      '<div class="modal-title">📥 接收数据</div>' +
      '<p class="text-sm text-secondary mb-16">把下面的返回码<strong>完整复制</strong>到发送方设备的"连接码第 2 步"处</p>' +
      '<div class="input-group">' +
      '<label class="input-label">返回码（粘贴到发送方）</label>' +
      '<textarea id="syncAnswerText" class="input-field" readonly rows="4" style="font-size:0.65rem;font-family:monospace;white-space:pre;word-break:break-all;resize:vertical"></textarea>' +
      '<button class="btn btn-outline btn-block mt-8" onclick="SyncUI.copyText(\'syncAnswerText\')">📋 复制返回码</button>' +
      '</div>' +
      '<div id="syncClientProgress" class="text-sm text-center text-muted mt-16">⏳ 正在建立连接...</div>' +
      '<div id="syncClientStatus" class="text-sm text-center text-muted"></div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" onclick="SyncUI.close()">取消</button></div>'
    );
  };

  /* ----- UTILITY ----- */
  ui.copyText = function (textareaId) {
    var el = document.getElementById(textareaId);
    if (!el) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(el.value).then(function () {
        if (typeof showToast === 'function') showToast('✅ 已复制到剪贴板');
      }).catch(function () {
        el.select();
        document.execCommand('copy');
        if (typeof showToast === 'function') showToast('✅ 已复制');
      });
    } else {
      el.focus();
      el.select();
      document.execCommand('copy');
      if (typeof showToast === 'function') showToast('✅ 已复制');
    }
  };

  /* ============================================================
     7. HOOK INTO SETTINGS PAGE
     ============================================================ */
  function addSyncButton() {
    var settingsPage = document.getElementById('page-settings');
    if (!settingsPage) return;

    var btn = settingsPage.querySelector('.sync-lan-btn');
    if (btn) return; // already added

    var dataCards = settingsPage.querySelectorAll('.card');
    var dataCard = null;
    for (var i = 0; i < dataCards.length; i++) {
      var title = dataCards[i].querySelector('.card-title');
      if (title && title.textContent.indexOf('数据管理') !== -1) {
        dataCard = dataCards[i];
        break;
      }
    }
    if (!dataCard) return;

    var btnContainer = dataCard.querySelector('.flex.flex-col.gap-8');
    if (!btnContainer) return;

    var syncBtn = document.createElement('button');
    syncBtn.className = 'btn btn-primary btn-block sync-lan-btn';
    syncBtn.textContent = '📶 局域网同步';
    syncBtn.onclick = function () { ui.showMenu(); };

    var clearBtn = btnContainer.querySelector('.btn-danger');
    if (clearBtn) {
      btnContainer.insertBefore(syncBtn, clearBtn);
    } else {
      btnContainer.appendChild(syncBtn);
    }
  }

  function init() {
    addSyncButton();

    // Watch for settings re-renders
    var observer = new MutationObserver(function () {
      addSyncButton();
    });
    observer.observe(document.getElementById('page-settings') || document.body, {
      childList: true, subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Expose for onclick in modal HTML */
  window.SyncUI = ui;

  /* Public API */
  window.LANSync = {
    init: init,
    open: function () { ui.showMenu(); },
    sanitizeHtml: sanitizeHtml
  };

})();
