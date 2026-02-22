const DASHBOARD_VIEW_MODE_STORAGE_KEY = 'icsDashboardViewMode';

function getDashboardViewModeStorageKey(){
  const profileKey = (currentUser?.profileKey || sessionState?.profileKey || 'guest').toString().trim().toLowerCase() || 'guest';
  const schoolKey = (typeof normalizeSchoolId === 'function'
    ? normalizeSchoolId(schoolIdentity?.schoolId || '')
    : (schoolIdentity?.schoolId || '').toString().trim().toLowerCase()) || 'default';
  return `${DASHBOARD_VIEW_MODE_STORAGE_KEY}:${schoolKey}:${profileKey}`;
}

function getDashboardViewMode(){
  const raw = (localStorage.getItem(getDashboardViewModeStorageKey()) || 'guided').toString().trim().toLowerCase();
  return raw === 'compact' ? 'compact' : 'guided';
}

function setDashboardViewMode(mode){
  const next = (mode || '').toString().trim().toLowerCase() === 'compact' ? 'compact' : 'guided';
  localStorage.setItem(getDashboardViewModeStorageKey(), next);
  if ((content?.getAttribute('data-view') || '') === 'Dashboard'){
    const current = content.classList.contains('dashboard-compact') ? 'compact' : 'guided';
    if (current === next){
      if (typeof syncTopbarViewButtons === 'function') syncTopbarViewButtons('Dashboard');
      return;
    }
    content.classList.add('dash-mode-switching');
    if (next === 'compact'){
      content.querySelectorAll('.welcome-title, .welcome-subtitle, .dash-onboarding-card').forEach((el) => {
        el.classList.add('dash-hero-out');
      });
    }
    setTimeout(() => {
      renderView('Dashboard');
      content.classList.remove('dash-mode-switching');
    }, 170);
  }
}

function goToView(key){
  const target = (key || '').toString();
  if (!target || !viewRenderers[target]) return;
  if (target === 'Developer Tools' && !(typeof isDeveloperUser === 'function' && isDeveloperUser())){
    notify('error', 'Developer Tools is restricted to developer account.');
    return;
  }
  navItems.forEach((n) => n.classList.remove('active'));
  const item = [...navItems].find((n) => n.dataset.view === target);
  if (item) item.classList.add('active');
  if (typeof syncTopbarViewButtons === 'function') syncTopbarViewButtons(target);
  renderView(target);
}

function dashboardNewICS(){
  if (!requireAccess('open_ics_editor', { label: 'create or edit ICS records' })) return;
  goToView('Manage Inventory');
  setTimeout(() => {
    prepareNewICS();
    sheet.classList.add('show');
    requestAnimationFrame(placeSheetNearAddItemButton);
    setTimeout(placeSheetNearAddItemButton, 80);
  }, 0);
}

function dashboardImportJSON(){
  if (!requireAccess('import_json')) return;
  goToView('Manage Inventory');
  setTimeout(() => triggerImport(), 0);
}

function openAutoPopulateFromDataHub(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())){
    notify('error', 'Auto-Populate is available only for developer account.');
    return;
  }
  if (!requireAccess('auto_populate_records')) return;
  closeDataHubModal();
  goToView('Manage Inventory');
  setTimeout(() => confirmAutoPopulateICS(), 0);
}

function deleteAllDataFromDataHub(){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())){
    notify('error', 'Delete All Data is available only for developer account.');
    return;
  }
  showConfirm(
    'Delete All Data',
    'This will permanently delete all local records, supplies, archives, notifications, and audit logs in this workspace. Continue?',
    () => {
      const keysToReset = [
        'icsRecords',
        'parRecords',
        'icsSuppliesRecords',
        'icsSuppliesHistoryByStockNo',
        'icsSuppliesStagedItems',
        'icsArchivedItems',
        'icsNotifications',
        'icsAuditLogs',
        'icsUndoSnapshot',
        'icsActionCenterSelection'
      ];
      keysToReset.forEach((key) => {
        if (key === 'icsSuppliesHistoryByStockNo'){
          localStorage.setItem(key, '{}');
        } else if (key === 'icsActionCenterSelection'){
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, '[]');
        }
      });
      notifications = [];
      saveNotifications();
      renderNotifications();
      closeDataHubModal();
      if (activeViewKey() === 'Supplies') initSuppliesView();
      if (activeViewKey() === 'Manage Inventory') loadICSRecords();
      if (activeViewKey() === 'Action Center') initActionsView();
      if (activeViewKey() === 'Archives') initArchivesView();
      if (activeViewKey() === 'Dashboard') initDashboardView();
      recordAudit('maintenance', 'Developer deleted all workspace data from Data Hub.');
      notify('success', 'All workspace data has been deleted.');
    },
    'Delete All'
  );
}

function dashboardOpenActions(){
  actionCenterFilter = 'all';
  actionCenterICSFilter = '';
  actionCenterItemFilter = '';
  actionCenterSourceFilter = '';
  goToView('Action Center');
}

function dashboardOpenArchives(){
  archivesFilterIcs = '';
  goToView('Archives');
}

function dashboardOpenActionFiltered(filter){
  actionCenterFilter = filter || 'all';
  actionCenterICSFilter = '';
  actionCenterItemFilter = '';
  actionCenterSourceFilter = '';
  goToView('Action Center');
}

function dashboardRefreshMetrics(){
  initDashboardView();
}

function clearInventoryFilter(){
  inventoryFilter = 'all';
  goToView('Manage Inventory');
}

function clearActionCenterICSFilter(){
  actionCenterFilter = 'all';
  actionCenterICSFilter = '';
  actionCenterItemFilter = '';
  actionCenterSourceFilter = '';
  goToView('Action Center');
}

function clearArchivesFilter(){
  archivesFilterIcs = '';
  goToView('Archives');
}

function openPastEULForICS(icsNo){
  closeICSDetailsModal();
  actionCenterFilter = 'past';
  actionCenterICSFilter = icsNo || '';
  actionCenterItemFilter = '';
  actionCenterSourceFilter = 'ics';
  goToView('Action Center');
}

function openPastEULForItem(icsNo, itemNo, sourceType = 'ics'){
  closeICSDetailsModal();
  actionCenterFilter = 'past';
  actionCenterICSFilter = icsNo || '';
  actionCenterItemFilter = itemNo || '';
  actionCenterSourceFilter = (sourceType || 'ics').toString().toLowerCase() === 'par' ? 'par' : 'ics';
  goToView('Action Center');
}

function openNearEULForItem(icsNo, itemNo, sourceType = 'ics'){
  closeICSDetailsModal();
  actionCenterFilter = 'near';
  actionCenterICSFilter = icsNo || '';
  actionCenterItemFilter = itemNo || '';
  actionCenterSourceFilter = (sourceType || 'ics').toString().toLowerCase() === 'par' ? 'par' : 'ics';
  goToView('Action Center');
}

function dashboardExportFullBackup(){
  if (!requireAccess('export_data', { label: 'export full backup' })) return;
  exportSchemaVersionedData('full');
}

function dashboardShowMissingData(){
  inventoryFilter = 'missing';
  goToView('Manage Inventory');
  notify('info', 'Inventory filtered to ICS records with missing data.');
}
