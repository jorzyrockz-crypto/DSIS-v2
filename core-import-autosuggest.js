function triggerImport(){
  if (!requireAccess('import_json', { label: 'import data' })) return;
  openDataManagerModal('import');
}

function handleImportFile(event){
  if (!requireAccess('import_json', { label: 'importing data' })){
    if (event?.target) event.target.value = '';
    return;
  }
  const file = event?.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      importICS(payload);
    } catch (err){
      notify('error', `Import failed for ${file.name}. Invalid JSON format.`);
      showModal('Import Error', 'Selected file is not a valid ICS JSON.');
    } finally {
      event.target.value = '';
    }
  };
  reader.onerror = () => {
    notify('error', `Import failed for ${file.name}.`);
    showModal('Import Error', 'Unable to read selected file.');
    event.target.value = '';
  };
  reader.readAsText(file);
}

function normalizeICS(json){
  const issuedBySrc = json.issuedBy || json.signatories?.issuedBy || json.meta?.issuedBy || {};
  const receivedBySrc = json.receivedBy || json.signatories?.receivedBy || json.meta?.receivedBy || {};
  const items = (json.items || []).map((it) => {
    const qtySource = it.qtyText ?? it.qty ?? it.quantity ?? '';
    const qtyNumber = parseQuantityValue(qtySource);
    const unitCostSource = it.unitCost ?? it.unit_cost ?? '';
    const unitCostNumber = parseCurrencyValue(unitCostSource);
    const totalSource = it.total ?? '';
    const totalNumber = parseCurrencyValue(totalSource);
    const eulSource = it.eul ?? '';
    const eulNumber = Number((eulSource || '').toString().trim());
    return {
      desc: it.desc || it.description || '',
      itemNo: it.itemNo || it.item_no || '',
      qty: Number.isFinite(qtyNumber) ? qtyNumber : '',
      qtyText: (qtySource || '').toString(),
      unit: it.unit || '',
      unitCost: Number.isFinite(unitCostNumber) ? unitCostNumber : '',
      total: Number.isFinite(totalNumber) ? totalNumber : '',
      eul: Number.isFinite(eulNumber) ? eulNumber : ''
    };
  });

  const totalValue = items.reduce((s, i) => {
    const total = Number.isFinite(i.total) ? i.total : (Number.isFinite(i.qty) && Number.isFinite(i.unitCost) ? i.qty * i.unitCost : 0);
    return s + (total || 0);
  }, 0);
  const eulStat = items.some((i) => Number.isFinite(i.eul) && i.eul <= 0) ? 'Expired' : 'Active';

  return {
    icsNo: (json.icsNo || json.id || '').toString().trim(),
    entity: json.entity || json.meta?.entity || '',
    fund: json.fund || json.meta?.fund || '',
    issuedDate: (json.issuedDate || json.date || json.meta?.issuedDate || '').slice(0, 10),
    accountable: json.accountable || json.receivedBy?.name || json.meta?.accountable || '',
    signatories: {
      issuedBy: {
        name: issuedBySrc.name || '',
        position: issuedBySrc.position || issuedBySrc.designation || '',
        date: (issuedBySrc.date || '').slice(0, 10)
      },
      receivedBy: {
        name: receivedBySrc.name || '',
        position: receivedBySrc.position || receivedBySrc.designation || '',
        date: (receivedBySrc.date || '').slice(0, 10)
      }
    },
    eul: eulStat,
    totalValue: totalValue.toFixed(2),
    items
  };
}

function fillDatalistOptions(listId, values){
  const list = document.getElementById(listId);
  if (!list) return;
  const unique = [...new Set(values.map((v) => (v || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  list.innerHTML = unique.map((v) => `<option value="${v.replace(/"/g, '&quot;')}"></option>`).join('');
}

function refreshAutoSuggest(){
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  fillDatalistOptions('entityNameList', records.map((r) => r.entity));
  fillDatalistOptions('fundClusterList', records.map((r) => r.fund));
  fillDatalistOptions('issuedByNameList', records.map((r) => r.signatories?.issuedBy?.name));
  fillDatalistOptions('issuedByPosList', records.map((r) => r.signatories?.issuedBy?.position));
  fillDatalistOptions('receivedByNameList', records.map((r) => r.signatories?.receivedBy?.name));
  fillDatalistOptions('receivedByPosList', records.map((r) => r.signatories?.receivedBy?.position));
  const allItems = records.flatMap((r) => r.items || []);
  fillDatalistOptions('stageDescList', allItems.map((i) => i.desc || i.description || ''));
  const map = {};
  allItems.forEach((it) => {
    const desc = (it.desc || it.description || '').toString().trim().toLowerCase();
    const unit = (it.unit || '').toString().trim();
    if (!desc || !unit) return;
    if (!map[desc]) map[desc] = [];
    map[desc].push(unit);
  });
  Object.keys(map).forEach((k) => {
    map[k] = [...new Set(map[k])];
  });
  stageDescToUnits = map;
  fillDatalistOptions('stageUnitList', Object.values(stageDescToUnits).flat());
}
