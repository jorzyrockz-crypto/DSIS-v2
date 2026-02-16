function applyThemeAccent(accent){
  const key = Object.prototype.hasOwnProperty.call(ACCENT_THEMES, accent) ? accent : 'elegant-white';
  const theme = ACCENT_THEMES[key];
  const isDark = key === 'dracula' || key === 'crimson-black';
  if (document.body) document.body.dataset.theme = key;
  document.documentElement.style.setProperty('--a', theme.a);
  document.documentElement.style.setProperty('--as', theme.as);
  document.documentElement.style.setProperty('--ah', theme.ah);
  document.documentElement.style.setProperty('--bg', theme.bg);
  document.documentElement.style.setProperty('--m', theme.m);
  document.documentElement.style.setProperty('--t', theme.t);
  document.documentElement.style.setProperty('--tm', theme.tm);
  document.documentElement.style.setProperty('--border', theme.border);
  document.documentElement.style.setProperty('--sidebar-bg', theme.sidebarBg);
  document.documentElement.style.setProperty('--topbar-bg', theme.topbarBg);
  document.documentElement.style.setProperty('--icon-btn-bg', theme.iconBtnBg);
  document.documentElement.style.setProperty('--icon-btn-text', theme.iconBtnText);
  document.documentElement.style.setProperty('--icon-btn-border', theme.iconBtnBorder);
  document.documentElement.style.setProperty('--modal-bg', theme.modalBg);
  document.documentElement.style.setProperty('--modal-border', theme.modalBorder);
  document.documentElement.style.setProperty('--modal-head-bg', theme.modalHeadBg);
  document.documentElement.style.setProperty('--modal-head-border', theme.modalHeadBorder);
  document.documentElement.style.setProperty('--modal-foot-bg', theme.modalFootBg);
  document.documentElement.style.setProperty('--modal-foot-border', theme.modalFootBorder);
  document.documentElement.style.setProperty('--btn-add-bg', theme.btnAddBg);
  document.documentElement.style.setProperty('--btn-add-text', theme.btnAddText);
  document.documentElement.style.setProperty('--btn-primary-bg', theme.btnPrimaryBg);
  document.documentElement.style.setProperty('--btn-primary-text', theme.btnPrimaryText);
  document.documentElement.style.setProperty('--btn-del-bg', theme.btnDelBg);
  document.documentElement.style.setProperty('--btn-del-text', theme.btnDelText);
  document.documentElement.style.setProperty('--btn-secondary-bg', theme.btnSecondaryBg);
  document.documentElement.style.setProperty('--btn-secondary-text', theme.btnSecondaryText);
  const stagedCardBg = isDark
    ? `linear-gradient(180deg,${theme.modalBg} 0%,${theme.m} 100%)`
    : `linear-gradient(180deg,${theme.as} 0%,${theme.m} 100%)`;
  const stagedCardBorder = theme.border;
  const stagedContextText = theme.t;
  const stagedTableWrapBg = isDark ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.9)';
  const stagedTableWrapBorder = theme.border;
  const stagedRowBg = isDark ? 'rgba(255,255,255,.03)' : theme.modalBg;
  const stagedRowAltBg = isDark ? 'rgba(255,255,255,.06)' : theme.as;
  const stagedActionIconBg = isDark ? 'rgba(255,255,255,.08)' : theme.modalBg;
  const stagedActionIconBorder = theme.border;
  const stagedActionIconText = isDark ? theme.t : theme.tm;
  const stagedActionIconHoverBg = isDark ? 'rgba(255,255,255,.14)' : theme.as;
  const stagedActionIconHoverBorder = isDark ? theme.a : theme.ah;
  const stagedActionIconHoverText = isDark ? theme.t : theme.ah;
  const stagedEulBg = isDark ? 'rgba(255,255,255,.08)' : theme.modalBg;
  const stagedEulBorder = theme.border;
  const stagedEulText = isDark ? theme.t : theme.tm;
  const stagedEulHoverBg = isDark ? theme.as : theme.as;
  const stagedEulHoverBorder = isDark ? theme.a : theme.ah;
  document.documentElement.style.setProperty('--staged-card-bg', stagedCardBg);
  document.documentElement.style.setProperty('--staged-card-border', stagedCardBorder);
  document.documentElement.style.setProperty('--staged-context-text', stagedContextText);
  document.documentElement.style.setProperty('--staged-table-wrap-bg', stagedTableWrapBg);
  document.documentElement.style.setProperty('--staged-table-wrap-border', stagedTableWrapBorder);
  document.documentElement.style.setProperty('--staged-row-bg', stagedRowBg);
  document.documentElement.style.setProperty('--staged-row-alt-bg', stagedRowAltBg);
  document.documentElement.style.setProperty('--staged-action-icon-bg', stagedActionIconBg);
  document.documentElement.style.setProperty('--staged-action-icon-border', stagedActionIconBorder);
  document.documentElement.style.setProperty('--staged-action-icon-text', stagedActionIconText);
  document.documentElement.style.setProperty('--staged-action-icon-hover-bg', stagedActionIconHoverBg);
  document.documentElement.style.setProperty('--staged-action-icon-hover-border', stagedActionIconHoverBorder);
  document.documentElement.style.setProperty('--staged-action-icon-hover-text', stagedActionIconHoverText);
  document.documentElement.style.setProperty('--staged-eul-bg', stagedEulBg);
  document.documentElement.style.setProperty('--staged-eul-border', stagedEulBorder);
  document.documentElement.style.setProperty('--staged-eul-text', stagedEulText);
  document.documentElement.style.setProperty('--staged-eul-hover-bg', stagedEulHoverBg);
  document.documentElement.style.setProperty('--staged-eul-hover-border', stagedEulHoverBorder);
  document.documentElement.style.setProperty('--sheet-bg', isDark
    ? `linear-gradient(160deg,${theme.modalBg} 0%,${theme.as} 100%)`
    : `linear-gradient(160deg,${theme.as} 0%,${theme.m} 100%)`);
  document.documentElement.style.setProperty('--sheet-border', theme.border);
  document.documentElement.style.setProperty('--sheet-shadow', isDark
    ? '0 14px 30px rgba(0,0,0,.45)'
    : '0 14px 30px rgba(15,23,42,.2)');
  document.documentElement.style.setProperty('--sheet-heading', theme.ah);
  document.documentElement.style.setProperty('--sheet-label', theme.tm);
  document.documentElement.style.setProperty('--sheet-input-bg', isDark ? 'rgba(0,0,0,.25)' : theme.modalBg);
  document.documentElement.style.setProperty('--sheet-input-border', theme.border);
  document.documentElement.style.setProperty('--sheet-input-text', theme.t);
  document.documentElement.style.setProperty('--sheet-input-placeholder', isDark ? '#94a3b8' : '#64748b');
  document.documentElement.style.setProperty('--sheet-input-focus-border', theme.a);
  document.documentElement.style.setProperty('--sheet-input-focus-ring', isDark
    ? '0 0 0 2px rgba(255,255,255,.14)'
    : '0 0 0 2px rgba(59,130,246,.25)');
  document.documentElement.style.setProperty('--fab-focus-ring', isDark
    ? '0 0 0 3px rgba(255,255,255,.22),0 10px 22px rgba(0,0,0,.45)'
    : '0 0 0 3px rgba(191,219,254,.9),0 10px 22px rgba(37,99,235,.34)');
}

function applyTableDensity(){
  document.body.dataset.density = tableDensity;
}

function setTableDensity(mode){
  const next = (mode || '').toLowerCase();
  if (!['comfortable', 'compact'].includes(next)) return;
  tableDensity = next;
  localStorage.setItem('icsTableDensity', next);
  if (currentUser?.preferences){
    currentUser.preferences.tableDensity = next;
    saveCurrentUser();
  }
  applyTableDensity();
  const active = activeViewKey();
  if (active) renderView(active);
}

function setFieldError(target, on){
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!el || !el.classList) return;
  if (on) el.classList.add('field-error');
  else el.classList.remove('field-error');
}

function clearFieldErrors(scope){
  const root = scope || document;
  root.querySelectorAll('.field-error').forEach((el) => el.classList.remove('field-error'));
}

function syncProfileThemePreview(selected){
  const accentEl = document.getElementById('profileAccent');
  const next = selected || accentEl?.value || '';
  if (accentEl && next) accentEl.value = next;
  document.querySelectorAll('#profileThemePreview .theme-preview-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === next);
  });
}

function setProfileSettingsTab(tab, focusInput = false){
  const safe = ['identity', 'school', 'preferences', 'security'].includes((tab || '').toLowerCase())
    ? tab.toLowerCase()
    : 'identity';
  document.querySelectorAll('#profileSideMenu .profile-menu-btn').forEach((btn) => {
    const active = (btn.dataset.profileTab || '') === safe;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.profile-pane').forEach((pane) => {
    pane.classList.toggle('active', pane.dataset.profilePane === safe);
  });
  if (!focusInput) return;
  const target = {
    identity: document.getElementById('profileName'),
    school: document.getElementById('profileSchoolName'),
    preferences: document.getElementById('profileDefaultView')
  }[safe];
  target?.focus?.();
}
