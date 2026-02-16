function openInventoryView(){
  const item = [...navItems].find((n) => n.dataset.view === 'Manage Inventory');
  if (item && !item.classList.contains('active')) item.click();
}

function monthsUntil(dateIso){
  const target = new Date(dateIso);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const yearDiff = target.getFullYear() - now.getFullYear();
  const monthDiff = target.getMonth() - now.getMonth();
  const dayAdj = target.getDate() < now.getDate() ? -1 : 0;
  return yearDiff * 12 + monthDiff + dayAdj;
}

function classifyEULItem(record, item){
  const issued = new Date(record.issuedDate);
  const eulYears = Number((item.eul ?? '').toString().trim());
  if (Number.isNaN(issued.getTime()) || !Number.isFinite(eulYears) || eulYears <= 0){
    return { status: 'Within EUL', cls: 'risk-badge ok', code: 'ok' };
  }
  const expiry = new Date(issued);
  expiry.setFullYear(expiry.getFullYear() + eulYears);
  const monthsLeft = monthsUntil(expiry.toISOString().slice(0, 10));
  if (monthsLeft === null) return { status: 'Within EUL', cls: 'risk-badge ok', code: 'ok' };
  if (monthsLeft < 0) return { status: 'Past EUL', cls: 'risk-badge danger', code: 'past' };
  if (monthsLeft <= 3) return { status: 'Due < 3m', cls: 'risk-badge warn', code: 'near' };
  return { status: 'Within EUL', cls: 'risk-badge ok', code: 'ok' };
}

function classifyEULUrgencyTier(record, item){
  const issued = new Date(record?.issuedDate || '');
  const eulYears = Number((item?.eul ?? '').toString().trim());
  if (Number.isNaN(issued.getTime()) || !Number.isFinite(eulYears) || eulYears <= 0) return { tier: 'ok' };
  const expiry = new Date(issued);
  expiry.setFullYear(expiry.getFullYear() + eulYears);
  const ms = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate()).getTime() - new Date().setHours(0, 0, 0, 0);
  const daysLeft = Math.round(ms / 86400000);
  if (daysLeft < 0) return { tier: 'overdue', daysLeft };
  if (daysLeft <= 30) return { tier: 'lt30', daysLeft };
  if (daysLeft <= 90) return { tier: 'lt90', daysLeft };
  return { tier: 'ok', daysLeft };
}

function computeEULDaysLeft(record, item){
  const issued = new Date(record?.issuedDate || '');
  const eulYears = Number((item?.eul ?? '').toString().trim());
  if (Number.isNaN(issued.getTime()) || !Number.isFinite(eulYears) || eulYears <= 0) return '';
  const expiry = new Date(issued);
  expiry.setFullYear(expiry.getFullYear() + eulYears);
  const ms = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate()).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

function computeRecordMetrics(record){
  const issued = new Date(record.issuedDate);
  const now = new Date();
  const elapsedYears = Number.isNaN(issued.getTime()) ? 0 : Math.max(0, (now - issued) / (1000 * 60 * 60 * 24 * 365.25));
  const items = record.items || [];
  let dueSoon = 0;
  let pastDue = 0;
  let totalValue = 0;
  let depreciatedValue = 0;

  items.forEach((it) => {
    const qty = parseQuantityValue(it.qtyText ?? it.qty);
    const unitCost = parseCurrencyValue(it.unitCost);
    const lineTotal = Number.isFinite(parseCurrencyValue(it.total))
      ? parseCurrencyValue(it.total)
      : (Number.isFinite(qty) && Number.isFinite(unitCost) ? qty * unitCost : 0);
    const eulYears = Number((it.eul ?? '').toString().trim());
    totalValue += lineTotal || 0;

    if (Number.isFinite(eulYears) && eulYears > 0 && !Number.isNaN(issued.getTime())){
      const expiry = new Date(issued);
      expiry.setFullYear(expiry.getFullYear() + eulYears);
      const monthsLeft = monthsUntil(expiry.toISOString().slice(0, 10));
      if (monthsLeft !== null){
        if (monthsLeft < 0) pastDue += 1;
        else if (monthsLeft <= 3) dueSoon += 1;
      }
      const factor = Math.max(0, 1 - (elapsedYears / eulYears));
      depreciatedValue += (lineTotal || 0) * factor;
    } else {
      depreciatedValue += lineTotal || 0;
    }
  });

  return {
    totalItems: items.length,
    dueSoon,
    pastDue,
    totalValue,
    depreciatedValue
  };
}

function renderEULStatus(record){
  const items = Array.isArray(record?.items) ? record.items : [];
  const groups = {
    overdue: [],
    lt30: [],
    lt90: []
  };

  items.forEach((it, idx) => {
    const tier = classifyEULUrgencyTier(record, it).tier;
    if (!groups[tier]) return;
    const label = (it.itemNo || '').toString().trim() || `Item ${idx + 1}`;
    const itemNo = (it.itemNo || '').toString().trim();
    groups[tier].push({ label, itemNo });
  });

  const totalAtRisk = groups.overdue.length + groups.lt30.length + groups.lt90.length;
  const renderStack = (line1, line2 = '&nbsp;') => (
    `<div class="eul-stack"><div class="eul-line">${line1 || '&nbsp;'}</div><div class="eul-line">${line2 || '&nbsp;'}</div></div>`
  );
  if (totalAtRisk){
    const summaryClass = groups.overdue.length ? 'danger' : 'warn';
    const summary = `<span class="risk-badge ${summaryClass}">At Risk: ${totalAtRisk} item${totalAtRisk === 1 ? '' : 's'}</span>`;
    const renderTier = (tier, cls, label, action) => {
      const bucket = groups[tier];
      if (!bucket.length) return '';
      const firstItemNo = bucket.find((x) => x.itemNo)?.itemNo || '';
      const tooltip = `${label} items: ${bucket.map((x) => x.label).join(', ')}`;
      const badge = `<span class="risk-badge ${cls}" title="${escapeHTML(tooltip)}">${label}: ${bucket.length}</span>`;
      if (!firstItemNo) return badge;
      const icsNo = escapeHTML(record.icsNo || '');
      const safeItem = escapeHTML(firstItemNo);
      return `<button class="ics-link-btn" data-action="${action}" data-arg1="${icsNo}" data-arg2="${safeItem}">${badge}</button>`;
    };

    const overdueBadge = renderTier('overdue', 'danger', 'Overdue', 'openPastEULForItem');
    const lt30Badge = renderTier('lt30', 'warn', 'Due <30d', 'openNearEULForItem');
    const lt90Badge = renderTier('lt90', 'near', 'Due <90d', 'openNearEULForItem');
    const details = `${overdueBadge}${lt30Badge}${lt90Badge}`.trim();
    return renderStack(summary, details);
  }
  return renderStack('<span class="risk-badge ok">Within EUL</span>');
}

function renderValueCell(record){
  const m = computeRecordMetrics(record);
  const total = formatCurrencyValue(m.totalValue);
  const dep = formatCurrencyValue(m.depreciatedValue);
  const ratio = m.totalValue > 0 ? (m.depreciatedValue / m.totalValue) : 1;
  const depPct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  const tip = `Depreciated value: ${dep} (${depPct}% of total)`;
  return `<div class="value-main value-main-inline">${total}<button class="value-info-btn" title="${escapeHTML(tip)}" aria-label="${escapeHTML(tip)}"><i data-lucide="info" aria-hidden="true"></i></button></div>`;
}

function loadICSRecords(){
  const canEdit = hasRoleCapability('edit_records');
  const canDelete = hasRoleCapability('delete_records');
  const canExport = hasRoleCapability('export_data');
  const allRecords = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const body = document.getElementById('icsRecords');
  if (!body) return;
  body.innerHTML = '';
  refreshAutoSuggest();
  const rows = allRecords
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => (inventoryFilter === 'missing' ? recordHasMissingData(r) : true));

  if (rows.length === 0){
    body.innerHTML = inventoryFilter === 'missing'
      ? '<tr><td class="empty-cell" colspan="10">No ICS records with missing data.</td></tr>'
      : '<tr><td class="empty-cell" colspan="10">No ICS records yet. Add or import an ICS to get started.</td></tr>';
    return;
  }

  rows.forEach((entry, rowIdx) => {
    const r = entry.r;
    const i = entry.i;
    const metrics = computeRecordMetrics(r);
    const statusMini = renderRecordStatusMini(r);
    const safeIcs = escapeHTML(r.icsNo || '');
    const safeEntity = escapeHTML(r.entity || '');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${rowIdx + 1}</td>
      <td><div class="ics-no-wrap"><div class="ics-no-line"><button class="ics-link-btn" title="${safeIcs}" aria-label="Open ICS ${safeIcs}" data-action="openICSDetailsByIndex" data-arg1="${i}">${safeIcs}</button></div></div></td>
      <td>${statusMini}</td>
      <td>${safeEntity}</td>
      <td>${r.issuedDate}</td>
      <td>${r.accountable}</td>
      <td>${renderEULStatus(r)}</td>
      <td>${metrics.totalItems}</td>
      <td>${renderValueCell(r)}</td>
      <td>
        <button class="btn btn-sm btn-secondary btn-icon icon-only-btn" title="Edit ICS" aria-label="Edit ICS" data-action="editICS" data-arg1="${i}" ${canEdit ? '' : 'disabled'}><i data-lucide="pencil" aria-hidden="true"></i></button>
        <button class="btn btn-sm btn-secondary btn-icon icon-only-btn" title="Print ICS" aria-label="Print ICS" data-action="printICS" data-arg1="${i}"><i data-lucide="printer" aria-hidden="true"></i></button>
        <button class="btn btn-sm btn-secondary btn-icon icon-only-btn" title="Export ICS" aria-label="Export ICS" data-action="exportICS" data-arg1="${i}" ${canExport ? '' : 'disabled'}><i data-lucide="download" aria-hidden="true"></i></button>
        <button class="btn btn-sm btn-danger btn-icon icon-only-btn" title="Delete ICS" aria-label="Delete ICS" data-action="deleteICS" data-arg1="${i}" ${canDelete ? '' : 'disabled'}><i data-lucide="trash-2" aria-hidden="true"></i></button>
      </td>`;
    body.appendChild(tr);
  });
}

function deleteICS(i){
  if (!requireAccess('delete_record')) return;
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const target = records[i];
  if (!target) return;
  showConfirm(
    'Confirm Delete',
    `Delete ICS ${target.icsNo}? This action cannot be undone.`,
    () => {
      records.splice(i, 1);
      localStorage.setItem('icsRecords', JSON.stringify(records));
      recordAudit('delete', `Deleted ICS ${target.icsNo || 'record'}.`, buildRecordLineageAuditMeta(target));
      loadICSRecords();
      notify('info', `Deleted ${target.icsNo || 'ICS record'}.`);
    },
    'Delete'
  );
}
