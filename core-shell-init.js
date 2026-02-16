function initializeShellState(){
  fab.style.display = 'none';
  fab.setAttribute('tabindex', '0');
  fab.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      toggleSheet();
    }
  });
  sheet.classList.remove('show');
  ['icsEulNotifyLeadDays', 'icsEulAlertResolved', 'icsPastSilentNotified'].forEach((k) => localStorage.removeItem(k));
  renderNotifications();
  refreshInputTitles(sheet);
  refreshAutoSuggest();
  applyThemeAccent(currentUser.preferences?.themeAccent || 'elegant-white');
  renderUserIdentity();
  applyTableDensity();
  window.addEventListener('resize', () => {
    if (sheet.classList.contains('show')) requestAnimationFrame(placeSheetNearAddItemButton);
  });
  document.addEventListener('input', (e) => {
    if (e.target?.classList?.contains('field-error')) e.target.classList.remove('field-error');
  });
  document.addEventListener('change', (e) => {
    if (e.target?.classList?.contains('field-error')) e.target.classList.remove('field-error');
  });
}
