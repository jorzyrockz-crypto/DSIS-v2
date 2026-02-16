function renderActionsView(){
  const filterLabel = actionCenterFilter === 'near' ? 'Due < 3m only' : (actionCenterFilter === 'past' ? 'Past EUL only' : 'All due and past EUL items');
  const icsScope = actionCenterICSFilter ? ` <span class="risk-badge ok">ICS: ${escapeHTML(actionCenterICSFilter)}</span>` : '';
  const itemScope = actionCenterItemFilter ? ` <span class="risk-badge warn">Item: ${escapeHTML(actionCenterItemFilter)}</span>` : '';
  const clearBtn = (actionCenterICSFilter || actionCenterItemFilter) ? ` <button class="btn btn-sm btn-secondary" data-action="clearActionCenterICSFilter">Clear Target Filter</button>` : '';
  return `
${renderWelcomeBanner('Action Center')}
<div class="ics-card records">
  <div class="ics-card-head"><span class="card-title">EUL Action Center <span class="card-badge records">ACTIONS</span></span></div>
  <p class="card-subtext">Only items with status <strong>Due &lt; 3m</strong> or <strong>Past EUL</strong> are shown below. Filter: <strong>${filterLabel}</strong>.${icsScope}${itemScope}${clearBtn}</p>
  <div class="records-table-wrap actions-eul-wrap">
    <table class="ics-table actions-eul-table">
      <colgroup>
        <col style="width:3%">
        <col style="width:9%">
        <col style="width:24%">
        <col style="width:8%">
        <col style="width:11%">
        <col style="width:11%">
        <col style="width:14%">
        <col style="width:20%">
      </colgroup>
      <thead>
        <tr>
          <th>#</th><th>ICS No.</th><th>Description</th><th style="text-align:center">EUL (Days)</th><th style="text-align:center">EUL Status</th><th style="text-align:center">Inspection</th><th>Remarks</th><th style="text-align:center">Actions</th>
        </tr>
      </thead>
      <tbody id="eulBody"></tbody>
    </table>
  </div>
</div>

<div class="actions-modal-overlay" id="inspectionOverlay">
  <div class="actions-modal modal-sm">
    <div class="modal-head">
      <h3>Inspection Result - Unserviceable</h3>
      <p class="modal-sub">Record situation details before proceeding to archive or report actions.</p>
    </div>
    <div class="modal-body">
    <div class="form-col modal-form">
      <label>Situation</label>
      <select id="inspReason" class="stage-input">
        <option value="">Select Situation</option>
        <option>1. Worn-Out (Normal Wear and Tear)</option>
        <option>2. Beyond Economical Repair</option>
        <option>3. Obsolete</option>
        <option>4. Damaged Due to Calamity / Fortuitous Event</option>
        <option>5. Lost / Damaged Due to Negligence</option>
        <option>6. Condemned / Junk / Valueless</option>
      </select>
      <label>Date</label>
      <input id="inspDate" type="date" class="stage-input" />
      <label>Remarks</label>
      <select id="inspRemarks" class="stage-input">
        <option value="">Select situation first</option>
      </select>
      <label>Notes</label>
      <textarea id="inspNotes" class="stage-input" rows="3" placeholder="Additional notes (optional)"></textarea>
      <div id="inspSituationNote" class="modal-sub" style="margin-top:6px; white-space:pre-line;"></div>
    </div>
    </div>
    <div class="modal-foot">
    <div class="ics-card-actions">
      <button class="btn btn-sm btn-secondary" data-action="closeInspectionModal">Cancel</button>
      <button id="inspSaveBtn" class="btn btn-sm btn-primary" data-action="saveInspection" disabled>Save</button>
    </div>
    </div>
  </div>
</div>

<div class="actions-modal-overlay" id="inspectionHistoryOverlay">
  <div class="actions-modal modal-lg inspection-history-modal">
    <div class="modal-head inspection-history-head">
      <h3 class="inspection-history-title">Inspection History</h3>
      <button class="inspection-history-close" data-action="closeInspectionHistory">Close</button>
    </div>
    <div class="modal-body" id="inspectionHistoryBody"></div>
  </div>
</div>

<div class="actions-modal-overlay" id="archiveOverlay">
  <div class="actions-modal modal-md">
    <div class="modal-head">
      <h3>Archive Item for Disposal</h3>
      <p class="modal-sub">Confirm disposal approval details before moving this item to Archives.</p>
    </div>
    <div class="modal-body">
    <div class="form-col modal-form">
      <label>Approval Status</label>
      <select id="archiveApprovalStatus" class="stage-input">
        <option value="">Select status</option>
        <option value="approved">Approved for disposal</option>
        <option value="not_approved">Not approved for disposal</option>
      </select>
      <label>Approved By</label>
      <input id="archiveApprovedBy" class="stage-input" placeholder="Approver name" />
      <label>Approval Date</label>
      <input id="archiveApprovedDate" type="date" class="stage-input" />
      <label>Reference No. (Optional)</label>
      <input id="archiveReferenceNo" class="stage-input" placeholder="Memo / approval ref no." />
      <label>Remarks</label>
      <textarea id="archiveRemarks" class="stage-input" rows="3" placeholder="Additional notes"></textarea>
    </div>
    </div>
    <div class="modal-foot">
    <div class="ics-card-actions">
      <button class="btn btn-sm btn-secondary" data-action="closeArchiveModal">Cancel</button>
      <button class="btn btn-sm btn-primary" data-action="confirmArchiveItem">Archive Item</button>
    </div>
    </div>
  </div>
</div>`;
}
