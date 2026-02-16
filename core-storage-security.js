const PROFILE_STORAGE_KEY = 'icsCurrentUser';
const SCHOOL_IDENTITY_STORAGE_KEY = 'icsSchoolIdentity';
const SCHOOL_PROFILES_STORAGE_KEY = 'icsSchoolProfiles';
const SCHOOL_DESIGNATIONS_STORAGE_KEY = 'icsSchoolDesignations';
const SESSION_STORAGE_KEY = 'icsSessionState';
const UNDO_SNAPSHOT_STORAGE_KEY = 'icsUndoSnapshot';
const DEVICE_ID_STORAGE_KEY = 'icsDeviceId';

const ROLE_LABELS = {
  admin: 'Admin',
  encoder: 'Encoder',
  viewer: 'Viewer'
};

const ROLE_CAPABILITIES = {
  admin: [
    'edit_records',
    'delete_records',
    'import_data',
    'export_data',
    'archive_items',
    'manage_roles',
    'manage_school_lock'
  ],
  encoder: [
    'edit_records',
    'import_data',
    'export_data',
    'archive_items'
  ],
  viewer: [
    'export_data'
  ]
};

const ACCESS_RULES = Object.freeze({
  open_ics_editor: { capability: 'edit_records', label: 'open ICS editor', requireSchoolIdentity: true, requireSession: true },
  save_staged_ics: { capability: 'edit_records', label: 'save staged ICS data', requireSchoolIdentity: true, requireSession: true },
  finalize_ics: { capability: 'edit_records', label: 'finalize ICS records', requireSchoolIdentity: true, requireSession: true },
  auto_populate_records: { capability: 'edit_records', label: 'auto-populate records', requireSchoolIdentity: true, requireSession: true },
  import_json: { capability: 'import_data', label: 'import JSON data', requireSchoolIdentity: true, requireSession: true },
  apply_import: { capability: 'import_data', label: 'apply imported data', requireSchoolIdentity: true, requireSession: true },
  open_data_manager: { capability: null, label: 'open Data Manager', requireSchoolIdentity: true, requireSession: true },
  export_data: { capability: 'export_data', label: 'export data', requireSchoolIdentity: true, requireSession: true },
  delete_record: { capability: 'delete_records', label: 'delete ICS records', requireSchoolIdentity: true, requireSession: true },
  archive_items: { capability: 'archive_items', label: 'archive items', requireSchoolIdentity: true, requireSession: true },
  manage_roles: { capability: 'manage_roles', label: 'manage role and security settings', requireSchoolIdentity: true, requireSession: true }
});

function safeParseJSON(raw, fallback){
  try { return JSON.parse(raw); } catch { return fallback; }
}

function normalizeRoleKey(value){
  const raw = (value || '').toString().trim().toLowerCase();
  if (!raw) return 'encoder';
  if (Object.prototype.hasOwnProperty.call(ROLE_LABELS, raw)) return raw;
  if (raw === 'administrator') return 'admin';
  if (raw === 'read only' || raw === 'read-only') return 'viewer';
  if (raw === 'inventory officer' || raw === 'custodian' || raw === 'staff') return 'encoder';
  return 'encoder';
}

function normalizeRoleLabel(value){
  return ROLE_LABELS[normalizeRoleKey(value)] || ROLE_LABELS.encoder;
}

function getCurrentRoleKey(){
  return normalizeRoleKey(currentUser?.role || 'encoder');
}

function hasRoleCapability(capability){
  const roleKey = getCurrentRoleKey();
  const list = ROLE_CAPABILITIES[roleKey] || ROLE_CAPABILITIES.encoder;
  return list.includes(capability);
}

function requireRoleCapability(capability, actionLabel){
  if (hasRoleCapability(capability)) return true;
  notify('error', `Access denied. ${normalizeRoleLabel(currentUser?.role)} role cannot ${actionLabel}.`);
  showModal('Access Denied', `Your role (${normalizeRoleLabel(currentUser?.role)}) cannot ${actionLabel}.`);
  return false;
}

function requireAccess(actionKey, overrides = {}){
  const rule = ACCESS_RULES[actionKey] || {};
  const actionLabel = overrides.label || rule.label || 'perform this action';
  const capability = overrides.capability !== undefined ? overrides.capability : rule.capability;
  const mustHaveSchoolIdentity = overrides.requireSchoolIdentity !== undefined
    ? !!overrides.requireSchoolIdentity
    : !!rule.requireSchoolIdentity;
  const mustHaveSession = overrides.requireSession !== undefined
    ? !!overrides.requireSession
    : !!rule.requireSession;
  if (capability && !requireRoleCapability(capability, actionLabel)) return false;
  if (mustHaveSchoolIdentity && !requireSchoolIdentityConfigured(actionLabel)) return false;
  if (mustHaveSession && !requireActiveSession(actionLabel)) return false;
  return true;
}

function createRuntimeId(prefix = 'id'){
  const safePrefix = (prefix || 'id').toString().trim() || 'id';
  try {
    if (globalThis.crypto?.getRandomValues){
      const bytes = new Uint8Array(10);
      globalThis.crypto.getRandomValues(bytes);
      const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      return `${safePrefix}-${token}`;
    }
  } catch {}
  return `${safePrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function getOrCreateDeviceId(){
  const existing = (localStorage.getItem(DEVICE_ID_STORAGE_KEY) || '').toString().trim();
  if (existing) return existing;
  const generated = createRuntimeId('dev');
  localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
  return generated;
}

function createSessionId(){
  return createRuntimeId('sess');
}

function getCurrentSessionId(){
  return (sessionState?.sessionId || '').toString().trim();
}

function getCurrentDeviceId(){
  return getOrCreateDeviceId();
}
