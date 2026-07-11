/* ============================================================
   LAN SYNC — WebRTC P2P (zero server, manual signaling)
   ============================================================ */
(function () {
  'use strict';

  function sanitizeHtml(str) {
    if (typeof str !== 'string') return '';
    var map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;' };
    return String(str).replace(/[&<>"'`]/g, function (c) { return map[c]; });
  }

  /* Compress/decompress SDP strings using browser's CompressionStream API */
  function _b64FromBytes(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function _bytesFromB64(b64) {
    var s = atob(b64), len = s.length, bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = s.charCodeAt(i);
    return bytes;
  }
  async function compressStr(str) {
    if (!window.CompressionStream) return str; // fallback
    try {
      var bytes = new TextEncoder().encode(str);
      var blob = await new Response(
        new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
      ).blob();
      return _b64FromBytes(new Uint8Array(await blob.arrayBuffer()));
    } catch (e) { return str; }
  }
  async function decompressStr(b64) {
    if (!window.CompressionStream || b64.indexOf('\n') !== -1) return b64; // fallback: not compressed
    try {
      var blob2 = await new Response(
        new Blob([_bytesFromB64(b64)]).stream().pipeThrough(new DecompressionStream('gzip'))
      ).blob();
      return new TextDecoder().decode(await blob2.arrayBuffer());
    } catch (e) { return b64; }
  }

  var validators = {
    amount: function (v) { return typeof v === 'number' && isFinite(v) && v >= 0; },
    date: function (v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v); },
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
    data.records = data.records.filter(validateRecord);
    data.categories = data.categories.filter(validateCategory);
    return null;
  }

  function backupBeforeMerge() {
    try {
      localStorage.setItem('budgetBackupBeforeSync', DataStore.exportJSON());
      localStorage.setItem('budgetBackupTime', new Date().toISOString());
    } catch (e) { /* best-effort */ }
  }

  var pc = null;
  var channel = null;
  var syncState = 'idle';
  var onStateChange = null;
  var onDataCallback = null;
  var onErrorCallback = null;

  function resetConnection() {
    if (pc) { try { pc.close(); } catch (e) { /* ignore */ } pc = null; }
    channel = null;
    syncState = 'idle';
  }

  function setState(s) { syncState = s; if (typeof onStateChange === 'function') onStateChange(s); }

  function createHost(callbacks) {
    resetConnection();
    onStateChange = callbacks.onStateChange || null;
    onDataCallback = callbacks.onDataReceived || null;
    onErrorCallback = callbacks.onError || null;
    setState('host-offer');
    pc = new RTCPeerConnection({ iceServers: [] });
    channel = pc.createDataChannel('budget-sync', { ordered: true });
    channel.onopen = function () {
      setState('connected');
      try { channel.send(DataStore.exportJSON()); } catch (e) {
        if (onErrorCallback) onErrorCallback('发送失败：' + e.message);
      }
    };
    channel.onmessage = function (msg) { if (typeof onDataCallback === 'function') onDataCallback(msg.data); };
    channel.onerror = function () { if (onErrorCallback) onErrorCallback('数据通道错误'); };
    pc.oniceconnectionstatechange = function () {
      if (pc.iceConnectionState === 'failed') {
        if (onErrorCallback) onErrorCallback('连接失败，请确认同一网络');
      } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        if (typeof callbacks.onConnect === 'function') callbacks.onConnect();
      }
    };
    return pc.createOffer()
      .then(function (o) { return pc.setLocalDescription(o); })
      .then(function () {
        return new Promise(function (r) {
          if (pc.iceGatheringState === 'complete') r(pc.localDescription.sdp);
          else pc.onicecandidate = function (e) { if (!e.candidate) r(pc.localDescription.sdp); };
        });
      })
      .then(function (sdp) { return compressStr(sdp); });
  }

  function acceptAnswer(answerB64) {
    if (!pc || (syncState !== 'host-offer' && syncState !== 'connected'))
      return Promise.reject(new Error('状态异常，请重新开始'));
    return decompressStr(answerB64).then(function (sdp) {
      return pc.setRemoteDescription({ type: 'answer', sdp: sdp });
    }).then(function () { return true; });
  }

  function createClient(offerB64, callbacks) {
    resetConnection();
    onStateChange = callbacks.onStateChange || null;
    onDataCallback = callbacks.onDataReceived || null;
    onErrorCallback = callbacks.onError || null;
    setState('client-offer');
    pc = new RTCPeerConnection({ iceServers: [] });
    pc.oniceconnectionstatechange = function () {
      if (pc.iceConnectionState === 'failed') {
        if (onErrorCallback) onErrorCallback('连接失败，请确认同一网络');
      }
    };
    pc.ondatachannel = function (e) {
      channel = e.channel;
      channel.onopen = function () { setState('connected'); };
      channel.onmessage = function (msg) { if (typeof onDataCallback === 'function') onDataCallback(msg.data); };
      channel.onerror = function () { if (onErrorCallback) onErrorCallback('数据通道错误'); };
    };
    return decompressStr(offerB64).then(function (sdp) {
      return pc.setRemoteDescription({ type: 'offer', sdp: sdp })
        .then(function () { return pc.createAnswer(); })
        .then(function (a) { return pc.setLocalDescription(a); })
        .then(function () {
          return new Promise(function (r) {
            if (pc.iceGatheringState === 'complete') r(pc.localDescription.sdp);
            else pc.onicecandidate = function (e) { if (!e.candidate) r(pc.localDescription.sdp); };
          });
        })
        .then(function (sdp2) { return compressStr(sdp2); });
    });
  }

  function sortRecordsDesc(records) {
    records.sort(function (a, b) {
      var da = a.date || a.createdAt || '', db = b.date || b.createdAt || '';
      return da > db ? -1 : da < db ? 1 : 0;
    });
  }

  function receiveAndMerge(jsonStr, mode) {
    var data;
    try { data = JSON.parse(jsonStr); } catch (e) {
      if (onErrorCallback) onErrorCallback('JSON 解析失败');
      return false;
    }
    var err = validateSyncData(data);
    if (err) console.warn('[Sync]', err);
    if (data.records.length === 0 && data.categories.length === 0) {
      if (onErrorCallback) onErrorCallback('无有效数据');
      return false;
    }
    backupBeforeMerge();
    if (mode === 'replace') {
      data.records.forEach(function (r) { r.note = sanitizeHtml(r.note || ''); });
      data.categories.forEach(function (c) { c.name = sanitizeHtml(c.name); c.icon = sanitizeHtml(c.icon); });
      sortRecordsDesc(data.records);
      var def = DataStore._defaults();
      DataStore._data = def;
      DataStore._data.records = data.records;
      DataStore._data.categories = data.categories;
      if (data.budgets) DataStore._data.budgets = data.budgets;
      if (data.categoryBudgets) DataStore._data.categoryBudgets = data.categoryBudgets;
      if (data.monthlyIncome) DataStore._data.monthlyIncome = data.monthlyIncome;
      if (data.billAmounts) DataStore._data.billAmounts = data.billAmounts;
      if (data.savingsTarget) DataStore._data.savingsTarget = data.savingsTarget;
      if (data.percentBase) DataStore._data.percentBase = data.percentBase;
      if (data.whatIfParams) DataStore._data.whatIfParams = data.whatIfParams;
      if (data.billCategories && Array.isArray(data.billCategories))
        DataStore._data.billCategories = data.billCategories.map(function (b) { b.name = sanitizeHtml(b.name); return b; });
    } else {
      mergeIntoDataStore(data);
    }
    DataStore.save();
    var active = document.querySelector('.page-section.active');
    if (active && typeof navigateTo === 'function')
      navigateTo(active.getAttribute('data-page') || 'overview');
    return { records: data.records.length, categories: data.categories.length };
  }

  var pendingSyncData = null;
  function confirmSyncMode(mode) {
    if (typeof closeModal === 'function') closeModal();
    if (!pendingSyncData) return;
    var el = document.getElementById('syncClientProgress');
    if (el) el.innerHTML = '⏳ 正在' + (mode === 'replace' ? '替换' : '合并') + '数据...';
    var r = receiveAndMerge(pendingSyncData, mode);
    pendingSyncData = null;
    if (r) {
      if (el) el.innerHTML = '✅ 同步完成！收到 ' + r.records + ' 条记录、' + r.categories + ' 个分类';
      try { if (channel && channel.readyState === 'open') channel.send('SYNC_OK'); } catch (e) { /* ignore */ }
    }
  }

  function mergeIntoDataStore(incoming) {
    var cur = DataStore._data;
    if (!cur) return;
    var exist = {}; cur.records.forEach(function (r) { exist[r.id] = true; });
    incoming.records.forEach(function (r) {
      r.note = sanitizeHtml(r.note || '');
      if (exist[r.id]) {
        var i = cur.records.findIndex(function (x) { return x.id === r.id; });
        if (i !== -1) cur.records[i] = r;
      } else { cur.records.unshift(r); }
    });
    sortRecordsDesc(cur.records);
    var catIds = {}; cur.categories.forEach(function (c) { catIds[c.id] = true; });
    incoming.categories.forEach(function (c) {
      if (!catIds[c.id]) { c.name = sanitizeHtml(c.name); c.icon = sanitizeHtml(c.icon); cur.categories.push(c); catIds[c.id] = true; }
    });
    if (incoming.budgets) Object.assign(cur.budgets, incoming.budgets);
    if (incoming.categoryBudgets) Object.assign(cur.categoryBudgets, incoming.categoryBudgets);
    if (incoming.monthlyIncome) Object.assign(cur.monthlyIncome, incoming.monthlyIncome);
    if (incoming.billAmounts) Object.assign(cur.billAmounts, incoming.billAmounts);
    if (incoming.savingsTarget) cur.savingsTarget = incoming.savingsTarget;
    if (incoming.percentBase) cur.percentBase = incoming.percentBase;
    if (incoming.whatIfParams) cur.whatIfParams = incoming.whatIfParams;
    if (incoming.billCategories && Array.isArray(incoming.billCategories)) {
      var bIds = {}; cur.billCategories.forEach(function (b) { bIds[b.id] = true; });
      incoming.billCategories.forEach(function (b) {
        if (!bIds[b.id]) { b.name = sanitizeHtml(b.name); cur.billCategories.push(b); bIds[b.id] = true; }
      });
    }
  }

  var ui = {};

  ui.showOrError = function (html) {
    if (typeof showModal === 'function') { showModal(html); return; }
    var overlay = document.getElementById('modalOverlay');
    var content = document.getElementById('modalContent');
    if (overlay && content) {
      content.innerHTML = html;
      overlay.classList.add('open');
      overlay.onclick = function (e) { if (e.target === overlay) overlay.classList.remove('open'); };
    }
  };

  ui.close = function () {
    resetConnection();
    if (typeof closeModal === 'function') closeModal();
    else { var o = document.getElementById('modalOverlay'); if (o) o.classList.remove('open'); }
  };

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

  ui.startHost = function () {
    var self = this;
    this._showHostWaiting();
    createHost({
      onConnect: function () {
        var el = document.getElementById('syncStatus');
        if (el) el.innerHTML = '✅ 连接已建立，正在发送数据...';
      },
      onError: function (msg) {
        var el = document.getElementById('syncStatus');
        if (el) { el.innerHTML = '❌ ' + msg; el.style.color = 'var(--danger)'; }
      },
      onDataReceived: function (data) {
        if (data === 'SYNC_OK') {
          var el = document.getElementById('syncStatus');
          if (el) el.innerHTML = '✅ 对方已确认接收，同步完成！';
        }
      }
    }).then(function (offerSdp) {
      self._showHostOffer(offerSdp);
    }).catch(function (err) {
      var el = document.getElementById('syncStatus');
      if (el) { el.innerHTML = '❌ 创建连接失败：' + err.message; el.style.color = 'var(--danger)'; }
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
      '<div class="input-group"><label class="input-label">连接码第 1 步（发给对方）</label>' +
      '<textarea id="syncOfferText" class="input-field" readonly rows="5" style="font-size:0.65rem;font-family:monospace;white-space:pre;word-break:break-all;resize:vertical">' + sanitizeHtml(offerSdp) + '</textarea>' +
      '<button class="btn btn-outline btn-block mt-8" onclick="SyncUI.copyText(\'syncOfferText\')">📋 复制连接码</button></div>' +
      '<div class="input-group" style="margin-top:16px"><label class="input-label">连接码第 2 步（粘贴对方返回的）</label>' +
      '<textarea id="syncAnswerInput" class="input-field" rows="4" style="font-size:0.65rem;font-family:monospace;white-space:pre;word-break:break-all;resize:vertical" placeholder="..."></textarea>' +
      '<button class="btn btn-primary btn-block mt-8" onclick="SyncUI.submitAnswer()">✅ 确认连接</button></div>' +
      '<div id="syncStatus" class="text-sm text-center text-muted mt-8">⏳ 等待对方返回连接码...</div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" onclick="SyncUI.close()">取消</button></div>'
    );
  };

  ui.submitAnswer = function () {
    var input = document.getElementById('syncAnswerInput');
    var status = document.getElementById('syncStatus');
    if (!input || !input.value.trim()) {
      if (status) { status.innerHTML = '❌ 请先粘贴连接码'; status.style.color = 'var(--danger)'; }
      return;
    }
    if (status) { status.innerHTML = '⏳ 建立连接中，请等待...'; status.style.color = ''; }
    acceptAnswer(input.value.trim()).then(function () {
      if (status) status.innerHTML = '⏳ 连接握手完成，等待数据通道打开...';
    }).catch(function (err) {
      if (status) { status.innerHTML = '❌ 连接失败：' + err.message; status.style.color = 'var(--danger)'; }
    });
  };

  ui.startClient = function () {
    ui.showOrError(
      '<div class="modal-title">📥 接收数据</div>' +
      '<p class="text-sm text-secondary mb-16">在另一台设备上选择"发送数据"，然后把那边显示的连接码<strong>完整复制</strong>到下面</p>' +
      '<div class="input-group"><label class="input-label">粘贴发送方的连接码</label>' +
      '<textarea id="syncOfferInput" class="input-field" rows="5" style="font-size:0.65rem;font-family:monospace;white-space:pre;word-break:break-all;resize:vertical" placeholder="完整粘贴发送方的连接码..."></textarea></div>' +
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
        if (el) el.innerHTML = '📥 收到数据，请选择同步方式';
        pendingSyncData = data;
        if (typeof showModal === 'function') {
          showModal(
            '<div class="modal-title">📥 收到同步数据</div>' +
            '<p class="text-sm text-secondary mb-16">选择数据导入方式：</p>' +
            '<button class="btn btn-primary btn-block mb-8" onclick="confirmSyncMode(\'replace\')">🔄 替换当前数据</button>' +
            '<button class="btn btn-outline btn-block" onclick="confirmSyncMode(\'merge\')">🔀 合并到当前数据</button>' +
            '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">取消</button></div>'
          );
        }
      }
    }).then(function (answerSdp) {
      var el = document.getElementById('syncAnswerText');
      if (el) el.value = answerSdp;
      var p = document.getElementById('syncClientProgress');
      if (p) p.innerHTML = '✅ 连接准备就绪，请在发送方输入上面返回的连接码，然后等待数据...';
    }).catch(function (err) {
      var p = document.getElementById('syncClientProgress');
      if (p) { p.innerHTML = '❌ ' + err.message; p.style.color = 'var(--danger)'; }
    });
  };

  ui._showClientAnswer = function () {
    ui.showOrError(
      '<div class="modal-title">📥 接收数据</div>' +
      '<p class="text-sm text-secondary mb-16">把下面的返回码<strong>完整复制</strong>到发送方设备的"连接码第 2 步"处</p>' +
      '<div class="input-group"><label class="input-label">返回码（粘贴到发送方）</label>' +
      '<textarea id="syncAnswerText" class="input-field" readonly rows="4" style="font-size:0.65rem;font-family:monospace;white-space:pre;word-break:break-all;resize:vertical"></textarea>' +
      '<button class="btn btn-outline btn-block mt-8" onclick="SyncUI.copyText(\'syncAnswerText\')">📋 复制返回码</button></div>' +
      '<div id="syncClientProgress" class="text-sm text-center text-muted mt-16">⏳ 正在建立连接...</div>' +
      '<div id="syncClientStatus" class="text-sm text-center text-muted"></div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" onclick="SyncUI.close()">取消</button></div>'
    );
  };

  ui.copyText = function (textareaId) {
    var el = document.getElementById(textareaId);
    if (!el) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(el.value).then(function () {
        if (typeof showToast === 'function') showToast('✅ 已复制');
      }).catch(function () { el.select(); document.execCommand('copy'); if (typeof showToast === 'function') showToast('✅ 已复制'); });
    } else { el.focus(); el.select(); document.execCommand('copy'); if (typeof showToast === 'function') showToast('✅ 已复制'); }
  };

  window.SyncUI = ui;
  window.confirmSyncMode = confirmSyncMode;
  window.LANSync = { open: function () { ui.showMenu(); }, sanitizeHtml: sanitizeHtml };

})();

