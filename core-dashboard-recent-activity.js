const DASH_RECENT_ACTIVITY_LIMIT = 10;

function buildRecentActivityRows(records, sourceType){
  const normalizedSource = (sourceType || 'ics').toString().toLowerCase() === 'par' ? 'par' : 'ics';
  return (records || []).map((record) => {
    const metrics = computeRecordMetrics(record);
    const items = Array.isArray(record.items) ? record.items : [];
    const allOk = items.length > 0 && items.every((item) => classifyEULItem(record, item).code === 'ok');
    const eulTone = allOk ? 'ok' : 'danger';
    const lineage = normalizeRecordLineage(record?._lineage || record?.lineage);
    const latestLineage = (lineage?.versions || []).slice().reverse()[0] || null;
    const statusMeta = record?._statusMeta || {};
    const statusRaw = (statusMeta.type || latestLineage?.action || 'updated').toString().toLowerCase();
    const actionLabel = statusRaw === 'imported' ? 'IMPORTED' : (statusRaw === 'new' ? 'NEW' : 'UPDATED');
    const cardTone = eulTone === 'danger'
      ? 'risk'
      : (statusRaw === 'new' ? 'new' : (statusRaw === 'imported' ? 'imported' : 'ok'));
    const actionAtRaw = latestLineage?.at || statusMeta.at || '';
    const actionAtDate = new Date(actionAtRaw);
    const actionAt = Number.isFinite(actionAtDate.getTime()) ? actionAtDate.toISOString() : '';
    const recordNo = normalizedSource === 'par'
      ? (record.parNo || record.icsNo || '-')
      : (record.icsNo || '-');

    return {
      recordNo,
      sourceType: normalizedSource,
      entity: record.entity || '-',
      accountable: record.accountable || '-',
      eulLabel: eulTone === 'danger' ? 'OUTSIDE EUL' : 'WITHIN EUL',
      eulTone,
      totalValue: formatCurrencyValue(metrics.totalValue) || '0.00',
      actionLabel,
      statusClass: statusRaw === 'imported' ? 'status-imported' : (statusRaw === 'new' ? 'status-new' : 'status-updated'),
      actionAt,
      cardTone,
      sortAt: Number.isFinite(actionAtDate.getTime()) ? actionAtDate.getTime() : 0,
      icsClass: String(recordNo || '').length > 16 ? 'is-long' : ''
    };
  });
}

function buildRecentSupplyActivityRows(records){
  const historyMapRaw = JSON.parse(localStorage.getItem('icsSuppliesHistoryByStockNo') || '{}');
  const historyMap = historyMapRaw && typeof historyMapRaw === 'object' && !Array.isArray(historyMapRaw) ? historyMapRaw : {};
  const normalizeKey = (value) => (value || '').toString().trim().toLowerCase();
  const historyByNormalizedKey = Object.keys(historyMap).reduce((acc, key) => {
    const n = normalizeKey(key);
    if (!n) return acc;
    acc[n] = Array.isArray(historyMap[key]) ? historyMap[key] : [];
    return acc;
  }, {});
  const toQty = (value) => {
    const n = Number((value ?? '').toString().trim());
    return Number.isFinite(n) ? n : 0;
  };
  return (records || []).map((record, idx) => {
    const stockNo = (record?.stockNo || '').toString().trim() || '-';
    const rows = historyByNormalizedKey[normalizeKey(stockNo)] || (Array.isArray(record?.history) ? record.history : []);
    const latest = rows.length ? rows[rows.length - 1] : null;
    const actionAtRaw = latest?.at || record?.updatedAt || record?.date || '';
    const actionAtDate = new Date(actionAtRaw);
    const actionAt = Number.isFinite(actionAtDate.getTime()) ? actionAtDate.toISOString() : '';
    const balance = toQty(record?.balanceQty);
    const reorderPoint = toQty(record?.reorderPoint);
    const isLowStock = balance <= 0 || (reorderPoint > 0 && balance <= reorderPoint);
    const unitCost = toQty(record?.price);
    const totalValue = Math.max(0, balance * unitCost);
    return {
      recordNo: stockNo,
      sourceType: 'supplies',
      sourceOpenAction: 'openStockCardByIndex',
      sourceOpenArg1: idx,
      entity: (record?.item || record?.description || '-').toString(),
      accountable: (record?.latestIssuedOffice || 'School Office').toString(),
      eulLabel: isLowStock ? 'LOW STOCK' : 'IN STOCK',
      eulTone: isLowStock ? 'danger' : 'ok',
      totalValue: formatCurrencyValue(totalValue) || '0.00',
      actionLabel: 'ADDED',
      statusClass: 'status-new',
      actionAt,
      cardTone: isLowStock ? 'risk' : 'new',
      sortAt: Number.isFinite(actionAtDate.getTime()) ? actionAtDate.getTime() : 0,
      icsClass: stockNo.length > 16 ? 'is-long' : ''
    };
  });
}

function formatRecentActivityTimestamp(value){
  const parsed = new Date(value || '');
  if (!Number.isFinite(parsed.getTime())) return '-';
  const datePart = formatDateForDisplay(parsed, '-');
  const timePart = parsed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} &bull; ${timePart}`;
}

function renderRecentIcsActivityCards(icsRecords, parRecords, suppliesRecords){
  const rows = [
    ...buildRecentSupplyActivityRows(suppliesRecords),
    ...buildRecentActivityRows(icsRecords, 'ics'),
    ...buildRecentActivityRows(parRecords, 'par')
  ]
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, DASH_RECENT_ACTIVITY_LIMIT);
  if (!rows.length) return '<div class="empty-cell">No recent Supplies/ICS/PAR activity.</div>';
  return rows.map((row, idx) => `<article class="dash-recent-card tone-${escapeHTML(row.cardTone)} source-${escapeHTML(row.sourceType)}">
      <div class="dash-recent-card-top">
        <div class="dash-recent-card-ics-row">
          <span class="dash-recent-card-idx">#${idx + 1}</span>
          <button class="ics-link-btn dash-recent-card-ics-link ${row.icsClass}" data-action="${row.sourceOpenAction || (row.sourceType === 'par' ? 'openPARDetailsByKey' : 'openICSDetailsByKey')}" data-arg1="${escapeHTML(String(row.sourceOpenArg1 ?? row.recordNo))}" data-arg2="">${escapeHTML(row.recordNo)}</button>
        </div>
        <button class="dash-recent-card-open" type="button" aria-label="Open ${escapeHTML(row.recordNo)} details" data-action="${row.sourceOpenAction || (row.sourceType === 'par' ? 'openPARDetailsByKey' : 'openICSDetailsByKey')}" data-arg1="${escapeHTML(String(row.sourceOpenArg1 ?? row.recordNo))}" data-arg2="">
          <i data-lucide="external-link" aria-hidden="true"></i>
        </button>
      </div>
      <div class="dash-recent-card-badges">
        <span class="dash-recent-pill source-${row.sourceType}">${row.sourceType === 'par' ? 'PAR' : (row.sourceType === 'supplies' ? 'SUPPLIES' : 'ICS')}</span>
        <span class="dash-recent-pill ${row.statusClass}">${escapeHTML(row.actionLabel)}</span>
        <span class="dash-recent-pill ${row.eulTone === 'danger' ? 'danger' : 'ok'}"><i data-lucide="${row.eulTone === 'danger' ? 'alert-circle' : 'check-circle-2'}" aria-hidden="true"></i>${escapeHTML(row.eulLabel)}</span>
      </div>
      <div class="dash-recent-card-details">
        <div class="dash-recent-card-grid">
          <div class="dash-recent-card-field info">
            <span class="dash-recent-card-field-icon" aria-hidden="true"><i data-lucide="house"></i></span>
            <span class="k">${row.sourceType === 'supplies' ? 'ITEM' : 'ENTITY'}</span>
            <span class="v">${escapeHTML(row.entity)}</span>
          </div>
          <div class="dash-recent-card-field info">
            <span class="dash-recent-card-field-icon" aria-hidden="true"><i data-lucide="user-round"></i></span>
            <span class="k">${row.sourceType === 'supplies' ? 'OFFICE' : 'ACCOUNTABLE'}</span>
            <span class="v">${escapeHTML(row.accountable)}</span>
          </div>
          <div class="dash-recent-card-field money">
            <span class="dash-recent-card-field-icon" aria-hidden="true"><i data-lucide="dollar-sign"></i></span>
            <span class="k">VALUE</span>
            <span class="v">&#8369; ${escapeHTML(row.totalValue)}</span>
          </div>
        </div>
        <div class="dash-recent-card-foot">
          <span class="k"><i data-lucide="clock-3" aria-hidden="true"></i>LAST ACTIVITY</span>
          <span class="v">${formatRecentActivityTimestamp(row.actionAt)}</span>
        </div>
      </div>
    </article>`).join('');
}

function hydrateRecentIcsActivityCards(icsRecords, parRecords, suppliesRecords){
  const host = document.getElementById('dashRecentIcsRows');
  if (!host) return;
  host.innerHTML = renderRecentIcsActivityCards(icsRecords, parRecords, suppliesRecords);
}
