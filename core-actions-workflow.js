function getActionItemKey(icsNo, itemNo, sourceType){
  return `${sourceType || 'ics'}||${icsNo || ''}||${itemNo || ''}`;
}

function toggleActionCenterSelection(icsNo, itemNo, checked, sourceType){
  if (!requireAccess('archive_items', { label: 'select Action Center items for batch actions' })) return;
  const key = getActionItemKey(icsNo, itemNo, sourceType);
  if (checked) actionCenterSelectedKeys[key] = { icsNo: icsNo || '', itemNo: itemNo || '', sourceType: sourceType || 'ics' };
  else delete actionCenterSelectedKeys[key];
  const active = [...navItems].find(n => n.classList.contains('active'))?.dataset?.view;
  if (active === 'Action Center') renderView('Action Center');
}

function openBatchWasteReportFromActionCenter(){
  if (!requireAccess('archive_items', { label: 'prepare batch Waste Materials Report' })) return;
  const scopedTargets = getScopedActionCenterBatchTargets();
  if (!scopedTargets.length){
    notify('error', 'No Action Center items are available in the current scope.');
    return;
  }
  const eligible = scopedTargets.filter((x) => hasDisposalSituation(x.icsNo, x.itemNo, x.sourceType));
  if (!eligible.length){
    notify('error', 'No disposal-ready items found in the current Action Center scope.');
    return;
  }
  if (eligible.length < scopedTargets.length){
    const skipped = scopedTargets.length - eligible.length;
    notify('info', `Batch PRINT WMR will include ${eligible.length} disposal-ready item(s). Skipped ${skipped} non-disposal item(s).`);
  }
  openWasteReportModalForTargets(eligible, '');
}

function hasDisposalSituation(icsNo, itemNo, sourceType){
  const ref = findItemRef(icsNo, itemNo, sourceType || 'ics');
  if (!ref) return false;
  const item = ref.records?.[ref.rIdx]?.items?.[ref.iIdx];
  const logs = Array.isArray(item?.inspections) ? item.inspections : [];
  if (!logs.length) return false;
  const latest = logs[logs.length - 1] || {};
  const latestStatus = (latest?.status || '').toString().trim().toLowerCase();
  if (latestStatus !== 'unserviceable') return false;
  return isDisposalInspectionReason(latest?.reason || '');
}

function getScopedActionCenterRows(){
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
  return actionCenterItemFilter
    ? scoped.filter((r) => normalizeICSKey(r.itemNo || '') === normalizeICSKey(actionCenterItemFilter))
    : scoped;
}

function getScopedActionCenterBatchTargets(){
  const seen = {};
  return getScopedActionCenterRows().reduce((out, row) => {
    const key = getActionItemKey(row.icsNo, row.itemNo, row.sourceType);
    if (seen[key]) return out;
    seen[key] = true;
    out.push({ icsNo: row.icsNo || '', itemNo: row.itemNo || '', sourceType: row.sourceType || 'ics' });
    return out;
  }, []);
}

function getBatchWmrEligibleCount(){
  const targets = getScopedActionCenterBatchTargets();
  if (!targets.length) return 0;
  let count = 0;
  targets.forEach((t) => {
    if (hasDisposalSituation(t.icsNo, t.itemNo, t.sourceType)) count += 1;
  });
  return count;
}

const UNSERVICEABLE_SITUATIONS = [
  {
    reason: '1. Worn-Out (Normal Wear and Tear)',
    remarks: [
      'Due to prolonged use',
      'Deterioration over time'
    ],
    note: [
      'Example: 15-year-old armchairs; old printers that reached end of life.',
      'Usually disposed through sale as scrap or destruction.',
      'No accountability issue.'
    ]
  },
  {
    reason: '2. Beyond Economical Repair',
    remarks: [
      'Repair cost exceeds replacement cost',
      'Spare parts unavailable or too expensive'
    ],
    note: [
      'Example: CPU motherboard replacement costs more than a new unit; major equipment requiring costly overhaul.',
      'Disposal recommended.'
    ]
  },
  {
    reason: '3. Obsolete',
    remarks: [
      'Still functioning but outdated',
      'Not compatible with new systems',
      'Technology advancement'
    ],
    note: [
      'Example: old Windows 7 desktops; outdated routers.',
      'May be transferred or sold.'
    ]
  },
  {
    reason: '4. Damaged Due to Calamity / Fortuitous Event',
    remarks: [
      'Flood',
      'Fire',
      'Earthquake',
      'Typhoon'
    ],
    note: [
      'Requires: incident report, certification from proper authority, and supporting documents.'
    ]
  },
  {
    reason: '5. Lost / Damaged Due to Negligence',
    remarks: [
      'Improper handling',
      'Misuse',
      'Carelessness'
    ],
    note: [
      'Requires: investigation, determination of liability, and possible employee accountability.',
      'Cannot be disposed without clearing accountability.'
    ]
  },
  {
    reason: '6. Condemned / Junk / Valueless',
    remarks: [
      'Completely destroyed',
      'No salvage value'
    ],
    note: [
      'Requires: usually for destruction.'
    ]
  }
];

const DISPOSAL_ELIGIBLE_UNSERVICEABLE_REASONS = new Set([
  'item for disposal',
  'item beyond eul and unserviceable',
  'item damaged / obsolete',
  'item transferred to another office',
  'item lost / destroyed',
  '1. worn-out (normal wear and tear)',
  '2. beyond economical repair',
  '3. obsolete',
  '4. damaged due to calamity / fortuitous event',
  '5. lost / damaged due to negligence',
  '6. condemned / junk / valueless'
]);

function getUnserviceableSituation(reason){
  const selected = (reason || '').toString().trim().toLowerCase();
  if (!selected) return null;
  return UNSERVICEABLE_SITUATIONS.find((entry) => (entry.reason || '').toLowerCase() === selected) || null;
}

function getUnserviceableRemarksText(reason){
  const info = getUnserviceableSituation(reason);
  if (!info || !Array.isArray(info.remarks) || !info.remarks.length) return [];
  return info.remarks.slice();
}

function getUnserviceableGuidanceText(reason){
  const info = getUnserviceableSituation(reason);
  if (!info || !Array.isArray(info.note) || !info.note.length) return '';
  return info.note.map((line) => `\u{1F4CC} ${line}`).join('\n');
}

function syncUnserviceableSituationDetails(){
  const reason = (document.getElementById('inspReason')?.value || '').trim();
  const remarksEl = document.getElementById('inspRemarks');
  const noteEl = document.getElementById('inspSituationNote');
  if (remarksEl){
    const options = getUnserviceableRemarksText(reason);
    remarksEl.innerHTML = '';
    if (!options.length){
      remarksEl.innerHTML = '<option value="">Select situation first</option>';
    } else {
      remarksEl.innerHTML = '<option value="">Select Remark</option>';
      options.forEach((line) => {
        const opt = document.createElement('option');
        opt.value = line;
        opt.textContent = line;
        remarksEl.appendChild(opt);
      });
      remarksEl.value = options[0] || '';
    }
  }
  if (noteEl) noteEl.textContent = getUnserviceableGuidanceText(reason);
}


function unarchiveItem(index){
  if (!requireAccess('archive_items', { label: 'unarchive items' })) return;
  const archived = getArchivedItems();
  const entry = archived[index];
  if (!entry) return;
  const sourceType = (entry?.source?.sourceType || 'ics').toString().toLowerCase() === 'par' ? 'par' : 'ics';
  const storageKey = sourceType === 'par' ? 'parRecords' : 'icsRecords';
  const sourceNo = sourceType === 'par'
    ? ((entry.source?.parNo || entry.source?.icsNo || '').toString())
    : ((entry.source?.icsNo || '').toString());
  const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const targetIdx = records.findIndex((r) => {
    const recordNo = sourceType === 'par'
      ? ((r.parNo || r.icsNo || '').toString())
      : ((r.icsNo || '').toString());
    return recordNo === sourceNo;
  });
  if (targetIdx === -1){
    notify('error', `Cannot unarchive. Source ${(sourceType === 'par' ? 'PAR' : 'ICS')} ${sourceNo || ''} was not found.`);
    return;
  }

  const target = records[targetIdx];
  target.items = Array.isArray(target.items) ? target.items : [];
  const itemNo = (entry.item?.itemNo || '').trim().toLowerCase();
  const duplicate = target.items.some(it => (it.itemNo || '').trim().toLowerCase() === itemNo && itemNo);
  if (duplicate){
    notify('error', `Cannot unarchive. Item No. ${entry.item?.itemNo || ''} already exists in ${(sourceType === 'par' ? 'PAR' : 'ICS')} ${(sourceType === 'par' ? (target.parNo || target.icsNo || '') : (target.icsNo || ''))}.`);
    return;
  }

  target.items.push(JSON.parse(JSON.stringify(entry.item)));
  records[targetIdx] = appendRecordLineage(
    target,
    'unarchive',
    `unarchive:${entry.item?.itemNo || 'item'}`
  );
  archived.splice(index, 1);
  localStorage.setItem(storageKey, JSON.stringify(records));
  setArchivedItems(archived);
  recordAudit(
    'unarchive',
    `Unarchived item ${entry.item?.itemNo || ''} back to ${(sourceType === 'par' ? (target.parNo || target.icsNo || '') : (target.icsNo || ''))}.`,
    buildRecordLineageAuditMeta(records[targetIdx], {
      sourceType,
      itemNo: entry.item?.itemNo || '',
      recordParNo: sourceType === 'par' ? (target.parNo || target.icsNo || '') : ''
    })
  );
  notify('success', `Unarchived item ${entry.item?.itemNo || ''} back to ${(sourceType === 'par' ? (target.parNo || target.icsNo || '') : (target.icsNo || ''))}.`);

  initArchivesView();
  initActionsView();
  loadICSRecords();
  loadPARRecords();
}


function onInspectionChange(sel, icsNo, itemNo, sourceType){
  if (!requireAccess('archive_items', { label: 'record inspection results' })){
    if (sel) sel.value = '';
    return;
  }
  const resolvedSourceType = (sourceType || 'ics').toString().toLowerCase() === 'par' ? 'par' : 'ics';
  if (!sel || !sel.value) return;
  if (sel.value === 'serviceable'){
    const ref = findItemRef(icsNo, itemNo, resolvedSourceType);
    if (!ref) return;
    const it = ref.records[ref.rIdx].items[ref.iIdx];
    it.inspections = Array.isArray(it.inspections) ? it.inspections : [];
    it.inspections.push({
      status: 'serviceable',
      date: new Date().toISOString().slice(0,10),
      recordedAt: new Date().toISOString(),
      recordedByProfileKey: getCurrentActorProfileKey()
    });
    ref.records[ref.rIdx] = appendRecordLineage(
      ref.records[ref.rIdx],
      'inspection',
      `serviceable:${itemNo || 'item'}`
    );
    localStorage.setItem(ref.storageKey || 'icsRecords', JSON.stringify(ref.records));
    notify('info', `Inspection saved (Serviceable) for ${itemNo}`);
    initActionsView();
    return;
  }
  if (sel.value === 'unserviceable'){
    pendingInspection = { icsNo, itemNo, sourceType: resolvedSourceType };
    sel.value = '';
    let overlay = document.getElementById('inspectionOverlay');
    let reasonEl = document.getElementById('inspReason');
    let dateEl = document.getElementById('inspDate');
    let remarksEl = document.getElementById('inspRemarks');
    let notesEl = document.getElementById('inspNotes');
    let situationNoteEl = document.getElementById('inspSituationNote');
    if (!overlay || !reasonEl || !dateEl || !remarksEl || !notesEl || !situationNoteEl){
      const shell = document.createElement('div');
      shell.innerHTML = `
        <div class="actions-modal-overlay" id="inspectionOverlay">
          <div class="actions-modal modal-sm">
            <div class="modal-head">
              <h3>Inspection Result - Unserviceable</h3>
              <p class="modal-sub">Record situation details before proceeding to archive or report actions.</p>
            </div>
            <div class="modal-body">
              <div class="form-col modal-form">
                <label>Situation</label>
                <select id="inspReason" class="stage-input">
                  <option value="">Select Situation</option>
                  <option>1. Worn-Out (Normal Wear and Tear)</option>
                  <option>2. Beyond Economical Repair</option>
                  <option>3. Obsolete</option>
                  <option>4. Damaged Due to Calamity / Fortuitous Event</option>
                  <option>5. Lost / Damaged Due to Negligence</option>
                  <option>6. Condemned / Junk / Valueless</option>
                </select>
                <label>Date</label>
                <input id="inspDate" type="date" class="stage-input" />
                <label>Remarks</label>
                <select id="inspRemarks" class="stage-input">
                  <option value="">Select situation first</option>
                </select>
                <label>Notes</label>
                <textarea id="inspNotes" class="stage-input" rows="3" placeholder="Additional notes (optional)"></textarea>
                <div id="inspSituationNote" class="modal-sub" style="margin-top:6px; white-space:pre-line;"></div>
              </div>
            </div>
            <div class="modal-foot">
              <div class="ics-card-actions">
                <button class="btn btn-sm btn-secondary" data-action="closeInspectionModal">Cancel</button>
                <button id="inspSaveBtn" class="btn btn-sm btn-primary" data-action="saveInspection" disabled>Save</button>
              </div>
            </div>
          </div>
        </div>`;
      const injected = shell.firstElementChild;
      if (injected) document.body.appendChild(injected);
      overlay = document.getElementById('inspectionOverlay');
      reasonEl = document.getElementById('inspReason');
      dateEl = document.getElementById('inspDate');
      remarksEl = document.getElementById('inspRemarks');
      notesEl = document.getElementById('inspNotes');
      situationNoteEl = document.getElementById('inspSituationNote');
      bindInspectionModalValidation();
    }
    clearFieldErrors(overlay || document);
    if (!overlay || !reasonEl || !dateEl || !remarksEl || !notesEl || !situationNoteEl){
      notify('error', 'Inspection modal is unavailable. Reload the page and try again.');
      return;
    }
    reasonEl.value = '';
    dateEl.value = '';
    remarksEl.innerHTML = '<option value="">Select situation first</option>';
    remarksEl.value = '';
    notesEl.value = '';
    situationNoteEl.textContent = '';
    overlay.classList.add('show');
    updateInspectionArchiveButtonState();
  }
}

function closeInspectionModal(){
  const overlay = document.getElementById('inspectionOverlay');
  if (overlay) overlay.classList.remove('show');
  clearFieldErrors(overlay || document);
  pendingInspection = null;
  document.getElementById('inspReason').value = '';
  document.getElementById('inspDate').value = '';
  if (document.getElementById('inspRemarks')){
    document.getElementById('inspRemarks').innerHTML = '<option value="">Select situation first</option>';
    document.getElementById('inspRemarks').value = '';
  }
  document.getElementById('inspNotes').value = '';
  if (document.getElementById('inspSituationNote')) document.getElementById('inspSituationNote').textContent = '';
  updateInspectionArchiveButtonState();
}

function saveInspection(){
  return saveInspectionCore(false);
}

function saveInspectionAndArchive(){
  return saveInspectionCore(true);
}

function saveInspectionCore(openArchiveAfter){
  if (!requireAccess('archive_items', { label: 'save inspection results' })) return false;
  if (!pendingInspection){
    notify('error', 'No selected item for inspection.');
    return false;
  }
  const reason = (document.getElementById('inspReason')?.value || '').trim();
  const date = (document.getElementById('inspDate')?.value || '').trim();
  const remarks = (document.getElementById('inspRemarks')?.value || '').trim();
  const notes = (document.getElementById('inspNotes')?.value || '').trim();
  setFieldError('inspReason', false);
  setFieldError('inspDate', false);
  if (!reason || !date){
    setFieldError('inspReason', !reason);
    setFieldError('inspDate', !date);
    notify('error', 'Inspection reason and date are required.');
    return false;
  }
  const ref = findItemRef(pendingInspection.icsNo, pendingInspection.itemNo, pendingInspection.sourceType || 'ics');
  if (!ref) return false;
  const it = ref.records[ref.rIdx].items[ref.iIdx];
  it.inspections = Array.isArray(it.inspections) ? it.inspections : [];
  it.inspections.push({
    status: 'unserviceable',
    reason,
    date,
    remarks,
    notes,
    recordedAt: new Date().toISOString(),
    recordedByProfileKey: getCurrentActorProfileKey()
  });
  ref.records[ref.rIdx] = appendRecordLineage(
    ref.records[ref.rIdx],
    'inspection',
    `unserviceable:${it.itemNo || pendingInspection.itemNo || 'item'}`
  );
  localStorage.setItem(ref.storageKey || 'icsRecords', JSON.stringify(ref.records));
  const target = { icsNo: pendingInspection.icsNo, itemNo: pendingInspection.itemNo, sourceType: pendingInspection.sourceType || 'ics' };
  pendingInspection = null;
  document.getElementById('inspReason').value = '';
  document.getElementById('inspDate').value = '';
  if (document.getElementById('inspRemarks')){
    document.getElementById('inspRemarks').innerHTML = '<option value="">Select situation first</option>';
    document.getElementById('inspRemarks').value = '';
  }
  document.getElementById('inspNotes').value = '';
  if (document.getElementById('inspSituationNote')) document.getElementById('inspSituationNote').textContent = '';
  updateInspectionArchiveButtonState();
  closeInspectionModal();
  notify('success', `Inspection saved (Unserviceable) for ${it.itemNo || 'item'}`);
  if (openArchiveAfter && isDisposalInspectionReason(reason)){
    openWasteReportModal(target.icsNo, target.itemNo, 'archive', 'inspection', target.sourceType || 'ics');
  } else if (openArchiveAfter){
    openArchiveModal(target.icsNo, target.itemNo, target.sourceType);
  } else {
    initActionsView();
  }
  return true;
}

function isDisposalInspectionReason(reason){
  const normalized = (reason || '').toString().trim().toLowerCase();
  if (!normalized) return false;
  if (DISPOSAL_ELIGIBLE_UNSERVICEABLE_REASONS.has(normalized)) return true;
  const numberMatch = normalized.match(/^(\d+)\s*\./);
  if (numberMatch){
    const situationNo = Number(numberMatch[1]);
    return Number.isFinite(situationNo) && situationNo >= 1 && situationNo <= 6;
  }
  return false;
}

function bindInspectionModalValidation(){
  const reasonEl = document.getElementById('inspReason');
  const dateEl = document.getElementById('inspDate');
  if (reasonEl && !reasonEl.dataset.boundArchiveCheck){
    reasonEl.addEventListener('change', () => {
      syncUnserviceableSituationDetails();
      updateInspectionArchiveButtonState();
    });
    reasonEl.dataset.boundArchiveCheck = '1';
  }
  if (dateEl && !dateEl.dataset.boundArchiveCheck){
    dateEl.addEventListener('input', updateInspectionArchiveButtonState);
    dateEl.addEventListener('change', updateInspectionArchiveButtonState);
    dateEl.dataset.boundArchiveCheck = '1';
  }
  syncUnserviceableSituationDetails();
  updateInspectionArchiveButtonState();
}

function updateInspectionArchiveButtonState(){
  const saveBtn = document.getElementById('inspSaveBtn');
  const archiveBtn = document.getElementById('inspArchiveBtn');
  const reason = (document.getElementById('inspReason')?.value || '').trim();
  const date = (document.getElementById('inspDate')?.value || '').trim();
  const enabled = !!(reason && date && pendingInspection);
  if (saveBtn) saveBtn.disabled = !enabled;
  if (archiveBtn) archiveBtn.disabled = !enabled;
}

function formatInspectionHistoryDateTime(value){
  if (!value) return '-';
  const dt = new Date(value);
  if (!Number.isNaN(dt.getTime())) return dt.toLocaleString();
  return String(value);
}

function openInspectionHistory(icsNo, itemNo, sourceType){
  let body = document.getElementById('inspectionHistoryBody');
  let overlay = document.getElementById('inspectionHistoryOverlay');
  if (!body || !overlay){
    const shell = document.createElement('div');
    shell.innerHTML = `
      <div class="actions-modal-overlay" id="inspectionHistoryOverlay">
        <div class="actions-modal modal-lg inspection-history-modal">
          <div class="modal-head inspection-history-head">
            <h3 class="inspection-history-title">Inspection History</h3>
            <button class="inspection-history-close modal-close-btn" data-action="closeInspectionHistory"><i data-lucide="x" aria-hidden="true"></i>Close</button>
          </div>
          <div class="modal-body" id="inspectionHistoryBody"></div>
        </div>
      </div>`;
    const injected = shell.firstElementChild;
    if (injected) document.body.appendChild(injected);
    body = document.getElementById('inspectionHistoryBody');
    overlay = document.getElementById('inspectionHistoryOverlay');
    if (!body || !overlay) return;
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
  }
  const resolvedSourceType = (sourceType || 'ics').toString().toLowerCase() === 'par' ? 'par' : 'ics';
  const ref = findItemRef(icsNo, itemNo, resolvedSourceType);
  if (!ref){
    body.innerHTML = '<div class="inspection-history-empty">No inspection history found.</div>';
    overlay.classList.add('show');
    return;
  }
  const it = ref.records[ref.rIdx].items[ref.iIdx];
  const logs = Array.isArray(it.inspections) ? it.inspections : [];
  const hasWasteReport = !!(it.wasteReport && it.wasteReport.preparedAt);
  const canArchive = hasRoleCapability('archive_items');
  const rows = logs.slice().reverse().map((log, idx) => {
    const statusRaw = (log.status || '').toString().trim().toLowerCase();
    const statusLabel = statusRaw ? `${statusRaw.charAt(0).toUpperCase()}${statusRaw.slice(1)}` : '-';
    const statusClass = statusRaw === 'serviceable' ? 'ok' : (statusRaw === 'unserviceable' ? 'danger' : '');
    const canPrint = resolvedSourceType === 'ics' && hasWasteReport && statusRaw === 'unserviceable';
    const actionCell = canPrint
      ? `<button class="btn btn-sm btn-secondary btn-icon icon-only-btn" title="Print Waste Report" aria-label="Print Waste Report" data-action="printWasteMaterialsReport" data-arg1="${escapeHTML(icsNo || '')}" data-arg2="${escapeHTML(itemNo || '')}" data-arg3="${escapeHTML(resolvedSourceType)}" ${canArchive ? '' : 'disabled'}><i data-lucide="printer" aria-hidden="true"></i></button>`
      : '-';
    const recordedBy = normalizeProfileKeyValue(log.recordedByProfileKey || log.recordedBy || log.by || '');
    const reportPreparedBy = normalizeProfileKeyValue(log.reportPreparedByProfileKey || '');
    const reason = (log.reason || '').toString().trim();
    const remarks = (log.remarks || '').toString().trim();
    const mappedRemarks = statusRaw === 'unserviceable' ? getUnserviceableRemarksText(reason) : [];
    const resolvedRemarks = remarks || (mappedRemarks[0] || '');
    const notesRaw = (log.notes || '').toString().trim();
    const notes = notesRaw
      .replace(/\s*\|\s*Prepared Waste Materials Report\s*\([^)]+\)\s*/gi, ' ')
      .trim();
    const entryNo = logs.length - idx;
    const recordedAtText = formatInspectionHistoryDateTime(log.recordedAt || log.date || '');
    const reportPreparedAtText = formatInspectionHistoryDateTime(log.reportPreparedAt || '');
    const recordedCellParts = [
      `<div>${escapeHTML(recordedAtText)}</div>`,
      `<div class="inspection-history-meta">${escapeHTML(recordedBy || '-')}</div>`
    ];
    if (log.reportPreparedAt){
      recordedCellParts.push(`<div class="inspection-history-meta">WMR: ${escapeHTML(reportPreparedAtText)}${reportPreparedBy ? ` | ${escapeHTML(reportPreparedBy)}` : ''}</div>`);
    } else if (/Prepared Waste Materials Report/i.test(notesRaw)) {
      recordedCellParts.push('<div class="inspection-history-meta">WMR: Prepared</div>');
    }
    const recordedCell = recordedCellParts.join('');
    return `
      <tr>
        <td>${entryNo}</td>
        <td>${escapeHTML(log.date || '-')}</td>
        <td>${statusRaw ? `<span class="insp-status-pill ${statusClass}">${escapeHTML(statusLabel)}</span>` : '-'}</td>
        <td>${escapeHTML(reason || '-')}</td>
        <td>${escapeHTML(resolvedRemarks || '-').replace(/\n/g, '<br>')}</td>
        <td>${escapeHTML(notes || '-').replace(/\n/g, '<br>')}</td>
        <td>${recordedCell}</td>
        <td>${actionCell}</td>
      </tr>
    `;
  }).join('');
  body.innerHTML = logs.length ? `
    <div class="inspection-history-table-wrap">
      <table class="inspection-history-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Status</th>
            <th>Situation</th>
            <th>Remark</th>
            <th>Notes</th>
            <th>Recorded</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  ` : `<div class="inspection-history-empty">No inspection history found.</div>`;
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
  overlay.classList.add('show');
}

function closeInspectionHistory(){
  const overlay = document.getElementById('inspectionHistoryOverlay');
  if (overlay) overlay.classList.remove('show');
}

function openArchiveModal(icsNo, itemNo, sourceType){
  if (!requireAccess('archive_items', { label: 'open archive modal' })) return;
  const resolvedSourceType = (sourceType || 'ics').toString().toLowerCase() === 'par' ? 'par' : 'ics';
  const ref = findItemRef(icsNo, itemNo, resolvedSourceType);
  if (!ref){
    notify('error', 'Item not found for archive.');
    return;
  }
  const item = ref.records?.[ref.rIdx]?.items?.[ref.iIdx];
  const logs = Array.isArray(item?.inspections) ? item.inspections : [];
  const latest = logs.length ? logs[logs.length - 1] : null;
  const latestStatus = (latest?.status || '').toString().trim().toLowerCase();
  const latestReason = (latest?.reason || '').toString().trim();
  const rawRemarks = (latest?.remarks || '').toString().trim();
  const inferredRemarks = latestReason ? (getUnserviceableRemarksText(latestReason)[0] || '') : '';
  const hasRemarks = !!(rawRemarks || inferredRemarks);
  if (latestStatus !== 'unserviceable' || !hasRemarks){
    notify('error', 'Archive requires latest inspection as Unserviceable with Remarks.');
    return;
  }
  pendingArchiveTarget = { icsNo, itemNo, sourceType: resolvedSourceType };
  const overlay = document.getElementById('archiveOverlay');
  clearFieldErrors(overlay || document);
  if (overlay) overlay.classList.add('show');
}

function closeArchiveModal(returnToInspection){
  const target = pendingArchiveTarget ? { ...pendingArchiveTarget } : null;
  pendingArchiveTarget = null;
  const overlay = document.getElementById('archiveOverlay');
  if (overlay) overlay.classList.remove('show');
  clearFieldErrors(overlay || document);
  if (returnToInspection && target){
    pendingInspection = { icsNo: target.icsNo, itemNo: target.itemNo, sourceType: target.sourceType || 'ics' };
    const inspOverlay = document.getElementById('inspectionOverlay');
    if (inspOverlay) inspOverlay.classList.add('show');
    updateInspectionArchiveButtonState();
  }
}

function confirmArchiveItem(){
  if (!requireAccess('archive_items', { label: 'archive items' })) return;
  if (!pendingArchiveTarget) return;
  const status = (document.getElementById('archiveApprovalStatus')?.value || '').trim();
  setFieldError('archiveApprovalStatus', false);
  if (!status){
    setFieldError('archiveApprovalStatus', true);
    notify('error', 'Select archive approval status.');
    return;
  }
  const approvedBy = (document.getElementById('archiveApprovedBy')?.value || '').trim();
  const approvedDate = (document.getElementById('archiveApprovedDate')?.value || '').trim();
  const referenceNo = (document.getElementById('archiveReferenceNo')?.value || '').trim();
  const remarks = (document.getElementById('archiveRemarks')?.value || '').trim();

  const ref = findItemRef(pendingArchiveTarget.icsNo, pendingArchiveTarget.itemNo, pendingArchiveTarget.sourceType || 'ics');
  if (!ref){
    notify('error', 'Item not found for archive.');
    closeArchiveModal();
    return;
  }

  const sourceRecord = ref.records[ref.rIdx];
  const item = sourceRecord.items[ref.iIdx];
  const sourceType = (pendingArchiveTarget?.sourceType || 'ics').toString().toLowerCase() === 'par' ? 'par' : 'ics';
  const sourceNo = sourceType === 'par'
    ? ((sourceRecord.parNo || sourceRecord.icsNo || pendingArchiveTarget.icsNo || '').toString())
    : ((sourceRecord.icsNo || pendingArchiveTarget.icsNo || '').toString());
  const lastInsp = Array.isArray(item.inspections)
    ? [...item.inspections].reverse().find((x) => (x.status || '').toLowerCase() === 'unserviceable')
    : null;
  if (lastInsp && isDisposalInspectionReason(lastInsp.reason) && !(item.wasteReport && item.wasteReport.preparedAt)){
    notify('error', 'Complete Waste Materials Report metadata before archiving this disposal item.');
    closeArchiveModal();
    openWasteReportModal(sourceNo, item.itemNo || '', 'archive', 'inspection', sourceType);
    return;
  }
  const actorProfileKey = getCurrentActorProfileKey();
  const archived = getArchivedItems();
  archived.unshift({
    archivedAt: new Date().toISOString(),
    archivedByProfileKey: actorProfileKey,
    source: {
      sourceType,
      icsNo: sourceNo,
      parNo: sourceType === 'par' ? sourceNo : '',
      entity: sourceRecord.entity || '',
      fund: sourceRecord.fund || '',
      issuedDate: sourceRecord.issuedDate || ''
    },
    item: JSON.parse(JSON.stringify(item)),
    disposal: {
      status,
      approvedBy,
      approvedByProfileKey: actorProfileKey,
      approvedDate,
      referenceNo,
      remarks
    }
  });
  setArchivedItems(archived);

  ref.records[ref.rIdx].items.splice(ref.iIdx, 1);
  ref.records[ref.rIdx] = appendRecordLineage(
    ref.records[ref.rIdx],
    'archive',
    `archive:${item.itemNo || 'item'}`
  );
  localStorage.setItem(ref.storageKey || 'icsRecords', JSON.stringify(ref.records));

  document.getElementById('archiveApprovalStatus').value = '';
  document.getElementById('archiveApprovedBy').value = '';
  document.getElementById('archiveApprovedDate').value = '';
  document.getElementById('archiveReferenceNo').value = '';
  document.getElementById('archiveRemarks').value = '';
  closeArchiveModal();
  recordAudit(
    'archive',
    `Archived item ${item.itemNo || ''} from ${(sourceType === 'par' ? `PAR ${sourceNo}` : `ICS ${sourceNo}`)}.`,
    buildRecordLineageAuditMeta(ref.records[ref.rIdx], {
      sourceType,
      itemNo: item.itemNo || '',
      recordParNo: sourceType === 'par' ? sourceNo : ''
    })
  );
  notify('success', `Item ${item.itemNo || ''} archived.`);
  initActionsView();
  loadICSRecords();
  loadPARRecords();
  if ([...navItems].some(n => n.classList.contains('active') && n.dataset.view === 'Archives')) initArchivesView();
}

function openWasteReportModal(icsNo, itemNo, nextAction, returnModal, sourceType = 'ics'){
  openWasteReportModalForTargets([{ icsNo, itemNo, sourceType }], nextAction || '', returnModal || '');
}

function setWmrDatalistOptions(id, values){
  const el = document.getElementById(id);
  if (!el) return;
  const clean = [...new Set((Array.isArray(values) ? values : [])
    .map((v) => (v || '').toString().trim())
    .filter(Boolean))];
  el.innerHTML = clean.map((v) => `<option value="${escapeHTML(v)}"></option>`).join('');
}

function applyWmrSignatoryAutosuggest(){
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const archived = getArchivedItems();
  const placeOfStorage = [];
  const certified = [];
  const approved = [];
  const inspection = [];
  const witness = [];
  (records || []).forEach((r) => {
    if (r?.wasteReportMeta?.placeOfStorage) placeOfStorage.push(r.wasteReportMeta.placeOfStorage);
    if (r?.wasteReportMeta?.certifiedCorrect) certified.push(r.wasteReportMeta.certifiedCorrect);
    if (r?.wasteReportMeta?.disposalApproved) approved.push(r.wasteReportMeta.disposalApproved);
    if (r?.wasteReportMeta?.inspectionOfficer) inspection.push(r.wasteReportMeta.inspectionOfficer);
    if (r?.wasteReportMeta?.witnessToDisposal) witness.push(r.wasteReportMeta.witnessToDisposal);
    if (r?.signatories?.receivedBy?.name) certified.push(r.signatories.receivedBy.name);
    if (r?.signatories?.issuedBy?.name) approved.push(r.signatories.issuedBy.name);
    const items = Array.isArray(r?.items) ? r.items : [];
    items.forEach((it) => {
      const wr = it?.wasteReport || {};
      if (wr.placeOfStorage) placeOfStorage.push(wr.placeOfStorage);
      if (wr.certifiedCorrect) certified.push(wr.certifiedCorrect);
      if (wr.disposalApproved) approved.push(wr.disposalApproved);
      if (wr.inspectionOfficer) inspection.push(wr.inspectionOfficer);
      if (wr.witnessToDisposal) witness.push(wr.witnessToDisposal);
    });
  });
  (archived || []).forEach((entry) => {
    const wr = entry?.item?.wasteReport || {};
    if (wr.placeOfStorage) placeOfStorage.push(wr.placeOfStorage);
  });
  setWmrDatalistOptions('wmrPlaceOfStorageList', placeOfStorage);
  setWmrDatalistOptions('wmrCertifiedCorrectList', certified);
  setWmrDatalistOptions('wmrDisposalApprovedList', approved);
  setWmrDatalistOptions('wmrInspectionOfficerList', inspection);
  setWmrDatalistOptions('wmrWitnessToDisposalList', witness);
}

function resetWasteReportDraftFields(){
  const setValue = (id, value = '') => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };
  setValue('wmrPlaceOfStorage', 'ITEMS FOR DISPOSAL');
  setValue('wmrArchiveApprovalStatus');
  setValue('wmrCertifiedCorrect');
  setValue('wmrDisposalApproved');
  setValue('wmrInspectionOfficer');
  setValue('wmrWitnessToDisposal');
  setValue('wmrNotes');
  const body = document.getElementById('wmrItemsBody');
  if (body){
    body.innerHTML = `<tr class="wmr-empty-row">
      <td>1</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
      <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
    </tr>`;
  }
  wmrBatchPrintMode = false;
  wmrBatchPrintArchivedIndexes = [];
  syncWmrBatchBuilderButtons();
}

function syncWmrBatchBuilderButtons(){
  const printBtn = document.getElementById('wmrPrintBatchBuilderBtn');
  const cancelBtn = document.getElementById('wmrCancelBatchBuilderBtn');
  const saveBtn = document.querySelector('[data-action="saveWasteReportMetadata"]');
  const canPrint = !!(wmrBatchPrintMode && Array.isArray(wmrBatchPrintArchivedIndexes) && wmrBatchPrintArchivedIndexes.length >= 2);
  if (printBtn){
    printBtn.style.display = canPrint ? '' : 'none';
    printBtn.disabled = !canPrint;
  }
  if (cancelBtn){
    cancelBtn.style.display = wmrBatchPrintMode ? '' : 'none';
    cancelBtn.disabled = !wmrBatchPrintMode;
  }
  if (saveBtn){
    saveBtn.disabled = !!wmrBatchPrintMode;
    if (wmrBatchPrintMode) saveBtn.setAttribute('title', 'Save is disabled in Batch Print builder mode.');
    else saveBtn.removeAttribute('title');
  }
}

function buildWmrBatchPrintCandidates(){
  const archived = getArchivedItems();
  return archived
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => {
      if (!entry?.item?.wasteReport?.preparedAt) return false;
      if (!archivesFilterIcs) return true;
      return normalizeICSKey(entry?.source?.icsNo || '') === normalizeICSKey(archivesFilterIcs);
    });
}

function refreshWmrBatchItemAutosuggest(){
  const candidates = buildWmrBatchPrintCandidates();
  const values = [];
  candidates.forEach((x) => {
    const icsNo = (x?.entry?.source?.icsNo || '').toString().trim();
    const itemNo = (x?.entry?.item?.itemNo || '').toString().trim();
    if (itemNo) values.push(itemNo);
    if (icsNo && itemNo) values.push(`${icsNo}/${itemNo}`);
  });
  setWmrDatalistOptions('wmrBatchItemSuggestList', values);
}

function renderWmrBatchPrintBuilderRows(focusNext = false){
  const body = document.getElementById('wmrItemsBody');
  if (!body) return;
  const archived = getArchivedItems();
  const selected = (wmrBatchPrintArchivedIndexes || [])
    .map((idx) => ({ idx, entry: archived[idx] }))
    .filter((x) => x.entry);
  const selectedRows = selected.map((x, i) => {
    const item = x.entry.item || {};
    const wr = item.wasteReport || {};
    const sourceType = (x.entry?.source?.sourceType || 'ics').toString().toLowerCase() === 'par' ? 'par' : 'ics';
    const sourceDisplay = `${sourceType === 'par' ? 'PAR' : 'ICS'}-${x.entry?.source?.icsNo || ''}`;
    return `<tr data-wmr-selected-index="${x.idx}">
      <td data-label="#">${i + 1}</td>
      <td data-label="ICS/PAR No.">${escapeHTML(sourceDisplay)}</td>
      <td data-label="Item No.">${escapeHTML(item.itemNo || '')}</td>
      <td data-label="Description">${escapeHTML(item.desc || '')}</td>
      <td data-label="Qty">${escapeHTML((item.qtyText || item.qty || '').toString())}</td>
      <td data-label="Unit">${escapeHTML(item.unit || '')}</td>
      <td data-label="Disposition">${escapeHTML(wr.disposition || '-')}</td>
      <td data-label="Transfer To">${escapeHTML(wr.transferTo || '-')}</td>
      <td data-label="OR No.">${escapeHTML(wr.officialReceiptNo || '-')}</td>
      <td data-label="OR Date">${escapeHTML(wr.officialReceiptDate || '-')}</td>
      <td data-label="OR Amount">${escapeHTML(wr.officialReceiptAmount || '-')}</td>
    </tr>`;
  });
  const nextNo = selected.length + 1;
  const inputRow = `<tr class="wmr-batch-input-row">
    <td data-label="#">${nextNo}</td>
    <td data-label="ICS/PAR No."><span class="card-subtext">Auto</span></td>
    <td data-label="Item No."><input class="stage-input wmr-batch-item-input" list="wmrBatchItemSuggestList" placeholder="Enter Item No. (or RecordNo/ItemNo)" /></td>
    <td data-label="Description"><span class="card-subtext">Match from Archived Disposal Items</span></td>
    <td data-label="Qty">&nbsp;</td>
    <td data-label="Unit">&nbsp;</td>
    <td data-label="Disposition">&nbsp;</td>
    <td data-label="Transfer To">&nbsp;</td>
    <td data-label="OR No.">&nbsp;</td>
    <td data-label="OR Date">&nbsp;</td>
    <td data-label="OR Amount">&nbsp;</td>
  </tr>`;
  body.innerHTML = `${selectedRows.join('')}${inputRow}`;
  syncWmrBatchBuilderButtons();
  if (focusNext){
    setTimeout(() => {
      const input = body.querySelector('.wmr-batch-item-input');
      if (input) input.focus();
    }, 0);
  }
}

function resolveWmrBatchPrintMatch(query){
  const q = (query || '').toString().trim();
  if (!q) return { error: 'Enter Item No. first.' };
  const candidates = buildWmrBatchPrintCandidates();
  if (!candidates.length) return { error: 'No archived items with prepared WMR found in current scope.' };
  let matches = [];
  if (q.includes('/')){
    const [icsPartRaw, itemPartRaw] = q.split('/', 2);
    const icsPart = normalizeICSKey(icsPartRaw || '');
    const itemPart = normalizeICSKey(itemPartRaw || '');
    matches = candidates.filter((x) => normalizeICSKey(x.entry?.source?.icsNo || '') === icsPart && normalizeICSKey(x.entry?.item?.itemNo || '') === itemPart);
  } else {
    const itemPart = normalizeICSKey(q);
    matches = candidates.filter((x) => normalizeICSKey(x.entry?.item?.itemNo || '') === itemPart);
  }
  if (!matches.length) return { error: `No archived WMR item matched "${q}".` };
  if (matches.length > 1) return { error: `Multiple matches for "${q}". Use RecordNo/ItemNo format.` };
  return { match: matches[0] };
}

function commitWmrBatchItemInput(inputEl){
  if (!wmrBatchPrintMode) return;
  const q = (inputEl?.value || '').trim();
  if (!q) return;
  const resolved = resolveWmrBatchPrintMatch(q);
  if (resolved.error){
    notify('error', resolved.error);
    return;
  }
  const { match } = resolved;
  const idx = match.index;
  if ((wmrBatchPrintArchivedIndexes || []).includes(idx)){
    notify('info', 'Item already added to batch print table.');
    inputEl.value = '';
    return;
  }
  wmrBatchPrintArchivedIndexes.push(idx);
  inputEl.value = '';
  renderWmrBatchPrintBuilderRows(true);
}

function openBatchWasteReportBuilderArchived(){
  if (!requireAccess('archive_items', { label: 'prepare batch Waste Materials Report print list' })) return;
  if (activeViewKey() !== 'Archives') goToView('Archives');
  const candidates = buildWmrBatchPrintCandidates();
  if (!candidates.length){
    notify('error', 'No archived items with prepared Waste Materials metadata in current scope.');
    return;
  }
  wmrBatchPrintMode = true;
  wmrBatchPrintArchivedIndexes = [];
  pendingWasteReportRows = [];
  pendingWasteReportTarget = { icsNo: '', itemNo: '', nextAction: 'batch_print_builder', returnModal: '' };
  applyWmrSignatoryAutosuggest();
  refreshWmrBatchItemAutosuggest();
  renderWmrBatchPrintBuilderRows(true);
  const overlay = document.getElementById('wasteReportOverlay');
  if (overlay){
    overlay.classList.add('show');
    overlay.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  notify('info', 'Batch Print builder opened. Enter Item No. to add archived WMR rows.');
}

function printWasteReportBuilderSelection(){
  if (!requireAccess('archive_items', { label: 'print batch Waste Materials Report (single form)' })) return;
  if (!wmrBatchPrintMode){
    notify('error', 'Batch Print builder is not active.');
    return;
  }
  if ((wmrBatchPrintArchivedIndexes || []).length < 2){
    notify('error', 'Add at least two items to print a single batch form.');
    return;
  }
  const archived = getArchivedItems();
  const entries = wmrBatchPrintArchivedIndexes
    .map((idx) => archived[idx])
    .filter(Boolean);
  if (entries.length < 2){
    notify('error', 'Selected batch items are unavailable. Rebuild the print list.');
    return;
  }
  const base = entries[0];
  const entitySet = new Set(entries.map((e) => (e?.source?.entity || '').trim()).filter(Boolean));
  const sourceSet = new Set(entries.map((e) => `${((e?.source?.sourceType || 'ics').toString().toLowerCase() === 'par' ? 'PAR' : 'ICS')}-${(e?.source?.icsNo || '').toString()}`));
  const record = {
    icsNo: entries.length === 1 ? (base?.source?.icsNo || '') : `MULTIPLE RECORDS (${sourceSet.size})`,
    entity: entitySet.size <= 1 ? (base?.source?.entity || '') : 'Multiple Entities',
    fund: base?.source?.fund || '',
    issuedDate: base?.source?.issuedDate || '',
    items: entries.map((e) => JSON.parse(JSON.stringify(e.item || {})))
  };
  printWasteMaterialsReportPrepared(record, record.items);
}

function exitWmrBatchBuilderMode(){
  if (!wmrBatchPrintMode) return;
  resetWasteReportDraftFields();
  notify('info', 'Batch Print builder mode closed.');
}

function openWasteReportModalForTargets(targets, nextAction, returnModal){
  if (!requireAccess('archive_items', { label: 'prepare Waste Materials Report metadata' })) return;
  if (activeViewKey() !== 'Archives') goToView('Archives');
  wmrBatchPrintMode = false;
  wmrBatchPrintArchivedIndexes = [];
  syncWmrBatchBuilderButtons();
  const rows = [];
  const sourceSet = new Set();
  (targets || []).forEach((t) => {
    const sourceType = (t?.sourceType || 'ics').toString().toLowerCase() === 'par' ? 'par' : 'ics';
    const ref = findItemRef(t.icsNo, t.itemNo, sourceType);
    if (!ref) return;
    const record = ref.records[ref.rIdx];
    const item = record.items[ref.iIdx];
    const sourceNo = sourceType === 'par'
      ? ((record.parNo || record.icsNo || '').toString())
      : ((record.icsNo || '').toString());
    rows.push({
      record,
      item,
      itemNo: item.itemNo || '',
      sourceType,
      sourceNo,
      storageKey: ref.storageKey || (sourceType === 'par' ? 'parRecords' : 'icsRecords')
    });
    sourceSet.add(`${sourceType}:${sourceNo}`);
  });
  if (!rows.length){
    notify('error', 'Cannot open Waste Materials Report metadata. Selected items not found.');
    return;
  }
  pendingWasteReportRows = rows;
  pendingWasteReportTarget = {
    icsNo: rows[0].sourceNo,
    itemNo: rows[0].itemNo,
    sourceType: rows[0].sourceType || 'ics',
    nextAction: nextAction || '',
    returnModal: returnModal || ''
  };

  const record = rows[0].record;
  const entitySet = new Set(rows.map((r) => r.record?.entity || '').filter(Boolean));
  const defaults = record.wasteReportMeta || {};
  const sharedFromFirst = rows.find((r) => r.item?.wasteReport?.preparedAt)?.item?.wasteReport || {};

  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value || '-'; };
  const setValue = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ''; };
  setText('wmrIcsNo', sourceSet.size === 1 ? (rows[0]?.sourceNo || '-') : `Multiple Records (${sourceSet.size})`);
  setText('wmrItemCount', String(rows.length));
  setText('wmrEntity', entitySet.size <= 1 ? (record.entity || '-') : `Multiple Entities (${entitySet.size})`);
  setText('wmrPreparedAt', sharedFromFirst.preparedAt ? new Date(sharedFromFirst.preparedAt).toLocaleString() : 'Draft');

  applyWmrSignatoryAutosuggest();
  setValue('wmrPlaceOfStorage', sharedFromFirst.placeOfStorage || defaults.placeOfStorage || 'ITEMS FOR DISPOSAL');
  setValue('wmrArchiveApprovalStatus', sharedFromFirst.archiveApprovalStatus || defaults.archiveApprovalStatus || 'approved');
  setValue('wmrCertifiedCorrect', sharedFromFirst.certifiedCorrect || defaults.certifiedCorrect || '');
  setValue('wmrDisposalApproved', sharedFromFirst.disposalApproved || defaults.disposalApproved || '');
  setValue('wmrInspectionOfficer', sharedFromFirst.inspectionOfficer || defaults.inspectionOfficer || '');
  setValue('wmrWitnessToDisposal', sharedFromFirst.witnessToDisposal || defaults.witnessToDisposal || '');
  setValue('wmrNotes', sharedFromFirst.notes || '');

  const body = document.getElementById('wmrItemsBody');
  if (body){
    body.innerHTML = rows.map((r, idx) => {
      const wr = r.item.wasteReport || {};
      const safeSourceNo = (r.sourceNo || '').replace(/"/g, '&quot;');
      const safeSourceType = (r.sourceType || 'ics').replace(/"/g, '&quot;');
      const safeItem = (r.itemNo || '').replace(/"/g, '&quot;');
      const sourceDisplay = `${(r.sourceType || 'ics') === 'par' ? 'PAR-' : 'ICS-'}${r.sourceNo || ''}`;
      return `<tr>
        <td data-label="#">${idx + 1}</td>
        <td data-label="ICS/PAR No.">${escapeHTML(sourceDisplay)}</td>
        <td data-label="Item No.">${escapeHTML(r.itemNo || '')}</td>
        <td data-label="Description">${escapeHTML(r.item.desc || '')}</td>
        <td data-label="Qty">${escapeHTML((r.item.qtyText || r.item.qty || '').toString())}</td>
        <td data-label="Unit">${escapeHTML(r.item.unit || '')}</td>
        <td data-label="Disposition">
          <select class="stage-input wmr-disposition" data-ics="${safeSourceNo}" data-item="${safeItem}" data-source-type="${safeSourceType}">
            <option value="">Select</option>
            <option value="destroyed" ${wr.disposition === 'destroyed' ? 'selected' : ''}>Destroyed</option>
            <option value="private_sale" ${wr.disposition === 'private_sale' ? 'selected' : ''}>Sold at Private Sale</option>
            <option value="public_auction" ${wr.disposition === 'public_auction' ? 'selected' : ''}>Sold at Public Auction</option>
            <option value="transferred" ${wr.disposition === 'transferred' ? 'selected' : ''}>Transferred without cost</option>
          </select>
        </td>
        <td data-label="Transfer To"><input class="stage-input wmr-transfer" data-ics="${safeSourceNo}" data-item="${safeItem}" data-source-type="${safeSourceType}" value="${escapeHTML(wr.transferTo || '')}" /></td>
        <td data-label="OR No."><input class="stage-input wmr-or-no" data-ics="${safeSourceNo}" data-item="${safeItem}" data-source-type="${safeSourceType}" value="${escapeHTML(wr.officialReceiptNo || '')}" /></td>
        <td data-label="OR Date"><input type="date" class="stage-input wmr-or-date" data-ics="${safeSourceNo}" data-item="${safeItem}" data-source-type="${safeSourceType}" value="${escapeHTML(wr.officialReceiptDate || '')}" /></td>
        <td data-label="OR Amount"><input class="stage-input wmr-or-amount" data-ics="${safeSourceNo}" data-item="${safeItem}" data-source-type="${safeSourceType}" value="${escapeHTML(wr.officialReceiptAmount || '')}" /></td>
      </tr>`;
    }).join('');
  }

  const overlay = document.getElementById('wasteReportOverlay');
  clearFieldErrors(overlay || document);
  if (!overlay){
    notify('error', 'Waste Materials Draft panel is unavailable. Reload and try again.');
    return;
  }
  overlay.classList.add('show');
  overlay.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function closeWasteReportModal(returnToPrevious = true){
  const target = pendingWasteReportTarget ? { ...pendingWasteReportTarget } : null;
  pendingWasteReportTarget = null;
  pendingWasteReportRows = [];
  wmrBatchPrintMode = false;
  wmrBatchPrintArchivedIndexes = [];
  syncWmrBatchBuilderButtons();
  const overlay = document.getElementById('wasteReportOverlay');
  if (overlay) overlay.classList.remove('show');
  clearFieldErrors(overlay || document);
  if (!returnToPrevious || !target) return;
  if (target.returnModal === 'archive'){
    if (activeViewKey() !== 'Action Center') goToView('Action Center');
    pendingArchiveTarget = { icsNo: target.icsNo, itemNo: target.itemNo, sourceType: target.sourceType || 'ics' };
    const arch = document.getElementById('archiveOverlay');
    if (arch) arch.classList.add('show');
    return;
  }
  if (target.returnModal === 'inspection'){
    if (activeViewKey() !== 'Action Center') goToView('Action Center');
    pendingInspection = { icsNo: target.icsNo, itemNo: target.itemNo, sourceType: target.sourceType || 'ics' };
    const insp = document.getElementById('inspectionOverlay');
    if (insp) insp.classList.add('show');
    updateInspectionArchiveButtonState();
  }
}

function validateWasteReportMetadata(showError){
  const overlay = document.getElementById('wasteReportOverlay');
  clearFieldErrors(overlay || document);
  const required = [
    { id: 'wmrPlaceOfStorage', label: 'Place of Storage' },
    { id: 'wmrArchiveApprovalStatus', label: 'Archive Approval Status' },
    { id: 'wmrCertifiedCorrect', label: 'Certified Correct' },
    { id: 'wmrDisposalApproved', label: 'Disposal Approved' },
    { id: 'wmrInspectionOfficer', label: 'Inspection Officer' },
    { id: 'wmrWitnessToDisposal', label: 'Witness to Disposal' }
  ];
  const missing = [];
  required.forEach((f) => {
    const bad = !((document.getElementById(f.id)?.value || '').trim());
    setFieldError(f.id, bad);
    if (bad) missing.push(f.label);
  });
  (pendingWasteReportRows || []).forEach((r, idx) => {
    const dispInput = getWmrRowInput('wmr-disposition', r.sourceNo, r.itemNo, r.sourceType || 'ics');
    const disp = (dispInput?.value || '').trim();
    const missingDisp = !disp;
    setFieldError(dispInput, missingDisp);
    if (missingDisp) missing.push(`Disposition (row ${idx + 1})`);
    if (isSaleDisposition(disp)){
      const orNoInput = getWmrRowInput('wmr-or-no', r.sourceNo, r.itemNo, r.sourceType || 'ics');
      const orDateInput = getWmrRowInput('wmr-or-date', r.sourceNo, r.itemNo, r.sourceType || 'ics');
      const orAmountInput = getWmrRowInput('wmr-or-amount', r.sourceNo, r.itemNo, r.sourceType || 'ics');
      const orNo = (orNoInput?.value || '').trim();
      const orDate = (orDateInput?.value || '').trim();
      const orAmountRaw = (orAmountInput?.value || '').trim();
      const orAmount = parseCurrencyValue(orAmountRaw);
      const missingOrNo = !orNo;
      const missingOrDate = !orDate;
      const missingOrAmount = !orAmountRaw || !Number.isFinite(orAmount) || orAmount <= 0;
      setFieldError(orNoInput, missingOrNo);
      setFieldError(orDateInput, missingOrDate);
      setFieldError(orAmountInput, missingOrAmount);
      if (missingOrNo) missing.push(`Official Receipt No. (row ${idx + 1})`);
      if (missingOrDate) missing.push(`Official Receipt Date (row ${idx + 1})`);
      if (missingOrAmount) missing.push(`Official Receipt Amount (row ${idx + 1})`);
    }
  });
  if (missing.length && showError){
    notify('error', `Complete Waste Materials fields: ${missing.join(', ')}.`);
  }
  return missing.length === 0;
}

function isSaleDisposition(value){
  const v = (value || '').toString().trim();
  return v === 'private_sale' || v === 'public_auction';
}

function getWmrRowInput(cls, icsNo, itemNo, sourceType = ''){
  const normalizedSource = (sourceType || '').toString().toLowerCase();
  return [...document.querySelectorAll(`.${cls}`)].find((el) => {
    if ((el.dataset.ics || '') !== (icsNo || '')) return false;
    if ((el.dataset.item || '') !== (itemNo || '')) return false;
    if (!normalizedSource) return true;
    return ((el.dataset.sourceType || 'ics').toString().toLowerCase() === normalizedSource);
  });
}

function toggleWasteSaleFields(){}

function saveWasteReportMetadata(printAfterSave){
  if (!requireAccess('archive_items', { label: 'save Waste Materials metadata' })) return;
  if (wmrBatchPrintMode){
    notify('error', 'Save is disabled in Batch Print builder mode. Use Print after adding two or more items.');
    return;
  }
  if (!pendingWasteReportTarget){
    notify('error', 'No item selected for Waste Materials metadata.');
    return;
  }
  if (!validateWasteReportMetadata(true)) return;
  const nowIso = new Date().toISOString();
  const actorProfileKey = getCurrentActorProfileKey();
  const shared = {
    placeOfStorage: (document.getElementById('wmrPlaceOfStorage')?.value || '').trim(),
    archiveApprovalStatus: (document.getElementById('wmrArchiveApprovalStatus')?.value || '').trim(),
    certifiedCorrect: (document.getElementById('wmrCertifiedCorrect')?.value || '').trim(),
    disposalApproved: (document.getElementById('wmrDisposalApproved')?.value || '').trim(),
    inspectionOfficer: (document.getElementById('wmrInspectionOfficer')?.value || '').trim(),
    witnessToDisposal: (document.getElementById('wmrWitnessToDisposal')?.value || '').trim(),
    notes: (document.getElementById('wmrNotes')?.value || '').trim()
  };
  const recordsByStorage = {
    icsRecords: JSON.parse(localStorage.getItem('icsRecords') || '[]'),
    parRecords: JSON.parse(localStorage.getItem('parRecords') || '[]')
  };
  const archived = getArchivedItems();
  let savedCount = 0;
  const touchedRecordsByStorage = { icsRecords: {}, parRecords: {} };
  const touchedItemsByRecord = {};
  const archivedEntriesForPrint = [];
  (pendingWasteReportRows || []).forEach((r) => {
    const sourceType = (r?.sourceType || 'ics').toString().toLowerCase() === 'par' ? 'par' : 'ics';
    const storageKey = sourceType === 'par' ? 'parRecords' : 'icsRecords';
    const sourceNo = (r?.sourceNo || '').toString();
    const allRecords = Array.isArray(recordsByStorage[storageKey]) ? recordsByStorage[storageKey] : [];
    const rIdx = allRecords.findIndex((x) => {
      const recordNo = sourceType === 'par'
        ? ((x.parNo || x.icsNo || '').toString())
        : ((x.icsNo || '').toString());
      return recordNo === sourceNo;
    });
    if (rIdx === -1) return;
    const iIdx = (allRecords[rIdx].items || []).findIndex((x) => (x.itemNo || '') === (r.itemNo || ''));
    if (iIdx === -1) return;
    const disposition = (getWmrRowInput('wmr-disposition', sourceNo, r.itemNo, sourceType)?.value || '').trim();
    const transferTo = (getWmrRowInput('wmr-transfer', sourceNo, r.itemNo, sourceType)?.value || '').trim();
    const officialReceiptNo = (getWmrRowInput('wmr-or-no', sourceNo, r.itemNo, sourceType)?.value || '').trim();
    const officialReceiptDate = (getWmrRowInput('wmr-or-date', sourceNo, r.itemNo, sourceType)?.value || '').trim();
    const officialReceiptAmount = formatCurrencyValue(parseCurrencyValue(getWmrRowInput('wmr-or-amount', sourceNo, r.itemNo, sourceType)?.value || '')) || '';
    const payload = {
      ...shared,
      disposition,
      dispositionItemNo: r.itemNo || '',
      transferTo,
      officialReceiptNo,
      officialReceiptDate,
      officialReceiptAmount,
      hasSale: isSaleDisposition(disposition),
      preparedAt: nowIso,
      preparedByProfileKey: actorProfileKey
    };
    const item = allRecords[rIdx].items[iIdx];
    item.wasteReport = payload;
    const sourceRecord = allRecords[rIdx];
    const sourceRecordNo = sourceType === 'par'
      ? ((sourceRecord?.parNo || sourceRecord?.icsNo || sourceNo || '').toString())
      : ((sourceRecord?.icsNo || sourceNo || '').toString());
    touchedRecordsByStorage[storageKey][sourceRecordNo] = rIdx;
    const touchedKey = `${storageKey}||${sourceRecordNo}`;
    touchedItemsByRecord[touchedKey] = touchedItemsByRecord[touchedKey] || [];
    touchedItemsByRecord[touchedKey].push(item.itemNo || '');
    item.inspections = Array.isArray(item.inspections) ? item.inspections : [];
    let latestUnserviceable = null;
    for (let i = item.inspections.length - 1; i >= 0; i--){
      const log = item.inspections[i];
      if ((log.status || '').toLowerCase() !== 'unserviceable') continue;
      latestUnserviceable = log;
      const marker = `Prepared Waste Materials Report (${new Date(nowIso).toLocaleString()})`;
      const base = (log.notes || '').trim();
      if (!base.includes('Prepared Waste Materials Report')){
        log.notes = base ? `${base} | ${marker}` : marker;
      }
      log.reportPreparedAt = nowIso;
      log.reportPreparedByProfileKey = actorProfileKey;
      break;
    }
    const sourceReason = (latestUnserviceable?.reason || '').toString().trim();
    const sourceRemarks = (latestUnserviceable?.remarks || '').toString().trim();
    const inferredRemarks = sourceReason ? (getUnserviceableRemarksText(sourceReason)[0] || '') : '';
    const archiveRemarksParts = [sourceRemarks || inferredRemarks, (shared.notes || '').trim()].filter(Boolean);
    const archivedEntry = {
      archivedAt: nowIso,
      archivedByProfileKey: actorProfileKey,
      source: {
        sourceType,
        icsNo: sourceRecordNo,
        parNo: sourceType === 'par' ? sourceRecordNo : '',
        entity: sourceRecord?.entity || '',
        fund: sourceRecord?.fund || '',
        issuedDate: sourceRecord?.issuedDate || ''
      },
      item: JSON.parse(JSON.stringify(item)),
      disposal: {
        status: shared.archiveApprovalStatus || 'approved',
        approvedBy: shared.disposalApproved || '',
        approvedByProfileKey: actorProfileKey,
        approvedDate: nowIso.slice(0, 10),
        referenceNo: '',
        remarks: archiveRemarksParts.join(' | ') || 'WMR prepared and archived.'
      }
    };
    archived.unshift(archivedEntry);
    archivedEntriesForPrint.push(archivedEntry);
    sourceRecord.items.splice(iIdx, 1);
    savedCount += 1;
    delete actionCenterSelectedKeys[getActionItemKey(sourceRecordNo, r.itemNo, sourceType)];
  });
  if (!savedCount){
    notify('error', 'No selected items were saved for Waste Materials metadata.');
    return;
  }
  ['icsRecords', 'parRecords'].forEach((storageKey) => {
    const records = Array.isArray(recordsByStorage[storageKey]) ? recordsByStorage[storageKey] : [];
    const touched = touchedRecordsByStorage[storageKey] || {};
    Object.entries(touched).forEach(([sourceNo, rIdx]) => {
      if (rIdx === undefined || rIdx === null || rIdx < 0 || rIdx >= records.length) return;
      records[rIdx].wasteReportMeta = {
        placeOfStorage: shared.placeOfStorage,
        archiveApprovalStatus: shared.archiveApprovalStatus,
        certifiedCorrect: shared.certifiedCorrect,
        disposalApproved: shared.disposalApproved,
        inspectionOfficer: shared.inspectionOfficer,
        witnessToDisposal: shared.witnessToDisposal,
        lastPreparedAt: nowIso,
        lastPreparedByProfileKey: actorProfileKey
      };
      const touchedItems = (touchedItemsByRecord[`${storageKey}||${sourceNo}`] || []).filter(Boolean);
      const summary = touchedItems.length
        ? `archive:${touchedItems.join(',')}`
        : `archive:${sourceNo || 'item'}`;
      records[rIdx] = appendRecordLineage(records[rIdx], 'archive', summary);
    });
    recordsByStorage[storageKey] = records;
  });
  setArchivedItems(archived);
  localStorage.setItem('icsRecords', JSON.stringify(recordsByStorage.icsRecords || []));
  localStorage.setItem('parRecords', JSON.stringify(recordsByStorage.parRecords || []));
  const touchedCount = Object.keys(touchedRecordsByStorage.icsRecords || {}).length + Object.keys(touchedRecordsByStorage.parRecords || {}).length;
  recordAudit('archive', `Prepared WMR and archived ${savedCount} item(s) across ${touchedCount} record(s).`, {
    touchedRecords: touchedCount,
    touchedItems: savedCount,
    source: 'wmr-save'
  });
  notify('success', `Waste Materials Report saved and archived for ${savedCount} item(s).`);

  resetWasteReportDraftFields();
  closeWasteReportModal(false);
  if (printAfterSave){
    const indexes = archivedEntriesForPrint
      .map((entry) => archived.findIndex((x) => x === entry))
      .filter((idx) => idx >= 0);
    let pos = 0;
    const runNext = () => {
      if (pos >= indexes.length) return;
      printWasteMaterialsReportArchived(indexes[pos]);
      pos += 1;
      if (pos < indexes.length) setTimeout(runNext, 700);
    };
    runNext();
  }
  if (activeViewKey() !== 'Archives') goToView('Archives');
  initArchivesView();
  initActionsView();
  loadICSRecords();
  loadPARRecords();
}

