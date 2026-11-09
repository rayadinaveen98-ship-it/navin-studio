# NAVIN STUDIO — product and engineering roadmap

**Updated:** 2026-11-09  
**Project:** NAVIN STUDIO itself — not the internal roadmap of any showcased application.  
**Status convention:** [x] Verified, [~] in review/in progress, [ ] pending.

## M0 — Product foundation [x]

- [x] Studio repository, product vision and development decision boundaries documented.
- [x] Candidate public catalog of eight creations, all without invented release metrics.
- [x] Public / private data boundary and owner-only publication policy established.
- [x] Cinematic editorial visual direction and responsive information architecture selected.
- [~] `NAVIN STUDIO` brand name and identity remain a working direction until formally finalized.

## M1 — Public studio site and signature opening [x]

- [x] Public home, Creations, Updates, Studio and Journal pages implemented and deployed to GitHub Pages.
- [x] Director's Cut / Living Architecture V3 five-second cinematic opening integrated into the actual homepage.
- [x] Skip, Replay, reduced-motion, mobile and real Chrome browser smoke checks passed.
- [x] Public-only build reproducibility, allowlist and no-unapproved-download tests passed.
- [ ] Final independent physical device and screen-reader accessibility review.

**Live:** https://rayadinaveen98-ship-it.github.io/navin-studio/  
**Evidence:** [PR #22](https://github.com/rayadinaveen98-ship-it/navin-studio/pull/22), [Chrome QA](https://github.com/rayadinaveen98-ship-it/navin-studio/actions/runs/42496663370), [Pages publication](https://github.com/rayadinaveen98-ship-it/navin-studio/actions/runs/42496763077).

## M2 — Studio release trust and verification [~]

- [x] Read-only GitHub release discovery, precise asset identities, SHA-256, signing and Android smoke/upgrade verification infrastructure.
- [x] Release-review tooling and public publication allowlist verified. CineRelay served solely as an engineering test case.
- [x] Real Android emulator verification of narrow local-state compatibility for a previously published CineRelay APK.
- [x] Site release manifest refuses unapproved download links.
- [ ] Owner-approved exact downloadable build, physical-device validation, authenticated feature QA and release-signing custody review.
- [ ] Public distribution of the first fully approved app, if and when all gates are satisfied.

**Important:** the studio currently has **zero owner-approved public APK downloads**. A successful emulator QA run does not authorize release.

## M3 — Premium public project experiences [~] CODE MERGED / MANUAL QA PENDING

- [x] Eight cinematic editorial project pages merged to `main` after owner visual review ([PR #23](https://github.com/rayadinaveen98-ship-it/navin-studio/pull/23)).
- [x] Shareable `#project/<id>` URLs, browser Back/Forward, related project discovery and meaningful source links.
- [x] Explicit separation between creative intentions and shipped feature claims; accurate no-approved-download disclosure.
- [x] Responsive layout, reduced-motion style and project-specific visual direction that retains the approved studio identity.
- [x] Static CI and expanded 17-scenario real Chrome desktop/mobile QA passed; screenshots reviewed.
- [x] Owner approves the reviewed project-page visuals.
- [x] M3 PR merged as commit `cecb3060c0ff3f762d005bed1ab5c0bdd197c171`; GitHub Pages [publish workflow](https://github.com/rayadinaveen98-ship-it/navin-studio/actions/runs/42504957343) succeeded.
- [ ] Independent public URL browser retrieval / physical Android / screen-reader verification remain outstanding; deployment workflow success alone does not prove those manual checks.

**Evidence:** [Merged PR #23](https://github.com/rayadinaveen98-ship-it/navin-studio/pull/23), [M3 reviewed design / QA](M3_VISUAL_QA.md), [hosted publish workflow](https://github.com/rayadinaveen98-ship-it/navin-studio/actions/runs/42504957343).

## M4 — Creator Command Center [~] OFFLINE-FIRST DEVELOPMENT

**Locked direction (2026-11-09):** [ADR-005 — offline-first / no-card decision](M4_OFFLINE_FIRST_DECISION.md). **Cloudflare setup, payment details and any hosted private-login deployment are explicitly deferred.** This is a development-order change, not a claim that the private dashboard is already live.

### M4-A — Product architecture and source inventory [x]

- [x] Define public-vs-private trust boundary, owner dashboard structure, provenance rules and release-approval gate: [M4 spec](M4_PRIVATE_COMMAND_CENTER.md).
- [x] Inventory eight real source repositories; only public metadata may enter local source previews: [source inventory](M4_SOURCE_INVENTORY.md).
- [x] Lock Director's Cut visual system as the baseline; the `NAVIN STUDIO` brand name itself is still a working direction.

### M4-B — Interactive Control Room prototype [x] / manual acceptance [~]

- [x] Five frontend screens: Overview, Projects, Release Desk, Decisions, Studio Log.
- [x] Interactive search, category filters, project details, navigation, mobile layouts; [visual review and browser QA](M4_VISUAL_REVIEW.md).
- [x] Owner accepted the direction to continue; screenshot evidence and code committed in [draft PR #24](https://github.com/rayadinaveen98-ship-it/navin-studio/pull/24).
- [ ] Final physical Android, keyboard/screen-reader and design sign-off remain a later QA gate. No fake live project numbers.

### M4-C — Read-only API and security groundwork [x] OFFLINE TESTED / ONLINE AUTH DEFERRED

- [x] Worker-specific owner-authorization architecture, public GitHub read-only adapters, verified-source/error-state rules, same-origin Control Room resources, no write/approval routes: [ADR-004](M4C_SECURITY_DECISION.md).
- [x] **56 passing Node tests**, covering API security, real loopback HTTP responses, UI contracts and staging-probe classifications; all three branch CI checks were successful before this roadmap change.
- [x] Simulated API Chromium desktop/mobile interactions and source/failure displays tested; [QA report](M4C_CONNECTED_UI_QA.md).
- [x] Real Cloudflare Access setup procedure documented only for reference: [runbook](M4C_STAGING_RUNBOOK.md).
- [ ] **Paused by decision:** no Cloudflare account connection, card entry, staging Worker, deployed identity provider or real authenticated service at this stage. Retain code, do not deploy it.

### M4-D — Source-backed LOCAL Studio Dashboard [~] D1–D5 CODE AND AUTOMATED QA / OWNER ACCEPTANCE PENDING

1. **D1 — Local runtime & source contract [x] code / [ ] owner acceptance:** Runnable Node 22+ loopback-only Control Room with two visibly separated modes (SIMULATED offline demo / PUBLIC GITHUB read-only). Eight canonical project IDs, on-demand evidence requests, source/outage status, zero approved APKs. **22/22 local Node tests passed and branch CI green; physical Windows and browser network acceptance pending.** [Implementation/QA](M4D1_LOCAL_IMPLEMENTATION_QA.md), [runnable source](../local/m4-studio-dev/README.md).
2. **D2 — Project workspaces [x] code / [ ] owner acceptance:** All eight project workspaces implemented as computer-local responsive pages with public GitHub repository metadata, up to five exact commit links, five recently updated pull requests and source timestamps. Distinct live/simulated/error/no-records states, read-only navigation, explicit build readiness unknown. **47/47 local tests passed; source and UI Chromium QA passed at 1440/768/390/320px.** Milestone editing and backups remain M4-E rather than fake D2 controls. Real Windows/network, accessibility and physical-device review pending. [D2 implementation/QA](M4D2_PROJECT_WORKSPACES_QA.md), [source](../local/m4-studio-dev/README.md).
3. **D3 — Builds & QA Observatory [x] code / [ ] owner acceptance:** Each of eight local workspaces now has an on-demand, read-only GitHub Actions observatory. Up to five canonical public workflow runs (with precise commit SHA, run link, branch, status, conclusion, observed time) and up to ten per-run canonical public jobs on selection; mismatched URLs and malformed GitHub responses rejected. Separate SIMULATED fixtures, rate-limited/no-records/error states, zero token/paid services/remote writes. **71/71 local tests and five simulated-source Chromium viewport checks passed**; mocked real-shape run→job interaction and project-switch stale-data clearing verified. Individual commit check-run details and APK binary verification remain excluded; a green run never implies signed APK, physical-device QA or owner release approval. [D3 implementation/QA](M4D3_BUILD_QA.md). Real Windows live-GitHub and physical-device/accessibility acceptance pending.
4. **D4 — Studio Home & attention board [x] code / [ ] owner acceptance:** New local `/studio-home` page in the approved Director's Cut language; linked into the Control Room and Windows launchers. Eight source-catalog shortcuts, owner-chosen up to three focus project IDs stored only in local browser storage (no private notes, sync or backup), focus filtering, and on-demand latest one public GitHub commit per repository (up to eight allowlisted requests per click) with canonical commit SHA/URL, observation timestamps, rate-limit/empty/unavailable disclosure and no background polling. Full SIMULATED demo mode remains clearly marked and never fetches GitHub. **89/89 Node tests passed from the extracted ZIP, plus real Chromium interaction/layout QA at 1440/1024/768/390/320px and a mock-public source contract review.** Actual Windows live-network and physical-device review remain pending. [D4 test evidence](M4D4_STUDIO_HOME_QA.md).
5. **D5 — Cross-screen UX and QA [x] automated / [ ] owner acceptance:** Keyboard skip links added to all local screens; focus retention when choosing priorities, project-title focus when switching workspaces, focus chooser group semantics, existing modal focus cycle. **98/98 Node tests pass (nine new D5 checks); 15/15 Chromium semantic/keyboard/interaction sweeps across three screens × 1440/1024/768/390/320px passed.** Actual source HTML/CSS/JS with simulated Node HTTP responses and Chromium AX tree inspection. **Real Windows URL loading, live GitHub in user's browser, physical Android, manual screen reader, 200% zoom/contrast and owner sign-off remain pending.** [D5 audit and limitations](M4D5_AUDIT.md).

**D acceptance:** A local-only working UI, actual traceable public GitHub data or conspicuously marked fixtures, no fake release or build completion, no hosting/payment, reviewed design evidence. Project-private data stays out of source/CI.

### M4-E — Studio Operations [~] E1–E4 CODE IMPLEMENTED / OWNER WINDOWS QA PENDING

1. **E1 — Local Data Foundation [x] code / [ ] Windows acceptance:** Real on-device note/decision-draft/plan-draft Vault, single-process revision-protected atomic JSON writes, local-only same-origin POST/PATCH/DELETE and clearly disclosed no encryption/backup/sync. **124/124 tests passed** at its checkpoint; local Windows device acceptance remains open. [E1 QA](M4E1_LOCAL_STORAGE_QA.md).
2. **E2 — Project Management [x] code / [ ] Windows acceptance:** All eight project workspaces link to local Project Operations with genuine task, milestone and decision records. Per-record status, optional target date, title/details, change history, CRUD actions, project switch and filters; existing E1 notes appear in the matching project. A distinct `project-operations.v1.json` store preserves E1 drafts unchanged. **146/146 Node tests passed from the extracted ZIP; Chromium simulated-local-API interactions passed at 1440/1024/768/390/320px.** The browser environment blocks direct localhost navigation, so normal Windows browser verification, manual screen-reader and physical-device tests remain outstanding. [E2 QA](M4E2_PROJECT_OPERATIONS_QA.md).
3. **E3 — Studio Planning [x] code / [ ] Windows acceptance:** Studio-wide date navigation, three-per-day server-enforced priorities, timed work blocks, 42-day month grid, project filters, and read-only genuine E2 task/milestone due dates with optional validated links. Separate `studio-planning.v1.json` store preserves E1/E2 files unchanged. CRUD, status toggles and revision checks operate locally with no GitHub writes or release approval. **170/170 Node tests passed from the extracted ZIP; Chromium simulated-API interactions passed at 1440/1024/768/390/320px.** Real Windows browser, network and screen-reader acceptance pending. [E3 QA](M4E3_STUDIO_PLANNING_QA.md).
4. **E4 — Manual Backup & Restore [x] code / [ ] Windows acceptance:** Loopback-only `/studio-backup` screen exports one portable *unencrypted* JSON file containing the complete E1, E2, and E3 versioned snapshots, with dataset SHA-256 integrity checks. On import, previews verified content and before/after counts without writing. Restore requires an unexpired preview ID, unchanged current source files, acknowledgement that a fresh download has been saved, and exact typed confirmation; writes an on-device pre-restore safety copy and crash-recovery journal before replacing files. Revisions advance to block stale-tab writes. Existing data endpoints remain read-only to external origins; all local HTTP data requests serialize within the process. **196/196 Node tests passed from the extracted ZIP; five responsive Chromium UI checks passed with simulated API responses**, including confirmation gating. Real Windows, physical-device and screen-reader acceptance remain pending. [E4 QA](M4E4_BACKUP_RESTORE_QA.md).

**E safeguards:** Plain local JSON is not encrypted or cloud-synced. Do not store credentials/sensitive data or claim real hosted privacy. Local task completion is not proof of CI success, signed APK, hardware QA or release approval. The existing release-review view stays read-only; no repository mutations or actual approval actions until verified authentication.

### M4-F — Testing and release hardening [ ] NEXT AFTER E4

- [ ] Regression tests for public Studio and local Control Room, mobile/desktop/keyboard/accessibility checks and physical-device review.
- [ ] Provenance validation, rate-limit/unavailable/stale-source states, restore/import/export verification, offline state consistency and rollback.
- [ ] Manual release-gate audit; no APK links until exact signed artifact, QA and owner approval are confirmed.

### M4-G — Private online hosting and authentication [ ] DEFERRED TO END

- [ ] Re-evaluate **genuinely zero-spend, card-free** hosting/auth when the finished private dashboard actually needs remote access, with fresh policy and pricing verification.
- [ ] Owner explicitly approves provider, account creation, scope and cost safeguards.
- [ ] Deploy only under a real server-side owner-auth boundary; verify unauthorized routes, previews, sessions, logout, CSRF for any future writes, and audit logs.
- [ ] No public GitHub Pages admin password, hidden route, exposed private metadata or fake security claims.

## M5 — Studio Intelligence & Integrations [ ] FUTURE

- [ ] Source-cited cross-project intelligence, with explicit opt-in to approved app integrations only.
- [ ] AI-assisted research/planning with traceable facts and human-reviewed proposed actions.
- [ ] Optional notifications and analytics only when data handling and consent are confirmed, with no invented engagement/revenue numbers.

## Working rules

- Stay on the approved studio milestone; avoid drifting into building an individual app under the studio task.
- Preserve approved art direction throughout code and screenshot QA; no unreviewed production redesigns.
- Never publish credentials, private analytics, signing materials, unreleased APKs or unapproved releases.
- Branch, test and show visual evidence before merging meaningful user-facing design changes.
- Use real CI, real browser screenshots, and owner sign-off—not progress narration—as evidence of completion.
