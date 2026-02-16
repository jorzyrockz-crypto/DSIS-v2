function renderInventoryView(){
  const canEditRecords = hasRoleCapability('edit_records');
  const filterInfo = inventoryFilter === 'missing'
    ? `<span class="risk-badge warn">Filtered: Missing Data</span> <button class="btn btn-sm btn-secondary" data-action="clearInventoryFilter"><i data-lucide="x" aria-hidden="true"></i>Clear Filter</button>`
    : '';
  const actionButtons = [
    `<button class="btn btn-sm btn-primary" data-action="finalizeICS" ${canEditRecords ? '' : 'disabled title="Requires Encoder/Admin role"'}><i data-lucide="check-circle-2" aria-hidden="true"></i>Finalize ICS Data</button>`
  ].join('');
  return `
${renderWelcomeBanner('Manage Inventory')}

<div class="ics-card staged">
  <div class="ics-card-head">
    <span class="card-title">Staged Items <span class="card-badge staged">DRAFT</span></span>
    <span class="stage-context" id="stageContext">Working ICS: none</span>
  </div>
  <p class="card-subtext">Draft workspace for item encoding before finalization.</p>

  <div class="stage-table-wrap">
    <table class="ics-table">
      <thead>
        <tr>
          <th>#</th><th>Description</th><th>Item No.</th><th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Total</th><th>EUL</th><th>Actions</th>
        </tr>
      </thead>
      <tbody id="icsBody"></tbody>
    </table>
  </div>

  <div class="ics-card-actions">
    ${actionButtons}
  </div>
</div>

<div class="ics-card records">
  <div class="ics-card-head"><span class="card-title">ICS Records <span class="card-badge records">SAVED</span></span></div>
  <p class="card-subtext">Finalized ICS entries are listed here for tracking, review, and edits. ${filterInfo}</p>

  <div class="records-table-wrap">
    <table class="ics-table ics-records-table">
      <colgroup>
        <col class="c-idx">
        <col class="c-ics">
        <col class="c-status">
        <col class="c-entity">
        <col class="c-issued">
        <col class="c-accountable">
        <col class="c-eul">
        <col class="c-items">
        <col class="c-total">
        <col class="c-actions">
      </colgroup>
      <thead>
        <tr>
          <th>#</th><th>ICS No.</th><th>Status</th><th>Entity</th><th>Issued Date</th><th>Accountable Person</th><th>EUL Status</th><th>Total Items</th><th>Total Value</th><th>Actions</th>
        </tr>
      </thead>
      <tbody id="icsRecords"></tbody>
    </table>
  </div>
</div>`;
}
