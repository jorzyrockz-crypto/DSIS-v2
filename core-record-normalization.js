function normalizeStatusMeta(meta){
  if (!meta || typeof meta !== 'object') return null;
  const typeRaw = (meta.type || '').toString().trim().toLowerCase();
  const type = ['new', 'imported', 'updated'].includes(typeRaw) ? typeRaw : '';
  const at = normalizeDateTimeISO(meta.at || '');
  const byProfileKey = normalizeProfileKeyValue(meta.byProfileKey || meta.by || '');
  const sourceByProfileKey = normalizeProfileKeyValue(meta.sourceByProfileKey || meta.sourceBy || '');
  const sourceAt = normalizeDateTimeISO(meta.sourceAt || '');
  const sourceType = (meta.sourceType || '').toString().trim().toLowerCase();
  if (!type && !at && !byProfileKey && !sourceByProfileKey && !sourceAt && !sourceType) return null;
  const next = {};
  if (type) next.type = type;
  if (at) next.at = at;
  if (byProfileKey){
    next.by = byProfileKey;
    next.byProfileKey = byProfileKey;
  }
  if (sourceByProfileKey){
    next.sourceBy = sourceByProfileKey;
    next.sourceByProfileKey = sourceByProfileKey;
  }
  if (sourceAt) next.sourceAt = sourceAt;
  if (sourceType) next.sourceType = sourceType;
  return Object.keys(next).length ? next : null;
}

function normalizeInspectionLogs(logs){
  if (!Array.isArray(logs)) return [];
  return logs.map((raw) => {
    const log = raw && typeof raw === 'object' ? raw : {};
    const status = (log.status || '').toString().trim().toLowerCase();
    const next = {
      status,
      reason: (log.reason || '').toString().trim(),
      date: normalizeDateYMD(log.date || ''),
      notes: (log.notes || '').toString().trim(),
      recordedAt: normalizeDateTimeISO(log.recordedAt || ''),
      reportPreparedAt: normalizeDateTimeISO(log.reportPreparedAt || '')
    };
    const recordedByProfileKey = normalizeProfileKeyValue(log.recordedByProfileKey || log.recordedBy || log.by || '');
    const reportPreparedByProfileKey = normalizeProfileKeyValue(log.reportPreparedByProfileKey || log.reportPreparedBy || '');
    if (recordedByProfileKey) next.recordedByProfileKey = recordedByProfileKey;
    if (reportPreparedByProfileKey) next.reportPreparedByProfileKey = reportPreparedByProfileKey;
    return next;
  });
}

function normalizeWasteReportPayload(payload){
  if (!payload || typeof payload !== 'object') return null;
  const next = {
    placeOfStorage: (payload.placeOfStorage || '').toString().trim(),
    certifiedCorrect: (payload.certifiedCorrect || '').toString().trim(),
    disposalApproved: (payload.disposalApproved || '').toString().trim(),
    inspectionOfficer: (payload.inspectionOfficer || '').toString().trim(),
    witnessToDisposal: (payload.witnessToDisposal || '').toString().trim(),
    notes: (payload.notes || '').toString().trim(),
    disposition: (payload.disposition || '').toString().trim(),
    dispositionItemNo: (payload.dispositionItemNo || '').toString().trim(),
    transferTo: (payload.transferTo || '').toString().trim(),
    officialReceiptNo: (payload.officialReceiptNo || '').toString().trim(),
    officialReceiptDate: normalizeDateYMD(payload.officialReceiptDate || ''),
    officialReceiptAmount: (payload.officialReceiptAmount || '').toString().trim(),
    hasSale: !!payload.hasSale,
    preparedAt: normalizeDateTimeISO(payload.preparedAt || '')
  };
  const preparedByProfileKey = normalizeProfileKeyValue(payload.preparedByProfileKey || payload.preparedBy || '');
  if (preparedByProfileKey) next.preparedByProfileKey = preparedByProfileKey;
  const hasData = Object.values(next).some((v) => (typeof v === 'boolean' ? v : !!v));
  return hasData ? next : null;
}

function normalizeWasteReportMeta(meta){
  if (!meta || typeof meta !== 'object') return null;
  const next = {
    placeOfStorage: (meta.placeOfStorage || '').toString().trim(),
    certifiedCorrect: (meta.certifiedCorrect || '').toString().trim(),
    disposalApproved: (meta.disposalApproved || '').toString().trim(),
    inspectionOfficer: (meta.inspectionOfficer || '').toString().trim(),
    witnessToDisposal: (meta.witnessToDisposal || '').toString().trim(),
    lastPreparedAt: normalizeDateTimeISO(meta.lastPreparedAt || meta.preparedAt || '')
  };
  const lastPreparedByProfileKey = normalizeProfileKeyValue(meta.lastPreparedByProfileKey || meta.preparedByProfileKey || '');
  if (lastPreparedByProfileKey) next.lastPreparedByProfileKey = lastPreparedByProfileKey;
  const hasData = Object.values(next).some(Boolean);
  return hasData ? next : null;
}

function migrateRecordTraceProfileKeysForImport(recordInput, fallbackProfileKey){
  const fallback = normalizeProfileKeyValue(fallbackProfileKey || '') || 'legacy-import-profile';
  const record = JSON.parse(JSON.stringify(recordInput || {}));
  let migrated = 0;
  const fields = [];

  const statusMeta = normalizeStatusMeta(record._statusMeta || record.statusMeta);
  if (statusMeta){
    const byProfileKey = normalizeProfileKeyValue(statusMeta.byProfileKey || statusMeta.by || '');
    if (!byProfileKey){
      statusMeta.by = fallback;
      statusMeta.byProfileKey = fallback;
      migrated += 1;
      fields.push('_statusMeta.byProfileKey');
    }
    const sourceByProfileKey = normalizeProfileKeyValue(statusMeta.sourceByProfileKey || statusMeta.sourceBy || '');
    if (sourceByProfileKey){
      statusMeta.sourceBy = sourceByProfileKey;
      statusMeta.sourceByProfileKey = sourceByProfileKey;
    }
    record._statusMeta = statusMeta;
  }

  const items = Array.isArray(record.items) ? record.items : [];
  record.items = items.map((item, itemIdx) => {
    const row = { ...(item || {}) };
    const logs = Array.isArray(row.inspections) ? row.inspections : [];
    if (logs.length){
      row.inspections = logs.map((raw, logIdx) => {
        const log = { ...(raw || {}) };
        const recordedBy = normalizeProfileKeyValue(log.recordedByProfileKey || log.recordedBy || log.by || '');
        if (!recordedBy){
          log.recordedByProfileKey = fallback;
          migrated += 1;
          fields.push(`items[${itemIdx}].inspections[${logIdx}].recordedByProfileKey`);
        } else {
          log.recordedByProfileKey = recordedBy;
        }
        if (log.reportPreparedAt){
          const reportPreparedBy = normalizeProfileKeyValue(log.reportPreparedByProfileKey || log.reportPreparedBy || '');
          if (!reportPreparedBy){
            log.reportPreparedByProfileKey = fallback;
            migrated += 1;
            fields.push(`items[${itemIdx}].inspections[${logIdx}].reportPreparedByProfileKey`);
          } else {
            log.reportPreparedByProfileKey = reportPreparedBy;
          }
        }
        return log;
      });
    }
    if (row.wasteReport && typeof row.wasteReport === 'object'){
      row.wasteReport = { ...row.wasteReport };
      if (row.wasteReport.preparedAt){
        const preparedBy = normalizeProfileKeyValue(row.wasteReport.preparedByProfileKey || row.wasteReport.preparedBy || '');
        if (!preparedBy){
          row.wasteReport.preparedByProfileKey = fallback;
          migrated += 1;
          fields.push(`items[${itemIdx}].wasteReport.preparedByProfileKey`);
        } else {
          row.wasteReport.preparedByProfileKey = preparedBy;
        }
      }
    }
    return row;
  });

  if (record.wasteReportMeta && typeof record.wasteReportMeta === 'object' && record.wasteReportMeta.lastPreparedAt){
    record.wasteReportMeta = { ...record.wasteReportMeta };
    const lastPreparedBy = normalizeProfileKeyValue(record.wasteReportMeta.lastPreparedByProfileKey || record.wasteReportMeta.preparedByProfileKey || '');
    if (!lastPreparedBy){
      record.wasteReportMeta.lastPreparedByProfileKey = fallback;
      migrated += 1;
      fields.push('wasteReportMeta.lastPreparedByProfileKey');
    } else {
      record.wasteReportMeta.lastPreparedByProfileKey = lastPreparedBy;
    }
  }
  return { record, migrated, fields };
}

function getTraceIntegrityStatsForRecords(records){
  const stats = {
    records: 0,
    statusMetaMissingByProfileKey: 0,
    inspectionLogs: 0,
    inspectionLogsMissingProfileKey: 0,
    wasteReports: 0,
    wasteReportsMissingProfileKey: 0,
    wasteReportMeta: 0,
    wasteReportMetaMissingProfileKey: 0,
    totalMissing: 0
  };
  (records || []).forEach((record) => {
    stats.records += 1;
    const statusMeta = normalizeStatusMeta(record?._statusMeta || record?.statusMeta);
    if (statusMeta && !normalizeProfileKeyValue(statusMeta.byProfileKey || statusMeta.by || '')){
      stats.statusMetaMissingByProfileKey += 1;
    }
    const items = Array.isArray(record?.items) ? record.items : [];
    items.forEach((item) => {
      const inspections = Array.isArray(item?.inspections) ? item.inspections : [];
      inspections.forEach((log) => {
        stats.inspectionLogs += 1;
        if (!normalizeProfileKeyValue(log?.recordedByProfileKey || log?.recordedBy || log?.by || '')){
          stats.inspectionLogsMissingProfileKey += 1;
        }
      });
      if (item?.wasteReport && typeof item.wasteReport === 'object' && item.wasteReport.preparedAt){
        stats.wasteReports += 1;
        if (!normalizeProfileKeyValue(item.wasteReport.preparedByProfileKey || item.wasteReport.preparedBy || '')){
          stats.wasteReportsMissingProfileKey += 1;
        }
      }
    });
    if (record?.wasteReportMeta && typeof record.wasteReportMeta === 'object' && record.wasteReportMeta.lastPreparedAt){
      stats.wasteReportMeta += 1;
      if (!normalizeProfileKeyValue(record.wasteReportMeta.lastPreparedByProfileKey || record.wasteReportMeta.preparedByProfileKey || '')){
        stats.wasteReportMetaMissingProfileKey += 1;
      }
    }
  });
  stats.totalMissing = stats.statusMetaMissingByProfileKey
    + stats.inspectionLogsMissingProfileKey
    + stats.wasteReportsMissingProfileKey
    + stats.wasteReportMetaMissingProfileKey;
  return stats;
}

function getLocalTraceIntegritySnapshot(){
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const stats = getTraceIntegrityStatsForRecords(records);
  const tamperedRecords = records.filter((record) => !verifyRecordLineage(record).ok).length;
  const archives = getArchivedItems();
  const audits = getAuditLogs();
  const archiveMissing = archives.filter((entry) => !normalizeProfileKeyValue(entry?.archivedByProfileKey || '')).length
    + archives.filter((entry) => entry?.disposal && !normalizeProfileKeyValue(entry.disposal.approvedByProfileKey || '')).length;
  const auditMissing = audits.filter((log) => !normalizeProfileKeyValue(log?.actorProfileKey || '')).length;
  const auditAttributionMissing = audits.filter((log) =>
    !(log?.actorDeviceId || '').toString().trim()
    || !(log?.actorSessionId || '').toString().trim()
  ).length;
  return {
    ...stats,
    archiveRows: archives.length,
    archiveMissing,
    auditRows: audits.length,
    auditMissing,
    auditAttributionMissing,
    tamperedRecords,
    totalMissing: stats.totalMissing + archiveMissing + auditMissing + auditAttributionMissing
  };
}

function ensureRecordLineageBaseline(){
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  if (!Array.isArray(records) || !records.length) return 0;
  let changed = 0;
  const next = records.map((record) => {
    if (normalizeRecordLineage(record?._lineage || record?.lineage)) return record;
    changed += 1;
    return appendRecordLineage(record, 'legacy_migration', 'baseline-lineage-init');
  });
  if (changed > 0){
    localStorage.setItem('icsRecords', JSON.stringify(next));
  }
  return changed;
}

function renderProfileTraceIntegritySummary(snapshot){
  const el = document.getElementById('profileTraceIntegritySummary');
  if (!el) return;
  const s = snapshot || getLocalTraceIntegritySnapshot();
  if (!s.totalMissing){
    const tamperText = s.tamperedRecords ? ` | Tamper alerts: ${s.tamperedRecords}` : '';
    el.textContent = `OK: profile-key trace complete across ${s.records} records, ${s.archiveRows} archives, and ${s.auditRows} audit logs.${tamperText}`;
    return;
  }
  const tamperText = s.tamperedRecords ? ` | Tamper alerts: ${s.tamperedRecords}` : '';
  const recordMissing = s.totalMissing - s.archiveMissing - s.auditMissing - (s.auditAttributionMissing || 0);
  el.textContent = `Missing trace/attribution fields: ${s.totalMissing} (records=${recordMissing}, archives=${s.archiveMissing}, auditProfile=${s.auditMissing}, auditDeviceSession=${s.auditAttributionMissing || 0}). Legacy imports are auto-migrated on preview.${tamperText}`;
}

function repairLocalTraceIntegrity(){
  if (!requireAccess('manage_roles', { label: 'repair trace integrity data' })) return;
  const baseline = getLocalTraceIntegritySnapshot();
  if (!baseline.totalMissing){
    notify('info', 'No missing trace/attribution fields found. Trace integrity already complete.');
    return;
  }
  captureUndoSnapshot('trace-integrity-repair');
  const fallback = getCurrentActorProfileKey();
  let touchedRecords = 0;
  let migratedRecordFields = 0;
  let migratedArchiveFields = 0;
  let migratedAuditFields = 0;
  let migratedNotificationFields = 0;

  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const repairedRecords = records.map((record) => {
    const migrated = migrateRecordTraceProfileKeysForImport(record, fallback);
    if (migrated.migrated > 0){
      touchedRecords += 1;
      migratedRecordFields += migrated.migrated;
      return appendRecordLineage(
        migrated.record,
        'maintenance',
        `trace-repair:${migrated.migrated}-field(s)`
      );
    }
    return migrated.record;
  });
  localStorage.setItem('icsRecords', JSON.stringify(repairedRecords));

  const archives = getArchivedItems();
  const repairedArchives = archives.map((entry) => {
    const next = JSON.parse(JSON.stringify(entry || {}));
    if (!normalizeProfileKeyValue(next.archivedByProfileKey || '')){
      next.archivedByProfileKey = fallback;
      migratedArchiveFields += 1;
    }
    if (next.disposal && typeof next.disposal === 'object' && !normalizeProfileKeyValue(next.disposal.approvedByProfileKey || '')){
      next.disposal.approvedByProfileKey = fallback;
      migratedArchiveFields += 1;
    }
    return next;
  });
  setArchivedItems(repairedArchives);

  const logs = getAuditLogs();
  const repairedLogs = logs.map((log) => {
    const next = { ...(log || {}) };
    if (!normalizeProfileKeyValue(next.actorProfileKey || '')){
      next.actorProfileKey = fallback;
      migratedAuditFields += 1;
    }
    if (!(next.actorDeviceId || '').toString().trim()){
      next.actorDeviceId = getCurrentDeviceId() || 'unknown-device';
      migratedAuditFields += 1;
    }
    if (!(next.actorSessionId || '').toString().trim()){
      next.actorSessionId = getCurrentSessionId() || 'unknown-session';
      migratedAuditFields += 1;
    }
    if (!(next.actorRole || '').toString().trim()){
      next.actorRole = normalizeRoleLabel(currentUser?.role || 'encoder');
      migratedAuditFields += 1;
    }
    return next;
  });
  setAuditLogs(repairedLogs);

  notifications = (notifications || []).map((entry) => {
    const next = { ...(entry || {}) };
    if (!normalizeProfileKeyValue(next.actorProfileKey || '')){
      next.actorProfileKey = fallback;
      migratedNotificationFields += 1;
    }
    return next;
  });
  saveNotifications();
  renderNotifications();

  const total = migratedRecordFields + migratedArchiveFields + migratedAuditFields + migratedNotificationFields;
  renderProfileTraceIntegritySummary();
  recordAudit('maintenance', `Trace integrity repair completed: ${total} field(s) updated.`);
  renderProfileRecentDataActivity();
  notify('success', `Trace repair complete. Updated ${total} field(s) across records/archives/audit/notifications.`);
  showModal(
    'Trace Integrity Repair',
    `Updated fields: ${total}\nRecords touched: ${touchedRecords}\nRecord fields: ${migratedRecordFields}\nArchive fields: ${migratedArchiveFields}\nAudit fields: ${migratedAuditFields}\nNotification fields: ${migratedNotificationFields}`
  );
}

function validateAndNormalizeICSRecord(rawRecord, options = {}){
  const strict = options.strict !== false;
  const base = normalizeICS(rawRecord || {});
  const errors = [];
  const warnings = [];
  const record = {
    icsNo: (base.icsNo || '').toString().trim(),
    entity: (base.entity || '').toString().trim(),
    fund: (base.fund || '').toString().trim(),
    issuedDate: normalizeDateYMD(base.issuedDate),
    accountable: (base.accountable || '').toString().trim(),
    signatories: {
      issuedBy: {
        name: (base.signatories?.issuedBy?.name || '').toString().trim(),
        position: (base.signatories?.issuedBy?.position || '').toString().trim(),
        date: normalizeDateYMD(base.signatories?.issuedBy?.date || '')
      },
      receivedBy: {
        name: (base.signatories?.receivedBy?.name || '').toString().trim(),
        position: (base.signatories?.receivedBy?.position || '').toString().trim(),
        date: normalizeDateYMD(base.signatories?.receivedBy?.date || '')
      }
    },
    eul: 'Active',
    totalValue: '0.00',
    items: []
  };

  if (!record.icsNo) errors.push('Missing ICS No.');
  if (record.icsNo && !/^\d{4}-\d{2}-\d{3}$/.test(record.icsNo)) warnings.push('ICS No. format is not YYYY-MM-XXX.');
  if (!record.entity) errors.push('Missing entity.');
  if (strict && !record.fund) errors.push('Missing fund cluster.');
  if (!record.issuedDate) errors.push('Missing issued date.');
  if (strict && !record.signatories.issuedBy.name) errors.push('Missing issued by name.');
  if (strict && !record.signatories.receivedBy.name) errors.push('Missing received by name.');

  const srcItems = Array.isArray(base.items) ? base.items : [];
  const sourceItemsRaw = Array.isArray(rawRecord?.items) ? rawRecord.items : [];
  if (!srcItems.length) errors.push('No items found.');
  const seenItemNo = new Set();
  let totalValue = 0;
  let hasExpired = false;
  srcItems.forEach((item, index) => {
    let sourceItem = sourceItemsRaw[index];
    if ((!sourceItem || typeof sourceItem !== 'object') && item?.itemNo){
      const key = (item.itemNo || '').toString().trim().toLowerCase();
      sourceItem = sourceItemsRaw.find((src) => (src?.itemNo || src?.item_no || '').toString().trim().toLowerCase() === key) || null;
    }
    const qtyText = (item.qtyText ?? item.qty ?? '').toString().trim();
    const qty = parseQuantityValue(qtyText);
    const unitCost = parseCurrencyValue(item.unitCost);
    const totalRaw = parseCurrencyValue(item.total);
    const eulRaw = (item.eul ?? '').toString().trim();
    const eulNum = Number(eulRaw);
    const next = {
      desc: (item.desc || item.description || '').toString().trim(),
      itemNo: (item.itemNo || item.item_no || '').toString().trim(),
      qty: Number.isFinite(qty) ? qty : '',
      qtyText,
      unit: (item.unit || '').toString().trim(),
      unitCost: Number.isFinite(unitCost) ? unitCost : '',
      total: Number.isFinite(totalRaw) ? totalRaw : '',
      eul: eulRaw === '' ? '' : (Number.isFinite(eulNum) ? eulNum : '')
    };
    const itemErrors = [];
    if (!next.desc) itemErrors.push('desc');
    if (!next.itemNo) itemErrors.push('itemNo');
    if (!next.unit) itemErrors.push('unit');
    if (!qtyText) itemErrors.push('qty');
    if (strict && itemErrors.length){
      errors.push(`Item ${index + 1}: missing ${itemErrors.join(', ')}`);
    }
    if (next.itemNo){
      const key = next.itemNo.toLowerCase();
      if (seenItemNo.has(key)){
        errors.push(`Duplicate itemNo "${next.itemNo}" in one ICS.`);
      } else {
        seenItemNo.add(key);
      }
    }
    if (!Number.isFinite(next.total) && Number.isFinite(next.qty) && Number.isFinite(next.unitCost)){
      next.total = Number((next.qty * next.unitCost).toFixed(2));
    }
    const inspections = normalizeInspectionLogs(sourceItem?.inspections);
    if (inspections.length) next.inspections = inspections;
    const wasteReport = normalizeWasteReportPayload(sourceItem?.wasteReport);
    if (wasteReport) next.wasteReport = wasteReport;
    if (Number.isFinite(next.total)) totalValue += next.total;
    if (Number.isFinite(next.eul) && next.eul <= 0) hasExpired = true;
    record.items.push(next);
  });

  record.eul = hasExpired ? 'Expired' : 'Active';
  record.totalValue = totalValue.toFixed(2);
  if (!record.accountable){
    record.accountable = record.signatories.receivedBy.name || '';
  }
  const statusMeta = normalizeStatusMeta(rawRecord?._statusMeta || rawRecord?.statusMeta);
  if (statusMeta) record._statusMeta = statusMeta;
  const lineage = normalizeRecordLineage(rawRecord?._lineage || rawRecord?.lineage);
  if (lineage) record._lineage = lineage;
  const wasteReportMeta = normalizeWasteReportMeta(rawRecord?.wasteReportMeta);
  if (wasteReportMeta) record.wasteReportMeta = wasteReportMeta;
  const ok = errors.length === 0;
  return { ok, record, errors, warnings };
}

function attachRecordStatusMeta(record, statusType){
  const safeType = ['new', 'imported', 'updated'].includes((statusType || '').toLowerCase())
    ? statusType.toLowerCase()
    : '';
  const next = { ...(record || {}) };
  if (!safeType){
    delete next._statusMeta;
    return next;
  }
  const previousMeta = normalizeStatusMeta(next._statusMeta) || {};
  const actorProfileKey = getCurrentActorProfileKey();
  const previousBy = normalizeProfileKeyValue(previousMeta.byProfileKey || previousMeta.by || '');
  const sourceByProfileKey = normalizeProfileKeyValue(
    previousMeta.sourceByProfileKey
    || previousMeta.sourceBy
    || ((previousBy && previousBy !== actorProfileKey) ? previousBy : '')
  );
  const sourceAt = normalizeDateTimeISO(previousMeta.sourceAt || ((sourceByProfileKey && previousBy && previousBy !== actorProfileKey) ? previousMeta.at : ''));
  const sourceType = (previousMeta.sourceType || ((sourceByProfileKey && previousBy && previousBy !== actorProfileKey) ? previousMeta.type : '') || '').toString().trim().toLowerCase();
  next._statusMeta = {
    ...previousMeta,
    type: safeType,
    at: new Date().toISOString(),
    by: actorProfileKey,
    byProfileKey: actorProfileKey
  };
  if (sourceByProfileKey){
    next._statusMeta.sourceBy = sourceByProfileKey;
    next._statusMeta.sourceByProfileKey = sourceByProfileKey;
  }
  if (sourceAt) next._statusMeta.sourceAt = sourceAt;
  if (sourceType) next._statusMeta.sourceType = sourceType;
  const lineageAction = safeType === 'new'
    ? 'create'
    : safeType === 'imported'
      ? 'import'
      : 'update';
  return appendRecordLineage(next, lineageAction, `status:${safeType}`);
}
