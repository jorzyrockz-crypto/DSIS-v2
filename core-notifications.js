const NOTIFICATION_LIMIT = 200;
let notifFilter = 'all';

function inferNotificationCategory(type, message){
  const t = (type || '').toString().toLowerCase();
  const m = (message || '').toString().toLowerCase();
  if (t === 'error' || t === 'warn') return 'alerts';
  if (m.includes('eul') || m.includes('inspection') || m.includes('archive')) return 'alerts';
  return 'system';
}

function normalizeNotificationEntry(entry, idx = 0){
  const src = entry && typeof entry === 'object' ? entry : {};
  const type = ['success', 'error', 'warn', 'info'].includes((src.type || '').toString().toLowerCase())
    ? (src.type || '').toString().toLowerCase()
    : 'info';
  const message = (src.message || '').toString().trim();
  const createdAt = src.createdAt
    || (Number.isFinite(new Date(src.time || '').getTime()) ? new Date(src.time).toISOString() : new Date(Date.now() - idx * 1000).toISOString());
  const timeText = Number.isFinite(new Date(createdAt).getTime())
    ? new Date(createdAt).toLocaleString()
    : (src.time || new Date().toLocaleString());
  const id = (src.id || `n_${Date.now()}_${idx}`).toString();
  return {
    id,
    type,
    category: (src.category || inferNotificationCategory(type, message)).toString(),
    message,
    read: !!src.read,
    createdAt,
    time: timeText,
    actorProfileKey: normalizeProfileKeyValue(src.actorProfileKey || '') || 'unknown-profile'
  };
}

function saveNotifications(){
  const normalized = (Array.isArray(notifications) ? notifications : [])
    .map((n, idx) => normalizeNotificationEntry(n, idx))
    .slice(-NOTIFICATION_LIMIT);
  notifications = normalized;
  localStorage.setItem('icsNotifications', JSON.stringify(normalized));
}

function notificationIcon(type, category){
  if (type === 'error') return 'octagon-alert';
  if (type === 'warn') return 'triangle-alert';
  if (type === 'success') return 'badge-check';
  return category === 'alerts' ? 'bell-ring' : 'info';
}

function notificationBucketLabel(createdAtIso){
  const d = new Date(createdAtIso || '');
  if (!Number.isFinite(d.getTime())) return 'Earlier';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff <= 10 * 60 * 1000) return 'Now';
  const sameDay = now.getFullYear() === d.getFullYear()
    && now.getMonth() === d.getMonth()
    && now.getDate() === d.getDate();
  return sameDay ? 'Today' : 'Earlier';
}

function buildNotificationFeed(){
  const source = (Array.isArray(notifications) ? notifications : [])
    .map((n, idx) => normalizeNotificationEntry(n, idx))
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const grouped = new Map();
  source.forEach((n) => {
    const key = `${n.type}|${n.category}|${n.message}`;
    if (!grouped.has(key)){
      grouped.set(key, {
        ...n,
        ids: [n.id],
        count: 1,
        unreadCount: n.read ? 0 : 1
      });
      return;
    }
    const g = grouped.get(key);
    g.ids.push(n.id);
    g.count += 1;
    if (!n.read) g.unreadCount += 1;
  });
  let rows = [...grouped.values()];
  if (notifFilter === 'unread') rows = rows.filter((n) => n.unreadCount > 0);
  if (notifFilter === 'alerts') rows = rows.filter((n) => n.category === 'alerts');
  if (notifFilter === 'system') rows = rows.filter((n) => n.category !== 'alerts');
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function renderNotifications(){
  notifications = (Array.isArray(notifications) ? notifications : []).map((n, idx) => normalizeNotificationEntry(n, idx));
  const unread = notifications.filter((n) => !n.read).length;
  notifBadge.style.display = unread > 0 ? 'grid' : 'none';
  notifBadge.textContent = unread > 99 ? '99+' : String(unread);

  const empty = notifPanel.querySelector('.notif-empty');
  const list = document.getElementById('notifList');
  if (!list) return;
  list.innerHTML = '';
  notifPanel.querySelectorAll('.notif-tab').forEach((btn) => {
    btn.classList.toggle('active', (btn.dataset.filter || '') === notifFilter);
  });

  const rows = buildNotificationFeed();
  if (!rows.length){
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  let lastBucket = '';
  rows.forEach((n) => {
    const bucket = notificationBucketLabel(n.createdAt);
    if (bucket !== lastBucket){
      const label = document.createElement('div');
      label.className = 'notif-group-label';
      label.textContent = bucket;
      list.appendChild(label);
      lastBucket = bucket;
    }

    const row = document.createElement('div');
    row.className = `notif-item ${n.type || 'info'} ${n.unreadCount > 0 ? 'unread' : ''}`;
    row.innerHTML = `
      <span class="notif-ico" aria-hidden="true"><i data-lucide="${notificationIcon(n.type, n.category)}" aria-hidden="true"></i></span>
      <div class="notif-main">
        <div class="notif-msg">${escapeHTML(n.message || '')}${n.count > 1 ? ` <span class="notif-count">x${n.count}</span>` : ''}</div>
        <div class="notif-meta">${escapeHTML(n.time || '')}${n.unreadCount > 0 ? ` | ${n.unreadCount} unread` : ''}</div>
      </div>
      <div class="notif-item-actions">
        <button class="notif-item-btn" data-action="toggle-read" data-ids="${escapeHTML(n.ids.join(','))}" title="${n.unreadCount > 0 ? 'Mark read' : 'Mark unread'}" aria-label="${n.unreadCount > 0 ? 'Mark read' : 'Mark unread'}"><i data-lucide="${n.unreadCount > 0 ? 'mail-check' : 'mail'}" aria-hidden="true"></i></button>
        <button class="notif-item-btn" data-action="delete" data-ids="${escapeHTML(n.ids.join(','))}" title="Delete notification" aria-label="Delete notification"><i data-lucide="trash-2" aria-hidden="true"></i></button>
      </div>
    `;
    list.appendChild(row);
  });

  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function updateNotificationsRead(ids, read){
  const idSet = new Set((ids || []).map((x) => x.toString()));
  notifications = notifications.map((n) => {
    if (!idSet.has((n.id || '').toString())) return n;
    return { ...n, read: !!read };
  });
  saveNotifications();
  renderNotifications();
}

function deleteNotifications(ids){
  const idSet = new Set((ids || []).map((x) => x.toString()));
  notifications = notifications.filter((n) => !idSet.has((n.id || '').toString()));
  saveNotifications();
  renderNotifications();
}

function markNotificationsRead(){
  notifications = notifications.map((n) => ({ ...n, read: true }));
  saveNotifications();
  renderNotifications();
}

function clearReadNotifications(){
  notifications = notifications.filter((n) => !n.read);
  saveNotifications();
  renderNotifications();
}

function notify(type, message){
  const now = new Date();
  notifications.push(normalizeNotificationEntry({
    id: `n_${now.getTime()}_${Math.floor(Math.random() * 1000)}`,
    type,
    message,
    time: now.toLocaleString(),
    createdAt: now.toISOString(),
    read: false,
    actorProfileKey: getCurrentActorProfileKey()
  }));
  if (notifications.length > NOTIFICATION_LIMIT) notifications = notifications.slice(-NOTIFICATION_LIMIT);
  saveNotifications();
  renderNotifications();
  showActiveModalToast(type, message);
}

function getTopShownOverlay(){
  const ids = [
    'setupOverlay',
    'dataHubOverlay',
    'dataImportOverlay',
    'dataValidationOverlay',
    'dataExportOverlay',
    'archiveOverlay',
    'inspectionOverlay',
    'inspectionHistoryOverlay',
    'profileOverlay',
    'loginOverlay',
    'archivedHistoryOverlay',
    'icsDetailsOverlay',
    'searchOverlay',
    'modal'
  ];
  for (const id of ids){
    const el = document.getElementById(id);
    if (!el) continue;
    if (id === 'modal'){
      if (el.style.display === 'flex') return el;
      continue;
    }
    if (el.classList?.contains('show')) return el;
  }
  return null;
}

function showActiveModalToast(type, message){
  const overlay = getTopShownOverlay();
  if (!overlay) return;
  const safeType = ['success', 'error', 'warn', 'info'].includes(type) ? type : 'info';
  const existing = overlay.querySelector('.modal-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `modal-toast ${safeType}`;
  toast.textContent = message || '';
  overlay.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 2600);
}

function toggleNotificationsPanel(){
  if (!notifPanel) return;
  notifPanel.classList.toggle('show');
}

function initializeNotificationsUI(){
  notifications = (Array.isArray(notifications) ? notifications : []).map((n, idx) => normalizeNotificationEntry(n, idx));
  saveNotifications();

  notifBellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNotificationsPanel();
  });

  document.getElementById('notifMarkAllBtn')?.addEventListener('click', () => markNotificationsRead());
  document.getElementById('notifClearReadBtn')?.addEventListener('click', () => clearReadNotifications());
  document.getElementById('notifTabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.notif-tab');
    if (!btn) return;
    notifFilter = (btn.dataset.filter || 'all').toLowerCase();
    renderNotifications();
  });
  document.getElementById('notifList')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.notif-item-btn');
    if (!btn) return;
    const ids = (btn.dataset.ids || '').split(',').map((x) => x.trim()).filter(Boolean);
    const action = btn.dataset.action || '';
    if (!ids.length) return;
    if (action === 'delete'){
      deleteNotifications(ids);
      return;
    }
    if (action === 'toggle-read'){
      const hasUnread = notifications.some((n) => ids.includes((n.id || '').toString()) && !n.read);
      updateNotificationsRead(ids, hasUnread);
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.notif-wrap')) notifPanel.classList.remove('show');
  });

  renderNotifications();
}
