function initializeShellState(){
  fab.style.display = 'none';
  fab.setAttribute('tabindex', '0');
  fab.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      toggleSheet();
    }
  });
  sheet.classList.remove('show');
  ['icsEulNotifyLeadDays', 'icsEulAlertResolved', 'icsPastSilentNotified'].forEach((k) => localStorage.removeItem(k));
  renderNotifications();
  refreshInputTitles(sheet);
  refreshAutoSuggest();
  applyThemeAccent(currentUser.preferences?.themeAccent || 'elegant-white');
  renderUserIdentity();
  applyTableDensity();
  window.addEventListener('resize', () => {
    if (sheet.classList.contains('show')) requestAnimationFrame(placeSheetNearAddItemButton);
  });
  document.addEventListener('input', (e) => {
    if (e.target?.classList?.contains('field-error')) e.target.classList.remove('field-error');
  });
  document.addEventListener('change', (e) => {
    if (e.target?.classList?.contains('field-error')) e.target.classList.remove('field-error');
  });
}

const SHELL_SIDEBAR_COLLAPSE_STORAGE_KEY = 'icsSidebarCollapsed';

function canUseCollapsedSidebarLayout(){
  return window.matchMedia('(min-width: 981px)').matches;
}

function syncNoSidebarLayoutMode(){
  document.body.classList.toggle('layout-no-sidebar', !!appShell?.classList.contains('hide-sidebar'));
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
    localStorage.setItem(SHELL_SIDEBAR_COLLAPSE_STORAGE_KEY, next ? '1' : '0');
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
  applySidebarCollapsedState(localStorage.getItem(SHELL_SIDEBAR_COLLAPSE_STORAGE_KEY) === '1', { persist: false });
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const preferred = localStorage.getItem(SHELL_SIDEBAR_COLLAPSE_STORAGE_KEY) === '1';
      applySidebarCollapsedState(preferred, { persist: false });
    }, 80);
  });
}

function syncTopbarViewButtons(activeKey){
  const key = (activeKey || '').toString();
  document.querySelectorAll('.topbar-v2-view-btn[data-action="goToView"]').forEach((btn) => {
    const isActive = (btn.dataset.arg1 || '') === key;
    btn.classList.toggle('is-primary', isActive);
    if (isActive){
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });
  const modeToggle = document.getElementById('topbarDashModeToggle');
  if (modeToggle){
    const onDashboard = key === 'Dashboard';
    modeToggle.style.display = onDashboard ? 'inline-flex' : 'none';
    const mode = typeof getDashboardViewMode === 'function' ? getDashboardViewMode() : 'guided';
    modeToggle.querySelectorAll('.topbar-dash-mode-btn').forEach((btn) => {
      const btnMode = (btn.getAttribute('data-arg1') || '').toString().trim().toLowerCase();
      btn.classList.toggle('is-active', btnMode === mode);
    });
  }
}

function syncDeveloperToolsAccess(){
  const isDev = typeof isDeveloperUser === 'function' ? isDeveloperUser() : false;
  const sidebarDevItem = document.getElementById('sidebarDeveloperToolsItem');
  const topbarDevBtn = document.getElementById('topbarDeveloperToolsBtn');
  if (sidebarDevItem) sidebarDevItem.style.display = isDev ? '' : 'none';
  if (topbarDevBtn) topbarDevBtn.style.display = isDev ? '' : 'none';
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
  const activeItem = [...navItems].find((item) => item.classList.contains('active'));
  if (!isDev && activeItem?.dataset?.view === 'Developer Tools'){
    const fallback = [...navItems].find((item) => item.dataset.view === 'Dashboard');
    fallback?.click();
  }
}

function initializeNavigationControls(initialViewKey){
  navItems.forEach((item) => {
    item.onclick = () => {
      const key = item.dataset.view;
      goToView(key);
    };
  });
  syncDeveloperToolsAccess();
  const activeView = initialViewKey
    || content?.getAttribute('data-view')
    || ((([...navItems].find((n) => n.classList.contains('active')) || {}).dataset || {}).view || 'Dashboard');
  syncTopbarViewButtons(activeView);
}

function initializeShellChrome(initialViewKey){
  initializeShellState();
  syncNoSidebarLayoutMode();
  initializeSidebarCollapsedState();
  initializeNavigationControls(initialViewKey);
}

window.syncDeveloperToolsAccess = syncDeveloperToolsAccess;
