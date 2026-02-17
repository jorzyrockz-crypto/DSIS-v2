# Project ICS v3 - Status Checkpoint

Last updated: 2026-02-17
Main file: `ics_v_3_standalone_index.html`

## Newly Implemented (2026-02-17, dashboard/topbar UX polish + modal/toast routing + release bump prep)
- Versioning decision for this commit batch:
  - minor bumped for new feature bundles and patch bumped for grouped fixes
  - target release set to `1.5.6` (features + stability/UI fix pass)
- Dashboard onboarding and view behavior:
  - introduced guided/compact dashboard mode toggle with per-user saved preference
  - compact mode now hides welcome/onboarding quick-action surfaces and prioritizes KPI widgets
  - first-time dashboard onboarding card refined with direct start actions and updated CTA labels
- Inventory workflow focus behavior:
  - edit actions from ICS/PAR now return focus to `Staged Items` with smoother scroll targeting
  - staged focus state now uses persistent glow highlight until finalize action completes
- Setup/Profile flow refinements for offline-first usage:
  - designation field behavior updated to start blank/editable in initial personnel path
  - email kept optional for offline/local deployments
- Topbar/navigation cleanup and density tuning:
  - added `Supplies` view in top navigation
  - compacted topbar spacing/gaps, streamlined profile area to avatar-first layout, and reduced header clutter
  - moved/adjusted dashboard view toggle placement closer to topbar controls
- Modal/notification behavior polish:
  - improved modal open/close animations and switched overlays to transition-driven show/hide behavior
  - Import Center opening via dashboard widget now writes status to Notification Center (no modal toast popup)
  - Import Center modal positioning updated to centered alignment for consistent presentation

## Planning Notes (2026-02-17, productization + distribution + sync roadmap)
- Current product baseline clarification:
  - current v1 runtime is offline-first PWA/web app (service worker + localStorage), not yet Electron-packaged
- Commercial packaging recommendation:
  - ship offline desktop installer first (Electron/Tauri wrapper) as primary sale/distribution format
  - keep offline-first local data behavior as core requirement for school environments
  - introduce cloud/sync as optional paid add-on after stable desktop rollout
- Update strategy recommendation:
  - support in-app update checks and apply flow (manual confirm path retained)
  - maintain signed installer fallback update path for offline/limited-connectivity schools
  - use staged release channels (`stable`/`beta`) and versioned schema migration safeguards
- Licensing recommendation for desktop build:
  - per-school license key model with activation limits/device seats
  - local signed license token cache for offline validation
  - periodic online revalidation with grace period for no-internet operations
  - admin deactivate/transfer path for device replacement scenarios
- Sync recommendation (fast MVP, same style as feedback workflow):
  - implement `Push Sync`/`Pull Sync` against a remote GitHub-hosted JSON package
  - configure sync via local settings (`repo`, `path`, `token`) and log actions to audit trail
  - include overwrite confirmation + backup-before-pull safety
  - start with last-write-wins, then add conflict resolution UI in later version
- Auth recommendation:
  - Google login is feasible but online-dependent and requires OAuth setup
  - for current offline/shared-device deployments, keep local profile password login as default
  - optional hybrid path: local login default + online Google sign-in when available
- Version 1 priorities (recommended order):
  1. Electron packaging baseline (Windows-first installer)
  2. Data safety hardening (auto backup/restore + migration guards)
  3. Licensing MVP (activation + offline signed cache)
  4. Update pipeline (in-app check/apply + signed releases)
  5. Shared-computer security hardening (per-user password/reset/session lock)
  6. Regression and QA pack for critical workflows
  7. Distribution readiness (branding/legal/support/release notes)
  8. Optional manual sync add-on (`Push/Pull`) for multi-computer schools
- Version 2 direction summary:
  - V2.0 foundation/regression gate
  - V2.1 manual sync MVP (GitHub JSON push/pull)
  - V2.2 shared-computer security hardening completion
  - V2.3 conflict-aware multi-user merge handling
  - V2.4 desktop distribution maturity
  - V2.5 optional migration to proper managed backend for real-time multi-tenant sync

## Newly Implemented (2026-02-17, shared-computer account hardening: per-user passwords)
- Added per-profile password support for shared-device usage:
  - user model now includes per-profile `authPassword` and persists across school profile map records
  - login now enforces selected profile password when configured (developer profile still supports configured developer password path)
  - login hint/visibility now reflects whether selected profile requires password input
- Setup and personnel creation now require password creation:
  - setup form includes `Password` + `Confirm Password` inputs for first profile and additional personnel
  - validation enforces minimum length (`4`) and confirmation match
- Profile settings now supports password rotation:
  - Security tab includes optional `New Password` + `Confirm Password`
  - leaving fields blank preserves existing password; provided values are validated and saved
- Delivery/update alignment:
  - runtime/schema/manifest patch bumped to `1.4.2`
  - service worker cache baseline advanced to `dsis-v1-pwa-v14`

## Newly Implemented (2026-02-17, modular refactor continuation: UI event wiring extraction)
- Modular extraction continued for UI bootstrap wiring:
  - extracted delegated event routing (`parseDelegatedArg`, `invokeDelegatedAction`, `initializeDelegatedActionRouting`) from `core-ui-event-wiring.js` into new `core-delegated-action-routing.js`
  - extracted modal scroll-shadow handler (`initializeModalScrollShadows`) into new `core-modal-scroll-shadows.js`
  - trimmed `core-ui-event-wiring.js` to direct UI listener registration and module orchestration only
- Runtime wiring and offline cache alignment:
  - inserted new script modules in HTML load order before `core-ui-event-wiring.js`
  - updated service worker precache list to include new modules
  - advanced SW cache baseline to `dsis-v1-pwa-v12`

## Newly Implemented (2026-02-17, developer console expansion + feedback/GitHub/update observability + UX hardening)
- Developer Console and access control:
  - added hidden `Developer Tools` navigation entries (sidebar + topbar), visible only to developer identity
  - added developer account seed with login password gate and developer-default landing route
  - restricted direct navigation to `Developer Tools` for non-developer users
- Dev page redesign and toolset expansion:
  - redesigned Dev page into modern dashboard layout (hero, widgets, split panels, maintenance area, diagnostics block)
  - added quick stats widgets, GitHub stats panel, app-update telemetry panel, and feedback moderation panel
  - added feedback workflow actions per entry: `In Queue`, `Approve`, `Resolve`, and `Copy`
  - feedback item status now persists locally via `dsisDeveloperFeedbackStatusMap`
- Feedback ingestion and rendering reliability:
  - added no-login feedback ingestion workflow (Google Form CSV -> `feedback/feedback.json`)
  - wired in-app `Send Feedback` menu action to open configured Google Form
  - improved Dev feedback loader with multi-path fetch, offline/cache fallback, and clearer failure hints
  - updated sync workflow triggers to include push events for feedback config/script/workflow changes
- PWA update and reset UX:
  - improved update progress UX with cinematic animation and visible fill during final countdown
  - made progress colors theme-aware for better dark-theme visibility
  - added profile menu `Check Update` badge state sync when pending update exists
  - hardened factory reset to unregister SW, clear caches/storage, and reload with cache-bust query
  - updated SW fetch strategy for feedback JSON to network-first with cached fallback
- Theming and readability:
  - extracted main HTML stylesheet into `styles/main.css` and continued modular CSS updates
  - improved dark-theme readability for Personnel setup modal (`dracula` + `crimson-black`) by overriding low-contrast hardcoded light tokens
- Versioning and release prep:
  - current runtime/schema/manifest aligned at `1.4.1`
  - SW cache baseline advanced to `dsis-v1-pwa-v11`
  - added release note map entries for `1.4.1` and milestone candidate `1.5.0`

## Milestone Update (v1.5.0 candidate, 2026-02-17)
- Developer Ops & Access:
  - added hidden `Developer Tools` page (sidebar/topbar) visible only to developer identity
  - introduced developer account seed with password gate for `dev-admin` login flow
  - developer account now defaults to `Developer Tools` landing page after login/restore
- Developer Console Modernization:
  - redesigned Dev page into modern dashboard layout with hero, widget grid, split analytics panels, and maintenance section
  - added quick local stats widgets (ICS/PAR/archive/audit counts + feedback recency)
  - added diagnostics utilities (copy/export/import workspace snapshot, diagnostics JSON view)
- Feedback Intelligence:
  - wired in-app `Send Feedback` menu action to feedback form popup flow
  - implemented no-login feedback ingestion pipeline (Google Form CSV -> `feedback/feedback.json`)
  - added Dev Feedback panel with robust loading (multi-path fetch + cached fallback + clearer failure hints)
- Update & Release Observability:
  - added App Update widgets (runtime/fallback version, SW registration, pending-update state, cache keys, display mode)
  - improved update progress UX with cinematic animation + theme-aware progress colors
  - profile menu `Check Update` now shows pending update badge state
- Platform & Delivery Hygiene:
  - extracted main HTML inline styles into `styles/main.css`
  - updated service worker precache coverage for new assets/data endpoints including feedback JSON
  - version progression prepared for release cadence (`1.4.1` current, `1.5.0` milestone notes ready)

## Newly Implemented (2026-02-17, patch bump + modal consistency/fit/contrast fixes)
- Versioning:
  - manifest version bumped to `1.2.1` (`manifest.webmanifest`)
  - runtime fallback version bumped to `1.2.1` (`APP_UI_VERSION_FALLBACK`)
  - schema/export version bumped to `1.2.1` (`ICS_SCHEMA_VERSION`)
  - service worker cache bumped to `dsis-v1-pwa-v6` (`sw.js`)
  - added `What's New` notes entry for `1.2.1` (`core-app-bootstrap.js`)
- Modal behavior and UI consistency follow-up:
  - raised actions modal overlay stacking to properly cover/blur topbar during modal open
  - improved Data Manager modal viewport fitting and Export/Import sizing/position refinements
  - added import-history workflow:
    - Import Center now shows latest `5` entries inline
    - full history is available via dedicated `Import History` modal
  - standardized modal close controls via shared close-button styling and icon+label pattern
- Archived history and dark-theme fixes:
  - patched archived modal token usage for consistent dark-theme readability
  - inspection logs table now uses explicit column sizing (`Date`, `Status`, `Reason`, `Time`) with wrapping behavior for `Reason`

## Newly Implemented (2026-02-17, PAR integration completion pass: action filters + Data Hub + audit + theming/text consistency)
- Action Center and EUL targeting were hardened for mixed ICS/PAR datasets:
  - introduced source-aware target scope state (`actionCenterSourceFilter`) to prevent ICS/PAR record-number collisions when filtering
  - EUL deep-link buttons now carry `sourceType` and correct record number source (`icsNo` vs `parNo`)
  - delegated routing updated so EUL deep links and WMR print actions propagate `sourceType` end-to-end
  - inspection-history WMR print button now passes source context (`ics`/`par`) to avoid wrong-store lookup
  - Action Center/UI state summaries now surface source scope (`Source: ICS` / `Source: PAR`) when active
- Data Hub now supports ICS and PAR records in import/export workflow (not ICS-only):
  - import package normalization accepts/merges both `data.records` (ICS) and `data.parRecords` (PAR), plus top-level `records`/`parRecords`
  - validation preview and trace validation now classify rows as ICS/PAR with split counts and type-aware row labels
  - import apply path now writes to both `icsRecords` and `parRecords` with per-type add/replace accounting in audit + status messages
  - schema exports now include both record sets in payload (`data.records`, `data.parRecords`) for records/full package modes
  - export filters/hints now compute combined totals and split counts for ICS and PAR
  - conflict report payload now includes `recordType` + `recordNo`; report filename updated to `dsis-import-conflict-report.json`
- Export filename clarity updates:
  - single-record exports now include explicit type prefix: `ICS-...json` and `PAR-...json`
  - Data Hub package exports now include type tags in filename (`ics`, `par`, `ics-par`) for both records and full package paths
- Audit Trail enhancements:
  - audit search now includes serialized `meta` payload to make source/record/item metadata queryable
  - audit table now renders compact metadata summary under detail text (e.g., source type, record no., item no., mode/add/replace/skip)
  - audit CSV export now includes a dedicated `meta` column
  - archive/unarchive audit events now include PAR/source metadata (`sourceType`, `recordParNo` where applicable)
- Data Hub theming and wording consistency pass:
  - Data Manager/Import Center surfaces were moved from hardcoded light colors to theme tokens (`--surface`, `--surface-soft`, `--border`, `--t`, `--tm`) for consistent dark-theme readability
  - updated Data Hub/Import/Export copy from ICS-only wording to shared `ICS/PAR` phrasing where workflows apply to both record types
  - search-empty helper text updated to `Type to search ICS/PAR records.`

## Newly Implemented (2026-02-16, PAR archive + WMR/batch print + search/details source-aware integration)
- Action Center archive flow now supports PAR records (not ICS-only):
  - enabled PAR archive action path with same inspection/remarks gating used by ICS
  - archive persistence now writes back to correct source store (`icsRecords` or `parRecords`)
  - archived entries now persist source metadata (`sourceType`, `parNo` where applicable)
  - unarchive now resolves and restores to original source set (`icsRecords` or `parRecords`)
- Waste Materials Report workflow aligned for PAR and ICS using shared form:
  - WMR open/save path is now source-aware (`sourceType` + source record number)
  - save now updates both record stores as needed, appends lineage, archives selected items, and refreshes ICS/PAR views
  - WMR-required guard before archive now applies to disposal-qualified PAR items as well
  - Archives WMR table labels updated to `ICS/PAR No.` and record-centric wording
- WMR print and batch print flows now support PAR sources:
  - `core-printing.js` print entry points now accept/propagate `sourceType`
  - batch grouping now keys by `sourceType + recordNo` to avoid ICS/PAR collisions
  - disposal validation for print now checks correct source via `hasDisposalSituation(..., sourceType)`
  - archived WMR print now carries source type context for consistent output handling
- Search overlay and details routing now include PAR records:
  - search index now merges `icsRecords` + `parRecords` + archived data
  - result badges now distinguish `ICS`, `PAR`, and `Archived`
  - PAR search hits open PAR details via source-aware key/index routing and preserve item focus
  - details/archive phrasing updated from ICS-only wording to record-type aware labels where applicable

## Newly Implemented (2026-02-16, PAR record workflow expansion + Action Center ICS/PAR integration)
- Inventory view spacing and PAR visual distinction:
  - increased inventory container gap for better separation between staged/records cards
  - added theme-aware PAR card accent styling (`.par-records`) distinct from ICS records
  - upgraded `Finalize PAR Data` button to theme-aware PAR accent tokens (no fixed hardcoded color)
- PAR records table interaction parity:
  - made `PAR No.` clickable to open details modal
  - added PAR-aware details rendering path (`PAR Details`) and switched ICS wording to PAR when source is PAR
  - added PAR row actions: `Edit`, `Print`, `Export`, `Delete`
- PAR edit/update workflow:
  - added `editPAR()` preload behavior using same staged/floating form flow as ICS edit
  - introduced edit-mode state (`editingRecordType`) to support `ics` vs `par` mode handling
  - floating form primary action now switches to `UPDATE PAR` in PAR edit mode (PAR accent)
  - finalize buttons now enforce mutual mode behavior:
    - while editing ICS, `Finalize PAR Data` is disabled
    - while editing PAR, `Finalize ICS Data` is disabled
  - finalize logic now guards against wrong-mode finalize calls and supports PAR update-in-place (not add-only)
- PAR number field behavior in floating form:
  - record number label now switches dynamically (`ICS NO.` <-> `PAR NO.`)
  - PAR update mode now uses `YYYY-MM-XXXX` pattern with adjusted maxlength (`12`) to support 4-digit suffix
  - ICS mode keeps `YYYY-MM-XXX` pattern and maxlength (`11`)
- PAR print/export/delete handlers:
  - added `printPAR()` with PAR-specific print labels (`PROPERTY ACKNOWLEDGEMENT RECEIPT`, `PAR No.`)
  - added `exportPAR()` and `deletePAR()` handlers using `parRecords` store + PAR audit trails/messages
  - wired delegated actions for new PAR handlers
- Action Center now accommodates PAR records:
  - Action Center dataset now merges rows from both `icsRecords` and `parRecords`
  - table column renamed from `ICS No.` to `ICS/PAR No.`
  - per-row display now prefixes source type:
    - ICS source: `ICS-YYYY-MM-XXX`
    - PAR source: `PAR-YYYY-MM-XXXX`
  - added row-level source tagging (`sourceType`) and source-aware delegated args for inspection/history/archive actions
  - generalized item lookup (`findItemRef`) to resolve from ICS or PAR storage by source type
  - kept archive operations ICS-only from Action Center; PAR rows show archive disabled messaging to avoid invalid archive path

## Newly Implemented (2026-02-16, My Profile modal + PAR flow + theme/visual polish)
- My Profile modal rollout (from topbar Profile Menu):
  - added dedicated `My Profile` modal (separate from full `Profile Settings`) and rewired `My Profile` menu action to open it
  - modal is theme-aware with light/dark specific styling adjustments and improved dark-theme field contrast
  - preloads existing profile fields from profile settings/current user data (name, role/designation display, email, phone, bio, avatar)
  - profile photo upload now supports click-to-upload on avatar with automatic resize/compression under `1MB`
  - added save/cancel/close/overlay/keyboard wiring (`Esc` close, `Enter` save)
- Profile/session model expansion:
  - added persistent user fields `phone` and `bio` to normalized profile model
  - preserved compatibility with existing user records and school-profile upsert flow
- Versioning workflow improvements:
  - bumped app baseline to `1.0.1` with schema `1.0.1` and SW cache `dsis-v1-pwa-v2`
  - upgraded `bump-version.ps1` to auto-generate release notes from latest `PROJECT_STATUS.md` `Newly Implemented` section (replacing placeholder entry behavior)
- Theme system additions and refinements:
  - added new dark theme variant `dracula-nocturne` (theme tokens + picker entry + swatches + variant background handling)
  - updated theme application to support Dracula-family variants via `data-theme-variant`
  - added bottom-center ambient glow gradient layer across all themes and increased its intensity
  - improved dark-theme chip readability in dashboard recent cards (higher-contrast text/fills/borders)
- Inventory/Action table UI refinements:
  - improved Action Center row alignment for actions/value columns (nowrap actions on desktop + mobile fallback wrap)
  - synced sticky first-column row background handling to reduce seam/misalignment artifacts in dark themes
- Floating form visual treatment:
  - added strong accent-glow shadow layers for floating staged form (`.sheet`), including stronger visible-state glow
- PAR records surface + staging action:
  - added `PAR Records` table below `ICS Records` in Manage Inventory
  - added `loadPARRecords()` renderer bound to `localStorage['parRecords']`
  - added staged action button `Finalize PAR Data` (distinct `btn-par` color)
  - implemented `finalizePAR()` workflow to validate staged form/items, prevent duplicate PAR No., save to `parRecords`, refresh tables, and write audit trail

## Newly Implemented (2026-02-16, DSIS V1 branding reset + update UX + Audit/Help modal rollout)
- DSIS branding and version-reset alignment:
  - user-facing app identity moved from legacy ICS naming to `DSIS V1`
  - runtime/display version baseline reset to `1` with schema baseline `1.0.0`
  - service worker cache namespace reset to `dsis-v1-pwa-v1`
  - browser/page title now `Digital School Inventory System v1.0`
- Dynamic version label behavior restored/enhanced:
  - sidebar version label is manifest-driven again and keeps `v1.0` formatting for whole-number versions
  - topbar now retains prior title layout and shows a separate clickable version tag beside title
  - both version touchpoints open `What's New` on click/keyboard activation
- Topbar profile menu cleanup:
  - removed `Enterprise Plan` row and related CSS
  - removed topbar settings icon button from active navbar
- PWA update flow improvements:
  - added visual progress bar while applying update
  - added 3-second post-apply countdown with auto-refresh
  - added update-ready in-app notification (deduped by version) for pending SW updates
- Notification behavior refinement:
  - `What's New` changed to modal-only (removed duplicate toast/notification path)
  - added notification-center-only helper for non-toast updates (`notifyCenter`)
- Audit Trail modal implementation (replacing placeholder):
  - full `Audit Trail` modal with table rendering from `icsAuditLogs`
  - filters: search, type, actor, date range (`from` / `to`)
  - pagination added with configurable state (default rows/page now `8`)
  - exports: JSON + CSV from active filter scope
  - audit type badges now tone-map by type (error/warn/success/info)
  - modal now responsive and theme-aware across light/dark themes
  - export feedback now routes to Notification Center instead of modal toast
- Audit menu badge wiring:
  - replaced hardcoded `5 New` badge with dynamic `new since last viewed` count
  - persisted last-seen marker via localStorage
  - badge auto-refreshes when new audit entries are recorded and clears on modal open
- Help & Documentation modal rollout:
  - replaced placeholder help modal with structured guide sections
  - added printable help output (`Print Guide`) via print-friendly window
  - wired close button, outside-click close, and `Esc` handling
  - integrated help overlay into modal toast host resolution

## Newly Implemented (2026-02-16, no-sidebar consistency + topbar profile UX expansion + theme catalog refresh)
- Layout mode stabilization:
  - fixed `hide-sidebar` behavior to act as a consistent no-sidebar mode across desktop/tablet/mobile breakpoints
  - added runtime body mode sync (`layout-no-sidebar`) from `.app-shell.hide-sidebar` to prevent responsive CSS conflicts
  - adjusted no-sidebar mobile/tablet paddings and sheet offsets to remove layout breakage
- Asset and PWA path hardening:
  - corrected root asset paths (removed stale `./vendor/` and `./icons/` references) in HTML, manifest, and service worker precache list
  - aligned runtime/deploy paths for `lucide.min.js`, `icon-192.png`, and `icon-512.png`
- Theme catalog overhaul:
  - removed `Velvet Red`, `Elegant Sky`, and `Elegant Emerald` from active theme catalog and picker
  - introduced 5 playful variants with plant/animal naming:
    - `playful-sunflower` (Sunflower)
    - `playful-flamingo` (Flamingo)
    - `playful-lotus` (Lotus)
    - `playful-kingfisher` (Kingfisher)
    - `playful-fern` (Fern)
  - added legacy theme key alias mapping to preserve existing saved preferences
- Dynamic theme-color sync:
  - wired `<meta name="theme-color">` updates on every theme apply so browser/PWA chrome tint follows active theme accent
- Topbar profile control redesign:
  - replaced plain profile icon trigger with a profile chip (name, role/designation, circular avatar, online status dot)
  - fallback avatar now uses existing avatar icon/initials system when no uploaded topbar image is present
  - topbar avatar upload added as UI-only profile field with draft preview/save/remove workflow (max 1MB, PNG/JPG/WEBP/SVG)
- Topbar profile menu rollout:
  - changed topbar profile click behavior to open a dedicated profile menu panel instead of direct modal open
  - added menu actions: `My Profile`, `Audit Logs` (placeholder modal), `Settings`, `Install App`, `Check Update`, `Help & Documentation` (placeholder modal), `Appearance` toggle, and `Log out`
  - added plan card row (`Enterprise Plan` + `Manage`) and menu identity header (avatar, name, email)
  - wired outside-click close and `Esc` close; menu and notification panel now close each other when toggled
- Notification noise reduction:
  - removed refresh/session-restore `Welcome back ...` notification so reloads do not increment notification count
  - removed service-worker lifecycle info/success notifications tied to passive refresh/update activation events
  - reduced non-critical toasts in new topbar flows (e.g., topbar avatar select and appearance toggle)

## Newly Implemented (2026-02-16, v4.0 baseline bump + Topbar v2 default routing)
- Version baseline advanced to `4.0`:
  - manifest app version updated to `4.0` (`manifest.webmanifest`)
  - runtime UI fallback version updated to `4.0` (`APP_UI_VERSION_FALLBACK`)
  - schema/export version updated to `4.0.0` (`ICS_SCHEMA_VERSION`)
  - service worker cache namespace advanced to `ics-v4-pwa-v114`
  - added `What's New` entry for `4.0` in release notes map
- Topbar v2 made primary for search and notifications:
  - removed hard runtime dependency on legacy hidden topbar search button by null-guarding legacy binding (`searchBtn?.addEventListener(...)`)
  - converted hidden Topbar v1 control IDs to legacy-prefixed IDs to avoid duplicate-ID collisions with active Topbar v2 notification/search controls
  - active notification/search runtime targets now resolve to Topbar v2 controls (`notifBellBtn`, `notifBadge`, `notifPanel`, `notifTabs`, `notifList`)

## Newly Implemented (2026-02-16, Topbar v2 UI/interaction iteration + dashboard spacing tuning)
- Topbar v2 introduced and iteratively refined as alternate header surface:
  - added full-width Topbar v2 shell above app layout and aligned with theme tokens
  - made Topbar v2 sticky (`top:0`) with glassmorphism treatment and dark-theme-specific readability adjustments
  - reworked Topbar v2 identity block to app-brand style (`Digital School Inventory`) and centered title layout
  - migrated Topbar v2 navigation into horizontal menu (Dashboard, Inventory, Action Center, Archives), including hover/icon micro-interactions
  - added Topbar v2 search pill redesign with hover tooltip shortcut (`Ctrl+K`) and improved viewport-safe tooltip placement
  - wired Topbar v2 controls to runtime actions (`goToView`, search overlay, Data Manager modal, Profile modal, notifications toggle)
- Notifications wiring updates:
  - added shared `toggleNotificationsPanel()` helper and delegated action route for notification panel toggle
  - routed Topbar v2 notification bell to active panel state handling
- Sidebar/header experimentation controls:
  - added temporary `hide-sidebar` layout mode and scoped it to desktop-only behavior
  - temporarily hid Topbar v1 during Topbar v2 iteration flow
- Dashboard spacing updates:
  - increased Recent ICS Activity capacity to 10 cards (`core-dashboard-recent-activity.js`)
  - introduced dashboard view tagging (`content[data-view]`) and applied dashboard-only top padding override
  - current dashboard-only top padding set to `200px`
- Theme background atmosphere pass:
  - increased radial gradient radius/falloff across all theme body backgrounds for softer, wider ambient coverage

## Newly Implemented (2026-02-15, unserviceable/archive/WMR/batch-print workflow refinements + table scroll + toast containment)
- Unserviceable modal workflow and data structure upgrades:
  - replaced legacy situation list with six numbered situations and mapped remarks/notes guidance
  - split Unserviceable capture into separate `Remarks` and `Notes` fields
  - changed `Remarks` from freeform area to situation-dependent dropdown
  - added dynamic guidance rendering for selected situation and persisted `remarks` in inspection logs
  - improved Inspection History table structure (`Situation`, `Remark`, `Notes`, richer `Recorded` metadata with WMR-prepared markers)
- Action Center table and archive gating updates:
  - added EUL Action Center `Remarks` column after `Inspection`, sourced from latest inspection (with fallback inference for legacy logs)
  - archive row action now enables only when latest inspection is `unserviceable` and has remarks
  - added server-side/runtime guard in `openArchiveModal(...)` to enforce same archive precondition
  - archive modal `Cancel` now closes only (no automatic return to Unserviceable modal)
- WMR save/archive behavior realignment:
  - WMR `Save` now archives selected WMR-prepared items directly into `Archived Disposal Items` as new rows
  - save flow removes archived items from active `icsRecords`, updates lineage/audit, and keeps per-row/archive print actions usable
  - added `Archive Approval Status` field in WMR and wired value into archived disposal status (instead of forced approved state)
  - WMR draft fields now clear after successful save/archive, with default `Place of Storage` restored
  - `Place of Storage` now supports autosuggest (`datalist`) from record + archived WMR history
- Archives batch print builder mode:
  - `Batch Print WMR` now opens builder mode in WMR panel (instead of immediate multi-print sequence)
  - builder supports item matching by `Item No.` or `ICS/ItemNo`, auto-adds matched row, and appends a fresh input row for repeat entry
  - added item autosuggest list in builder input and conditional `Print` button (shown when 2+ rows selected)
  - added builder `Cancel` control and `Esc` behavior to exit builder mode cleanly
  - removed hard one-ICS restriction for builder print selection; mixed ICS entries can now print in one generated form
- Notification/UI containment and table overflow handling:
  - fixed stray toast rendering in Archives by excluding `wasteReportOverlay` from modal-toast host targets
  - enabled automatic horizontal scroll-on-overflow behavior for table wrappers, including Action Center EUL table (`actions-eul-wrap`)

## Newly Implemented (2026-02-15, archives WMR workspace migration + action/archive workflow realignment)
- Action Center table simplification:
  - removed `Batch` checkbox column from EUL Action Center table
  - removed local Action Center density toggle UI (global profile density remains active)
  - header Batch PRINT WMR button restyled with printer icon and no count indicator
- Welcome/header readability refinement:
  - increased dark-theme readability for welcome title/subtitle via stronger contrast and subtle subtitle surface treatment
- Theme catalog changes:
  - removed `elegant-green` and `nord` themes from token map, theme picker, and related swatch/background styles
  - added two new playful variants: `playful-coral` and `playful-mint` with full token integration and picker entries
- Inspection/Action workflow changes:
  - removed top-level print button from Inspection History modal; retained per-row print icon action only
  - moved `Archive Item` initiation from Unserviceable modal to EUL Action Center row Actions column (after Inspection History) with subtle divider
  - removed `Archive Item` button from Unserviceable modal markup (including fallback injected modal template)
- WMR workflow migration to Archives:
  - moved WMR draft surface from modal stack into Archives view as inline staged-style panel
  - Archives now hosts WMR draft above Archived Disposal table for one-surface workflow
  - WMR panel redesigned to staged-style composition:
    - title changed to `Waste Materials Report` with `DRAFT` pill
    - removed close button and retained Save-only footer action
    - removed visible auto-populated summary block (ICS/entity/item-count/prepared-at)
    - removed Additional Notes field
    - reordered layout so items table appears before signatories
    - signatories arranged as 4-column row with subtle divider above section
    - default blank row seeded in items table when no active WMR target is loaded
- Archives disposal actions and printing:
  - added per-row `Print Waste Materials Report` icon in Archived Disposal Actions column (disabled when no prepared WMR metadata)
  - moved Batch Print WMR control from Action Center to Archived Disposal container header
  - added archived-scope batch print handler that prints prepared archived entries within current Archives filter scope

## Newly Implemented (2026-02-15, dashboard recent-activity extraction + records/action-center behavior refinements)
- Dashboard recent-activity modularization and redesign:
  - extracted Recent ICS Activity card data/render logic into dedicated module `core-dashboard-recent-activity.js`
  - dashboard metrics now hydrate recent cards through module call (`hydrateRecentIcsActivityCards(records)`) instead of inline card-template logic
  - redesigned recent cards to structured 4-part layout (ICS header row, status badges, info rows, last-activity footer)
  - card styling now supports tone-coded backgrounds by status (`tone-ok`, `tone-new`, `tone-imported`, `tone-risk`) and keeps tone colors consistent across themes
  - refined typography, spacing, and icon balance for recent cards; added dashboard-widget hover/focus effects across KPI/action/compliance/recent/notes cards
- Shell/layout spacing updates:
  - desktop `.main` horizontal padding increased iteratively and currently set to `padding:45px 70px 24px`
  - welcome subtitle spacing increased (`.welcome-subtitle` bottom margin now `20px`)
- Inventory records table fit/readability pass:
  - added compact sizing adjustments for records table controls/cells to improve one-screen fit at larger global side padding
  - enabled dynamic content-based column sizing for `Manage Inventory` records table (`.ics-records-table` now `table-layout:auto` with scoped min-width guards)
  - EUL status cell in records table now renders as default two-line stack (`eul-stack`) to reduce sparse top-row appearance
- Action Center batch-print workflow updates:
  - Batch PRINT WMR no longer depends on checkbox selection; now uses current Action Center scope/filter as source
  - batch button count now reflects eligible disposal-ready items in current scope
  - tightened eligibility rule so only items whose **latest** inspection state is `unserviceable` with reason `Item for disposal` are included (items changed to `serviceable` are excluded)
- Welcome subtitle context improvements:
  - welcome subheading now appends dynamic current-state summary per view (dashboard/inventory/action-center/archives context counts + active filter scope)
- Runtime/script cleanup progress:
  - removed inline handlers from `ics_v_3_standalone_index.html` and moved wiring into delegated/action-based JS handling
  - moved inline Lucide initialization into dedicated module `core-icon-init.js`
  - continued migration away from inline `on*` handlers across runtime render paths

## Newly Implemented (2026-02-15, header simplification + auth/profile modal redesign + instant profile theme load)
- Welcome/banner presentation refinement:
  - removed legacy boxed welcome wrapper treatment and simplified header rendering to title + subtitle flow
  - removed `System Live | ICS Manager` badge from welcome header
  - centered welcome title/subtitle and tightened spacing control for cleaner hierarchy
  - greeting icon switched to emoji set (`🌅`, `☀️`, `🌙`)
  - added dark-theme readability overrides for welcome title/subtitle/icon glow
  - increased adjustable top spacing above welcome area via `.main` padding tuning
- Dashboard container cleanup:
  - removed heavy outer `dash-overview` container chrome (border/background/shadow/padding shell) for lighter composition
  - validated `Recent ICS Activity` remained on stable card layout after rollback from exploratory redesign pass
- Login + Create Personnel modal UI overhaul:
  - login modal redesigned with cleaner spacing, stronger label hierarchy, iconized field labels, and dark-theme specific contrast tuning
  - removed inner login body container boxes for flatter, cleaner form flow
  - setup/personnel modal reworked with modern section headers, field meta labels (`Required`, `Optional`, `Permission set`), iconized input shells, and footer action split (`Cancel` + primary CTA)
  - personnel mode copy/layout updated to `Create Personnel Profile` direction (`Workplace Context`, `Personnel Identity`, refined subtitle/CTA text)
  - added gradient border and visible glow treatments for login/personnel modals with dark-theme visibility adjustments
- Personnel setup behavior updates:
  - removed school field read-only state in personnel creation flow (`setupSchoolName`, `setupSchoolId` now editable)
  - removed legacy personnel helper line (`Create a new personnel profile for this school.`) and auto-hide empty setup hint
- Theme/profile load performance improvements:
  - applied theme+density at startup immediately after profile load to reduce first-paint mismatch
  - on remembered-session restore, now applies selected profile theme/density/default view immediately
  - on manual login, now applies selected profile theme/density/default view immediately without refresh

## Newly Implemented (2026-02-15, PWA update controls + theme/token polish + shell alignment)
- PWA update flow and user controls:
  - added manual update control in sidebar (`Check Update` -> `Apply Update`) with guided modal sequence
  - update flow now supports user-confirmed apply and explicit post-apply instruction (`close and open app again`)
  - startup update detection restored as notify-only (no forced auto-apply), keeping user-controlled apply path
  - service worker registration hardened with `updateViaCache:'none'` and explicit update checks during detection flows
  - service worker cache/version advanced iteratively; current cache version now `ics-v3-pwa-v86`
- Release visibility improvements:
  - one-time per-version `What's New` modal added with persistent seen-version tracking (`icsLastSeenAppVersion`)
  - `What's New` entries also written to Notification Center on first-seen version
  - sidebar version label (`System Manager v.x`) made clickable/keyboard-accessible to reopen update notes on demand
- Theme system additions and consistency pass:
  - added two elegant-white accent variants: `elegant-sky` and `elegant-emerald`
  - tokenized Data Hub and ICS Details modal color surfaces to align with active theme variables
  - staged-items card/table visuals now inherit floating-form (`--sheet-*`) tokens for utility parity
  - table typography normalized via density-aware tokens:
    - comfortable: `12.5 / 11.5 / 10.5` (body/head/meta)
    - compact: `10.5 / 9.5 / 9.5` (body/head/meta)
  - normalized size inheritance for table inline links/mono/status chips to reduce per-column text-size mismatch
- Shell/topbar/sidebar UX polish:
  - topbar school identity reformatted into split label + ID accent chip for better readability and truncation behavior
  - collapse-sidebar control moved out of brand/logo row into dedicated sidebar control row
  - collapsed sidebar footer icon alignment tuned so controls share a centered axis

## Newly Implemented (2026-02-15, unified button system + WMR redesign + autosuggest pass)
- Button system standardization:
  - introduced semantic button model (`.btn` + `primary/secondary/danger/ghost` variants with `sm/md/lg` sizing)
  - aligned button interaction states globally (hover/active/focus-visible/disabled) via shared tokenized rules
  - migrated legacy action markup across runtime renderers from `small-btn` semantics to explicit `btn` classes
  - normalized icon-button targets and behavior, with staged/table contexts using compact icon sizing where appropriate
- Staged-items UX and theme token integration:
  - refined staged table action density, EUL stepper spacing, and footer CTA spacing/readability
  - added truncation+tooltip behavior for long `Working ICS` context text in staged header
  - converted staged color styling to theme-driven token family (`--staged-*`) and wired to theme application flow
- Waste Materials Report (WMR) modal design alignment:
  - rebuilt WMR modal structure to use ICS Details design language (`icsd-*` cards/sections/header rhythm)
  - aligned WMR typography, spacing, card/table treatment, and dark-theme behavior with ICS Details conventions
  - improved WMR header controls (iconized close control, right-pinned header action alignment, section/action icon polish)
- WMR signatories behavior update:
  - switched WMR signatory handling from heavy fallback auto-populate to autosuggest-from-existing-records pattern
  - added field-level datalist suggestions sourced from historical ICS signatories + prior WMR metadata
- Profile/Setup designation input UX update:
  - replaced Identity/Setup `Designation` dropdowns with autosuggest inputs (`datalist`) while preserving school designation governance logic
  - updated designation option binding helpers to support both select and input+datalist modes
  - improved Profile Identity pane spacing, padding, and typography to better match ICS Details card rhythm

## Newly Implemented (2026-02-14, responsive UX + notifications + dashboard/readability pass)
- Versioning advanced again:
  - app/UI version updated to `3.3` (manifest + runtime fallback)
  - schema/export version updated to `3.3.0` (`ICS_SCHEMA_VERSION`)
  - service worker cache version updated to `ics-v3-pwa-v74`
- Responsive shell/navigation upgrades:
  - mobile and tablet portrait now support bottom-nav treatment with center `New ICS` action
  - topbar/profile/bell placement tuned for compact layouts
  - floating form close behavior improved (`Esc` and outside-click close support)
- Table/mobile UX upgrades:
  - horizontal table scrolling treatment applied across dense table surfaces on mobile/tablet portrait
  - ICS Records status moved out of ICS No. cell into dedicated `Status` column
  - status visuals compacted to dot+label markers for cleaner scan density
  - Total Value cell decluttered by moving depreciation detail into info tooltip action
- Archive Details/ICS Details visual alignment:
  - Archive Details modal refactored to ICS-style card structure (`icsd-*` patterns)
  - responsive archive details layout improved for narrow screens
- Notification Center overhaul:
  - new header actions (`Mark all read`, `Clear read`)
  - filter tabs (`All`, `Unread`, `Alerts`, `System`)
  - grouped feed buckets (`Now`, `Today`, `Earlier`)
  - iconized rows with per-item actions (toggle read/unread, delete)
  - notification deduping with count badges and expanded retention limit
  - mobile notification placement and panel behavior refined
- Dashboard KPI readability fix:
  - `Total Asset Value` now clips safely in-card and supports horizontal ticker animation on overflow

## Newly Implemented (2026-02-14, follow-up polish + fixes in this session)
- Versioning advanced:
  - app/UI version updated to `3.2` (manifest + runtime fallback)
  - schema/export version updated to `3.2.0` (`ICS_SCHEMA_VERSION`)
- Lucide icon migration completed app-wide:
  - replaced remaining inline SVG usage in shell, dashboard, action tables, details/history views, form row actions, Data Hub cards, and profile/avatar icon templates
  - local Lucide runtime integrated from repo-local vendor asset (`vendor/lucide.min.js`) with no runtime CDN dependency
  - automatic icon hydration added (`window.refreshIcons` + mutation observer) so dynamically rendered content resolves icons reliably
  - click-hit reliability patch added (`.lucide { pointer-events:none; }`) to avoid center-click dead zones on icon buttons
  - icon optical alignment pass applied (consistent stroke caps/joins and container baseline normalization)
- Data Hub modal visual redesign completed:
  - updated to card-based layout matching current design direction (icon/title header, close pill, 2+1 action card grid, helper footer row with version chip)
- Action Center modal reliability fixes:
  - resolved `Inspection History` opening failures by adding robust overlay/body fallback injection when missing from live DOM
  - added icon refresh after history content render to ensure print/history icons appear immediately
  - hardened `Unserviceable` inspection flow with fallback modal injection and explicit error path if modal nodes are unavailable
- Dashboard dark-theme readability updates:
  - improved `Recent ICS Activity` contrast in `dracula` and `crimson-black` (widget surface, header/body text, link color, neutral badges, borders, empty-state text)
  - adjusted table surface to inherit widget background consistently in dark themes
- Sidebar collapse feature added:
  - desktop collapsible sidebar with brand toggle control, icon mode, and persisted state (`icsSidebarCollapsed`)
  - collapse state survives reload and re-applies on resize with desktop/mobile guard behavior
  - collapsed sidebar keeps quick profile access (avatar click opens profile)
- Service worker/prefetch updates:
  - cache version advanced iteratively through this session; current cache version now `ics-v3-pwa-v73`

## Newly Implemented (2026-02-14, ICS Details + Dashboard + Sidebar UI overhaul)
- ICS Details modal redesign and simplification:
  - rebuilt into a cleaner two-column + full-width items layout with improved visual hierarchy
  - removed non-essential technical noise for non-admin users (advanced lineage visibility is role-aware)
  - removed footer action cluster and retained top-right close control
  - moved record history into a dedicated modal (`Record history - <ICS No.>`) with keyboard and outside-click close support
  - removed inline `Add inspection` / `Archive item` controls from ICS Details per workflow simplification
  - removed in-modal tip copy for cleaner presentation
- Dashboard top-level redesign:
  - replaced previous top-level dashboard shell with card-based executive layout:
    - KPI strip (`Total ICS Records`, `Within EUL`, `Outside EUL`, `Total Asset Value`)
    - action cards (`Import Center`, `Export Center`, `Action Center`, `Archives`)
    - right-side `Compliance Health` card with dynamic badge and progress bars
  - restored shared/original header banner (`renderWelcomeBanner('Dashboard')`) for consistency with other views
  - removed temporary extra custom top-nav block after alignment pass
- Dashboard bottom intelligence sections added:
  - `Recent ICS Activity` table (latest records + status + EUL + value + last action)
  - `Today's Notes` with live cards:
    - `Last sync` now shows backup/import history (`icsLastFullBackupAt`, `icsLastImportAt`)
    - `Integrity` summarizes lineage readiness vs mismatches
    - `Reminders` highlights outside-EUL action demand
- Sidebar facelift:
  - refreshed nav spacing, icon containers, hover/active states, and typography for stronger coherence
  - `Action Center` menu item updated to shield-style logo treatment and full label text (`Action Center`)
  - dark-theme sidebar nav/icon styling patched for consistency
- Service worker cache updated iteratively during UI rollout; current cache version now `ics-v3-pwa-v73`.

## Newly Implemented (2026-02-13, access control + lineage hardening + modularization)
- Role/access controls are now enforced centrally:
  - centralized `ACCESS_RULES` + `requireAccess(...)` guard model
  - major data mutation/export/archive paths now route through unified permission/session/school checks
  - bypass-resistant enforcement added for direct function entry points (not only UI disabled states)
- Data lineage hardening baseline is now active:
  - immutable per-record `_lineage` timeline with append-only version events (`version`, `action`, `at`, `actor`, `deviceId`, `sessionId`, `hash`, `parentHash`)
  - record hash verification added (`verifyRecordLineage`) with mismatch detection
  - lineage summary + recent timeline added in ICS Details modal
  - status marker now surfaces lineage integrity warning marker when mismatched
  - baseline lineage migration runs on boot for legacy records missing `_lineage`
- Audit/session attribution strengthened:
  - persistent device ID (`icsDeviceId`) and runtime session IDs added
  - audit logs now include actor role + device/session attribution
  - Profile Security `Recent Data Activity` now shows actor + device + session context
- Trace integrity summary expanded:
  - now includes attribution/tamper signals (audit device/session gaps + tamper alert counts)
- Codebase modularization started (behavior-preserving extraction):
  - `core-storage-security.js` (storage keys, role/capability/access guards, runtime id helpers)
  - `core-lineage-audit.js` (audit logging + lineage/hash/verification core)
  - `core-data-manager.js` (Import/Validation/Export workflow core)
  - `core-records-workflow.js` (import/finalize/auto-populate record workflow)
  - `core-actions-workflow.js` (inspection/archive/unarchive/WMR action workflows)
  - `core-profile-session.js` (profile normalization/avatar rendering + school profile/session/login identity persistence flows)
  - `core-theme-preferences.js` (theme token application + table density + profile preference tab/validation helpers)
  - `core-school-setup-ui.js` (school logo preview/upload + setup/sign-up/session guard flows)
  - `core-profile-modal.js` (profile modal open/close orchestration + profile save/apply pipeline)
  - `core-shell-init.js` (shell startup wiring: FAB/sheet setup, initial UI refresh, resize + field-error cleanup listeners)
  - `core-dashboard-view.js` (shared welcome/subtitle/banner helpers used across Dashboard, Inventory, Action Center, Archives views)
  - `core-dashboard-render.js` (full Dashboard markup renderer extracted from main HTML script)
  - `core-inventory-view-render.js` (Manage Inventory view renderer extracted from main HTML script)
  - `core-actions-view-render.js` (Action Center and WMR modal renderers extracted from main HTML script)
  - `core-archives-view-render.js` (Archives view renderer extracted from main HTML script)
  - `core-dashboard-actions.js` (dashboard navigation/shortcut/filter utility actions extracted from main HTML script)
  - `core-dashboard-metrics.js` (dashboard KPI/data-quality/risk metric computation + render hydration extracted from main HTML script)
  - `core-app-bootstrap.js` (boot/session startup + PWA install/service-worker workflow)
  - `core-keyboard-routing.js` (global keymap, overlay keyboard routing, form/navigation shortcuts)
  - `core-notifications.js` (notification store/render/read handling + modal toast helper + bell/panel wiring)
  - `core-ui-event-wiring.js` (shared UI listener wiring for overlays/profile/data-manager/theme controls)
  - `core-modal-system.js` (global confirm/info modal helpers and pending confirm action runner)
  - `ics_v_3_standalone_index.html` now loads the above modules and removed duplicated inline blocks
  - PWA precache updated to include all modular JS files (`sw.js` cache version advanced to `ics-v3-pwa-v23`)

## Newly Implemented (2026-02-13, UX + theming pass)
- PWA install UX:
  - in-app `Install App` sidebar button added with install prompt handling
  - fallback `Install Guide` flow when browser prompt is unavailable
  - installed-state detection (`App Installed`) added
- Data action cleanup:
  - removed duplicate `Import JSON` and `Auto-Populate x3` controls from Manage Inventory toolbar
  - moved `Auto-Populate x3` into Data Hub as a dedicated action
- WMR modal redesign:
  - compact/modern layout pass (tighter spacing, denser fields, stronger hierarchy)
  - top-right close control added in modal header
  - mobile-only card layout for item disposition rows (table transforms into labeled stacked cards)
- Dark theme UI improvements (`dracula`, `crimson-black`):
  - contrast fixes for WMR and Inspection History modals
  - clearer surfaces, text colors, input states, table headers/rows
  - distinct accent differentiation per dark theme (violet vs crimson focus/hover cues)

## Newly Implemented (2026-02-13, ongoing modular extraction in current chat)
- Additional behavior-preserving module extraction completed:
  - `core-shared-utils.js`
  - `core-school-profile-normalization.js`
  - `core-record-normalization.js`
  - `core-records-search-details.js`
  - `core-inventory-table-render.js`
  - `core-printing.js`
  - `core-form-staging.js`
  - `core-import-autosuggest.js`
  - `core-shell-view-state.js`
  - `core-main-entry.js`
- `ics_v_3_standalone_index.html` now loads the above modules and removed corresponding inline function bodies.
- Service worker precache updated for these modules and cache version advanced to `ics-v3-pwa-v33`.
- Remaining inline bootstrap/state/event wiring extracted from `ics_v_3_standalone_index.html` into `core-main-entry.js` (no inline runtime script block remains).

## Known Issue Resolved (2026-02-13, modal layering)
- Fixed `Migration Details` dialog layering behind Data Manager overlays.
- Applied patch:
  - raised global `.modal-overlay` stacking from `z-index:100` to `z-index:200` so `showModal(...)` dialogs render above `.actions-modal-overlay` (`z-index:145`).

## Newly Implemented (2026-02-12, stabilization + traceability follow-up)
- Runtime stabilization hotfixes:
  - removed stray trailing JS fragment after `</html>` that was breaking boot
  - restored missing `avatar` normalization in `normalizeUser()` that caused startup `ReferenceError`
  - dashboard/views now load normally again
- Profile settings UX:
  - Profile modal side menubar is active and wired (`Identity`, `School Lock`, `Preferences`, `Security`)
- Role and designation updates:
  - role separated from school/job designation in profile model
  - school-wide designation list is admin-managed from Profile Security
- Identity visuals:
  - school logo upload/remove (admin-controlled) updates sidebar app logo
  - vector avatar picker added for personnel profile; remains theme-aware
- Traceability hardening:
  - import preview now auto-migrates legacy records with missing `profile-key` trace fields
  - validation preview shows migration count (`Trace Migrated`) and flags warnings
  - export paths consistently include profile-key trace metadata, including:
    - records in schema exports
    - full package notifications/audit/archive normalization
    - single-record `Export ICS` payload (`exportedByProfileKey`, `exportedAt`, schema tag)
  - Profile Security now includes `Data Integrity Check` summary panel
  - one-step undo support added for major data mutations:
    - snapshot captured before `Repair Missing Profile Keys`
    - snapshot captured before Data Manager `Apply Import`
    - `Undo Last Data Change` action added in Profile Security (Admin)
  - pre-import trace checker added:
    - `Validate JSON Trace` in Import Center
    - reports missing profile-key trace fields without modifying local data
  - Profile Security now includes `Recent Data Activity` panel:
    - shows latest maintenance/import/export audit events with actor profile key
  - PWA/GitHub Pages readiness:
    - app manifest added (`manifest.webmanifest`)
    - service worker added (`sw.js`) with precache + offline fallback
    - app icons generated (`icons/icon-192.png`, `icons/icon-512.png`)
    - PWA metadata + service worker registration added in main app HTML
    - root `index.html` redirect entrypoint added for GitHub Pages

## Completed UI/Foundation Work
- SaaS shell structure completed:
  - left sidebar
  - top command bar
  - vector icon usage
  - tokenized theme system
- Action Center and table polish completed:
  - sticky first column behavior
  - density toggle
  - compact row action controls
- Modal/form system unification completed:
  - modal size classes
  - sticky modal footers
  - inline field error states
- Final polish completed:
  - spacing/hover/motion consistency
  - staggered entrance animations

## Post-Polish Functional Adjustments Completed
- Encoding artifacts cleaned.
- Small-screen spacing tightened (`<=640px`) for shell/topbar/sidebar.
- FAB restyled/reduced; floating form recolored and kept bottom-centered.
- `placeSheetNearAddItemButton` currently resets to default placement.
- Keyboard mapping includes `Alt+N` + `Ctrl/Cmd+A` for new form flow.
- Row/action text buttons converted to icon-only buttons in key tables (with `title` + `aria-label`).

## Dashboard Work Completed
- SaaS-style dashboard redesign implemented with:
  - visual hero section
  - KPI cards with vector icons
  - status distribution bars and richer analytics sections
- Later removed per request:
  - Lifecycle Trend section
  - Portfolio by Entity section
- Internal table scrollbars hidden while preserving scroll behavior.

## Profile + Theme System Completed
- Profile modal added and improved:
  - identity and preference sections
  - last login display
  - theme preview button grid
- Topbar user identity wiring added.
- Profile persistence added using localStorage key:
  - `icsCurrentUser`
- Preference persistence:
  - default view
  - table density
  - theme selection
- Theme picker behavior:
  - button-only theme selection (dropdown hidden)
  - live preview on click
  - cancel/escape/outside-click restores prior theme
  - save persists selected theme

## Available Themes (Current)
- Playful
- Elegant White
- Elegant Green (custom palette applied)
- Velvet Red
- Crimson Black
- Nord (custom palette applied)
- Dracula (custom palette applied)

## Theming Refactor Progress
- Global theme tokens now cover:
  - shell
  - buttons
  - modals
  - notification panel
  - dashboard chips
  - sidebar active state
  - logo gradient
  - FAB gradient
- Floating form moved to theme tokens (`--sheet-*`) and now adapts per theme.
- FAB focus ring moved to token (`--fab-focus-ring`) and adapts dark/light.
- Dark theme consistency patches added for Dracula/Crimson Black in:
  - profile sections
  - action tables
  - sticky table columns
  - density controls
  - staged/draft card and related table controls

## Product Direction Notes
- App works offline (single standalone HTML + localStorage + inline SVG/CSS).
- For selling to many schools:
  - free backend tiers are prototype only
  - if cloud sync is needed, use paid multi-tenant architecture
  - offline commercial path should include packaging + licensing strategy

## Missing / Next Priority Work (Recommended Order)
1. Packaging/licensing
   - installable build (Tauri/Electron)
   - license activation/update path
2. Continue modular refactor
   - move remaining UI/bootstrap/event wiring out of `ics_v_3_standalone_index.html`
   - finalize module boundaries and load order checks
3. Schema migration map
   - formal historical schema migration definitions (currently compatibility parsing + normalization)

## Newly Implemented (2026-02-12, this session)
- Data integrity layer baseline is now active:
  - strict `validateAndNormalizeICSRecord` on manual finalize and JSON import
  - import payload normalization supports:
    - single ICS object
    - records array
    - schema package (`data.records`)
- Data Manager module added:
  - split workflow architecture:
    - `Data Hub` chooser modal
    - `Import Center` modal
    - `Validation Preview` modal
    - `Export Center` modal
  - dry-run analysis of incoming data
  - merge mode (skip duplicate ICS) and replace mode (overwrite duplicate ICS)
  - conflict/invalid report export (`ics-import-conflict-report.json`)
  - preview/conflict review moved to dedicated validation modal before apply
  - import history panel added in Import Center (from `icsAuditLogs`)
- Schema-versioned export now available:
  - records package export
  - full package export
  - schema version tag: `3.1.0`
  - records export supports Year/Month filters
  - filter controls display per-year/per-month record counts
- Dashboard full backup now uses schema-versioned full export.
- Data Manager access and UX updates:
  - topbar entry (`Data`) with `Alt+D`
  - inline import status banners (success/error/info)
  - modal close controls moved to top-right headers
- ICS Records footprint markers:
  - per-record status metadata stored in `_statusMeta`:
    - `type` (`new` / `imported` / `updated`)
    - `at` timestamp
    - `by` username (current profile)
  - compact color-coded info marker beside ICS number with tooltip:
    - status + actor + timestamp
  - ICS/Entity table readability updates:
    - wider ICS column
    - one-line ICS with ellipsis + tooltip
    - explicit Entity text wrapping

## Newly Implemented (2026-02-12, security hardening)
- Backup/export packages now include integrity metadata:
  - SHA-256 checksum
  - canonicalization tag (`sorted-json-v1`)
  - integrity target (`package-without-integrity`)
- Import/restore verification gate added in Data Manager:
  - checksum verification status panel in Validation Preview
  - full-backup restore is blocked if checksum is missing/invalid
  - schema package restore is blocked on checksum mismatch/unsupported algorithm
  - Apply Import stays disabled until verification passes
- Backup audit entry now includes checksum fingerprint prefix.

## Newly Implemented (2026-02-12, school identity lock)
- School identity configuration added in Profile:
  - School Name
  - School ID (`4-12` digit lock value, e.g. `114656`)
- Active school identity now appears in top bar as context (`School Name [ID: ...]`).
- Export packages now include `schoolIdentity` metadata.
- Import verification now checks school lock compatibility:
  - blocks restore on School ID mismatch
  - blocks full-backup restore when School ID metadata is missing
  - allows non-full legacy imports with warning when School ID metadata is missing
- Validation Preview now shows package School ID when available.
- First-run/setup enforcement:
  - app now prompts a dedicated Setup/Sign-up modal on boot when School ID is missing
  - data actions are blocked until School Name + School ID are configured
  - setup modal includes school + first personnel creation flow
- Shared-computer login flow:
  - required login modal on boot (School ID + profile selection)
  - profile list is nested per School ID (`icsSchoolProfiles`)
  - data actions require active session login in addition to school lock
  - login modal includes `New Personnel` path for creating additional profiles under the same school
  - optional `Remember this device` session restore across refresh
  - explicit `Sign Out` actions in sidebar widget and Profile modal
  - dedicated Setup/Sign-up modal used for first-time school + personnel onboarding (instead of Profile modal)
  - sidebar profile widget added and compacted:
    - avatar + username + role
    - username area opens Profile settings
    - vector Sign Out icon beside identity block
- Setup modal UX refresh:
  - solid-color backdrop (no blur)
  - animated gradient border treatment

## Remaining Gaps After This Session
- Add formal migration map per historical schema version (currently normalized through compatibility parsing).
- Add automated regression checks for module loading order and critical workflows.

## Smoke Test Checklist (Quick Regression Pass)
1. Boot + Navigation
   - Open app and confirm Dashboard renders.
   - Switch views: Dashboard, Manage Inventory, Action Center, Archives.
2. Profile + Security
   - Open Profile side menu tabs and save without errors.
   - In Security tab, confirm `Data Integrity Check` summary renders.
   - Run `Repair Missing Profile Keys` (Admin) and confirm completion summary.
3. Import Preview
   - Load legacy JSON in Import Center.
   - Run `Validate JSON Trace` and confirm report appears.
   - Confirm Validation Preview shows `Trace Migrated` KPI when applicable.
   - Open `Migration Details` and verify row/field list appears.
4. Export Paths
   - Export Records package and Full package from Export Center.
   - Export single ICS from records table.
   - Verify payloads include `exportedByProfileKey` and trace profile-key fields.
5. Role Guardrails
   - Login as non-Admin profile and verify restricted actions are blocked with clear message.
6. Undo Snapshot
   - Run a trace repair or apply import, then use `Undo Last Data Change` in Profile Security (Admin).
   - Confirm records/activity are restored to previous state.

## Changelog (Recent)
- 2026-02-15:
  - Upgraded Unserviceable modal flow to six numbered situations with structured `Remarks` + `Notes` separation, situation-linked remarks dropdown, and dynamic guidance text.
  - Updated Inspection History recording presentation to explicit `Situation` / `Remark` / `Notes` columns with stronger recorded metadata context.
  - Added Action Center EUL `Remarks` column and archive activation guard (latest inspection must be Unserviceable with remarks), with runtime enforcement in archive open path.
  - Changed Archive modal `Cancel` behavior to close only (no auto-return to Unserviceable modal).
  - Reworked WMR save path to archive selected items immediately into Archived Disposal rows, remove items from active records, and keep archive print availability.
  - Added WMR `Archive Approval Status` field and persisted selected status into archived disposal metadata.
  - Added WMR `Place of Storage` autosuggest and post-save field reset handling.
  - Replaced Archives Batch Print immediate execution with WMR batch builder mode (item-match row builder, autosuggest input, conditional print button, cancel + Esc exit).
  - Removed one-ICS restriction in batch builder print selection to support mixed-ICS single-form print generation.
  - Fixed stray toast banner in inline Archives WMR panel by excluding `wasteReportOverlay` from modal toast host detection.
  - Applied automatic horizontal table scrolling on overflow (including Action Center EUL wrapper) to improve dense-table usability.
  - Extracted Recent ICS Activity card pipeline into `core-dashboard-recent-activity.js` and wired `core-dashboard-metrics.js` to module-driven hydration.
  - Reworked Recent ICS Activity cards to structured status-coded design and enforced tone background consistency across themes.
  - Added dashboard widget hover/focus motion pass across KPI/action/compliance/recent/notes cards.
  - Removed remaining inline handler dependencies from main runtime markup and moved icon bootstrap to `core-icon-init.js`.
  - Increased desktop `.main` horizontal padding to `70px` (current: `padding:45px 70px 24px`) and adjusted records table fit strategy accordingly.
  - Applied `Manage Inventory` records table dynamic content sizing (`.ics-records-table` auto layout + scoped min-width guards).
  - Updated records EUL cell rendering to default two-line stack for consistent row density.
  - Updated Action Center Batch PRINT WMR flow to use current scope/filter instead of checkbox dependency.
  - Tightened batch eligibility to latest inspection state (`unserviceable` + `Item for disposal`) so reverted serviceable items are excluded.
  - Added dynamic view-state summary text to welcome subtitle per active view context.
  - Simplified welcome header presentation (removed live badge/container shell), centered greeting typography, and refined spacing controls.
  - Switched greeting icon to emoji and added dark-theme readability overrides for welcome title/subtitle.
  - Reworked login modal UI with cleaner spacing, flatter layout, iconized labels, and improved dark-theme contrast behavior.
  - Reworked Create Personnel flow styling with sectioned identity/context layout, field helper metadata, iconized input shells, and split footer actions.
  - Updated personnel setup copy to `Create Personnel Profile` direction and removed redundant helper hint line.
  - Removed read-only enforcement from School Name/School ID in personnel creation mode.
  - Added/adjusted gradient border + glow treatments for login/personnel modals with stronger dark-theme visibility.
  - Improved profile preference boot/login responsiveness by applying theme+density/default-view immediately on startup, remembered-session restore, and manual login.
  - Added semantic button system (`.btn` variants + size scale) and migrated runtime action markup to explicit button intent classes.
  - Unified button interaction states and icon-button behavior; tuned staged-table control density and EUL stepper readability.
  - Made staged workspace visual styling fully theme-aware using dedicated `--staged-*` tokens applied via theme pipeline.
  - Redesigned WMR modal to ICS Details visual system (`icsd-*`) and aligned typography/spacing/cards/tables with modal uniformity.
  - Refined WMR header controls (right-pinned close action, lucide close icon, section/action icon additions, dark-theme hover consistency).
  - Switched WMR signatory fields to autosuggest from existing records/history via datalist, reducing forced fallback auto-population.
  - Replaced Profile/Setup designation dropdowns with autosuggest inputs and updated designation option hydrators for datalist mode.
  - Polished Profile Identity pane spacing/padding/font rhythm for closer consistency with ICS Details design language.
  - Added manual/confirm-based PWA update control path in sidebar (`Check Update` / `Apply Update`) with guided modal messaging.
  - Added version-based `What's New` announcement flow and made version subtitle clickable to reopen release notes.
  - Restored startup update detection as notify-only while keeping manual apply semantics.
  - Added `elegant-sky` and `elegant-emerald` accent variants (elegant-white derivatives).
  - Tokenized Data Hub + ICS Details modal surfaces to better adhere to active theme variables.
  - Unified staged utility visuals to floating form token family (`--sheet-*`) for consistency.
  - Normalized table typography with density-aware tokens and improved inline text-size inheritance across table columns.
  - Moved collapse button away from brand row and improved collapsed-sidebar control alignment.
  - Updated topbar school identity rendering to name + ID chip treatment.
  - Advanced service worker cache version through iterative updates; latest cache baseline is `ics-v4-pwa-v114`.
  - Advanced app/UI baseline to `4.0` and schema/export baseline to `4.0.0`.
  - Added Topbar v2-first search/notification routing cleanup by deconflicting legacy hidden-topbar IDs and keeping Topbar v2 as the active runtime target.
- 2026-02-14:
  - Bumped app/UI baseline to `3.3`, schema/export baseline to `3.3.0`, and service worker cache to `ics-v3-pwa-v74`.
  - Added bottom-nav responsive pattern for mobile + tablet portrait, including center `New ICS` action and adjusted shell spacing.
  - Added global mobile/tablet horizontal-scroll behavior for dense tables.
  - Refactored Archive Details modal into ICS-style card layout (`icsd-*`) with improved responsive behavior.
  - Upgraded Notification Center with filters, bulk actions, grouping, dedupe counts, row actions, and iconized entries.
  - Improved Dashboard `Total Asset Value` overflow behavior via clipping + horizontal ticker animation.
  - Updated ICS Records table structure with dedicated status column and compact status indicators.
  - Moved depreciation display detail into tooltip-driven info action to reduce table clutter.
  - Updated app/UI version to `3.2` and schema/export baseline to `3.2.0`.
  - Added app-wide Lucide icon standardization with local vendor runtime, dynamic icon hydration, and icon click-hit alignment fixes.
  - Redesigned Data Hub modal to updated card layout (header icon block, action cards, helper/footer row).
  - Fixed Action Center `Inspection History` modal open reliability and hardened inspection modal fallback creation path.
  - Improved `Recent ICS Activity` readability in dark themes and aligned table background inheritance with widget surfaces.
  - Added desktop collapsible sidebar with persisted state and compact-icon mode.
  - Advanced service worker cache versions throughout changes up to `ics-v3-pwa-v73`.
  - Reworked ICS Details modal into a cleaner operator-focused layout and moved deep record history into a dedicated modal.
  - Simplified ICS Details actions/visibility (retained top-right close, removed non-essential controls/noise for standard users).
  - Redesigned Dashboard top-level UI into KPI + actions + compliance architecture and restored shared welcome banner consistency.
  - Added `Recent ICS Activity` and `Today's Notes` bottom sections with dynamic sync/integrity/reminder messaging.
  - Updated `Last sync` semantics to show last full backup/import history instead of plain render timestamp.
  - Applied sidebar visual facelift and updated `Action Center` nav branding (shield icon + title treatment).
  - Advanced service worker cache versions throughout changes up to `ics-v3-pwa-v62`.
- 2026-02-13:
  - Completed centralized role/access guard model (`ACCESS_RULES` + `requireAccess`) and enforced across major paths.
  - Added immutable record lineage timeline (`_lineage`) with version/hash chain and integrity verification.
  - Added persistent device ID + runtime session IDs and expanded audit attribution metadata.
  - Added lineage visibility and integrity signal in ICS Details and record status indicators.
  - Added boot-time baseline lineage migration for legacy records without `_lineage`.
  - Started modular refactor with new modules:
    - `core-storage-security.js`
    - `core-lineage-audit.js`
    - `core-data-manager.js`
    - `core-records-workflow.js`
    - `core-actions-workflow.js`
    - `core-profile-session.js`
    - `core-theme-preferences.js`
    - `core-school-setup-ui.js`
    - `core-profile-modal.js`
    - `core-shell-init.js`
    - `core-dashboard-view.js`
    - `core-dashboard-render.js`
    - `core-inventory-view-render.js`
    - `core-actions-view-render.js`
    - `core-archives-view-render.js`
    - `core-dashboard-actions.js`
    - `core-dashboard-metrics.js`
    - `core-app-bootstrap.js`
    - `core-keyboard-routing.js`
    - `core-notifications.js`
    - `core-ui-event-wiring.js`
    - `core-modal-system.js`
  - Updated service worker precache and cache version (`ics-v3-pwa-v23`) for modular JS assets.
  - Continued modular extraction with added modules:
    - `core-shared-utils.js`
    - `core-school-profile-normalization.js`
    - `core-record-normalization.js`
    - `core-records-search-details.js`
    - `core-inventory-table-render.js`
    - `core-printing.js`
    - `core-form-staging.js`
    - `core-import-autosuggest.js`
    - `core-shell-view-state.js`
    - `core-main-entry.js`
  - Completed extraction of remaining inline bootstrap/state/event wiring from `ics_v_3_standalone_index.html` into `core-main-entry.js` (no inline runtime script block remains).
  - Updated service worker precache and cache version to `ics-v3-pwa-v33`.
  - Resolved known UI issue: `Migration Details` dialog layering behind Data Manager overlays by increasing `.modal-overlay` z-index above `.actions-modal-overlay`.
- 2026-02-12:
  - Added dedicated Setup/Sign-up modal for first-time school + first personnel onboarding.
  - Added remember-device login session restore and explicit sign-out flow.
  - Added/compacted sidebar profile widget and moved primary quick sign-out there.
  - Removed top-nav duplicate identity/profile controls for cleaner header.
  - Added school identity lock (School ID in Profile), package school metadata on export, and cross-school import guardrails.
  - Added backup/restore hardening with package-level SHA-256 checksum metadata and restore verification gating before apply import.
  - Added strict import/save validation (`validateAndNormalizeICSRecord`) and schema-versioned exports (`3.1.0`).
  - Introduced Data Hub workflow split into Import Center, Validation Preview, and Export Center.
  - Added merge/replace import preview pipeline with conflict report export.
  - Added records export Year/Month filters with per-option counts.
  - Added Import Center recent activity panel from `icsAuditLogs`.
  - Added ICS row status footprints (`new`/`imported`/`updated`) with actor + timestamp tooltip.
  - Improved ICS Records readability (ICS ellipsis+tooltip, wider ICS column, wrapped Entity text).

## Resume Prompt (Copy for New Chat)
Use `PROJECT_STATUS.md` as baseline and continue from current fully modularized multi-file runtime. Current baseline includes centralized access control guards, immutable per-record lineage timeline with hash checks, device/session-attributed audits, and extracted modules (`core-storage-security.js`, `core-lineage-audit.js`, `core-data-manager.js`, `core-records-workflow.js`, `core-actions-workflow.js`, `core-profile-session.js`, `core-theme-preferences.js`, `core-school-setup-ui.js`, `core-profile-modal.js`, `core-shell-init.js`, `core-dashboard-view.js`, `core-dashboard-render.js`, `core-inventory-view-render.js`, `core-actions-view-render.js`, `core-archives-view-render.js`, `core-dashboard-actions.js`, `core-dashboard-metrics.js`, `core-app-bootstrap.js`, `core-keyboard-routing.js`, `core-notifications.js`, `core-delegated-action-routing.js`, `core-modal-scroll-shadows.js`, `core-ui-event-wiring.js`, `core-modal-system.js`, `core-shell-view-state.js`, `core-main-entry.js`). Next priority: packaging/licensing, then formal schema migration map and regression checks.
