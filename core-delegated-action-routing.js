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
    case 'openMyProfileFromMenu': return typeof openMyProfileFromMenu === 'function' ? openMyProfileFromMenu() : undefined;
    case 'toggleProfileMenu': return typeof toggleTopbarProfileMenu === 'function' ? toggleTopbarProfileMenu() : undefined;
    case 'openProfileFromMenu': return typeof openProfileFromMenu === 'function' ? openProfileFromMenu(args[0]) : undefined;
    case 'openAuditLogsFromMenu': return typeof openAuditLogsFromMenu === 'function' ? openAuditLogsFromMenu() : undefined;
    case 'installAppFromMenu': return typeof installAppFromMenu === 'function' ? installAppFromMenu() : undefined;
    case 'checkUpdateFromMenu': return typeof checkUpdateFromMenu === 'function' ? checkUpdateFromMenu() : undefined;
    case 'openHelpFromMenu': return typeof openHelpFromMenu === 'function' ? openHelpFromMenu() : undefined;
    case 'openFeedbackFromMenu': return typeof openFeedbackFromMenu === 'function' ? openFeedbackFromMenu() : undefined;
    case 'toggleAppearanceFromMenu': return typeof toggleAppearanceFromMenu === 'function' ? toggleAppearanceFromMenu() : undefined;
    case 'signOutFromMenu': return typeof signOutFromMenu === 'function' ? signOutFromMenu() : undefined;
    case 'toggleNotificationsPanel': return typeof toggleNotificationsPanel === 'function' ? toggleNotificationsPanel() : undefined;
    case 'goToView': return goToView(args[0]);
    case 'setDashboardViewMode': return typeof setDashboardViewMode === 'function' ? setDashboardViewMode(args[0]) : undefined;
    case 'dashboardNewICS': return dashboardNewICS();
    case 'openDataManagerModal': return openDataManagerModal(args[0], args[1]);
    case 'dashboardOpenActions': return dashboardOpenActions();
    case 'dashboardOpenArchives': return dashboardOpenArchives();
    case 'suppliesAddRow': return typeof suppliesAddRow === 'function' ? suppliesAddRow(args[0]) : undefined;
    case 'suppliesSaveStaged': return typeof suppliesSaveStaged === 'function' ? suppliesSaveStaged() : undefined;
    case 'suppliesDeleteItem': return typeof suppliesDeleteItem === 'function' ? suppliesDeleteItem(args[0]) : undefined;
    case 'suppliesEditSaved': return typeof suppliesEditSaved === 'function' ? suppliesEditSaved(args[0]) : undefined;
    case 'suppliesUpdateSaved': return typeof suppliesUpdateSaved === 'function' ? suppliesUpdateSaved(args[0]) : undefined;
    case 'suppliesSaveSheetUpdate': return typeof suppliesSaveSheetUpdate === 'function' ? suppliesSaveSheetUpdate() : undefined;
    case 'suppliesCancelSheetUpdate': return typeof closeSuppliesSheet === 'function' ? closeSuppliesSheet(true) : undefined;
    case 'suppliesPrintSaved': return typeof suppliesPrintSaved === 'function' ? suppliesPrintSaved(args[0]) : undefined;
    case 'suppliesExportSaved': return typeof suppliesExportSaved === 'function' ? suppliesExportSaved(args[0]) : undefined;
    case 'suppliesDeleteSaved': return typeof suppliesDeleteSaved === 'function' ? suppliesDeleteSaved(args[0]) : undefined;
    case 'openStockCardByIndex': return typeof openStockCardByIndex === 'function' ? openStockCardByIndex(args[0]) : undefined;
    case 'stockLedgerPrintRow': return typeof stockLedgerPrintRow === 'function' ? stockLedgerPrintRow(args[0], args[1]) : undefined;
    case 'stockLedgerEditRow': return typeof stockLedgerEditRow === 'function' ? stockLedgerEditRow(args[0], args[1]) : undefined;
    case 'stockLedgerDeleteRow': return typeof stockLedgerDeleteRow === 'function' ? stockLedgerDeleteRow(args[0], args[1]) : undefined;
    case 'clearInventoryFilter': return clearInventoryFilter();
    case 'finalizeICS': return finalizeICS();
    case 'finalizePAR': return finalizePAR();
    case 'clearArchivesFilter': return clearArchivesFilter();
    case 'clearActionCenterICSFilter': return clearActionCenterICSFilter();
    case 'setTableDensity': return setTableDensity(args[0]);
    case 'openBatchWasteReportFromActionCenter': return openBatchWasteReportFromActionCenter();
    case 'closeInspectionModal': return closeInspectionModal();
    case 'saveInspection': return saveInspection();
    case 'saveInspectionAndArchive': return saveInspectionAndArchive();
    case 'closeInspectionHistory': return closeInspectionHistory();
    case 'openArchiveModal': return openArchiveModal(args[0], args[1], args[2]);
    case 'closeArchiveModal': return closeArchiveModal(args[0]);
    case 'confirmArchiveItem': return confirmArchiveItem();
    case 'closeWasteReportModal': return closeWasteReportModal();
    case 'saveWasteReportMetadata': return saveWasteReportMetadata(args[0]);
    case 'openBatchWasteReportBuilderArchived': return openBatchWasteReportBuilderArchived();
    case 'printWasteReportBuilderSelection': return printWasteReportBuilderSelection();
    case 'exitWmrBatchBuilderMode': return exitWmrBatchBuilderMode();
    case 'openICSDetailsByKey': return openICSDetailsByKey(args[0], args[1]);
    case 'openPARDetailsByKey': return openPARDetailsByKey(args[0], args[1]);
    case 'openICSDetailsByIndex': return openICSDetailsByIndex(args[0]);
    case 'openPARDetailsByIndex': return openPARDetailsByIndex(args[0]);
    case 'openPastEULForItem': return openPastEULForItem(args[0], args[1], args[2]);
    case 'openNearEULForItem': return openNearEULForItem(args[0], args[1], args[2]);
    case 'editICS': return editICS(args[0]);
    case 'editPAR': return editPAR(args[0]);
    case 'printICS': return printICS(args[0]);
    case 'printPAR': return printPAR(args[0]);
    case 'exportICS': return exportICS(args[0]);
    case 'exportPAR': return exportPAR(args[0]);
    case 'deleteICS': return deleteICS(args[0]);
    case 'deletePAR': return deletePAR(args[0]);
    case 'openArchivedItemHistory': return openArchivedItemHistory(args[0]);
    case 'unarchiveItem': return unarchiveItem(args[0]);
    case 'openInspectionHistory': return openInspectionHistory(args[0], args[1], args[2]);
    case 'developerRefreshDiagnostics': return typeof developerRefreshDiagnostics === 'function' ? developerRefreshDiagnostics() : undefined;
    case 'developerRefreshQuickStats': return typeof developerRefreshQuickStats === 'function' ? developerRefreshQuickStats() : undefined;
    case 'developerRefreshFeedbackPanel': return typeof developerRefreshFeedbackPanel === 'function' ? developerRefreshFeedbackPanel() : undefined;
    case 'developerSetFeedbackStatus': return typeof developerSetFeedbackStatus === 'function' ? developerSetFeedbackStatus(args[0], args[1]) : undefined;
    case 'developerCopyFeedbackItem': return typeof developerCopyFeedbackItem === 'function' ? developerCopyFeedbackItem(args[0]) : undefined;
    case 'developerRefreshGitHubStats': return typeof developerRefreshGitHubStats === 'function' ? developerRefreshGitHubStats() : undefined;
    case 'developerRefreshAppUpdateWidgets': return typeof developerRefreshAppUpdateWidgets === 'function' ? developerRefreshAppUpdateWidgets() : undefined;
    case 'developerCopyDiagnostics': return typeof developerCopyDiagnostics === 'function' ? developerCopyDiagnostics() : undefined;
    case 'developerExportWorkspaceSnapshot': return typeof developerExportWorkspaceSnapshot === 'function' ? developerExportWorkspaceSnapshot() : undefined;
    case 'developerImportWorkspaceSnapshot': return typeof developerImportWorkspaceSnapshot === 'function' ? developerImportWorkspaceSnapshot() : undefined;
    case 'developerRunCheckUpdate': return typeof developerRunCheckUpdate === 'function' ? developerRunCheckUpdate() : undefined;
    case 'developerClearPwaCaches': return typeof developerClearPwaCaches === 'function' ? developerClearPwaCaches() : undefined;
    case 'developerFactoryResetWorkspace': return typeof developerFactoryResetWorkspace === 'function' ? developerFactoryResetWorkspace() : undefined;
    case 'activateSearchResult': return activateSearchResult(args[0]);
    case 'icsDetailsEditFromTitle': return icsDetailsEditFromTitle();
    case 'openICSRecordHistoryModal': return openICSRecordHistoryModal();
    case 'exportArchivedHistoryReport': return exportArchivedHistoryReport();
    case 'printWasteMaterialsReport': return printWasteMaterialsReport(args[0], args[1], args[2]);
    case 'printWasteMaterialsReportForICS': return printWasteMaterialsReportForICS(args[0], args[1]);
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
      onInspectionChange(
        target,
        target.getAttribute('data-arg1') || '',
        target.getAttribute('data-arg2') || '',
        target.getAttribute('data-arg3') || 'ics'
      );
      return;
    }
    if (action === 'toggleActionCenterSelection'){
      toggleActionCenterSelection(
        target.getAttribute('data-arg1') || '',
        target.getAttribute('data-arg2') || '',
        !!target.checked,
        target.getAttribute('data-arg3') || 'ics'
      );
    }
  });

  document.addEventListener('input', (e) => {
    const target = e.target;
    if (target?.matches?.('.supplies-stage-input')){
      suppliesUpdateStageField(
        target.getAttribute('data-supplies-index'),
        target.getAttribute('data-supplies-field'),
        target.value
      );
      return;
    }
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
