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
  Supplies: renderSuppliesView,
  'Manage Inventory': renderInventoryView,
  'Action Center': renderActionsView,
  Archives: renderArchivesView,
  'Developer Tools': renderDeveloperToolsView
};

function initSuppliesView(){
  refreshSuppliesAutoSuggest();
  const body = document.getElementById('suppliesStageBody');
  if (!body) return;
  const rows = getSuppliesStagedItems();
  const lookup = buildSuppliesLookup(rows, getSuppliesSavedRecords());
  if (!rows.length){
    body.innerHTML = `<tr><td class="empty-cell" colspan="11">No staged supply items yet. <button class="btn btn-sm btn-secondary" data-action="suppliesAddRow"><i data-lucide="plus" aria-hidden="true"></i>Add Row</button></td></tr>`;
    loadSuppliesSavedRecords();
    return;
  }
  body.innerHTML = rows.map((row, idx) => {
    const attr = (value) => (value || '')
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const stockNo = attr(row?.stockNo);
    const date = attr(row?.date);
    const reference = attr(row?.reference);
    const item = attr(row?.item);
    const description = attr(row?.description);
    const unit = attr(row?.unit);
    const receiptQty = attr(row?.receiptQty);
    const price = attr(row?.price);
    const reorderPoint = attr(row?.reorderPoint);
    const rowDescriptionListId = getSuppliesRowDescriptionListId(idx);
    const rowUnitListId = getSuppliesRowUnitListId(idx);
    const rowDescriptionOptions = toSupplyOptionMarkup(getSuppliesDescriptionOptionsForRow(row, lookup));
    const rowUnitOptions = toSupplyOptionMarkup(getSuppliesUnitOptionsForRow(row, lookup));
    return `<tr>
      <td>${idx + 1}</td>
      <td><input class="stage-input supplies-stage-input" data-supplies-index="${idx}" data-supplies-field="stockNo" value="${stockNo}" placeholder="Stock No." list="suppliesStockNoList" /></td>
      <td><input class="stage-input supplies-stage-input" data-supplies-index="${idx}" data-supplies-field="date" type="date" value="${date}" /></td>
      <td><input class="stage-input supplies-stage-input" data-supplies-index="${idx}" data-supplies-field="reference" value="${reference}" placeholder="Reference" list="suppliesReferenceList" /></td>
      <td><input class="stage-input supplies-stage-input" data-supplies-index="${idx}" data-supplies-field="item" value="${item}" placeholder="Item" list="suppliesItemList" /></td>
      <td>
        <input class="stage-input supplies-stage-input" data-supplies-index="${idx}" data-supplies-field="description" value="${description}" placeholder="Description" list="${rowDescriptionListId}" />
        <datalist id="${rowDescriptionListId}">${rowDescriptionOptions}</datalist>
      </td>
      <td>
        <input class="stage-input supplies-stage-input" data-supplies-index="${idx}" data-supplies-field="unit" value="${unit}" placeholder="Unit" list="${rowUnitListId}" />
        <datalist id="${rowUnitListId}">${rowUnitOptions}</datalist>
      </td>
      <td><input class="stage-input supplies-stage-input" data-supplies-index="${idx}" data-supplies-field="receiptQty" value="${receiptQty}" placeholder="0" /></td>
      <td><input class="stage-input supplies-stage-input" data-supplies-index="${idx}" data-supplies-field="price" value="${price}" placeholder="0.00" /></td>
      <td><input class="stage-input supplies-stage-input" data-supplies-index="${idx}" data-supplies-field="reorderPoint" value="${reorderPoint}" placeholder="0" /></td>
      <td>
        <div class="stage-cell-actions">
          <button class="btn btn-sm btn-secondary btn-icon icon-only-btn" title="Add Row" aria-label="Add Row" data-action="suppliesAddRow" data-arg1="${idx}"><i data-lucide="plus" aria-hidden="true"></i></button>
          <button class="btn btn-sm btn-danger btn-icon icon-only-btn" title="Delete Item" aria-label="Delete Item" data-action="suppliesDeleteItem" data-arg1="${idx}"><i data-lucide="trash-2" aria-hidden="true"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
  loadSuppliesSavedRecords();
}

function getSuppliesStagedItems(){
  const staged = safeParseJSON(localStorage.getItem('icsSuppliesStagedItems') || '[]', []);
  return Array.isArray(staged) ? staged : [];
}

function normalizeSupplyLookupValue(value){
  return (value || '').toString().trim().toLowerCase();
}

function createSupplyLookupKey(item, description){
  return `${normalizeSupplyLookupValue(item)}||${normalizeSupplyLookupValue(description)}`;
}

function buildSuppliesLookup(stagedRows = [], savedRows = []){
  const normalizedRows = [];
  const addRows = (rows) => {
    rows.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      normalizedRows.push({
        stockNo: (row.stockNo || '').toString().trim(),
        item: (row.item || '').toString().trim(),
        description: (row.description || '').toString().trim(),
        unit: (row.unit || '').toString().trim(),
        reorderPoint: (row.reorderPoint || '').toString().trim()
      });
    });
  };
  // Saved definitions are authoritative; staged values extend lookup for unsaved entries.
  addRows(savedRows);
  addRows(stagedRows);

  const stockByKey = new Map();
  const stockByItemDescription = new Map();
  const unitsByItem = new Map();
  const descriptionsByItem = new Map();
  const allDescriptions = new Set();
  const allUnits = new Set();

  normalizedRows.forEach((row) => {
    const stockKey = normalizeStockNoKey(row.stockNo);
    if (stockKey && !stockByKey.has(stockKey)) stockByKey.set(stockKey, row);
    const itemKey = normalizeSupplyLookupValue(row.item);
    const descriptionKey = normalizeSupplyLookupValue(row.description);
    const itemDescriptionKey = createSupplyLookupKey(row.item, row.description);
    if (itemKey && descriptionKey && !stockByItemDescription.has(itemDescriptionKey)){
      stockByItemDescription.set(itemDescriptionKey, row);
    }
    if (itemKey && row.description){
      if (!descriptionsByItem.has(itemKey)) descriptionsByItem.set(itemKey, new Set());
      descriptionsByItem.get(itemKey).add(row.description);
      allDescriptions.add(row.description);
    }
    if (itemKey && row.unit){
      if (!unitsByItem.has(itemKey)) unitsByItem.set(itemKey, new Set());
      unitsByItem.get(itemKey).add(row.unit);
      allUnits.add(row.unit);
    }
  });

  return { stockByKey, stockByItemDescription, unitsByItem, descriptionsByItem, allDescriptions, allUnits };
}

function toSupplyOptionMarkup(values){
  return [...values]
    .map((value) => (value || '').toString().trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => `<option value="${escapeHTML(value)}"></option>`)
    .join('');
}

function getSuppliesRowDescriptionListId(index){
  return `suppliesDescriptionList-${index}`;
}

function getSuppliesRowUnitListId(index){
  return `suppliesUnitList-${index}`;
}

function getSuppliesDescriptionOptionsForRow(row, lookup){
  const itemKey = normalizeSupplyLookupValue(row?.item || '');
  const stockKey = normalizeStockNoKey(row?.stockNo || '');
  if (stockKey && lookup.stockByKey.has(stockKey)){
    const definition = lookup.stockByKey.get(stockKey);
    return definition?.description ? [definition.description] : [];
  }
  if (itemKey && lookup.descriptionsByItem.has(itemKey)){
    return [...lookup.descriptionsByItem.get(itemKey)];
  }
  return [...lookup.allDescriptions];
}

function getSuppliesUnitOptionsForRow(row, lookup){
  const itemKey = normalizeSupplyLookupValue(row?.item || '');
  const stockKey = normalizeStockNoKey(row?.stockNo || '');
  if (stockKey && lookup.stockByKey.has(stockKey)){
    const definition = lookup.stockByKey.get(stockKey);
    return definition?.unit ? [definition.unit] : [];
  }
  if (itemKey && lookup.unitsByItem.has(itemKey)){
    return [...lookup.unitsByItem.get(itemKey)];
  }
  return [...lookup.allUnits];
}

function syncSuppliesRowInputs(index, row, lookup){
  const rowIndex = Number(index);
  if (!Number.isInteger(rowIndex) || rowIndex < 0) return;
  const setInputValue = (field, inputValue) => {
    const el = document.querySelector(`.supplies-stage-input[data-supplies-index="${rowIndex}"][data-supplies-field="${field}"]`);
    if (el && el.value !== inputValue) el.value = inputValue;
  };
  setInputValue('stockNo', (row?.stockNo || '').toString());
  setInputValue('item', (row?.item || '').toString());
  setInputValue('description', (row?.description || '').toString());
  setInputValue('unit', (row?.unit || '').toString());

  const descriptionList = document.getElementById(getSuppliesRowDescriptionListId(rowIndex));
  if (descriptionList){
    descriptionList.innerHTML = toSupplyOptionMarkup(getSuppliesDescriptionOptionsForRow(row, lookup));
  }
  const unitList = document.getElementById(getSuppliesRowUnitListId(rowIndex));
  if (unitList){
    unitList.innerHTML = toSupplyOptionMarkup(getSuppliesUnitOptionsForRow(row, lookup));
  }
}

function refreshSuppliesAutoSuggest(){
  const staged = getSuppliesStagedItems();
  const saved = getSuppliesSavedRecords();
  const historyMap = getSuppliesHistoryByStockNo();
  const historyRows = Object.values(historyMap || {}).flatMap((rows) => Array.isArray(rows) ? rows : []);
  const pick = (rows, field) => rows.map((r) => (r?.[field] || '').toString());
  fillDatalistOptions('suppliesStockNoList', [...pick(staged, 'stockNo'), ...pick(saved, 'stockNo')]);
  fillDatalistOptions('suppliesEntityNameList', [...pick(saved, 'entityName'), ...pick(historyRows, 'entityName')]);
  fillDatalistOptions('suppliesFundClusterList', [...pick(saved, 'fundCluster'), ...pick(historyRows, 'fundCluster')]);
  fillDatalistOptions('suppliesReferenceList', [...pick(staged, 'reference'), ...pick(saved, 'reference')]);
  fillDatalistOptions('suppliesItemList', [...pick(staged, 'item'), ...pick(saved, 'item')]);
  fillDatalistOptions('suppliesDescriptionList', [...pick(staged, 'description'), ...pick(saved, 'description')]);
  fillDatalistOptions('suppliesUnitList', [...pick(staged, 'unit'), ...pick(saved, 'unit')]);
  fillDatalistOptions('suppliesIssuedOfficeList', ['School Office', ...pick(saved, 'latestIssuedOffice'), ...pick(historyRows, 'latestIssuedOffice')]);
}

function getSuppliesSavedRecords(){
  const records = safeParseJSON(localStorage.getItem('icsSuppliesRecords') || '[]', []);
  return Array.isArray(records) ? records : [];
}

function saveSuppliesSavedRecords(rows){
  localStorage.setItem('icsSuppliesRecords', JSON.stringify(Array.isArray(rows) ? rows : []));
}

function getSuppliesHistoryByStockNo(){
  const map = safeParseJSON(localStorage.getItem('icsSuppliesHistoryByStockNo') || '{}', {});
  return map && typeof map === 'object' ? map : {};
}

function saveSuppliesHistoryByStockNo(map){
  localStorage.setItem('icsSuppliesHistoryByStockNo', JSON.stringify(map && typeof map === 'object' ? map : {}));
}

function normalizeStockNoKey(value){
  return (value || '').toString().trim().toLowerCase();
}

function normalizeSupplyIdentityValue(value){
  return (value || '').toString().trim().toLowerCase();
}

function getSupplyIdentityConflictField(baseRow, candidateRow){
  const fields = [
    { key: 'item', label: 'Item' },
    { key: 'description', label: 'Description' },
    { key: 'unit', label: 'Unit' }
  ];
  for (const field of fields){
    const base = normalizeSupplyIdentityValue(baseRow?.[field.key] || '');
    const candidate = normalizeSupplyIdentityValue(candidateRow?.[field.key] || '');
    // Only treat as conflict when both are explicitly provided and mismatched.
    if (base && candidate && base !== candidate){
      return field.label;
    }
  }
  return '';
}

function loadSuppliesSavedRecords(){
  const body = document.getElementById('suppliesRecordsBody');
  if (!body) return;
  const rows = getSuppliesSavedRecords();
  if (!rows.length){
    body.innerHTML = '<tr><td class="empty-cell" colspan="10">No saved supplies yet.</td></tr>';
    return;
  }
  body.innerHTML = rows.map((row, idx) => {
    const stockNo = escapeHTML((row?.stockNo || '').toString());
    const date = escapeHTML((row?.date || '').toString());
    const item = escapeHTML((row?.item || '').toString());
    const unit = escapeHTML((row?.unit || '').toString());
    const price = escapeHTML((row?.price || '').toString());
    const receiptQty = escapeHTML((row?.receiptQty || '').toString());
    const balanceQty = escapeHTML((row?.balanceQty || '').toString());
    const latestIssuedOffice = escapeHTML((row?.latestIssuedOffice || '').toString());
    return `<tr>
      <td>${idx + 1}</td>
      <td>${stockNo ? `<button class="ics-link-btn" data-action="openStockCardByIndex" data-arg1="${idx}" title="Open Stock Card">${stockNo}</button>` : '-'}</td>
      <td>${date || '-'}</td>
      <td>${item || '-'}</td>
      <td>${unit || '-'}</td>
      <td>${price || '-'}</td>
      <td>${receiptQty || '-'}</td>
      <td>${balanceQty || '-'}</td>
      <td>${latestIssuedOffice || '-'}</td>
      <td>
        <button class="btn btn-sm btn-secondary btn-icon icon-only-btn" title="Update Supply" aria-label="Update Supply" data-action="suppliesUpdateSaved" data-arg1="${idx}"><i data-lucide="pencil" aria-hidden="true"></i></button>
        <button class="btn btn-sm btn-secondary btn-icon icon-only-btn" title="Print Supply" aria-label="Print Supply" data-action="suppliesPrintSaved" data-arg1="${idx}"><i data-lucide="printer" aria-hidden="true"></i></button>
        <button class="btn btn-sm btn-secondary btn-icon icon-only-btn" title="Export Supply" aria-label="Export Supply" data-action="suppliesExportSaved" data-arg1="${idx}"><i data-lucide="download" aria-hidden="true"></i></button>
        <button class="btn btn-sm btn-danger btn-icon icon-only-btn" title="Delete Supply" aria-label="Delete Supply" data-action="suppliesDeleteSaved" data-arg1="${idx}"><i data-lucide="trash-2" aria-hidden="true"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function saveSuppliesStagedItems(rows){
  localStorage.setItem('icsSuppliesStagedItems', JSON.stringify(Array.isArray(rows) ? rows : []));
}

function createEmptySuppliesStageItem(){
  return {
    stockNo: '',
    date: '',
    reference: '',
    item: '',
    description: '',
    unit: '',
    receiptQty: '',
    price: '',
    reorderPoint: ''
  };
}

function suppliesAddRow(afterIndex){
  const rows = getSuppliesStagedItems();
  const insertIndex = Number.isInteger(Number(afterIndex)) ? Number(afterIndex) + 1 : rows.length;
  rows.splice(Math.max(0, Math.min(insertIndex, rows.length)), 0, createEmptySuppliesStageItem());
  saveSuppliesStagedItems(rows);
  initSuppliesView();
  refreshSuppliesAutoSuggest();
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function suppliesUpdateStageField(index, field, value){
  const rows = getSuppliesStagedItems();
  const i = Number(index);
  const allowedFields = new Set(['stockNo', 'date', 'reference', 'item', 'description', 'unit', 'receiptQty', 'price', 'reorderPoint']);
  if (!Number.isInteger(i) || i < 0 || i >= rows.length) return;
  if (!allowedFields.has((field || '').toString())) return;
  rows[i] = rows[i] && typeof rows[i] === 'object' ? rows[i] : createEmptySuppliesStageItem();
  rows[i][field] = (value || '').toString();
  const lookup = buildSuppliesLookup(rows, getSuppliesSavedRecords());
  const row = rows[i];
  const stockKey = normalizeStockNoKey(row?.stockNo || '');

  // Stock No. is authoritative for Item/Description/Unit identity.
  if (field === 'stockNo' && stockKey && lookup.stockByKey.has(stockKey)){
    const matchedByStock = lookup.stockByKey.get(stockKey);
    row.item = (matchedByStock?.item || '').toString();
    row.description = (matchedByStock?.description || '').toString();
    row.unit = (matchedByStock?.unit || '').toString();
    row.reorderPoint = (matchedByStock?.reorderPoint || '').toString();
  }

  // If Item + Description matches a known stock definition, back-fill Stock No. and Unit.
  const itemKey = normalizeSupplyLookupValue(row?.item || '');
  const descriptionKey = normalizeSupplyLookupValue(row?.description || '');
  if ((field === 'item' || field === 'description') && itemKey && descriptionKey){
    const pairMatch = lookup.stockByItemDescription.get(createSupplyLookupKey(row.item, row.description));
    if (pairMatch){
      row.stockNo = (pairMatch.stockNo || row.stockNo || '').toString();
      row.unit = (pairMatch.unit || row.unit || '').toString();
      row.reorderPoint = (pairMatch.reorderPoint || row.reorderPoint || '').toString();
    }
  }

  // Item can define Unit when only one unit is known for that item.
  if ((field === 'item' || field === 'description') && !row.unit && itemKey && lookup.unitsByItem.has(itemKey)){
    const units = [...lookup.unitsByItem.get(itemKey)];
    if (units.length === 1){
      row.unit = units[0];
    }
  }

  saveSuppliesStagedItems(rows);
  syncSuppliesRowInputs(i, row, lookup);
  refreshSuppliesAutoSuggest();
}

function suppliesDeleteItem(index){
  const rows = getSuppliesStagedItems();
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= rows.length) return;
  rows.splice(i, 1);
  saveSuppliesStagedItems(rows);
  initSuppliesView();
  refreshSuppliesAutoSuggest();
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function suppliesDeleteSaved(index){
  const rows = getSuppliesSavedRecords();
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= rows.length) return;
  const deleted = rows[i] || {};
  rows.splice(i, 1);
  saveSuppliesSavedRecords(rows);
  const stockKey = normalizeStockNoKey(deleted.stockNo || '');
  if (stockKey){
    const historyMap = getSuppliesHistoryByStockNo();
    if (!Array.isArray(historyMap[stockKey])) historyMap[stockKey] = [];
    historyMap[stockKey].push({
      at: new Date().toISOString(),
      action: 'delete',
      stockNo: (deleted.stockNo || '').toString(),
      data: deleted
    });
    saveSuppliesHistoryByStockNo(historyMap);
  }
  loadSuppliesSavedRecords();
  refreshSuppliesAutoSuggest();
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function suppliesEditSaved(index){
  const rows = getSuppliesSavedRecords();
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= rows.length) return;
  const row = rows[i] || {};
  const staged = getSuppliesStagedItems();
  staged.push({
    stockNo: (row.stockNo || '').toString(),
    date: (row.date || '').toString(),
    reference: (row.reference || '').toString(),
    item: (row.item || '').toString(),
    description: (row.description || '').toString(),
    unit: (row.unit || '').toString(),
    receiptQty: (row.receiptQty || '').toString(),
    price: (row.price || '').toString(),
    reorderPoint: (row.reorderPoint || '').toString()
  });
  saveSuppliesStagedItems(staged);
  initSuppliesView();
  notify('info', `Loaded ${row.stockNo || 'stock'} to Staged Items for update.`);
  const stagedCard = document.querySelector('.ics-card.staged');
  if (stagedCard){
    const topbarOffset = 110;
    const targetTop = Math.max(0, window.scrollY + stagedCard.getBoundingClientRect().top - topbarOffset);
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  }
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function setSuppliesSheetEditingIndex(index){
  window.__suppliesSheetEditingIndex = Number.isInteger(Number(index)) ? Number(index) : null;
}

function getSuppliesSheetEditingIndex(){
  const i = Number(window.__suppliesSheetEditingIndex);
  return Number.isInteger(i) ? i : null;
}

function setSuppliesSheetLedgerEditContext(context){
  if (!context || typeof context !== 'object'){
    window.__suppliesSheetLedgerEditContext = null;
    return;
  }
  const stockNoKey = normalizeStockNoKey(context.stockNoKey || '');
  const rowIndex = Number(context.rowIndex);
  if (!stockNoKey || !Number.isInteger(rowIndex) || rowIndex < 0){
    window.__suppliesSheetLedgerEditContext = null;
    return;
  }
  window.__suppliesSheetLedgerEditContext = { stockNoKey, rowIndex };
}

function getSuppliesSheetLedgerEditContext(){
  const ctx = window.__suppliesSheetLedgerEditContext;
  if (!ctx || typeof ctx !== 'object') return null;
  const stockNoKey = normalizeStockNoKey(ctx.stockNoKey || '');
  const rowIndex = Number(ctx.rowIndex);
  if (!stockNoKey || !Number.isInteger(rowIndex) || rowIndex < 0) return null;
  return { stockNoKey, rowIndex };
}

function findSupplyRecordIndexByStockNoKey(stockNoKey){
  const key = normalizeStockNoKey(stockNoKey || '');
  if (!key) return -1;
  const rows = getSuppliesSavedRecords();
  return rows.findIndex((r) => normalizeStockNoKey(r?.stockNo || '') === key);
}

function toSupplyQtyNumber(value){
  const n = Number((value || '').toString().trim());
  return Number.isFinite(n) ? n : 0;
}

function normalizeSupplyHistoryRows(rows){
  const source = Array.isArray(rows) ? rows : [];
  let runningBalance = 0;
  return source.map((entry) => {
    const row = entry && typeof entry === 'object' ? { ...entry } : {};
    const receiptQty = Math.max(0, toSupplyQtyNumber(row.receiptQty));
    const issuedQty = Math.max(0, toSupplyQtyNumber(row.issuedQty));
    runningBalance = Math.max(0, runningBalance + receiptQty - issuedQty);
    return {
      ...row,
      receiptQty: receiptQty > 0 ? String(receiptQty) : '',
      issuedQty: issuedQty > 0 ? String(issuedQty) : '',
      balanceQty: String(runningBalance),
      latestIssuedOffice: (row.latestIssuedOffice || row.office || '').toString(),
      reference: (row.reference || '').toString(),
      date: (row.date || '').toString(),
      entityName: (row.entityName || '').toString(),
      fundCluster: (row.fundCluster || '').toString(),
      daysToConsume: (row.daysToConsume || '').toString()
    };
  });
}

function syncSupplyRecordFromHistory(stockNoKey, normalizedHistoryRows, recordIndex){
  const key = normalizeStockNoKey(stockNoKey || '');
  if (!key) return false;
  const records = getSuppliesSavedRecords();
  const idx = Number.isInteger(recordIndex) ? recordIndex : findSupplyRecordIndexByStockNoKey(key);
  if (idx < 0 || idx >= records.length) return false;
  const record = records[idx] && typeof records[idx] === 'object' ? records[idx] : {};
  const historyRows = Array.isArray(normalizedHistoryRows) ? normalizedHistoryRows : [];
  const latestRow = historyRows.length ? historyRows[historyRows.length - 1] : null;
  const lastIssueRow = historyRows.slice().reverse().find((r) => toSupplyQtyNumber(r?.issuedQty) > 0) || null;
  records[idx] = {
    ...record,
    history: historyRows.slice(),
    balanceQty: latestRow ? (latestRow.balanceQty || '').toString() : (record.balanceQty || '0').toString(),
    latestIssuedOffice: (lastIssueRow?.latestIssuedOffice || record.latestIssuedOffice || 'School Office').toString(),
    reference: (latestRow?.reference || record.reference || '').toString(),
    date: (latestRow?.date || record.date || '').toString(),
    entityName: (lastIssueRow?.entityName || latestRow?.entityName || record.entityName || '').toString(),
    fundCluster: (lastIssueRow?.fundCluster || latestRow?.fundCluster || record.fundCluster || '').toString(),
    daysToConsume: (lastIssueRow?.daysToConsume || record.daysToConsume || '').toString()
  };
  saveSuppliesSavedRecords(records);
  const historyMap = getSuppliesHistoryByStockNo();
  historyMap[key] = historyRows.slice();
  saveSuppliesHistoryByStockNo(historyMap);
  return true;
}

function openSuppliesSheetForSavedIndex(index){
  if (activeViewKey() !== 'Supplies'){
    closeSuppliesSheet(true);
    return;
  }
  refreshSuppliesAutoSuggest();
  const rows = getSuppliesSavedRecords();
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= rows.length) return;
  const row = rows[i] || {};
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = (value || '').toString();
  };
  setValue('suppliesSheetEntityName', row.entityName);
  setValue('suppliesSheetFundCluster', row.fundCluster);
  setValue('suppliesSheetReference', row.reference);
  const stockPill = document.getElementById('suppliesSheetStockNoPill');
  if (stockPill) stockPill.textContent = `Updating Stock No. ${((row.stockNo || '').toString() || '-')}`;
  const availableQtyPill = document.getElementById('suppliesSheetAvailableQtyPill');
  if (availableQtyPill){
    const balanceText = ((row.balanceQty || '').toString().trim() || '0');
    availableQtyPill.textContent = `Available Qty: ${balanceText}`;
    availableQtyPill.classList.remove('over');
  }
  setValue('suppliesSheetIssuedQty', '');
  setValue('suppliesSheetIssuedOffice', ((row.latestIssuedOffice || '').toString().trim() || 'School Office'));
  setValue('suppliesSheetIssuedDate', row.date);
  setValue('suppliesSheetDaysToConsume', '');
  setSuppliesSheetEditingIndex(i);
  setSuppliesSheetLedgerEditContext(null);
  const suppliesSheet = document.getElementById('suppliesSheet');
  if (!suppliesSheet) return;
  suppliesSheet.classList.add('show');
  if (typeof updateSuppliesIssuedQtyPreview === 'function') updateSuppliesIssuedQtyPreview();
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function suppliesUpdateSaved(index){
  openSuppliesSheetForSavedIndex(index);
}

function openSuppliesSheetForLedgerRow(stockNoKey, rowIndex){
  const key = normalizeStockNoKey(stockNoKey || '');
  const rowIdx = Number(rowIndex);
  if (!key || !Number.isInteger(rowIdx) || rowIdx < 0){
    notify('error', 'Invalid ledger row target.');
    return;
  }
  const recordIndex = findSupplyRecordIndexByStockNoKey(key);
  if (recordIndex < 0){
    notify('error', 'Supply record not found.');
    return;
  }
  openSuppliesSheetForSavedIndex(recordIndex);
  const records = getSuppliesSavedRecords();
  const record = records[recordIndex] || {};
  const historyMap = getSuppliesHistoryByStockNo();
  const rows = Array.isArray(historyMap[key])
    ? historyMap[key]
    : (Array.isArray(record.history) ? record.history : []);
  if (rowIdx >= rows.length){
    notify('error', 'Ledger row not found.');
    return;
  }
  const tx = rows[rowIdx] || {};
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = (value || '').toString();
  };
  setValue('suppliesSheetReference', tx.reference || record.reference || '');
  setValue('suppliesSheetIssuedQty', tx.issuedQty || '');
  setValue('suppliesSheetIssuedOffice', tx.latestIssuedOffice || tx.office || record.latestIssuedOffice || 'School Office');
  setValue('suppliesSheetIssuedDate', tx.date || record.date || '');
  setValue('suppliesSheetDaysToConsume', tx.daysToConsume || '');
  setValue('suppliesSheetEntityName', tx.entityName || record.entityName || '');
  setValue('suppliesSheetFundCluster', tx.fundCluster || record.fundCluster || '');
  setSuppliesSheetLedgerEditContext({ stockNoKey: key, rowIndex: rowIdx });
  updateSuppliesIssuedQtyPreview();
}

function updateSuppliesIssuedQtyPreview(){
  const availableQtyPill = document.getElementById('suppliesSheetAvailableQtyPill');
  if (!availableQtyPill) return;
  const index = getSuppliesSheetEditingIndex();
  if (index === null){
    availableQtyPill.textContent = 'Available Qty: -';
    availableQtyPill.classList.remove('over');
    return;
  }
  const rows = getSuppliesSavedRecords();
  const existing = rows[index] || {};
  const editContext = getSuppliesSheetLedgerEditContext();
  let baseAvailable = Number((existing?.balanceQty || '').toString().trim());
  baseAvailable = Number.isFinite(baseAvailable) ? baseAvailable : 0;
  if (editContext && editContext.stockNoKey === normalizeStockNoKey(existing?.stockNo || '')){
    const historyMap = getSuppliesHistoryByStockNo();
    const historyRows = Array.isArray(historyMap[editContext.stockNoKey]) ? historyMap[editContext.stockNoKey] : [];
    const currentRow = historyRows[editContext.rowIndex] || {};
    baseAvailable += Math.max(0, toSupplyQtyNumber(currentRow.issuedQty));
  }
  const issuedInput = (document.getElementById('suppliesSheetIssuedQty')?.value || '').toString().trim();
  const issuedRaw = Number(issuedInput);
  const issuedQty = Number.isFinite(issuedRaw) && issuedRaw > 0 ? issuedRaw : 0;
  const remaining = baseAvailable - issuedQty;
  availableQtyPill.textContent = `Available Qty: ${String(remaining)}`;
  availableQtyPill.classList.toggle('over', remaining < 0);
}

function suppliesSaveSheetUpdate(){
  if (activeViewKey() !== 'Supplies'){
    notify('error', 'Supply update form is available only in Supplies view.');
    closeSuppliesSheet(true);
    return;
  }
  if (!hasRoleCapability('edit_records')){
    notify('error', `Access denied. ${normalizeRoleLabel(currentUser?.role)} role cannot update stock records.`);
    return;
  }
  const index = getSuppliesSheetEditingIndex();
  if (index === null){
    notify('error', 'No selected supply record to update.');
    return;
  }
  const rows = getSuppliesSavedRecords();
  if (index < 0 || index >= rows.length){
    notify('error', 'Selected supply record no longer exists.');
    closeSuppliesSheet(true);
    return;
  }
  const getValue = (id) => {
    const el = document.getElementById(id);
    return (el?.value || '').toString();
  };
  const existing = rows[index] || {};
  const stockNo = (existing.stockNo || '').toString().trim();
  const referenceInput = getValue('suppliesSheetReference').trim();
  const issuedDateInput = getValue('suppliesSheetIssuedDate').trim();
  const entityNameInput = getValue('suppliesSheetEntityName').trim();
  const fundClusterInput = getValue('suppliesSheetFundCluster').trim();
  const issuedOfficeInput = getValue('suppliesSheetIssuedOffice').trim();
  const daysToConsumeInput = getValue('suppliesSheetDaysToConsume').trim();
  const issuedQtyRaw = getValue('suppliesSheetIssuedQty');
  const issuedQtyNum = Number(issuedQtyRaw.toString().trim());
  const issuedQty = Number.isFinite(issuedQtyNum) && issuedQtyNum > 0 ? issuedQtyNum : 0;
  if (issuedQty <= 0){
    notify('error', 'Issued Qty must be greater than 0.');
    return;
  }
  const editContext = getSuppliesSheetLedgerEditContext();
  const nextRecord = {
    ...existing,
    stockNo,
    date: issuedDateInput || (existing.date || '').toString(),
    reference: referenceInput || (existing.reference || '').toString(),
    entityName: entityNameInput || (existing.entityName || '').toString(),
    fundCluster: fundClusterInput || (existing.fundCluster || '').toString(),
    latestIssuedOffice: issuedOfficeInput || (existing.latestIssuedOffice || '').toString() || 'School Office',
    daysToConsume: daysToConsumeInput
  };
  const previousBalance = Number((existing?.balanceQty || '').toString().trim());
  let balanceBase = Number.isFinite(previousBalance) ? previousBalance : 0;
  if (editContext && editContext.stockNoKey === normalizeStockNoKey(stockNo)){
    const historyMapCurrent = getSuppliesHistoryByStockNo();
    const historyRowsCurrent = Array.isArray(historyMapCurrent[editContext.stockNoKey]) ? historyMapCurrent[editContext.stockNoKey] : [];
    const currentRow = historyRowsCurrent[editContext.rowIndex] || {};
    balanceBase += Math.max(0, toSupplyQtyNumber(currentRow.issuedQty));
  }
  if (issuedQty > balanceBase){
    notify('error', `Over issuance is not allowed. Available Qty: ${balanceBase}, Issued Qty: ${issuedQty}.`);
    return;
  }
  nextRecord.balanceQty = String(Math.max(0, balanceBase - issuedQty));

  const historyMap = getSuppliesHistoryByStockNo();
  const key = normalizeStockNoKey(stockNo);
  const historyEntry = {
    at: new Date().toISOString(),
    action: 'issue',
    stockNo,
    receiptQty: '',
    issuedQty: String(issuedQty),
    balanceQty: (nextRecord.balanceQty || '').toString(),
    latestIssuedOffice: ((nextRecord.latestIssuedOffice || '').toString().trim() || 'School Office'),
    reference: nextRecord.reference,
    date: nextRecord.date,
    entityName: (nextRecord.entityName || '').toString(),
    fundCluster: (nextRecord.fundCluster || '').toString(),
    daysToConsume: (nextRecord.daysToConsume || '').toString()
  };
  if (editContext && editContext.stockNoKey === key){
    const currentRows = Array.isArray(historyMap[key]) ? historyMap[key].slice() : (Array.isArray(existing.history) ? existing.history.slice() : []);
    if (editContext.rowIndex < 0 || editContext.rowIndex >= currentRows.length){
      notify('error', 'Selected ledger row no longer exists.');
      return;
    }
    const currentRow = currentRows[editContext.rowIndex] && typeof currentRows[editContext.rowIndex] === 'object'
      ? currentRows[editContext.rowIndex]
      : {};
    currentRows[editContext.rowIndex] = {
      ...currentRow,
      ...historyEntry,
      receiptQty: (currentRow.receiptQty || '').toString()
    };
    const normalized = normalizeSupplyHistoryRows(currentRows);
    if (!syncSupplyRecordFromHistory(key, normalized, index)){
      notify('error', 'Unable to save ledger row changes.');
      return;
    }
  } else {
    nextRecord.history = Array.isArray(existing?.history) ? existing.history.slice() : [];
    nextRecord.history.push(historyEntry);
    if (key){
      if (!Array.isArray(historyMap[key])) historyMap[key] = [];
      historyMap[key].push(historyEntry);
      const normalized = normalizeSupplyHistoryRows(historyMap[key]);
      historyMap[key] = normalized;
      nextRecord.history = normalized.slice();
      nextRecord.balanceQty = normalized.length ? (normalized[normalized.length - 1].balanceQty || nextRecord.balanceQty) : nextRecord.balanceQty;
      nextRecord.latestIssuedOffice = (normalized.slice().reverse().find((r) => toSupplyQtyNumber(r.issuedQty) > 0)?.latestIssuedOffice || nextRecord.latestIssuedOffice || 'School Office');
      saveSuppliesHistoryByStockNo(historyMap);
    }
    rows[index] = nextRecord;
    saveSuppliesSavedRecords(rows);
  }
  closeSuppliesSheet(true);
  loadSuppliesSavedRecords();
  refreshSuppliesAutoSuggest();
  const activeKey = (window.__activeStockCardKey || '').toString();
  if (activeKey && activeKey === key){
    const refreshedIndex = rows.findIndex((r) => normalizeStockNoKey(r?.stockNo || '') === key);
    if (refreshedIndex >= 0){
      openStockCardByIndex(refreshedIndex);
    }
  }
  notify('success', `Updated stock ${stockNo || '#'+(index + 1)}.`);
}

function suppliesPrintSaved(index){
  const rows = getSuppliesSavedRecords();
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= rows.length) return;
  const row = rows[i] || {};
  const text = (value) => escapeHTML((value || '').toString());
  const stockNo = (row.stockNo || '').toString();
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  printFrame.setAttribute('aria-hidden', 'true');
  document.body.appendChild(printFrame);
  const printDoc = printFrame.contentWindow?.document;
  if (!printDoc){
    printFrame.remove();
    notify('error', 'Unable to initialize print document.');
    return;
  }
  const stockNoKey = normalizeStockNoKey(stockNo);
  const historyMap = getSuppliesHistoryByStockNo();
  const txRowsRaw = Array.isArray(historyMap[stockNoKey])
    ? historyMap[stockNoKey]
    : (Array.isArray(row.history) ? row.history : []);
  const txRows = txRowsRaw.map((tx) => {
    const txDate = (tx.date || '').toString().trim() || ((tx.at || '').toString().slice(0, 10));
    return {
      date: txDate,
      reference: (tx.reference || row.reference || '').toString(),
      receiptQty: (tx.receiptQty || '').toString(),
      issuedQty: (tx.issuedQty || '').toString(),
      office: (tx.latestIssuedOffice || tx.office || '').toString(),
      balanceQty: (tx.balanceQty || '').toString(),
      daysToConsume: (tx.daysToConsume || '').toString()
    };
  });
  const totalRows = Math.max(34, txRows.length);
  const ledgerRows = [];
  for (let r = 0; r < totalRows; r += 1){
    const tx = txRows[r] || {};
    ledgerRows.push(`
      <tr>
        <td>${text(tx.date || '')}</td>
        <td>${text(tx.reference || '')}</td>
        <td class="num">${text(tx.receiptQty || '')}</td>
        <td class="num">${text(tx.issuedQty || '')}</td>
        <td>${text(tx.office || '')}</td>
        <td class="num">${text(tx.balanceQty || '')}</td>
        <td class="num">${text(tx.daysToConsume || '')}</td>
      </tr>
    `);
  }
  printDoc.write(`
    <html>
      <head>
        <title>Stock Card ${text(stockNo || 'Record')}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: "Times New Roman", serif; color: #000; }
          .page { width: 100%; }
          .appendix { text-align: right; font-size: 12px; font-style: italic; margin-bottom: 8px; }
          .title { text-align: center; font-weight: 700; letter-spacing: .4px; margin: 22px 0 14px; font-size: 20px; }
          .meta-top { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 2px; font-size: 14px; font-weight: 700; }
          .line-value { display: inline-block; min-width: 220px; border-bottom: 1px solid #000; padding: 0 6px 1px; }
          table { width: 100%; border-collapse: collapse; }
          .meta-table { margin-bottom: 4px; font-size: 13px; }
          .meta-table td { border: 1px solid #000; padding: 2px 4px; height: 22px; }
          .ledger { table-layout: fixed; }
          .ledger th, .ledger td { border: 1px solid #000; padding: 2px 4px; font-size: 12px; line-height: 1.1; }
          .ledger thead th { text-align: center; font-weight: 700; }
          .ledger tbody td { height: 22px; vertical-align: middle; }
          .num { text-align: center; }
          .ledger col.c-date { width: 12%; }
          .ledger col.c-ref { width: 16%; }
          .ledger col.c-receipt { width: 13%; }
          .ledger col.c-issue-qty { width: 8%; }
          .ledger col.c-office { width: 25%; }
          .ledger col.c-balance { width: 13%; }
          .ledger col.c-days { width: 13%; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="appendix">Appendix 58</div>
          <div class="title">STOCK CARD</div>

          <div class="meta-top">
            <div>Entity Name: <span class="line-value">${text(row.entityName || '')}</span></div>
            <div>Fund Cluster: <span class="line-value">${text(row.fundCluster || '')}</span></div>
          </div>

          <table class="meta-table">
            <tr>
              <td>Item: ${text(row.item || '')}</td>
              <td>Stock No.: ${text(stockNo || '')}</td>
            </tr>
            <tr>
              <td>Description: ${text(row.description || '')}</td>
              <td>Re-order Point: ${text(row.reorderPoint || '')}</td>
            </tr>
            <tr>
              <td>Unit of Measurement: ${text(row.unit || '')}</td>
              <td></td>
            </tr>
          </table>

          <table class="ledger">
            <colgroup>
              <col class="c-date" />
              <col class="c-ref" />
              <col class="c-receipt" />
              <col class="c-issue-qty" />
              <col class="c-office" />
              <col class="c-balance" />
              <col class="c-days" />
            </colgroup>
            <thead>
              <tr>
                <th rowspan="2">Date</th>
                <th rowspan="2">Reference</th>
                <th colspan="1"><em>Receipt</em></th>
                <th colspan="2"><em>Issue</em></th>
                <th colspan="1"><em>Balance</em></th>
                <th rowspan="2">No. of Days to Consume</th>
              </tr>
              <tr>
                <th class="num">Qty.</th>
                <th class="num">Qty.</th>
                <th>Office</th>
                <th class="num">Qty.</th>
              </tr>
            </thead>
            <tbody>
              ${ledgerRows.join('')}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `);
  printDoc.close();
  const runPrint = () => {
    const win = printFrame.contentWindow;
    if (!win){
      printFrame.remove();
      return;
    }
    win.focus();
    win.print();
    setTimeout(() => {
      try { printFrame.remove(); } catch (_err){}
    }, 800);
  };
  if (printFrame.contentWindow?.requestAnimationFrame){
    printFrame.contentWindow.requestAnimationFrame(runPrint);
  } else {
    setTimeout(runPrint, 60);
  }
}

function suppliesExportSaved(index){
  const rows = getSuppliesSavedRecords();
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= rows.length) return;
  const row = rows[i] || {};
  const stockNo = (row.stockNo || `supply-${i + 1}`).toString().replace(/[^\w.-]+/g, '-');
  if (typeof downloadJSONPayload === 'function'){
    downloadJSONPayload(row, `${stockNo}.json`);
    return;
  }
  const blob = new Blob([JSON.stringify(row, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${stockNo}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function closeStockCardModal(){
  const overlay = document.getElementById('stockCardOverlay');
  if (overlay) overlay.classList.remove('show');
  window.__activeStockCardKey = '';
}

function openStockCardByIndex(index){
  const rows = getSuppliesSavedRecords();
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= rows.length){
    notify('error', 'Supply record not found.');
    return;
  }
  const record = rows[i] || {};
  const overlay = document.getElementById('stockCardOverlay');
  const title = document.getElementById('stockCardTitle');
  const body = document.getElementById('stockCardBody');
  if (!overlay || !title || !body) return;

  const stockNoRaw = (record.stockNo || '').toString();
  const stockNoKey = normalizeStockNoKey(stockNoRaw);
  window.__activeStockCardKey = stockNoKey;
  const historyMap = getSuppliesHistoryByStockNo();
  const txRowsRaw = Array.isArray(historyMap[stockNoKey])
    ? historyMap[stockNoKey]
    : (Array.isArray(record.history) ? record.history : []);
  const txRows = txRowsRaw.slice();
  window.__activeStockCardRecordIndex = i;

  const text = (value) => escapeHTML((value || '').toString().trim() || '-');
  const txHtml = txRows.length
    ? txRows.map((tx, idx) => {
      const txDate = (tx.date || '').toString().trim() || ((tx.at || '').toString().slice(0, 10));
      return `<tr>
        <td>${text(txDate)}</td>
        <td>${text(tx.reference || record.reference || '')}</td>
        <td>${text(tx.receiptQty)}</td>
        <td>${text(tx.issuedQty)}</td>
        <td>${text(tx.latestIssuedOffice || tx.office || '')}</td>
        <td>${text(tx.balanceQty)}</td>
        <td>${text(tx.daysToConsume || '')}</td>
        <td>
          <div class="stage-cell-actions">
            <button class="btn btn-sm btn-secondary btn-icon icon-only-btn" title="Print Row" aria-label="Print Row" data-action="stockLedgerPrintRow" data-arg1="${stockNoKey}" data-arg2="${idx}"><i data-lucide="printer" aria-hidden="true"></i></button>
            <button class="btn btn-sm btn-secondary btn-icon icon-only-btn" title="Edit Row" aria-label="Edit Row" data-action="stockLedgerEditRow" data-arg1="${stockNoKey}" data-arg2="${idx}"><i data-lucide="pencil" aria-hidden="true"></i></button>
            <button class="btn btn-sm btn-danger btn-icon icon-only-btn" title="Delete Row" aria-label="Delete Row" data-action="stockLedgerDeleteRow" data-arg1="${stockNoKey}" data-arg2="${idx}"><i data-lucide="trash-2" aria-hidden="true"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('')
    : '<tr><td colspan="8" class="empty-cell">No stock transactions yet.</td></tr>';

  const itemRaw = (record.item || '').toString().trim();
  const stockLabel = stockNoRaw || 'Record';
  title.innerHTML = `
    <span class="stock-card-title-text">Stock Card</span>
    ${itemRaw ? `<span class="stock-card-title-pill">${escapeHTML(itemRaw)}</span>` : ''}
    <span class="stock-card-title-pill stock">${escapeHTML(stockLabel)}</span>
  `;
  body.innerHTML = `
    <div class="icsd-shell stock-card-shell">
      <section class="icsd-card stock-card-head-card">
        <div class="stock-card-head-grid">
          <div class="stock-card-kv"><span class="k">Entity Name</span><span class="v">${text(record.entityName)}</span></div>
          <div class="stock-card-kv"><span class="k">Fund Cluster</span><span class="v">${text(record.fundCluster)}</span></div>
          <div class="stock-card-kv"><span class="k">Description</span><span class="v">${text(record.description)}</span></div>
          <div class="stock-card-kv stock-card-uo"><span class="k">Unit of Measurement</span><span class="v">${text(record.unit)}</span></div>
          <div class="stock-card-kv stock-card-rop"><span class="k">Re-order Point</span><span class="v">${text(record.reorderPoint)}</span></div>
        </div>
      </section>

      <section class="icsd-card stock-card-ledger-card">
        <div class="icsd-card-title"><i data-lucide="table-properties" aria-hidden="true"></i>Stock Ledger</div>
        <div class="detail-table-wrap">
          <table class="detail-table stock-card-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Receipt Qty.</th>
                <th>Issue Qty.</th>
                <th>Office</th>
                <th>Balance Qty.</th>
                <th>No. of Days to Consume</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>${txHtml}</tbody>
          </table>
        </div>
      </section>
    </div>
  `;
  overlay.classList.add('show');
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function printStockLedgerRowsContinuation(stockNo, record, ledgerRows, targetRowIndex){
  const rows = Array.isArray(ledgerRows) ? ledgerRows : [];
  const targetIdx = Number(targetRowIndex);
  if (!rows.length || !Number.isInteger(targetIdx) || targetIdx < 0 || targetIdx >= rows.length){
    notify('error', 'No ledger row to print.');
    return;
  }
  const text = (value) => escapeHTML((value || '').toString());
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  printFrame.setAttribute('aria-hidden', 'true');
  document.body.appendChild(printFrame);
  const printDoc = printFrame.contentWindow?.document;
  if (!printDoc){
    printFrame.remove();
    notify('error', 'Unable to initialize print document.');
    return;
  }
  const totalRows = Math.max(34, rows.length);
  const ledgerRowsHtml = [];
  for (let r = 0; r < totalRows; r += 1){
    const tx = rows[r] || {};
    const rowClass = r === targetIdx ? 'active' : 'ghost';
    ledgerRowsHtml.push(`
      <tr class="${rowClass}">
        <td>${text(tx.date || '')}</td>
        <td>${text(tx.reference || '')}</td>
        <td class="num">${text(tx.receiptQty || '')}</td>
        <td class="num">${text(tx.issuedQty || '')}</td>
        <td>${text(tx.latestIssuedOffice || tx.office || '')}</td>
        <td class="num">${text(tx.balanceQty || '')}</td>
        <td class="num">${text(tx.daysToConsume || '')}</td>
      </tr>
    `);
  }
  printDoc.write(`
    <html>
      <head>
        <title>Stock Card ${text(stockNo || '')}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: "Times New Roman", serif; color: #fff; }
          .page { width: 100%; }
          .appendix { text-align: right; font-size: 12px; font-style: italic; margin-bottom: 8px; color:#fff; }
          .title { text-align: center; font-weight: 700; letter-spacing: .4px; margin: 22px 0 14px; font-size: 20px; color:#fff; }
          .meta-top { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 2px; font-size: 14px; font-weight: 700; }
          .line-value { display: inline-block; min-width: 220px; border-bottom: 1px solid #fff; padding: 0 6px 1px; }
          table { width: 100%; border-collapse: collapse; }
          .meta-table { margin-bottom: 4px; font-size: 13px; }
          .meta-table td { border: 1px solid #fff; padding: 2px 4px; height: 22px; color:#fff; }
          .ledger { table-layout: fixed; }
          .ledger th, .ledger td { border: 1px solid #fff; padding: 2px 4px; font-size: 12px; line-height: 1.1; color:#fff; }
          .ledger thead th { text-align: center; font-weight: 700; color:#fff; }
          .ledger tbody td { height: 22px; vertical-align: middle; color:#fff; }
          .num { text-align: center; }
          .ledger col.c-date { width: 12%; }
          .ledger col.c-ref { width: 16%; }
          .ledger col.c-receipt { width: 13%; }
          .ledger col.c-issue-qty { width: 8%; }
          .ledger col.c-office { width: 25%; }
          .ledger col.c-balance { width: 13%; }
          .ledger col.c-days { width: 13%; }
          .ledger tbody tr.ghost td{ color:#fff !important; }
          .ledger tbody tr.active td{ color:#000 !important; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="appendix">Appendix 58</div>
          <div class="title">STOCK CARD</div>

          <div class="meta-top">
            <div>Entity Name: <span class="line-value">${text(record?.entityName || '')}</span></div>
            <div>Fund Cluster: <span class="line-value">${text(record?.fundCluster || '')}</span></div>
          </div>

          <table class="meta-table">
            <tr>
              <td>Item: ${text(record?.item || '')}</td>
              <td>Stock No.: ${text(stockNo || '')}</td>
            </tr>
            <tr>
              <td>Description: ${text(record?.description || '')}</td>
              <td>Re-order Point: ${text(record?.reorderPoint || '')}</td>
            </tr>
            <tr>
              <td>Unit of Measurement: ${text(record?.unit || '')}</td>
              <td></td>
            </tr>
          </table>

          <table class="ledger">
            <colgroup>
              <col class="c-date" />
              <col class="c-ref" />
              <col class="c-receipt" />
              <col class="c-issue-qty" />
              <col class="c-office" />
              <col class="c-balance" />
              <col class="c-days" />
            </colgroup>
            <thead>
              <tr>
                <th rowspan="2">Date</th>
                <th rowspan="2">Reference</th>
                <th colspan="1"><em>Receipt</em></th>
                <th colspan="2"><em>Issue</em></th>
                <th colspan="1"><em>Balance</em></th>
                <th rowspan="2">No. of Days to Consume</th>
              </tr>
              <tr>
                <th class="num">Qty.</th>
                <th class="num">Qty.</th>
                <th>Office</th>
                <th class="num">Qty.</th>
              </tr>
            </thead>
            <tbody>
              ${ledgerRowsHtml.join('')}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `);
  printDoc.close();
  const runPrint = () => {
    const win = printFrame.contentWindow;
    if (!win){
      printFrame.remove();
      return;
    }
    win.focus();
    win.print();
    setTimeout(() => {
      try { printFrame.remove(); } catch (_err){}
    }, 800);
  };
  if (printFrame.contentWindow?.requestAnimationFrame){
    printFrame.contentWindow.requestAnimationFrame(runPrint);
  } else {
    setTimeout(runPrint, 60);
  }
}

function stockLedgerPrintRow(stockNoKey, rowIndex){
  const key = normalizeStockNoKey(stockNoKey || '');
  const idx = Number(rowIndex);
  if (!key || !Number.isInteger(idx) || idx < 0){
    notify('error', 'Invalid ledger row target.');
    return;
  }
  const recordIndex = findSupplyRecordIndexByStockNoKey(key);
  if (recordIndex < 0){
    notify('error', 'Supply record not found.');
    return;
  }
  const records = getSuppliesSavedRecords();
  const record = records[recordIndex] || {};
  const historyMap = getSuppliesHistoryByStockNo();
  const rows = Array.isArray(historyMap[key]) ? historyMap[key] : (Array.isArray(record.history) ? record.history : []);
  if (idx >= rows.length){
    notify('error', 'Ledger row not found.');
    return;
  }
  printStockLedgerRowsContinuation(record.stockNo || '', record, rows, idx);
}

function stockLedgerEditRow(stockNoKey, rowIndex){
  closeStockCardModal();
  openSuppliesSheetForLedgerRow(stockNoKey, rowIndex);
}

function stockLedgerDeleteRow(stockNoKey, rowIndex){
  const key = normalizeStockNoKey(stockNoKey || '');
  const idx = Number(rowIndex);
  if (!key || !Number.isInteger(idx) || idx < 0){
    notify('error', 'Invalid ledger row target.');
    return;
  }
  const recordIndex = findSupplyRecordIndexByStockNoKey(key);
  if (recordIndex < 0){
    notify('error', 'Supply record not found.');
    return;
  }
  const records = getSuppliesSavedRecords();
  const record = records[recordIndex] || {};
  const historyMap = getSuppliesHistoryByStockNo();
  const rows = Array.isArray(historyMap[key]) ? historyMap[key].slice() : (Array.isArray(record.history) ? record.history.slice() : []);
  if (idx >= rows.length){
    notify('error', 'Ledger row not found.');
    return;
  }
  showConfirm(
    'Delete Ledger Row',
    'Delete this stock ledger row permanently?',
    () => {
      rows.splice(idx, 1);
      const normalized = normalizeSupplyHistoryRows(rows);
      if (!syncSupplyRecordFromHistory(key, normalized, recordIndex)){
        notify('error', 'Unable to delete ledger row.');
        return;
      }
      loadSuppliesSavedRecords();
      refreshSuppliesAutoSuggest();
      const refreshedIndex = findSupplyRecordIndexByStockNoKey(key);
      if (refreshedIndex >= 0){
        openStockCardByIndex(refreshedIndex);
      }
      notify('success', 'Ledger row deleted.');
    },
    'Delete Row'
  );
}

function suppliesSaveStaged(){
  if (!hasRoleCapability('edit_records')){
    notify('error', `Access denied. ${normalizeRoleLabel(currentUser?.role)} role cannot save stock records.`);
    return;
  }
  const stagedRows = getSuppliesStagedItems();
  if (!stagedRows.length){
    notify('error', 'No staged supply items to save.');
    return;
  }

  const records = getSuppliesSavedRecords();
  const historyMap = getSuppliesHistoryByStockNo();
  const existingStockMap = new Map();
  records.forEach((record) => {
    const key = normalizeStockNoKey(record?.stockNo || '');
    if (!key || existingStockMap.has(key)) return;
    existingStockMap.set(key, record);
  });
  const stagedStockMap = new Map();
  const duplicateConflicts = [];
  stagedRows.forEach((row, idx) => {
    const stockNo = (row?.stockNo || '').toString().trim();
    if (!stockNo) return;
    const key = normalizeStockNoKey(stockNo);
    const existing = existingStockMap.get(key);
    if (existing){
      const existingConflictField = getSupplyIdentityConflictField(existing, row);
      if (existingConflictField){
        duplicateConflicts.push(`Row ${idx + 1} (${stockNo}) mismatched ${existingConflictField} from saved stock definition.`);
      }
    }
    const stagedExisting = stagedStockMap.get(key);
    if (stagedExisting){
      const stagedConflictField = getSupplyIdentityConflictField(stagedExisting.row, row);
      if (stagedConflictField){
        duplicateConflicts.push(`Rows ${stagedExisting.index + 1} and ${idx + 1} (${stockNo}) mismatched ${stagedConflictField}.`);
      }
    } else {
      stagedStockMap.set(key, { row, index: idx });
    }
  });
  if (duplicateConflicts.length){
    const preview = duplicateConflicts.slice(0, 3).join(' ');
    const extra = duplicateConflicts.length > 3 ? ` (+${duplicateConflicts.length - 3} more)` : '';
    notify('error', `Duplicate stock verification failed. ${preview}${extra}`);
    return;
  }
  let savedCount = 0;
  let skippedCount = 0;

  stagedRows.forEach((row) => {
    const stockNo = (row?.stockNo || '').toString().trim();
    if (!stockNo){
      skippedCount += 1;
      return;
    }
    const key = normalizeStockNoKey(stockNo);
    const receiptQtyNum = Number((row?.receiptQty || '').toString().trim());
    const receiptQty = Number.isFinite(receiptQtyNum) ? receiptQtyNum : 0;
    const existingIndex = records.findIndex((r) => normalizeStockNoKey(r?.stockNo || '') === key);
    const previous = existingIndex >= 0 ? (records[existingIndex] || {}) : null;
    const previousBalance = Number((previous?.balanceQty || '').toString().trim());
    const baseBalance = Number.isFinite(previousBalance) ? previousBalance : 0;
    const nextBalance = Math.max(0, baseBalance + receiptQty);
    const nextRecord = {
      stockNo,
      date: (row?.date || '').toString(),
      reference: (row?.reference || '').toString(),
      item: ((row?.item || '').toString().trim() || (previous?.item || '').toString().trim()),
      description: ((row?.description || '').toString().trim() || (previous?.description || '').toString().trim()),
      unit: ((row?.unit || '').toString().trim() || (previous?.unit || '').toString().trim()),
      price: (row?.price || '').toString(),
      receiptQty: (row?.receiptQty || '').toString(),
      reorderPoint: (row?.reorderPoint || '').toString(),
      balanceQty: String(nextBalance),
      latestIssuedOffice: (
        (previous?.latestIssuedOffice || '').toString().trim()
        || (row?.latestIssuedOffice || '').toString().trim()
        || 'School Office'
      ),
      entityName: (previous?.entityName || '').toString(),
      fundCluster: (previous?.fundCluster || '').toString(),
      daysToConsume: (previous?.daysToConsume || '').toString(),
      history: Array.isArray(previous?.history) ? previous.history.slice() : []
    };

    const historyEntry = {
      at: new Date().toISOString(),
      action: existingIndex >= 0 ? 'update' : 'create',
      stockNo,
      receiptQty: nextRecord.receiptQty,
      issuedQty: '',
      balanceQty: nextRecord.balanceQty,
      latestIssuedOffice: nextRecord.latestIssuedOffice,
      reference: nextRecord.reference,
      date: nextRecord.date,
      entityName: nextRecord.entityName,
      fundCluster: nextRecord.fundCluster,
      // Days to consume is issuance-specific; do not auto-populate on receipt/create rows.
      daysToConsume: ''
    };
    nextRecord.history.push(historyEntry);

    if (!Array.isArray(historyMap[key])) historyMap[key] = [];
    historyMap[key].push(historyEntry);

    if (existingIndex >= 0){
      records[existingIndex] = nextRecord;
    } else {
      records.push(nextRecord);
    }
    savedCount += 1;
  });

  saveSuppliesSavedRecords(records);
  saveSuppliesHistoryByStockNo(historyMap);
  saveSuppliesStagedItems([]);
  initSuppliesView();
  refreshSuppliesAutoSuggest();
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
  if (savedCount){
    notify('success', `Saved ${savedCount} stock entr${savedCount === 1 ? 'y' : 'ies'} to Supplies Saved.`);
  }
  if (skippedCount){
    notify('info', `Skipped ${skippedCount} row${skippedCount === 1 ? '' : 's'} with missing Stock No.`);
  }
  // If Stock Card is open for a stock we just updated, refresh it to show the newly appended ledger rows.
  const activeKey = (window.__activeStockCardKey || '').toString();
  if (activeKey){
    const updatedIndex = records.findIndex((r) => normalizeStockNoKey(r?.stockNo || '') === activeKey);
    if (updatedIndex >= 0){
      openStockCardByIndex(updatedIndex);
    }
  }
}

function getDeveloperDiagnosticsSnapshot(){
  const activeView = content?.getAttribute('data-view') || [...navItems].find((n) => n.classList.contains('active'))?.dataset?.view || '';
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
            <div class="ics-card devtools-widget"><div class="card-subtext">Active SW</div><div class="devtools-widget-meta" id="devUpdateActiveSw">-</div></div>
            <div class="ics-card devtools-widget"><div class="card-subtext">Waiting SW</div><div class="devtools-widget-meta" id="devUpdateWaitingSw">-</div></div>
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

const DEV_FEEDBACK_STATUS_STORAGE_KEY = 'dsisDeveloperFeedbackStatusMap';
let developerFeedbackItemIndex = {};

function getDeveloperFeedbackStatusMap(){
  const parsed = safeParseJSON(localStorage.getItem(DEV_FEEDBACK_STATUS_STORAGE_KEY) || '{}', {});
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function saveDeveloperFeedbackStatusMap(map){
  localStorage.setItem(DEV_FEEDBACK_STATUS_STORAGE_KEY, JSON.stringify(map || {}));
}

function normalizeDeveloperFeedbackStatus(value){
  const key = String(value || '').trim().toLowerCase();
  if (key === 'approved') return 'approved';
  if (key === 'in_queue') return 'in_queue';
  if (key === 'resolved') return 'resolved';
  return 'new';
}

function resolveDeveloperFeedbackItemKey(row, idx){
  const base = `${row?.id || ''}|${row?.timestamp || row?.created_at || row?.updated_at || ''}|${row?.summary || row?.title || ''}`;
  const normalized = base.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96);
  return normalized || `feedback-${idx + 1}`;
}

function getDeveloperFeedbackStatusDescriptor(status){
  const normalized = normalizeDeveloperFeedbackStatus(status);
  if (normalized === 'approved') return { label: 'Approved', cls: 'approved' };
  if (normalized === 'in_queue') return { label: 'In Queue', cls: 'queue' };
  if (normalized === 'resolved') return { label: 'Resolved', cls: 'resolved' };
  return { label: 'New', cls: 'new' };
}

function renderDeveloperFeedbackCards(items){
  developerFeedbackItemIndex = {};
  const statusMap = getDeveloperFeedbackStatusMap();
  return items.slice(0, 8).map((row, idx) => {
    const itemKey = resolveDeveloperFeedbackItemKey(row, idx);
    const category = escapeHTML((row?.category || 'Uncategorized').toString());
    const summary = escapeHTML((row?.summary || row?.title || '(No summary)').toString());
    const details = escapeHTML((row?.details || '').toString());
    const stamp = formatDeveloperFeedbackTime(row?.timestamp || row?.created_at || row?.updated_at || '');
    const status = normalizeDeveloperFeedbackStatus(statusMap[itemKey] || 'new');
    const statusDesc = getDeveloperFeedbackStatusDescriptor(status);
    developerFeedbackItemIndex[itemKey] = {
      key: itemKey,
      category: (row?.category || 'Uncategorized').toString(),
      summary: (row?.summary || row?.title || '(No summary)').toString(),
      details: (row?.details || '').toString(),
      stamp,
      status
    };
    return `
      <article class="ics-card dev-feedback-card">
        <header class="dev-feedback-card-head">
          <div>
            <strong>#${idx + 1} ${summary}</strong>
            <div class="card-subtext">${stamp}</div>
          </div>
          <div class="dev-feedback-card-badges">
            <span class="risk-badge ok">${category}</span>
            <span class="dev-feedback-status ${statusDesc.cls}">${statusDesc.label}</span>
          </div>
        </header>
        ${details ? `<p class="dev-feedback-card-body">${details}</p>` : '<p class="dev-feedback-card-body card-subtext">No extra details provided.</p>'}
        <div class="dev-feedback-card-actions">
          <button class="btn btn-sm btn-secondary" data-action="developerSetFeedbackStatus" data-arg1="${itemKey}" data-arg2="in_queue">In Queue</button>
          <button class="btn btn-sm btn-secondary" data-action="developerSetFeedbackStatus" data-arg1="${itemKey}" data-arg2="approved">Approve</button>
          <button class="btn btn-sm btn-secondary" data-action="developerSetFeedbackStatus" data-arg1="${itemKey}" data-arg2="resolved">Resolve</button>
          <button class="btn btn-sm btn-secondary" data-action="developerCopyFeedbackItem" data-arg1="${itemKey}">Copy</button>
        </div>
      </article>
    `;
  }).join('');
}

function developerSetFeedbackStatus(itemKey, nextStatus){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  const key = String(itemKey || '').trim();
  if (!key) return;
  const map = getDeveloperFeedbackStatusMap();
  map[key] = normalizeDeveloperFeedbackStatus(nextStatus);
  saveDeveloperFeedbackStatusMap(map);
  developerRefreshFeedbackPanel();
  setDeveloperToolsStatus(`Feedback status updated: ${key}`, 'success');
}

async function developerCopyFeedbackItem(itemKey){
  if (!(typeof isDeveloperUser === 'function' && isDeveloperUser())) return;
  const key = String(itemKey || '').trim();
  const row = developerFeedbackItemIndex[key];
  if (!row){
    notify('error', 'Feedback item not found in current view.');
    return;
  }
  const text = [
    `Category: ${row.category}`,
    `Status: ${getDeveloperFeedbackStatusDescriptor(row.status).label}`,
    `Time: ${row.stamp}`,
    `Summary: ${row.summary}`,
    row.details ? `Details: ${row.details}` : ''
  ].filter(Boolean).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    setDeveloperToolsStatus('Feedback item copied to clipboard.', 'success');
    notify('success', 'Feedback item copied.');
  } catch (_err){
    notify('error', 'Unable to copy feedback item in this browser context.');
  }
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
    list.innerHTML = renderDeveloperFeedbackCards(items);
  } catch (err){
    const cached = safeParseJSON(localStorage.getItem('dsisDeveloperFeedbackCache') || 'null', null);
    const cachedItems = Array.isArray(cached?.items) ? cached.items : [];
    if (cachedItems.length){
      meta.textContent = `Live fetch failed (${err?.message || 'unknown error'}). Showing cached feedback (${cachedItems.length}).`;
      document.getElementById('devFeedbackCount') && (document.getElementById('devFeedbackCount').textContent = String(cachedItems.length));
      document.getElementById('devFeedbackLastAt') && (document.getElementById('devFeedbackLastAt').textContent = formatDeveloperFeedbackTime(cachedItems[0]?.timestamp || cached?.generated_at));
      list.innerHTML = renderDeveloperFeedbackCards(cachedItems);
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
  const getShortSwLabel = (worker) => {
    if (!worker) return 'none';
    const script = (worker.scriptURL || '').split('/').pop() || 'sw.js';
    const state = worker.state || 'unknown';
    return `${script} (${state})`;
  };
  const hashTextShort = (text) => {
    const src = String(text || '');
    let hash = 2166136261;
    for (let i = 0; i < src.length; i += 1){
      hash ^= src.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  };
  const meta = document.getElementById('developerUpdateMeta');
  if (meta) meta.textContent = 'Loading app update telemetry...';

  const fallbackVersion = APP_UI_VERSION_FALLBACK || '-';
  let runtimeVersion = '-';
  let swRegistered = 'No';
  let pendingUpdate = 'No';
  let cachesText = '-';
  let activeSwText = '-';
  let waitingSwText = '-';
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
        activeSwText = getShortSwLabel(reg.active);
        waitingSwText = getShortSwLabel(reg.waiting || reg.installing);
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
  setText('devUpdateActiveSw', activeSwText);
  setText('devUpdateWaitingSw', waitingSwText);
  let swFingerprint = 'n/a';
  try {
    const swResponse = await fetch('./sw.js', { cache: 'no-store' });
    if (swResponse.ok){
      const swText = await swResponse.text();
      swFingerprint = hashTextShort(swText);
    }
  } catch (_err){}
  if (meta){
    meta.textContent = `Last refresh: ${new Date().toLocaleString()} | Update-ready badge state: ${String(localStorage.getItem('dsisPwaUpdateBadgeState') || '0')} | sw.js fp: ${swFingerprint}`;
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
  const isDashboardCompact = key === 'Dashboard' && typeof getDashboardViewMode === 'function' && getDashboardViewMode() === 'compact';
  content.classList.toggle('dashboard-compact', !!isDashboardCompact);
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
  } else if (key === 'Supplies') {
    fab.style.display = 'none';
    closeSheet();
    closeSuppliesSheet(true);
    initSuppliesView();
  } else {
    fab.style.display = 'none';
    closeSheet();
    closeSuppliesSheet(true);
    if (key === 'Dashboard') initDashboardView();
    if (key === 'Action Center') initActionsView();
    if (key === 'Archives') initArchivesView();
    if (key === 'Developer Tools') initDeveloperToolsView();
  }
  requestAnimationFrame(() => animateViewEntrance());
}

function closeSuppliesSheet(reset = false){
  const suppliesSheet = document.getElementById('suppliesSheet');
  if (suppliesSheet) suppliesSheet.classList.remove('show');
  if (!reset) return;
  [
    'suppliesSheetEntityName',
    'suppliesSheetFundCluster',
    'suppliesSheetReference',
    'suppliesSheetIssuedQty',
    'suppliesSheetIssuedOffice',
    'suppliesSheetIssuedDate',
    'suppliesSheetDaysToConsume'
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const stockPill = document.getElementById('suppliesSheetStockNoPill');
  if (stockPill) stockPill.textContent = 'Updating Stock No. -';
  const availableQtyPill = document.getElementById('suppliesSheetAvailableQtyPill');
  if (availableQtyPill){
    availableQtyPill.textContent = 'Available Qty: -';
    availableQtyPill.classList.remove('over');
  }
  setSuppliesSheetEditingIndex(null);
  setSuppliesSheetLedgerEditContext(null);
}

function toggleSuppliesSheet(){
  if (activeViewKey() !== 'Supplies'){
    closeSuppliesSheet(true);
    return;
  }
  const suppliesSheet = document.getElementById('suppliesSheet');
  if (!suppliesSheet) return;
  const isOpen = suppliesSheet.classList.contains('show');
  suppliesSheet.classList.toggle('show', !isOpen);
}

function toggleSheet(){
  if (activeViewKey() === 'Supplies'){
    // Supplies data entry starts from staged items table.
    return;
  }
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
  const logos = [appLogo, document.getElementById('topbarSchoolLogo')].filter(Boolean);
  if (!logos.length) return;
  const logo = sanitizeSchoolLogoDataUrl(schoolIdentity.logoDataUrl || '');
  if (logo){
    logos.forEach((logoEl) => {
      logoEl.style.backgroundImage = `url("${logo}")`;
      logoEl.classList.add('has-image');
      logoEl.textContent = '';
      logoEl.title = 'School logo';
    });
    return;
  }
  logos.forEach((logoEl) => {
    logoEl.style.backgroundImage = '';
    logoEl.classList.remove('has-image');
    logoEl.textContent = getSchoolShortLabel(schoolIdentity.schoolName || '');
    logoEl.title = 'School initials';
  });
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
