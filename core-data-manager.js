function normalizeImportPackage(payload){
  const packageSchoolIdentity = normalizeSchoolIdentity({
    schoolName: payload?.schoolIdentity?.schoolName || payload?.school?.schoolName || payload?.meta?.schoolName || '',
    schoolId: payload?.schoolIdentity?.schoolId || payload?.school?.schoolId || payload?.meta?.schoolId || ''
  });
  const hasSchoolIdentity = !!((payload?.schoolIdentity?.schoolId || payload?.school?.schoolId || payload?.meta?.schoolId || '').toString().trim());
  if (Array.isArray(payload)){
    return {
      records: payload,
      icsRecords: payload,
      parRecords: [],
      schemaVersion: 'legacy',
      packageType: 'array',
      integrity: null,
      schoolIdentity: null,
      exportedByProfileKey: ''
    };
  }
  if (payload && typeof payload === 'object'){
    if (Array.isArray(payload.data?.records) || Array.isArray(payload.data?.parRecords)){
      const icsRecords = Array.isArray(payload.data?.records) ? payload.data.records : [];
      const parRecords = Array.isArray(payload.data?.parRecords) ? payload.data.parRecords : [];
      return {
        records: icsRecords,
        icsRecords,
        parRecords,
        schemaVersion: payload.schemaVersion || payload.version || 'legacy',
        packageType: payload.packageType || 'schema-package',
        integrity: payload.integrity || null,
        schoolIdentity: hasSchoolIdentity ? packageSchoolIdentity : null,
        exportedByProfileKey: normalizeProfileKeyValue(payload.exportedByProfileKey || payload.exportedBy || ''),
        extras: {
          archives: payload.data.archives,
          notifications: payload.data.notifications,
          auditLogs: payload.data.auditLogs
        }
      };
    }
    if (Array.isArray(payload.records) || Array.isArray(payload.parRecords)){
      const icsRecords = Array.isArray(payload.records) ? payload.records : [];
      const parRecords = Array.isArray(payload.parRecords) ? payload.parRecords : [];
      return {
        records: icsRecords,
        icsRecords,
        parRecords,
        schemaVersion: payload.schemaVersion || payload.version || 'legacy',
        packageType: payload.packageType || 'records',
        integrity: payload.integrity || null,
        schoolIdentity: hasSchoolIdentity ? packageSchoolIdentity : null,
        exportedByProfileKey: normalizeProfileKeyValue(payload.exportedByProfileKey || payload.exportedBy || '')
      };
    }
    if (payload.icsNo || payload.parNo || payload.id){
      const isPar = !!((payload.parNo || '').toString().trim());
      return {
        records: [payload],
        icsRecords: isPar ? [] : [payload],
        parRecords: isPar ? [payload] : [],
        schemaVersion: payload.schemaVersion || payload.version || 'legacy',
        packageType: 'single-record',
        integrity: payload.integrity || null,
        schoolIdentity: hasSchoolIdentity ? packageSchoolIdentity : null,
        exportedByProfileKey: normalizeProfileKeyValue(payload.exportedByProfileKey || payload.exportedBy || '')
      };
    }
  }
  return null;
}

function resolveImportRecordType(type){
  return (type || 'ics').toString().toLowerCase() === 'par' ? 'par' : 'ics';
}

function resolveImportRecordNo(record, type = 'ics'){
  const recordType = resolveImportRecordType(type);
  if (recordType === 'par'){
    return ((record?.parNo || record?.icsNo || '').toString()).trim();
  }
  return ((record?.icsNo || '').toString()).trim();
}

function sortKeysDeep(value){
  if (Array.isArray(value)){
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === 'object'){
    const sorted = {};
    Object.keys(value).sort().forEach((key) => {
      sorted[key] = sortKeysDeep(value[key]);
    });
    return sorted;
  }
  return value;
}

function stripIntegrityField(payload){
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)){
    return payload;
  }
  const copy = { ...payload };
  delete copy.integrity;
  return copy;
}

function stableJSONStringify(value){
  return JSON.stringify(sortKeysDeep(value));
}

async function sha256Hex(text){
  if (!globalThis.crypto?.subtle || typeof TextEncoder === 'undefined'){
    return null;
  }
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computePackageChecksum(payload){
  const source = stripIntegrityField(payload);
  const canonical = stableJSONStringify(source);
  const checksum = await sha256Hex(canonical);
  if (!checksum) return null;
  return {
    checksum,
    canonicalLength: canonical.length
  };
}

async function attachPackageIntegrity(payload){
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)){
    return { ok: false, reason: 'Checksum can only be generated for object payloads.' };
  }
  const computed = await computePackageChecksum(payload);
  if (!computed){
    return { ok: false, reason: 'Web Crypto SHA-256 is unavailable in this browser environment.' };
  }
  return {
    ok: true,
    payload: {
      ...payload,
      integrity: {
        algorithm: 'SHA-256',
        target: 'package-without-integrity',
        canonicalization: 'sorted-json-v1',
        checksum: computed.checksum,
        computedAt: new Date().toISOString()
      }
    }
  };
}

function renderDataManagerVerificationStatus(verification){
  const panel = document.getElementById('dmVerificationStatus');
  if (!panel) return;
  const state = verification || {
    ok: false,
    level: 'info',
    message: 'Restore verification pending. Load a JSON package.',
    details: ''
  };
  const safeLevel = ['success', 'error', 'warn', 'info'].includes(state.level) ? state.level : 'info';
  const safeMessage = escapeHTML(state.message || '');
  const safeDetails = state.details ? `<span class="dm-verify-meta">${escapeHTML(state.details)}</span>` : '';
  panel.className = `dm-verify-panel ${safeLevel}`;
  panel.innerHTML = `${safeMessage}${safeDetails}`;
}

function updateDataManagerApplyState(){
  const btn = document.getElementById('dmApplyImportBtn');
  if (!btn) return;
  const summaryReady = !!dataManagerState.summary;
  const verified = !!dataManagerState.verification?.ok;
  btn.disabled = !(summaryReady && verified);
  if (btn.disabled){
    btn.title = 'Import is blocked until restore verification passes.';
  } else {
    btn.removeAttribute('title');
  }
}

async function verifyImportPackageIntegrity(payload, parsed){
  const packageType = ((parsed?.packageType || payload?.packageType || '') + '').toLowerCase();
  const sourceIntegrity = parsed?.integrity || payload?.integrity || null;
  const isSchemaPackage = !!(payload && typeof payload === 'object' && !Array.isArray(payload) && (payload.data || payload.records || payload.parRecords));

  if (!isSchemaPackage){
    return {
      ok: true,
      level: 'warn',
      message: 'No package integrity metadata found (legacy format). Import allowed with reduced trust.',
      details: 'Recommendation: export again using the current Export Center to include SHA-256 checksum.'
    };
  }
  if (!sourceIntegrity || !sourceIntegrity.checksum){
    const msg = packageType === 'full-backup'
      ? 'Restore verification failed: full backup checksum is missing.'
      : 'No checksum found in package metadata. Import allowed with reduced trust.';
    return {
      ok: packageType !== 'full-backup',
      level: packageType === 'full-backup' ? 'error' : 'warn',
      message: msg,
      details: packageType === 'full-backup'
        ? 'Use backups exported from this app version (with integrity metadata).'
        : 'Recommendation: use a checksum-enabled export for stronger verification.'
    };
  }

  const algorithm = (sourceIntegrity.algorithm || '').toString().toUpperCase();
  if (algorithm !== 'SHA-256'){
    return {
      ok: false,
      level: 'error',
      message: `Restore verification failed: unsupported checksum algorithm "${sourceIntegrity.algorithm || 'unknown'}".`,
      details: 'Only SHA-256 is accepted for schema package restore.'
    };
  }

  const computed = await computePackageChecksum(payload);
  if (!computed){
    return {
      ok: false,
      level: 'error',
      message: 'Restore verification failed: SHA-256 engine is unavailable in this environment.',
      details: 'Open this app in a browser/runtime with Web Crypto support.'
    };
  }

  const expected = (sourceIntegrity.checksum || '').toString().trim().toLowerCase();
  const actual = computed.checksum.toLowerCase();
  if (!expected || expected !== actual){
    return {
      ok: false,
      level: 'error',
      message: 'Restore verification failed: checksum mismatch detected.',
      details: `Expected ${expected || 'n/a'} | Computed ${actual}`
    };
  }

  return {
    ok: true,
    level: 'success',
    message: 'Restore verification passed (SHA-256 checksum matched).',
    details: `Checksum ${actual}`
  };
}

function verifyImportPackageSchoolIdentity(payload, parsed){
  const packageType = ((parsed?.packageType || payload?.packageType || '') + '').toLowerCase();
  const localSchool = normalizeSchoolIdentity(schoolIdentity);
  const packageSchool = parsed?.schoolIdentity || null;

  if (!localSchool.schoolId){
    return {
      ok: false,
      level: 'error',
      message: 'Restore verification failed: local School ID lock is not configured.',
      details: 'Set School ID in Profile first (example: 114656), then retry import.'
    };
  }

  if (!packageSchool || !packageSchool.schoolId){
    return {
      ok: packageType !== 'full-backup',
      level: packageType === 'full-backup' ? 'error' : 'warn',
      message: packageType === 'full-backup'
        ? 'Restore verification failed: backup is missing School ID metadata.'
        : 'Import package has no School ID metadata. Import allowed with reduced guardrails.',
      details: packageType === 'full-backup'
        ? `Local School ID is ${localSchool.schoolId}. Re-export backup from the same school before restore.`
        : `Local School ID is ${localSchool.schoolId}.`
    };
  }

  if (normalizeSchoolId(packageSchool.schoolId) !== localSchool.schoolId){
    return {
      ok: false,
      level: 'error',
      message: `Restore verification failed: School ID mismatch (${packageSchool.schoolId} vs local ${localSchool.schoolId}).`,
      details: `Package school: ${packageSchool.schoolName || 'Unknown'} | Local school: ${localSchool.schoolName}`
    };
  }

  const nameMismatch = (packageSchool.schoolName || '').trim()
    && (packageSchool.schoolName || '').trim().toLowerCase() !== (localSchool.schoolName || '').trim().toLowerCase();
  if (nameMismatch){
    return {
      ok: true,
      level: 'warn',
      message: `School ID matched (${localSchool.schoolId}), but school name differs.`,
      details: `Package school: ${packageSchool.schoolName} | Local school: ${localSchool.schoolName}`
    };
  }

  return {
    ok: true,
    level: 'success',
    message: `School identity matched (ID ${localSchool.schoolId}).`,
    details: `School: ${localSchool.schoolName}`
  };
}

async function verifyImportPackageForRestore(payload, parsed, summary){
  const traceCheck = {
    ok: true,
    level: 'success',
    message: 'Trace profile-key coverage verified.',
    details: ''
  };
  const migratedCount = Number(summary?.migratedTraceKeys || 0);
  if (migratedCount > 0){
    traceCheck.level = 'warn';
    traceCheck.message = `Trace profile-key migration required (${migratedCount} field(s) auto-filled).`;
    traceCheck.details = 'Legacy payload detected. Auto-migration applied during preview.';
  }
  const checks = [
    await verifyImportPackageIntegrity(payload, parsed),
    verifyImportPackageSchoolIdentity(payload, parsed),
    traceCheck
  ];
  const failed = checks.find((c) => !c.ok);
  if (failed) return failed;
  const hasWarn = checks.some((c) => c.level === 'warn');
  if (hasWarn){
    return {
      ok: true,
      level: 'warn',
      message: 'Restore verification passed with warnings.',
      details: checks.map((c) => c.message).join(' | ')
    };
  }
  return {
    ok: true,
    level: 'success',
    message: 'Restore verification passed (checksum + school identity lock).',
    details: checks.map((c) => c.message).join(' | ')
  };
}

function analyzeImportPayload(payload, sourceName = ''){
  const parsed = normalizeImportPackage(payload);
  if (!parsed){
    return { ok: false, reason: 'Unsupported payload. Expected ICS/PAR record, records array, or schema package.' };
  }
  const packageExportedBy = normalizeProfileKeyValue(parsed.exportedByProfileKey || payload?.exportedByProfileKey || '');
  const existingByType = {
    ics: JSON.parse(localStorage.getItem('icsRecords') || '[]'),
    par: JSON.parse(localStorage.getItem('parRecords') || '[]')
  };
  const existingKeysByType = {
    ics: new Set((existingByType.ics || []).map((r) => normalizeICSKey(resolveImportRecordNo(r, 'ics')))),
    par: new Set((existingByType.par || []).map((r) => normalizeICSKey(resolveImportRecordNo(r, 'par'))))
  };
  const incomingSeenByType = { ics: new Set(), par: new Set() };
  const rows = [];
  const validRows = [];
  const migrationRows = [];
  let invalidCount = 0;
  let conflictCount = 0;
  let inFileDuplicateCount = 0;
  let migratedTraceKeys = 0;
  let incomingICS = 0;
  let incomingPAR = 0;
  let validICS = 0;
  let validPAR = 0;

  const analyzeSet = (rawRecords, type) => {
    const recordType = resolveImportRecordType(type);
    const recordCode = recordType === 'par' ? 'PAR' : 'ICS';
    (rawRecords || []).forEach((raw) => {
      const out = validateAndNormalizeICSRecord(raw, { strict: true });
      const migration = migrateRecordTraceProfileKeysForImport(out.record, packageExportedBy);
      const normalizedRecord = migration.record;
      if (recordType === 'par'){
        normalizedRecord.parNo = normalizedRecord.parNo || normalizedRecord.icsNo || '';
      }
      migratedTraceKeys += migration.migrated;
      const recordNo = resolveImportRecordNo(normalizedRecord, recordType);
      const key = normalizeICSKey(recordNo || '');
      const notes = [];
      if (out.errors.length) notes.push(...out.errors);
      if (out.warnings.length) notes.push(...out.warnings);
      if (migration.migrated){
        notes.push(`Auto-migrated ${migration.migrated} missing profile-key field(s).`);
        migrationRows.push({
          index: rows.length + 1,
          recordType,
          icsNo: recordNo || '',
          recordNo: recordNo || '',
          migrated: migration.migrated,
          fields: migration.fields || []
        });
      }
      let status = out.ok ? 'valid' : 'invalid';
      if (status === 'invalid') invalidCount += 1;
      if (status === 'valid' && key){
        if (incomingSeenByType[recordType].has(key)){
          status = 'duplicate-in-file';
          inFileDuplicateCount += 1;
          notes.push(`Duplicate ${recordCode} found in import file.`);
        } else {
          incomingSeenByType[recordType].add(key);
          if (existingKeysByType[recordType].has(key)){
            status = 'conflict-existing';
            conflictCount += 1;
            notes.push(`${recordCode} already exists in local records.`);
          }
        }
      }
      const row = {
        index: rows.length,
        status,
        notes,
        key,
        record: normalizedRecord,
        recordType,
        recordNo: recordNo || '',
        icsNo: recordNo || '',
        entity: normalizedRecord?.entity || ''
      };
      if (recordType === 'par') incomingPAR += 1;
      else incomingICS += 1;
      if (status === 'valid'){
        if (recordType === 'par') validPAR += 1;
        else validICS += 1;
      }
      if (status === 'valid' || status === 'conflict-existing') validRows.push(row);
      rows.push(row);
    });
  };

  analyzeSet(Array.isArray(parsed.icsRecords) ? parsed.icsRecords : [], 'ics');
  analyzeSet(Array.isArray(parsed.parRecords) ? parsed.parRecords : [], 'par');

  const summary = {
    sourceName,
    schemaVersion: parsed.schemaVersion || 'legacy',
    packageType: parsed.packageType || 'unknown',
    schoolIdentity: parsed.schoolIdentity || null,
    packageExportedByProfileKey: packageExportedBy || '',
    totalIncoming: rows.length,
    incomingICS,
    incomingPAR,
    validICS,
    validPAR,
    valid: rows.filter((r) => r.status === 'valid').length,
    invalid: invalidCount,
    conflicts: conflictCount,
    inFileDuplicates: inFileDuplicateCount,
    migratedTraceKeys,
    migrationRows,
    newRecords: rows.filter((r) => r.status === 'valid').length,
    rows,
    validRows,
    extras: parsed.extras || {}
  };
  return { ok: true, summary, parsed };
}

function analyzeTraceCoverageForPayload(payload, sourceName = ''){
  const parsed = normalizeImportPackage(payload);
  if (!parsed){
    return { ok: false, reason: 'Unsupported payload. Expected ICS/PAR record, records array, or schema package.' };
  }
  const normalizedRecords = [];
  const missingRows = [];
  let invalidRecords = 0;
  let incomingICS = 0;
  let incomingPAR = 0;
  const inspectSet = (rawRecords, type) => {
    const recordType = resolveImportRecordType(type);
    (rawRecords || []).forEach((raw) => {
      const out = validateAndNormalizeICSRecord(raw, { strict: true });
      if (recordType === 'par' && out.record){
        out.record.parNo = out.record.parNo || out.record.icsNo || '';
      }
      if (!out.ok) invalidRecords += 1;
      normalizedRecords.push(out.record);
      const rowStats = getTraceIntegrityStatsForRecords([out.record]);
      if (rowStats.totalMissing > 0){
        missingRows.push({
          index: missingRows.length + 1,
          recordType,
          recordNo: resolveImportRecordNo(out.record, recordType),
          missing: rowStats.totalMissing
        });
      }
      if (recordType === 'par') incomingPAR += 1;
      else incomingICS += 1;
    });
  };
  inspectSet(Array.isArray(parsed.icsRecords) ? parsed.icsRecords : [], 'ics');
  inspectSet(Array.isArray(parsed.parRecords) ? parsed.parRecords : [], 'par');
  const stats = getTraceIntegrityStatsForRecords(normalizedRecords);
  return {
    ok: true,
    summary: {
      sourceName: sourceName || '',
      packageType: parsed.packageType || 'unknown',
      schemaVersion: parsed.schemaVersion || 'legacy',
      exportedByProfileKey: normalizeProfileKeyValue(parsed.exportedByProfileKey || payload?.exportedByProfileKey || ''),
      totalIncoming: normalizedRecords.length,
      incomingICS,
      incomingPAR,
      invalidRecords,
      stats,
      missingRows
    }
  };
}

function updateDataManagerPreview(summary){
  const summaryText = document.getElementById('dmSummaryText');
  const kpis = document.getElementById('dmKpis');
  const previewBody = document.getElementById('dmPreviewBody');
  if (!summaryText || !kpis || !previewBody) return;

  const schoolText = summary.schoolIdentity?.schoolId
    ? ` | School ID: ${summary.schoolIdentity.schoolId}`
    : '';
  const exporterText = summary.packageExportedByProfileKey
    ? ` | Exported By: ${summary.packageExportedByProfileKey}`
    : '';
  summaryText.textContent = `Package: ${summary.packageType} | Schema: ${summary.schemaVersion || 'legacy'}${schoolText}${exporterText} | Incoming: ${summary.totalIncoming} (ICS: ${summary.incomingICS || 0}, PAR: ${summary.incomingPAR || 0})`;
  kpis.innerHTML = `
    <div class="dm-kpi"><div class="k">Incoming</div><div class="v">${summary.totalIncoming}</div></div>
    <div class="dm-kpi"><div class="k">Valid</div><div class="v">${summary.valid}</div></div>
    <div class="dm-kpi ${summary.invalid ? 'err' : ''}"><div class="k">Invalid</div><div class="v">${summary.invalid}</div></div>
    <div class="dm-kpi"><div class="k">New</div><div class="v">${summary.newRecords}</div></div>
    <div class="dm-kpi ${summary.conflicts ? 'warn' : ''}"><div class="k">Conflicts</div><div class="v">${summary.conflicts}</div></div>
    <div class="dm-kpi ${summary.inFileDuplicates ? 'warn' : ''}"><div class="k">In-file Duplicates</div><div class="v">${summary.inFileDuplicates}</div></div>
    <div class="dm-kpi ${summary.migratedTraceKeys ? 'warn' : ''}"><div class="k">Trace Migrated</div><div class="v">${summary.migratedTraceKeys || 0}</div></div>
  `;
  const rows = summary.rows.slice(0, 120);
  previewBody.innerHTML = rows.length ? rows.map((r, idx) => {
    const note = r.notes.length ? r.notes.join(' | ') : '-';
    const recordCode = (r.recordType || 'ics') === 'par' ? 'PAR' : 'ICS';
    const recordNo = r.recordNo || r.icsNo || '';
    return `<tr>
      <td>${idx + 1}</td>
      <td>${escapeHTML(`${recordCode}-${recordNo}`)}</td>
      <td>${escapeHTML(r.entity || '')}</td>
      <td>${escapeHTML(r.status)}</td>
      <td>${escapeHTML(note)}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="5" class="empty-cell">No preview rows.</td></tr>';
}

function setDataManagerInlineStatus(type, message){
  const el = document.getElementById('dmInlineStatus');
  if (!el) return;
  if (!message){
    el.textContent = '';
    el.className = 'dm-inline-status';
    return;
  }
  const safeType = ['success', 'error', 'info'].includes(type) ? type : 'info';
  el.textContent = message;
  el.className = `dm-inline-status show ${safeType}`;
}

function setDataManagerStep3Ready(ready){
  const mark = document.getElementById('dmStep3Mark');
  const section = document.getElementById('dmStep3Section');
  if (mark) mark.classList.toggle('show', !!ready);
  if (section){
    section.style.borderColor = ready ? '#86efac' : '#dbe3ef';
    section.style.boxShadow = ready ? '0 0 0 2px rgba(134,239,172,.28)' : 'none';
  }
}

function renderDataImportHistory(){
  const list = document.getElementById('dmImportHistoryList');
  if (!list) return;
  const logs = getAuditLogs()
    .filter((log) => (log?.type || '').toString().toLowerCase() === 'import')
    .reverse();
  const recent = logs.slice(0, 5);
  if (!logs.length){
    list.innerHTML = '<li><span class="dm-history-time">No import history yet.</span></li>';
    return;
  }
  list.innerHTML = recent.map((log) => {
    const detail = escapeHTML((log?.detail || '').toString());
    const time = escapeHTML((log?.time || '').toString());
    return `<li>${detail}<br /><span class="dm-history-time">${time}</span></li>`;
  }).join('') + (logs.length > 5 ? '<li><span class="dm-history-time">Showing latest 5 entries. Open Import History for full list.</span></li>' : '');
}

function renderImportHistoryModal(){
  const body = document.getElementById('dmImportHistoryBody');
  if (!body) return;
  const logs = getAuditLogs()
    .filter((log) => (log?.type || '').toString().toLowerCase() === 'import')
    .reverse();
  if (!logs.length){
    body.innerHTML = '<div class="inspection-history-empty">No import history yet.</div>';
    return;
  }
  body.innerHTML = `
    <div class="detail-table-wrap">
      <table class="dm-preview-table">
        <thead>
          <tr><th>#</th><th>Detail</th><th>Time</th></tr>
        </thead>
        <tbody>
          ${logs.map((log, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${escapeHTML((log?.detail || '').toString())}</td>
              <td>${escapeHTML((log?.time || '').toString())}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function openImportHistoryModal(){
  const overlay = document.getElementById('dmImportHistoryOverlay');
  if (!overlay) return;
  renderImportHistoryModal();
  overlay.classList.add('show');
}

function closeImportHistoryModal(){
  document.getElementById('dmImportHistoryOverlay')?.classList?.remove('show');
}

function resetDataManagerPreview(){
  dataManagerState = {
    sourceName: '',
    mode: 'merge',
    summary: null,
    parsedPayload: null,
    conflicts: [],
    verification: null,
    migrationRows: []
  };
  const fileName = document.getElementById('dmFileName');
  if (fileName) fileName.textContent = 'No file selected.';
  updateDataManagerPreview({
    packageType: 'none',
    schemaVersion: '-',
    totalIncoming: 0,
    incomingICS: 0,
    incomingPAR: 0,
    valid: 0,
    invalid: 0,
    conflicts: 0,
    inFileDuplicates: 0,
    migratedTraceKeys: 0,
    newRecords: 0,
    rows: []
  });
  const merge = document.querySelector('input[name="dmMode"][value="merge"]');
  if (merge) merge.checked = true;
  setDataManagerInlineStatus('', '');
  setDataManagerStep3Ready(false);
  renderDataManagerVerificationStatus(null);
  updateDataManagerApplyState();
}

function openDataHubModal(){
  if (!requireAccess('open_data_manager')){
    return;
  }
  if (!hasRoleCapability('import_data') && !hasRoleCapability('export_data')){
    notify('error', 'Your role cannot open Data Hub.');
    return;
  }
  if (!dataHubOverlay) return;
  closeDataImportModal();
  closeDataValidationModal();
  closeDataExportModal();
  dataHubOverlay.classList.add('show');
}

function closeDataHubModal(){
  if (!dataHubOverlay) return;
  dataHubOverlay.classList.remove('show');
}

function openDataImportModal(openSource = ''){
  if (!requireAccess('import_json', { label: 'open Import Center' })){
    notify('error', 'Your role cannot open Import Center.');
    return;
  }
  if (!dataImportOverlay) return;
  closeDataHubModal();
  closeDataValidationModal();
  if (!dataManagerState.summary) resetDataManagerPreview();
  else setDataManagerStep3Ready(!!dataManagerState.verification?.ok);
  if (dataExportOverlay?.classList?.contains('show')) dataExportOverlay.classList.remove('show');
  dataImportOverlay.classList.add('show');
  renderDataImportHistory();
  updateDataManagerApplyState();
  const fileName = document.getElementById('dmFileName');
  if (fileName && fileName.textContent === 'No file selected.'){
    const openedFromWidget = (openSource || '').toString().toLowerCase() === 'widget';
    if (openedFromWidget) notifyCenter('info', 'Choose a JSON file to preview and import.');
    else notify('info', 'Choose a JSON file to preview and import.');
  }
}

function closeDataImportModal(){
  if (!dataImportOverlay) return;
  dataImportOverlay.classList.remove('show');
  closeImportHistoryModal();
}

function openDataValidationModal(){
  if (!dataValidationOverlay) return;
  if (!dataManagerState.summary){
    notify('error', 'No validation preview available. Choose a file first.');
    setDataManagerInlineStatus('error', 'No validation preview available. Choose a file first.');
    return;
  }
  closeDataHubModal();
  if (dataImportOverlay?.classList?.contains('show')) dataImportOverlay.classList.remove('show');
  dataValidationOverlay.classList.add('show');
  renderDataManagerVerificationStatus(dataManagerState.verification);
  updateDataManagerApplyState();
}

function closeDataValidationModal(){
  if (!dataValidationOverlay) return;
  dataValidationOverlay.classList.remove('show');
}

function openDataExportModal(){
  if (!requireAccess('export_data', { label: 'open Export Center' })){
    notify('error', 'Your role cannot open Export Center.');
    return;
  }
  if (!dataExportOverlay) return;
  closeDataHubModal();
  closeDataValidationModal();
  refreshDataManagerExportFilters();
  if (dataImportOverlay?.classList?.contains('show')) dataImportOverlay.classList.remove('show');
  dataExportOverlay.classList.add('show');
}

function closeDataExportModal(){
  if (!dataExportOverlay) return;
  dataExportOverlay.classList.remove('show');
}

function openDataManagerModal(defaultMode = 'import', openSource = ''){
  const mode = (defaultMode || '').toLowerCase();
  const canImport = hasRoleCapability('import_data');
  const canExport = hasRoleCapability('export_data');
  if (!canImport && !canExport){
    notify('error', `Access denied. ${normalizeRoleLabel(currentUser?.role)} role cannot open Data Manager.`);
    return;
  }
  if (!requireAccess('open_data_manager', { label: 'opening Data Manager' })) return;
  if (mode === 'import' && !canImport){
    notify('error', 'Your role cannot import data. Opening Export Center instead.');
    openDataExportModal();
    return;
  }
  if (mode === 'export' && !canExport){
    notify('error', 'Your role cannot export data.');
    return;
  }
  if (mode === 'import') openDataImportModal(openSource);
  else if (mode === 'export') openDataExportModal();
  else if (!canImport && canExport) openDataExportModal();
  else openDataHubModal();
}

function closeDataManagerModal(){
  closeDataHubModal();
  closeDataImportModal();
  closeDataValidationModal();
  closeDataExportModal();
}

function triggerDataManagerFile(){
  if (!requireAccess('import_json', { label: 'select import JSON file' })) return;
  if (!dataManagerImportInput) return;
  dataManagerImportInput.click();
}

function triggerDataManagerValidateFile(){
  if (!requireAccess('import_json', { label: 'validate import JSON file' })) return;
  if (!dataManagerValidateInput) return;
  dataManagerValidateInput.click();
}

function handleDataManagerValidateFile(event){
  if (!requireAccess('import_json', { label: 'validate import JSON data' })){
    notify('error', 'Your role cannot validate import JSON.');
    if (event?.target) event.target.value = '';
    return;
  }
  const file = event?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const result = analyzeTraceCoverageForPayload(payload, file.name);
      if (!result.ok){
        notify('error', result.reason || 'Trace validation failed.');
        showModal('Trace Validation', result.reason || 'Unsupported JSON payload.');
        return;
      }
      const s = result.summary;
      const rows = s.missingRows || [];
      const sample = rows.slice(0, 12).map((row) => {
        const code = (row.recordType || 'ics') === 'par' ? 'PAR' : 'ICS';
        return `${code}-${row.recordNo || `Row ${row.index}`}: ${row.missing}`;
      }).join(' | ');
      const more = rows.length > 12 ? ` | +${rows.length - 12} more` : '';
      const exportedBy = s.exportedByProfileKey ? ` | ExportedBy: ${s.exportedByProfileKey}` : '';
      const msg = [
        `File: ${s.sourceName || file.name}`,
        `Package: ${s.packageType} | Schema: ${s.schemaVersion}${exportedBy}`,
        `Incoming: ${s.totalIncoming} (ICS: ${s.incomingICS || 0}, PAR: ${s.incomingPAR || 0}) | Invalid records: ${s.invalidRecords}`,
        `Missing trace fields: ${s.stats.totalMissing}`,
        `StatusMeta missing: ${s.stats.statusMetaMissingByProfileKey}`,
        `Inspection logs missing: ${s.stats.inspectionLogsMissingProfileKey}`,
        `Waste reports missing: ${s.stats.wasteReportsMissingProfileKey}`,
        `WasteReportMeta missing: ${s.stats.wasteReportMetaMissingProfileKey}`,
        rows.length ? `Rows with missing trace: ${rows.length} | ${sample}${more}` : 'Rows with missing trace: 0'
      ].join('\n');
      if (s.stats.totalMissing > 0){
        notify('info', `Trace validation found ${s.stats.totalMissing} missing profile-key field(s).`);
      } else {
        notify('success', 'Trace validation passed. No missing profile-key fields found.');
      }
      showModal('Trace Validation Report', msg);
    } catch {
      notify('error', `Trace validation failed for ${file.name}. Invalid JSON format.`);
      showModal('Trace Validation', 'Selected file is not a valid JSON package.');
    } finally {
      event.target.value = '';
    }
  };
  reader.onerror = () => {
    notify('error', `Trace validation failed for ${file.name}.`);
    showModal('Trace Validation', 'Unable to read selected file.');
    event.target.value = '';
  };
  reader.readAsText(file);
}

function handleDataManagerFile(event){
  if (!requireAccess('import_json', { label: 'import data' })){
    notify('error', 'Your role cannot import data.');
    if (event?.target) event.target.value = '';
    return;
  }
  const file = event?.target?.files?.[0];
  if (!file) return;
  const fileName = document.getElementById('dmFileName');
  if (fileName) fileName.textContent = file.name;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const payload = JSON.parse(reader.result);
      const result = analyzeImportPayload(payload, file.name);
      if (!result.ok){
        dataManagerState.summary = null;
        dataManagerState.parsedPayload = null;
        dataManagerState.verification = null;
        dataManagerState.migrationRows = [];
        notify('error', result.reason || 'Import preview failed.');
        setDataManagerInlineStatus('error', result.reason || 'Import preview failed.');
        setDataManagerStep3Ready(false);
        renderDataManagerVerificationStatus(null);
        updateDataManagerApplyState();
        showModal('Import Error', result.reason || 'Unsupported JSON payload.');
        return;
      }
      dataManagerState.summary = result.summary;
      dataManagerState.parsedPayload = result.parsed;
      dataManagerState.sourceName = file.name;
      dataManagerState.migrationRows = Array.isArray(result.summary?.migrationRows) ? result.summary.migrationRows : [];
      dataManagerState.conflicts = result.summary.rows
        .filter((r) => r.status !== 'valid')
        .map((r) => ({
          recordType: r.recordType || 'ics',
          recordNo: r.recordNo || r.icsNo || '',
          status: r.status,
          notes: r.notes
        }));
      const verification = await verifyImportPackageForRestore(payload, result.parsed, result.summary);
      dataManagerState.verification = verification;
      updateDataManagerPreview(result.summary);
      renderDataManagerVerificationStatus(verification);
      setDataManagerInlineStatus(
        verification.ok ? (verification.level === 'warn' ? 'info' : 'success') : 'error',
        verification.ok
          ? `Preview ready for ${result.summary.totalIncoming} record(s) (ICS: ${result.summary.incomingICS || 0}, PAR: ${result.summary.incomingPAR || 0}). Verification: ${verification.message}`
          : `Preview blocked. ${verification.message}`
      );
      setDataManagerStep3Ready(verification.ok);
      openDataValidationModal();
      updateDataManagerApplyState();
      if (verification.ok){
        notify('success', `Preview loaded: ${result.summary.totalIncoming} record(s) (ICS: ${result.summary.incomingICS || 0}, PAR: ${result.summary.incomingPAR || 0}).`);
      } else {
        notify('error', verification.message || 'Restore verification failed.');
      }
    } catch (err){
      dataManagerState.summary = null;
      dataManagerState.parsedPayload = null;
      dataManagerState.migrationRows = [];
      notify('error', `Import failed for ${file.name}. Invalid JSON format.`);
      setDataManagerInlineStatus('error', `Import failed for ${file.name}. Invalid JSON format.`);
      setDataManagerStep3Ready(false);
      dataManagerState.verification = null;
      renderDataManagerVerificationStatus(null);
      updateDataManagerApplyState();
      showModal('Import Error', 'Selected file is not a valid JSON package.');
    } finally {
      event.target.value = '';
    }
  };
  reader.onerror = () => {
    dataManagerState.summary = null;
    dataManagerState.parsedPayload = null;
    dataManagerState.verification = null;
    dataManagerState.migrationRows = [];
    notify('error', `Import failed for ${file.name}.`);
    setDataManagerStep3Ready(false);
    renderDataManagerVerificationStatus(null);
    updateDataManagerApplyState();
    showModal('Import Error', 'Unable to read selected file.');
    event.target.value = '';
  };
  reader.readAsText(file);
}

function refreshAfterDataImport(){
  loadICSRecords();
  refreshDataManagerExportFilters();
  renderProfileTraceIntegritySummary();
  const active = activeViewKey();
  if (active === 'Dashboard') initDashboardView();
  if (active === 'Action Center') initActionsView();
  if (active === 'Archives') initArchivesView();
}

function applyDataManagerImport(){
  if (!requireAccess('apply_import', { label: 'applying import' })) return;
  const summary = dataManagerState.summary;
  if (!summary){
    notify('error', 'No import preview available. Choose a file first.');
    setDataManagerInlineStatus('error', 'No import preview available. Choose a file first.');
    return;
  }
  if (!dataManagerState.verification?.ok){
    const msg = dataManagerState.verification?.message || 'Restore verification failed. Import blocked.';
    notify('error', msg);
    setDataManagerInlineStatus('error', msg);
    openDataValidationModal();
    return;
  }
  captureUndoSnapshot(`import-apply:${dataManagerState.sourceName || 'json'}`);
  const mode = document.querySelector('input[name="dmMode"]:checked')?.value || 'merge';
  dataManagerState.mode = mode;
  const migratedTraceKeys = Number(summary.migratedTraceKeys || 0);
  const recordsByType = {
    ics: JSON.parse(localStorage.getItem('icsRecords') || '[]'),
    par: JSON.parse(localStorage.getItem('parRecords') || '[]')
  };
  const byKeyByType = {
    ics: new Map((recordsByType.ics || []).map((r, i) => [normalizeICSKey(resolveImportRecordNo(r, 'ics')), i])),
    par: new Map((recordsByType.par || []).map((r, i) => [normalizeICSKey(resolveImportRecordNo(r, 'par')), i]))
  };
  let added = 0;
  let replaced = 0;
  let skipped = 0;
  let addedICS = 0;
  let addedPAR = 0;
  let replacedICS = 0;
  let replacedPAR = 0;

  summary.rows.forEach((row) => {
    if (row.status !== 'valid' && row.status !== 'conflict-existing'){
      skipped += 1;
      return;
    }
    const recordType = resolveImportRecordType(row.recordType || 'ics');
    const key = normalizeICSKey(resolveImportRecordNo(row.record, recordType));
    if (!key){
      skipped += 1;
      return;
    }
    const records = recordsByType[recordType] || [];
    const byKey = byKeyByType[recordType];
    const existingIdx = byKey.has(key) ? byKey.get(key) : -1;
    const normalizedRecord = JSON.parse(JSON.stringify(row.record || {}));
    if (recordType === 'par'){
      normalizedRecord.parNo = normalizedRecord.parNo || normalizedRecord.icsNo || '';
    }
    if (existingIdx >= 0){
      if (mode === 'replace'){
        records[existingIdx] = attachRecordStatusMeta(normalizedRecord, 'imported');
        replaced += 1;
        if (recordType === 'par') replacedPAR += 1;
        else replacedICS += 1;
      } else {
        skipped += 1;
      }
      return;
    }
    records.push(attachRecordStatusMeta(normalizedRecord, 'imported'));
    byKey.set(key, records.length - 1);
    added += 1;
    if (recordType === 'par') addedPAR += 1;
    else addedICS += 1;
  });

  localStorage.setItem('icsRecords', JSON.stringify(recordsByType.ics || []));
  localStorage.setItem('parRecords', JSON.stringify(recordsByType.par || []));
  localStorage.setItem('icsLastImportAt', new Date().toISOString());
  recordAudit('import', `Data Manager import (${mode}) from ${dataManagerState.sourceName || 'JSON'}: +${added} (ICS:${addedICS}, PAR:${addedPAR}), replaced ${replaced} (ICS:${replacedICS}, PAR:${replacedPAR}), skipped ${skipped}`, {
    mode,
    sourceName: dataManagerState.sourceName || 'JSON',
    added,
    addedICS,
    addedPAR,
    replaced,
    replacedICS,
    replacedPAR,
    skipped
  });
  renderDataImportHistory();
  refreshAfterDataImport();
  closeDataValidationModal();
  if (!dataImportOverlay?.classList?.contains('show')) openDataImportModal();
  else renderDataImportHistory();
  setDataManagerInlineStatus('success', `Import successful. Added: ${added} (ICS:${addedICS}, PAR:${addedPAR}), Replaced: ${replaced} (ICS:${replacedICS}, PAR:${replacedPAR}), Skipped: ${skipped}.`);
  notify('success', `Data import complete. Added: ${added} (ICS:${addedICS}, PAR:${addedPAR}), Replaced: ${replaced} (ICS:${replacedICS}, PAR:${replacedPAR}), Skipped: ${skipped}.`);
  if (migratedTraceKeys > 0){
    notify('info', `Legacy trace migration applied: ${migratedTraceKeys} missing profile-key field(s) auto-filled.`);
  }
  renderProfileTraceIntegritySummary();
}

function downloadJSONPayload(payload, fileName){
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ensureRecordTraceProfileKeysForExport(records){
  return (records || []).map((record) => {
    const next = JSON.parse(JSON.stringify(record || {}));
    const lineage = normalizeRecordLineage(next._lineage || next.lineage);
    if (lineage) next._lineage = lineage;
    const statusMeta = normalizeStatusMeta(next._statusMeta || next.statusMeta);
    if (statusMeta){
      const byProfileKey = normalizeProfileKeyValue(statusMeta.byProfileKey || statusMeta.by || '') || 'unknown-profile';
      statusMeta.by = byProfileKey;
      statusMeta.byProfileKey = byProfileKey;
      const sourceByProfileKey = normalizeProfileKeyValue(statusMeta.sourceByProfileKey || statusMeta.sourceBy || '');
      if (sourceByProfileKey){
        statusMeta.sourceBy = sourceByProfileKey;
        statusMeta.sourceByProfileKey = sourceByProfileKey;
      }
      next._statusMeta = statusMeta;
    }
    const items = Array.isArray(next.items) ? next.items : [];
    next.items = items.map((item) => {
      const row = { ...(item || {}) };
      const inspections = Array.isArray(row.inspections) ? row.inspections : [];
      if (inspections.length){
        row.inspections = inspections.map((raw) => {
          const log = { ...(raw || {}) };
          const recordedBy = normalizeProfileKeyValue(log.recordedByProfileKey || log.recordedBy || log.by || '') || 'unknown-profile';
          log.recordedByProfileKey = recordedBy;
          if (log.reportPreparedAt){
            log.reportPreparedByProfileKey = normalizeProfileKeyValue(log.reportPreparedByProfileKey || log.reportPreparedBy || '') || 'unknown-profile';
          }
          return log;
        });
      }
      if (row.wasteReport && typeof row.wasteReport === 'object'){
        row.wasteReport = { ...row.wasteReport };
        if (row.wasteReport.preparedAt){
          row.wasteReport.preparedByProfileKey = normalizeProfileKeyValue(row.wasteReport.preparedByProfileKey || row.wasteReport.preparedBy || '') || 'unknown-profile';
        }
      }
      return row;
    });
    if (next.wasteReportMeta && typeof next.wasteReportMeta === 'object' && next.wasteReportMeta.lastPreparedAt){
      next.wasteReportMeta = { ...next.wasteReportMeta };
      next.wasteReportMeta.lastPreparedByProfileKey = normalizeProfileKeyValue(next.wasteReportMeta.lastPreparedByProfileKey || next.wasteReportMeta.preparedByProfileKey || '') || 'unknown-profile';
    }
    return next;
  });
}

function ensureArchivedTraceProfileKeysForExport(items){
  return (items || []).map((entry) => {
    const next = JSON.parse(JSON.stringify(entry || {}));
    next.archivedByProfileKey = normalizeProfileKeyValue(next.archivedByProfileKey || '') || 'unknown-profile';
    if (next.disposal && typeof next.disposal === 'object'){
      next.disposal = { ...next.disposal };
      next.disposal.approvedByProfileKey = normalizeProfileKeyValue(next.disposal.approvedByProfileKey || '') || 'unknown-profile';
    }
    return next;
  });
}

function ensureAuditTraceProfileKeysForExport(logs){
  return (logs || []).map((log) => {
    const next = { ...(log || {}) };
    next.actorProfileKey = normalizeProfileKeyValue(next.actorProfileKey || '') || 'unknown-profile';
    next.actorRole = normalizeRoleLabel(next.actorRole || 'encoder');
    next.actorDeviceId = (next.actorDeviceId || '').toString().trim() || 'unknown-device';
    next.actorSessionId = (next.actorSessionId || '').toString().trim() || 'unknown-session';
    return next;
  });
}

function ensureNotificationTraceProfileKeysForExport(items){
  return (items || []).map((entry) => {
    const next = { ...(entry || {}) };
    next.actorProfileKey = normalizeProfileKeyValue(next.actorProfileKey || '') || 'unknown-profile';
    return next;
  });
}

function getRecordYearMonth(record){
  const issued = normalizeDateYMD(record?.issuedDate || record?.signatories?.issuedBy?.date || '');
  const fromDate = issued.match(/^(\d{4})-(\d{2})-/);
  if (fromDate){
    return { year: fromDate[1], month: fromDate[2] };
  }
  const fromIcs = (record?.icsNo || '').toString().trim().match(/^(\d{4})-(\d{2})-/);
  if (fromIcs){
    return { year: fromIcs[1], month: fromIcs[2] };
  }
  return { year: '', month: '' };
}

function getDataManagerExportFilters(){
  const year = (document.getElementById('dmExportYear')?.value || 'all').trim();
  const month = (document.getElementById('dmExportMonth')?.value || 'all').trim();
  return { year, month };
}

function filterRecordsByYearMonth(records, filters){
  const year = filters?.year || 'all';
  const month = filters?.month || 'all';
  return (records || []).filter((record) => {
    const ym = getRecordYearMonth(record);
    if (!ym.year && !ym.month) return year === 'all' && month === 'all';
    if (year !== 'all' && ym.year !== year) return false;
    if (month !== 'all' && ym.month !== month) return false;
    return true;
  });
}

function updateDataManagerExportFilterHint(){
  const hint = document.getElementById('dmExportFilterHint');
  if (!hint) return;
  const icsRecords = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const parRecords = JSON.parse(localStorage.getItem('parRecords') || '[]');
  const filters = getDataManagerExportFilters();
  const filteredICS = filterRecordsByYearMonth(icsRecords, filters);
  const filteredPAR = filterRecordsByYearMonth(parRecords, filters);
  const filteredTotal = filteredICS.length + filteredPAR.length;
  const labelYear = filters.year === 'all' ? 'All Years' : filters.year;
  const labelMonth = filters.month === 'all'
    ? 'All Months'
    : (document.querySelector(`#dmExportMonth option[value="${filters.month}"]`)?.textContent || filters.month);
  hint.textContent = `Records export filter: ${labelYear} / ${labelMonth} (${filteredTotal} total: ICS ${filteredICS.length}, PAR ${filteredPAR.length}). Full package export remains unfiltered.`;
}

function refreshDataManagerExportFilters(){
  const yearSelect = document.getElementById('dmExportYear');
  const monthSelect = document.getElementById('dmExportMonth');
  if (!yearSelect || !monthSelect) return;
  const icsRecords = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const parRecords = JSON.parse(localStorage.getItem('parRecords') || '[]');
  const records = [...icsRecords, ...parRecords];
  const selectedYear = yearSelect.value || 'all';
  const selectedMonth = monthSelect.value || 'all';
  const years = [...new Set(records.map((record) => getRecordYearMonth(record).year).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));
  const yearCountMap = years.reduce((map, year) => {
    map[year] = records.filter((record) => getRecordYearMonth(record).year === year).length;
    return map;
  }, {});
  yearSelect.innerHTML = `<option value="all">All Years (${records.length})</option>`
    + years.map((year) => `<option value="${year}">${year} (${yearCountMap[year] || 0})</option>`).join('');
  yearSelect.value = years.includes(selectedYear) ? selectedYear : 'all';

  const activeYear = yearSelect.value || 'all';
  const monthNames = {
    '01': 'January', '02': 'February', '03': 'March', '04': 'April',
    '05': 'May', '06': 'June', '07': 'July', '08': 'August',
    '09': 'September', '10': 'October', '11': 'November', '12': 'December'
  };
  const monthKeys = Object.keys(monthNames);
  const monthPool = activeYear === 'all'
    ? records
    : records.filter((record) => getRecordYearMonth(record).year === activeYear);
  const monthCountMap = monthKeys.reduce((map, key) => {
    map[key] = monthPool.filter((record) => getRecordYearMonth(record).month === key).length;
    return map;
  }, {});
  monthSelect.innerHTML = `<option value="all">All Months (${monthPool.length})</option>`
    + monthKeys.map((key) => `<option value="${key}">${monthNames[key]} (${monthCountMap[key] || 0})</option>`).join('');
  monthSelect.value = monthKeys.includes(selectedMonth) ? selectedMonth : 'all';
  updateDataManagerExportFilterHint();
}

function buildSchemaVersionedExport(scope = 'records', options = {}){
  const allIcsRecords = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const allParRecords = JSON.parse(localStorage.getItem('parRecords') || '[]');
  const filters = options?.recordFilters || { year: 'all', month: 'all' };
  const icsRecords = scope === 'records'
    ? filterRecordsByYearMonth(allIcsRecords, filters)
    : allIcsRecords;
  const parRecords = scope === 'records'
    ? filterRecordsByYearMonth(allParRecords, filters)
    : allParRecords;
  const exportIcsRecords = ensureRecordTraceProfileKeysForExport(icsRecords);
  const exportParRecords = ensureRecordTraceProfileKeysForExport(parRecords);
  const base = {
    schemaVersion: ICS_SCHEMA_VERSION,
    packageType: scope === 'full' ? 'full-backup' : 'records',
    exportedAt: new Date().toISOString(),
    exportedByProfileKey: getCurrentActorProfileKey(),
    app: 'DSIS V1',
    schoolIdentity: normalizeSchoolIdentity(schoolIdentity),
    data: {
      records: exportIcsRecords,
      parRecords: exportParRecords
    }
  };
  if (scope === 'records'){
    base.exportFilter = {
      year: filters.year || 'all',
      month: filters.month || 'all'
    };
  }
  if (scope === 'full'){
    base.data.archives = ensureArchivedTraceProfileKeysForExport(getArchivedItems());
    base.data.notifications = ensureNotificationTraceProfileKeysForExport(JSON.parse(localStorage.getItem('icsNotifications') || '[]'));
    base.data.auditLogs = ensureAuditTraceProfileKeysForExport(getAuditLogs());
  }
  return base;
}

async function exportSchemaVersionedData(scope = 'records'){
  if (!requireAccess('export_data', { label: 'exporting backup/package data' })) return;
  const filters = getDataManagerExportFilters();
  const basePayload = buildSchemaVersionedExport(scope, { recordFilters: filters });
  const integrityResult = await attachPackageIntegrity(basePayload);
  if (!integrityResult.ok){
    notify('error', integrityResult.reason || 'Unable to generate export checksum.');
    setDataManagerInlineStatus('error', integrityResult.reason || 'Unable to generate export checksum.');
    return;
  }
  const payload = integrityResult.payload;
  const filteredIcsCount = Array.isArray(payload?.data?.records) ? payload.data.records.length : 0;
  const filteredParCount = Array.isArray(payload?.data?.parRecords) ? payload.data.parRecords.length : 0;
  const filteredTotal = filteredIcsCount + filteredParCount;
  const exportTypeTag = filteredIcsCount && filteredParCount
    ? 'ics-par'
    : (filteredParCount ? 'par' : 'ics');
  if (scope === 'records' && filteredTotal === 0){
    notify('error', 'No ICS/PAR records match the selected Year/Month filter.');
    setDataManagerInlineStatus('error', 'No ICS/PAR records match the selected Year/Month filter.');
    return;
  }
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const suffix = scope === 'records'
    ? `-${filters.year || 'all'}-${filters.month || 'all'}`
    : '';
  const fileName = scope === 'full'
    ? `dsis-schema-v${ICS_SCHEMA_VERSION.replace(/\./g,'_')}-full-${exportTypeTag}-${stamp}.json`
    : `dsis-schema-v${ICS_SCHEMA_VERSION.replace(/\./g,'_')}-records-${exportTypeTag}${suffix}-${stamp}.json`;
  downloadJSONPayload(payload, fileName);
  if (scope === 'full'){
    localStorage.setItem('icsLastFullBackupAt', new Date().toISOString());
    initDashboardView();
  }
  const checksumShort = (payload.integrity?.checksum || '').slice(0, 12);
  recordAudit('backup', `Exported ${scope} package (${fileName}) [sha256:${checksumShort}]`);
  if (scope === 'records'){
    setDataManagerInlineStatus('success', `Exported ${filteredTotal} filtered record(s): ICS ${filteredIcsCount}, PAR ${filteredParCount} (${fileName})`);
  } else {
    setDataManagerInlineStatus('success', `Exported full package: ${fileName}`);
  }
  notify('success', `Exported ${scope} package: ${fileName}`);
}

function downloadDataManagerConflictReport(){
  if (!dataManagerState.summary){
    notify('error', 'No preview available for conflict report.');
    return;
  }
  const items = dataManagerState.summary.rows.filter((r) => r.status !== 'valid');
  if (!items.length){
    notify('info', 'No conflicts or invalid rows to export.');
    return;
  }
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceName: dataManagerState.sourceName || '',
    mode: dataManagerState.mode || 'merge',
    schemaVersion: dataManagerState.summary.schemaVersion || 'legacy',
    issues: items.map((r) => ({
      recordType: r.recordType || 'ics',
      recordNo: r.recordNo || r.icsNo,
      entity: r.entity,
      status: r.status,
      notes: r.notes
    }))
  };
  downloadJSONPayload(payload, 'dsis-import-conflict-report.json');
  notify('success', `Conflict report exported (${items.length} row(s)).`);
}

function openDataManagerMigrationReport(){
  const summary = dataManagerState.summary;
  if (!summary){
    notify('error', 'No validation preview available.');
    return;
  }
  const rows = Array.isArray(dataManagerState.migrationRows) ? dataManagerState.migrationRows : [];
  if (!rows.length){
    showModal('Migration Details', 'No auto-migration was needed. All imported trace profile-key fields were already present.');
    return;
  }
  const normalizeFieldPath = (path) => {
    const raw = (path || '').toString().trim();
    if (!raw) return 'unknown';
    return raw.replace(/\[\d+\]/g, '[]');
  };

  const limitRows = 12;
  const limitFieldTypes = 8;
  const lines = [
    `Auto-migrated rows: ${rows.length}`,
    `Total fields repaired: ${summary.migratedTraceKeys || 0}`,
    ''
  ];

  rows.slice(0, limitRows).forEach((row, idx) => {
    const code = (row.recordType || 'ics') === 'par' ? 'PAR' : 'ICS';
    const id = row.recordNo ? `${code}-${row.recordNo}` : (row.icsNo || `Row ${row.index || (idx + 1)}`);
    const fields = Array.isArray(row.fields) ? row.fields : [];
    const grouped = {};
    fields.forEach((fieldPath) => {
      const key = normalizeFieldPath(fieldPath);
      grouped[key] = (grouped[key] || 0) + 1;
    });
    const groupedPairs = Object.entries(grouped).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });

    lines.push(`${idx + 1}. ${id} (${row.migrated || fields.length} field(s))`);
    if (!groupedPairs.length){
      lines.push('   - fields unavailable');
      return;
    }
    groupedPairs.slice(0, limitFieldTypes).forEach(([field, count]) => {
      lines.push(`   - ${field}: ${count}`);
    });
    if (groupedPairs.length > limitFieldTypes){
      lines.push(`   - ... +${groupedPairs.length - limitFieldTypes} more field type(s)`);
    }
  });

  if (rows.length > limitRows){
    lines.push('');
    lines.push(`+${rows.length - limitRows} more row(s) not shown.`);
  }

  showModal('Migration Details', lines.join('\n'));
}


