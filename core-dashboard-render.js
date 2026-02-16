function renderDashboardView(){
  const canEdit = hasRoleCapability('edit_records');
  const canImport = hasRoleCapability('import_data');
  const canExport = hasRoleCapability('export_data');
  const kpiIcon = (name) => `<span class="dash-kpi-ico"><i data-lucide="${name}" aria-hidden="true"></i></span>`;
  const actionIcon = (name) => `<span class="ico" aria-hidden="true"><i data-lucide="${name}" aria-hidden="true"></i></span>`;

  return `
${renderWelcomeBanner('Dashboard')}

<section class="dash-overview">
  <div class="dash-overview-actions-row">
    <button class="btn btn-sm btn-secondary" data-action="goToView" data-arg1="Manage Inventory"><i data-lucide="list" aria-hidden="true"></i>View Records</button>
    <button class="btn btn-sm btn-primary" data-action="dashboardNewICS" ${canEdit ? '' : 'disabled title="Requires Encoder/Admin role"'}><i data-lucide="plus" aria-hidden="true"></i>Create New ICS</button>
  </div>

  <div class="dash-overview-kpis">
    <div class="dash-overview-kpi base">
      ${kpiIcon('layout-dashboard')}
      <div class="k">Total ICS Records</div>
      <div class="v" id="dashKpiRecords">0</div>
      <div class="s">All finalized entries</div>
    </div>
    <div class="dash-overview-kpi good">
      ${kpiIcon('check-circle')}
      <div class="k">Within EUL</div>
      <div class="v" id="dashKpiWithin">0</div>
      <div class="s">Low risk</div>
    </div>
    <div class="dash-overview-kpi warn">
      ${kpiIcon('alert-triangle')}
      <div class="k">Outside EUL</div>
      <div class="v" id="dashKpiOutside">0</div>
      <div class="s">Needs inspection</div>
    </div>
    <div class="dash-overview-kpi asset">
      ${kpiIcon('wallet')}
      <div class="k">Total Asset Value</div>
      <div class="v" id="dashKpiAsset">0.00</div>
      <div class="s">Sum of record totals</div>
    </div>
  </div>

  <div class="dash-overview-grid">
    <div class="dash-action-card">
      <div class="dash-action-head">${actionIcon('download')}<button class="btn btn-sm btn-secondary" data-action="openDataManagerModal" data-arg1="import" ${canImport ? '' : 'disabled title="Requires Encoder/Admin role"'}><i data-lucide="folder-open" aria-hidden="true"></i>Open</button></div>
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
      <p class="dash-comp-status-label">Overall status</p>
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
      <p class="dash-comp-tip">Tip: Use Actions to review items nearing or past EUL.</p>
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
    <h3>Recent ICS Activity</h3>
    <button class="btn btn-sm btn-secondary" data-action="goToView" data-arg1="Manage Inventory"><i data-lucide="list" aria-hidden="true"></i>Open list</button>
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
  <strong>Start your workspace:</strong> No ICS records found yet. Use <code>Import JSON</code> or <code>New ICS</code> to begin.
</div>`;
}



