function validProfileEmail(v){
  const value = (v || '').trim();
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validSchoolId(v){
  const value = normalizeSchoolId(v || '');
  return /^\d{4,12}$/.test(value);
}

function createDefaultSchoolIdentity(){
  return {
    schoolName: 'Oquendo Elementary School',
    schoolId: '',
    logoDataUrl: '',
    suppliesReporting: {
      showQuarterColumn: false
    }
  };
}

function normalizeSuppliesReportingSettings(settings){
  const src = settings && typeof settings === 'object' ? settings : {};
  const showQuarterColumn = src.showQuarterColumn === true
    || src.showQuarterColumn === 'true'
    || src.showQuarterColumn === 1
    || src.showQuarterColumn === '1';
  return { showQuarterColumn };
}

function getSuppliesReportingConfig(identity){
  const src = identity && typeof identity === 'object' ? identity : {};
  return normalizeSuppliesReportingSettings(
    src.suppliesReporting || { showQuarterColumn: src.showSuppliesQuarterColumn }
  );
}

function sanitizeSchoolLogoDataUrl(value){
  const raw = (value || '').toString().trim();
  if (!raw) return '';
  const ok = /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(raw);
  return ok ? raw : '';
}

function getSchoolShortLabel(name){
  const text = (name || '').toString().trim();
  const parts = text.split(/\s+/).filter(Boolean).slice(0, 3);
  if (!parts.length) return 'SCH';
  return parts.map((p) => p[0]?.toUpperCase() || '').join('').slice(0, 4) || 'SCH';
}

function normalizeSupplyReportMonth(value){
  const raw = (value || '').toString().trim();
  const match = raw.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) return '';
  return `${match[1]}-${match[2]}`;
}

function normalizeSupplyReportQuarter(value){
  const raw = (value || '').toString().trim().toUpperCase().replace(/\s+/g, '');
  if (!raw) return '';
  const fromYearPrefix = raw.match(/^(\d{4})-?Q([1-4])$/);
  if (fromYearPrefix) return `${fromYearPrefix[1]}-Q${fromYearPrefix[2]}`;
  const fromQuarterPrefix = raw.match(/^Q([1-4])[-/]?(\d{4})$/);
  if (fromQuarterPrefix) return `${fromQuarterPrefix[2]}-Q${fromQuarterPrefix[1]}`;
  return '';
}

function deriveSupplyReportMonthFromDate(dateValue){
  const ymd = typeof normalizeDateYMD === 'function'
    ? normalizeDateYMD(dateValue || '')
    : (dateValue || '').toString().trim();
  const match = ymd.match(/^(\d{4})-(\d{2})-/);
  if (!match) return '';
  return `${match[1]}-${match[2]}`;
}

function deriveSupplyReportQuarterFromMonth(monthValue){
  const month = normalizeSupplyReportMonth(monthValue);
  if (!month) return '';
  const monthNum = Number(month.slice(5, 7));
  if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) return '';
  const quarter = Math.floor((monthNum - 1) / 3) + 1;
  return `${month.slice(0, 4)}-Q${quarter}`;
}

function deriveSupplyReportQuarterFromDate(dateValue){
  const month = deriveSupplyReportMonthFromDate(dateValue);
  return deriveSupplyReportQuarterFromMonth(month);
}

function formatSupplyReportMonthLabel(monthValue){
  const month = normalizeSupplyReportMonth(monthValue);
  if (!month) return '';
  const labels = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
  };
  const year = month.slice(0, 4);
  const monthKey = month.slice(5, 7);
  return `${labels[monthKey] || monthKey} ${year}`;
}

function formatSupplyReportQuarterLabel(quarterValue){
  const quarter = normalizeSupplyReportQuarter(quarterValue);
  if (!quarter) return '';
  return `Q${quarter.slice(-1)} ${quarter.slice(0, 4)}`;
}

function resolveSupplyReportedPeriodLabel(row){
  const quarter = normalizeSupplyReportQuarter(row?.reportQuarter || '');
  if (quarter) return formatSupplyReportQuarterLabel(quarter);
  const month = normalizeSupplyReportMonth(row?.reportMonth || deriveSupplyReportMonthFromDate(row?.date || ''));
  if (month) return formatSupplyReportMonthLabel(month);
  return '';
}

function getSupplyReportedYearMonth(row){
  const reportMonth = normalizeSupplyReportMonth(row?.reportMonth || '');
  if (reportMonth){
    return { year: reportMonth.slice(0, 4), month: reportMonth.slice(5, 7) };
  }
  const reportQuarter = normalizeSupplyReportQuarter(row?.reportQuarter || '');
  if (reportQuarter){
    return { year: reportQuarter.slice(0, 4), month: '' };
  }
  const fromDate = deriveSupplyReportMonthFromDate(row?.date || '');
  if (fromDate){
    return { year: fromDate.slice(0, 4), month: fromDate.slice(5, 7) };
  }
  const fromStockNo = ((row?.stockNo || '').toString().trim()).match(/^(\d{4})-(\d{2})-/);
  if (fromStockNo){
    return { year: fromStockNo[1], month: fromStockNo[2] };
  }
  return { year: '', month: '' };
}

function normalizeDesignationValue(value){
  return (value || '').toString().trim().replace(/\s+/g, ' ').slice(0, 80);
}

function loadSchoolDesignationsMap(){
  const parsed = safeParseJSON(localStorage.getItem(SCHOOL_DESIGNATIONS_STORAGE_KEY) || '{}', {});
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function saveSchoolDesignationsMap(map){
  localStorage.setItem(SCHOOL_DESIGNATIONS_STORAGE_KEY, JSON.stringify(map || {}));
}

function dedupeDesignationList(list){
  const out = [];
  const seen = new Set();
  (list || []).forEach((value) => {
    const next = normalizeDesignationValue(value);
    if (!next) return;
    const key = next.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(next);
  });
  return out;
}

function getDesignationsForSchool(schoolId){
  const sid = normalizeSchoolId(schoolId || schoolIdentity.schoolId || '');
  const map = loadSchoolDesignationsMap();
  const fromStore = Array.isArray(map[sid]) ? map[sid] : [];
  const list = dedupeDesignationList([...DEFAULT_DESIGNATIONS, ...fromStore]);
  return list.length ? list : [...DEFAULT_DESIGNATIONS];
}

function setDesignationsForSchool(schoolId, list){
  const sid = normalizeSchoolId(schoolId || schoolIdentity.schoolId || '');
  if (!sid) return;
  const map = loadSchoolDesignationsMap();
  map[sid] = dedupeDesignationList(list);
  saveSchoolDesignationsMap(map);
}

function ensureDesignationForSchool(schoolId, designation){
  const sid = normalizeSchoolId(schoolId || schoolIdentity.schoolId || '');
  const next = normalizeDesignationValue(designation);
  if (!sid || !next) return;
  const list = getDesignationsForSchool(sid);
  if (list.some((x) => x.toLowerCase() === next.toLowerCase())) return;
  list.push(next);
  setDesignationsForSchool(sid, list);
}

function setDesignationSelectOptions(selectId, selectedValue, schoolId){
  const field = document.getElementById(selectId);
  if (!field) return;
  const sid = normalizeSchoolId(schoolId || schoolIdentity.schoolId || '');
  const list = getDesignationsForSchool(sid);
  const selected = normalizeDesignationValue(selectedValue || '');
  const isSelect = (field.tagName || '').toLowerCase() === 'select';
  if (isSelect){
    field.innerHTML = `<option value="">Select designation</option>`
      + list.map((name) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join('');
    field.value = list.includes(selected) ? selected : '';
    if (!field.value && list.length) field.value = list[0];
    return;
  }
  const listId = `${selectId}List`;
  const datalist = document.getElementById(listId);
  if (datalist){
    datalist.innerHTML = list.map((name) => `<option value="${escapeHTML(name)}"></option>`).join('');
  }
  field.value = list.includes(selected) ? selected : '';
  if (!field.value && list.length) field.value = list[0];
}

function renderDesignationManager(){
  const host = document.getElementById('designationListReadonly');
  const input = document.getElementById('designationNewInput');
  const addBtn = document.getElementById('designationAddBtn');
  if (!host) return;
  const sid = normalizeSchoolId(schoolIdentity.schoolId || '');
  const canManage = hasRoleCapability('manage_roles');
  const list = getDesignationsForSchool(sid);
  host.innerHTML = list.length
    ? list.map((name) => {
      const encodedDesignation = encodeURIComponent(name);
      const removeBtn = canManage
        ? ` <button type="button" class="btn btn-sm btn-danger profile-designation-remove-btn" data-designation-remove="${encodedDesignation}" style="padding:2px 8px;font-size:11px">Remove</button>`
        : '';
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span>${escapeHTML(name)}</span><span>${removeBtn}</span></div>`;
    }).join('')
    : 'No designations configured.';
  if (input){
    input.disabled = !canManage;
    input.value = '';
    input.title = canManage ? '' : 'Only Admin can manage designation list.';
  }
  if (addBtn){
    addBtn.disabled = !canManage;
    addBtn.title = canManage ? '' : 'Only Admin can manage designation list.';
  }
}

function addDesignationFromProfile(){
  if (!requireAccess('manage_roles', { label: 'manage designation list' })) return;
  const input = document.getElementById('designationNewInput');
  const value = normalizeDesignationValue(input?.value || '');
  if (!value){
    notify('error', 'Enter a designation to add.');
    return;
  }
  const sid = normalizeSchoolId(schoolIdentity.schoolId || '');
  const list = getDesignationsForSchool(sid);
  if (list.some((x) => x.toLowerCase() === value.toLowerCase())){
    notify('info', 'Designation already exists.');
    return;
  }
  list.push(value);
  setDesignationsForSchool(sid, list);
  setDesignationSelectOptions('profileDesignation', value, sid);
  setDesignationSelectOptions('setupProfileDesignation', value, sid);
  renderDesignationManager();
  notify('success', `Designation added: ${value}`);
}

function removeDesignationFromProfile(value){
  if (!requireAccess('manage_roles', { label: 'manage designation list' })) return;
  const sid = normalizeSchoolId(schoolIdentity.schoolId || '');
  const target = normalizeDesignationValue(value);
  const current = getDesignationsForSchool(sid);
  if (current.length <= 1){
    notify('error', 'At least one designation is required.');
    return;
  }
  const next = current.filter((x) => x.toLowerCase() !== target.toLowerCase());
  if (!next.length){
    notify('error', 'At least one designation is required.');
    return;
  }
  setDesignationsForSchool(sid, next);
  if (normalizeDesignationValue(currentUser.designation || '').toLowerCase() === target.toLowerCase()){
    currentUser = normalizeUser({ ...currentUser, designation: next[0] });
    saveCurrentUser();
    upsertCurrentUserForSchool(sid);
    renderUserIdentity();
  }
  setDesignationSelectOptions('profileDesignation', currentUser.designation || next[0], sid);
  setDesignationSelectOptions('setupProfileDesignation', currentUser.designation || next[0], sid);
  renderDesignationManager();
  notify('success', `Designation removed: ${target}`);
}

function normalizeSchoolIdentity(identity){
  const base = createDefaultSchoolIdentity();
  const src = identity && typeof identity === 'object' ? identity : {};
  return {
    schoolName: (src.schoolName || base.schoolName).toString().trim() || base.schoolName,
    schoolId: normalizeSchoolId(src.schoolId || ''),
    logoDataUrl: sanitizeSchoolLogoDataUrl(src.logoDataUrl || src.logo || ''),
    suppliesReporting: normalizeSuppliesReportingSettings(
      src.suppliesReporting || { showQuarterColumn: src.showSuppliesQuarterColumn }
    )
  };
}
