function goToView(key){
  const item = [...navItems].find((n) => n.dataset.view === key);
  if (item) item.click();
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
  if (!requireAccess('auto_populate_records')) return;
  closeDataHubModal();
  goToView('Manage Inventory');
  setTimeout(() => confirmAutoPopulateICS(), 0);
}

function dashboardOpenActions(){
  actionCenterFilter = 'all';
  actionCenterICSFilter = '';
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
  actionCenterICSFilter = '';
  actionCenterItemFilter = '';
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
  goToView('Action Center');
}

function openPastEULForItem(icsNo, itemNo){
  closeICSDetailsModal();
  actionCenterFilter = 'past';
  actionCenterICSFilter = icsNo || '';
  actionCenterItemFilter = itemNo || '';
  goToView('Action Center');
}

function openNearEULForItem(icsNo, itemNo){
  closeICSDetailsModal();
  actionCenterFilter = 'near';
  actionCenterICSFilter = icsNo || '';
  actionCenterItemFilter = itemNo || '';
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
