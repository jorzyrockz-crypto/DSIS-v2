const GLOBAL_KEYMAP = {
  openSearch: ['ctrl+k', 'meta+k'],
  printICS: ['ctrl+p', 'meta+p'],
  finalizeICS: ['ctrl+s', 'meta+s'],
  dashboard: ['alt+1'],
  inventory: ['alt+2'],
  actionCenter: ['alt+3'],
  archives: ['alt+4'],
  newIcsForm: ['alt+n', 'ctrl+a', 'meta+a'],
  openDataManager: ['alt+d'],
  toggleNotifications: ['alt+b'],
  batchWmr: ['alt+p']
};

const FLOATING_FORM_ORDER = [
  'entityName',
  'fundCluster',
  'icsNo',
  'issuedByName',
  'issuedByPos',
  'issuedByDate',
  'receivedByName',
  'receivedByPos',
  'receivedByDate'
];

function keyComboFromEvent(e){
  const parts = [];
  if (e.ctrlKey) parts.push('ctrl');
  if (e.metaKey) parts.push('meta');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  let k = (e.key || '').toLowerCase();
  if (k === ' ') k = 'space';
  parts.push(k);
  return parts.join('+');
}

function keymapHas(action, combo){
  const list = GLOBAL_KEYMAP[action] || [];
  return list.includes(combo);
}

function activeViewKey(){
  return [...navItems].find((n) => n.classList.contains('active'))?.dataset?.view || '';
}

function isTypingContext(target){
  const tag = (target?.tagName || '').toUpperCase();
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || !!target?.isContentEditable;
}

function findRecordIndexByICSNo(icsNo){
  const key = normalizeICSKey(icsNo);
  if (!key) return -1;
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  return records.findIndex((r) => normalizeICSKey(r.icsNo || '') === key);
}

function printActiveICSShortcut(){
  if (editingIndex !== null){
    printICS(editingIndex);
    return;
  }
  const currentICS = document.getElementById('icsNo')?.value?.trim() || '';
  const idx = findRecordIndexByICSNo(currentICS);
  if (idx >= 0){
    printICS(idx);
    return;
  }
  notify('error', 'No active ICS selected for print. Open an ICS in Edit mode or set a valid ICS No.');
}

function getOpenOverlayIds(){
  return [
    'setupOverlay',
    'dataHubOverlay',
    'dataImportOverlay',
    'dataValidationOverlay',
    'dataExportOverlay',
    'wasteReportOverlay',
    'archiveOverlay',
    'inspectionOverlay',
    'inspectionHistoryOverlay',
    'profileOverlay',
    'loginOverlay',
    'icsRecordHistoryOverlay',
    'archivedHistoryOverlay',
    'icsDetailsOverlay',
    'searchOverlay'
  ].filter((id) => document.getElementById(id)?.classList?.contains('show'));
}

function handleOverlayKeydown(e){
  const confirmModal = document.getElementById('modal');
  if (confirmModal && confirmModal.style.display === 'flex'){
    if (e.key === 'Escape'){
      e.preventDefault();
      closeModal();
      return true;
    }
    if (e.key === 'Enter'){
      e.preventDefault();
      if (typeof pendingConfirmAction === 'function') runConfirmAction();
      else closeModal();
      return true;
    }
  }
  const open = getOpenOverlayIds();
  if (!open.length) return false;
  const top = open[0];
  const isTextarea = (e.target?.tagName || '').toUpperCase() === 'TEXTAREA';

  if (e.key === 'Escape'){
    e.preventDefault();
    if (top === 'setupOverlay') closeSetupModal();
    else if (top === 'loginOverlay') closeLoginModal();
    else if (top === 'dataHubOverlay') closeDataHubModal();
    else if (top === 'dataImportOverlay') closeDataImportModal();
    else if (top === 'dataValidationOverlay') closeDataValidationModal();
    else if (top === 'dataExportOverlay') closeDataExportModal();
    else if (top === 'wasteReportOverlay'){
      if (wmrBatchPrintMode) exitWmrBatchBuilderMode();
      else closeWasteReportModal();
    }
    else if (top === 'archiveOverlay') closeArchiveModal(true);
    else if (top === 'inspectionOverlay') closeInspectionModal();
    else if (top === 'inspectionHistoryOverlay') closeInspectionHistory();
    else if (top === 'profileOverlay') closeProfileModal();
    else if (top === 'icsRecordHistoryOverlay') closeICSRecordHistoryModal();
    else if (top === 'archivedHistoryOverlay') closeArchivedHistoryModal();
    else if (top === 'icsDetailsOverlay') closeICSDetailsModal();
    else if (top === 'searchOverlay') closeSearchOverlay();
    return true;
  }
  if (e.key !== 'Enter') return true;
  if (isTextarea && !e.ctrlKey && !e.metaKey) return false;

  if (top === 'inspectionOverlay'){
    const saveBtn = document.getElementById('inspSaveBtn');
    if (saveBtn && !saveBtn.disabled){
      e.preventDefault();
      saveInspection();
      return true;
    }
  }
  if (top === 'archiveOverlay'){
    e.preventDefault();
    confirmArchiveItem();
    return true;
  }
  if (top === 'wasteReportOverlay'){
    e.preventDefault();
    if (wmrBatchPrintMode){
      if (e.target?.closest?.('.wmr-batch-item-input')) commitWmrBatchItemInput(e.target);
    } else if (e.ctrlKey || e.metaKey) saveWasteReportMetadata(true);
    else saveWasteReportMetadata(false);
    return true;
  }
  if (top === 'profileOverlay'){
    e.preventDefault();
    saveProfileSettings();
    return true;
  }
  if (top === 'setupOverlay'){
    e.preventDefault();
    submitInitialSetup();
    return true;
  }
  if (top === 'loginOverlay'){
    e.preventDefault();
    submitLogin();
    return true;
  }
  if (top === 'searchOverlay') return true;
  return true;
}

function focusNextFloatingFormField(currentId){
  const idx = FLOATING_FORM_ORDER.indexOf(currentId);
  if (idx < 0) return false;
  const nextId = FLOATING_FORM_ORDER[idx + 1];
  if (!nextId) return false;
  const next = document.getElementById(nextId);
  if (!next) return false;
  next.focus();
  if (typeof next.select === 'function') next.select();
  return true;
}

function handleFloatingFormEnter(e){
  if (activeViewKey() !== 'Manage Inventory') return false;
  if (!sheet.classList.contains('show')) return false;
  const target = e.target;
  if (!target || !FLOATING_FORM_ORDER.includes(target.id)) return false;
  if (e.key !== 'Enter') return false;
  if (target.tagName === 'TEXTAREA') return false;
  const hasDatalist = target.hasAttribute('list');
  if (!hasDatalist) e.preventDefault();

  const continueFlow = () => {
    const value = (target.value || '').trim();
    if (!value){
      notify('error', 'Complete this field before moving to next.');
      return true;
    }
    if (focusNextFloatingFormField(target.id)) return true;
    if (validateForm()){
      saveICSFromForm();
      const stageCard = document.getElementById('icsBody')?.closest('.ics-card');
      if (stageCard) stageCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      notify('error', 'Complete all required floating form fields before continuing.');
    }
    return true;
  };
  if (hasDatalist){
    setTimeout(continueFlow, 0);
    return true;
  }
  return continueFlow();
}

function getStageRowInputs(row){
  return [...row.querySelectorAll('.stage-input')];
}

function handleStageItemsKeyboard(e){
  if (activeViewKey() !== 'Manage Inventory') return false;
  const input = e.target?.closest?.('#icsBody .stage-input');
  if (!input) return false;
  const row = input.closest('tr');
  if (!row) return false;
  const rows = getStageRows();
  const rIdx = rows.indexOf(row);
  const cols = getStageRowInputs(row);
  const cIdx = cols.indexOf(input);
  if (rIdx < 0 || cIdx < 0) return false;

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
    e.preventDefault();
    const nextRow = rows[rIdx + (e.key === 'ArrowDown' ? 1 : -1)];
    if (!nextRow) return true;
    const nextCols = getStageRowInputs(nextRow);
    const target = nextCols[Math.min(cIdx, nextCols.length - 1)];
    if (target) target.focus();
    return true;
  }
  if (e.key === 'Enter'){
    if ((input.tagName || '').toUpperCase() === 'TEXTAREA') return false;
    e.preventDefault();
    const nextInRow = cols[cIdx + 1];
    if (nextInRow){
      nextInRow.focus();
      return true;
    }
    const nextRow = rows[rIdx + 1];
    if (nextRow){
      const nextCols = getStageRowInputs(nextRow);
      if (nextCols[0]) nextCols[0].focus();
      return true;
    }
    addRow();
    const newestRows = getStageRows();
    const newRow = newestRows[newestRows.length - 1];
    const first = newRow ? getStageRowInputs(newRow)[0] : null;
    if (first) first.focus();
    return true;
  }
  return false;
}

function initializeKeyboardRouting(){
  document.addEventListener('keydown', (e) => {
    const combo = keyComboFromEvent(e);
    const view = activeViewKey();
    const typing = isTypingContext(e.target);

    if (handleOverlayKeydown(e)) return;
    if (e.key === 'Escape' && view === 'Manage Inventory' && sheet.classList.contains('show')){
      e.preventDefault();
      closeSheet();
      return;
    }
    if (handleFloatingFormEnter(e)) return;
    if (handleStageItemsKeyboard(e)) return;

    if (keymapHas('openSearch', combo)){
      e.preventDefault();
      openSearchOverlay();
      return;
    }
    if (e.key === 'Escape' && searchOverlay.classList.contains('show')){
      e.preventDefault();
      closeSearchOverlay();
      return;
    }
    if (keymapHas('printICS', combo) && view === 'Manage Inventory'){
      e.preventDefault();
      printActiveICSShortcut();
      return;
    }
    if (keymapHas('finalizeICS', combo) && view === 'Manage Inventory'){
      e.preventDefault();
      finalizeICS();
      return;
    }
    if (typing) return;

    if (keymapHas('dashboard', combo)){ e.preventDefault(); goToView('Dashboard'); return; }
    if (keymapHas('inventory', combo)){ e.preventDefault(); goToView('Manage Inventory'); return; }
    if (keymapHas('actionCenter', combo)){ e.preventDefault(); goToView('Action Center'); return; }
    if (keymapHas('archives', combo)){ e.preventDefault(); goToView('Archives'); return; }
    if (keymapHas('newIcsForm', combo)){
      e.preventDefault();
      if (!hasRoleCapability('edit_records')){
        notify('error', `Access denied. ${normalizeRoleLabel(currentUser?.role)} role cannot open ICS editor.`);
        return;
      }
      goToView('Manage Inventory');
      setTimeout(() => {
        prepareNewICS();
        if (!hasRoleCapability('edit_records')) return;
        sheet.classList.add('show');
        requestAnimationFrame(placeSheetNearAddItemButton);
        setTimeout(placeSheetNearAddItemButton, 80);
      }, 0);
      return;
    }
    if (keymapHas('openDataManager', combo)){
      e.preventDefault();
      openDataManagerModal('hub');
      return;
    }
    if (keymapHas('toggleNotifications', combo)){
      e.preventDefault();
      notifPanel.classList.toggle('show');
      return;
    }
    if (keymapHas('batchWmr', combo) && view === 'Action Center'){
      e.preventDefault();
      openBatchWasteReportFromActionCenter();
    }
  });

  searchInput.addEventListener('input', () => renderSearchResults(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown'){ e.preventDefault(); moveSearchActive(1); }
    if (e.key === 'ArrowUp'){ e.preventDefault(); moveSearchActive(-1); }
    if (e.key === 'Enter'){
      e.preventDefault();
      if (searchActiveIndex >= 0) activateSearchResult(searchActiveIndex);
    }
    if (e.key === 'Escape'){ e.preventDefault(); closeSearchOverlay(); }
  });

  document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('icsDetailsOverlay');
    if (!overlay || !overlay.classList.contains('show')) return;
    const tag = (document.activeElement?.tagName || '').toUpperCase();
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

    if (e.key === 'Escape'){
      e.preventDefault();
      closeICSDetailsModal();
      return;
    }
    if (typing) return;
  });
}
