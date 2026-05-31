function getWelcomeGreeting(){
  const h = new Date().getHours();
  const name = (currentUser?.name || 'Custodian').toString().trim() || 'Custodian';
  const first = name.split(/\s+/).filter(Boolean)[0] || name;
  if (h < 12) return { text: `Good morning, ${first}`, icon: '\uD83C\uDF05' };
  if (h < 18) return { text: `Good afternoon, ${first}`, icon: '\u2600\uFE0F' };
  return { text: `Good evening, ${first}`, icon: '\uD83C\uDF19' };
}

function getViewSubtitle(view){
  if (view === 'Dashboard') return 'Overview of records, supplies, and priorities.';
  if (view === 'Supplies') return 'Track supplies, stock levels, and replenishment.';
  if (view === 'Manage Inventory') return 'Manage ICS and PAR records in one workspace.';
  if (view === 'Action Center') return 'Review EUL risks and inspection actions.';
  if (view === 'Archives') return 'Browse archived records and history.';
  return 'Inventory Custodian Slip workspace.';
}

function parseWelcomeArray(key){
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getWelcomeQuickStatus(view){
  const records = parseWelcomeArray('icsRecords');
  const parRecords = parseWelcomeArray('parRecords');
  const archives = parseWelcomeArray('icsArchivedItems');
  const supplies = parseWelcomeArray('icsSuppliesRecords');
  const toNum = (value) => {
    const n = Number((value ?? '').toString().trim());
    return Number.isFinite(n) ? n : 0;
  };
  const lowStockCount = supplies.filter((item) => {
    const balance = toNum(item?.balanceQty ?? item?.qtyOnHand ?? 0);
    const reorder = Math.max(0, toNum(item?.reorderPoint ?? item?.reorderLevel ?? 0));
    return balance <= reorder;
  }).length;

  if (view === 'Dashboard'){
    return [
      { text: `ICS ${records.length}`, tone: 'info' },
      { text: `PAR ${parRecords.length}`, tone: 'info' },
      { text: `Supplies ${supplies.length}`, tone: 'good' },
      { text: `Archived ${archives.length}`, tone: 'muted' }
    ];
  }

  if (view === 'Supplies'){
    const reporting = typeof getSuppliesReportingConfig === 'function'
      ? getSuppliesReportingConfig(schoolIdentity)
      : { showQuarterColumn: false };
    return [
      { text: `Saved ${supplies.length}`, tone: 'info' },
      { text: `Low stock ${lowStockCount}`, tone: lowStockCount > 0 ? 'warn' : 'good' },
      { text: reporting.showQuarterColumn ? 'Mode: Quarterly' : 'Mode: Monthly', tone: 'muted' }
    ];
  }

  if (view === 'Manage Inventory'){
    return [
      { text: `ICS ${records.length}`, tone: 'info' },
      { text: `PAR ${parRecords.length}`, tone: 'info' },
      { text: inventoryFilter === 'missing' ? 'Filter: Missing Data' : 'Filter: All Records', tone: 'muted' }
    ];
  }

  if (view === 'Action Center'){
    let near = 0;
    let past = 0;
    const classify = typeof classifyEULItem === 'function' ? classifyEULItem : null;
    if (classify){
      records.forEach((r) => {
        (Array.isArray(r.items) ? r.items : []).forEach((it) => {
          const result = classify(r, it);
          if (result.code === 'past') past += 1;
          else if (result.code === 'near') near += 1;
        });
      });
      parRecords.forEach((r) => {
        (Array.isArray(r.items) ? r.items : []).forEach((it) => {
          const result = classify(r, it);
          if (result.code === 'past') past += 1;
          else if (result.code === 'near') near += 1;
        });
      });
    }
    const filterLabel = actionCenterFilter === 'near'
      ? 'Filter: Due < 3m'
      : actionCenterFilter === 'past'
        ? 'Filter: Past EUL'
        : 'Filter: All';
    return [
      { text: `Past EUL ${past}`, tone: past > 0 ? 'danger' : 'good' },
      { text: `Due <3m ${near}`, tone: near > 0 ? 'warn' : 'good' },
      { text: filterLabel, tone: 'muted' }
    ];
  }

  if (view === 'Archives'){
    return [
      { text: `Archived ${archives.length}`, tone: 'info' },
      { text: archivesFilterIcs ? `Scope: ${archivesFilterIcs}` : 'Scope: All', tone: 'muted' }
    ];
  }

  return [];
}

function renderWelcomeBanner(view){
  const g = getWelcomeGreeting();
  const quickStatus = getWelcomeQuickStatus(view);
  const quickStatusMarkup = quickStatus.length
    ? `<div class="welcome-status-pills">${quickStatus.map((chip) => {
      const rawTone = (chip?.tone || '').toString().trim().toLowerCase();
      const tone = ['info', 'good', 'warn', 'danger', 'muted'].includes(rawTone) ? rawTone : 'muted';
      const label = escapeHTML((chip?.text || '').toString());
      return `<span class="welcome-status-pill tone-${tone}">${label}</span>`;
    }).join('')}</div>`
    : '';
  return `
<h2 class="welcome-title welcome-head-item">${g.text} <span class="welcome-icon">${g.icon}</span></h2>
<div class="welcome-meta-row welcome-head-item"><p class="welcome-subtitle">${getViewSubtitle(view)}</p>${quickStatusMarkup}</div>`;
}
