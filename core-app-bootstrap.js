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
    return;
  }
  applyCurrentUserVisualPrefs(true);
  sessionState = { loggedIn: false, schoolId: '', profileKey: '', remember: false, sessionId: '' };
  openLoginModal(true);
}

const LAST_SEEN_APP_VERSION_STORAGE_KEY = 'icsLastSeenAppVersion';
const RELEASE_NOTES_BY_VERSION = {
  '1.2.1': [
    'Patched modal/UI consistency updates across Data Hub, Import/Export, and archived history views.',
    'Improved archived inspection logs table fitting and readability for all columns.',
    'Standardized modal close-button implementation across major modal surfaces.',
    'Adjusted modal layering/fit behavior and dark-theme contrast follow-up fixes.'
  ],
  '1.2': [
    'Action Center archive flow now supports PAR records (not ICS-only):',
    'enabled PAR archive action path with same inspection/remarks gating used by ICS',
    'archive persistence now writes back to correct source store (`icsRecords` or `parRecords`)',
    'archived entries now persist source metadata (`sourceType`, `parNo` where applicable)',
    'unarchive now resolves and restores to original source set (`icsRecords` or `parRecords`)',
    'Waste Materials Report workflow aligned for PAR and ICS using shared form:'
  ],  '1.1': [
    'Inventory view spacing and PAR visual distinction:',
    'increased inventory container gap for better separation between staged/records cards',
    'added theme-aware PAR card accent styling (`.par-records`) distinct from ICS records',
    'upgraded `Finalize PAR Data` button to theme-aware PAR accent tokens (no fixed hardcoded color)',
    'PAR records table interaction parity:',
    'made `PAR No.` clickable to open details modal'
  ],  '1.0.2': [
    'Inventory view spacing and PAR visual distinction:',
    'increased inventory container gap for better separation between staged/records cards',
    'added theme-aware PAR card accent styling (`.par-records`) distinct from ICS records',
    'upgraded `Finalize PAR Data` button to theme-aware PAR accent tokens (no fixed hardcoded color)',
    'PAR records table interaction parity:',
    'made `PAR No.` clickable to open details modal'
  ],  '1.0.1': [
    'DSIS branding and version-reset alignment:',
    'user-facing app identity moved from legacy ICS naming to `DSIS V1`',
    'runtime/display version baseline reset to `1` with schema baseline `1.0.0`',
    'service worker cache namespace reset to `dsis-v1-pwa-v1`',
    'browser/page title now `Digital School Inventory System v1.0`',
    'Dynamic version label behavior restored/enhanced:'
  ],
  '1': [
    'Branding reset to DSIS V1 with version baseline set to 1.',
    'Schema/export baseline reset to 1.0.0 for new data packages.',
    'Service worker cache namespace reset for the DSIS V1 release line.',
    'Includes recent Topbar v2, profile menu, and WMR/archives workflow refinements.'
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

function parseSemverLike(version){
  const normalized = String(version || '').trim();
  if (!normalized) return null;
  const parts = normalized.split('.').map((part) => Number.parseInt(part, 10));
  if (!parts.length || Number.isNaN(parts[0])) return null;
  return {
    raw: normalized,
    major: Number.isNaN(parts[0]) ? 0 : parts[0],
    minor: Number.isNaN(parts[1]) ? 0 : parts[1],
    patch: Number.isNaN(parts[2]) ? 0 : parts[2],
    partCount: parts.length
  };
}

function compareParsedVersions(a, b){
  if (a.major !== b.major) return b.major - a.major;
  if (a.minor !== b.minor) return b.minor - a.minor;
  if (a.patch !== b.patch) return b.patch - a.patch;
  return 0;
}

function compareParsedVersionsAsc(a, b){
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  return 0;
}

function classifyReleaseType(parsed){
  if (!parsed) return 'minor';
  return parsed.patch > 0 ? 'patch' : 'minor';
}

function buildReleaseNotesText(version){
  const parsedCurrent = parseSemverLike(version);
  const releases = Object.entries(RELEASE_NOTES_BY_VERSION)
    .map(([releaseVersion, entries]) => ({
      version: releaseVersion,
      entries: Array.isArray(entries) ? entries : [],
      parsed: parseSemverLike(releaseVersion)
    }))
    .filter((release) => release.parsed && release.parsed.major === (parsedCurrent?.major ?? release.parsed.major))
    .filter((release) => !parsedCurrent || compareParsedVersionsAsc(release.parsed, parsedCurrent) <= 0)
    .sort((left, right) => compareParsedVersions(left.parsed, right.parsed));

  const lines = [];
  const currentRelease = releases.find((release) => release.version === String(version || '').trim());
  if (currentRelease){
    lines.push(`Current Version (v${currentRelease.version})`);
    currentRelease.entries.slice(0, 6).forEach((entry, idx) => {
      lines.push(`${idx + 1}. ${entry}`);
    });
    lines.push('');
  }

  const recentReleases = releases
    .filter((release) => release.version !== String(version || '').trim())
    .slice(0, 2);
  if (recentReleases.length){
    lines.push('Recent Changes');
    recentReleases.forEach((release) => {
      lines.push(`v${release.version}`);
      release.entries.slice(0, 3).forEach((entry, idx) => {
        lines.push(`${idx + 1}. ${entry}`);
      });
      lines.push('');
    });
  }

  if (!lines.length){
    lines.push('No release notes available for this version yet.');
  }

  return { lines: lines.join('\n').trim() };
}

function showReleaseNotesModalForVersion(version, options = {}){
  const normalizedVersion = String(version || '').trim();
  if (!normalizedVersion) return;
  const details = buildReleaseNotesText(normalizedVersion);
  showModal(`What\'s New in v${normalizedVersion}`, details.lines);
  const m = document.getElementById('modal');
  if (m) m.classList.add('modal-release-notes');
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
  const targets = [brandSub, topbarVersionLink].filter(Boolean);
  if (!targets.length) return;

  const openLatestReleaseNotes = async () => {
    const version = await getRuntimeAppVersion();
    if (!version) return;
    showReleaseNotesModalForVersion(version, { includeNotification: false });
  };

  targets.forEach((target) => {
    target.setAttribute('role', 'button');
    target.setAttribute('tabindex', '0');
    target.title = 'Show What\'s New';
    target.style.cursor = 'pointer';
    target.addEventListener('click', () => {
      openLatestReleaseNotes();
    });
    target.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openLatestReleaseNotes();
    });
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
    ? 'Install DSIS V1 on this device.'
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
  let applyProgressTimer = null;
  let applyProgressFailSafeTimer = null;
  const UPDATE_READY_NOTIF_KEY = 'dsisLastUpdateReadyNotifiedVersion';

  function showUpdateProgressModal(title, statusText, percent, allowClose = false){
    const modal = document.getElementById('modal');
    const titleEl = document.getElementById('modalTitle');
    const messageEl = document.getElementById('modalMsg');
    if (!modal || !titleEl || !messageEl) return;
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    titleEl.textContent = title;
    messageEl.innerHTML = `
      <div style="display:grid;gap:8px">
        <div>${statusText}</div>
        <div style="height:10px;background:#e2e8f0;border:1px solid #cbd5e1;border-radius:999px;overflow:hidden">
          <div style="height:100%;width:${clamped}%;background:linear-gradient(90deg,#2563eb,#0ea5e9);transition:width .25s ease"></div>
        </div>
        <div style="font-size:12px;color:#64748b">${clamped}%</div>
      </div>
    `;
    const actions = modal.querySelector('.modal-actions');
    if (actions){
      actions.innerHTML = allowClose
        ? '<button class="btn btn-md btn-primary modal-btn primary" data-action="closeModal">OK</button>'
        : '';
    }
    modal.style.display = 'flex';
  }

  function stopApplyProgressAnimation(){
    if (applyProgressTimer){
      clearInterval(applyProgressTimer);
      applyProgressTimer = null;
    }
    if (applyProgressFailSafeTimer){
      clearTimeout(applyProgressFailSafeTimer);
      applyProgressFailSafeTimer = null;
    }
  }

  function startApplyProgressAnimation(){
    stopApplyProgressAnimation();
    let progress = 8;
    showUpdateProgressModal('Applying Update', 'Applying update...', progress, false);
    applyProgressFailSafeTimer = setTimeout(() => {
      if (!manualUpdateRequested) return;
      stopApplyProgressAnimation();
      manualUpdateRequested = false;
      showUpdateProgressModal('Update Delayed', 'Update is taking longer than expected. Please try Check Update again.', 95, true);
      updateAppUpdateButtonState();
    }, 45000);
    applyProgressTimer = setInterval(() => {
      progress = Math.min(95, progress + Math.max(1, Math.round(Math.random() * 8)));
      showUpdateProgressModal('Applying Update', 'Applying update...', progress, false);
      if (progress >= 95){
        clearInterval(applyProgressTimer);
        applyProgressTimer = null;
      }
    }, 320);
  }

  function startAutoRefreshCountdown(seconds = 3){
    let remaining = Math.max(0, Number(seconds) || 0);
    const tick = () => {
      const text = remaining > 0
        ? `Update applied successfully. Refreshing in ${remaining}s...`
        : 'Update applied successfully. Refreshing now...';
      showUpdateProgressModal('Update Applied', text, 100, false);
      if (remaining <= 0){
        setTimeout(() => location.reload(), 80);
        return;
      }
      remaining -= 1;
      setTimeout(tick, 1000);
    };
    tick();
  }

  async function notifyUpdateReadyIfNeeded(){
    try {
      const version = await getRuntimeAppVersion();
      const normalized = String(version || '').trim();
      if (!normalized) return;
      const lastNotified = String(localStorage.getItem(UPDATE_READY_NOTIF_KEY) || '').trim();
      if (lastNotified === normalized) return;
      notify('info', `New version v${normalized} is ready. Click Check Update, then Apply Update.`);
      localStorage.setItem(UPDATE_READY_NOTIF_KEY, normalized);
    } catch (_err){
      notify('info', 'A new app update is ready. Click Check Update, then Apply Update.');
    }
  }

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
      'A new version has been downloaded.\nApply update now?',
      () => {
        manualUpdateRequested = true;
        startApplyProgressAnimation();
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
        notifyUpdateReadyIfNeeded();
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
          notifyUpdateReadyIfNeeded();
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
          stopApplyProgressAnimation();
          startAutoRefreshCountdown(3);
          return;
        }
      });
      if (registration.waiting){
        pendingUpdateWorker = registration.waiting;
        updateAppUpdateButtonState();
        notifyUpdateReadyIfNeeded();
      }
      registration.addEventListener('updatefound', () => {
        const nextWorker = registration.installing;
        if (!nextWorker) return;
        nextWorker.addEventListener('statechange', () => {
          if (nextWorker.state === 'installed' && navigator.serviceWorker.controller){
            pendingUpdateWorker = registration.waiting || nextWorker;
            updateAppUpdateButtonState();
            notifyUpdateReadyIfNeeded();
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
