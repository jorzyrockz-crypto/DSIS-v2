const PROFILE_IMAGE_MAX_BYTES = 1024 * 1024;
let myProfileDraftPhotoDataUrl = '';

function estimateDataUrlBytes(dataUrl){
  const raw = (dataUrl || '').toString();
  const marker = ';base64,';
  const at = raw.indexOf(marker);
  if (at < 0) return raw.length;
  const payload = raw.slice(at + marker.length).replace(/\s+/g, '');
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

function readFileAsDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result || '').toString());
    reader.onerror = () => reject(new Error('read-failed'));
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(dataUrl){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image-load-failed'));
    img.src = dataUrl;
  });
}

async function resizeImageDataUrlToLimit(dataUrl, maxBytes){
  const safe = sanitizeProfileAvatarDataUrl(dataUrl || '');
  if (!safe) return '';
  if (estimateDataUrlBytes(safe) <= maxBytes) return safe;
  let img;
  try {
    img = await loadImageFromDataUrl(safe);
  } catch (_err){
    return '';
  }
  const srcWidth = Math.max(1, Number(img.naturalWidth || img.width || 1));
  const srcHeight = Math.max(1, Number(img.naturalHeight || img.height || 1));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  let scale = 1;
  for (let attempt = 0; attempt < 12; attempt += 1){
    if (attempt > 0 && attempt % 2 === 0) scale *= 0.86;
    const quality = Math.max(0.38, 0.92 - (attempt * 0.06));
    const width = Math.max(120, Math.round(srcWidth * scale));
    const height = Math.max(120, Math.round(srcHeight * scale));
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const candidate = canvas.toDataURL('image/jpeg', quality);
    if (estimateDataUrlBytes(candidate) <= maxBytes){
      return sanitizeProfileAvatarDataUrl(candidate);
    }
  }
  return '';
}

function renderMyProfilePhotoPreview(dataUrl, displayName = ''){
  const button = document.getElementById('myProfilePhotoButton');
  const content = document.getElementById('myProfilePhotoContent');
  if (!button || !content) return;
  const next = sanitizeProfileAvatarDataUrl(dataUrl || '');
  if (next){
    button.style.backgroundImage = `url("${next}")`;
    button.classList.add('has-image');
    return;
  }
  button.style.backgroundImage = '';
  button.classList.remove('has-image');
  renderUserAvatar(content, displayName || currentUser?.name || '', currentUser?.avatar || 'initials');
}

function triggerMyProfilePhotoUpload(){
  const input = document.getElementById('myProfilePhotoInput');
  if (!input) return;
  input.click();
}

function openMyProfileModal(){
  const overlay = document.getElementById('myProfileOverlay');
  const name = document.getElementById('myProfileName');
  const role = document.getElementById('myProfileRole');
  const email = document.getElementById('myProfileEmail');
  const phone = document.getElementById('myProfilePhone');
  const bio = document.getElementById('myProfileBio');
  const input = document.getElementById('myProfilePhotoInput');
  const hint = document.getElementById('myProfilePhotoHint');
  if (!overlay) return;
  myProfileDraftPhotoDataUrl = sanitizeProfileAvatarDataUrl(currentUser?.topbarAvatarDataUrl || '');
  if (name) name.value = currentUser?.name || '';
  if (role){
    role.value = ((currentUser?.designation || '').toString().trim() || normalizeRoleLabel(currentUser?.role || 'encoder')).trim();
  }
  if (email) email.value = currentUser?.email || '';
  if (phone) phone.value = (currentUser?.phone || '').toString();
  if (bio) bio.value = (currentUser?.bio || '').toString();
  if (input) input.value = '';
  if (hint){
    hint.textContent = myProfileDraftPhotoDataUrl
      ? 'Click photo to replace. Image auto-resizes under 1MB.'
      : 'Click photo to upload. Images are auto-resized under 1MB.';
  }
  renderMyProfilePhotoPreview(myProfileDraftPhotoDataUrl, name?.value || currentUser?.name || '');
  overlay.classList.add('show');
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
  if (name) setTimeout(() => name.focus(), 10);
}

function closeMyProfileModal(){
  const overlay = document.getElementById('myProfileOverlay');
  const input = document.getElementById('myProfilePhotoInput');
  if (overlay) overlay.classList.remove('show');
  if (input) input.value = '';
  myProfileDraftPhotoDataUrl = '';
  renderMyProfilePhotoPreview('', currentUser?.name || '');
}

async function handleMyProfilePhotoUpload(event){
  const file = event?.target?.files?.[0];
  const hint = document.getElementById('myProfilePhotoHint');
  if (!file) return;
  if (!/^image\/(png|jpeg|jpg|webp|svg\+xml)$/i.test(file.type || '')){
    notify('error', 'Unsupported image format. Use PNG, JPG, WEBP, or SVG.');
    event.target.value = '';
    return;
  }
  let dataUrl = '';
  try {
    dataUrl = await readFileAsDataUrl(file);
  } catch (_err){
    notify('error', 'Unable to read photo file.');
    event.target.value = '';
    return;
  }
  const safe = sanitizeProfileAvatarDataUrl(dataUrl || '');
  if (!safe){
    notify('error', 'Invalid image data.');
    event.target.value = '';
    return;
  }
  if (estimateDataUrlBytes(safe) <= PROFILE_IMAGE_MAX_BYTES){
    myProfileDraftPhotoDataUrl = safe;
    renderMyProfilePhotoPreview(myProfileDraftPhotoDataUrl, document.getElementById('myProfileName')?.value || currentUser?.name || '');
    if (hint) hint.textContent = 'Photo selected. Save changes to apply.';
    return;
  }
  const resized = await resizeImageDataUrlToLimit(safe, PROFILE_IMAGE_MAX_BYTES);
  if (!resized){
    notify('error', 'Could not resize image under 1MB. Try a smaller image.');
    event.target.value = '';
    return;
  }
  myProfileDraftPhotoDataUrl = resized;
  renderMyProfilePhotoPreview(myProfileDraftPhotoDataUrl, document.getElementById('myProfileName')?.value || currentUser?.name || '');
  if (hint) hint.textContent = 'Photo auto-resized and ready. Save changes to apply.';
}

function saveMyProfileModal(){
  const nameEl = document.getElementById('myProfileName');
  const emailEl = document.getElementById('myProfileEmail');
  const phoneEl = document.getElementById('myProfilePhone');
  const bioEl = document.getElementById('myProfileBio');
  const name = (nameEl?.value || '').trim();
  const email = (emailEl?.value || '').trim();
  if (!name){
    notify('error', 'Full Name is required.');
    nameEl?.focus();
    return;
  }
  if (!validProfileEmail(email)){
    notify('error', 'Enter a valid email address.');
    emailEl?.focus();
    return;
  }
  currentUser = normalizeUser({
    ...currentUser,
    name,
    email,
    phone: (phoneEl?.value || '').trim(),
    bio: (bioEl?.value || '').trim(),
    topbarAvatarDataUrl: sanitizeProfileAvatarDataUrl(myProfileDraftPhotoDataUrl || currentUser?.topbarAvatarDataUrl || '')
  });
  saveCurrentUser();
  if ((schoolIdentity?.schoolId || '').trim()) upsertCurrentUserForSchool(schoolIdentity.schoolId);
  renderUserIdentity();
  updateTopbarProfileMenuIdentity();
  closeMyProfileModal();
  notify('success', 'My Profile updated.');
}

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
  const passwordEl = document.getElementById('profilePassword');
  const passwordConfirmEl = document.getElementById('profilePasswordConfirm');
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
  if (passwordEl) passwordEl.value = '';
  if (passwordConfirmEl) passwordConfirmEl.value = '';
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
  const passwordEl = document.getElementById('profilePassword');
  const passwordConfirmEl = document.getElementById('profilePasswordConfirm');
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
  const password = normalizeProfilePassword(passwordEl?.value || '');
  const confirmPassword = normalizeProfilePassword(passwordConfirmEl?.value || '');

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
  if (password || confirmPassword){
    if (password.length < 4){
      setProfileSettingsTab('security', true);
      setFieldError(passwordEl, true);
      notify('error', 'Password must be at least 4 characters.');
      passwordEl?.focus();
      return;
    }
    if (password !== confirmPassword){
      setProfileSettingsTab('security', true);
      setFieldError(passwordEl, true);
      setFieldError(passwordConfirmEl, true);
      notify('error', 'Password and Confirm Password do not match.');
      passwordConfirmEl?.focus();
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
    authPassword: password ? password : normalizeProfilePassword(currentUser.authPassword || ''),
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
