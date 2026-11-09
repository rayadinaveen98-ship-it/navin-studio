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

### M4-D — Source-backed LOCAL Studio Dashboard [ ] NEXT ACTIVE MILESTONE

1. **D1 — Local runtime & source contract:** Runnable computer-local Control Room (loopback), separate LIVE PUBLIC SOURCE vs SIMULATED fixtures, refresh/error/empty/offline states, no credentials or unprotected online private URL.
2. **D2 — Project workspaces:** Eight genuinely mapped projects, individual overview, repository links, verifiable commits/PRs, owner-selected milestone drafts, clear “not observed” for missing facts.
3. **D3 — Builds & QA Observatory:** Per-repository Actions/check/run history with exact commit and run URLs, evidence timestamps, no automatic interpretation of CI success as APK readiness. Android evidence only when sourced/verified.
4. **D4 — Home & attention board:** Real source-backed recent activity, filtering, actionable evidence links, owner-chosen “today's focus,” clean information hierarchy.
5. **D5 — Product QA and visual review:** Real desktop/mobile Chromium screens, search/navigation, source failures, keyboard and accessibility checks; owner visual review before production changes.

**D acceptance:** A local-only working UI, actual traceable public GitHub data or conspicuously marked fixtures, no fake release or build completion, no hosting/payment, reviewed design evidence. Project-private data stays out of source/CI.

### M4-E — Studio Operations, local drafts [ ] AFTER D

- [ ] Local-only decision log, project notes, roadmap drafts, focus priorities and planning calendar; clear unsynced state plus deliberate export/import/backup design.
- [ ] Workflows have true save/edit/delete behavior **on the local machine** with explicit data-loss and same-device access warnings; not fake buttons.
- [ ] Source-backed release *review* queue may be read-only. Real approval, remote writes, signing changes and cross-app actions remain disabled until authenticated hosted security is verified.
- [ ] Cross-link local draft plans to project IDs without silently rewriting the source project repositories.

### M4-F — Testing and release hardening [ ] AFTER E

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
