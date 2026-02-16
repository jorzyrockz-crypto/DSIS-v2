function isValidICSNo(v){
  return /^\d{4}-\d{2}-\d{3}$/.test((v || '').trim());
}

function normalizeNewICSNoValue(v){
  const value = (v || '').trim();
  // Backfill 1-2 digit sequence to 3 digits only when YYYY-MM- prefix is complete.
  const twoDigitSeq = value.match(/^(\d{4}-\d{2}-)(\d{2})$/);
  if (twoDigitSeq) return `${twoDigitSeq[1]}0${twoDigitSeq[2]}`;
  const oneDigitSeq = value.match(/^(\d{4}-\d{2}-)(\d{1})$/);
  if (oneDigitSeq) return `${oneDigitSeq[1]}00${oneDigitSeq[2]}`;
  return value;
}

function formatICSNoInput(value){
  const digits = (value || '').replace(/\D/g, '').slice(0, 9);
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const seq = digits.slice(6, 9);
  if (digits.length <= 4) return year;
  if (digits.length <= 6) return `${year}-${month}`;
  return `${year}-${month}-${seq}`;
}

function prepareNewICS(){
  if (!hasRoleCapability('edit_records')) return;
  if (editingIndex !== null) return;
  clearForm();
  const icsInput = document.getElementById('icsNo');
  icsInput.value = '';
  icsInput.placeholder = 'YYYY-MM-XXX';
  addBtn.textContent = 'ADD ICS';
  validateForm();
}

function validateForm(){
  if (!hasRoleCapability('edit_records')){
    addBtn.classList.remove('enabled');
    return false;
  }
  const requiredIds = [
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
  const req = requiredIds.map((id) => document.getElementById(id));
  const filled = req.every((f) => f && f.value.trim() !== '');
  const icsNoValue = document.getElementById('icsNo').value.trim();
  const icsOK = editingIndex === null ? isValidICSNo(icsNoValue) : icsNoValue !== '';
  const ok = filled && icsOK;
  addBtn.classList.toggle('enabled', ok);
  if (ok) clearFormAlert();
  return ok;
}

function showFormAlert(message, type = 'error'){
  if (!formAlert) return;
  formAlert.className = `form-alert show ${type}`;
  formAlert.textContent = message || '';
}

function clearFormAlert(){
  if (!formAlert) return;
  formAlert.className = 'form-alert';
  formAlert.textContent = '';
}

function refreshInputTitles(root = document){
  root.querySelectorAll('input').forEach((el) => {
    el.title = el.value || '';
  });
}

function clearForm(){
  [
    'entityName', 'fundCluster', 'icsNo',
    'issuedByName', 'issuedByPos', 'issuedByDate',
    'receivedByName', 'receivedByPos', 'receivedByDate'
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  clearFormAlert();
  refreshInputTitles(sheet);
}

function resetFormMode(){
  editingIndex = null;
  addBtn.textContent = 'ADD ICS';
  clearForm();
  setStageContext(null);
}

function setStageContext(meta){
  const el = document.getElementById('stageContext');
  if (!el) return;
  if (!meta || !meta.icsNo){
    el.textContent = 'Working ICS: none';
    el.title = 'Working ICS: none';
    return;
  }
  const modeText = meta.mode ? `${meta.mode}: ` : '';
  const entityText = meta.entity ? ` | ${meta.entity}` : '';
  const fullText = `Working ICS: ${modeText}${meta.icsNo}${entityText}`;
  el.textContent = fullText;
  el.title = fullText;
}

function getCurrentFormMeta(){
  return {
    icsNo: document.getElementById('icsNo').value.trim(),
    entity: document.getElementById('entityName').value.trim(),
    mode: editingIndex !== null ? 'Editing' : 'Draft'
  };
}

function validateFormForStaging(){
  const missing = getMissingRequiredFields();
  if (missing.length){
    showFormAlert(`Complete all floating form fields. Missing: ${missing.join(', ')}.`, 'error');
    notify('error', `Complete all floating form fields. Missing: ${missing.join(', ')}.`);
    validateForm();
    return null;
  }

  let icsNo = document.getElementById('icsNo').value.trim();
  if (editingIndex === null){
    const normalizedICSNo = normalizeNewICSNoValue(icsNo);
    if (normalizedICSNo !== icsNo){
      document.getElementById('icsNo').value = normalizedICSNo;
    }
    icsNo = normalizedICSNo;
    if (!/^\d{4}-\d{2}-/.test(normalizedICSNo) || !isValidICSNo(normalizedICSNo)){
      showFormAlert('Invalid ICS No. Use format YYYY-MM-XXX.', 'error');
      notify('error', 'Invalid ICS No. Use format YYYY-MM-XXX.');
      validateForm();
      return null;
    }
  }
  clearFormAlert();
  return icsNo;
}

function getStageRows(){
  const body = document.getElementById('icsBody');
  if (!body) return [];
  return [...body.querySelectorAll('tr')].filter((r) => !r.classList.contains('stage-empty-row'));
}

function renumberStageRows(){
  getStageRows().forEach((row, idx) => {
    row.children[0].innerText = String(idx + 1);
  });
}

function renderStageEmptyState(){
  const body = document.getElementById('icsBody');
  if (!body) return;
  if (getStageRows().length > 0) return;
  body.innerHTML = '<tr class="stage-empty-row"><td class="empty-cell" colspan="9">No staged items yet. Click "+ Row" or import JSON.</td></tr>';
}

function resetStageItems(){
  const body = document.getElementById('icsBody');
  if (!body) return;
  body.innerHTML = '';
  renderStageEmptyState();
}

function loadItemsToStage(items){
  const body = document.getElementById('icsBody');
  if (!body) return;
  body.innerHTML = '';

  if (!items || items.length === 0){
    renderStageEmptyState();
    return;
  }

  items.forEach((it) => addRow(it));
}

function editICS(i){
  if (!requireAccess('open_ics_editor', { label: 'edit ICS records' })) return;
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const r = records[i];
  if (!r) return;

  editingIndex = i;
  addBtn.textContent = 'UPDATE ICS';

  document.getElementById('entityName').value = r.entity || '';
  document.getElementById('fundCluster').value = r.fund || '';
  document.getElementById('icsNo').value = r.icsNo || '';
  document.getElementById('issuedByName').value = r.signatories?.issuedBy?.name || '';
  document.getElementById('issuedByPos').value = r.signatories?.issuedBy?.position || '';
  document.getElementById('issuedByDate').value = (r.signatories?.issuedBy?.date || r.issuedDate || '').slice(0, 10);
  document.getElementById('receivedByName').value = r.signatories?.receivedBy?.name || '';
  document.getElementById('receivedByPos').value = r.signatories?.receivedBy?.position || '';
  document.getElementById('receivedByDate').value = (r.signatories?.receivedBy?.date || '').slice(0, 10);

  loadItemsToStage(r.items || []);
  setStageContext({ icsNo: r.icsNo || '', entity: r.entity || '', mode: 'Editing' });
  refreshInputTitles(sheet);
  sheet.classList.add('show');
  requestAnimationFrame(placeSheetNearAddItemButton);
  setTimeout(placeSheetNearAddItemButton, 80);
  notify('info', `Editing ${r.icsNo || 'ICS record'}.`);
  validateForm();
}

function getICSYearMonthPrefix(){
  const icsNo = (document.getElementById('icsNo')?.value || '').trim();
  const m = icsNo.match(/^(\d{4}-\d{2})/);
  return m ? m[1] : '';
}

function prefillItemNo(input){
  if (!input || input.value.trim() !== '') return;
  const prefix = getICSYearMonthPrefix();
  if (!prefix) return;
  input.value = `${prefix}-`;
}

function clearDuplicateItemNoFlags(){
  getStageRows().forEach((r) => {
    const input = r.querySelector('.stage-itemno');
    if (input) input.classList.remove('dup-error');
  });
}

function getDuplicateItemNoInfo(){
  const seen = new Map();
  const duplicates = new Map();
  getStageRows().forEach((r) => {
    const input = r.querySelector('.stage-itemno');
    if (!input) return;
    const raw = input.value.trim();
    if (!raw) return;
    const key = raw.toLowerCase();
    if (!seen.has(key)){
      seen.set(key, { value: raw, rows: [r] });
      return;
    }
    const existing = seen.get(key);
    existing.rows.push(r);
    duplicates.set(key, existing);
  });
  return [...duplicates.values()];
}

function markDuplicateItemNoRows(){
  clearDuplicateItemNoFlags();
  const dupes = getDuplicateItemNoInfo();
  dupes.forEach((d) => {
    d.rows.forEach((r) => {
      const input = r.querySelector('.stage-itemno');
      if (input) input.classList.add('dup-error');
    });
  });
  return dupes;
}

function onItemNoInput(input){
  markDuplicateItemNoRows();
}

function updateUnitSuggestionsForRow(row){
  if (!row) return;
  const desc = (row.querySelector('.stage-desc')?.value || '').trim().toLowerCase();
  const scoped = stageDescToUnits[desc] || [];
  fillDatalistOptions('stageUnitList', scoped.length ? scoped : Object.values(stageDescToUnits).flat());
}

function handleDescInput(input){
  const row = input.closest('tr');
  updateUnitSuggestionsForRow(row);
}

function adjustEUL(btn, delta){
  if (!hasRoleCapability('edit_records')) return;
  const row = btn.closest('tr');
  if (!row) return;
  const input = row.querySelector('.stage-eul-input');
  const cur = Number(input.value || 0);
  input.value = String(Math.max(0, cur + delta));
}

function addRow(seed = {}){
  if (!hasRoleCapability('edit_records')) return;
  const body = document.getElementById('icsBody');
  if (!body) return;
  const empty = body.querySelector('.stage-empty-row');
  if (empty) empty.remove();
  const i = getStageRows().length + 1;
  const qtyRaw = (seed.qtyText ?? seed.qty ?? '').toString();
  const unitCostNum = parseCurrencyValue(seed.unitCost);
  const unitCostRaw = Number.isFinite(unitCostNum) ? formatCurrencyValue(unitCostNum) : '';
  const totalNum = parseCurrencyValue(seed.total);
  const totalRaw = Number.isFinite(totalNum) ? formatCurrencyValue(totalNum) : '';
  const eulRaw = seed.eul === undefined || seed.eul === null || seed.eul === '' ? '' : String(seed.eul);
  const tr = document.createElement('tr');
  tr.innerHTML = `<td class="row-index">${i}</td>
    <td><input class="stage-input stage-desc" list="stageDescList" value="${(seed.desc || '').replace(/"/g, '&quot;')}" /></td>
    <td><input class="stage-input stage-itemno" value="${(seed.itemNo || '').replace(/"/g, '&quot;')}" /></td>
    <td><input class="stage-input stage-qty" value="${qtyRaw.replace(/"/g, '&quot;')}" /></td>
    <td><input class="stage-input stage-unit" list="stageUnitList" value="${(seed.unit || '').replace(/"/g, '&quot;')}" /></td>
    <td><input class="stage-input stage-unitcost" value="${unitCostRaw}" /></td>
    <td><input class="stage-input stage-total" readonly value="${totalRaw}" /></td>
    <td>
      <div class="stage-eul">
        <button class="eul-btn" data-stage-eul-delta="-1">-</button>
        <input class="stage-input eul-input stage-eul-input" readonly value="${eulRaw}" />
        <button class="eul-btn" data-stage-eul-delta="1">+</button>
      </div>
    </td>
    <td>
      <div class="stage-cell-actions">
        <button class="btn btn-sm btn-secondary btn-icon icon-only-btn stage-add-row-btn" title="Add Row" aria-label="Add Row"><i data-lucide="plus" aria-hidden="true"></i></button>
        <button class="btn btn-sm btn-danger btn-icon icon-only-btn stage-del-row-btn" title="Delete Row" aria-label="Delete Row"><i data-lucide="trash-2" aria-hidden="true"></i></button>
      </div>
    </td>`;
  body.appendChild(tr);
  updateUnitSuggestionsForRow(tr);
  if (!seed.total) syncRow(tr.querySelector('.stage-qty'));
  if (sheet.classList.contains('show')) requestAnimationFrame(placeSheetNearAddItemButton);
}

function delRow(btn){
  if (!hasRoleCapability('edit_records')) return;
  const row = btn.closest('tr');
  if (!row) return;
  row.remove();
  renumberStageRows();
  markDuplicateItemNoRows();
  renderStageEmptyState();
}

function syncRow(cell){
  const row = cell.closest('tr');
  if (!row) return;
  const qty = parseQuantityValue(row.querySelector('.stage-qty')?.value);
  const cost = parseCurrencyValue(row.querySelector('.stage-unitcost')?.value);
  const totalInput = row.querySelector('.stage-total');
  if (!totalInput) return;
  if (!Number.isFinite(qty) || !Number.isFinite(cost)){
    totalInput.value = '';
    return;
  }
  totalInput.value = formatCurrencyValue(qty * cost);
}

function formatCurrencyInput(input){
  const value = parseCurrencyValue(input.value);
  input.value = Number.isFinite(value) ? formatCurrencyValue(value) : '';
  syncRow(input);
}
