const DASH_RECENT_ICS_ACTIVITY_LIMIT = 10;

function buildRecentIcsActivityRows(records){
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

    return {
      icsNo: record.icsNo || '-',
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
      icsClass: String(record.icsNo || '').length > 16 ? 'is-long' : ''
    };
  }).sort((a, b) => b.sortAt - a.sortAt).slice(0, DASH_RECENT_ICS_ACTIVITY_LIMIT);
}

function formatRecentActivityTimestamp(value){
  const parsed = new Date(value || '');
  if (!Number.isFinite(parsed.getTime())) return '-';
  const datePart = parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = parsed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} &bull; ${timePart}`;
}

function renderRecentIcsActivityCards(records){
  const rows = buildRecentIcsActivityRows(records);
  if (!rows.length) return '<div class="empty-cell">No recent ICS activity.</div>';
  return rows.map((row, idx) => `<article class="dash-recent-card tone-${escapeHTML(row.cardTone)}">
      <div class="dash-recent-card-top">
        <div class="dash-recent-card-ics-row">
          <span class="dash-recent-card-idx">#${idx + 1}</span>
          <button class="ics-link-btn dash-recent-card-ics-link ${row.icsClass}" data-action="openICSDetailsByKey" data-arg1="${escapeHTML(row.icsNo)}" data-arg2="">${escapeHTML(row.icsNo)}</button>
        </div>
        <button class="dash-recent-card-open" type="button" aria-label="Open ${escapeHTML(row.icsNo)} details" data-action="openICSDetailsByKey" data-arg1="${escapeHTML(row.icsNo)}" data-arg2="">
          <i data-lucide="external-link" aria-hidden="true"></i>
        </button>
      </div>
      <div class="dash-recent-card-badges">
        <span class="dash-recent-pill ${row.statusClass}">${escapeHTML(row.actionLabel)}</span>
        <span class="dash-recent-pill ${row.eulTone === 'danger' ? 'danger' : 'ok'}"><i data-lucide="${row.eulTone === 'danger' ? 'alert-circle' : 'check-circle-2'}" aria-hidden="true"></i>${escapeHTML(row.eulLabel)}</span>
      </div>
      <div class="dash-recent-card-grid">
        <div class="dash-recent-card-field info">
          <span class="dash-recent-card-field-icon" aria-hidden="true"><i data-lucide="house"></i></span>
          <span class="k">ENTITY</span>
          <span class="v">${escapeHTML(row.entity)}</span>
        </div>
        <div class="dash-recent-card-field info">
          <span class="dash-recent-card-field-icon" aria-hidden="true"><i data-lucide="user-round"></i></span>
          <span class="k">ACCOUNTABLE</span>
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
    </article>`).join('');
}

function hydrateRecentIcsActivityCards(records){
  const host = document.getElementById('dashRecentIcsRows');
  if (!host) return;
  host.innerHTML = renderRecentIcsActivityCards(records);
}
