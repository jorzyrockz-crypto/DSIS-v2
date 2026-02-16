const PROFILE_AVATAR_KEYS = ['initials', 'person', 'briefcase', 'school', 'shield', 'star'];
const PROFILE_AVATAR_SVGS = {
  person: '<i class="profile-avatar-icon" data-lucide="user" aria-hidden="true"></i>',
  briefcase: '<i class="profile-avatar-icon" data-lucide="briefcase" aria-hidden="true"></i>',
  school: '<i class="profile-avatar-icon" data-lucide="school" aria-hidden="true"></i>',
  shield: '<i class="profile-avatar-icon" data-lucide="shield" aria-hidden="true"></i>',
  star: '<i class="profile-avatar-icon" data-lucide="star" aria-hidden="true"></i>'
};

function createDefaultUser(){
  return {
    profileKey: '',
    name: 'Custodian',
    designation: 'Inventory Officer',
    role: 'Encoder',
    email: '',
    avatar: 'initials',
    lastLogin: new Date().toISOString(),
    preferences: {
      tableDensity: 'comfortable',
      themeAccent: 'elegant-white',
      defaultView: 'Dashboard'
    }
  };
}

function normalizeUser(user){
  const base = createDefaultUser();
  const src = user && typeof user === 'object' ? user : {};
  const prefs = src.preferences && typeof src.preferences === 'object' ? src.preferences : {};
  const density = ['comfortable', 'compact'].includes((prefs.tableDensity || '').toLowerCase()) ? prefs.tableDensity.toLowerCase() : base.preferences.tableDensity;
  const accent = Object.prototype.hasOwnProperty.call(ACCENT_THEMES, prefs.themeAccent) ? prefs.themeAccent : base.preferences.themeAccent;
  const defaultView = PROFILE_VIEWS.includes(prefs.defaultView) ? prefs.defaultView : base.preferences.defaultView;
  const rawRoleText = (src.role || '').toString().trim();
  const roleLabel = normalizeRoleLabel(src.accessRole || rawRoleText || base.role);
  const inferredDesignation = rawRoleText && rawRoleText !== roleLabel ? rawRoleText : '';
  const designation = (src.designation || inferredDesignation || base.designation).toString().trim() || base.designation;
  const rawKey = (src.profileKey || '').toString().trim();
  const profileKey = rawKey || `${((src.email || '').toString().trim() || (src.name || base.name).toString().trim() || 'profile').toLowerCase().replace(/[^\w]+/g, '-')}-${(normalizeRoleKey(roleLabel) || 'user').toLowerCase().replace(/[^\w]+/g, '-')}`;
  const avatar = PROFILE_AVATAR_KEYS.includes((src.avatar || '').toString().trim().toLowerCase())
    ? (src.avatar || '').toString().trim().toLowerCase()
    : 'initials';
  return {
    profileKey,
    name: (src.name || base.name).toString().trim() || base.name,
    designation,
    role: roleLabel,
    email: (src.email || '').toString().trim(),
    avatar,
    lastLogin: src.lastLogin || base.lastLogin,
    preferences: {
      tableDensity: density,
      themeAccent: accent,
      defaultView
    }
  };
}

function applyAvatarPreviewSelection(selected){
  const safe = PROFILE_AVATAR_KEYS.includes((selected || '').toLowerCase()) ? selected.toLowerCase() : 'initials';
  const input = document.getElementById('profileAvatarType');
  if (input) input.value = safe;
  document.querySelectorAll('#profileAvatarPicker .avatar-picker-btn').forEach((btn) => {
    btn.classList.toggle('active', (btn.dataset.avatar || '') === safe);
  });
}

function renderUserAvatar(target, name, avatarType){
  if (!target) return;
  const safe = PROFILE_AVATAR_KEYS.includes((avatarType || '').toLowerCase()) ? avatarType.toLowerCase() : 'initials';
  if (safe === 'initials'){
    target.classList.remove('has-icon');
    target.innerHTML = '';
    target.textContent = getInitials(name || '');
    return;
  }
  const icon = PROFILE_AVATAR_SVGS[safe] || PROFILE_AVATAR_SVGS.person;
  target.classList.add('has-icon');
  target.innerHTML = icon;
}

function formatUserRoleLine(user){
  const designation = (user?.designation || '').toString().trim();
  const role = normalizeRoleLabel(user?.role || 'encoder');
  if (designation) return `${designation} (${role})`;
  return role;
}

function loadCurrentUser(){
  const parsed = safeParseJSON(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}', {});
  const user = normalizeUser(parsed);
  const legacyDensity = (localStorage.getItem('icsTableDensity') || '').toLowerCase();
  if (['comfortable', 'compact'].includes(legacyDensity)) user.preferences.tableDensity = legacyDensity;
  return user;
}

function saveCurrentUser(){
  currentUser = normalizeUser(currentUser);
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(currentUser));
}

function loadSchoolProfilesMap(){
  const parsed = safeParseJSON(localStorage.getItem(SCHOOL_PROFILES_STORAGE_KEY) || '{}', {});
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function saveSchoolProfilesMap(map){
  localStorage.setItem(SCHOOL_PROFILES_STORAGE_KEY, JSON.stringify(map || {}));
}

function getProfilesForSchool(schoolId){
  const key = normalizeSchoolId(schoolId || '');
  if (!key) return [];
  const map = loadSchoolProfilesMap();
  const list = Array.isArray(map[key]) ? map[key] : [];
  return list.map((entry) => normalizeUser(entry));
}

function upsertCurrentUserForSchool(schoolId){
  const sid = normalizeSchoolId(schoolId || '');
  if (!sid) return;
  const map = loadSchoolProfilesMap();
  const list = Array.isArray(map[sid]) ? map[sid].map((entry) => normalizeUser(entry)) : [];
  const normalized = normalizeUser(currentUser);
  currentUser = normalized;
  const idx = list.findIndex((entry) => entry.profileKey === normalized.profileKey);
  if (idx >= 0) list[idx] = normalized;
  else list.push(normalized);
  map[sid] = list;
  saveSchoolProfilesMap(map);
}

function generateProfileKeyForSchool(name, role, email, schoolId){
  const sid = normalizeSchoolId(schoolId || '');
  const existing = new Set(getProfilesForSchool(sid).map((entry) => (entry.profileKey || '').trim()).filter(Boolean));
  const seed = `${(email || '').trim() || (name || '').trim() || 'profile'}-${(role || '').trim() || 'user'}`
    .toLowerCase()
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || 'profile-user';
  if (!existing.has(seed)) return seed;
  let n = 2;
  while (existing.has(`${seed}-${n}`)) n += 1;
  return `${seed}-${n}`;
}

function isSessionActive(){
  return !!sessionState.loggedIn
    && normalizeSchoolId(sessionState.schoolId) === normalizeSchoolId(schoolIdentity.schoolId)
    && !!(sessionState.profileKey || '').trim();
}

function loadSavedSession(){
  const parsed = safeParseJSON(localStorage.getItem(SESSION_STORAGE_KEY) || '{}', {});
  const schoolId = normalizeSchoolId(parsed.schoolId || '');
  const profileKey = (parsed.profileKey || '').toString().trim();
  const remember = parsed.remember !== false;
  return { schoolId, profileKey, remember };
}

function saveSavedSession(){
  if (!sessionState?.remember){
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    schoolId: normalizeSchoolId(sessionState.schoolId || ''),
    profileKey: (sessionState.profileKey || '').toString().trim(),
    remember: true,
    savedAt: new Date().toISOString()
  }));
}

function clearSavedSession(){
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function tryRestoreRememberedSession(){
  const saved = loadSavedSession();
  if (!saved.remember || !saved.schoolId || !saved.profileKey) return false;
  if (saved.schoolId !== normalizeSchoolId(schoolIdentity.schoolId || '')) return false;
  const selected = getProfilesForSchool(saved.schoolId).find((entry) => entry.profileKey === saved.profileKey);
  if (!selected) return false;
  currentUser = normalizeUser({ ...selected, lastLogin: new Date().toISOString() });
  saveCurrentUser();
  upsertCurrentUserForSchool(saved.schoolId);
  applyThemeAccent(currentUser.preferences?.themeAccent || 'elegant-white');
  tableDensity = (currentUser.preferences?.tableDensity || tableDensity || 'comfortable').toLowerCase();
  if (!['comfortable', 'compact'].includes(tableDensity)) tableDensity = 'comfortable';
  applyTableDensity();
  sessionState = { loggedIn: true, schoolId: saved.schoolId, profileKey: saved.profileKey, remember: true, sessionId: createSessionId() };
  saveSavedSession();
  const startView = PROFILE_VIEWS.includes(currentUser.preferences?.defaultView) ? currentUser.preferences.defaultView : 'Dashboard';
  goToView(startView);
  renderUserIdentity();
  renderAppLogo();
  return true;
}

function setLoginHint(message, tone = ''){
  const hint = document.getElementById('loginHint');
  if (!hint) return;
  hint.textContent = message || '';
  hint.className = `login-hint${tone ? ` ${tone}` : ''}`;
}

function renderLoginProfileOptions(){
  const schoolInput = document.getElementById('loginSchoolId');
  const select = document.getElementById('loginProfileSelect');
  const loginBtn = document.getElementById('loginSubmitBtn');
  if (!schoolInput || !select || !loginBtn) return;
  const schoolId = normalizeSchoolId(schoolInput.value || '');
  schoolInput.value = schoolId;
  const profiles = getProfilesForSchool(schoolId);
  select.innerHTML = '<option value="">Select profile</option>' + profiles.map((entry) => {
    const email = (entry.email || '').trim();
    const designation = (entry.designation || '').toString().trim();
    const accessRole = normalizeRoleLabel(entry.role || 'encoder');
    const label = `${entry.name} - ${designation || 'No Designation'} [${accessRole}]${email ? ` - ${email}` : ''}`;
    return `<option value="${escapeHTML(entry.profileKey)}">${escapeHTML(label)}</option>`;
  }).join('');
  loginBtn.disabled = profiles.length === 0;
  if (!schoolId){
    setLoginHint('Enter School ID to load profiles.', '');
  } else if (!profiles.length){
    setLoginHint('No profiles found for this School ID. Click New Personnel to create one.', 'error');
  } else {
    setLoginHint(`Found ${profiles.length} profile(s). Select one and login.`, '');
  }
}

function openLoginModal(force = false){
  if (!loginOverlay) return;
  const schoolInput = document.getElementById('loginSchoolId');
  const rememberEl = document.getElementById('loginRememberDevice');
  if (schoolInput){
    schoolInput.value = normalizeSchoolId(schoolIdentity.schoolId || '');
  }
  if (rememberEl){
    const saved = loadSavedSession();
    rememberEl.checked = saved.remember !== false;
  }
  renderLoginProfileOptions();
  loginOverlay.classList.add('show');
  if (force){
    sessionState.loggedIn = false;
    sessionState.sessionId = '';
  }
  setTimeout(() => {
    const select = document.getElementById('loginProfileSelect');
    if (select && select.options.length > 1) select.focus();
    else schoolInput?.focus();
  }, 10);
}

function closeLoginModal(){
  if (!isSessionActive()){
    setLoginHint('Login is required to continue.', 'error');
    return;
  }
  loginOverlay?.classList?.remove('show');
}

function submitLogin(){
  const schoolInput = document.getElementById('loginSchoolId');
  const select = document.getElementById('loginProfileSelect');
  const rememberEl = document.getElementById('loginRememberDevice');
  const schoolId = normalizeSchoolId(schoolInput?.value || '');
  const selectedKey = (select?.value || '').trim();
  const remember = !!rememberEl?.checked;
  const configuredSchoolId = normalizeSchoolId(schoolIdentity.schoolId || '');

  if (!schoolId){
    setLoginHint('Enter School ID.', 'error');
    return;
  }
  if (schoolId !== configuredSchoolId){
    setLoginHint(`School ID mismatch. This device is locked to ${configuredSchoolId || 'configured school'}.`, 'error');
    return;
  }
  const profiles = getProfilesForSchool(schoolId);
  const selected = profiles.find((entry) => entry.profileKey === selectedKey);
  if (!selected){
    setLoginHint('Select a valid profile.', 'error');
    return;
  }
  currentUser = normalizeUser({
    ...selected,
    lastLogin: new Date().toISOString()
  });
  saveCurrentUser();
  upsertCurrentUserForSchool(schoolId);
  applyThemeAccent(currentUser.preferences?.themeAccent || 'elegant-white');
  tableDensity = (currentUser.preferences?.tableDensity || tableDensity || 'comfortable').toLowerCase();
  if (!['comfortable', 'compact'].includes(tableDensity)) tableDensity = 'comfortable';
  applyTableDensity();
  sessionState = { loggedIn: true, schoolId, profileKey: currentUser.profileKey, remember, sessionId: createSessionId() };
  saveSavedSession();
  const startView = PROFILE_VIEWS.includes(currentUser.preferences?.defaultView) ? currentUser.preferences.defaultView : 'Dashboard';
  goToView(startView);
  renderUserIdentity();
  setLoginHint(`Logged in as ${currentUser.name}.`, 'success');
  closeLoginModal();
  notify('success', `Logged in as ${currentUser.name}.`);
}

function loadSchoolIdentity(){
  const parsed = safeParseJSON(localStorage.getItem(SCHOOL_IDENTITY_STORAGE_KEY) || '{}', {});
  return normalizeSchoolIdentity(parsed);
}

function saveSchoolIdentity(){
  localStorage.setItem(SCHOOL_IDENTITY_STORAGE_KEY, JSON.stringify(schoolIdentity));
}

function getInitials(name){
  const tokens = (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!tokens.length) return 'CU';
  return tokens.map((t) => t[0].toUpperCase()).join('');
}

function renderUserIdentity(){
  if (topUserName) topUserName.textContent = currentUser.name || 'Custodian';
  if (topUserRole) topUserRole.textContent = formatUserRoleLine(currentUser);
  if (sidebarUserName) sidebarUserName.textContent = currentUser.name || 'Custodian';
  if (sidebarUserRole) sidebarUserRole.textContent = formatUserRoleLine(currentUser);
  if (topSchoolTitle || topSchoolTitleV2){
    const schoolNameRaw = (schoolIdentity.schoolName || 'School').toString().trim() || 'School';
    const schoolIdRaw = (schoolIdentity.schoolId || '').toString().trim();
    const schoolName = escapeHTML(schoolNameRaw);
    const schoolMarkup = schoolIdRaw
      ? `<span class="school-name">${schoolName}</span><span class="school-id-chip">ID: ${escapeHTML(schoolIdRaw)}</span>`
      : `<span class="school-name">${schoolName}</span>`;
    const schoolTitle = schoolIdRaw ? `${schoolNameRaw} [ID: ${schoolIdRaw}]` : schoolNameRaw;
    if (topSchoolTitle){
      topSchoolTitle.innerHTML = schoolMarkup;
      topSchoolTitle.title = schoolTitle;
    }
    if (topSchoolTitleV2){
      topSchoolTitleV2.innerHTML = schoolMarkup;
      topSchoolTitleV2.title = schoolTitle;
    }
  }
  if (sidebarProfileBtn){
    sidebarProfileBtn.title = `Open profile for ${currentUser.name || 'Custodian'}`;
    sidebarProfileBtn.setAttribute('aria-label', `Open profile for ${currentUser.name || 'Custodian'}`);
  }
  const avatar = document.getElementById('profileAvatarPreview');
  renderUserAvatar(avatar, currentUser.name, currentUser.avatar);
  renderUserAvatar(sidebarUserAvatar, currentUser.name, currentUser.avatar);
  renderAppLogo();
}
