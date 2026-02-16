function bootAppWithUserPreferences(){
  const applyCurrentUserVisualPrefs = (renderStartView = false) => {
    applyThemeAccent(currentUser.preferences?.themeAccent || 'elegant-white');
    tableDensity = (currentUser.preferences?.tableDensity || tableDensity || 'comfortable').toLowerCase();
    if (!['comfortable', 'compact'].includes(tableDensity)) tableDensity = 'comfortable';
    applyTableDensity();
    renderUserIdentity();
    if (!renderStartView) return;
    const startView = PROFILE_VIEWS.includes(currentUser.preferences?.defaultView) ? currentUser.preferences.defaultView : 'Dashboard';
    goToView(startView);
  };

  getCurrentDeviceId();
  ensureRecordLineageBaseline();
  currentUser.lastLogin = new Date().toISOString();
  saveCurrentUser();
  ensureDesignationForSchool(schoolIdentity.schoolId, currentUser.designation || '');
  applyCurrentUserVisualPrefs(false);
  schoolSetupEnforced = !isSchoolIdentityConfigured();
  if (schoolSetupEnforced){
    applyCurrentUserVisualPrefs(true);
    sessionState = { loggedIn: false, schoolId: '', profileKey: '', remember: false, sessionId: '' };
    setupWizardEnforced = true;
    openSetupModal(true);
    setSetupHint('Create School + first Personnel profile to continue.', '');
    return;
  }
  upsertCurrentUserForSchool(schoolIdentity.schoolId);
  if (tryRestoreRememberedSession()){
    applyCurrentUserVisualPrefs(false);
    notify('success', `Welcome back, ${currentUser.name}.`);
    return;
  }
  applyCurrentUserVisualPrefs(true);
  sessionState = { loggedIn: false, schoolId: '', profileKey: '', remember: false, sessionId: '' };
  openLoginModal(true);
}

const LAST_SEEN_APP_VERSION_STORAGE_KEY = 'icsLastSeenAppVersion';
const RELEASE_NOTES_BY_VERSION = {
  '4.0': [
    'Major release baseline update to v4.0.',
    'Schema/export baseline advanced to 4.0.0 for new data packages.',
    'Service worker cache baseline refreshed for the 4.0 release line.',
    'Ongoing workflow and UI refinements from recent Topbar v2 and WMR/archives iterations.'
  ],
  '3.3': [
    'New responsive mobile and tablet navigation with a centered New ICS action.',
    'Notification Center upgraded with filters, grouped feed, and bulk actions.',
    'ICS and Archive Details layouts refreshed for cleaner readability.',
    'ICS records table improved with dedicated status column and compact markers.'
  ],
  '3.2': [
    'Lucide icon standardization completed across the app with local runtime assets.',
    'Data Hub modal redesigned into card-based layout.',
    'Action Center modal reliability fixes for Inspection History and Unserviceable flow.',
    'Desktop sidebar now supports persisted collapse mode.'
  ]
};

function getReleaseNotesForVersion(version){
  const key = String(version || '').trim();
  if (!key) return [];
  return Array.isArray(RELEASE_NOTES_BY_VERSION[key]) ? RELEASE_NOTES_BY_VERSION[key] : [];
}

function buildReleaseNotesText(version){
  const notes = getReleaseNotesForVersion(version);
  const fallbackNote = ['General quality, reliability, and UX improvements.'];
  const entries = notes.length ? notes : fallbackNote;
  const lines = entries.map((line, idx) => `${idx + 1}. ${line}`).join('\n');
  return { entries, lines };
}

function showReleaseNotesModalForVersion(version, options = {}){
  const normalizedVersion = String(version || '').trim();
  if (!normalizedVersion) return;
  const includeNotification = options.includeNotification === true;
  const details = buildReleaseNotesText(normalizedVersion);
  showModal(`What\'s New in v${normalizedVersion}`, details.lines);
  if (includeNotification){
    notify('info', `What\'s New v${normalizedVersion}: ${details.entries.join(' | ')}`);
  }
}

async function getRuntimeAppVersion(){
  const fallbackVersion = String(APP_UI_VERSION_FALLBACK || '').trim();
  try {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    const manifestHref = manifestLink?.getAttribute('href') || './manifest.webmanifest';
    const response = await fetch(manifestHref, { cache: 'no-store' });
    if (!response.ok) return fallbackVersion;
    const manifest = await response.json();
    const manifestVersion = String(manifest?.version || '').trim();
    return manifestVersion || fallbackVersion;
  } catch (_err){
    return fallbackVersion;
  }
}

async function announceReleaseNotesIfNeeded(){
  const version = await getRuntimeAppVersion();
  if (!version) return;
  const lastSeenVersion = String(localStorage.getItem(LAST_SEEN_APP_VERSION_STORAGE_KEY) || '').trim();
  if (lastSeenVersion === version) return;
  showReleaseNotesModalForVersion(version, { includeNotification: true });
  localStorage.setItem(LAST_SEEN_APP_VERSION_STORAGE_KEY, version);
}

function initializeReleaseNotesQuickAccess(){
  if (!brandSub) return;
  brandSub.setAttribute('role', 'button');
  brandSub.setAttribute('tabindex', '0');
  brandSub.title = 'Show What\'s New';
  brandSub.style.cursor = 'pointer';

  const openLatestReleaseNotes = async () => {
    const version = await getRuntimeAppVersion();
    if (!version) return;
    showReleaseNotesModalForVersion(version, { includeNotification: false });
  };

  brandSub.addEventListener('click', () => {
    openLatestReleaseNotes();
  });
  brandSub.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openLatestReleaseNotes();
  });
}

function isAppRunningStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function updateInstallAppButtonState(){
  if (!installAppBtn) return;
  if (isAppRunningStandalone()){
    installAppBtn.textContent = 'App Installed';
    installAppBtn.disabled = true;
    installAppBtn.title = 'App is already running in installed mode.';
    return;
  }
  installAppBtn.disabled = false;
  installAppBtn.textContent = deferredInstallPrompt ? 'Install App' : 'Install Guide';
  installAppBtn.title = deferredInstallPrompt
    ? 'Install Project ICS v3 on this device.'
    : 'Show install instructions for this browser.';
}

async function installPWAApp(){
  if (isAppRunningStandalone()){
    notify('info', 'App is already installed on this device.');
    return;
  }
  if (deferredInstallPrompt){
    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      updateInstallAppButtonState();
      if (choice?.outcome === 'accepted'){
        notify('success', 'Install request accepted. App should appear on your device.');
      } else {
        notify('info', 'Install was dismissed. You can try again anytime.');
      }
    } catch {
      deferredInstallPrompt = null;
      updateInstallAppButtonState();
      showModal('Install App', 'Unable to trigger install prompt. Use your browser menu: Install App/Add to Home Screen.');
    }
    return;
  }
  showModal('Install App', 'Use your browser menu to install this app:\n1) Open browser menu\n2) Choose "Install App" or "Add to Home Screen"\n3) Confirm installation');
}

function registerPWAServiceWorker(){
  window.checkForPWAUpdateManual = function(){
    showModal('App Update', 'Manual update check is unavailable in this browser context.');
  };
  if (!('serviceWorker' in navigator)) return;
  if (!(location.protocol === 'https:' || location.hostname === 'localhost')) return;
  let manualUpdateRequested = false;
  let pwaRegistration = null;
  let pendingUpdateWorker = null;

  function requestWorkerActivation(worker){
    if (!worker) return;
    worker.postMessage({ type: 'SKIP_WAITING' });
  }

  function updateAppUpdateButtonState(){
    if (!updateAppBtn) return;
    if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost')){
      updateAppBtn.disabled = true;
      updateAppBtn.textContent = 'Update Unavailable';
      updateAppBtn.title = 'PWA update checks require HTTPS or localhost.';
      return;
    }
    if (pendingUpdateWorker){
      updateAppBtn.disabled = false;
      updateAppBtn.textContent = 'Apply Update';
      updateAppBtn.title = 'A new version is ready. Click to apply update.';
      return;
    }
    updateAppBtn.disabled = false;
    updateAppBtn.textContent = 'Check Update';
    updateAppBtn.title = 'Check for latest app version.';
  }

  function waitForWorkerInstalled(worker){
    return new Promise((resolve, reject) => {
      if (!worker){
        resolve(null);
        return;
      }
      if (worker.state === 'installed'){
        resolve('installed');
        return;
      }
      if (worker.state === 'redundant'){
        resolve('redundant');
        return;
      }
      const onState = () => {
        if (worker.state === 'installed'){
          worker.removeEventListener('statechange', onState);
          resolve('installed');
        } else if (worker.state === 'redundant'){
          worker.removeEventListener('statechange', onState);
          resolve('redundant');
        }
      };
      worker.addEventListener('statechange', onState);
      setTimeout(() => {
        worker.removeEventListener('statechange', onState);
        reject(new Error('Update download timed out.'));
      }, 30000);
    });
  }

  function promptApplyPendingUpdate(){
    const readyWorker = pendingUpdateWorker || pwaRegistration?.waiting || null;
    if (!readyWorker){
      showModal('App Update', 'No pending update found. Click Check Update to scan again.');
      return;
    }
    showConfirm(
      'App Update Ready',
      'A new version has been downloaded.\nApply update now?\n\nAfter apply, close and open the app again.',
      () => {
        manualUpdateRequested = true;
        showModal('Applying Update', 'Applying update now...\nPlease wait.');
        requestWorkerActivation(readyWorker);
      },
      'Apply Update'
    );
  }

  async function checkForPWAUpdateManual(){
    if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost')){
      showModal('App Update', 'Manual update check is unavailable in this browser context.');
      return;
    }
    if (pendingUpdateWorker){
      promptApplyPendingUpdate();
      return;
    }
    updateAppBtn && (updateAppBtn.disabled = true);
    showModal('App Update', 'Checking for updates...\nPlease wait.');
    try {
      const registration = pwaRegistration || await navigator.serviceWorker.getRegistration('./');
      if (!registration){
        showModal('App Update', 'Update service is not ready yet.\nReload once, then try again.');
        return;
      }
      pwaRegistration = registration;
      await pwaRegistration.update();
      if (pwaRegistration.waiting){
        pendingUpdateWorker = pwaRegistration.waiting;
        updateAppUpdateButtonState();
        showModal('App Update', 'Update downloaded and ready to apply.');
        promptApplyPendingUpdate();
        return;
      }
      if (pwaRegistration.installing){
        showModal('App Update', 'Update found. Downloading package...\nPlease wait.');
        const state = await waitForWorkerInstalled(pwaRegistration.installing);
        if (state === 'installed' && pwaRegistration.waiting){
          pendingUpdateWorker = pwaRegistration.waiting;
          updateAppUpdateButtonState();
          showModal('App Update', 'Update downloaded and ready to apply.');
          promptApplyPendingUpdate();
          return;
        }
      }
      showModal('App Update', 'You already have the latest app version.');
    } catch (err){
      console.warn('Manual update check failed:', err);
      showModal('App Update', 'Unable to check for updates right now.\nPlease try again.');
    } finally {
      updateAppUpdateButtonState();
    }
  }

  window.checkForPWAUpdateManual = checkForPWAUpdateManual;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallAppButtonState();
    notify('info', 'Install is ready. Click "Install App" in the sidebar.');
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    updateInstallAppButtonState();
    notify('success', 'App installed successfully.');
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      pwaRegistration = registration;
      await registration.update();
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        pendingUpdateWorker = null;
        updateAppUpdateButtonState();
        if (manualUpdateRequested){
          manualUpdateRequested = false;
          notify('success', 'App update applied. Close and open the app again to start the latest version.');
          showModal('Update Applied', 'Update has been applied successfully.\nPlease close and open the app again to start the latest version.');
          return;
        }
        notify('info', 'A new app version became active.');
      });
      if (registration.waiting){
        pendingUpdateWorker = registration.waiting;
        notify('info', 'App update is ready. Click "Apply Update" in the sidebar.');
        updateAppUpdateButtonState();
      }
      registration.addEventListener('updatefound', () => {
        const nextWorker = registration.installing;
        if (!nextWorker) return;
        nextWorker.addEventListener('statechange', () => {
          if (nextWorker.state === 'installed' && navigator.serviceWorker.controller){
            pendingUpdateWorker = registration.waiting || nextWorker;
            updateAppUpdateButtonState();
            notify('info', 'New app version available. Click "Apply Update" in the sidebar.');
          }
        });
      });
    } catch (err){
      console.warn('Service worker registration failed:', err);
    }
    updateAppUpdateButtonState();
    updateInstallAppButtonState();
  });
}
