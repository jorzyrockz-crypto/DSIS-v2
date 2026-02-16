function exportICS(i){
  if (!requireAccess('export_data', { label: 'export ICS record data' })) return;
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const r = records[i];
  if (!r) return;
  const safe = (v) => (v || '').toString().trim().replace(/[^\w.-]+/g, '_');
  const fileName = `${safe(r.entity)}+${safe(r.icsNo)}+${safe(r.issuedDate)}.json`;
  const record = ensureRecordTraceProfileKeysForExport([r])[0] || r;
  const payload = JSON.stringify({
    ...record,
    exportedAt: new Date().toISOString(),
    exportedByProfileKey: getCurrentActorProfileKey(),
    schemaVersion: ICS_SCHEMA_VERSION
  }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  recordAudit('backup', `Exported single ICS record ${r.icsNo || ''} (${fileName})`);
  notify('success', `Exported ${fileName}`);
}

function printICS(i){
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const rec = records[i];
  if (!rec) return;

  const issuedBy = rec.signatories?.issuedBy || rec.issuedBy || {};
  const receivedBy = rec.signatories?.receivedBy || rec.receivedBy || {};
  const items = rec.items || [];
  const minRows = 20;
  const totalRows = Math.max(items.length, minRows);

  const itemRows = Array.from({ length: totalRows }, (_, idx) => {
    const it = items[idx];
    if (!it) {
      return `<tr>
        <td class="center"></td><td class="center"></td><td class="right"></td><td class="right"></td><td></td><td class="center"></td><td class="center"></td>
      </tr>`;
    }
    const qtyText = (it.qtyText || it.qty || '').toString();
    const unitCost = formatCurrencyValue(parseCurrencyValue(it.unitCost));
    const total = formatCurrencyValue(parseCurrencyValue(it.total));
    return `<tr>
      <td class="center">${qtyText}</td>
      <td class="center">${it.unit || ''}</td>
      <td class="right">${unitCost}</td>
      <td class="right">${total}</td>
      <td>${it.desc || ''}</td>
      <td class="center">${it.itemNo || ''}</td>
      <td class="center">${it.eul ?? ''}</td>
    </tr>`;
  }).join('');

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
<!DOCTYPE html>
<html>
<head>
  <title>ICS Print</title>
  <style>
    body { font-family: Arial, sans-serif; font-size:12px; }
    .center { text-align:center; }
    .right { text-align:right; }
    table { width:100%; border-collapse:collapse; table-layout:fixed; }
    th, td { border:1px solid #000; padding:4px; }
    .w-qty{width:8%}
    .w-unit{width:8%}
    .w-amt{width:12%}
    .w-desc{width:34%}
    .w-item{width:18%}
    .w-eul{width:10%}
    th{
      overflow-wrap:anywhere;
      word-break:break-word;
    }
    .th-eul{
      font-size:11px;
      line-height:1.05;
      letter-spacing:-0.1px;
    }
    tbody tr { height:28px; }
    td { vertical-align:middle; line-height:1.2; }
    .no-border td { border:none; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
<div class="center" style="line-height:1.15">
  <div>Republic of the Philippines</div>
  <div><strong>Department of Education</strong></div>
  <div>Region VI - Western Visayas</div>
  <div><strong>DIVISION OF AKLAN</strong></div>
  <div>Kalibo, Aklan</div>
</div>

<div class="center" style="margin-top:10px; font-weight:bold;">
  INVENTORY CUSTODIAN SLIP
</div>

<br>

<table class="no-border" style="margin-top:14px;">
  <tr>
    <td style="width:65%;">
      <strong>Entity Name:</strong>
      <span style="border-bottom:1px solid #000; min-width:260px; display:inline-block;">
        ${rec.entity || ''}
      </span>
    </td>
    <td class="right" style="width:35%;">
      <strong>ICS No.:</strong>
      <span style="border-bottom:1px solid #000; min-width:140px; display:inline-block;">
        ${rec.icsNo || ''}
      </span>
    </td>
  </tr>
  <tr>
    <td>
      <strong>Fund Cluster:</strong>
      <span style="border-bottom:1px solid #000; min-width:120px; display:inline-block;">
        ${rec.fund || ''}
      </span>
    </td>
    <td></td>
  </tr>
</table>

<br>

<table>
  <colgroup>
    <col class="w-qty">
    <col class="w-unit">
    <col class="w-amt">
    <col class="w-amt">
    <col class="w-desc">
    <col class="w-item">
    <col class="w-eul">
  </colgroup>
  <thead>
    <tr>
      <th rowspan="2">Qty</th>
      <th rowspan="2">Unit</th>
      <th colspan="2">Amount</th>
      <th rowspan="2">Description</th>
      <th rowspan="2">Inventory Item No.</th>
      <th rowspan="2" class="th-eul">Estimated<br>Usefull Life</th>
    </tr>
    <tr>
      <th>Unit Cost</th>
      <th>Total Cost</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows}
  </tbody>
</table>

<table style="width:100%;">
  <tr>
    <td><strong>Received from:</strong></td>
    <td><strong>Received by:</strong></td>
  </tr>
  <tr>
    <td class="center" style="height:55px; vertical-align:bottom;">
      <strong>${issuedBy.name || ''}</strong><br>
      <span style="font-size:10px;">Signature Over Printed Name</span>
    </td>
    <td class="center" style="vertical-align:bottom;">
      <strong>${receivedBy.name || ''}</strong><br>
      <span style="font-size:10px;">Signature Over Printed Name</span>
    </td>
  </tr>
  <tr>
    <td class="center">
      <strong>${issuedBy.position || issuedBy.designation || ''}</strong><br>
      <span style="font-size:10px;">Position/Office</span>
    </td>
    <td class="center">
      <strong>${receivedBy.position || receivedBy.designation || ''}</strong><br>
      <span style="font-size:10px;">Position/Office</span>
    </td>
  </tr>
  <tr>
    <td class="center">
      <strong>${issuedBy.date || ''}</strong><br>
      <span style="font-size:10px;">Date</span>
    </td>
    <td class="center">
      <strong>${receivedBy.date || ''}</strong><br>
      <span style="font-size:10px;">Date</span>
    </td>
  </tr>
</table>
</body>
</html>`);
  doc.close();
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }, 1000);
}

function printWasteMaterialsReport(icsNo, itemNo){
  if (!requireAccess('archive_items', { label: 'print Waste Materials Report' })) return;
  printWasteMaterialsReportBatch(icsNo, [itemNo]);
}

function printWasteMaterialsReportMulti(targets){
  if (!requireAccess('archive_items', { label: 'print batch Waste Materials Report' })) return;
  const invalid = (targets || []).filter((t) => !hasDisposalSituation(t?.icsNo, t?.itemNo));
  if (invalid.length){
    const preview = invalid.slice(0, 4).map((x) => `${x?.icsNo || ''}/${x?.itemNo || ''}`).join(', ');
    notify('error', `Batch PRINT WMR only allows items with Situation "Item for disposal". Invalid: ${preview}${invalid.length > 4 ? ' ...' : ''}`);
    return;
  }
  const grouped = {};
  (targets || []).forEach((t) => {
    const key = (t?.icsNo || '').toString();
    const itemNo = (t?.itemNo || '').toString();
    if (!key || !itemNo) return;
    grouped[key] = grouped[key] || [];
    if (!grouped[key].includes(itemNo)) grouped[key].push(itemNo);
  });
  const icsList = Object.keys(grouped);
  if (!icsList.length){
    notify('error', 'No valid batch Waste Materials targets to print.');
    return;
  }
  if (icsList.length === 1){
    printWasteMaterialsReportBatch(icsList[0], grouped[icsList[0]]);
    return;
  }
  notify('info', `Batch printing WMR for ${icsList.length} ICS groups.`);
  let idx = 0;
  const runNext = () => {
    if (idx >= icsList.length) return;
    const icsNo = icsList[idx];
    printWasteMaterialsReportBatch(icsNo, grouped[icsNo]);
    idx += 1;
    if (idx < icsList.length) setTimeout(runNext, 700);
  };
  runNext();
}

function printWasteMaterialsReportForICS(icsNo){
  if (!requireAccess('archive_items', { label: 'print Waste Materials Report' })) return;
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const rec = records.find((r) => (r.icsNo || '') === (icsNo || ''));
  if (!rec){
    notify('error', `ICS ${icsNo || ''} not found.`);
    return;
  }
  const itemNos = (rec.items || []).filter((it) => it?.wasteReport?.preparedAt).map((it) => it.itemNo || '').filter(Boolean);
  if (!itemNos.length){
    notify('error', 'No Waste Materials Report metadata found for this ICS.');
    return;
  }
  printWasteMaterialsReportBatch(icsNo, itemNos);
}

function printWasteMaterialsReportArchived(index){
  if (!requireAccess('archive_items', { label: 'print archived Waste Materials Report' })) return;
  const archived = getArchivedItems();
  const entry = archived[index];
  if (!entry){
    notify('error', 'Archived item not found.');
    return;
  }
  const item = entry.item || {};
  if (!item?.wasteReport?.preparedAt){
    notify('error', 'No prepared Waste Materials metadata found for this archived item.');
    return;
  }
  const record = {
    icsNo: entry?.source?.icsNo || '',
    entity: entry?.source?.entity || '',
    items: [item]
  };
  printWasteMaterialsReportPrepared(record, [item]);
}

function printBatchWasteMaterialsReportArchived(){
  if (!requireAccess('archive_items', { label: 'print archived batch Waste Materials Report' })) return;
  const allArchived = getArchivedItems();
  const scoped = allArchived.filter((a) => {
    if (!archivesFilterIcs) return true;
    return normalizeICSKey(a?.source?.icsNo || '') === normalizeICSKey(archivesFilterIcs);
  });
  if (!scoped.length){
    notify('error', 'No archived items available in current scope.');
    return;
  }
  const targets = scoped
    .map((entry) => allArchived.findIndex((x) => x === entry))
    .filter((idx) => idx >= 0)
    .filter((idx) => !!allArchived[idx]?.item?.wasteReport?.preparedAt);
  if (!targets.length){
    notify('error', 'No archived items with prepared Waste Materials metadata in current scope.');
    return;
  }
  notify('info', `Batch printing WMR for ${targets.length} archived item(s).`);
  let pos = 0;
  const runNext = () => {
    if (pos >= targets.length) return;
    printWasteMaterialsReportArchived(targets[pos]);
    pos += 1;
    if (pos < targets.length) setTimeout(runNext, 700);
  };
  runNext();
}

function printWasteMaterialsReportBatch(icsNo, itemNos){
  if (!requireAccess('archive_items', { label: 'print Waste Materials Report' })) return;
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const record = records.find((r) => (r.icsNo || '') === (icsNo || ''));
  if (!record){
    notify('error', `Waste Materials Report source not found for ICS ${icsNo || ''}.`);
    return;
  }
  const selectedSet = new Set((itemNos || []).map((x) => (x || '').toString()));
  const selectedItems = (record.items || []).filter((it) => selectedSet.has((it.itemNo || '').toString()));
  if (!selectedItems.length){
    notify('error', 'No valid selected items for batch Waste Materials print.');
    return;
  }
  if ((itemNos || []).length > 1){
    const invalid = selectedItems.filter((it) => !hasDisposalSituation(icsNo, it.itemNo || ''));
    if (invalid.length){
      const preview = invalid.slice(0, 4).map((it) => `${icsNo}/${it.itemNo || ''}`).join(', ');
      notify('error', `Batch PRINT WMR only allows items with Situation "Item for disposal". Invalid: ${preview}${invalid.length > 4 ? ' ...' : ''}`);
      return;
    }
  }
  const prepared = selectedItems.filter((it) => it?.wasteReport?.preparedAt);
  if (!prepared.length){
    notify('error', 'Selected items have no prepared Waste Materials metadata.');
    return;
  }
  printWasteMaterialsReportPrepared(record, prepared);
}

function printWasteMaterialsReportPrepared(record, preparedItems){
  const prepared = Array.isArray(preparedItems) ? preparedItems : [];
  if (!record || !prepared.length){
    notify('error', 'Unable to print Waste Materials Report. Missing print source.');
    return;
  }
  const base = prepared[0].wasteReport || {};
  const lines = prepared.map((it, idx) => {
    const wr = it.wasteReport || {};
    const saleMode = !!wr.hasSale || isSaleDisposition(wr.disposition);
    const itemAmount = formatCurrencyValue(parseCurrencyValue(it.total)) || '0.00';
    const amount = saleMode ? (wr.officialReceiptAmount || itemAmount) : '';
    return {
      idx: idx + 1,
      qty: (it.qtyText || it.qty || '').toString(),
      unit: it.unit || '',
      desc: it.desc || '',
      orNo: saleMode ? (wr.officialReceiptNo || '') : '',
      orDate: saleMode ? (wr.officialReceiptDate || '') : '',
      amount,
      itemNo: wr.dispositionItemNo || it.itemNo || '',
      disposition: wr.disposition || '',
      transferTo: wr.transferTo || ''
    };
  });

  const byDisp = {
    destroyed: [],
    private_sale: [],
    public_auction: [],
    transferred: []
  };
  const transferredTo = [];
  let totalSales = 0;
  lines.forEach((l) => {
    if (byDisp[l.disposition]) byDisp[l.disposition].push(l.itemNo);
    if (l.disposition === 'transferred' && l.transferTo) transferredTo.push(l.transferTo);
    const amt = parseCurrencyValue(l.amount);
    if (Number.isFinite(amt)) totalSales += amt;
  });
  const totalAmountDisplay = totalSales > 0 ? formatCurrencyValue(totalSales) : '';
  const line = (arr) => arr.filter(Boolean).join(', ');
  const lineDestroyed = line(byDisp.destroyed);
  const linePrivate = line(byDisp.private_sale);
  const linePublic = line(byDisp.public_auction);
  const lineTransferred = line(byDisp.transferred);
  const transferToText = transferredTo.length ? transferredTo.join(', ') : '';

  const dataRows = lines.map((l) => `<tr class="h-row"><td class="center">${l.idx}</td><td class="center">${escapeHTML(l.qty)}</td><td class="center">${escapeHTML(l.unit)}</td><td>${escapeHTML(l.desc)}</td><td>${escapeHTML(l.orNo)}</td><td>${escapeHTML(l.orDate)}</td><td class="right">${escapeHTML(l.amount)}</td></tr>`);
  while (dataRows.length < 12){
    dataRows.push('<tr class="h-row"><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>');
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <title>Waste Materials Report</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body{font-family:Arial,sans-serif;font-size:12px;margin:12}
    .report-container{padding:0}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #000;padding:4px;vertical-align:middle}
    .nob td{border:none;padding:1px 0}
    .center{text-align:center}.right{text-align:right}.italic{font-style:italic}
    .xs{font-size:10px}.upper{text-transform:uppercase}.h-row{height:22px}
    .sig-block{height:80px;vertical-align:bottom;text-align:center}.sig-title{height:22px;vertical-align:top}
    .line-text{display:inline-block;min-width:280px;border-bottom:1px solid #000;min-height:14px}
    .items-label{font-size:12px;font-weight:700;text-transform:uppercase;margin:2px 0}
    .coi-wrap{max-width:520px;margin:0 auto;padding:4px 6px}
    .coi-head{font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:.5px}
    .coi-sub{text-align:center;margin:2px 0 8px}
    .coi-row{display:flex;align-items:flex-end;gap:8px;margin:2px 0}
    .coi-lbl{width:68px}.coi-line{flex:1;border-bottom:1px solid #000;min-height:14px}.coi-act{width:210px}
  </style>
</head>
<body>
  <div class="report-container">
<body>
<div class="center" style="line-height:1.15">
  <div>Republic of the Philippines</div>
  <div><strong>Department of Education</strong></div>
  <div>Region VI - Western Visayas</div>
  <div><strong>DIVISION OF AKLAN</strong></div>
  <div>Kalibo, Aklan</div>
</div>
    <h2 class="center upper" style="margin:4px 0 10px;letter-spacing:1px">Waste Materials Report</h2>
    <table class="nob" style="margin-bottom:4px">
      <tr><td><span>Entity Name:</span> <span class="line-text">${escapeHTML(record.entity || '')}</span></td></tr>
      <tr><td><span>Place of Storage:</span> <span class="line-text">${escapeHTML(base.placeOfStorage || '')}</span></td></tr>
    </table>
    <div class="items-label">Items for Disposal</div>
    <table>
      <thead>
        <tr><th rowspan="2" style="width:8%" class="center upper">Items</th><th rowspan="2" style="width:9%" class="center upper">Quantity</th><th rowspan="2" style="width:9%" class="center upper">Unit</th><th rowspan="2" class="center upper">Description</th><th colspan="3" class="center upper">Record of Sales</th></tr>
        <tr><th colspan="3" class="center upper xs">Official Receipt</th></tr>
        <tr><th colspan="4"></th><th style="width:12%" class="center upper xs">No.</th><th style="width:14%" class="center upper xs">Date</th><th style="width:14%" class="center upper xs">Amount</th></tr>
      </thead>
      <tbody>
        ${dataRows.join('')}
        <tr class="h-row"><td colspan="4" class="right upper"><strong>Total</strong></td><td></td><td></td><td class="right"><strong>${escapeHTML(totalAmountDisplay)}</strong></td></tr>
      </tbody>
    </table>
    <table style="border-top:none">
      <tr><td class="sig-title italic">Certified Correct:</td><td class="sig-title italic">Disposal Approved:</td></tr>
      <tr><td class="sig-block"><strong class="upper">${escapeHTML(base.certifiedCorrect || '')}</strong><br><span class="xs">Property Custodian</span></td><td class="sig-block"><strong class="upper">${escapeHTML(base.disposalApproved || '')}</strong><br><span class="xs">Approving Officer</span></td></tr>
    </table>
    <table style="border-top:none">
      <tr><td>
        <div class="coi-wrap">
          <div class="coi-head">Certificate of Inspection</div>
          <div class="coi-sub">I hereby certify that the property enumerated above was disposed of as follows:</div>
          <div class="coi-row"><div class="coi-lbl">Item No.</div><div class="coi-line">${escapeHTML(lineDestroyed)}</div><div class="coi-act">Destroyed</div></div>
          <div class="coi-row"><div class="coi-lbl"></div><div class="coi-line">${escapeHTML(linePrivate)}</div><div class="coi-act">Sold at Private Sale</div></div>
          <div class="coi-row"><div class="coi-lbl"></div><div class="coi-line">${escapeHTML(linePublic)}</div><div class="coi-act">Sold at Public auction</div></div>
          <div class="coi-row"><div class="coi-lbl"></div><div class="coi-line">${escapeHTML(lineTransferred)}</div><div class="coi-act">Transferred without cost to ${escapeHTML(transferToText)}</div></div>
        </div>
      </td></tr>
    </table>
    <table style="border-top:none">
      <tr><td class="sig-title italic">Certified Correct:</td><td class="sig-title italic">Witness to Disposal:</td></tr>
      <tr><td class="sig-block"><strong class="upper">${escapeHTML(base.inspectionOfficer || '')}</strong><br><span class="xs">Inspection Officer/Inspection Committee</span></td><td class="sig-block"><strong class="upper">${escapeHTML(base.witnessToDisposal || '')}</strong><br><span class="xs">Witness</span></td></tr>
      <tr><td class="center xs italic">Inspection Officer</td><td class="center xs italic">Witness</td></tr>
    </table>
  </div>
</body></html>`);
  doc.close();
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }, 1000);
}
