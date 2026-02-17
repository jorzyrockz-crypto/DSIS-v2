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
  Archives: renderArchivesView
};

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
