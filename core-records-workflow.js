function importICS(json){
  if (!requireAccess('import_json', { label: 'import ICS data' })) return;
  const out = validateAndNormalizeICSRecord(json, { strict: true });
  if (!out.ok){
    const msg = out.errors[0] || 'Invalid ICS payload.';
    notify('error', `Import blocked: ${msg}`);
    showModal('Import Error', `Cannot import record. ${msg}`);
    return;
  }
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const incoming = out.record;
  const idx = records.findIndex((r) => normalizeICSKey(r.icsNo || '') === normalizeICSKey(incoming.icsNo || ''));
  if (idx !== -1){
    showConfirm(
      'Duplicate ICS Found',
      `ICS ${incoming.icsNo} already exists. Replace existing record?`,
      () => {
        records[idx] = attachRecordStatusMeta(incoming, 'imported');
        const replacedRecord = records[idx];
        localStorage.setItem('icsRecords', JSON.stringify(records));
        localStorage.setItem('icsLastImportAt', new Date().toISOString());
        recordAudit('import', `Replaced ICS ${incoming.icsNo}`, buildRecordLineageAuditMeta(replacedRecord));
        loadICSRecords();
        notify('success', `Replaced existing ICS ${incoming.icsNo}.`);
        editICS(idx);
      },
      'Replace'
    );
    return;
  }
  records.push(attachRecordStatusMeta(incoming, 'imported'));
  const insertedRecord = records[records.length - 1];
  localStorage.setItem('icsRecords', JSON.stringify(records));
  localStorage.setItem('icsLastImportAt', new Date().toISOString());
  recordAudit('import', `Imported ICS ${incoming.icsNo}`, buildRecordLineageAuditMeta(insertedRecord));
  loadICSRecords();
  notify('success', `Imported ICS ${incoming.icsNo}.`);
  editICS(records.length - 1);
}

// ===== FINALIZE / RECORDS =====
function getMissingRequiredFields(){
  const fields = [
    ['entityName', 'Entity Name'],
    ['fundCluster', 'Fund Cluster'],
    ['icsNo', 'ICS No.'],
    ['issuedByName', 'Issued By Name'],
    ['issuedByPos', 'Issued By Designation'],
    ['issuedByDate', 'Issued By Date'],
    ['receivedByName', 'Received By Name'],
    ['receivedByPos', 'Received By Designation'],
    ['receivedByDate', 'Received By Date']
  ];
  return fields.filter(([id]) => !document.getElementById(id).value.trim()).map(([,label]) => label);
}

function collectICSRecord(){
  const entity = document.getElementById('entityName').value.trim();
  const icsNo = document.getElementById('icsNo').value.trim();
  const issuedDate = document.getElementById('issuedByDate').value || new Date().toISOString().slice(0,10);
  const stageRows = getStageRows();

  let totalValue = 0;
  stageRows.forEach((r) => {
    totalValue += parseCurrencyValue(r.querySelector('.stage-total')?.value) || 0;
  });

  const items = stageRows.map((r) => {
    const qtyText = (r.querySelector('.stage-qty')?.value || '').trim();
    const qty = parseQuantityValue(qtyText);
    const unitCost = parseCurrencyValue(r.querySelector('.stage-unitcost')?.value);
    const total = parseCurrencyValue(r.querySelector('.stage-total')?.value);
    const eulRaw = (r.querySelector('.stage-eul-input')?.value || '').trim();
    const eulNum = Number(eulRaw);
    return {
      desc: (r.querySelector('.stage-desc')?.value || '').trim(),
      itemNo: (r.querySelector('.stage-itemno')?.value || '').trim(),
      qty: Number.isFinite(qty) ? qty : '',
      qtyText,
      unit: (r.querySelector('.stage-unit')?.value || '').trim(),
      unitCost: Number.isFinite(unitCost) ? unitCost : '',
      total: Number.isFinite(total) ? total : '',
      eul: eulRaw === '' ? '' : (Number.isFinite(eulNum) ? eulNum : '')
    };
  });

  const eul = items.some(it => Number.isFinite(it.eul) && it.eul <= 0) ? 'Expired' : 'Active';
  return {
    icsNo,
    entity,
    fund: document.getElementById('fundCluster').value.trim(),
    issuedDate,
    accountable: document.getElementById('receivedByName').value.trim(),
    signatories:{
      issuedBy:{
        name:document.getElementById('issuedByName').value.trim(),
        position:document.getElementById('issuedByPos').value.trim(),
        date:document.getElementById('issuedByDate').value
      },
      receivedBy:{
        name:document.getElementById('receivedByName').value.trim(),
        position:document.getElementById('receivedByPos').value.trim(),
        date:document.getElementById('receivedByDate').value
      }
    },
    eul,
    totalValue: totalValue.toFixed(2),
    items
  };
}

function saveICSFromForm(){
  if (!requireAccess('save_staged_ics', { label: 'saving ICS draft/staged data' })) return;
  const icsNo = validateFormForStaging();
  if (!icsNo) return;

  setStageContext({
    icsNo,
    entity: document.getElementById('entityName').value.trim(),
    mode: editingIndex !== null ? 'Editing' : 'Draft'
  });

  if (getStageRows().length === 0){
    addRow();
  }

  sheet.classList.remove('show');
  showFormAlert(`ICS ${icsNo} is active in Staged Items. Encode items, then click Finalize.`, 'info');
  notify('info', `ICS ${icsNo} is now active in Staged Items. Encode items, then click Finalize ICS Data.`);
}

function finalizeICS(){
  if (!requireAccess('finalize_ics', { label: 'finalizing ICS records' })) return;
  const icsNo = validateFormForStaging();
  if (!icsNo) return;

  if (getStageRows().length === 0){
    showFormAlert('No staged items to finalize. Add at least one item row.', 'error');
    notify('error', 'No staged items to finalize. Add at least one item row.');
    return;
  }

  const duplicateItemNos = markDuplicateItemNoRows();
  if (duplicateItemNos.length){
    const labels = duplicateItemNos.map(d => d.value);
    showFormAlert(`Duplicate Item No. found: ${labels.join(', ')}`, 'error');
    notify('error', `Duplicate Item No. found: ${labels.join(', ')}`);
    return;
  }

  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const duplicate = records.findIndex((r, i) => r.icsNo === icsNo && i !== editingIndex);
  if (duplicate !== -1){
    const duplicateRecord = records[duplicate];
    showFormAlert(`Duplicate ICS found: ${icsNo}`, 'error');
    notify('error', `Duplicate ICS found: ${icsNo}.`);
    showFormAlert(
      `Duplicate ICS ${icsNo} exists in ICS Records (#${duplicate + 1}) for ${duplicateRecord.entity || 'Unknown Entity'}.`,
      'error'
    );
    return;
  }

  const draftRecord = collectICSRecord();
  const validated = validateAndNormalizeICSRecord(draftRecord, { strict: true });
  if (!validated.ok){
    const firstError = validated.errors[0] || 'Validation failed.';
    showFormAlert(`Cannot finalize ICS: ${firstError}`, 'error');
    notify('error', `Cannot finalize ICS: ${firstError}`);
    return;
  }
  const record = attachRecordStatusMeta(validated.record, editingIndex !== null ? 'updated' : 'new');
  if (editingIndex !== null){
    records[editingIndex] = record;
  } else {
    records.push(record);
  }

  const wasEditing = editingIndex !== null;
  localStorage.setItem('icsRecords', JSON.stringify(records));
  loadICSRecords();
  resetStageItems();
  resetFormMode();
  clearFormAlert();
  recordAudit(
    wasEditing ? 'update' : 'add',
    `${wasEditing ? 'Updated' : 'Added'} ICS ${icsNo}`,
    buildRecordLineageAuditMeta(record)
  );
  notify('success', wasEditing ? `ICS ${icsNo} updated.` : `ICS ${icsNo} added.`);
}

function confirmAutoPopulateICS(){
  if (!requireAccess('auto_populate_records')) return;
  showConfirm(
    'Auto-Populate Stress Data',
    'Generate and add 3 complete ICS records for stress testing?',
    autoPopulateICSData,
    'Generate 3'
  );
}

function autoPopulateICSData(){
  if (!requireAccess('auto_populate_records')) return;
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const existingNo = new Set(records.map(r => (r.icsNo || '').toLowerCase()));
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}-${month}`;

  let nextSeq = 1;
  records.forEach((r) => {
    const m = (r.icsNo || '').match(new RegExp(`^${prefix}-(\\d{3})$`));
    if (!m) return;
    const n = Number(m[1]);
    if (Number.isFinite(n)) nextSeq = Math.max(nextSeq, n + 1);
  });

  const entities = [
    'OQUENDO ELEMENTARY SCHOOL',
    'LINABUAN SUR NATIONAL HIGH SCHOOL',
    'LEZO CENTRAL SCHOOL',
    'MALINAO DISTRICT OFFICE'
  ];
  const funds = ['01', '02', '05'];
  const issuedPeople = [
    { name: 'MARIA L. SANTOS', position: 'Supply Officer II' },
    { name: 'JOHN A. RAMOS', position: 'Administrative Officer IV' },
    { name: 'ELENA P. CRUZ', position: 'Property Custodian' }
  ];
  const receivedPeople = [
    { name: 'RHEALYN B. NADADO', position: 'AO II' },
    { name: 'CARLO M. DE VERA', position: 'Teacher III' },
    { name: 'ANNA K. DELA TORRE', position: 'School Head' }
  ];
  const itemSeeds = [
    { desc: 'Laptop', unit: 'unit', qty: 1, unitCost: 58000, eul: 4 },
    { desc: 'Printer', unit: 'unit', qty: 1, unitCost: 14500, eul: 3 },
    { desc: 'Projector', unit: 'unit', qty: 1, unitCost: 26500, eul: 4 },
    { desc: 'Office Chair', unit: 'piece', qty: 4, unitCost: 3200, eul: 5 },
    { desc: 'Filing Cabinet', unit: 'unit', qty: 2, unitCost: 7800, eul: 6 }
  ];
  const profileByIndex = [
    { label: 'near', issuedMonthsAgo: 10, itemEUL: 1 },
    { label: 'within', issuedMonthsAgo: 4, itemEUL: 1 },
    { label: 'past', issuedMonthsAgo: 14, itemEUL: 1 }
  ];
  const shiftMonths = (baseDate, months) => {
    const d = new Date(baseDate);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  const added = [];
  for (let i = 0; i < 3; i++){
    let icsNo = `${prefix}-${String(nextSeq).padStart(3, '0')}`;
    while (existingNo.has(icsNo.toLowerCase())){
      nextSeq += 1;
      icsNo = `${prefix}-${String(nextSeq).padStart(3, '0')}`;
    }
    existingNo.add(icsNo.toLowerCase());
    nextSeq += 1;

    const issuedBy = issuedPeople[i % issuedPeople.length];
    const receivedBy = receivedPeople[i % receivedPeople.length];
    const entity = entities[i % entities.length];
    const fund = funds[i % funds.length];
    const profile = profileByIndex[i % profileByIndex.length];
    const issuedDate = shiftMonths(now, -profile.issuedMonthsAgo).toISOString().slice(0,10);

    const items = itemSeeds.slice(i, i + 3).map((seed, k) => {
      const qty = Number(seed.qty);
      const unitCost = Number(seed.unitCost);
      const total = qty * unitCost;
      return {
        desc: seed.desc,
        itemNo: `${icsNo}-${String(k + 1).padStart(2, '0')}`,
        qty,
        qtyText: String(qty),
        unit: seed.unit,
        unitCost,
        total,
        eul: profile.itemEUL
      };
    });

    const totalValue = items.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
    const record = {
      icsNo,
      entity,
      fund,
      issuedDate,
      accountable: receivedBy.name,
      signatories: {
        issuedBy: { name: issuedBy.name, position: issuedBy.position, date: issuedDate },
        receivedBy: { name: receivedBy.name, position: receivedBy.position, date: issuedDate }
      },
      eul: profile.label === 'past' ? 'Expired' : 'Active',
      totalValue: totalValue.toFixed(2),
      items
    };
    records.push(attachRecordStatusMeta(record, 'new'));
    const tag = profile.label === 'near' ? 'Due < 3m' : (profile.label === 'past' ? 'Past EUL' : 'Within EUL');
    added.push(`${record.icsNo} (${tag})`);
  }

  localStorage.setItem('icsRecords', JSON.stringify(records));
  recordAudit('seed', `Auto-populated records: ${added.join(', ')}`);
  loadICSRecords();
  if ([...navItems].some(n => n.classList.contains('active') && n.dataset.view === 'Action Center')) initActionsView();
  if ([...navItems].some(n => n.classList.contains('active') && n.dataset.view === 'Archives')) initArchivesView();
  notify('success', `Stress data generated: ${added.join(', ')}`);
}


