function renderSuppliesView(){
  const reporting = typeof getSuppliesReportingConfig === 'function'
    ? getSuppliesReportingConfig(schoolIdentity)
    : { showQuarterColumn: false };
  const showQuarterColumn = !!reporting.showQuarterColumn;
  const stageQuarterHeader = showQuarterColumn ? '<th>Report Quarter</th>' : '';
  return `
${renderWelcomeBanner('Supplies')}

<div class="ics-card staged">
  <div class="ics-card-head">
    <span class="card-title">Supply Entry <span class="card-badge staged">ENCODING</span></span>
    <span class="stage-context">Supplies encoding workspace</span>
  </div>
  <p class="card-subtext">Record of Receipts, Issuances, and Running Balances of Consumable Supplies</p>

  <div class="stage-table-wrap">
    <table class="ics-table staged-items-table supplies-staged-items-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Stock No.</th>
          <th>Date</th>
          <th>Reference</th>
          <th>Item</th>
          <th>Description</th>
          <th>Unit</th>
          <th>Report Month</th>
          ${stageQuarterHeader}
          <th>Receipt (QTY)</th>
          <th>Price</th>
          <th>Re-order Point</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody id="suppliesStageBody"></tbody>
    </table>
  </div>

  <div class="ics-card-actions">
    <button class="btn btn-sm btn-primary" data-action="suppliesSaveStaged"><i data-lucide="save" aria-hidden="true"></i>Add New Stocks</button>
  </div>
</div>

<div class="ics-card records">
  <div class="ics-card-head"><span class="card-title">Supplies Saved <span class="card-badge records">SAVED</span></span></div>
  <p class="card-subtext" id="suppliesSavedSubtext">Finalized supplies are listed here for tracking and inventory operations.</p>
  <div class="supplies-saved-tabs" role="tablist" aria-label="Supplies saved tabs">
    <button
      id="suppliesSavedTabSaved"
      class="supplies-saved-tab active"
      type="button"
      role="tab"
      aria-selected="true"
      data-action="setSuppliesSavedTab"
      data-arg1="saved"
    >Supplies Saved</button>
    <button
      id="suppliesSavedTabRis"
      class="supplies-saved-tab"
      type="button"
      role="tab"
      aria-selected="false"
      data-action="setSuppliesSavedTab"
      data-arg1="ris"
    >Manage RIS</button>
  </div>

  <div id="suppliesSavedPane" class="supplies-saved-pane active">
    <div class="records-table-wrap">
      <table class="ics-table ics-records-table supplies-records-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Stock No.</th>
            <th>Date</th>
            <th>Reported Period</th>
            <th>Item</th>
            <th>Unit</th>
            <th>Price</th>
            <th>Receipt (QTY)</th>
            <th>Balance (QTY)</th>
            <th>Latest Issued Office</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="suppliesRecordsBody"></tbody>
      </table>
    </div>
  </div>

  <div id="suppliesRISPane" class="supplies-saved-pane">
    <div class="records-table-wrap">
      <table class="ics-table supplies-ris-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Requested by</th>
            <th>Stock Number</th>
            <th>Description (Item + Description) Issued</th>
            <th>Remarks</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody id="suppliesRISBody"></tbody>
      </table>
    </div>
  </div>
</div>

</div>`;
}

function renderDashboardView(){
  const canEdit = hasRoleCapability('edit_records');
  const canImport = hasRoleCapability('import_data');
  const canExport = hasRoleCapability('export_data');
  const dashboardMode = typeof getDashboardViewMode === 'function' ? getDashboardViewMode() : 'guided';
  const isCompactMode = dashboardMode === 'compact';
  const schoolName = ((schoolIdentity?.schoolName || 'Your School').toString().trim() || 'Your School');
  const parseArray = (key) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const totalIcsParRecords = parseArray('icsRecords').length + parseArray('parRecords').length;
  const totalSupplies = parseArray('icsSuppliesRecords').length;
  const hasWorkspaceData = (totalIcsParRecords + totalSupplies) > 0;
  const onboardingLead = hasWorkspaceData
    ? 'Here are 3 quick actions you can run anytime:'
    : 'It looks empty right now. Here are 3 ways to get started:';
  const onboardingPrimaryLabel = hasWorkspaceData ? 'Add New Supplies' : 'Create First Supply';
  const kpiIcon = (name) => `<span class="dash-kpi-ico"><i data-lucide="${name}" aria-hidden="true"></i></span>`;
  const actionIcon = (name) => `<span class="ico" aria-hidden="true"><i data-lucide="${name}" aria-hidden="true"></i></span>`;

  const kpiGrid = hasWorkspaceData ? `
  <div class="dash-overview-kpis">
    <div class="dash-overview-kpi base is-clickable" data-action="goToView" data-arg1="Manage Inventory" tabindex="0" role="button" aria-label="Open Manage Inventory">
      ${kpiIcon('layout-dashboard')}
      <div class="k">Total ICS Records</div>
      <div class="v" id="dashKpiRecords">0</div>
      <div class="s" id="dashKpiRecordsSub">All finalized entries</div>
      <div class="dash-kpi-trend-row">
        <div class="dash-kpi-trend is-neutral is-flat" id="dashKpiRecordsTrend">No change vs previous quarter (0%)</div>
      </div>
      <div class="dash-kpi-chart-wrap"><svg class="dash-kpi-spark" id="dashKpiRecordsSpark" viewBox="0 0 160 46" aria-hidden="true"></svg></div>
      <div class="dash-kpi-foot" id="dashKpiRecordsFoot">Last 4 quarters</div>
    </div>
    <div class="dash-overview-kpi supplies is-clickable" data-action="goToView" data-arg1="Supplies" tabindex="0" role="button" aria-label="Open Supplies view">
      ${kpiIcon('boxes')}
      <div class="k">Total Supplies</div>
      <div class="v" id="dashKpiSupplies">0</div>
      <div class="s" id="dashKpiSuppliesSub">Saved supply stock records</div>
      <div class="dash-kpi-trend-row">
        <div class="dash-kpi-trend is-neutral is-flat" id="dashKpiSuppliesTrend">No change vs previous quarter (0%)</div>
      </div>
      <div class="dash-kpi-chart-wrap"><svg class="dash-kpi-spark" id="dashKpiSuppliesSpark" viewBox="0 0 160 46" aria-hidden="true"></svg></div>
      <div class="dash-kpi-foot" id="dashKpiSuppliesFoot">Last 4 quarters</div>
    </div>
    <div class="dash-overview-kpi low-stock is-clickable" data-action="goToView" data-arg1="Supplies" tabindex="0" role="button" aria-label="Open Supplies low stock details">
      ${kpiIcon('triangle-alert')}
      <div class="k">Low Stock Supplies</div>
      <div class="v" id="dashKpiLowStock">0</div>
      <div class="s" id="dashKpiLowStockSub">At/below reorder point</div>
      <div class="dash-kpi-trend-row">
        <div class="dash-kpi-trend is-neutral is-stable is-flat" id="dashKpiLowStockTrend">Stable</div>
      </div>
      <div class="dash-kpi-chart-wrap"><svg class="dash-kpi-spark" id="dashKpiLowStockSpark" viewBox="0 0 160 46" aria-hidden="true"></svg></div>
      <div class="dash-kpi-foot" id="dashKpiLowStockFoot">Risk by quarter</div>
    </div>
    <div class="dash-overview-kpi warn is-clickable" data-action="dashboardOpenActionFiltered" data-arg1="past" tabindex="0" role="button" aria-label="Open outside EUL items in Action Center">
      ${kpiIcon('alert-triangle')}
      <div class="k">Outside EUL</div>
      <div class="v" id="dashKpiOutside">0</div>
      <div class="s" id="dashKpiOutsideSub">Assets nearing end of life</div>
      <div class="dash-kpi-trend-row">
        <div class="dash-kpi-trend is-neutral is-flat" id="dashKpiOutsideTrend">No change vs previous quarter (0%)</div>
      </div>
      <div class="dash-kpi-chart-wrap"><svg class="dash-kpi-spark" id="dashKpiOutsideSpark" viewBox="0 0 160 46" aria-hidden="true"></svg></div>
      <div class="dash-kpi-foot" id="dashKpiOutsideFoot">Risk by quarter</div>
    </div>
    <div class="dash-overview-kpi asset is-clickable" data-action="goToView" data-arg1="Manage Inventory" tabindex="0" role="button" aria-label="Open asset records in Manage Inventory">
      ${kpiIcon('wallet')}
      <div class="k">Total Asset Value</div>
      <div class="v" id="dashKpiAsset">0.00</div>
      <div class="s" id="dashKpiAssetSub">Sum of record totals</div>
      <div class="dash-kpi-trend-row">
        <div class="dash-kpi-trend is-neutral is-flat" id="dashKpiAssetTrend">No change vs previous quarter (0%)</div>
      </div>
      <div class="dash-kpi-chart-wrap"><svg class="dash-kpi-spark" id="dashKpiAssetSpark" viewBox="0 0 160 46" aria-hidden="true"></svg></div>
      <div class="dash-kpi-foot" id="dashKpiAssetFoot">Last 4 quarters</div>
    </div>
  </div>
  ` : '';

  return `
${isCompactMode ? '' : renderWelcomeBanner('Dashboard')}
<section class="dash-overview ${isCompactMode ? 'is-compact' : ''}">
  ${isCompactMode ? kpiGrid : ''}
  ${isCompactMode ? '' : `<div class="dash-overview-actions-row">
    <button class="btn btn-sm btn-secondary" data-action="goToView" data-arg1="Manage Inventory"><i data-lucide="list" aria-hidden="true"></i>View Records</button>
    <button class="btn btn-sm btn-primary" data-action="dashboardNewSupply" ${canEdit ? '' : 'disabled title="Requires Encoder/Admin role"'}><i data-lucide="plus" aria-hidden="true"></i>Add New Supplies</button>
  </div>`}

  ${isCompactMode ? '' : `
  <div class="dash-onboarding-card" id="dashOnboardingCard">
    <img class="dash-onboarding-figure" src="./assets/dashboard-onboarding-illustration.png" alt="" aria-hidden="true" />
    <div class="dash-onboarding-copy">
      <h3>Welcome to your Dashboard, ${escapeHTML(schoolName)}! <span aria-hidden="true">\uD83D\uDC4B</span></h3>
      <p>${onboardingLead}</p>
      <div class="dash-onboarding-actions">
        <button class="btn btn-sm btn-primary" data-action="dashboardNewSupply" ${canEdit ? '' : 'disabled title="Requires Encoder/Admin role"'}><i data-lucide="plus" aria-hidden="true"></i>${onboardingPrimaryLabel}</button>
        <button class="btn btn-sm btn-secondary" data-action="openDataManagerModal" data-arg1="import" ${canImport ? '' : 'disabled title="Requires Encoder/Admin role"'}><i data-lucide="file-spreadsheet" aria-hidden="true"></i>Import Data from Excel</button>
        <button class="btn btn-sm btn-linklike" data-action="openHelpFromMenu"><i data-lucide="book-open" aria-hidden="true"></i>View User Guide</button>
      </div>
    </div>
  </div>
  ${kpiGrid}
  `}

  <div class="dash-overview-grid">
    <div class="dash-action-card">
      <div class="dash-action-head">${actionIcon('download')}<button class="btn btn-sm btn-secondary" data-action="openDataManagerModal" data-arg1="import" data-arg2="widget" ${canImport ? '' : 'disabled title="Requires Encoder/Admin role"'}><i data-lucide="folder-open" aria-hidden="true"></i>Open</button></div>
      <h4>Import Center</h4>
      <p>Validate JSON, review conflicts, merge or replace.</p>
    </div>
    <div class="dash-action-card">
      <div class="dash-action-head">${actionIcon('upload')}<button class="btn btn-sm btn-secondary" data-action="openDataManagerModal" data-arg1="export" ${canExport ? '' : 'disabled title="Requires Viewer/Encoder/Admin role"'}><i data-lucide="folder-open" aria-hidden="true"></i>Open</button></div>
      <h4>Export Center</h4>
      <p>Download filtered package or full workspace backup.</p>
    </div>
    <div class="dash-compliance-card">
      <div class="dash-action-head">
        <h4>Compliance Health</h4>
        <span class="dash-compliance-badge" id="dashComplianceBadge">Review</span>
      </div>
      <p class="dash-comp-status-label">Overall status <strong id="dashComplianceScore">0/100</strong></p>
      <div class="dash-comp-row">
        <div class="dash-comp-label">Within EUL</div>
        <div class="dash-comp-pct" id="dashComplianceWithinPct">0%</div>
      </div>
      <div class="dash-comp-bar"><span id="dashComplianceWithinBar" style="width:0%"></span></div>
      <div class="dash-comp-row">
        <div class="dash-comp-label">Outside EUL</div>
        <div class="dash-comp-pct" id="dashComplianceOutsidePct">0%</div>
      </div>
      <div class="dash-comp-bar danger"><span id="dashComplianceOutsideBar" style="width:0%"></span></div>
      <div class="dash-comp-row">
        <div class="dash-comp-label">Low Stock Supplies</div>
        <div class="dash-comp-pct" id="dashComplianceLowStockPct">0%</div>
      </div>
      <div class="dash-comp-bar warn"><span id="dashComplianceLowStockBar" style="width:0%"></span></div>
      <p class="dash-comp-tip" id="dashComplianceTip">Tip: Use Actions to review items nearing or past EUL.</p>
      <div class="dash-comp-actions">
        <button class="btn btn-sm btn-secondary" data-action="dashboardOpenActions"><i data-lucide="clipboard-check" aria-hidden="true"></i>Review EUL</button>
        <button class="btn btn-sm btn-secondary" data-action="goToView" data-arg1="Supplies"><i data-lucide="boxes" aria-hidden="true"></i>Review Supplies</button>
      </div>
    </div>
    <div class="dash-action-card">
      <div class="dash-action-head">${actionIcon('shield')}<button class="btn btn-sm btn-secondary" data-action="dashboardOpenActions"><i data-lucide="clipboard-check" aria-hidden="true"></i>Review</button></div>
      <h4>Action Center</h4>
      <p>Inspect risks, EUL alerts, and pending maintenance tasks.</p>
    </div>
    <div class="dash-action-card">
      <div class="dash-action-head">${actionIcon('archive')}<button class="btn btn-sm btn-secondary" data-action="dashboardOpenArchives"><i data-lucide="folder-search" aria-hidden="true"></i>Browse</button></div>
      <h4>Archives</h4>
      <p>Browse archived items and export history trails.</p>
    </div>
  </div>
</section>

<section class="dash-recent-wrap">
  <div class="dash-recent-head">
    <h3>Recent Supplies, ICS, PAR Added</h3>
    <button class="btn btn-sm btn-secondary" data-action="goToView" data-arg1="Supplies"><i data-lucide="list" aria-hidden="true"></i>Open list</button>
  </div>
  <div class="dash-recent-cards" id="dashRecentIcsRows"></div>
</section>

<section class="dash-notes-wrap">
  <h3>Today's Notes</h3>
  <div class="dash-notes-grid">
    <article class="dash-note-card">
      <div class="dash-note-card-head">
        <span class="dash-note-ico" aria-hidden="true"><i data-lucide="clock" aria-hidden="true"></i></span>
        <strong>Last sync</strong>
      </div>
      <p id="dashNoteSync">Local workspace state is current.</p>
    </article>
    <article class="dash-note-card">
      <div class="dash-note-card-head">
        <span class="dash-note-ico" aria-hidden="true"><i data-lucide="shield-check" aria-hidden="true"></i></span>
        <strong>Integrity</strong>
      </div>
      <p id="dashNoteIntegrity">Audit trail and traceability are ready for reporting.</p>
    </article>
    <article class="dash-note-card">
      <div class="dash-note-card-head">
        <span class="dash-note-ico" aria-hidden="true"><i data-lucide="alert-triangle" aria-hidden="true"></i></span>
        <strong>Reminders</strong>
      </div>
      <p id="dashNoteReminders">Outside-EUL items are ready for Action Center review.</p>
    </article>
  </div>
</section>

<div class="dash-empty" id="dashEmptyHint" style="display:none">
  <strong>Start your workspace:</strong> No Supplies/ICS/PAR records found yet. Use <code>Import JSON</code> or <code>Add New Supplies</code> to begin.
</div>`;
}



