function openProfileModal(){
  const name = document.getElementById('profileName');
  const avatarTypeEl = document.getElementById('profileAvatarType');
  const designation = document.getElementById('profileDesignation');
  const role = document.getElementById('profileRole');
  const email = document.getElementById('profileEmail');
  const schoolNameEl = document.getElementById('profileSchoolName');
  const schoolIdEl = document.getElementById('profileSchoolId');
  const schoolLogoInput = document.getElementById('profileSchoolLogoInput');
  const topbarAvatarInput = document.getElementById('profileTopbarAvatarInput');
  const density = document.getElementById('profileDensity');
  const accent = document.getElementById('profileAccent');
  const defaultView = document.getElementById('profileDefaultView');
  profilePreviewOriginalTheme = normalizeThemeAccentKey(currentUser.preferences?.themeAccent || 'elegant-white');
  if (name) name.value = currentUser.name || '';
  if (avatarTypeEl) avatarTypeEl.value = currentUser.avatar || 'initials';
  setDesignationSelectOptions('profileDesignation', currentUser.designation || '', schoolIdentity.schoolId);
  if (role) role.value = normalizeRoleKey(currentUser.role || 'encoder');
  if (email) email.value = currentUser.email || '';
  if (schoolNameEl) schoolNameEl.value = schoolIdentity.schoolName || '';
  if (schoolIdEl) schoolIdEl.value = schoolIdentity.schoolId || '';
  profileDraftSchoolLogoDataUrl = sanitizeSchoolLogoDataUrl(schoolIdentity.logoDataUrl || '');
  profileDraftTopbarAvatarDataUrl = sanitizeProfileAvatarDataUrl(currentUser.topbarAvatarDataUrl || '');
  if (schoolLogoInput) schoolLogoInput.value = '';
  if (topbarAvatarInput) topbarAvatarInput.value = '';
  if (density) density.value = currentUser.preferences?.tableDensity || 'comfortable';
  if (accent) accent.value = normalizeThemeAccentKey(currentUser.preferences?.themeAccent || 'elegant-white');
  if (defaultView) defaultView.value = currentUser.preferences?.defaultView || 'Dashboard';
  const lastLogin = document.getElementById('profileLastLogin');
  const profileKeyReadOnly = document.getElementById('profileKeyReadonly');
  const profileSessionReadOnly = document.getElementById('profileSessionReadonly');
  const profileMenuProfileKey = document.getElementById('profileMenuProfileKey');
  const profileMenuSchoolId = document.getElementById('profileMenuSchoolId');
  if (lastLogin){
    lastLogin.textContent = `Last login: ${currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleString() : 'Unknown'}`;
  }
  if (profileKeyReadOnly) profileKeyReadOnly.textContent = currentUser.profileKey || 'Not assigned';
  if (profileSessionReadOnly){
    profileSessionReadOnly.textContent = isSessionActive()
      ? `${formatUserRoleLine(currentUser)} | ${sessionState.profileKey || 'unknown-profile'}`
      : 'Not logged in';
  }
  if (profileMenuProfileKey) profileMenuProfileKey.textContent = currentUser.profileKey || 'Not assigned';
  if (profileMenuSchoolId) profileMenuSchoolId.textContent = normalizeSchoolId(schoolIdentity.schoolId || '') || '-';
  renderDesignationManager();
  renderProfileTraceIntegritySummary();
  renderProfileRecentDataActivity();
  syncProfileThemePreview(normalizeThemeAccentKey(accent?.value || currentUser.preferences?.themeAccent || 'elegant-white'));
  setProfileSettingsTab('identity', false);
  clearFieldErrors(profileOverlay);
  const canManageRole = hasRoleCapability('manage_roles');
  const canManageSchool = hasRoleCapability('manage_school_lock');
  const traceRepairBtn = document.getElementById('profileTraceRepairBtn');
  if (role){
    role.disabled = !canManageRole;
    role.title = canManageRole ? '' : 'Only Admin can change role.';
  }
  if (designation){
    designation.disabled = false;
    designation.title = '';
  }
  if (traceRepairBtn){
    traceRepairBtn.disabled = !canManageRole;
    traceRepairBtn.title = canManageRole ? '' : 'Only Admin can repair trace integrity.';
  }
  updateProfileUndoButtonState();
  applyAvatarPreviewSelection(avatarTypeEl?.value || currentUser.avatar || 'initials');
  if (schoolNameEl){
    schoolNameEl.disabled = !canManageSchool;
    schoolNameEl.title = canManageSchool ? '' : 'Only Admin can change school lock.';
  }
  if (schoolIdEl){
    schoolIdEl.disabled = !canManageSchool;
    schoolIdEl.title = canManageSchool ? '' : 'Only Admin can change school lock.';
  }
  if (schoolLogoInput){
    schoolLogoInput.disabled = !canManageSchool;
    schoolLogoInput.title = canManageSchool ? '' : 'Only Admin can change school logo.';
  }
  renderUserIdentity();
  applySchoolLogoPreview(profileDraftSchoolLogoDataUrl, true);
  updateSchoolLogoHint();
  renderTopbarProfileAvatar(
    topbarUserAvatar,
    profileDraftTopbarAvatarDataUrl,
    name?.value || currentUser.name || '',
    avatarTypeEl?.value || currentUser.avatar || 'initials'
  );
  updateTopbarAvatarHint();
  if (profileOverlay) profileOverlay.classList.add('show');
  if (name) setTimeout(() => name.focus(), 10);
}

function closeProfileModal(restoreTheme = true){
  if (restoreTheme){
    const fallback = normalizeThemeAccentKey(currentUser.preferences?.themeAccent || 'elegant-white');
    applyThemeAccent(profilePreviewOriginalTheme || fallback);
    syncProfileThemePreview(profilePreviewOriginalTheme || fallback);
  }
  if (profileOverlay) profileOverlay.classList.remove('show');
  profileDraftSchoolLogoDataUrl = sanitizeSchoolLogoDataUrl(schoolIdentity.logoDataUrl || '');
  profileDraftTopbarAvatarDataUrl = sanitizeProfileAvatarDataUrl(currentUser.topbarAvatarDataUrl || '');
  renderTopbarProfileAvatar(
    topbarUserAvatar,
    profileDraftTopbarAvatarDataUrl,
    currentUser.name || '',
    currentUser.avatar || 'initials'
  );
  renderAppLogo();
}

function saveProfileSettings(){
  const nameEl = document.getElementById('profileName');
  const designationEl = document.getElementById('profileDesignation');
  const roleEl = document.getElementById('profileRole');
  const avatarTypeEl = document.getElementById('profileAvatarType');
  const emailEl = document.getElementById('profileEmail');
  const schoolNameEl = document.getElementById('profileSchoolName');
  const schoolIdEl = document.getElementById('profileSchoolId');
  const densityEl = document.getElementById('profileDensity');
  const accentEl = document.getElementById('profileAccent');
  const defaultViewEl = document.getElementById('profileDefaultView');
  clearFieldErrors(profileOverlay);

  const name = (nameEl?.value || '').trim();
  const designation = (designationEl?.value || '').trim();
  const roleKey = normalizeRoleKey(roleEl?.value || 'encoder');
  const avatarType = PROFILE_AVATAR_KEYS.includes((avatarTypeEl?.value || '').toLowerCase())
    ? (avatarTypeEl?.value || '').toLowerCase()
    : 'initials';
  const normalizedRole = normalizeRoleLabel(roleKey);
  const email = (emailEl?.value || '').trim();
  const schoolName = (schoolNameEl?.value || '').trim();
  const schoolId = normalizeSchoolId(schoolIdEl?.value || '');
  const density = (densityEl?.value || 'comfortable').toLowerCase();
  const accent = normalizeThemeAccentKey(accentEl?.value || 'elegant-white');
  const defaultView = defaultViewEl?.value || 'Dashboard';

  let invalid = false;
  let firstInvalidTab = '';
  if (!name){
    setFieldError(nameEl, true);
    invalid = true;
    if (!firstInvalidTab) firstInvalidTab = 'identity';
  }
  if (!designation){
    setFieldError(designationEl, true);
    invalid = true;
    if (!firstInvalidTab) firstInvalidTab = 'identity';
  }
  if (!validProfileEmail(email)){
    setFieldError(emailEl, true);
    invalid = true;
    if (!firstInvalidTab) firstInvalidTab = 'identity';
  }
  if (!schoolName){
    setFieldError(schoolNameEl, true);
    invalid = true;
    if (!firstInvalidTab) firstInvalidTab = 'school';
  }
  if (!validSchoolId(schoolId)){
    setFieldError(schoolIdEl, true);
    invalid = true;
    if (!firstInvalidTab) firstInvalidTab = 'school';
  }
  if (invalid){
    if (firstInvalidTab) setProfileSettingsTab(firstInvalidTab, true);
    notify('error', 'Complete profile fields correctly before saving (Designation required; School ID should be 4-12 digits).');
    return;
  }
  if (!hasRoleCapability('manage_roles') && normalizeRoleKey(currentUser.role || 'encoder') !== roleKey){
    setProfileSettingsTab('identity', true);
    notify('error', 'Only Admin can change profile role.');
    return;
  }
  if (!hasRoleCapability('manage_school_lock')){
    const localSchoolName = (schoolIdentity.schoolName || '').trim();
    const localSchoolId = normalizeSchoolId(schoolIdentity.schoolId || '');
    const localSchoolLogo = sanitizeSchoolLogoDataUrl(schoolIdentity.logoDataUrl || '');
    const draftLogo = sanitizeSchoolLogoDataUrl(profileDraftSchoolLogoDataUrl || '');
    if (schoolName !== localSchoolName || schoolId !== localSchoolId || draftLogo !== localSchoolLogo){
      setProfileSettingsTab('school', true);
      notify('error', 'Only Admin can change school identity lock or logo.');
      return;
    }
  }

  currentUser = normalizeUser({
    ...currentUser,
    name,
    avatar: avatarType,
    topbarAvatarDataUrl: sanitizeProfileAvatarDataUrl(profileDraftTopbarAvatarDataUrl || ''),
    designation,
    role: normalizedRole,
    email,
    lastLogin: new Date().toISOString(),
    preferences: {
      ...currentUser.preferences,
      tableDensity: density,
      themeAccent: accent,
      defaultView
    }
  });
  saveCurrentUser();
  schoolIdentity = normalizeSchoolIdentity({
    schoolName,
    schoolId,
    logoDataUrl: sanitizeSchoolLogoDataUrl(profileDraftSchoolLogoDataUrl || '')
  });
  saveSchoolIdentity();
  ensureDesignationForSchool(schoolIdentity.schoolId, designation);
  upsertCurrentUserForSchool(schoolIdentity.schoolId);
  schoolSetupEnforced = !isSchoolIdentityConfigured();
  applyThemeAccent(currentUser.preferences.themeAccent);
  renderUserIdentity();
  setTableDensity(currentUser.preferences.tableDensity);
  closeProfileModal(false);
  if (!isSessionActive()) openLoginModal(true);
  notify('success', 'Profile settings updated.');
}

function updateTopbarAvatarHint(){
  const hint = document.getElementById('profileTopbarAvatarHint');
  const removeBtn = document.getElementById('profileTopbarAvatarRemoveBtn');
  const current = sanitizeProfileAvatarDataUrl(currentUser.topbarAvatarDataUrl || '');
  const draft = sanitizeProfileAvatarDataUrl(profileDraftTopbarAvatarDataUrl || '');
  const hasAvatar = !!(draft || current);
  if (hint){
    hint.textContent = draft
      ? 'Icon selected. Save profile to apply.'
      : (current ? 'Current icon active. Upload new icon then save to replace.' : 'No icon selected.');
  }
  if (removeBtn){
    removeBtn.disabled = !hasAvatar;
  }
}

function handleTopbarAvatarUpload(event){
  const file = event?.target?.files?.[0];
  if (!file) return;
  if (!/^image\/(png|jpeg|jpg|webp|svg\+xml)$/i.test(file.type || '')){
    notify('error', 'Unsupported image format. Use PNG, JPG, WEBP, or SVG.');
    event.target.value = '';
    return;
  }
  const maxBytes = 1024 * 1024;
  if (file.size > maxBytes){
    notify('error', 'Icon file is too large. Max size is 1MB.');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = sanitizeProfileAvatarDataUrl(reader.result || '');
    if (!dataUrl){
      notify('error', 'Invalid icon image data.');
      return;
    }
    profileDraftTopbarAvatarDataUrl = dataUrl;
    renderTopbarProfileAvatar(
      topbarUserAvatar,
      profileDraftTopbarAvatarDataUrl,
      document.getElementById('profileName')?.value || currentUser.name || '',
      document.getElementById('profileAvatarType')?.value || currentUser.avatar || 'initials'
    );
    updateTopbarAvatarHint();
  };
  reader.onerror = () => notify('error', 'Unable to read icon file.');
  reader.readAsDataURL(file);
}

function clearTopbarAvatarDraft(){
  profileDraftTopbarAvatarDataUrl = '';
  const input = document.getElementById('profileTopbarAvatarInput');
  if (input) input.value = '';
  renderTopbarProfileAvatar(
    topbarUserAvatar,
    '',
    document.getElementById('profileName')?.value || currentUser.name || '',
    document.getElementById('profileAvatarType')?.value || currentUser.avatar || 'initials'
  );
  updateTopbarAvatarHint();
}
