// ===== STATE =====
const navItems = document.querySelectorAll('.nav .item');
const fab = document.querySelector('.fab');
const content = document.getElementById('content');
const sheet = document.getElementById('sheet');
const addBtn = document.querySelector('.add-btn');
const icsNoInput = document.getElementById('icsNo');
const formAlert = document.getElementById('formAlert');
const searchBtn = document.getElementById('searchBtn');
const dataManagerBtn = document.getElementById('dataManagerBtn');
const mobileProfileBtn = document.getElementById('mobileProfileBtn');
const bottomNewIcsBtn = document.getElementById('bottomNewIcsBtn');
const searchOverlay = document.getElementById('searchOverlay');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const notifBellBtn = document.getElementById('notifBellBtn');
const notifPanel = document.getElementById('notifPanel');
const notifBadge = document.getElementById('notifBadge');
const sidebarProfileBtn = document.getElementById('sidebarProfileBtn');
const sidebarSignOutIconBtn = document.getElementById('sidebarSignOutIconBtn');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const installAppBtn = document.getElementById('installAppBtn');
const updateAppBtn = document.getElementById('updateAppBtn');
const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
const sidebarUserName = document.getElementById('sidebarUserName');
const sidebarUserRole = document.getElementById('sidebarUserRole');
const appLogo = document.getElementById('appLogo');
const brandSub = document.getElementById('brandSub');
const setupOverlay = document.getElementById('setupOverlay');
const loginOverlay = document.getElementById('loginOverlay');
const profileOverlay = document.getElementById('profileOverlay');
const dataHubOverlay = document.getElementById('dataHubOverlay');
const dataImportOverlay = document.getElementById('dataImportOverlay');
const dataValidationOverlay = document.getElementById('dataValidationOverlay');
const dataExportOverlay = document.getElementById('dataExportOverlay');
const dataManagerImportInput = document.getElementById('dataManagerImportInput');
const dataManagerValidateInput = document.getElementById('dataManagerValidateInput');
const topSchoolTitle = document.getElementById('topSchoolTitle');
const topSchoolTitleV2 = document.getElementById('topSchoolTitleV2');
const topUserName = document.getElementById('topUserName');
const topUserRole = document.getElementById('topUserRole');
let editingIndex = null;
let notifications = JSON.parse(localStorage.getItem('icsNotifications') || '[]');
let stageDescToUnits = {};
let pendingConfirmAction = null;
let searchActiveIndex = -1;
let searchMatches = [];
let eulActionRows = [];
let eulCurrentPage = 1;
const eulPageSize = 10;
let actionCenterFilter = 'all';
let actionCenterICSFilter = '';
let actionCenterItemFilter = '';
let actionCenterSelectedKeys = {};
let inventoryFilter = 'all';
let archivesFilterIcs = '';
let pendingInspection = null;
let pendingArchiveTarget = null;
let pendingWasteReportTarget = null;
let pendingWasteReportRows = [];
let wmrBatchPrintMode = false;
let wmrBatchPrintArchivedIndexes = [];
let currentICSDetailsContext = { recordIndex: null, icsNo: '', hasLiveRecord: false };
let profilePreviewOriginalTheme = '';
let profileDraftSchoolLogoDataUrl = '';
let schoolSetupEnforced = false;
let setupWizardEnforced = false;
let setupMode = 'initial';
let sessionState = { loggedIn: false, schoolId: '', profileKey: '', remember: false, sessionId: '' };
let deferredInstallPrompt = null;
let dataManagerState = {
  sourceName: '',
  mode: 'merge',
  summary: null,
  parsedPayload: null,
  conflicts: [],
  verification: null,
  migrationRows: []
};
const ICS_SCHEMA_VERSION = '4.0.0';
const APP_UI_VERSION_FALLBACK = '4.0';
const SIDEBAR_COLLAPSE_STORAGE_KEY = 'icsSidebarCollapsed';
const PROFILE_VIEWS = ['Dashboard', 'Manage Inventory', 'Action Center', 'Archives'];
const DEFAULT_DESIGNATIONS = ['Inventory Officer'];
const ACCENT_THEMES = {
  playful: {
    a: '#f97316',
    as: '#fff2e8',
    ah: '#c2410c',
    bg: '#fffaf5',
    m: '#ffe4cf',
    t: '#431407',
    tm: '#9a3412',
    border: '#fed7aa',
    sidebarBg: 'linear-gradient(180deg,#fff7ed 0%,#fffbeb 100%)',
    topbarBg: 'rgba(255,247,237,.92)',
    iconBtnBg: '#fff8f2',
    iconBtnText: '#9a3412',
    iconBtnBorder: '#fdba74',
    modalBg: '#fffaf5',
    modalBorder: '#fdba74',
    modalHeadBg: 'linear-gradient(180deg,#fff2e8 0%,#ffedd5 100%)',
    modalHeadBorder: '#fed7aa',
    modalFootBg: 'rgba(255,250,245,.96)',
    modalFootBorder: '#fed7aa',
    btnAddBg: '#ffedd5',
    btnAddText: '#9a3412',
    btnPrimaryBg: '#f97316',
    btnPrimaryText: '#fff7ed',
    btnDelBg: '#fee2e2',
    btnDelText: '#991b1b',
    btnSecondaryBg: '#ffedd5',
    btnSecondaryText: '#9a3412'
  },
  'playful-coral': {
    a: '#ef4444',
    as: '#fff1f2',
    ah: '#be123c',
    bg: '#fff7f7',
    m: '#ffe4e6',
    t: '#4c0519',
    tm: '#9f1239',
    border: '#fecdd3',
    sidebarBg: 'linear-gradient(180deg,#fff5f6 0%,#fff1f2 100%)',
    topbarBg: 'rgba(255,245,246,.92)',
    iconBtnBg: '#fff7f8',
    iconBtnText: '#9f1239',
    iconBtnBorder: '#fda4af',
    modalBg: '#fff8f8',
    modalBorder: '#fda4af',
    modalHeadBg: 'linear-gradient(180deg,#fff1f2 0%,#ffe4e6 100%)',
    modalHeadBorder: '#fecdd3',
    modalFootBg: 'rgba(255,248,248,.96)',
    modalFootBorder: '#fecdd3',
    btnAddBg: '#ffe4e6',
    btnAddText: '#be123c',
    btnPrimaryBg: '#ef4444',
    btnPrimaryText: '#fff1f2',
    btnDelBg: '#fee2e2',
    btnDelText: '#991b1b',
    btnSecondaryBg: '#ffe4e6',
    btnSecondaryText: '#9f1239'
  },
  'playful-mint': {
    a: '#14b8a6',
    as: '#ecfeff',
    ah: '#0f766e',
    bg: '#f4fffb',
    m: '#dcfce7',
    t: '#042f2e',
    tm: '#0f766e',
    border: '#99f6e4',
    sidebarBg: 'linear-gradient(180deg,#f0fdfa 0%,#ecfeff 100%)',
    topbarBg: 'rgba(240,253,250,.92)',
    iconBtnBg: '#f0fdfa',
    iconBtnText: '#0f766e',
    iconBtnBorder: '#99f6e4',
    modalBg: '#f7fffd',
    modalBorder: '#99f6e4',
    modalHeadBg: 'linear-gradient(180deg,#ecfeff 0%,#ccfbf1 100%)',
    modalHeadBorder: '#99f6e4',
    modalFootBg: 'rgba(247,255,253,.96)',
    modalFootBorder: '#99f6e4',
    btnAddBg: '#ccfbf1',
    btnAddText: '#0f766e',
    btnPrimaryBg: '#14b8a6',
    btnPrimaryText: '#ecfeff',
    btnDelBg: '#fee2e2',
    btnDelText: '#991b1b',
    btnSecondaryBg: '#ccfbf1',
    btnSecondaryText: '#0f766e'
  },
  'elegant-white': {
    a: '#2563eb',
    as: '#eff6ff',
    ah: '#1d4ed8',
    bg: '#f8fafc',
    m: '#eef2f7',
    t: '#0f172a',
    tm: '#64748b',
    border: '#dbe3ef',
    sidebarBg: 'linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)',
    topbarBg: 'rgba(255,255,255,.92)',
    iconBtnBg: '#ffffff',
    iconBtnText: '#475569',
    iconBtnBorder: '#dbe3ef',
    modalBg: '#ffffff',
    modalBorder: '#dbeafe',
    modalHeadBg: 'linear-gradient(180deg,#fbfdff 0%,#f5f9ff 100%)',
    modalHeadBorder: '#e5edf7',
    modalFootBg: 'rgba(255,255,255,.96)',
    modalFootBorder: '#e5edf7',
    btnAddBg: '#eaf1ff',
    btnAddText: '#1d4ed8',
    btnPrimaryBg: '#2563eb',
    btnPrimaryText: '#ffffff',
    btnDelBg: '#fee2e2',
    btnDelText: '#b91c1c',
    btnSecondaryBg: '#eef2f7',
    btnSecondaryText: '#0f172a'
  },
  'elegant-sky': {
    a: '#0ea5e9',
    as: '#e0f2fe',
    ah: '#0284c7',
    bg: '#f8fafc',
    m: '#eef2f7',
    t: '#0f172a',
    tm: '#64748b',
    border: '#dbe3ef',
    sidebarBg: 'linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)',
    topbarBg: 'rgba(255,255,255,.92)',
    iconBtnBg: '#ffffff',
    iconBtnText: '#475569',
    iconBtnBorder: '#dbe3ef',
    modalBg: '#ffffff',
    modalBorder: '#dbeafe',
    modalHeadBg: 'linear-gradient(180deg,#fbfdff 0%,#f5f9ff 100%)',
    modalHeadBorder: '#e5edf7',
    modalFootBg: 'rgba(255,255,255,.96)',
    modalFootBorder: '#e5edf7',
    btnAddBg: '#e0f2fe',
    btnAddText: '#0284c7',
    btnPrimaryBg: '#0ea5e9',
    btnPrimaryText: '#ffffff',
    btnDelBg: '#fee2e2',
    btnDelText: '#b91c1c',
    btnSecondaryBg: '#eef2f7',
    btnSecondaryText: '#0f172a'
  },
  'elegant-emerald': {
    a: '#10b981',
    as: '#d1fae5',
    ah: '#059669',
    bg: '#f8fafc',
    m: '#eef2f7',
    t: '#0f172a',
    tm: '#64748b',
    border: '#dbe3ef',
    sidebarBg: 'linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)',
    topbarBg: 'rgba(255,255,255,.92)',
    iconBtnBg: '#ffffff',
    iconBtnText: '#475569',
    iconBtnBorder: '#dbe3ef',
    modalBg: '#ffffff',
    modalBorder: '#dbeafe',
    modalHeadBg: 'linear-gradient(180deg,#fbfdff 0%,#f5f9ff 100%)',
    modalHeadBorder: '#e5edf7',
    modalFootBg: 'rgba(255,255,255,.96)',
    modalFootBorder: '#e5edf7',
    btnAddBg: '#d1fae5',
    btnAddText: '#059669',
    btnPrimaryBg: '#10b981',
    btnPrimaryText: '#ffffff',
    btnDelBg: '#fee2e2',
    btnDelText: '#b91c1c',
    btnSecondaryBg: '#eef2f7',
    btnSecondaryText: '#0f172a'
  },
  'velvet-red': {
    a: '#b91c1c',
    as: '#fff1f2',
    ah: '#991b1b',
    bg: '#fff8f8',
    m: '#fee8ea',
    t: '#4c0519',
    tm: '#7f1d1d',
    border: '#fecaca',
    sidebarBg: 'linear-gradient(180deg,#fffafb 0%,#fff1f2 100%)',
    topbarBg: 'rgba(255,250,251,.92)',
    iconBtnBg: '#fffafb',
    iconBtnText: '#9f1239',
    iconBtnBorder: '#fecaca',
    modalBg: '#fffdfd',
    modalBorder: '#fecaca',
    modalHeadBg: 'linear-gradient(180deg,#fff4f4 0%,#ffe9ec 100%)',
    modalHeadBorder: '#fecaca',
    modalFootBg: 'rgba(255,253,253,.96)',
    modalFootBorder: '#fecaca',
    btnAddBg: '#ffe9ec',
    btnAddText: '#9f1239',
    btnPrimaryBg: '#b91c1c',
    btnPrimaryText: '#fff1f2',
    btnDelBg: '#fee2e2',
    btnDelText: '#991b1b',
    btnSecondaryBg: '#fee8ea',
    btnSecondaryText: '#7f1d1d'
  },
  'crimson-black': {
    a: '#be123c',
    as: '#2a131d',
    ah: '#fb7185',
    bg: '#0b0b10',
    m: '#1b1320',
    t: '#f8fafc',
    tm: '#cbd5e1',
    border: '#3a1f27',
    sidebarBg: 'linear-gradient(180deg,#140f16 0%,#1a1118 100%)',
    topbarBg: 'rgba(20,15,22,.92)',
    iconBtnBg: '#1f1722',
    iconBtnText: '#fda4af',
    iconBtnBorder: '#4b2a33',
    modalBg: '#17111a',
    modalBorder: '#4b2a33',
    modalHeadBg: 'linear-gradient(180deg,#21101a 0%,#1a1016 100%)',
    modalHeadBorder: '#4b2a33',
    modalFootBg: 'rgba(23,17,26,.96)',
    modalFootBorder: '#4b2a33',
    btnAddBg: '#3a1f27',
    btnAddText: '#fecdd3',
    btnPrimaryBg: '#be123c',
    btnPrimaryText: '#fff1f2',
    btnDelBg: '#4b1d2b',
    btnDelText: '#fecdd3',
    btnSecondaryBg: '#2a1b24',
    btnSecondaryText: '#f8fafc'
  },
  dracula: {
    a: '#6f2dbd',
    as: '#3b245a',
    ah: '#a663cc',
    bg: '#171123',
    m: '#2a2036',
    t: '#fbfbfb',
    tm: '#d7cae5',
    border: '#5e3c76',
    sidebarBg: 'linear-gradient(180deg,#231536 0%,#1b122a 100%)',
    topbarBg: 'rgba(23,17,35,.92)',
    iconBtnBg: '#2d1d42',
    iconBtnText: '#fbfbfb',
    iconBtnBorder: '#5e3c76',
    modalBg: '#20162f',
    modalBorder: '#5e3c76',
    modalHeadBg: 'linear-gradient(180deg,#2a1c3d 0%,#231735 100%)',
    modalHeadBorder: '#5e3c76',
    modalFootBg: 'rgba(32,22,47,.96)',
    modalFootBorder: '#5e3c76',
    btnAddBg: '#3b245a',
    btnAddText: '#fbfbfb',
    btnPrimaryBg: '#6f2dbd',
    btnPrimaryText: '#fbfbfb',
    btnDelBg: '#5b2b4a',
    btnDelText: '#fbfbfb',
    btnSecondaryBg: '#2f2440',
    btnSecondaryText: '#fbfbfb'
  }
};

let currentUser = loadCurrentUser();
let schoolIdentity = loadSchoolIdentity();
let tableDensity = (currentUser.preferences?.tableDensity || localStorage.getItem('icsTableDensity') || 'comfortable').toLowerCase();
if (!['comfortable', 'compact'].includes(tableDensity)) tableDensity = 'comfortable';
applyThemeAccent(currentUser.preferences?.themeAccent || 'elegant-white');
applyTableDensity();

function setBrandSubVersion(versionText){
  if (!brandSub) return;
  const normalized = String(versionText || '').trim();
  brandSub.textContent = normalized ? `System Manager v.${normalized}` : 'System Manager';
}

async function applyBrandSubVersionFromManifest(){
  setBrandSubVersion(APP_UI_VERSION_FALLBACK);
  try {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    const manifestHref = manifestLink?.getAttribute('href') || './manifest.webmanifest';
    const response = await fetch(manifestHref, { cache: 'no-store' });
    if (!response.ok) return;
    const manifest = await response.json();
    if (manifest && typeof manifest.version === 'string') {
      setBrandSubVersion(manifest.version);
    }
  } catch (_err) {
    // Keep fallback label if manifest fetch is unavailable.
  }
}

applyBrandSubVersionFromManifest();

function canUseCollapsedSidebarLayout(){
  return window.matchMedia('(min-width: 981px)').matches;
}

function applySidebarCollapsedState(collapsed, options = {}){
  const persist = options.persist !== false;
  const next = canUseCollapsedSidebarLayout() ? !!collapsed : false;
  document.body.classList.toggle('sidebar-collapsed', next);
  if (sidebarToggleBtn){
    const title = next ? 'Expand sidebar' : 'Collapse sidebar';
    sidebarToggleBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
    sidebarToggleBtn.setAttribute('aria-label', title);
    sidebarToggleBtn.title = title;
    const icon = sidebarToggleBtn.querySelector('[data-lucide]');
    if (icon) icon.setAttribute('data-lucide', next ? 'panel-left-open' : 'panel-left-close');
  }
  navItems.forEach((item) => {
    const label = (item.querySelector('span:last-child')?.textContent || item.dataset.view || '').trim();
    if (next){
      if (label) item.title = label;
      if (label) item.setAttribute('aria-label', label);
    } else {
      item.removeAttribute('title');
      if (item.getAttribute('aria-label') === label) item.removeAttribute('aria-label');
    }
  });
  if (persist){
    localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, next ? '1' : '0');
  }
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function toggleSidebarCollapsed(forceState){
  const next = typeof forceState === 'boolean'
    ? forceState
    : !document.body.classList.contains('sidebar-collapsed');
  applySidebarCollapsedState(next);
}

function initializeSidebarCollapsedState(){
  applySidebarCollapsedState(localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === '1', { persist: false });
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const preferred = localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === '1';
      applySidebarCollapsedState(preferred, { persist: false });
    }, 80);
  });
}


initializeShellState();
initializeSidebarCollapsedState();

// ===== VIEWS =====

// ===== NAVIGATION =====
navItems.forEach(item => item.onclick = () => {
  const key = item.dataset.view;
  if (!viewRenderers[key]) return;

  navItems.forEach(n => n.classList.remove('active'));
  item.classList.add('active');
  renderView(key);
});

// ===== FLOATING FORM =====

sheet.addEventListener('input', validateForm);
sheet.addEventListener('input', (e) => {
  if (e.target && e.target.tagName === 'INPUT'){
    e.target.title = e.target.value || '';
  }
});
sheet.addEventListener('focusin', (e) => {
  if (e.target && e.target.tagName === 'INPUT'){
    e.target.title = e.target.value || '';
  }
});
icsNoInput.addEventListener('input', () => {
  if (editingIndex === null){
    const formatted = formatICSNoInput(icsNoInput.value);
    if (icsNoInput.value !== formatted) icsNoInput.value = formatted;
  }
  validateForm();
});
icsNoInput.addEventListener('blur', () => {
  if (editingIndex !== null) return;
  const normalized = normalizeNewICSNoValue(icsNoInput.value);
  if (icsNoInput.value !== normalized) icsNoInput.value = normalized;
  validateForm();
});

// ===== TABLE LOGIC =====

initializeNotificationsUI();
initializeUIEventWiring();

initializeKeyboardRouting();

registerPWAServiceWorker();
updateInstallAppButtonState();
initializeReleaseNotesQuickAccess();
bootAppWithUserPreferences();
announceReleaseNotesIfNeeded();

addBtn.addEventListener('click', saveICSFromForm);
