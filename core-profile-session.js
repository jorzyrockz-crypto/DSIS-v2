const PROFILE_AVATAR_KEYS = ['initials', 'person', 'briefcase', 'school', 'shield', 'star'];
const PROFILE_AVATAR_SVGS = {
  person: '<i class="profile-avatar-icon" data-lucide="user" aria-hidden="true"></i>',
  briefcase: '<i class="profile-avatar-icon" data-lucide="briefcase" aria-hidden="true"></i>',
  school: '<i class="profile-avatar-icon" data-lucide="school" aria-hidden="true"></i>',
  shield: '<i class="profile-avatar-icon" data-lucide="shield" aria-hidden="true"></i>',
  star: '<i class="profile-avatar-icon" data-lucide="star" aria-hidden="true"></i>'
};

function sanitizeProfileAvatarDataUrl(value){
  const raw = (value || '').toString().trim();
  if (!raw) return '';
  const ok = /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(raw);
  return ok ? raw : '';
}

function createDefaultUser(){
  return {
    profileKey: '',
    name: 'Custodian',
    designation: 'Inventory Officer',
    role: 'Encoder',
    email: '',
    phone: '',
    bio: '',
    avatar: 'initials',
    topbarAvatarDataUrl: '',
    lastLogin: new Date().toISOString(),
    preferences: {
      tableDensity: 'comfortable',
      themeAccent: 'elegant-white',
      defaultView: 'Dashboard'
    }
  };
}

function normalizeUser(user){
  const base = createDefaultUser();
  const src = user && typeof user === 'object' ? user : {};
  const prefs = src.preferences && typeof src.preferences === 'object' ? src.preferences : {};
  const density = ['comfortable', 'compact'].includes((prefs.tableDensity || '').toLowerCase()) ? prefs.tableDensity.toLowerCase() : base.preferences.tableDensity;
  const accent = Object.prototype.hasOwnProperty.call(ACCENT_THEMES, prefs.themeAccent) ? prefs.themeAccent : base.preferences.themeAccent;
  const defaultView = PROFILE_VIEWS.includes(prefs.defaultView) ? prefs.defaultView : base.preferences.defaultView;
  const rawRoleText = (src.role || '').toString().trim();
  const roleLabel = normalizeRoleLabel(src.accessRole || rawRoleText || base.role);
  const inferredDesignation = rawRoleText && rawRoleText !== roleLabel ? rawRoleText : '';
  const designation = (src.designation || inferredDesignation || base.designation).toString().trim() || base.designation;
  const rawKey = (src.profileKey || '').toString().trim();
  const profileKey = rawKey || `${((src.email || '').toString().trim() || (src.name || base.name).toString().trim() || 'profile').toLowerCase().replace(/[^\w]+/g, '-')}-${(normalizeRoleKey(roleLabel) || 'user').toLowerCase().replace(/[^\w]+/g, '-')}`;
  const avatar = PROFILE_AVATAR_KEYS.includes((src.avatar || '').toString().trim().toLowerCase())
    ? (src.avatar || '').toString().trim().toLowerCase()
    : 'initials';
  const topbarAvatarDataUrl = sanitizeProfileAvatarDataUrl(src.topbarAvatarDataUrl || src.profileImageDataUrl || '');
  return {
    profileKey,
    name: (src.name || base.name).toString().trim() || base.name,
    designation,
    role: roleLabel,
    email: (src.email || '').toString().trim(),
    phone: (src.phone || '').toString().trim(),
    bio: (src.bio || '').toString().trim(),
    avatar,
    topbarAvatarDataUrl,
    lastLogin: src.lastLogin || base.lastLogin,
    preferences: {
      tableDensity: density,
      themeAccent: accent,
      defaultView
    }
  };
}

function applyAvatarPreviewSelection(selected){
  const safe = PROFILE_AVATAR_KEYS.includes((selected || '').toLowerCase()) ? selected.toLowerCase() : 'initials';
  const input = document.getElementById('profileAvatarType');
  if (input) input.value = safe;
  document.querySelectorAll('#profileAvatarPicker .avatar-picker-btn').forEach((btn) => {
    btn.classList.toggle('active', (btn.dataset.avatar || '') === safe);
  });
}

function renderUserAvatar(target, name, avatarType){
  if (!target) return;
  const safe = PROFILE_AVATAR_KEYS.includes((avatarType || '').toLowerCase()) ? avatarType.toLowerCase() : 'initials';
  if (safe === 'initials'){
    target.classList.remove('has-icon');
    target.innerHTML = '';
    target.textContent = getInitials(name || '');
    return;
  }
  const icon = PROFILE_AVATAR_SVGS[safe] || PROFILE_AVATAR_SVGS.person;
  target.classList.add('has-icon');
  target.innerHTML = icon;
}

function openMyProfileFromMenu(){
  closeTopbarProfileMenu();
  if (typeof openMyProfileModal === 'function'){
    openMyProfileModal();
    return;
  }
  openProfileModal();
}

function renderTopbarProfileAvatar(target, dataUrl, name = '', avatarType = 'initials'){
  if (!target) return;
  const next = sanitizeProfileAvatarDataUrl(dataUrl || '');
  if (next){
    target.textContent = '';
    target.innerHTML = '';
    target.classList.remove('has-icon');
    target.style.backgroundImage = `url("${next}")`;
    target.classList.add('has-image');
    return;
  }
  target.style.backgroundImage = '';
  target.classList.remove('has-image');
  renderUserAvatar(target, name || currentUser?.name || '', avatarType || currentUser?.avatar || 'initials');
}

function resolveCurrentThemeAccent(){
  const raw = currentUser?.preferences?.themeAccent || 'elegant-white';
  if (typeof normalizeThemeAccentKey === 'function') return normalizeThemeAccentKey(raw);
  return raw;
}

function isDarkThemeAccent(accent){
  return accent === 'crimson-black' || String(accent || '').startsWith('dracula');
}

const AUDIT_LAST_SEEN_AT_STORAGE_KEY = 'dsisAuditLogsLastSeenAt';
const UPDATE_MENU_BADGE_STORAGE_KEY = 'dsisPwaUpdateBadgeState';

function getAuditLastSeenAtMs(){
  const raw = localStorage.getItem(AUDIT_LAST_SEEN_AT_STORAGE_KEY) || '';
  const ms = Number(raw);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

function setAuditLastSeenAtMs(value){
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return;
  localStorage.setItem(AUDIT_LAST_SEEN_AT_STORAGE_KEY, String(ms));
}

function getLatestAuditAtMs(){
  const logs = getAuditLogs() || [];
  let latest = 0;
  logs.forEach((entry) => {
    const ms = getAuditEntryTimeMs(entry);
    if (ms > latest) latest = ms;
  });
  return latest;
}

function getNewAuditLogsCount(){
  const since = getAuditLastSeenAtMs();
  const logs = getAuditLogs() || [];
  let count = 0;
  logs.forEach((entry) => {
    if (getAuditEntryTimeMs(entry) > since) count += 1;
  });
  return count;
}

function refreshAuditLogsMenuBadge(){
  const badge = document.getElementById('auditLogsMenuBadge');
  if (!badge) return;
  const count = getNewAuditLogsCount();
  if (count <= 0){
    badge.style.display = 'none';
    badge.textContent = '0 New';
    return;
  }
  badge.style.display = 'inline-flex';
  badge.textContent = `${count > 99 ? '99+' : count} New`;
}

function isUpdateMenuBadgeActive(){
  return String(localStorage.getItem(UPDATE_MENU_BADGE_STORAGE_KEY) || '') === '1';
}

function setUpdateMenuBadgeActive(active){
  localStorage.setItem(UPDATE_MENU_BADGE_STORAGE_KEY, active ? '1' : '0');
}

function refreshCheckUpdateMenuBadge(){
  const badge = document.getElementById('checkUpdateMenuBadge');
  if (!badge) return;
  const hasPendingUpdate = isUpdateMenuBadgeActive();
  badge.style.display = hasPendingUpdate ? 'inline-flex' : 'none';
  badge.textContent = hasPendingUpdate ? 'New' : '';
}

function updateTopbarProfileMenuIdentity(){
  if (topbarMenuName) topbarMenuName.textContent = currentUser?.name || 'Custodian';
  if (topbarMenuEmail){
    const email = (currentUser?.email || '').toString().trim();
    topbarMenuEmail.textContent = email || 'No email set';
  }
  renderTopbarProfileAvatar(topbarMenuAvatar, currentUser?.topbarAvatarDataUrl || '', currentUser?.name || '', currentUser?.avatar || 'initials');
  if (topbarAppearanceMode){
    topbarAppearanceMode.textContent = isDarkThemeAccent(resolveCurrentThemeAccent()) ? 'Dark' : 'Light';
  }
  refreshAuditLogsMenuBadge();
  refreshCheckUpdateMenuBadge();
}

function closeTopbarProfileMenu(){
  if (!topbarProfileMenu) return;
  topbarProfileMenu.classList.remove('show');
  topbarProfileBtn?.setAttribute('aria-expanded', 'false');
}

function toggleTopbarProfileMenu(forceState){
  if (!topbarProfileMenu) return;
  const next = typeof forceState === 'boolean' ? forceState : !topbarProfileMenu.classList.contains('show');
  if (!next){
    closeTopbarProfileMenu();
    return;
  }
  updateTopbarProfileMenuIdentity();
  if (notifPanel?.classList?.contains('show')) notifPanel.classList.remove('show');
  topbarProfileMenu.classList.add('show');
  topbarProfileBtn?.setAttribute('aria-expanded', 'true');
}

function openProfileFromMenu(tab = 'identity'){
  closeTopbarProfileMenu();
  openProfileModal();
  const safeTab = ['identity', 'school', 'preferences', 'security'].includes((tab || '').toLowerCase())
    ? tab.toLowerCase()
    : 'identity';
  setTimeout(() => setProfileSettingsTab(safeTab, true), 0);
}

const auditLogsViewState = {
  query: '',
  type: 'all',
  actor: 'all',
  fromDate: '',
  toDate: '',
  page: 1,
  pageSize: 8
};

function getAuditEntryTimeMs(entry){
  const at = new Date(entry?.at || '').getTime();
  if (Number.isFinite(at)) return at;
  const parsed = new Date(entry?.time || '').getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDateStartMs(ymd){
  const v = (ymd || '').toString().trim();
  if (!v) return null;
  const ms = new Date(`${v}T00:00:00`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function getDateEndMs(ymd){
  const v = (ymd || '').toString().trim();
  if (!v) return null;
  const ms = new Date(`${v}T23:59:59.999`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function getFilteredAuditLogs(){
  const logs = (getAuditLogs() || []).slice().reverse();
  const q = (auditLogsViewState.query || '').toLowerCase().trim();
  const type = (auditLogsViewState.type || 'all').toLowerCase();
  const actor = (auditLogsViewState.actor || 'all').toLowerCase();
  const fromMs = getDateStartMs(auditLogsViewState.fromDate);
  const toMs = getDateEndMs(auditLogsViewState.toDate);
  return logs.filter((entry) => {
    const timeMs = getAuditEntryTimeMs(entry);
    if (fromMs !== null && timeMs < fromMs) return false;
    if (toMs !== null && timeMs > toMs) return false;
    const currentType = (entry?.type || 'info').toString().toLowerCase();
    if (type !== 'all' && currentType !== type) return false;
    const profileKey = (entry?.actorProfileKey || 'unknown-profile').toString();
    if (actor !== 'all' && profileKey.toLowerCase() !== actor) return false;
    if (!q) return true;
    const hay = [
      entry?.detail || '',
      entry?.type || '',
      entry?.actorProfileKey || '',
      entry?.actorRole || '',
      entry?.actorDeviceId || '',
      entry?.actorSessionId || '',
      JSON.stringify(entry?.meta || {})
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

function formatAuditMetaSummary(entry){
  const meta = entry?.meta;
  if (!meta || typeof meta !== 'object') return '';
  const preferredKeys = [
    'sourceType',
    'recordIcsNo',
    'recordParNo',
    'itemNo',
    'mode',
    'added',
    'replaced',
    'skipped'
  ];
  const parts = [];
  preferredKeys.forEach((key) => {
    const value = meta[key];
    if (value === undefined || value === null || value === '') return;
    parts.push(`${key}:${value}`);
  });
  if (!parts.length){
    const fallback = Object.entries(meta)
      .slice(0, 3)
      .map(([k, v]) => `${k}:${typeof v === 'object' ? '[obj]' : String(v)}`);
    return fallback.join(' | ');
  }
  return parts.join(' | ');
}

function getAuditLogPageSlice(rows){
  const total = rows.length;
  const pageSize = Math.max(1, Number(auditLogsViewState.pageSize) || 12);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number(auditLogsViewState.page) || 1));
  auditLogsViewState.page = page;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    total,
    totalPages,
    page,
    pageSize,
    rows: rows.slice(start, end)
  };
}

function renderAuditLogsModal(){
  const actorFilter = document.getElementById('auditLogsActorFilter');
  const summary = document.getElementById('auditLogsSummary');
  const body = document.getElementById('auditLogsTableBody');
  const pageInfo = document.getElementById('auditLogsPageInfo');
  const prevBtn = document.getElementById('auditLogsPrevBtn');
  const nextBtn = document.getElementById('auditLogsNextBtn');
  if (!actorFilter || !summary || !body || !pageInfo || !prevBtn || !nextBtn) return;

  const allLogs = getAuditLogs() || [];
  const actorKeys = [...new Set(allLogs.map((x) => (x?.actorProfileKey || 'unknown-profile').toString()).filter(Boolean))].sort();
  actorFilter.innerHTML = '<option value="all">All Actors</option>'
    + actorKeys.map((k) => `<option value="${escapeHTML(k)}">${escapeHTML(k)}</option>`).join('');
  actorFilter.value = actorKeys.some((k) => k.toLowerCase() === (auditLogsViewState.actor || '').toLowerCase())
    ? auditLogsViewState.actor
    : 'all';

  const filteredRows = getFilteredAuditLogs();
  const pageView = getAuditLogPageSlice(filteredRows);
  summary.textContent = filteredRows.length
    ? `${filteredRows.length} log entr${filteredRows.length === 1 ? 'y' : 'ies'} matched (${allLogs.length} total).`
    : `No matching logs (${allLogs.length} total).`;
  pageInfo.textContent = `Page ${pageView.page} of ${pageView.totalPages}`;
  prevBtn.disabled = pageView.page <= 1;
  nextBtn.disabled = pageView.page >= pageView.totalPages;

  if (!filteredRows.length){
    body.innerHTML = '<tr><td colspan="5" class="empty-cell">No audit logs found for current filters.</td></tr>';
    return;
  }

  body.innerHTML = pageView.rows.map((entry) => {
    const timeText = escapeHTML(entry?.time || new Date(entry?.at || '').toLocaleString() || '-');
    const rawType = (entry?.type || 'info').toString().toLowerCase();
    const typeText = escapeHTML(rawType);
    const badgeTone = rawType === 'error'
      ? 'danger'
      : rawType === 'warn'
        ? 'warn'
        : rawType === 'success'
          ? 'ok'
          : rawType === 'info'
            ? 'near'
            : 'ok';
    const detailText = escapeHTML(entry?.detail || '-');
    const metaSummary = formatAuditMetaSummary(entry);
    const metaHtml = metaSummary ? `<div class="meta">${escapeHTML(metaSummary)}</div>` : '';
    const actorText = escapeHTML(entry?.actorProfileKey || 'unknown-profile');
    const roleText = escapeHTML(entry?.actorRole || '-');
    const traceText = `dev:${escapeHTML(entry?.actorDeviceId || '-')}, sess:${escapeHTML(entry?.actorSessionId || '-')}`;
    return `<tr>
      <td>${timeText}</td>
      <td><span class="risk-badge ${badgeTone}">${typeText}</span></td>
      <td>${detailText}${metaHtml}</td>
      <td>${actorText}<div class="meta">${roleText}</div></td>
      <td class="meta">${traceText}</td>
    </tr>`;
  }).join('');
}

function closeAuditLogsModal(){
  const overlay = document.getElementById('auditLogsOverlay');
  if (!overlay) return;
  overlay.classList.remove('show');
}

function openAuditLogsModal(){
  const overlay = document.getElementById('auditLogsOverlay');
  if (!overlay){
    showModal('Audit Logs', 'Audit log viewer panel is unavailable.');
    return;
  }
  document.getElementById('auditLogsSearchInput').value = auditLogsViewState.query || '';
  document.getElementById('auditLogsTypeFilter').value = auditLogsViewState.type || 'all';
  document.getElementById('auditLogsFromDate').value = auditLogsViewState.fromDate || '';
  document.getElementById('auditLogsToDate').value = auditLogsViewState.toDate || '';
  auditLogsViewState.page = 1;
  setAuditLastSeenAtMs(Math.max(Date.now(), getLatestAuditAtMs()));
  refreshAuditLogsMenuBadge();
  renderAuditLogsModal();
  overlay.classList.add('show');
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
  setTimeout(() => document.getElementById('auditLogsSearchInput')?.focus(), 0);
}

function exportAuditLogsModalData(){
  const payload = {
    exportedAt: new Date().toISOString(),
    exportType: 'audit-logs',
    filters: { ...auditLogsViewState },
    rows: getFilteredAuditLogs()
  };
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `dsis-audit-logs-${stamp}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  const summary = document.getElementById('auditLogsSummary');
  if (summary) summary.textContent = `Exported JSON: ${fileName}`;
  if (typeof notifyCenter === 'function') notifyCenter('info', `Audit Trail export complete (JSON): ${fileName}`);
}

function csvCell(value){
  const str = (value ?? '').toString().replace(/\r?\n/g, ' ').trim();
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

function exportAuditLogsCsv(){
  const rows = getFilteredAuditLogs();
  const header = ['at', 'time', 'type', 'detail', 'meta', 'actorProfileKey', 'actorRole', 'actorDeviceId', 'actorSessionId'];
  const lines = [header.map(csvCell).join(',')];
  rows.forEach((entry) => {
    const row = [
      entry?.at || '',
      entry?.time || '',
      entry?.type || '',
      entry?.detail || '',
      JSON.stringify(entry?.meta || {}),
      entry?.actorProfileKey || '',
      entry?.actorRole || '',
      entry?.actorDeviceId || '',
      entry?.actorSessionId || ''
    ];
    lines.push(row.map(csvCell).join(','));
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `dsis-audit-logs-${stamp}.csv`;
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  const summary = document.getElementById('auditLogsSummary');
  if (summary) summary.textContent = `Exported CSV: ${fileName}`;
  if (typeof notifyCenter === 'function') notifyCenter('info', `Audit Trail export complete (CSV): ${fileName}`);
}

function openAuditLogsFromMenu(){
  closeTopbarProfileMenu();
  openAuditLogsModal();
}

function closeHelpDocsModal(){
  const overlay = document.getElementById('helpDocsOverlay');
  if (!overlay) return;
  overlay.classList.remove('show');
}

function openHelpDocsModal(){
  const overlay = document.getElementById('helpDocsOverlay');
  if (!overlay){
    showModal('Help & Documentation', 'Help panel is unavailable.');
    return;
  }
  overlay.classList.add('show');
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function printHelpDocsModal(){
  const contentRoot = document.getElementById('helpDocsPrintArea');
  if (!contentRoot){
    showModal('Print Help', 'Help content is unavailable for printing.');
    return;
  }
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow){
    showModal('Print Help', 'Popup blocked. Please allow popups to print the guide.');
    return;
  }
  const style = `
    <style>
      body{font-family:Segoe UI,Arial,sans-serif;margin:24px;color:#0f172a}
      h1{font-size:22px;margin:0 0 12px}
      p,li{font-size:12px;line-height:1.45}
      ul{margin:0 0 10px;padding-left:18px}
      .help-docs-card{border:1px solid #e2e8f0;border-radius:10px;padding:10px;margin-bottom:10px}
      .help-docs-card h4{margin:0 0 6px;font-size:14px}
      .meta{font-size:11px;color:#64748b;margin-bottom:10px}
    </style>
  `;
  const html = `
    <!doctype html>
    <html>
      <head><meta charset="utf-8" /><title>DSIS Help Guide</title>${style}</head>
      <body>
        <h1>DSIS Help & Documentation</h1>
        <div class="meta">Generated: ${new Date().toLocaleString()}</div>
        ${contentRoot.innerHTML}
      </body>
    </html>
  `;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 220);
}

window.refreshAuditLogsMenuBadge = refreshAuditLogsMenuBadge;
window.refreshCheckUpdateMenuBadge = refreshCheckUpdateMenuBadge;
window.setCheckUpdateMenuBadgeState = function(active){
  setUpdateMenuBadgeActive(Boolean(active));
  refreshCheckUpdateMenuBadge();
};

function openHelpFromMenu(){
  closeTopbarProfileMenu();
  openHelpDocsModal();
}

function openFeedbackFromMenu(){
  closeTopbarProfileMenu();
  const configuredUrl = String(localStorage.getItem('dsisFeedbackFormUrl') || window.APP_FEEDBACK_FORM_URL || '').trim();
  if (!configuredUrl || configuredUrl.includes('YOUR_FORM_ID')){
    showModal(
      'Send Feedback',
      'Feedback form is not configured yet.\nSet window.APP_FEEDBACK_FORM_URL in core-main-entry.js or localStorage key "dsisFeedbackFormUrl".'
    );
    return;
  }
  const popup = window.open(
    configuredUrl,
    'dsisFeedbackWindow',
    'popup=yes,width=980,height=760,resizable=yes,scrollbars=yes'
  );
  if (popup){
    popup.focus();
    return;
  }
  window.open(configuredUrl, '_blank', 'noopener,noreferrer');
}

function toggleAppearanceFromMenu(){
  const current = resolveCurrentThemeAccent();
  const next = isDarkThemeAccent(current) ? 'elegant-white' : 'dracula';
  currentUser = normalizeUser({
    ...currentUser,
    preferences: {
      ...currentUser.preferences,
      themeAccent: next
    }
  });
  saveCurrentUser();
  if ((schoolIdentity?.schoolId || '').trim()) upsertCurrentUserForSchool(schoolIdentity.schoolId);
  applyThemeAccent(next);
  renderUserIdentity();
  updateTopbarProfileMenuIdentity();
}

function installAppFromMenu(){
  closeTopbarProfileMenu();
  installPWAApp();
}

function checkUpdateFromMenu(){
  closeTopbarProfileMenu();
  if (typeof window.checkForPWAUpdateManual === 'function'){
    window.checkForPWAUpdateManual();
    return;
  }
  showModal('App Update', 'Update checker is still initializing. Try again in a moment.');
}

function signOutFromMenu(){
  closeTopbarProfileMenu();
  signOutSession();
}

function formatUserRoleLine(user){
  const designation = (user?.designation || '').toString().trim();
  const role = normalizeRoleLabel(user?.role || 'encoder');
  if (designation) return `${designation} (${role})`;
  return role;
}

function loadCurrentUser(){
  const parsed = safeParseJSON(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}', {});
  const user = normalizeUser(parsed);
  const legacyDensity = (localStorage.getItem('icsTableDensity') || '').toLowerCase();
  if (['comfortable', 'compact'].includes(legacyDensity)) user.preferences.tableDensity = legacyDensity;
  return user;
}

function saveCurrentUser(){
  currentUser = normalizeUser(currentUser);
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(currentUser));
}

function loadSchoolProfilesMap(){
  const parsed = safeParseJSON(localStorage.getItem(SCHOOL_PROFILES_STORAGE_KEY) || '{}', {});
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function saveSchoolProfilesMap(map){
  localStorage.setItem(SCHOOL_PROFILES_STORAGE_KEY, JSON.stringify(map || {}));
}

function getDefaultDeveloperAccountConfig(){
  const raw = window.DEFAULT_DEVELOPER_ACCOUNT;
  if (!raw || typeof raw !== 'object') return null;
  if (raw.enabled === false) return null;
  return {
    profileKey: String(raw.profileKey || 'dev-admin').trim() || 'dev-admin',
    name: String(raw.name || 'Developer').trim() || 'Developer',
    designation: String(raw.designation || 'System Developer').trim() || 'System Developer',
    role: String(raw.role || 'Admin').trim() || 'Admin',
    email: String(raw.email || 'developer@local.dsis').trim() || 'developer@local.dsis',
    password: String(raw.password || '').trim()
  };
}

function isDeveloperUser(){
  const config = getDefaultDeveloperAccountConfig();
  if (!config) return false;
  const activeKey = String(currentUser?.profileKey || sessionState?.profileKey || '').trim().toLowerCase();
  const activeEmail = String(currentUser?.email || '').trim().toLowerCase();
  return activeKey === config.profileKey.toLowerCase() || (!!activeEmail && activeEmail === config.email.toLowerCase());
}

function resolveStartViewForUser(user){
  const config = getDefaultDeveloperAccountConfig();
  const profileKey = String(user?.profileKey || '').trim().toLowerCase();
  const email = String(user?.email || '').trim().toLowerCase();
  const isDevIdentity = !!config
    && (profileKey === config.profileKey.toLowerCase() || (!!email && email === config.email.toLowerCase()));
  if (isDevIdentity) return 'Developer Tools';
  const preferred = String(user?.preferences?.defaultView || '').trim();
  return PROFILE_VIEWS.includes(preferred) ? preferred : 'Dashboard';
}

function requiresDeveloperPasswordForProfile(profileKey){
  const config = getDefaultDeveloperAccountConfig();
  if (!config || !config.password) return false;
  return String(profileKey || '').trim().toLowerCase() === config.profileKey.toLowerCase();
}

function updateLoginDeveloperPasswordVisibility(profileKey = ''){
  const wrap = document.getElementById('loginDeveloperPasswordWrap');
  const input = document.getElementById('loginDeveloperPassword');
  if (!wrap || !input) return;
  const shouldShow = requiresDeveloperPasswordForProfile(profileKey);
  wrap.style.display = shouldShow ? 'block' : 'none';
  if (!shouldShow) input.value = '';
}

function ensureDefaultDeveloperProfileForSchool(schoolId){
  const sid = normalizeSchoolId(schoolId || '');
  if (!sid) return false;
  const config = getDefaultDeveloperAccountConfig();
  if (!config) return false;
  const map = loadSchoolProfilesMap();
  const list = Array.isArray(map[sid]) ? map[sid].map((entry) => normalizeUser(entry)) : [];
  const exists = list.some((entry) => {
    const keyMatch = (entry.profileKey || '').trim().toLowerCase() === config.profileKey.toLowerCase();
    const emailMatch = (entry.email || '').trim().toLowerCase() === config.email.toLowerCase();
    return keyMatch || emailMatch;
  });
  if (exists) return false;
  const profile = normalizeUser({
    profileKey: config.profileKey,
    name: config.name,
    designation: config.designation,
    role: config.role,
    email: config.email,
    lastLogin: '',
    preferences: {
      tableDensity: 'comfortable',
      themeAccent: 'elegant-white',
      defaultView: 'Dashboard'
    }
  });
  list.push(profile);
  map[sid] = list;
  saveSchoolProfilesMap(map);
  return true;
}

function getProfilesForSchool(schoolId){
  const key = normalizeSchoolId(schoolId || '');
  if (!key) return [];
  ensureDefaultDeveloperProfileForSchool(key);
  const map = loadSchoolProfilesMap();
  const list = Array.isArray(map[key]) ? map[key] : [];
  return list.map((entry) => normalizeUser(entry));
}

function upsertCurrentUserForSchool(schoolId){
  const sid = normalizeSchoolId(schoolId || '');
  if (!sid) return;
  const map = loadSchoolProfilesMap();
  const list = Array.isArray(map[sid]) ? map[sid].map((entry) => normalizeUser(entry)) : [];
  const normalized = normalizeUser(currentUser);
  currentUser = normalized;
  const idx = list.findIndex((entry) => entry.profileKey === normalized.profileKey);
  if (idx >= 0) list[idx] = normalized;
  else list.push(normalized);
  map[sid] = list;
  saveSchoolProfilesMap(map);
}

function generateProfileKeyForSchool(name, role, email, schoolId){
  const sid = normalizeSchoolId(schoolId || '');
  const existing = new Set(getProfilesForSchool(sid).map((entry) => (entry.profileKey || '').trim()).filter(Boolean));
  const seed = `${(email || '').trim() || (name || '').trim() || 'profile'}-${(role || '').trim() || 'user'}`
    .toLowerCase()
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || 'profile-user';
  if (!existing.has(seed)) return seed;
  let n = 2;
  while (existing.has(`${seed}-${n}`)) n += 1;
  return `${seed}-${n}`;
}

function isSessionActive(){
  return !!sessionState.loggedIn
    && normalizeSchoolId(sessionState.schoolId) === normalizeSchoolId(schoolIdentity.schoolId)
    && !!(sessionState.profileKey || '').trim();
}

function loadSavedSession(){
  const parsed = safeParseJSON(localStorage.getItem(SESSION_STORAGE_KEY) || '{}', {});
  const schoolId = normalizeSchoolId(parsed.schoolId || '');
  const profileKey = (parsed.profileKey || '').toString().trim();
  const remember = parsed.remember !== false;
  return { schoolId, profileKey, remember };
}

function saveSavedSession(){
  if (!sessionState?.remember){
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    schoolId: normalizeSchoolId(sessionState.schoolId || ''),
    profileKey: (sessionState.profileKey || '').toString().trim(),
    remember: true,
    savedAt: new Date().toISOString()
  }));
}

function clearSavedSession(){
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function tryRestoreRememberedSession(){
  const saved = loadSavedSession();
  if (!saved.remember || !saved.schoolId || !saved.profileKey) return false;
  if (saved.schoolId !== normalizeSchoolId(schoolIdentity.schoolId || '')) return false;
  const selected = getProfilesForSchool(saved.schoolId).find((entry) => entry.profileKey === saved.profileKey);
  if (!selected) return false;
  currentUser = normalizeUser({ ...selected, lastLogin: new Date().toISOString() });
  saveCurrentUser();
  upsertCurrentUserForSchool(saved.schoolId);
  applyThemeAccent(currentUser.preferences?.themeAccent || 'elegant-white');
  tableDensity = (currentUser.preferences?.tableDensity || tableDensity || 'comfortable').toLowerCase();
  if (!['comfortable', 'compact'].includes(tableDensity)) tableDensity = 'comfortable';
  applyTableDensity();
  sessionState = { loggedIn: true, schoolId: saved.schoolId, profileKey: saved.profileKey, remember: true, sessionId: createSessionId() };
  saveSavedSession();
  const startView = resolveStartViewForUser(currentUser);
  goToView(startView);
  renderUserIdentity();
  renderAppLogo();
  return true;
}

function setLoginHint(message, tone = ''){
  const hint = document.getElementById('loginHint');
  if (!hint) return;
  hint.textContent = message || '';
  hint.className = `login-hint${tone ? ` ${tone}` : ''}`;
}

function renderLoginProfileOptions(){
  const schoolInput = document.getElementById('loginSchoolId');
  const select = document.getElementById('loginProfileSelect');
  const loginBtn = document.getElementById('loginSubmitBtn');
  if (!schoolInput || !select || !loginBtn) return;
  const schoolId = normalizeSchoolId(schoolInput.value || '');
  schoolInput.value = schoolId;
  const profiles = getProfilesForSchool(schoolId);
  select.innerHTML = '<option value="">Select profile</option>' + profiles.map((entry) => {
    const email = (entry.email || '').trim();
    const designation = (entry.designation || '').toString().trim();
    const accessRole = normalizeRoleLabel(entry.role || 'encoder');
    const label = `${entry.name} - ${designation || 'No Designation'} [${accessRole}]${email ? ` - ${email}` : ''}`;
    return `<option value="${escapeHTML(entry.profileKey)}">${escapeHTML(label)}</option>`;
  }).join('');
  loginBtn.disabled = profiles.length === 0;
  updateLoginDeveloperPasswordVisibility(select.value || '');
  if (!schoolId){
    setLoginHint('Enter School ID to load profiles.', '');
  } else if (!profiles.length){
    setLoginHint('No profiles found for this School ID. Click New Personnel to create one.', 'error');
  } else {
    setLoginHint(`Found ${profiles.length} profile(s). Select one and login.`, '');
  }
}

function openLoginModal(force = false){
  if (!loginOverlay) return;
  const schoolInput = document.getElementById('loginSchoolId');
  const rememberEl = document.getElementById('loginRememberDevice');
  if (schoolInput){
    schoolInput.value = normalizeSchoolId(schoolIdentity.schoolId || '');
  }
  if (rememberEl){
    const saved = loadSavedSession();
    rememberEl.checked = saved.remember !== false;
  }
  renderLoginProfileOptions();
  updateLoginDeveloperPasswordVisibility('');
  loginOverlay.classList.add('show');
  if (force){
    sessionState.loggedIn = false;
    sessionState.sessionId = '';
  }
  setTimeout(() => {
    const select = document.getElementById('loginProfileSelect');
    if (select && select.options.length > 1) select.focus();
    else schoolInput?.focus();
  }, 10);
}

function closeLoginModal(){
  if (!isSessionActive()){
    setLoginHint('Login is required to continue.', 'error');
    return;
  }
  loginOverlay?.classList?.remove('show');
}

function submitLogin(){
  const schoolInput = document.getElementById('loginSchoolId');
  const select = document.getElementById('loginProfileSelect');
  const rememberEl = document.getElementById('loginRememberDevice');
  const developerPasswordEl = document.getElementById('loginDeveloperPassword');
  const schoolId = normalizeSchoolId(schoolInput?.value || '');
  const selectedKey = (select?.value || '').trim();
  const remember = !!rememberEl?.checked;
  const configuredSchoolId = normalizeSchoolId(schoolIdentity.schoolId || '');

  if (!schoolId){
    setLoginHint('Enter School ID.', 'error');
    return;
  }
  if (schoolId !== configuredSchoolId){
    setLoginHint(`School ID mismatch. This device is locked to ${configuredSchoolId || 'configured school'}.`, 'error');
    return;
  }
  const profiles = getProfilesForSchool(schoolId);
  const selected = profiles.find((entry) => entry.profileKey === selectedKey);
  if (!selected){
    setLoginHint('Select a valid profile.', 'error');
    return;
  }
  if (requiresDeveloperPasswordForProfile(selectedKey)){
    const expectedPassword = getDefaultDeveloperAccountConfig()?.password || '';
    const inputPassword = String(developerPasswordEl?.value || '').trim();
    if (!inputPassword){
      setLoginHint('Enter developer password.', 'error');
      developerPasswordEl?.focus();
      return;
    }
    if (inputPassword !== expectedPassword){
      setLoginHint('Developer password is incorrect.', 'error');
      if (developerPasswordEl) developerPasswordEl.value = '';
      developerPasswordEl?.focus();
      return;
    }
  }
  currentUser = normalizeUser({
    ...selected,
    lastLogin: new Date().toISOString()
  });
  saveCurrentUser();
  upsertCurrentUserForSchool(schoolId);
  applyThemeAccent(currentUser.preferences?.themeAccent || 'elegant-white');
  tableDensity = (currentUser.preferences?.tableDensity || tableDensity || 'comfortable').toLowerCase();
  if (!['comfortable', 'compact'].includes(tableDensity)) tableDensity = 'comfortable';
  applyTableDensity();
  sessionState = { loggedIn: true, schoolId, profileKey: currentUser.profileKey, remember, sessionId: createSessionId() };
  saveSavedSession();
  const startView = resolveStartViewForUser(currentUser);
  goToView(startView);
  renderUserIdentity();
  setLoginHint(`Logged in as ${currentUser.name}.`, 'success');
  closeLoginModal();
  notify('success', `Logged in as ${currentUser.name}.`);
}

function loadSchoolIdentity(){
  const parsed = safeParseJSON(localStorage.getItem(SCHOOL_IDENTITY_STORAGE_KEY) || '{}', {});
  return normalizeSchoolIdentity(parsed);
}

function saveSchoolIdentity(){
  localStorage.setItem(SCHOOL_IDENTITY_STORAGE_KEY, JSON.stringify(schoolIdentity));
}

function getInitials(name){
  const tokens = (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!tokens.length) return 'CU';
  return tokens.map((t) => t[0].toUpperCase()).join('');
}

function renderUserIdentity(){
  if (topUserName) topUserName.textContent = currentUser.name || 'Custodian';
  if (topUserRole){
    const topbarRole = (currentUser.designation || '').toString().trim() || normalizeRoleLabel(currentUser.role || 'encoder');
    topUserRole.textContent = topbarRole;
  }
  if (sidebarUserName) sidebarUserName.textContent = currentUser.name || 'Custodian';
  if (sidebarUserRole) sidebarUserRole.textContent = formatUserRoleLine(currentUser);
  if (topSchoolTitle || topSchoolTitleV2){
    const schoolNameRaw = (schoolIdentity.schoolName || 'School').toString().trim() || 'School';
    const schoolIdRaw = (schoolIdentity.schoolId || '').toString().trim();
    const schoolName = escapeHTML(schoolNameRaw);
    const schoolMarkup = schoolIdRaw
      ? `<span class="school-name">${schoolName}</span><span class="school-id-chip">ID: ${escapeHTML(schoolIdRaw)}</span>`
      : `<span class="school-name">${schoolName}</span>`;
    const schoolTitle = schoolIdRaw ? `${schoolNameRaw} [ID: ${schoolIdRaw}]` : schoolNameRaw;
    if (topSchoolTitle){
      topSchoolTitle.innerHTML = schoolMarkup;
      topSchoolTitle.title = schoolTitle;
    }
    if (topSchoolTitleV2){
      topSchoolTitleV2.innerHTML = schoolMarkup;
      topSchoolTitleV2.title = schoolTitle;
    }
  }
  if (sidebarProfileBtn){
    sidebarProfileBtn.title = `Open profile for ${currentUser.name || 'Custodian'}`;
    sidebarProfileBtn.setAttribute('aria-label', `Open profile for ${currentUser.name || 'Custodian'}`);
  }
  if (topbarProfileBtn){
    topbarProfileBtn.title = `User Profile: ${currentUser.name || 'Custodian'}`;
    topbarProfileBtn.setAttribute('aria-label', `User Profile: ${currentUser.name || 'Custodian'}`);
  }
  const avatar = document.getElementById('profileAvatarPreview');
  renderUserAvatar(avatar, currentUser.name, currentUser.avatar);
  renderUserAvatar(sidebarUserAvatar, currentUser.name, currentUser.avatar);
  renderTopbarProfileAvatar(topbarUserAvatar, currentUser.topbarAvatarDataUrl || '', currentUser.name, currentUser.avatar);
  updateTopbarProfileMenuIdentity();
  if (typeof window.syncDeveloperToolsAccess === 'function') window.syncDeveloperToolsAccess();
  renderAppLogo();
}
