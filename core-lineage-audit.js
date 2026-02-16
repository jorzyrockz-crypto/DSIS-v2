function getAuditLogs(){
  return JSON.parse(localStorage.getItem('icsAuditLogs') || '[]');
}

function setAuditLogs(logs){
  localStorage.setItem('icsAuditLogs', JSON.stringify((logs || []).slice(-120)));
}

function recordAudit(type, detail, extra = null){
  const logs = getAuditLogs();
  const now = new Date();
  const payload = extra && typeof extra === 'object' ? JSON.parse(JSON.stringify(extra)) : {};
  logs.push({
    id: createRuntimeId('audit'),
    type: type || 'info',
    detail: detail || '',
    time: now.toLocaleString(),
    at: now.toISOString(),
    actorProfileKey: getCurrentActorProfileKey(),
    actorRole: normalizeRoleLabel(currentUser?.role || 'encoder'),
    actorDeviceId: getCurrentDeviceId() || 'unknown-device',
    actorSessionId: getCurrentSessionId() || 'unknown-session',
    meta: payload && Object.keys(payload).length ? payload : undefined
  });
  setAuditLogs(logs);
  renderProfileRecentDataActivity();
}

function stripRecordLineage(record){
  const next = JSON.parse(JSON.stringify(record || {}));
  delete next._lineage;
  delete next.lineage;
  return next;
}

function hashTextFNV1a(text){
  let hash = 0x811c9dc5;
  const src = (text || '').toString();
  for (let i = 0; i < src.length; i++){
    hash ^= src.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (`00000000${(hash >>> 0).toString(16)}`).slice(-8);
}

function computeRecordContentHash(record){
  const canonical = stableJSONStringify(stripRecordLineage(record));
  return `fnv1a32:${hashTextFNV1a(canonical)}:${canonical.length}`;
}

function normalizeRecordLineageVersion(entry){
  if (!entry || typeof entry !== 'object') return null;
  const version = Number(entry.version);
  if (!Number.isInteger(version) || version <= 0) return null;
  const next = {
    version,
    action: (entry.action || '').toString().trim().toLowerCase() || 'update',
    at: normalizeDateTimeISO(entry.at || ''),
    byProfileKey: normalizeProfileKeyValue(entry.byProfileKey || entry.by || ''),
    byRole: normalizeRoleLabel(entry.byRole || entry.role || 'encoder'),
    deviceId: (entry.deviceId || '').toString().trim(),
    sessionId: (entry.sessionId || '').toString().trim(),
    hash: (entry.hash || '').toString().trim(),
    parentHash: (entry.parentHash || '').toString().trim(),
    summary: (entry.summary || '').toString().trim()
  };
  if (!next.at) next.at = new Date().toISOString();
  if (!next.byProfileKey) next.byProfileKey = 'unknown-profile';
  if (!next.deviceId) next.deviceId = 'unknown-device';
  if (!next.sessionId) next.sessionId = 'unknown-session';
  return next;
}

function normalizeRecordLineage(lineage){
  if (!lineage || typeof lineage !== 'object') return null;
  const versionsRaw = Array.isArray(lineage.versions) ? lineage.versions : [];
  const versions = versionsRaw
    .map(normalizeRecordLineageVersion)
    .filter(Boolean)
    .sort((a, b) => a.version - b.version);
  const createdAt = normalizeDateTimeISO(lineage.createdAt || '');
  const createdByProfileKey = normalizeProfileKeyValue(lineage.createdByProfileKey || '');
  const createdByDeviceId = (lineage.createdByDeviceId || '').toString().trim();
  const createdBySessionId = (lineage.createdBySessionId || '').toString().trim();
  const currentVersion = Number(lineage.currentVersion);
  const currentHash = (lineage.currentHash || '').toString().trim();
  if (!versions.length && !createdAt && !createdByProfileKey && !createdByDeviceId && !createdBySessionId && !currentHash && !Number.isFinite(currentVersion)){
    return null;
  }
  const last = versions[versions.length - 1] || null;
  return {
    createdAt: createdAt || last?.at || '',
    createdByProfileKey: createdByProfileKey || last?.byProfileKey || '',
    createdByDeviceId: createdByDeviceId || last?.deviceId || '',
    createdBySessionId: createdBySessionId || last?.sessionId || '',
    currentVersion: Number.isFinite(currentVersion) && currentVersion > 0 ? Math.max(currentVersion, last?.version || 0) : (last?.version || 0),
    currentHash: currentHash || last?.hash || '',
    versions
  };
}

function verifyRecordLineage(record){
  const lineage = normalizeRecordLineage(record?._lineage || record?.lineage);
  if (!lineage || !lineage.versions.length){
    return { ok: true, level: 'info', message: 'No lineage timeline yet.' };
  }
  let chainBroken = false;
  for (let i = 1; i < lineage.versions.length; i++){
    const prev = lineage.versions[i - 1];
    const cur = lineage.versions[i];
    if ((cur.parentHash || '') !== (prev.hash || '')){
      chainBroken = true;
      break;
    }
  }
  const computedHash = computeRecordContentHash(record || {});
  const expectedHash = lineage.currentHash || lineage.versions[lineage.versions.length - 1]?.hash || '';
  if (chainBroken){
    return { ok: false, level: 'error', message: 'Lineage chain is inconsistent.', computedHash, expectedHash };
  }
  if (expectedHash && expectedHash !== computedHash){
    return { ok: false, level: 'error', message: 'Record content hash mismatch.', computedHash, expectedHash };
  }
  return { ok: true, level: 'success', message: 'Lineage integrity check passed.', computedHash, expectedHash: expectedHash || computedHash };
}

function buildRecordLineageAuditMeta(record, overrides = {}){
  const lineage = normalizeRecordLineage(record?._lineage || record?.lineage);
  const check = verifyRecordLineage(record || {});
  const base = {
    recordIcsNo: (record?.icsNo || '').toString().trim(),
    lineageVersion: lineage?.currentVersion || 0,
    lineageHash: lineage?.currentHash || '',
    lineageIntegrity: check.ok ? 'ok' : 'mismatch'
  };
  return { ...base, ...(overrides || {}) };
}

function appendRecordLineage(recordInput, action, summary){
  const record = JSON.parse(JSON.stringify(recordInput || {}));
  const existing = normalizeRecordLineage(record._lineage || record.lineage) || {
    createdAt: '',
    createdByProfileKey: '',
    createdByDeviceId: '',
    createdBySessionId: '',
    currentVersion: 0,
    currentHash: '',
    versions: []
  };
  const versions = Array.isArray(existing.versions) ? [...existing.versions] : [];
  const last = versions.length ? versions[versions.length - 1] : null;
  const nextVersion = Math.max(existing.currentVersion || 0, last?.version || 0) + 1;
  const at = new Date().toISOString();
  const byProfileKey = getCurrentActorProfileKey();
  const byRole = normalizeRoleLabel(currentUser?.role || 'encoder');
  const deviceId = getCurrentDeviceId() || 'unknown-device';
  const sessionId = getCurrentSessionId() || 'unknown-session';
  const hash = computeRecordContentHash(record);
  const event = {
    version: nextVersion,
    action: (action || 'update').toString().trim().toLowerCase(),
    at,
    byProfileKey,
    byRole,
    deviceId,
    sessionId,
    hash,
    parentHash: last?.hash || '',
    summary: (summary || '').toString().trim()
  };
  versions.push(event);
  record._lineage = {
    createdAt: existing.createdAt || at,
    createdByProfileKey: existing.createdByProfileKey || byProfileKey,
    createdByDeviceId: existing.createdByDeviceId || deviceId,
    createdBySessionId: existing.createdBySessionId || sessionId,
    currentVersion: event.version,
    currentHash: hash,
    versions
  };
  return record;
}
