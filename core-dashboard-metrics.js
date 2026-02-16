function recordHasMissingData(record){
  if (!record) return false;
  if (!(record.fund || '').trim()) return true;
  if (!(record.signatories?.issuedBy?.name || '').trim() || !(record.signatories?.receivedBy?.name || '').trim()) return true;
  const items = Array.isArray(record.items) ? record.items : [];
  if (!items.length) return true;
  return items.some((it) => {
    const desc = (it.desc || '').toString().trim();
    const itemNo = (it.itemNo || '').toString().trim();
    const unit = (it.unit || '').toString().trim();
    const qty = (it.qtyText ?? it.qty ?? '').toString().trim();
    return !desc || !itemNo || !unit || !qty;
  });
}

function renderDashboardStatusBars(rows){
  const host = document.getElementById('dashStatusBars');
  if (!host) return;
  const max = Math.max(1, ...rows.map((r) => r.value || 0));
  host.innerHTML = rows.map((r) => {
    const pct = Math.max(4, Math.round(((r.value || 0) / max) * 100));
    return `<div class="dash-bar-row"><span class="dash-bar-label">${escapeHTML(r.label)}</span><span class="dash-bar-track"><span class="dash-bar-fill ${escapeHTML(r.tone)}" style="width:${pct}%"></span></span><span class="dash-bar-val">${r.value}</span></div>`;
  }).join('');
}

function initDashboardView(){
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const archived = getArchivedItems();
  const recent = getAuditLogs().slice().reverse().slice(0, 8);

  let totalItems = 0;
  let dueSoon = 0;
  let pastDue = 0;
  let totalDep = 0;
  let totalValue = 0;
  let missingSignatoryCount = 0;
  let pendingInspection = 0;
  let missingRecordCount = 0;
  let missingFundCluster = 0;
  let incompleteItems = 0;
  let itemsWithoutInspection = 0;
  const riskItems = [];
  records.forEach((r) => {
    const m = computeRecordMetrics(r);
    totalItems += m.totalItems;
    dueSoon += m.dueSoon;
    pastDue += m.pastDue;
    totalDep += m.depreciatedValue;
    totalValue += m.totalValue;

    const iss = r.signatories?.issuedBy?.name || '';
    const rec = r.signatories?.receivedBy?.name || '';
    if (!iss || !rec) missingSignatoryCount += 1;
    if (!(r.fund || '').trim()) missingFundCluster += 1;
    (r.items || []).forEach((it) => {
      const s = classifyEULItem(r, it);
      if (s.code !== 'ok'){
        const insp = Array.isArray(it.inspections) ? it.inspections : [];
        if (!insp.length) pendingInspection += 1;
        riskItems.push({
          icsNo: r.icsNo || '',
          itemNo: it.itemNo || '',
          desc: it.desc || '',
          status: s.status,
          code: s.code
        });
      }
      const desc = (it.desc || '').toString().trim();
      const itemNo = (it.itemNo || '').toString().trim();
      const unit = (it.unit || '').toString().trim();
      const qty = (it.qtyText ?? it.qty ?? '').toString().trim();
      if (!desc || !itemNo || !unit || !qty) incompleteItems += 1;
      const inspAll = Array.isArray(it.inspections) ? it.inspections : [];
      if (!inspAll.length) itemsWithoutInspection += 1;
    });
    if (recordHasMissingData(r)) missingRecordCount += 1;
  });

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const applyValueTicker = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const raw = (el.textContent || '').toString().trim();
    el.classList.remove('value-scroll', 'is-overflow');
    el.style.removeProperty('--ticker-distance');
    el.style.removeProperty('--ticker-duration');
    el.textContent = raw;
    if (!raw) return;
    el.classList.add('value-scroll');
    const track = document.createElement('span');
    track.className = 'value-scroll-track';
    track.textContent = raw;
    el.textContent = '';
    el.appendChild(track);
    requestAnimationFrame(() => {
      const overflow = track.scrollWidth > el.clientWidth + 2;
      if (!overflow) return;
      const distance = Math.max(track.scrollWidth - el.clientWidth, 0);
      const duration = Math.max(6, distance / 26);
      el.style.setProperty('--ticker-distance', `${distance}px`);
      el.style.setProperty('--ticker-duration', `${duration}s`);
      el.classList.add('is-overflow');
    });
  };
  set('dashKpiRecords', String(records.length));
  set('dashKpiItems', String(totalItems));
  set('dashKpiDue', String(dueSoon));
  set('dashKpiPast', String(pastDue));
  set('dashKpiArchived', String(archived.length));
  set('dashKpiDep', formatCurrencyValue(totalDep) || '0.00');
  set('dashKpiWithin', String(Math.max(totalItems - pastDue, 0)));
  set('dashKpiOutside', String(pastDue));
  set('dashKpiAsset', formatCurrencyValue(totalValue) || '0.00');
  applyValueTicker('dashKpiAsset');
  setTimeout(() => applyValueTicker('dashKpiAsset'), 80);
  setTimeout(() => applyValueTicker('dashKpiAsset'), 260);
  if (!window.__dashAssetTickerResizeBound){
    let dashTickerResizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(dashTickerResizeTimer);
      dashTickerResizeTimer = setTimeout(() => applyValueTicker('dashKpiAsset'), 90);
    });
    window.__dashAssetTickerResizeBound = true;
  }
  set('dashMiniBookValue', formatCurrencyValue(totalValue) || '0.00');
  set('dashMiniAvgItems', records.length ? (totalItems / records.length).toFixed(1) : '0');
  const healthyItems = Math.max(totalItems - dueSoon - pastDue, 0);
  const healthPct = totalItems ? Math.round((healthyItems / totalItems) * 100) : 100;
  set('dashMiniHealth', `${healthPct}%`);
  const healthScore = document.getElementById('dashHealthScore');
  if (healthScore){
    healthScore.textContent = healthPct >= 85 ? 'Healthy' : (healthPct >= 65 ? 'Watch' : 'Critical');
  }
  renderDashboardStatusBars([
    { label: 'Healthy', value: healthyItems, tone: 'ok' },
    { label: 'Due <3m', value: dueSoon, tone: 'near' },
    { label: 'Past EUL', value: pastDue, tone: 'past' },
    { label: 'Archived', value: archived.length, tone: 'archive' }
  ]);
  const healthNote = document.getElementById('dashHealthNote');
  if (healthNote){
    healthNote.textContent = `Health score is based on active items not yet due or past EUL (${healthyItems} of ${totalItems}).`;
  }
  const withinPct = totalItems ? Math.round((Math.max(totalItems - pastDue, 0) / totalItems) * 100) : 100;
  const outsidePct = totalItems ? Math.round((pastDue / totalItems) * 100) : 0;
  set('dashComplianceWithinPct', `${withinPct}%`);
  set('dashComplianceOutsidePct', `${outsidePct}%`);
  const withinBar = document.getElementById('dashComplianceWithinBar');
  const outsideBar = document.getElementById('dashComplianceOutsideBar');
  if (withinBar) withinBar.style.width = `${Math.max(0, Math.min(100, withinPct))}%`;
  if (outsideBar) outsideBar.style.width = `${Math.max(0, Math.min(100, outsidePct))}%`;
  const complianceBadge = document.getElementById('dashComplianceBadge');
  if (complianceBadge){
    if (outsidePct >= 30){
      complianceBadge.textContent = 'Needs review';
      complianceBadge.className = 'dash-compliance-badge danger';
    } else if (outsidePct >= 15){
      complianceBadge.textContent = 'Watch';
      complianceBadge.className = 'dash-compliance-badge warn';
    } else {
      complianceBadge.textContent = 'Stable';
      complianceBadge.className = 'dash-compliance-badge ok';
    }
  }

  const attention = [
    `Past EUL items: ${pastDue}`,
    `Items due within 3 months: ${dueSoon}`,
    `Pending inspections (EUL action list): ${pendingInspection}`,
    `Not approved disposals in archive: ${archived.filter((a) => a.disposal?.status !== 'approved').length}`,
    `Records with missing signatories: ${missingSignatoryCount}`
  ];
  const attEl = document.getElementById('dashAttentionList');
  if (attEl) attEl.innerHTML = attention.map((x) => `<li>${x}</li>`).join('');

  const setChip = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  setChip('dashChipAll', `All (${dueSoon + pastDue})`);
  setChip('dashChipNear', `Due < 3m (${dueSoon})`);
  setChip('dashChipPast', `Past EUL (${pastDue})`);
  setChip('dashChipArchived', `Archived (${archived.length})`);
  setChip('dashChipMissing', `Missing Data (${missingRecordCount})`);

  const note = document.getElementById('dashDataNote');
  if (note){
    note.textContent = `Book Value: ${formatCurrencyValue(totalValue) || '0.00'} | Data refreshed: ${new Date().toLocaleString()}`;
  }
  const backupNote = document.getElementById('dashBackupNote');
  if (backupNote){
    const lastBackup = localStorage.getItem('icsLastFullBackupAt');
    const lastImport = localStorage.getItem('icsLastImportAt');
    backupNote.textContent = `Last full backup: ${lastBackup ? new Date(lastBackup).toLocaleString() : 'Never'} | Last import: ${lastImport ? new Date(lastImport).toLocaleString() : 'Never'}`;
  }

  const recEl = document.getElementById('dashRecentList');
  if (recEl){
    recEl.innerHTML = recent.length
      ? recent.map((n) => `<li><strong>${escapeHTML(n.type || 'info')}</strong> - ${escapeHTML(n.detail || '')} <span class="dash-note">(${escapeHTML(n.time || '')})</span></li>`).join('')
      : '<li>No recent activity yet.</li>';
  }

  const healthRows = [
    ['Missing Fund Cluster', missingFundCluster],
    ['Missing Signatories', missingSignatoryCount],
    ['Incomplete Item Rows', incompleteItems],
    ['Items Without Inspection Log', itemsWithoutInspection]
  ];
  const healthEl = document.getElementById('dashHealthRows');
  if (healthEl){
    healthEl.innerHTML = healthRows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  }

  riskItems.sort((a, b) => {
    const rank = (x) => x.code === 'past' ? 0 : 1;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return (a.icsNo || '').localeCompare(b.icsNo || '');
  });
  const riskEl = document.getElementById('dashRiskRows');
  if (riskEl){
    const topRisk = riskItems.slice(0, 10);
    riskEl.innerHTML = topRisk.length
      ? topRisk.map((r, i) => `<tr><td>${i + 1}</td><td><button class="ics-link-btn" data-action="openICSDetailsByKey" data-arg1="${escapeHTML(r.icsNo)}" data-arg2="${escapeHTML(r.itemNo)}">${escapeHTML(r.icsNo)}</button></td><td>${escapeHTML(r.itemNo)}</td><td>${escapeHTML(r.desc)}</td><td><span class="risk-badge ${r.code === 'past' ? 'danger' : 'warn'}">${escapeHTML(r.status)}</span></td></tr>`).join('')
      : '<tr><td colspan="5" class="empty-cell">No risk items right now.</td></tr>';
  }

  hydrateRecentIcsActivityCards(records);

  const dashNoteSync = document.getElementById('dashNoteSync');
  if (dashNoteSync){
    const lastBackup = localStorage.getItem('icsLastFullBackupAt');
    const lastImport = localStorage.getItem('icsLastImportAt');
    const backupText = lastBackup ? new Date(lastBackup).toLocaleString() : 'Never';
    const importText = lastImport ? new Date(lastImport).toLocaleString() : 'Never';
    dashNoteSync.textContent = `Last full backup: ${backupText} | Last import: ${importText}.`;
  }
  const mismatchCount = records.reduce((sum, r) => sum + (verifyRecordLineage(r || {}).ok ? 0 : 1), 0);
  const dashNoteIntegrity = document.getElementById('dashNoteIntegrity');
  if (dashNoteIntegrity){
    dashNoteIntegrity.textContent = mismatchCount
      ? `${mismatchCount} record(s) need lineage review before formal export/reporting.`
      : 'Traceability metadata is ready for exports and reporting.';
  }
  const dashNoteReminders = document.getElementById('dashNoteReminders');
  if (dashNoteReminders){
    dashNoteReminders.textContent = pastDue
      ? `Review ${pastDue} outside-EUL item(s) in Action Center.`
      : 'No outside-EUL alerts at the moment.';
  }

  const emptyHint = document.getElementById('dashEmptyHint');
  if (emptyHint) emptyHint.style.display = records.length ? 'none' : 'block';
}
