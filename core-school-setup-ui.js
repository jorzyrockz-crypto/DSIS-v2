function updateSchoolLogoHint(){
  const hint = document.getElementById('profileSchoolLogoHint');
  const removeBtn = document.getElementById('profileSchoolLogoRemoveBtn');
  const canManage = hasRoleCapability('manage_school_lock');
  if (hint){
    hint.textContent = profileDraftSchoolLogoDataUrl
      ? 'Logo selected. Save profile to apply.'
      : 'No logo selected.';
  }
  if (removeBtn){
    removeBtn.disabled = !canManage || (!profileDraftSchoolLogoDataUrl && !sanitizeSchoolLogoDataUrl(schoolIdentity.logoDataUrl || ''));
    removeBtn.title = canManage ? '' : 'Only Admin can change school logo.';
  }
}

function applySchoolLogoPreview(dataUrl, preferDraft = false){
  if (!appLogo) return;
  const next = sanitizeSchoolLogoDataUrl(dataUrl || '');
  if (next){
    appLogo.style.backgroundImage = `url("${next}")`;
    appLogo.classList.add('has-image');
    appLogo.textContent = '';
    return;
  }
  if (preferDraft){
    appLogo.style.backgroundImage = '';
    appLogo.classList.remove('has-image');
    appLogo.textContent = getSchoolShortLabel(schoolIdentity.schoolName || '');
    appLogo.title = 'School initials';
    return;
  }
  renderAppLogo();
}

function handleSchoolLogoUpload(event){
  if (!hasRoleCapability('manage_school_lock')){
    notify('error', 'Only Admin can change school logo.');
    if (event?.target) event.target.value = '';
    return;
  }
  const file = event?.target?.files?.[0];
  if (!file) return;
  if (!/^image\/(png|jpeg|jpg|webp|svg\+xml)$/i.test(file.type || '')){
    notify('error', 'Unsupported image format. Use PNG, JPG, WEBP, or SVG.');
    event.target.value = '';
    return;
  }
  const maxBytes = 1024 * 1024;
  if (file.size > maxBytes){
    notify('error', 'Logo file is too large. Max size is 1MB.');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = sanitizeSchoolLogoDataUrl(reader.result || '');
    if (!dataUrl){
      notify('error', 'Invalid logo image data.');
      return;
    }
    profileDraftSchoolLogoDataUrl = dataUrl;
    applySchoolLogoPreview(profileDraftSchoolLogoDataUrl, true);
    updateSchoolLogoHint();
    notify('success', 'Logo selected. Save profile to apply.');
  };
  reader.onerror = () => notify('error', 'Unable to read logo file.');
  reader.readAsDataURL(file);
}

function clearSchoolLogoDraft(){
  if (!hasRoleCapability('manage_school_lock')){
    notify('error', 'Only Admin can change school logo.');
    return;
  }
  profileDraftSchoolLogoDataUrl = '';
  const input = document.getElementById('profileSchoolLogoInput');
  if (input) input.value = '';
  applySchoolLogoPreview('', true);
  updateSchoolLogoHint();
}

function setSetupHint(message, tone = ''){
  const hint = document.getElementById('setupHint');
  if (!hint) return;
  hint.textContent = message || '';
  hint.className = `setup-hint${tone ? ` ${tone}` : ''}`;
}

function openSetupModal(force = false, mode = 'initial'){
  if (!setupOverlay) return;
  setupMode = mode === 'personnel' ? 'personnel' : 'initial';
  const schoolNameEl = document.getElementById('setupSchoolName');
  const schoolIdEl = document.getElementById('setupSchoolId');
  const nameEl = document.getElementById('setupProfileName');
  const designationEl = document.getElementById('setupProfileDesignation');
  const roleEl = document.getElementById('setupProfileRole');
  const emailEl = document.getElementById('setupProfileEmail');
  const title = setupOverlay.querySelector('.modal-head h3');
  const sub = setupOverlay.querySelector('.modal-head .modal-sub');
  const action = setupOverlay.querySelector('.modal-foot .btn.btn-primary');
  const schoolSectionTitle = setupOverlay.querySelector('.setup-section-school .profile-section-title');
  const schoolSectionSub = setupOverlay.querySelector('.setup-section-school .setup-section-sub');
  const profileSectionTitle = setupOverlay.querySelector('.setup-section-profile .profile-section-title');
  const profileSectionSub = setupOverlay.querySelector('.setup-section-profile .setup-section-sub');
  const lockSchool = setupMode === 'personnel' && isSchoolIdentityConfigured();
  setupOverlay.classList.toggle('personnel-mode', lockSchool);
  if (title) title.innerHTML = lockSchool
    ? '<i data-lucide="user-plus" aria-hidden="true"></i>Create Personnel Profile'
    : '<i data-lucide="school" aria-hidden="true"></i>Setup School Workspace';
  if (sub) sub.textContent = lockSchool
    ? 'Add a new staff member to the school directory.'
    : 'Create school identity and first personnel profile for this device.';
  if (action) action.innerHTML = lockSchool
    ? '<i data-lucide="user-plus" aria-hidden="true"></i>Create Profile'
    : '<i data-lucide="school" aria-hidden="true"></i>Create School and Continue';
  if (schoolSectionTitle) schoolSectionTitle.innerHTML = lockSchool
    ? '<span class="setup-step">1</span><i data-lucide="building-2" aria-hidden="true"></i>Workplace Context'
    : '<span class="setup-step">1</span><i data-lucide="building-2" aria-hidden="true"></i>School';
  if (schoolSectionSub) schoolSectionSub.textContent = lockSchool
    ? 'Locked to your current workspace context.'
    : '';
  if (profileSectionTitle) profileSectionTitle.innerHTML = lockSchool
    ? '<span class="setup-step">2</span><i data-lucide="user-round" aria-hidden="true"></i>Personnel Identity'
    : '<span class="setup-step">2</span><i data-lucide="user-round" aria-hidden="true"></i>Personnel Profile';
  if (profileSectionSub) profileSectionSub.textContent = lockSchool
    ? ''
    : 'Identity and permissions.';
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
  if (schoolNameEl) schoolNameEl.value = (schoolIdentity.schoolName || '').trim();
  if (schoolIdEl) schoolIdEl.value = normalizeSchoolId(schoolIdentity.schoolId || '');
  if (schoolNameEl) schoolNameEl.disabled = false;
  if (schoolIdEl) schoolIdEl.disabled = false;
  if (nameEl) nameEl.value = currentUser.name || '';
  setDesignationSelectOptions('setupProfileDesignation', currentUser.designation || '', schoolIdentity.schoolId);
  if (roleEl) roleEl.value = normalizeRoleKey(currentUser.role || 'encoder');
  if (roleEl){
    const adminOpt = roleEl.querySelector('option[value="admin"]');
    if (adminOpt) adminOpt.disabled = lockSchool;
    if (lockSchool && roleEl.value === 'admin') roleEl.value = 'encoder';
    if (!lockSchool && !roleEl.value) roleEl.value = 'admin';
  }
  if (emailEl) emailEl.value = currentUser.email || '';
  if (nameEl && lockSchool){
    nameEl.value = '';
    nameEl.focus();
  }
  if (designationEl && lockSchool) designationEl.value = designationEl.value || '';
  if (roleEl && lockSchool) roleEl.value = 'encoder';
  if (emailEl && lockSchool) emailEl.value = '';
  setSetupHint(lockSchool ? '' : 'Complete setup to continue.', '');
  if (force) setupWizardEnforced = true;
  setupOverlay.classList.add('show');
  setTimeout(() => {
    if (nameEl && lockSchool) nameEl.focus();
    else if (schoolNameEl && !schoolNameEl.value.trim()) schoolNameEl.focus();
    else if (schoolIdEl && !schoolIdEl.value.trim()) schoolIdEl.focus();
    else nameEl?.focus();
  }, 10);
}

function closeSetupModal(){
  if (setupWizardEnforced && !isSchoolIdentityConfigured()){
    setSetupHint('Setup is required before using the app.', 'error');
    return;
  }
  setupOverlay?.classList?.remove('show');
  setupOverlay?.classList?.remove('personnel-mode');
  if (!isSessionActive() && isSchoolIdentityConfigured()){
    openLoginModal(false);
  }
}

function submitInitialSetup(){
  const schoolNameEl = document.getElementById('setupSchoolName');
  const schoolIdEl = document.getElementById('setupSchoolId');
  const nameEl = document.getElementById('setupProfileName');
  const designationEl = document.getElementById('setupProfileDesignation');
  const roleEl = document.getElementById('setupProfileRole');
  const emailEl = document.getElementById('setupProfileEmail');

  const schoolName = (schoolNameEl?.value || '').trim();
  const schoolId = normalizeSchoolId(schoolIdEl?.value || '');
  const name = (nameEl?.value || '').trim();
  const designation = (designationEl?.value || '').trim();
  const roleKey = normalizeRoleKey(roleEl?.value || 'encoder');
  const role = normalizeRoleLabel(roleKey);
  const email = (emailEl?.value || '').trim();

  if (!schoolName){
    setSetupHint('School Name is required.', 'error');
    schoolNameEl?.focus();
    return;
  }
  if (!validSchoolId(schoolId)){
    setSetupHint('School ID must be 4-12 digits (example: 114656).', 'error');
    schoolIdEl?.focus();
    return;
  }
  if (setupMode === 'personnel' && normalizeSchoolId(schoolIdentity.schoolId || '') !== schoolId){
    setSetupHint(`Personnel sign-up must use School ID ${normalizeSchoolId(schoolIdentity.schoolId || '')}.`, 'error');
    return;
  }
  if (setupMode === 'personnel' && roleKey === 'admin'){
    setSetupHint('Personnel sign-up cannot assign Admin role from login flow.', 'error');
    roleEl?.focus();
    return;
  }
  if (!name){
    setSetupHint('Personnel Full Name is required.', 'error');
    nameEl?.focus();
    return;
  }
  if (!designation){
    setSetupHint('Designation is required.', 'error');
    designationEl?.focus();
    return;
  }
  if (!validProfileEmail(email)){
    setSetupHint('Email format is invalid.', 'error');
    emailEl?.focus();
    return;
  }

  schoolIdentity = normalizeSchoolIdentity({ schoolName, schoolId });
  saveSchoolIdentity();
  ensureDesignationForSchool(schoolIdentity.schoolId, designation);
  const profileKey = generateProfileKeyForSchool(name, role, email, schoolIdentity.schoolId);
  currentUser = normalizeUser({
    ...currentUser,
    profileKey,
    name,
    designation,
    role,
    email,
    lastLogin: new Date().toISOString()
  });
  saveCurrentUser();
  upsertCurrentUserForSchool(schoolIdentity.schoolId);
  renderUserIdentity();
  sessionState = { loggedIn: true, schoolId: schoolIdentity.schoolId, profileKey: currentUser.profileKey, remember: true, sessionId: createSessionId() };
  saveSavedSession();
  schoolSetupEnforced = false;
  setupWizardEnforced = false;
  setSetupHint('Setup complete. Signing in...', 'success');
  closeSetupModal();
  if (loginOverlay?.classList?.contains('show')) loginOverlay.classList.remove('show');
  notify('success', `Setup complete. Logged in as ${currentUser.name}.`);
}

function openPersonnelSignupFromLogin(){
  if (!requireSchoolIdentityConfigured('creating personnel profile')) return;
  if (loginOverlay?.classList?.contains('show')) loginOverlay.classList.remove('show');
  openSetupModal(false, 'personnel');
}

function signOutSession(){
  sessionState = { loggedIn: false, schoolId: '', profileKey: '', remember: false, sessionId: '' };
  clearSavedSession();
  closeProfileModal(false);
  openLoginModal(true);
  notify('info', 'Signed out.');
}

function isSchoolIdentityConfigured(){
  return !!(schoolIdentity.schoolName || '').trim() && validSchoolId(schoolIdentity.schoolId || '');
}

function requireSchoolIdentityConfigured(actionLabel = 'this action'){
  if (isSchoolIdentityConfigured()) return true;
  schoolSetupEnforced = true;
  setupWizardEnforced = true;
  openSetupModal(true);
  setSetupHint(`Complete setup before ${actionLabel}.`, 'error');
  return false;
}

function requireActiveSession(actionLabel = 'this action'){
  if (isSessionActive()) return true;
  openLoginModal(true);
  showModal('Login Required', `Login with School ID and profile before ${actionLabel}.`);
  return false;
}
