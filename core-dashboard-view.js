function getWelcomeGreeting(){
  const h = new Date().getHours();
  const name = (currentUser?.name || 'Custodian').toString().trim() || 'Custodian';
  const first = name.split(/\s+/).filter(Boolean)[0] || name;
  if (h < 12) return { text: `Good morning, ${first}`, icon: '\uD83C\uDF05' };
  if (h < 18) return { text: `Good afternoon, ${first}`, icon: '\u2600\uFE0F' };
  return { text: `Good evening, ${first}`, icon: '\uD83C\uDF19' };
}

function getViewSubtitle(view){
  const base = (function(){
    if (view === 'Dashboard') return 'Portfolio overview, action priorities, and lifecycle trends at a glance.';
    if (view === 'Manage Inventory') return 'Encode new ICS entries, stage items, and maintain finalized records in one workspace.';
    if (view === 'Action Center') return 'Review items nearing or past EUL and complete required inspection and disposal actions.';
    if (view === 'Archives') return 'Track archived items with disposal approvals and complete historical inspection metadata.';
    return 'Inventory Custodian Slip management workspace.';
  })();
  const state = getViewStateSummary(view);
  return state ? `${base} ${state}` : base;
}

function getViewStateSummary(view){
  const parseArray = (key) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const records = parseArray('icsRecords');
  const archives = parseArray('icsArchivedItems');

  if (view === 'Dashboard'){
    return `Current state: ${records.length} ICS records, ${archives.length} archived items.`;
  }

  if (view === 'Manage Inventory'){
    const scope = inventoryFilter === 'missing' ? 'Missing Data filter active' : 'All records view';
    return `Current state: ${records.length} finalized ICS records. ${scope}.`;
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
    }
    const mode = actionCenterFilter === 'near'
      ? 'Filter: Due < 3m'
      : actionCenterFilter === 'past'
        ? 'Filter: Past EUL'
        : 'Filter: All due/past';
    const scope = actionCenterICSFilter
      ? ` Scope ICS: ${actionCenterICSFilter}${actionCenterItemFilter ? `, Item: ${actionCenterItemFilter}` : ''}.`
      : '';
    return `Current state: ${past} past EUL, ${near} due < 3m. ${mode}.${scope}`;
  }

  if (view === 'Archives'){
    const scope = archivesFilterIcs ? ` Scoped to ICS ${archivesFilterIcs}.` : ' Showing all archived items.';
    return `Current state: ${archives.length} archived items.${scope}`;
  }

  return '';
}

function renderWelcomeBanner(view){
  const g = getWelcomeGreeting();
  return `
<h2 class="welcome-title welcome-head-item">${g.text} <span class="welcome-icon">${g.icon}</span></h2>
<p class="welcome-subtitle welcome-head-item">${getViewSubtitle(view)}</p>`;
}
