function animateViewEntrance(){
  const selectors = [
    '.welcome-head-item',
    '.dash-story',
    '.dash-grid',
    '.dash-panels',
    '.dash-analytics',
    '.dash-2col',
    '.dash-hero',
    '.dash-health',
    '.ics-card'
  ];
  const nodes = [...content.querySelectorAll(selectors.join(','))];
  nodes.forEach((el, idx) => {
    el.classList.remove('view-enter');
    el.style.setProperty('--enter-delay', `${Math.min(idx * 45, 260)}ms`);
    el.classList.add('view-enter');
  });
}

function resetSheetPlacement(){
  if (!sheet) return;
  sheet.style.left = '';
  sheet.style.right = '';
  sheet.style.top = '';
  sheet.style.bottom = '';
  sheet.style.transform = '';
}

function closeSheet(){
  if (!sheet) return;
  sheet.classList.remove('show');
  resetSheetPlacement();
}

function placeSheetNearAddItemButton(){
  // Keep the floating form anchored to its default bottom-centered layout.
  resetSheetPlacement();
}

function getUndoSnapshot(){
  return safeParseJSON(localStorage.getItem(UNDO_SNAPSHOT_STORAGE_KEY) || 'null', null);
}

function updateProfileUndoButtonState(){
  const btn = document.getElementById('profileTraceUndoBtn');
  if (!btn) return;
  const canManageRole = hasRoleCapability('manage_roles');
  const hasUndoSnapshot = !!getUndoSnapshot();
  btn.disabled = !canManageRole || !hasUndoSnapshot;
  btn.title = !canManageRole
    ? 'Only Admin can undo data changes.'
    : (hasUndoSnapshot ? '' : 'No undo snapshot available.');
}

function captureUndoSnapshot(reason){
  const snapshot = {
    capturedAt: new Date().toISOString(),
    reason: (reason || '').toString().trim() || 'data-change',
    actorProfileKey: getCurrentActorProfileKey(),
    data: {
      records: JSON.parse(localStorage.getItem('icsRecords') || '[]'),
      archives: getArchivedItems(),
      auditLogs: getAuditLogs(),
      notifications: Array.isArray(notifications) ? JSON.parse(JSON.stringify(notifications)) : []
    }
  };
  localStorage.setItem(UNDO_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  updateProfileUndoButtonState();
  return snapshot;
}

function renderProfileRecentDataActivity(){
  const host = document.getElementById('profileRecentDataActivity');
  if (!host) return;
  const types = new Set(['import', 'backup', 'maintenance']);
  const rows = getAuditLogs()
    .filter((log) => types.has(((log?.type || '') + '').toLowerCase()))
    .slice(-10)
    .reverse();
  if (!rows.length){
    host.textContent = 'No recent maintenance/import/export actions.';
    return;
  }
  host.innerHTML = rows.map((log) => {
    const type = escapeHTML(((log?.type || 'info') + '').toUpperCase());
    const detail = escapeHTML((log?.detail || '').toString());
    const time = escapeHTML((log?.time || '').toString());
    const actor = escapeHTML(normalizeProfileKeyValue(log?.actorProfileKey || '') || 'unknown-profile');
    const deviceId = escapeHTML((log?.actorDeviceId || 'unknown-device').toString());
    const sessionId = escapeHTML((log?.actorSessionId || 'unknown-session').toString());
    return `<div><strong>${type}</strong> ${detail}</div><div class="dm-history-time">${time} | ${actor} | ${deviceId} | ${sessionId}</div>`;
  }).join('<div style="height:6px"></div>');
}

function undoLastDataChange(){
  if (!requireAccess('manage_roles', { label: 'undo last data change' })) return;
  const snapshot = getUndoSnapshot();
  if (!snapshot || !snapshot.data){
    notify('error', 'No undo snapshot available.');
    return;
  }
  localStorage.setItem('icsRecords', JSON.stringify(Array.isArray(snapshot.data.records) ? snapshot.data.records : []));
  setArchivedItems(Array.isArray(snapshot.data.archives) ? snapshot.data.archives : []);
  setAuditLogs(Array.isArray(snapshot.data.auditLogs) ? snapshot.data.auditLogs : []);
  notifications = Array.isArray(snapshot.data.notifications) ? snapshot.data.notifications : [];
  saveNotifications();
  renderNotifications();
  localStorage.removeItem(UNDO_SNAPSHOT_STORAGE_KEY);
  updateProfileUndoButtonState();
  recordAudit('maintenance', `Undo restore applied (${snapshot.reason || 'data-change'})`);
  refreshAfterDataImport();
  renderProfileTraceIntegritySummary();
  renderProfileRecentDataActivity();
  notify('success', `Undo restore completed (${snapshot.reason || 'data-change'}).`);
}

const viewRenderers = {
  Dashboard: renderDashboardView,
  'Manage Inventory': renderInventoryView,
  'Action Center': renderActionsView,
  Archives: renderArchivesView,
  'Developer Tools': renderDeveloperToolsView
};

function getDeveloperDiagnosticsSnapshot(){
  const activeView = [...navItems].find((n) => n.classList.contains('active'))?.dataset?.view || '';
  const storageKeys = Object.keys(localStorage || {}).sort();
  return {
    capturedAt: new Date().toISOString(),
    appVersionFallback: APP_UI_VERSION_FALLBACK,
    schemaVersion: ICS_SCHEMA_VERSION,
    activeView,
    profileKey: (currentUser?.profileKey || '').toString(),
    userName: (currentUser?.name || '').toString(),
    role: normalizeRoleLabel(currentUser?.role || 'encoder'),
    isDeveloper: typeof isDeveloperUser === 'function' ? isDeveloperUser() : false,
    schoolId: normalizeSchoolId(schoolIdentity?.schoolId || ''),
    schoolName: (schoolIdentity?.schoolName || '').toString(),
    session: {
      loggedIn: !!sessionState?.loggedIn,
      remember: !!sessionState?.remember,
      sessionId: (sessionState?.sessionId || '').toString(),
      profileKey: (sessionState?.profileKey || '').toString()
    },
    counts: {
      icsRecords: JSON.parse(localStorage.getItem('icsRecords') || '[]').length,
      parRecords: JSON.parse(localStorage.getItem('parRecords') || '[]').length,
      archivedItems: JSON.parse(localStorage.getItem('icsArchivedItems') || '[]').length,
      auditLogs: JSON.parse(localStorage.getItem('icsAuditLogs') || '[]').length,
      notifications: JSON.parse(localStorage.getItem('icsNotifications') || '[]').length
    },
    localStorageKeyCount: storageKeys.length,
    localStorageKeys: storageKeys
  };
}

function renderDeveloperToolsView(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())){
    return `
      <div class="ics-card">
        <h2>Developer Tools</h2>
        <p class="card-subtext">Access denied. Developer account required.</p>
      </div>
    `;
  }
  return `
    <div class="devtools-shell">
      <div class="ics-card devtools-hero">
        <div class="devtools-hero-head">
          <div>
            <h2 style="margin:0">Developer Console</h2>
            <p class="card-subtext" style="margin:6px 0 0">Engineering diagnostics, update telemetry, and maintenance controls.</p>
          </div>
          <span class="risk-badge warn">Developer Only</span>
        </div>
      </div>

      <div class="devtools-widget-grid">
        <div class="ics-card devtools-widget">
          <div class="card-subtext">ICS Records</div>
          <div class="devtools-widget-value" id="devStatIcsCount">-</div>
        </div>
        <div class="ics-card devtools-widget">
          <div class="card-subtext">PAR Records</div>
          <div class="devtools-widget-value" id="devStatParCount">-</div>
        </div>
        <div class="ics-card devtools-widget">
          <div class="card-subtext">Archived Items</div>
          <div class="devtools-widget-value" id="devStatArchiveCount">-</div>
        </div>
        <div class="ics-card devtools-widget">
          <div class="card-subtext">Audit Logs</div>
          <div class="devtools-widget-value" id="devStatAuditCount">-</div>
        </div>
        <div class="ics-card devtools-widget">
          <div class="card-subtext">Feedback Entries</div>
          <div class="devtools-widget-value" id="devFeedbackCount">-</div>
        </div>
        <div class="ics-card devtools-widget">
          <div class="card-subtext">Last Feedback</div>
          <div class="devtools-widget-meta" id="devFeedbackLastAt">-</div>
        </div>
      </div>

      <div class="ics-card devtools-panel">
        <div class="devtools-panel-head">
          <h3 style="margin:0">Feedback Panel</h3>
          <div class="devtools-btn-row">
            <button class="btn btn-sm btn-secondary" data-action="developerRefreshQuickStats"><i data-lucide="bar-chart-3" aria-hidden="true"></i>Refresh Stats</button>
            <button class="btn btn-sm btn-secondary" data-action="developerRefreshFeedbackPanel"><i data-lucide="messages-square" aria-hidden="true"></i>Refresh Feedback</button>
          </div>
        </div>
        <p class="card-subtext" id="developerFeedbackMeta">Loading feedback feed...</p>
        <div id="developerFeedbackList" class="devtools-list"></div>
      </div>

      <div class="devtools-split">
        <div class="ics-card devtools-panel">
          <div class="devtools-panel-head">
            <h3 style="margin:0">GitHub Stats</h3>
            <button class="btn btn-sm btn-secondary" data-action="developerRefreshGitHubStats"><i data-lucide="github" aria-hidden="true"></i>Refresh GitHub</button>
          </div>
          <p class="card-subtext" id="developerGitHubMeta">Loading GitHub stats...</p>
          <div class="devtools-widget-grid compact">
            <div class="ics-card devtools-widget"><div class="card-subtext">Stars</div><div class="devtools-widget-value" id="devGhStars">-</div></div>
            <div class="ics-card devtools-widget"><div class="card-subtext">Forks</div><div class="devtools-widget-value" id="devGhForks">-</div></div>
            <div class="ics-card devtools-widget"><div class="card-subtext">Watchers</div><div class="devtools-widget-value" id="devGhWatchers">-</div></div>
            <div class="ics-card devtools-widget"><div class="card-subtext">Open Issues</div><div class="devtools-widget-value" id="devGhIssues">-</div></div>
            <div class="ics-card devtools-widget"><div class="card-subtext">Open PRs</div><div class="devtools-widget-value" id="devGhPrs">-</div></div>
            <div class="ics-card devtools-widget"><div class="card-subtext">Last Push</div><div class="devtools-widget-meta" id="devGhLastPush">-</div></div>
          </div>
          <div id="developerGitHubLinks" class="card-subtext"></div>
        </div>

        <div class="ics-card devtools-panel">
          <div class="devtools-panel-head">
            <h3 style="margin:0">App Updates</h3>
            <button class="btn btn-sm btn-secondary" data-action="developerRefreshAppUpdateWidgets"><i data-lucide="refresh-cw" aria-hidden="true"></i>Refresh Update Widgets</button>
          </div>
          <p class="card-subtext" id="developerUpdateMeta">Loading app update telemetry...</p>
          <div class="devtools-widget-grid compact">
            <div class="ics-card devtools-widget"><div class="card-subtext">Runtime Version</div><div class="devtools-widget-value" id="devUpdateRuntimeVersion">-</div></div>
            <div class="ics-card devtools-widget"><div class="card-subtext">Fallback Version</div><div class="devtools-widget-value" id="devUpdateFallbackVersion">-</div></div>
            <div class="ics-card devtools-widget"><div class="card-subtext">SW Registration</div><div class="devtools-widget-value" id="devUpdateSwRegistered">-</div></div>
            <div class="ics-card devtools-widget"><div class="card-subtext">Pending Update</div><div class="devtools-widget-value" id="devUpdatePending">-</div></div>
            <div class="ics-card devtools-widget"><div class="card-subtext">Cached Versions</div><div class="devtools-widget-meta" id="devUpdateCaches">-</div></div>
            <div class="ics-card devtools-widget"><div class="card-subtext">Display Mode</div><div class="devtools-widget-meta" id="devUpdateDisplayMode">-</div></div>
          </div>
        </div>
      </div>

      <div class="ics-card devtools-panel">
        <div class="devtools-panel-head">
          <h3 style="margin:0">Maintenance Actions</h3>
        </div>
        <div class="devtools-btn-row">
          <button class="btn btn-sm btn-secondary" data-action="developerRefreshDiagnostics"><i data-lucide="activity" aria-hidden="true"></i>Refresh Diagnostics</button>
          <button class="btn btn-sm btn-secondary" data-action="developerCopyDiagnostics"><i data-lucide="copy" aria-hidden="true"></i>Copy Diagnostics</button>
          <button class="btn btn-sm btn-secondary" data-action="developerExportWorkspaceSnapshot"><i data-lucide="download" aria-hidden="true"></i>Export Workspace Snapshot</button>
          <button class="btn btn-sm btn-secondary" data-action="developerImportWorkspaceSnapshot"><i data-lucide="upload" aria-hidden="true"></i>Import Workspace Snapshot</button>
          <button class="btn btn-sm btn-secondary" data-action="developerRunCheckUpdate"><i data-lucide="refresh-cw" aria-hidden="true"></i>Run Check Update</button>
          <button class="btn btn-sm btn-secondary" data-action="developerClearPwaCaches"><i data-lucide="trash-2" aria-hidden="true"></i>Clear PWA Cache</button>
          <button class="btn btn-sm btn-danger" data-action="developerFactoryResetWorkspace"><i data-lucide="alert-triangle" aria-hidden="true"></i>Factory Reset Local Workspace</button>
        </div>
        <input id="developerWorkspaceImportInput" type="file" accept=".json,application/json" style="display:none" />
        <p class="card-subtext" id="developerToolsStatus">Ready.</p>
      </div>

      <div class="ics-card devtools-panel">
        <div class="devtools-panel-head">
          <h3 style="margin:0">Diagnostics JSON</h3>
        </div>
        <textarea id="developerDiagnosticsText" class="stage-input devtools-diagnostics-text" readonly></textarea>
      </div>
    </div>
  `;
}

function developerRefreshQuickStats(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };
  setText('devStatIcsCount', JSON.parse(localStorage.getItem('icsRecords') || '[]').length);
  setText('devStatParCount', JSON.parse(localStorage.getItem('parRecords') || '[]').length);
  setText('devStatArchiveCount', JSON.parse(localStorage.getItem('icsArchivedItems') || '[]').length);
  setText('devStatAuditCount', JSON.parse(localStorage.getItem('icsAuditLogs') || '[]').length);
}

function formatDeveloperFeedbackTime(value){
  const ms = new Date(value || '').getTime();
  if (!Number.isFinite(ms)) return '-';
  return new Date(ms).toLocaleString();
}

async function fetchDeveloperFeedbackPayload(){
  const candidates = [
    './feedback/feedback.json',
    'feedback/feedback.json'
  ];
  let lastError = null;
  for (const url of candidates){
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload || typeof payload !== 'object') throw new Error('Invalid JSON payload.');
      return { payload, url };
    } catch (err){
      lastError = err;
    }
  }
  throw lastError || new Error('Failed to fetch feedback JSON.');
}

async function developerRefreshFeedbackPanel(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  const meta = document.getElementById('developerFeedbackMeta');
  const list = document.getElementById('developerFeedbackList');
  if (!meta || !list) return;
  meta.textContent = 'Loading feedback feed...';
  list.innerHTML = '';
  try {
    const { payload, url } = await fetchDeveloperFeedbackPayload();
    localStorage.setItem('dsisDeveloperFeedbackCache', JSON.stringify(payload));
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const count = Number(payload?.count) || items.length;
    const latest = items[0]?.timestamp || items[0]?.created_at || '';
    const categoryCounts = items.reduce((acc, row) => {
      const key = ((row?.category || 'Uncategorized') + '').trim() || 'Uncategorized';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const categorySummary = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, qty]) => `${name}: ${qty}`)
      .join(' | ');
    meta.textContent = `Total: ${count} | Updated: ${formatDeveloperFeedbackTime(payload?.generated_at)} | Source: ${url}${categorySummary ? ` | ${categorySummary}` : ''}`;
    document.getElementById('devFeedbackCount') && (document.getElementById('devFeedbackCount').textContent = String(count));
    document.getElementById('devFeedbackLastAt') && (document.getElementById('devFeedbackLastAt').textContent = formatDeveloperFeedbackTime(latest || payload?.generated_at));

    if (!items.length){
      list.innerHTML = '<div class="card-subtext">No feedback entries yet.</div>';
      return;
    }
    list.innerHTML = items.slice(0, 8).map((row, idx) => {
      const category = escapeHTML((row?.category || 'Uncategorized').toString());
      const summary = escapeHTML((row?.summary || row?.title || '(No summary)').toString());
      const details = escapeHTML((row?.details || '').toString());
      const stamp = formatDeveloperFeedbackTime(row?.timestamp || row?.created_at || row?.updated_at || '');
      return `
        <div class="ics-card" style="margin:0;padding:10px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
            <strong>#${idx + 1} ${summary}</strong>
            <span class="risk-badge ok">${category}</span>
          </div>
          <div class="card-subtext" style="margin-top:4px">${stamp}</div>
          ${details ? `<div style="margin-top:6px">${details}</div>` : ''}
        </div>
      `;
    }).join('');
  } catch (err){
    const cached = safeParseJSON(localStorage.getItem('dsisDeveloperFeedbackCache') || 'null', null);
    const cachedItems = Array.isArray(cached?.items) ? cached.items : [];
    if (cachedItems.length){
      meta.textContent = `Live fetch failed (${err?.message || 'unknown error'}). Showing cached feedback (${cachedItems.length}).`;
      document.getElementById('devFeedbackCount') && (document.getElementById('devFeedbackCount').textContent = String(cachedItems.length));
      document.getElementById('devFeedbackLastAt') && (document.getElementById('devFeedbackLastAt').textContent = formatDeveloperFeedbackTime(cachedItems[0]?.timestamp || cached?.generated_at));
      list.innerHTML = cachedItems.slice(0, 8).map((row, idx) => {
        const category = escapeHTML((row?.category || 'Uncategorized').toString());
        const summary = escapeHTML((row?.summary || row?.title || '(No summary)').toString());
        const details = escapeHTML((row?.details || '').toString());
        const stamp = formatDeveloperFeedbackTime(row?.timestamp || row?.created_at || row?.updated_at || '');
        return `
          <div class="ics-card" style="margin:0;padding:10px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
              <strong>#${idx + 1} ${summary}</strong>
              <span class="risk-badge ok">${category}</span>
            </div>
            <div class="card-subtext" style="margin-top:4px">${stamp}</div>
            ${details ? `<div style="margin-top:6px">${details}</div>` : ''}
          </div>
        `;
      }).join('');
      return;
    }
    const protocolHint = location.protocol === 'file:' ? 'Run app through a local/dev server or deployment (not file://).' : 'Ensure `feedback/feedback.json` is deployed and reachable.';
    meta.textContent = `Failed to load feedback feed (${err?.message || 'unknown error'}).`;
    list.innerHTML = `<div class="card-subtext">${protocolHint}</div>`;
    document.getElementById('devFeedbackCount') && (document.getElementById('devFeedbackCount').textContent = '0');
    document.getElementById('devFeedbackLastAt') && (document.getElementById('devFeedbackLastAt').textContent = '-');
  }
}

function formatDeveloperNumber(value){
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString() : '-';
}

function setDeveloperGitHubStat(id, value){
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
}

async function fetchGitHubJson(url){
  const token = String(localStorage.getItem('dsisGitHubToken') || '').trim();
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, {
    headers,
    cache: 'no-store'
  });
  if (!response.ok){
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    const rateInfo = remaining === '0' ? ` | Rate limit reset at ${formatDeveloperFeedbackTime(Number(reset) * 1000)}` : '';
    throw new Error(`HTTP ${response.status}${rateInfo}`);
  }
  return response.json();
}

function resolveDeveloperGitHubRepo(){
  const fromStorage = String(localStorage.getItem('dsisGitHubRepo') || '').trim();
  if (fromStorage.includes('/')) return fromStorage;
  const configured = String(window.APP_GITHUB_REPO || '').trim();
  if (configured.includes('/')) return configured;
  const host = String(location.hostname || '').toLowerCase();
  const path = String(location.pathname || '').replace(/^\/+/, '');
  if (host.endsWith('.github.io')){
    const owner = host.split('.github.io')[0];
    const repo = path.split('/').filter(Boolean)[0] || '';
    if (owner && repo) return `${owner}/${repo}`;
  }
  return '';
}

async function developerRefreshGitHubStats(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  const meta = document.getElementById('developerGitHubMeta');
  const links = document.getElementById('developerGitHubLinks');
  const repo = resolveDeveloperGitHubRepo();
  if (!meta) return;
  if (!repo || !repo.includes('/')){
    meta.textContent = 'GitHub repo not configured. Set window.APP_GITHUB_REPO (or localStorage dsisGitHubRepo) to "owner/repo".';
    return;
  }
  meta.textContent = `Loading GitHub stats for ${repo}...`;
  setDeveloperGitHubStat('devGhStars', '-');
  setDeveloperGitHubStat('devGhForks', '-');
  setDeveloperGitHubStat('devGhWatchers', '-');
  setDeveloperGitHubStat('devGhIssues', '-');
  setDeveloperGitHubStat('devGhPrs', '-');
  setDeveloperGitHubStat('devGhLastPush', '-');
  try {
    const repoData = await fetchGitHubJson(`https://api.github.com/repos/${repo}`);
    const [prs, release, runs] = await Promise.all([
      fetchGitHubJson(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=1`).catch(() => []),
      fetchGitHubJson(`https://api.github.com/repos/${repo}/releases/latest`).catch(() => null),
      fetchGitHubJson(`https://api.github.com/repos/${repo}/actions/runs?per_page=1`).catch(() => null)
    ]);
    const openIssueCount = Math.max(0, Number(repoData.open_issues_count || 0) - (Array.isArray(prs) ? prs.length : 0));
    setDeveloperGitHubStat('devGhStars', formatDeveloperNumber(repoData.stargazers_count));
    setDeveloperGitHubStat('devGhForks', formatDeveloperNumber(repoData.forks_count));
    setDeveloperGitHubStat('devGhWatchers', formatDeveloperNumber(repoData.subscribers_count ?? repoData.watchers_count));
    setDeveloperGitHubStat('devGhIssues', formatDeveloperNumber(openIssueCount));
    setDeveloperGitHubStat('devGhPrs', formatDeveloperNumber(Array.isArray(prs) ? prs.length : 0));
    setDeveloperGitHubStat('devGhLastPush', formatDeveloperFeedbackTime(repoData.pushed_at));
    const lastRun = Array.isArray(runs?.workflow_runs) && runs.workflow_runs.length ? runs.workflow_runs[0] : null;
    const runText = lastRun ? `${lastRun.status || ''}${lastRun.conclusion ? `/${lastRun.conclusion}` : ''}` : 'n/a';
    const releaseText = release?.tag_name ? `Latest release: ${release.tag_name}` : 'Latest release: n/a';
    meta.textContent = `${repo} | Default branch: ${repoData.default_branch || '-'} | ${releaseText} | Latest workflow: ${runText}`;
    if (links){
      links.innerHTML = `
        <a href="${escapeHTML(repoData.html_url || `https://github.com/${repo}`)}" target="_blank" rel="noopener noreferrer">Open Repository</a>
        ${lastRun?.html_url ? ` | <a href="${escapeHTML(lastRun.html_url)}" target="_blank" rel="noopener noreferrer">Latest Workflow Run</a>` : ''}
      `;
    }
  } catch (err){
    const tokenHint = String(localStorage.getItem('dsisGitHubToken') || '').trim()
      ? ''
      : ' If repo is private, set localStorage key dsisGitHubToken with a GitHub PAT (read-only).';
    meta.textContent = `Failed to load GitHub stats for ${repo} (${err?.message || 'unknown error'}).${tokenHint}`;
    if (links) links.textContent = '';
  }
}

async function developerRefreshAppUpdateWidgets(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };
  const meta = document.getElementById('developerUpdateMeta');
  if (meta) meta.textContent = 'Loading app update telemetry...';

  const fallbackVersion = APP_UI_VERSION_FALLBACK || '-';
  let runtimeVersion = '-';
  let swRegistered = 'No';
  let pendingUpdate = 'No';
  let cachesText = '-';
  const displayMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    ? 'standalone'
    : 'browser';

  try {
    if (typeof getRuntimeAppVersion === 'function'){
      runtimeVersion = await getRuntimeAppVersion();
    }
  } catch (_err){
    runtimeVersion = fallbackVersion;
  }

  try {
    if ('serviceWorker' in navigator){
      const reg = await navigator.serviceWorker.getRegistration('./') || await navigator.serviceWorker.getRegistration();
      if (reg){
        swRegistered = 'Yes';
        const hasWaiting = !!reg.waiting;
        const hasInstalling = !!reg.installing;
        const badgePending = String(localStorage.getItem('dsisPwaUpdateBadgeState') || '') === '1';
        pendingUpdate = hasWaiting || hasInstalling || badgePending ? 'Yes' : 'No';
      }
    }
  } catch (_err){
    swRegistered = 'Error';
  }

  try {
    if ('caches' in window){
      const keys = await caches.keys();
      cachesText = keys.length ? keys.join(', ') : 'none';
    }
  } catch (_err){
    cachesText = 'unavailable';
  }

  setText('devUpdateRuntimeVersion', runtimeVersion || '-');
  setText('devUpdateFallbackVersion', fallbackVersion || '-');
  setText('devUpdateSwRegistered', swRegistered);
  setText('devUpdatePending', pendingUpdate);
  setText('devUpdateCaches', cachesText);
  setText('devUpdateDisplayMode', displayMode);
  if (meta){
    meta.textContent = `Last refresh: ${new Date().toLocaleString()} | Update-ready badge state: ${String(localStorage.getItem('dsisPwaUpdateBadgeState') || '0')}`;
  }
}

function setDeveloperToolsStatus(message, tone = 'info'){
  const status = document.getElementById('developerToolsStatus');
  if (!status) return;
  const safe = (message || '').toString().trim() || 'Ready.';
  const color = tone === 'error' ? '#ef4444' : (tone === 'success' ? '#16a34a' : 'var(--tm,#64748b)');
  status.textContent = safe;
  status.style.color = color;
}

function developerRefreshDiagnostics(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  const out = document.getElementById('developerDiagnosticsText');
  if (!out) return;
  const snapshot = getDeveloperDiagnosticsSnapshot();
  out.value = JSON.stringify(snapshot, null, 2);
  setDeveloperToolsStatus('Diagnostics refreshed.', 'success');
}

async function developerCopyDiagnostics(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  const out = document.getElementById('developerDiagnosticsText');
  const value = (out?.value || '').toString().trim();
  if (!value){
    developerRefreshDiagnostics();
  }
  const text = ((out?.value || '').toString() || JSON.stringify(getDeveloperDiagnosticsSnapshot(), null, 2)).trim();
  try {
    await navigator.clipboard.writeText(text);
    setDeveloperToolsStatus('Diagnostics copied to clipboard.', 'success');
    notify('success', 'Diagnostics copied.');
  } catch (_err){
    setDeveloperToolsStatus('Clipboard copy failed.', 'error');
    notify('error', 'Unable to copy diagnostics in this browser context.');
  }
}

function developerExportWorkspaceSnapshot(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  const localState = {};
  Object.keys(localStorage || {}).forEach((key) => {
    localState[key] = localStorage.getItem(key);
  });
  const payload = {
    exportedAt: new Date().toISOString(),
    source: 'developer-tools',
    appVersion: APP_UI_VERSION_FALLBACK,
    schemaVersion: ICS_SCHEMA_VERSION,
    localStorage: localState
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `dsis-dev-workspace-${stamp}.json`;
  if (typeof downloadJSONPayload === 'function'){
    downloadJSONPayload(payload, fileName);
  } else {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  setDeveloperToolsStatus('Workspace snapshot exported.', 'success');
}

function developerImportWorkspaceSnapshot(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  const input = document.getElementById('developerWorkspaceImportInput');
  if (!input) return;
  input.value = '';
  input.click();
}

function handleDeveloperWorkspaceImportFile(file){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result || '{}');
      const map = parsed?.localStorage;
      if (!map || typeof map !== 'object'){
        throw new Error('Invalid snapshot: missing localStorage map.');
      }
      showConfirm(
        'Import Workspace Snapshot',
        'This will replace current local workspace data and reload the app.\nContinue?',
        () => {
          localStorage.clear();
          Object.keys(map).forEach((key) => {
            if (typeof map[key] !== 'string') return;
            localStorage.setItem(key, map[key]);
          });
          setDeveloperToolsStatus('Snapshot imported. Reloading...', 'success');
          notify('success', 'Workspace snapshot imported.');
          setTimeout(() => location.reload(), 120);
        },
        'Import & Reload'
      );
    } catch (err){
      setDeveloperToolsStatus('Failed to import snapshot.', 'error');
      notify('error', err?.message || 'Invalid workspace snapshot file.');
    }
  };
  reader.onerror = () => {
    setDeveloperToolsStatus('Failed to read snapshot file.', 'error');
    notify('error', 'Unable to read selected snapshot file.');
  };
  reader.readAsText(file);
}

async function developerClearPwaCaches(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  try {
    if ('caches' in window){
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    if ('serviceWorker' in navigator){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
    setDeveloperToolsStatus('PWA caches cleared. Reload recommended.', 'success');
    notify('success', 'PWA cache cleared. Reload app to re-register service worker.');
  } catch (_err){
    setDeveloperToolsStatus('Failed to clear PWA cache.', 'error');
    notify('error', 'Unable to clear PWA cache in this browser context.');
  }
}

function developerRunCheckUpdate(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  if (typeof window.checkForPWAUpdateManual === 'function'){
    window.checkForPWAUpdateManual();
    setDeveloperToolsStatus('Running manual update check...', 'info');
  }
}

function developerFactoryResetWorkspace(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  showConfirm(
    'Factory Reset Local Workspace',
    'This will delete all local app data on this device and reload.\nThis cannot be undone.',
    async () => {
      try {
        if ('serviceWorker' in navigator){
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((reg) => reg.unregister().catch(() => false)));
        }
      } catch (_err){}

      try {
        if ('caches' in window){
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch (_err){}

      try { localStorage.clear(); } catch (_err){}
      try { sessionStorage.clear(); } catch (_err){}

      const nextUrl = new URL(location.href);
      nextUrl.searchParams.set('factory_reset', Date.now().toString());
      location.replace(nextUrl.toString());
    },
    'Reset Workspace'
  );
}

function initDeveloperToolsView(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  const input = document.getElementById('developerWorkspaceImportInput');
  if (input && !input.dataset.bound){
    input.addEventListener('change', (event) => {
      const file = event?.target?.files?.[0];
      handleDeveloperWorkspaceImportFile(file);
    });
    input.dataset.bound = '1';
  }
  developerRefreshQuickStats();
  developerRefreshFeedbackPanel();
  developerRefreshGitHubStats();
  developerRefreshAppUpdateWidgets();
  developerRefreshDiagnostics();
}

function renderView(key){
  const renderer = viewRenderers[key];
  if (!renderer) return;
  if (typeof syncTopbarViewButtons === 'function') syncTopbarViewButtons(key);
  content.setAttribute('data-view', key);
  content.innerHTML = renderer();
  if (key === 'Manage Inventory') {
    fab.style.display = 'grid';
    renderStageEmptyState();
    setStageContext(getCurrentFormMeta());
    loadICSRecords();
    if (sheet.classList.contains('show')){
      setTimeout(placeSheetNearAddItemButton, 30);
    }
  } else {
    fab.style.display = 'none';
    closeSheet();
    if (key === 'Dashboard') initDashboardView();
    if (key === 'Action Center') initActionsView();
    if (key === 'Archives') initArchivesView();
    if (key === 'Developer Tools') initDeveloperToolsView();
  }
  requestAnimationFrame(() => animateViewEntrance());
}

function toggleSheet(){
  if (!requireAccess('open_ics_editor')) return;
  const isOpen = sheet.classList.contains('show');
  if (isOpen){
    closeSheet();
    return;
  }
  sheet.classList.add('show');
  if (editingIndex === null) prepareNewICS();
  requestAnimationFrame(placeSheetNearAddItemButton);
  setTimeout(placeSheetNearAddItemButton, 70);
  setTimeout(placeSheetNearAddItemButton, 220);
}

function renderAppLogo(){
  if (!appLogo) return;
  const logo = sanitizeSchoolLogoDataUrl(schoolIdentity.logoDataUrl || '');
  if (logo){
    appLogo.style.backgroundImage = `url("${logo}")`;
    appLogo.classList.add('has-image');
    appLogo.textContent = '';
    appLogo.title = 'School logo';
    return;
  }
  appLogo.style.backgroundImage = '';
  appLogo.classList.remove('has-image');
  appLogo.textContent = getSchoolShortLabel(schoolIdentity.schoolName || '');
  appLogo.title = 'School initials';
}

function getCurrentActorProfileKey(){
  return normalizeProfileKeyValue(currentUser?.profileKey || sessionState?.profileKey || '') || 'unknown-profile';
}

function initArchivesView(){
  const canArchive = hasRoleCapability('archive_items');
  const body = document.getElementById('archiveBody');
  if (!body) return;
  const allArchived = getArchivedItems();
  const archived = allArchived.filter((a) => {
    if (!archivesFilterIcs) return true;
    return normalizeICSKey(a.source?.icsNo || '') === normalizeICSKey(archivesFilterIcs);
  });
  if (!archived.length){
    body.innerHTML = '<tr><td class="empty-cell" colspan="10">No archived items yet.</td></tr>';
    return;
  }
  body.innerHTML = archived.map((a, idx) => {
    const realIdx = allArchived.findIndex((entry) => entry === a);
    const actionIdx = realIdx >= 0 ? realIdx : idx;
    const hasArchivedWmr = !!(a?.item?.wasteReport?.preparedAt);
    const sourceType = (a?.source?.sourceType || 'ics').toString().toLowerCase() === 'par' ? 'par' : 'ics';
    const sourceNo = (a?.source?.icsNo || '').toString();
    const sourceDisplay = `${sourceType === 'par' ? 'PAR' : 'ICS'}-${sourceNo}`;
    const sourceNoClass = sourceType === 'par' ? 'source-no-par' : 'source-no-ics';
    return `
    <tr>
      <td>${idx + 1}</td>
      <td>${(a.archivedAt || '').slice(0,10)}</td>
      <td><button class="ics-link-btn source-no-link ${sourceNoClass}" data-action="openArchivedItemHistory" data-arg1="${actionIdx}">${sourceDisplay}</button></td>
      <td>${a.item?.desc || ''}</td>
      <td>${a.item?.itemNo || ''}</td>
      <td style="text-align:center">${a.item?.eul ?? ''}</td>
      <td style="text-align:center"><span class="risk-badge ${a.disposal?.status === 'approved' ? 'ok' : 'warn'}">${a.disposal?.status === 'approved' ? 'Approved' : 'Not Approved'}</span></td>
      <td>${a.disposal?.approvedBy || '-'}</td>
      <td>${a.disposal?.remarks || '-'}</td>
      <td style="text-align:center">
        <button class="btn btn-sm btn-secondary btn-icon icon-only-btn" title="${hasArchivedWmr ? 'Print Waste Materials Report' : 'No prepared Waste Materials metadata'}" aria-label="Print Waste Materials Report" data-action="printWasteMaterialsReportArchived" data-arg1="${actionIdx}" ${canArchive && hasArchivedWmr ? '' : 'disabled'}><i data-lucide="printer" aria-hidden="true"></i></button>
        <button class="btn btn-sm btn-secondary btn-icon icon-only-btn" title="Unarchive Item" aria-label="Unarchive Item" data-action="unarchiveItem" data-arg1="${actionIdx}" ${canArchive ? '' : 'disabled'}><i data-lucide="undo-2" aria-hidden="true"></i></button>
      </td>
    </tr>
  `;
  }).join('');
}

function initActionsView(){
  eulCurrentPage = 1;
  const icsRecords = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const parRecords = JSON.parse(localStorage.getItem('parRecords') || '[]');
  let c = 0;
  let w = 0;
  let g = 0;
  eulActionRows = [];

  const pushRowsFromRecordSet = (records, sourceType) => {
    records.forEach((r, sourceIndex) => {
      const sourceNo = sourceType === 'par'
        ? ((r.parNo || r.icsNo || '').toString())
        : ((r.icsNo || '').toString());
      if (!sourceNo.trim()) return;
      const sourceNoDisplay = `${sourceType === 'par' ? 'PAR' : 'ICS'}-${sourceNo}`;
      (r.items || []).forEach((it) => {
        const s = classifyEULItem(r, it);
        if (s.code === 'past') c += 1;
        else if (s.code === 'near') w += 1;
        else g += 1;
        if (s.code === 'ok') return;
        const inspections = Array.isArray(it.inspections) ? it.inspections : [];
        const lastInspection = inspections.length ? inspections[inspections.length - 1] : null;
        eulActionRows.push({
          sourceType,
          sourceIndex,
          sourceNo,
          sourceNoDisplay,
          icsNo: sourceNo,
          entity: r.entity || '',
          desc: it.desc || '',
          itemNo: it.itemNo || '',
          eulDays: computeEULDaysLeft(r, it),
          status: s.status,
          cls: s.cls,
          code: s.code,
          inspection: lastInspection
        });
      });
    });
  };

  pushRowsFromRecordSet(icsRecords, 'ics');
  pushRowsFromRecordSet(parRecords, 'par');

  eulActionRows.sort((a, b) => {
    const rank = (x) => x.code === 'past' ? 0 : 1;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if ((a.sourceType || '') !== (b.sourceType || '')) return (a.sourceType || '').localeCompare(b.sourceType || '');
    return (a.sourceNo || '').localeCompare(b.sourceNo || '');
  });

  const validKeys = new Set(eulActionRows.map((r) => `${r.sourceType || 'ics'}||${r.icsNo || ''}||${r.itemNo || ''}`));
  Object.keys(actionCenterSelectedKeys || {}).forEach((k) => {
    if (!validKeys.has(k)) delete actionCenterSelectedKeys[k];
  });

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
  set('eulCritical', c);
  set('eulWarning', w);
  set('eulGood', g);
  renderEULPage();
  bindInspectionModalValidation();
}

function renderEULPage(){
  const canArchive = hasRoleCapability('archive_items');
  const body = document.getElementById('eulBody');
  if (!body) return;
  const rows = actionCenterFilter === 'near'
    ? eulActionRows.filter((r) => r.code === 'near')
    : actionCenterFilter === 'past'
      ? eulActionRows.filter((r) => r.code === 'past')
      : eulActionRows;
  const bySource = actionCenterSourceFilter
    ? rows.filter((r) => ((r.sourceType || 'ics').toString().toLowerCase() === actionCenterSourceFilter))
    : rows;
  const scoped = actionCenterICSFilter
    ? bySource.filter((r) => normalizeICSKey(r.icsNo || '') === normalizeICSKey(actionCenterICSFilter))
    : bySource;
  const targeted = actionCenterItemFilter
    ? scoped.filter((r) => normalizeICSKey(r.itemNo || '') === normalizeICSKey(actionCenterItemFilter))
    : scoped;
  body.innerHTML = targeted.length ? targeted.map((row, idx) => {
    const isTargeted = !!actionCenterItemFilter
      && normalizeICSKey(row.itemNo || '') === normalizeICSKey(actionCenterItemFilter)
      && (!actionCenterICSFilter || normalizeICSKey(row.icsNo || '') === normalizeICSKey(actionCenterICSFilter))
      && (!actionCenterSourceFilter || ((row.sourceType || 'ics').toString().toLowerCase() === actionCenterSourceFilter));
    const targetBadge = isTargeted ? '<span class="risk-badge warn">Target</span>' : '';
    const insp = row.inspection
      ? (row.inspection.status === 'unserviceable'
        ? '<span class="risk-badge danger">Unserviceable</span>'
        : '<span class="risk-badge ok">Serviceable</span>')
      : '<span class="card-subtext">Not inspected</span>';
    const reason = (row.inspection?.reason || '').toString().trim();
    const rawRemarks = (row.inspection?.remarks || '').toString().trim();
    const inferredRemarks = (typeof getUnserviceableRemarksText === 'function' && reason)
      ? (getUnserviceableRemarksText(reason)[0] || '')
      : '';
    const remarks = rawRemarks || inferredRemarks;
    const inspectionStatus = (row.inspection?.status || '').toString().trim().toLowerCase();
    const isUnserviceableInspection = inspectionStatus === 'unserviceable';
    const hasInspectionRemarks = !!remarks;
    const isPARSource = (row.sourceType || 'ics') === 'par';
    const canArchiveRow = !!(canArchive && isUnserviceableInspection && hasInspectionRemarks);
    const archiveDisabledAttr = canArchiveRow
      ? ''
      : (!canArchive
        ? 'disabled title="Requires Encoder/Admin role"'
        : (!isUnserviceableInspection
          ? 'disabled title="Requires Unserviceable inspection first"'
          : 'disabled title="Requires Inspection Remarks first"'));
    const sourceTypeArg = escapeHTML((row.sourceType || 'ics').replace(/"/g, '&quot;'));
    const safeSourceNo = escapeHTML((row.icsNo || '').replace(/"/g, '&quot;'));
    const safeItemNo = escapeHTML((row.itemNo || '').replace(/"/g, '&quot;'));
    const detailsAction = isPARSource ? 'openPARDetailsByIndex' : 'openICSDetailsByKey';
    const detailsArg1 = isPARSource ? String(Number(row.sourceIndex) || 0) : safeSourceNo;
    const sourceNoClass = isPARSource ? 'source-no-par' : 'source-no-ics';
    return `<tr class="${isTargeted ? 'targeted-row' : ''}">
      <td>${idx + 1}</td>
      <td><button class="ics-link-btn source-no-link ${sourceNoClass}" data-action="${detailsAction}" data-arg1="${detailsArg1}" data-arg2="${isPARSource ? '' : safeItemNo}">${escapeHTML(row.sourceNoDisplay || row.icsNo || '')}</button></td>
      <td>${row.desc}</td>
      <td style="text-align:center">${row.eulDays === '' ? '' : row.eulDays}</td>
      <td style="text-align:center"><span class="${row.cls}">${row.status}</span></td>
      <td style="text-align:center">${insp}</td>
      <td>${remarks ? escapeHTML(remarks) : '<span class="card-subtext">-</span>'}</td>
      <td style="text-align:center">
        <div class="actions-eul-actions">
          ${targetBadge}
          <select class="stage-input action-select" data-action-change="onInspectionChange" data-arg1="${safeSourceNo}" data-arg2="${safeItemNo}" data-arg3="${sourceTypeArg}" ${canArchive ? '' : 'disabled title="Requires Encoder/Admin role"'}>
            <option value="">Select</option>
            <option value="serviceable">Serviceable</option>
            <option value="unserviceable">Unserviceable</option>
          </select>
          <button class="btn btn-sm btn-secondary btn-icon icon-only-btn" title="Inspection History" aria-label="Inspection History" data-action="openInspectionHistory" data-arg1="${safeSourceNo}" data-arg2="${safeItemNo}" data-arg3="${sourceTypeArg}"><i data-lucide="history" aria-hidden="true"></i></button>
          <span class="actions-eul-divider" aria-hidden="true"></span>
          <button class="btn btn-sm btn-secondary btn-icon icon-only-btn" title="Archive Item" aria-label="Archive Item" data-action="openArchiveModal" data-arg1="${safeSourceNo}" data-arg2="${safeItemNo}" data-arg3="${sourceTypeArg}" ${archiveDisabledAttr}><i data-lucide="archive" aria-hidden="true"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="8" class="empty-cell">No items for current filter.</td></tr>';
}

function openEULCenter(){
  initActionsView();
}

function closeEULCenter(){
  // EUL center is now rendered inline in Action Center view.
}
