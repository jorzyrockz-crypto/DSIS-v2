function renderArchivesView(){
  const canArchive = hasRoleCapability('archive_items');
  const scope = archivesFilterIcs ? ` <span class="risk-badge ok">ICS: ${escapeHTML(archivesFilterIcs)}</span> <button class="btn btn-sm btn-secondary" data-action="clearArchivesFilter">Clear ICS Filter</button>` : '';
  const batchBtn = `<button class="btn btn-sm btn-primary" data-action="openBatchWasteReportBuilderArchived" ${canArchive ? '' : 'disabled title="Requires Encoder/Admin role"'}><i data-lucide="printer" aria-hidden="true"></i>Batch Print WMR</button>`;
  return `
${renderWelcomeBanner('Archives')}
<div class="ics-card staged wmr-archive-panel show" id="wasteReportOverlay">
  <div class="ics-card-head">
    <span class="card-title">Waste Materials Report <span class="card-badge staged">DRAFT</span></span>
    <span class="stage-context">Archives Workspace</span>
  </div>
  <p class="card-subtext">Complete required WMR fields, then save or print.</p>

  <div class="wmr-grid">
    <div>
      <label>Place of Storage</label>
      <input id="wmrPlaceOfStorage" class="stage-input" list="wmrPlaceOfStorageList" placeholder="e.g., Property Storage Room" />
    </div>
    <div>
      <label>Archive Approval Status</label>
      <select id="wmrArchiveApprovalStatus" class="stage-input">
        <option value="">Select status</option>
        <option value="approved">Approved for disposal</option>
        <option value="not_approved">Not approved for disposal</option>
      </select>
    </div>
  </div>
  <datalist id="wmrPlaceOfStorageList"></datalist>

  <div class="stage-table-wrap" style="margin-top:10px">
    <table class="ics-table wmr-items-table">
      <thead>
        <tr>
          <th>#</th>
          <th>ICS No.</th>
          <th>Item No.</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Disposition</th>
          <th>Transfer To</th>
          <th>OR No.</th>
          <th>OR Date</th>
          <th>OR Amount</th>
        </tr>
      </thead>
      <tbody id="wmrItemsBody">
        <tr class="wmr-empty-row">
          <td>1</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="wmr-sale-note">Each selected item can have its own disposition. Sales fields are required only for sale dispositions.</div>

  <div class="wmr-signatories-divider" aria-hidden="true"></div>
  <div class="wmr-grid wmr-signatories-grid">
    <div>
      <label>Certified Correct</label>
      <input id="wmrCertifiedCorrect" class="stage-input" list="wmrCertifiedCorrectList" placeholder="Property Custodian name" />
    </div>
    <div>
      <label>Disposal Approved</label>
      <input id="wmrDisposalApproved" class="stage-input" list="wmrDisposalApprovedList" placeholder="Approving officer name" />
    </div>
    <div>
      <label>Inspection Officer</label>
      <input id="wmrInspectionOfficer" class="stage-input" list="wmrInspectionOfficerList" placeholder="Inspection officer name" />
    </div>
    <div>
      <label>Witness to Disposal</label>
      <input id="wmrWitnessToDisposal" class="stage-input" list="wmrWitnessToDisposalList" placeholder="Witness name" />
    </div>
  </div>
  <datalist id="wmrCertifiedCorrectList"></datalist>
  <datalist id="wmrDisposalApprovedList"></datalist>
  <datalist id="wmrInspectionOfficerList"></datalist>
  <datalist id="wmrWitnessToDisposalList"></datalist>
  <datalist id="wmrBatchItemSuggestList"></datalist>

  <div class="ics-card-actions">
    <button class="btn btn-sm btn-secondary" data-action="saveWasteReportMetadata" data-arg1="false"><i data-lucide="save"></i>Save</button>
    <button id="wmrPrintBatchBuilderBtn" class="btn btn-sm btn-primary" data-action="printWasteReportBuilderSelection" style="display:none"><i data-lucide="printer" aria-hidden="true"></i>Print</button>
    <button id="wmrCancelBatchBuilderBtn" class="btn btn-sm btn-secondary" data-action="exitWmrBatchBuilderMode" style="display:none">Cancel</button>
  </div>
</div>

<div class="ics-card records">
  <div class="ics-card-head"><span class="card-title">Archived Disposal Items <span class="card-badge records">ARCHIVE</span></span><span>${batchBtn}</span></div>
  <p class="card-subtext">Items archived from Action Center with disposal approval metadata.${scope}</p>
  <div class="records-table-wrap">
    <table class="ics-table archives-main-table">
      <colgroup>
        <col style="width:3%">
        <col style="width:10%">
        <col style="width:13%">
        <col style="width:16%">
        <col style="width:13%">
        <col style="width:7%">
        <col style="width:10%">
        <col style="width:10%">
        <col style="width:10%">
        <col style="width:8%">
      </colgroup>
      <thead>
        <tr>
          <th>#</th><th>Archived At</th><th>ICS No.</th><th>Description</th><th>Item No.</th><th style="text-align:center">EUL</th><th style="text-align:center">Approval</th><th>Approved By</th><th>Remarks</th><th style="text-align:center">Actions</th>
        </tr>
      </thead>
      <tbody id="archiveBody"></tbody>
    </table>
  </div>
</div>`;
}
