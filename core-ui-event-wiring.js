function initializeUIEventWiring(){
  fab?.addEventListener('click', () => toggleSheet());
  searchBtn?.addEventListener('click', () => openSearchOverlay());
  dataManagerBtn?.addEventListener('click', () => openDataManagerModal('hub'));
  mobileProfileBtn?.addEventListener('click', () => openProfileModal());
  installAppBtn?.addEventListener('click', () => installPWAApp());
  updateAppBtn?.addEventListener('click', () => {
    if (typeof window.checkForPWAUpdateManual === 'function'){
      window.checkForPWAUpdateManual();
      return;
    }
    showModal('App Update', 'Update checker is still initializing. Try again in a moment.');
  });
  bottomNewIcsBtn?.addEventListener('click', () => {
    if (!hasRoleCapability('edit_records')){
      notify('error', `Access denied. ${normalizeRoleLabel(currentUser?.role)} role cannot open ICS editor.`);
      return;
    }
    if (activeViewKey() !== 'Manage Inventory') goToView('Manage Inventory');
    setTimeout(() => toggleSheet(), 0);
  });
  sidebarToggleBtn?.addEventListener('click', () => toggleSidebarCollapsed());
  sidebarProfileBtn?.addEventListener('click', () => openProfileModal());
  sidebarUserAvatar?.addEventListener('click', () => {
    if (document.body.classList.contains('sidebar-collapsed')) openProfileModal();
  });
  sidebarSignOutIconBtn?.addEventListener('click', () => signOutSession());
  searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) closeSearchOverlay();
  });
  document.getElementById('profileOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'profileOverlay') closeProfileModal();
  });
  document.querySelectorAll('#profileSideMenu .profile-menu-btn').forEach((btn) => {
    btn.addEventListener('click', () => setProfileSettingsTab(btn.dataset.profileTab || 'identity', true));
  });
  document.getElementById('setupOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'setupOverlay') closeSetupModal();
  });
  document.getElementById('loginOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'loginOverlay') closeLoginModal();
  });
  document.getElementById('icsDetailsOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'icsDetailsOverlay') closeICSDetailsModal();
  });
  document.getElementById('icsRecordHistoryOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'icsRecordHistoryOverlay') closeICSRecordHistoryModal();
  });
  document.getElementById('archivedHistoryOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'archivedHistoryOverlay') closeArchivedHistoryModal();
  });
  document.getElementById('wasteReportOverlay')?.addEventListener('click', (e) => {
    if (
      e.target?.id === 'wasteReportOverlay'
      && e.target?.classList?.contains('actions-modal-overlay')
    ) closeWasteReportModal();
  });
  document.getElementById('dataHubOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'dataHubOverlay') closeDataHubModal();
  });
  document.getElementById('dataImportOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'dataImportOverlay') closeDataImportModal();
  });
  document.getElementById('dataValidationOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'dataValidationOverlay') closeDataValidationModal();
  });
  document.getElementById('dataExportOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'dataExportOverlay') closeDataExportModal();
  });
  document.addEventListener('pointerdown', (e) => {
    if (activeViewKey() !== 'Manage Inventory') return;
    if (!sheet.classList.contains('show')) return;
    if (typeof getOpenOverlayIds === 'function' && getOpenOverlayIds().length) return;
    const target = e.target;
    if (target?.closest?.('#sheet')) return;
    if (target?.closest?.('.fab')) return;
    closeSheet();
  });
  document.getElementById('dmExportYear')?.addEventListener('change', () => refreshDataManagerExportFilters());
  document.getElementById('dmExportMonth')?.addEventListener('change', () => updateDataManagerExportFilterHint());
  document.getElementById('icsImportInput')?.addEventListener('change', (e) => handleImportFile(e));
  dataManagerImportInput?.addEventListener('change', (e) => handleDataManagerFile(e));
  dataManagerValidateInput?.addEventListener('change', (e) => handleDataManagerValidateFile(e));
  document.getElementById('profileName')?.addEventListener('input', (e) => {
    const avatar = document.getElementById('profileAvatarPreview');
    const type = (document.getElementById('profileAvatarType')?.value || currentUser.avatar || 'initials').toLowerCase();
    renderUserAvatar(avatar, e.target?.value || currentUser.name || '', type);
    renderUserAvatar(sidebarUserAvatar, e.target?.value || currentUser.name || '', type);
  });
  document.querySelectorAll('#profileAvatarPicker .avatar-picker-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = (btn.dataset.avatar || 'initials').toLowerCase();
      applyAvatarPreviewSelection(next);
      const name = (document.getElementById('profileName')?.value || currentUser.name || '');
      renderUserAvatar(document.getElementById('profileAvatarPreview'), name, next);
      renderUserAvatar(sidebarUserAvatar, name, next);
    });
  });
  document.getElementById('profileSchoolId')?.addEventListener('input', (e) => {
    const next = normalizeSchoolId(e.target?.value || '');
    if (e.target.value !== next) e.target.value = next;
  });
  document.getElementById('profileSchoolLogoInput')?.addEventListener('change', (e) => handleSchoolLogoUpload(e));
  document.getElementById('setupSchoolId')?.addEventListener('input', (e) => {
    const next = normalizeSchoolId(e.target?.value || '');
    if (e.target.value !== next) e.target.value = next;
  });
  document.getElementById('loginSchoolId')?.addEventListener('input', (e) => {
    const next = normalizeSchoolId(e.target?.value || '');
    if (e.target.value !== next) e.target.value = next;
    renderLoginProfileOptions();
  });
  document.getElementById('loginProfileSelect')?.addEventListener('change', () => {
    setLoginHint('Press Login to continue.', '');
  });
  document.querySelectorAll('#profileThemePreview .theme-preview-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTheme = btn.dataset.theme || '';
      syncProfileThemePreview(targetTheme);
      applyThemeAccent(targetTheme);
    });
  });
  document.getElementById('icsDetailsCloseBtn')?.addEventListener('click', () => closeICSDetailsModal());
  document.getElementById('icsRecordHistoryCloseBtn')?.addEventListener('click', () => closeICSRecordHistoryModal());
  document.getElementById('archivedHistoryCloseBtn')?.addEventListener('click', () => closeArchivedHistoryModal());
  document.getElementById('setupCloseBtn')?.addEventListener('click', () => closeSetupModal());
  document.getElementById('setupCancelBtn')?.addEventListener('click', () => closeSetupModal());
  document.getElementById('setupSubmitBtn')?.addEventListener('click', () => submitInitialSetup());
  document.getElementById('loginNewPersonnelBtn')?.addEventListener('click', () => openPersonnelSignupFromLogin());
  document.getElementById('loginSubmitBtn')?.addEventListener('click', () => submitLogin());
  document.getElementById('profileSchoolLogoRemoveBtn')?.addEventListener('click', () => clearSchoolLogoDraft());
  document.getElementById('profileTraceRepairBtn')?.addEventListener('click', () => repairLocalTraceIntegrity());
  document.getElementById('profileTraceUndoBtn')?.addEventListener('click', () => undoLastDataChange());
  document.getElementById('designationAddBtn')?.addEventListener('click', () => addDesignationFromProfile());
  document.getElementById('designationListReadonly')?.addEventListener('click', (e) => {
    const target = e.target?.closest?.('[data-designation-remove]');
    if (!target) return;
    const raw = target.getAttribute('data-designation-remove') || '';
    removeDesignationFromProfile(decodeURIComponent(raw));
  });
  document.getElementById('profileSignOutBtn')?.addEventListener('click', () => signOutSession());
  document.getElementById('profileCancelBtn')?.addEventListener('click', () => closeProfileModal());
  document.getElementById('profileSaveBtn')?.addEventListener('click', () => saveProfileSettings());
  document.getElementById('dataHubCloseBtn')?.addEventListener('click', () => closeDataHubModal());
  document.getElementById('dataHubOpenImportBtn')?.addEventListener('click', () => openDataImportModal());
  document.getElementById('dataHubOpenExportBtn')?.addEventListener('click', () => openDataExportModal());
  document.getElementById('dataHubAutoPopulateBtn')?.addEventListener('click', () => openAutoPopulateFromDataHub());
  document.getElementById('dataImportCloseBtn')?.addEventListener('click', () => closeDataImportModal());
  document.getElementById('dmChooseFileBtn')?.addEventListener('click', () => triggerDataManagerFile());
  document.getElementById('dmValidateFileBtn')?.addEventListener('click', () => triggerDataManagerValidateFile());
  document.getElementById('dmOpenExportBtn')?.addEventListener('click', () => openDataExportModal());
  document.getElementById('dmOpenValidationBtn')?.addEventListener('click', () => openDataValidationModal());
  document.getElementById('dataValidationCloseBtn')?.addEventListener('click', () => closeDataValidationModal());
  document.getElementById('dmBackToImportBtn')?.addEventListener('click', () => openDataImportModal());
  document.getElementById('dmMigrationDetailsBtn')?.addEventListener('click', () => openDataManagerMigrationReport());
  document.getElementById('dmConflictReportBtn')?.addEventListener('click', () => downloadDataManagerConflictReport());
  document.getElementById('dmApplyImportBtn')?.addEventListener('click', () => applyDataManagerImport());
  document.getElementById('dataExportCloseBtn')?.addEventListener('click', () => closeDataExportModal());
  document.getElementById('dmExportRecordsBtn')?.addEventListener('click', () => exportSchemaVersionedData('records'));
  document.getElementById('dmExportFullBtn')?.addEventListener('click', () => exportSchemaVersionedData('full'));
  document.getElementById('dmOpenImportBtn')?.addEventListener('click', () => openDataImportModal());
  initializeDelegatedActionRouting();
  initializeModalScrollShadows();
}

function parseDelegatedArg(value){
  if (value === undefined || value === null) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

function invokeDelegatedAction(action, target, args){
  switch (action){
    case 'openSearchOverlay': return openSearchOverlay();
    case 'openProfileModal': return openProfileModal();
    case 'toggleNotificationsPanel': return typeof toggleNotificationsPanel === 'function' ? toggleNotificationsPanel() : undefined;
    case 'goToView': return goToView(args[0]);
    case 'dashboardNewICS': return dashboardNewICS();
    case 'openDataManagerModal': return openDataManagerModal(args[0]);
    case 'dashboardOpenActions': return dashboardOpenActions();
    case 'dashboardOpenArchives': return dashboardOpenArchives();
    case 'clearInventoryFilter': return clearInventoryFilter();
    case 'finalizeICS': return finalizeICS();
    case 'clearArchivesFilter': return clearArchivesFilter();
    case 'clearActionCenterICSFilter': return clearActionCenterICSFilter();
    case 'setTableDensity': return setTableDensity(args[0]);
    case 'openBatchWasteReportFromActionCenter': return openBatchWasteReportFromActionCenter();
    case 'closeInspectionModal': return closeInspectionModal();
    case 'saveInspection': return saveInspection();
    case 'saveInspectionAndArchive': return saveInspectionAndArchive();
    case 'closeInspectionHistory': return closeInspectionHistory();
    case 'openArchiveModal': return openArchiveModal(args[0], args[1]);
    case 'closeArchiveModal': return closeArchiveModal(args[0]);
    case 'confirmArchiveItem': return confirmArchiveItem();
    case 'closeWasteReportModal': return closeWasteReportModal();
    case 'saveWasteReportMetadata': return saveWasteReportMetadata(args[0]);
    case 'openBatchWasteReportBuilderArchived': return openBatchWasteReportBuilderArchived();
    case 'printWasteReportBuilderSelection': return printWasteReportBuilderSelection();
    case 'exitWmrBatchBuilderMode': return exitWmrBatchBuilderMode();
    case 'openICSDetailsByKey': return openICSDetailsByKey(args[0], args[1]);
    case 'openICSDetailsByIndex': return openICSDetailsByIndex(args[0]);
    case 'openPastEULForItem': return openPastEULForItem(args[0], args[1]);
    case 'openNearEULForItem': return openNearEULForItem(args[0], args[1]);
    case 'editICS': return editICS(args[0]);
    case 'printICS': return printICS(args[0]);
    case 'exportICS': return exportICS(args[0]);
    case 'deleteICS': return deleteICS(args[0]);
    case 'openArchivedItemHistory': return openArchivedItemHistory(args[0]);
    case 'unarchiveItem': return unarchiveItem(args[0]);
    case 'openInspectionHistory': return openInspectionHistory(args[0], args[1]);
    case 'activateSearchResult': return activateSearchResult(args[0]);
    case 'icsDetailsEditFromTitle': return icsDetailsEditFromTitle();
    case 'openICSRecordHistoryModal': return openICSRecordHistoryModal();
    case 'exportArchivedHistoryReport': return exportArchivedHistoryReport();
    case 'printWasteMaterialsReport': return printWasteMaterialsReport(args[0], args[1]);
    case 'printWasteMaterialsReportForICS': return printWasteMaterialsReportForICS(args[0]);
    case 'printWasteMaterialsReportArchived': return printWasteMaterialsReportArchived(args[0]);
    case 'printBatchWasteMaterialsReportArchived': return printBatchWasteMaterialsReportArchived();
    case 'closeModal': return closeModal();
    case 'runConfirmAction': return runConfirmAction();
    default:
      return;
  }
}

function initializeDelegatedActionRouting(){
  document.addEventListener('click', (e) => {
    const stageAddBtn = e.target?.closest?.('.stage-add-row-btn');
    if (stageAddBtn){
      addRow();
      return;
    }
    const stageDelBtn = e.target?.closest?.('.stage-del-row-btn');
    if (stageDelBtn){
      delRow(stageDelBtn);
      return;
    }
    const stageEulBtn = e.target?.closest?.('[data-stage-eul-delta]');
    if (stageEulBtn){
      const delta = Number(stageEulBtn.getAttribute('data-stage-eul-delta') || '0');
      adjustEUL(stageEulBtn, Number.isFinite(delta) ? delta : 0);
      return;
    }
    const actionNode = e.target?.closest?.('[data-action]');
    if (!actionNode) return;
    const action = actionNode.getAttribute('data-action') || '';
    if (!action) return;
    const args = [
      parseDelegatedArg(actionNode.getAttribute('data-arg1')),
      parseDelegatedArg(actionNode.getAttribute('data-arg2')),
      parseDelegatedArg(actionNode.getAttribute('data-arg3')),
      parseDelegatedArg(actionNode.getAttribute('data-arg4'))
    ].filter((v) => v !== undefined);
    invokeDelegatedAction(action, actionNode, args);
  });
  document.addEventListener('change', (e) => {
    const input = e.target?.closest?.('.wmr-batch-item-input');
    if (!input) return;
    commitWmrBatchItemInput(input);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const input = e.target?.closest?.('.wmr-batch-item-input');
    if (!input) return;
    e.preventDefault();
    commitWmrBatchItemInput(input);
  });

  document.addEventListener('change', (e) => {
    const target = e.target;
    if (!target || !target.matches) return;
    const action = target.getAttribute('data-action-change');
    if (action === 'onInspectionChange'){
      onInspectionChange(target, target.getAttribute('data-arg1') || '', target.getAttribute('data-arg2') || '');
      return;
    }
    if (action === 'toggleActionCenterSelection'){
      toggleActionCenterSelection(target.getAttribute('data-arg1') || '', target.getAttribute('data-arg2') || '', !!target.checked);
    }
  });

  document.addEventListener('input', (e) => {
    const target = e.target;
    if (!target || !target.matches || !target.closest('#icsBody')) return;
    if (target.matches('.stage-desc')){
      handleDescInput(target);
      return;
    }
    if (target.matches('.stage-itemno')){
      onItemNoInput(target);
      return;
    }
    if (target.matches('.stage-qty, .stage-unitcost')){
      syncRow(target);
    }
  });

  document.addEventListener('focusin', (e) => {
    const target = e.target;
    if (!target || !target.matches || !target.closest('#icsBody')) return;
    if (target.matches('.stage-itemno')){
      prefillItemNo(target);
      return;
    }
    if (target.matches('.stage-unit')){
      updateUnitSuggestionsForRow(target.closest('tr'));
    }
  });

  document.addEventListener('focusout', (e) => {
    const target = e.target;
    if (!target || !target.matches || !target.closest('#icsBody')) return;
    if (target.matches('.stage-unitcost')){
      formatCurrencyInput(target);
    }
  });
}

function initializeModalScrollShadows(){
  document.querySelectorAll('.actions-modal').forEach((modal) => {
    const body = modal.querySelector('.modal-body');
    const foot = modal.querySelector('.modal-foot');
    if (!body || !foot) return;
    const syncShadow = () => {
      const isScrollable = body.scrollHeight > body.clientHeight + 1;
      const showShadow = isScrollable && body.scrollTop > 2;
      modal.classList.toggle('modal-body-scrolled', showShadow);
    };
    body.addEventListener('scroll', syncShadow, { passive: true });
    window.addEventListener('resize', syncShadow);
    requestAnimationFrame(syncShadow);
  });
}
