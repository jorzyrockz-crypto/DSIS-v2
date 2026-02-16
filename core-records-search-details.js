function buildSearchIndex(rec, idx){
  const items = rec.items || [];
  const descs = items.map((i) => i.desc || '').filter(Boolean).join(' ');
  const itemNos = items.map((i) => i.itemNo || '').filter(Boolean).join(' ');
  return [
    rec.icsNo || '',
    rec.entity || '',
    rec.accountable || '',
    rec.signatories?.issuedBy?.name || '',
    rec.signatories?.receivedBy?.name || '',
    descs,
    itemNos
  ].join(' ').toLowerCase();
}

function findFocusedItemNo(record, query){
  const q = (query || '').trim().toLowerCase();
  if (!q || !record || !Array.isArray(record.items)) return '';
  const hit = record.items.find((it) => {
    const desc = (it.desc || '').toString().toLowerCase();
    const no = (it.itemNo || '').toString().toLowerCase();
    return desc.includes(q) || no.includes(q);
  });
  return hit?.itemNo || '';
}

let currentArchivedHistoryIndex = null;

function renderSearchResults(query){
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const archived = getArchivedItems();
  const q = (query || '').trim().toLowerCase();
  if (!q){
    searchMatches = [];
    searchActiveIndex = -1;
    searchResults.innerHTML = '<div class="search-empty">Type to search ICS records or archived items.</div>';
    return;
  }

  const recordHits = records
    .map((r, i) => ({ i, r, hay: buildSearchIndex(r, i) }))
    .filter((x) => x.hay.includes(q))
    .map((x) => ({
      type: 'ics',
      i: x.i,
      title: `${x.r.icsNo || 'No ICS No.'} - ${x.r.entity || 'Unknown Entity'}`,
      meta: `${x.r.issuedDate || ''} | ${x.r.accountable || ''} | Items: ${(x.r.items || []).length}`,
      focusItemNo: findFocusedItemNo(x.r, q)
    }));

  const archiveHits = archived
    .map((a, i) => {
      const hay = [
        a.source?.icsNo || '',
        a.source?.entity || '',
        a.item?.itemNo || '',
        a.item?.desc || '',
        a.disposal?.remarks || '',
        a.disposal?.approvedBy || ''
      ].join(' ').toLowerCase();
      return { i, a, hay };
    })
    .filter((x) => x.hay.includes(q))
    .map((x) => ({
      type: 'archive',
      i: x.i,
      title: `${x.a.source?.icsNo || 'No ICS No.'} - ${x.a.item?.itemNo || 'No Item No.'}`,
      meta: `${x.a.source?.entity || ''} | Archived: ${(x.a.archivedAt || '').slice(0, 10)}`
    }));

  searchMatches = [...recordHits, ...archiveHits].slice(0, 30);
  searchActiveIndex = searchMatches.length ? 0 : -1;

  if (!searchMatches.length){
    searchResults.innerHTML = '<div class="search-empty">No matching records found.</div>';
    return;
  }

  searchResults.innerHTML = searchMatches.map((m, idx) => {
    const cls = idx === searchActiveIndex ? 'search-item active' : 'search-item';
    const typeLabel = m.type === 'archive' ? 'Archived' : 'ICS';
    return `<button class="${cls}" data-action="activateSearchResult" data-arg1="${idx}">
      <div class="search-item-title">${escapeHTML(m.title)}<span class="search-item-type">${typeLabel}</span></div>
      <div class="search-item-meta">${escapeHTML(m.meta)}</div>
    </button>`;
  }).join('');
}

function activateSearchResult(matchIndex){
  const hit = searchMatches[matchIndex];
  if (!hit) return;
  closeSearchOverlay();
  if (hit.type === 'archive'){
    openArchivedItemHistory(hit.i);
    return;
  }
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const rec = records[hit.i];
  if (!rec) return;
  if (hit.focusItemNo){
    openICSDetailsByKey(rec.icsNo, hit.focusItemNo);
  } else {
    openICSDetailsByIndex(hit.i);
  }
}

function moveSearchActive(delta){
  if (!searchMatches.length) return;
  searchActiveIndex = (searchActiveIndex + delta + searchMatches.length) % searchMatches.length;
  renderSearchResults(searchInput.value);
}

function openSearchOverlay(){
  searchOverlay.classList.add('show');
  renderSearchResults(searchInput.value);
  setTimeout(() => searchInput.focus(), 0);
}

function closeSearchOverlay(){
  searchOverlay.classList.remove('show');
}

function findItemRef(icsNo, itemNo){
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const targetIcsKey = normalizeICSKey(icsNo || '');
  const targetItemKey = normalizeICSKey(itemNo || '');
  const rIdx = records.findIndex((r) => normalizeICSKey(r.icsNo || '') === targetIcsKey);
  if (rIdx === -1) return null;
  const items = records[rIdx].items || [];
  const iIdx = items.findIndex((i) => normalizeICSKey(i.itemNo || '') === targetItemKey);
  if (iIdx === -1) return null;
  return { records, rIdx, iIdx };
}

function openICSDetailsByIndex(i){
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const rec = records[i];
  if (!rec){
    notify('error', 'ICS record not found.');
    return;
  }
  openICSDetailsModal(rec, '', i);
}

function getRecordStatusMetaTitle(record){
  const meta = record?._statusMeta || {};
  const type = (meta.type || '').toString().toLowerCase();
  if (!['new', 'imported', 'updated'].includes(type)) return '';
  const label = type === 'new' ? 'Created' : (type.charAt(0).toUpperCase() + type.slice(1));
  const by = normalizeProfileKeyValue(meta.byProfileKey || meta.by || '') || 'unknown-profile';
  const sourceBy = normalizeProfileKeyValue(meta.sourceByProfileKey || meta.sourceBy || '');
  const atRaw = (meta.at || '').toString().trim();
  const atDate = atRaw ? new Date(atRaw) : null;
  const at = atDate && Number.isFinite(atDate.getTime()) ? atDate.toLocaleString() : 'Unknown time';
  const sourceText = sourceBy && sourceBy !== by ? ` | source profile: ${sourceBy}` : '';
  return `${label} by ${by} on ${at}${sourceText}`;
}

function renderRecordStatusPill(record){
  const type = (record?._statusMeta?.type || '').toString().toLowerCase();
  if (!['new', 'imported', 'updated'].includes(type)) return '';
  const title = escapeHTML(getRecordStatusMetaTitle(record));
  const label = type === 'new' ? 'New' : (type === 'imported' ? 'Imported' : 'Updated');
  const integrity = verifyRecordLineage(record || {});
  const warn = integrity.ok
    ? ''
    : `<span class="ics-status-chip danger" title="${escapeHTML(integrity.message)}" aria-label="${escapeHTML(integrity.message)}">Lineage issue</span>`;
  return `<span class="ics-status-chip ${type}" title="${title}" aria-label="${title}">${label}</span>${warn}`;
}

function renderRecordStatusMini(record){
  const type = (record?._statusMeta?.type || '').toString().toLowerCase();
  if (!['new', 'imported', 'updated'].includes(type)) return '<span class="ics-status-mini muted">-</span>';
  const label = type === 'new' ? 'New' : (type === 'imported' ? 'Imported' : 'Updated');
  const title = escapeHTML(getRecordStatusMetaTitle(record));
  const integrity = verifyRecordLineage(record || {});
  const warnAttr = integrity.ok ? '' : ` data-warn="1"`;
  return `<span class="ics-status-mini ${type}" title="${title}" aria-label="${title}"${warnAttr}><span class="dot" aria-hidden="true"></span>${label}</span>`;
}

function buildICSRecordFromArchive(icsNo){
  const key = normalizeICSKey(icsNo);
  if (!key) return null;
  const archived = getArchivedItems().filter((a) => normalizeICSKey(a.source?.icsNo || '') === key);
  if (!archived.length) return null;
  const src = archived[0].source || {};
  return {
    icsNo: src.icsNo || icsNo || '',
    entity: src.entity || '',
    fund: src.fund || '',
    issuedDate: src.issuedDate || '',
    accountable: '',
    signatories: {
      issuedBy: { name: '', position: '', date: '' },
      receivedBy: { name: '', position: '', date: '' }
    },
    eul: '',
    totalValue: '0.00',
    items: []
  };
}

function openICSDetailsByKey(icsNo, focusItemNo){
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const key = normalizeICSKey(icsNo);
  const recIndex = records.findIndex((r) => normalizeICSKey(r.icsNo || '') === key);
  const rec = (recIndex !== -1 ? records[recIndex] : null) || buildICSRecordFromArchive(icsNo);
  if (!rec) return notify('error', `ICS ${icsNo || ''} not found.`);
  openICSDetailsModal(rec, focusItemNo || '', recIndex !== -1 ? recIndex : null);
}

function openICSDetailsModal(record, focusItemNo, recordIndex){
  const overlay = document.getElementById('icsDetailsOverlay');
  const title = document.getElementById('icsDetailsTitle');
  const body = document.getElementById('icsDetailsBody');
  if (!overlay || !title || !body) return;
  currentICSDetailsContext = {
    recordIndex: Number.isInteger(recordIndex) && recordIndex >= 0 ? recordIndex : null,
    icsNo: record.icsNo || '',
    hasLiveRecord: Number.isInteger(recordIndex) && recordIndex >= 0
  };

  const issuedBy = record.signatories?.issuedBy || {};
  const receivedBy = record.signatories?.receivedBy || {};
  const items = Array.isArray(record.items) ? record.items : [];
  const archivedItems = getArchivedItems().filter((a) => (a.source?.icsNo || '') === (record.icsNo || ''));
  const lineage = normalizeRecordLineage(record?._lineage || record?.lineage);
  const lineageCheck = verifyRecordLineage(record || {});
  const shortToken = (value, max = 18) => {
    const raw = (value || '').toString().trim();
    if (!raw) return '-';
    return raw.length > max ? `${raw.slice(0, max)}...` : raw;
  };
  const lineageRows = (lineage?.versions || []).slice().reverse().slice(0, 8).map((entry) => {
    const parsedAt = new Date(entry.at || '');
    const at = Number.isFinite(parsedAt.getTime()) ? parsedAt.toLocaleString() : '-';
    const actor = (entry.byProfileKey || '').toString().trim() || '-';
    const device = (entry.deviceId || '').toString().trim() || '-';
    const session = (entry.sessionId || '').toString().trim() || '-';
    const summary = (entry.summary || '').toString().trim();
    return `<div class="lineage-row">
      <div class="lineage-row-main">
        <span class="lineage-version">v${Number(entry.version) || 0}</span>
        <span class="lineage-action">${escapeHTML(entry.action || '-')}</span>
        <span class="lineage-time">${escapeHTML(at)}</span>
      </div>
      <div class="lineage-row-meta">
        <span class="lineage-meta-chip" title="${escapeHTML(actor)}">Actor: ${escapeHTML(shortToken(actor))}</span>
        <span class="lineage-meta-chip" title="${escapeHTML(device)}">Device: ${escapeHTML(shortToken(device))}</span>
        <span class="lineage-meta-chip" title="${escapeHTML(session)}">Session: ${escapeHTML(shortToken(session))}</span>
      </div>
      ${summary ? `<div class="lineage-summary" title="${escapeHTML(summary)}">${escapeHTML(summary)}</div>` : ''}
    </div>`;
  }).join('');
  const lineageSummary = lineage
    ? `Version ${lineage.currentVersion || 0} | Hash ${escapeHTML((lineage.currentHash || '').slice(0, 20) || '-')}`
    : 'No lineage timeline yet for this record.';
  const lineageIntegrity = lineageCheck.ok
    ? `<span class="risk-badge ok">${escapeHTML(lineageCheck.message)}</span>`
    : `<span class="risk-badge danger">${escapeHTML(lineageCheck.message)}</span>`;

  const archivedRows = archivedItems.length ? archivedItems.map((a) => `
    <tr>
      <td>${escapeHTML((a.archivedAt || '').slice(0,10))}</td>
      <td><span class="u-truncate u-mono" title="${escapeHTML(a.item?.itemNo || '')}">${escapeHTML(a.item?.itemNo || '')}</span></td>
      <td><span class="u-truncate" title="${escapeHTML(a.item?.desc || '')}">${escapeHTML(a.item?.desc || '')}</span></td>
      <td>${escapeHTML(a.disposal?.status === 'approved' ? 'Approved' : 'Not Approved')}</td>
      <td><span class="u-truncate" title="${escapeHTML(a.disposal?.approvedBy || '-')}">${escapeHTML(a.disposal?.approvedBy || '-')}</span></td>
    </tr>
  `).join('') : '<tr><td colspan="5" class="empty-cell">No archived items for this ICS.</td></tr>';

  const safeIcsNo = escapeHTML(record.icsNo || 'N/A');
  const itemCount = items.length;
  const inspectedCount = items.filter((it) => Array.isArray(it?.inspections) && it.inspections.length).length;
  const archivedCount = archivedItems.length;
  const totalValue = formatCurrencyValue(computeRecordMetrics(record).totalValue) || '0.00';
  const latestEntry = (lineage?.versions || []).slice().reverse()[0] || null;
  const latestAtRaw = latestEntry?.at ? new Date(latestEntry.at) : null;
  const latestAt = latestAtRaw && Number.isFinite(latestAtRaw.getTime()) ? latestAtRaw.toLocaleString() : '-';
  const latestActor = normalizeProfileKeyValue(latestEntry?.byProfileKey || '');
  const latestSummary = latestEntry?.summary ? escapeHTML(latestEntry.summary) : '-';
  const latestVersionLabel = `Latest ${lineage?.versions?.length ? 1 : 0}`;
  const showAdvancedAudit = getCurrentRoleKey() === 'admin';
  const icon = (name) => `<span class="icsd-title-icon" aria-hidden="true"><i data-lucide="${name}" aria-hidden="true"></i></span>`;
  const iconSummary = icon('layout-list');
  const iconArchived = icon('archive');
  const iconActivity = icon('activity');
  const iconItems = icon('package');
  const iconHistory = icon('history');

  title.textContent = 'ICS Details';
  body.innerHTML = `
    <div class="icsd-shell">
      <section class="icsd-head">
        <div class="icsd-head-left">
          <div class="icsd-head-title-row">
            <button class="ics-link-btn icsd-ics-btn" data-action="icsDetailsEditFromTitle">${safeIcsNo}</button>
            ${lineageIntegrity}
          </div>
          <div class="icsd-head-meta">
            <span>${escapeHTML(record.entity || '-')}</span>
            <span class="icsd-dot-sep">|</span>
            <span>${escapeHTML(record.fund || '-')}</span>
          </div>
        </div>
      </section>

      <div class="icsd-grid">
        <div class="icsd-col">
          <section class="icsd-card">
            <div class="icsd-card-title">${iconSummary}Summary</div>
            <div class="icsd-summary-grid">
              <div class="icsd-kv"><div class="k">Issued Date</div><div class="v">${escapeHTML(record.issuedDate || '-')}</div></div>
              <div class="icsd-kv"><div class="k">Total Value</div><div class="v">${totalValue}</div></div>
              <div class="icsd-kv"><div class="k">Issued By</div><div class="v u-truncate" title="${escapeHTML(issuedBy.name || '-')}">${escapeHTML(issuedBy.name || '-')}</div></div>
              <div class="icsd-kv"><div class="k">Received By</div><div class="v u-truncate" title="${escapeHTML(receivedBy.name || '-')}">${escapeHTML(receivedBy.name || '-')}</div></div>
              <div class="icsd-kv"><div class="k">Accountable Person</div><div class="v u-truncate" title="${escapeHTML(record.accountable || '-')}">${escapeHTML(record.accountable || '-')}</div></div>
              <div class="icsd-kv"><div class="k">Total Items</div><div class="v">${itemCount}</div></div>
              <div class="icsd-kv icsd-kv-full">
                <div class="k">${showAdvancedAudit ? 'Lineage' : 'Integrity'}</div>
                <div class="v u-truncate" title="${escapeHTML(showAdvancedAudit ? lineageSummary : lineageCheck.message)}">${escapeHTML(showAdvancedAudit ? lineageSummary : lineageCheck.message)}</div>
              </div>
            </div>
          </section>

        </div>

        <div class="icsd-col">
          <section class="icsd-card">
            <div class="icsd-row-between">
              <div class="icsd-card-title">${iconArchived}Archived items</div>
              <span class="icsd-mini-pill">${archivedCount}</span>
            </div>
            ${archivedCount ? `
              <div class="detail-table-wrap">
                <table class="detail-table ics-archived-table">
                  <thead>
                    <tr><th>Archived At</th><th>Item No.</th><th>Description</th><th>Approval</th><th>Approved By</th></tr>
                  </thead>
                  <tbody>${archivedRows}</tbody>
                </table>
              </div>
            ` : '<div class="icsd-empty-box">No archived items for this ICS.</div>'}
          </section>

          <section class="icsd-card">
            <div class="icsd-row-between">
              <div class="icsd-card-title">${iconActivity}Record activity</div>
              <span class="icsd-mini-pill">${latestVersionLabel}</span>
            </div>
            <div class="icsd-activity-card">
              ${latestEntry ? `
                <div class="icsd-activity-main">
                  <span class="lineage-version">v${Number(latestEntry.version) || 0}</span>
                  <strong>${escapeHTML(latestEntry.action || 'record update')}</strong>
                </div>
                <div class="icsd-activity-meta">${escapeHTML(latestAt)}${showAdvancedAudit && latestActor ? ` | ${escapeHTML(latestActor)}` : ''}</div>
                <div class="icsd-activity-summary">${showAdvancedAudit ? latestSummary : escapeHTML('Record updated')}</div>
              ` : '<div class="lineage-empty">No activity yet for this record.</div>'}
            </div>
            <button class="btn btn-sm btn-secondary" data-action="openICSRecordHistoryModal">${iconHistory}View record history</button>
          </section>
        </div>
      </div>

      <section class="icsd-card icsd-items-full">
        <div class="icsd-row-between">
          <div class="icsd-card-title">${iconItems}Items</div>
          <span class="icsd-mini-pill">${itemCount} item(s)</span>
        </div>
        <div class="detail-table-wrap">
          <table class="detail-table ics-items-table">
            <thead>
              <tr>
                <th>Description</th><th>Item No.</th><th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Total</th><th>EUL</th><th>EUL Status</th><th>Inspection</th>
              </tr>
            </thead>
            <tbody>${itemCount ? items.map((it) => {
              const qty = escapeHTML(it.qtyText || it.qty || '');
              const unit = escapeHTML(it.unit || '');
              const unitCost = formatCurrencyValue(parseCurrencyValue(it.unitCost));
              const total = formatCurrencyValue(parseCurrencyValue(it.total));
              const eul = escapeHTML(it.eul ?? '');
              const itemNo = (it.itemNo || '').toString();
              const cls = classifyEULItem(record, it);
              const canTarget = itemNo.trim() !== '';
              const eulStatusCell = cls.code === 'past' && canTarget
                ? `<button class="ics-link-btn" data-action="openPastEULForItem" data-arg1="${escapeHTML(record.icsNo || '')}" data-arg2="${escapeHTML(itemNo)}"><span class="${cls.cls}">${cls.status}</span></button>`
                : cls.code === 'near' && canTarget
                  ? `<button class="ics-link-btn" data-action="openNearEULForItem" data-arg1="${escapeHTML(record.icsNo || '')}" data-arg2="${escapeHTML(itemNo)}"><span class="${cls.cls}">${cls.status}</span></button>`
                  : `<span class="${cls.cls}">${cls.status}</span>`;
              const inspLogs = Array.isArray(it.inspections) ? it.inspections : [];
              const lastInsp = inspLogs.length ? inspLogs[inspLogs.length - 1] : null;
              const inspLabel = lastInsp
                ? (lastInsp.status === 'unserviceable'
                  ? '<span class="risk-badge danger">Unserviceable</span>'
                  : '<span class="risk-badge ok">Serviceable</span>')
                : '<span class="card-subtext">Not inspected</span>';
              return `<tr>
                <td><span class="u-truncate" title="${escapeHTML(it.desc || '')}">${escapeHTML(it.desc || '')}</span></td>
                <td><span class="u-truncate u-mono" title="${escapeHTML(itemNo)}">${escapeHTML(itemNo)}</span></td>
                <td>${qty}</td>
                <td>${unit}</td>
                <td>${unitCost || '-'}</td>
                <td>${total || '-'}</td>
                <td>${eul}</td>
                <td>${eulStatusCell}</td>
                <td>${inspLabel}</td>
              </tr>`;
            }).join('') : '<tr><td colspan="9" class="empty-cell">No items found in this ICS record.</td></tr>'}</tbody>
          </table>
        </div>
        <div class="icsd-table-meta">
          <span>Showing ${itemCount} item(s)</span>
          <div class="icsd-meta-pills">
            <span class="icsd-mini-pill">${inspectedCount} inspected</span>
            <span class="icsd-mini-pill">Total: ${totalValue}</span>
          </div>
        </div>
      </section>

    </div>
  `;
  overlay.classList.add('show');
}

function closeICSDetailsModal(){
  const overlay = document.getElementById('icsDetailsOverlay');
  if (overlay) overlay.classList.remove('show');
  currentICSDetailsContext = { recordIndex: null, icsNo: '', hasLiveRecord: false };
}

function getCurrentICSDetailsRecordContext(){
  if (!currentICSDetailsContext.hasLiveRecord || currentICSDetailsContext.recordIndex === null) return null;
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const idx = currentICSDetailsContext.recordIndex;
  const record = records[idx];
  if (!record) return null;
  return { records, idx, record };
}

function openICSRecordHistoryModal(){
  const overlay = document.getElementById('icsRecordHistoryOverlay');
  const title = document.getElementById('icsRecordHistoryTitle');
  const body = document.getElementById('icsRecordHistoryBody');
  if (!overlay || !title || !body) return;
  const ctx = getCurrentICSDetailsRecordContext();
  if (!ctx) return notify('error', 'Record history is available only for active ICS records.');
  const record = ctx.record || {};
  const lineage = normalizeRecordLineage(record?._lineage || record?.lineage);
  const rows = (lineage?.versions || []).slice().reverse().map((entry) => {
    const parsedAt = new Date(entry.at || '');
    const at = Number.isFinite(parsedAt.getTime()) ? parsedAt.toLocaleString() : '-';
    const actor = normalizeProfileKeyValue(entry.byProfileKey || '') || 'unknown';
    return `<div class="lineage-row">
      <div class="lineage-row-main">
        <span class="lineage-version">v${Number(entry.version) || 0}</span>
        <span class="lineage-action">${escapeHTML(entry.action || '-')}</span>
        <span class="lineage-time">${escapeHTML(at)}</span>
      </div>
      <div class="lineage-summary">By ${escapeHTML(actor)}</div>
    </div>`;
  }).join('');
  title.textContent = `Record history - ${record.icsNo || 'ICS'}`;
  body.innerHTML = `<div class="profile-readonly">${rows || '<div class="lineage-empty">No record history available.</div>'}</div>`;
  overlay.classList.add('show');
}

function closeICSRecordHistoryModal(){
  const overlay = document.getElementById('icsRecordHistoryOverlay');
  if (overlay) overlay.classList.remove('show');
}

function icsDetailsEditFromTitle(){
  if (!requireAccess('open_ics_editor', { label: 'edit ICS records' })) return;
  if (!currentICSDetailsContext.hasLiveRecord || currentICSDetailsContext.recordIndex === null){
    notify('error', 'Edit mode is only available for active ICS records.');
    return;
  }
  closeICSDetailsModal();
  goToView('Manage Inventory');
  setTimeout(() => editICS(currentICSDetailsContext.recordIndex), 0);
}

function openArchivedItemHistory(index){
  const archived = getArchivedItems();
  const entry = archived[index];
  if (!entry){
    notify('error', 'Archived item not found.');
    return;
  }
  const overlay = document.getElementById('archivedHistoryOverlay');
  const title = document.getElementById('archivedHistoryTitle');
  const body = document.getElementById('archivedHistoryBody');
  if (!overlay || !title || !body) return;

  currentArchivedHistoryIndex = index;
  const src = entry.source || {};
  const it = entry.item || {};
  const disp = entry.disposal || {};
  const inspections = Array.isArray(it.inspections) ? it.inspections : [];
  const textOrDash = (v) => {
    const val = (v ?? '').toString().trim();
    return val || '-';
  };
  const moneyOrDash = (v) => {
    const value = formatCurrencyValue(parseCurrencyValue(v));
    return value || '-';
  };
  const toNiceDate = (dateText) => {
    const d = new Date((dateText || '').toString().trim());
    if (!Number.isFinite(d.getTime())) return textOrDash(dateText);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const toNiceTime = (dateText) => {
    const d = new Date((dateText || '').toString().trim());
    if (!Number.isFinite(d.getTime())) return '-';
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const archivedAtIso = (entry.archivedAt || '').toString().trim();
  const archivedAt = archivedAtIso ? archivedAtIso.replace('T', ' ').slice(0, 19) : '';
  const disposalStatus = disp.status === 'approved' ? 'Approved' : (disp.status === 'not_approved' ? 'Not Approved' : 'Pending');
  const statusClass = disp.status === 'approved' ? 'approved' : 'pending';
  const refNo = textOrDash(disp.referenceNo || entry.referenceNo || '');
  const icon = (name) => `<span class="archived-inline-icon" aria-hidden="true"><i data-lucide="${name}" aria-hidden="true"></i></span>`;
  const iconArchive = icon('archive');
  const iconAsset = icon('package');
  const iconInfo = icon('info');
  const iconBox = icon('box');
  const iconQty = icon('bar-chart-2');
  const iconNote = icon('file-text');
  const iconLogs = icon('list');
  const iconExport = icon('download');

  const assetRows = [
    { label: 'ICS Number', value: textOrDash(src.icsNo) },
    { label: 'Entity', value: textOrDash(src.entity) },
    { label: 'Fund Cluster', value: textOrDash(src.fund) },
    { label: 'Issued Date', value: textOrDash(src.issuedDate) },
    { label: 'Unit Cost', value: moneyOrDash(it.unitCost) },
    { label: 'Total Value', value: moneyOrDash(it.total) },
    { label: 'Archived At', value: textOrDash(archivedAt) },
    { label: 'Approved By', value: textOrDash(disp.approvedBy) }
  ];
  const renderKV = (rows) => rows.map((r) => (
    `<div class="icsd-kv"><div class="k">${escapeHTML(r.label)}</div><div class="v">${escapeHTML(r.value)}</div></div>`
  )).join('');

  const qtyUnit = `${textOrDash(it.qtyText || it.qty)} ${((it.unit || '').toString().trim())}`.trim();

  const inspRows = inspections.length ? inspections.slice().reverse().map((log) => {
    const status = (log.status || '').toString().trim().toLowerCase();
    const statusClassName = status === 'serviceable' ? 'serviceable' : 'unserviceable';
    const statusLabel = status ? status.toUpperCase() : 'UNKNOWN';
    const recordedAt = (log.recordedAt || '').toString().trim();
    const dateDisplay = toNiceDate(log.date || recordedAt);
    const timeDisplay = toNiceTime(recordedAt);
    const reason = textOrDash(log.reason);
    const statusDot = statusClassName === 'serviceable'
      ? icon('check')
      : icon('alert-circle');
    return `<tr>
      <td>${escapeHTML(dateDisplay)}</td>
      <td><span class="archive-log-pill ${statusClassName}">${statusDot}${escapeHTML(statusLabel)}</span></td>
      <td>${escapeHTML(reason)}</td>
      <td>${escapeHTML(timeDisplay)}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="4" class="empty-cell">No inspection history recorded.</td></tr>';

  title.innerHTML = `
    <span class="archived-title-main">${iconArchive}Archived: ${escapeHTML(textOrDash(it.itemNo || 'Item'))}</span>
    <span class="archived-title-badge ${statusClass}">${escapeHTML(disposalStatus.toUpperCase())}</span>
  `;

  body.innerHTML = `
    <div class="icsd-shell archived-icsd-shell">
      <div class="icsd-grid archived-icsd-grid">
        <div class="icsd-col">
          <section class="icsd-card">
            <div class="icsd-card-title">${iconAsset}Asset & Archival Summary</div>
            <div class="icsd-summary-grid">
              ${renderKV(assetRows)}
            </div>
          </section>
        </div>
        <div class="icsd-col">
          <section class="icsd-card">
            <div class="icsd-card-title">${iconBox}Item Details</div>
            <div class="icsd-summary-grid">
              <div class="icsd-kv icsd-kv-full"><div class="k">Item Description</div><div class="v">${escapeHTML(textOrDash(it.desc))}</div></div>
              <div class="icsd-kv"><div class="k">Quantity</div><div class="v">${escapeHTML(textOrDash(qtyUnit))}</div></div>
              <div class="icsd-kv"><div class="k">Remarks</div><div class="v">${escapeHTML(textOrDash(disp.remarks))}</div></div>
            </div>
          </section>
          <section class="icsd-card">
            <div class="icsd-card-title">${iconLogs}Inspection Logs</div>
            <div class="detail-table-wrap">
              <table class="detail-table archived-log-table archived-icsd-log-table">
                <thead>
                  <tr><th>Date</th><th>Status</th><th>Reason</th><th>Time</th></tr>
                </thead>
                <tbody>${inspRows}</tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
      <div class="archived-sheet-foot">
        <div class="archived-foot-meta">Total Logs: ${inspections.length} <span class="archived-foot-ref">Ref: ${escapeHTML(refNo)}</span></div>
        <button class="archived-export-btn" data-action="exportArchivedHistoryReport">${iconExport}Export Archive Report</button>
      </div>
    </div>
  `;
  overlay.classList.add('show');
}

function closeArchivedHistoryModal(){
  const overlay = document.getElementById('archivedHistoryOverlay');
  if (overlay) overlay.classList.remove('show');
  currentArchivedHistoryIndex = null;
}

function exportArchivedHistoryReport(){
  if (currentArchivedHistoryIndex === null || currentArchivedHistoryIndex < 0){
    notify('error', 'No archived history is open.');
    return;
  }
  const archived = getArchivedItems();
  const entry = archived[currentArchivedHistoryIndex];
  if (!entry){
    notify('error', 'Archived item not found.');
    return;
  }
  const fileSafeItem = ((entry.item?.itemNo || 'item').toString().trim() || 'item').replace(/[^a-zA-Z0-9_-]/g, '-');
  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: ICS_SCHEMA_VERSION,
    archivedItem: entry
  };
  downloadJSONPayload(payload, `archive-report-${fileSafeItem}.json`);
  notify('success', 'Archive report exported.');
}

function getArchivedItems(){
  return JSON.parse(localStorage.getItem('icsArchivedItems') || '[]');
}

function setArchivedItems(items){
  localStorage.setItem('icsArchivedItems', JSON.stringify(items));
}
