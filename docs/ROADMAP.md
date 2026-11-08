# NAVIN STUDIO — product and engineering roadmap

**Updated:** 2026-11-08  
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

## M4 — Private Creator Command Center [~] M4-C SECURE BACKEND FOUNDATION

- [~] Prepare trusted auth/backend/storage decision before exposing any control interface; [security and product brief](M4_PRIVATE_COMMAND_CENTER.md) drafted.
- [x] Verify eight cataloged GitHub public repositories and establish [M4 public source inventory and permission contract](M4_SOURCE_INVENTORY.md).
- [ ] Source-backed project status dashboard with real timestamps, QA links and audit history.
- [ ] Owner-authorized release review/approval workflow; strict separation from public presentation.
- [ ] Studio calendar / decisions / roadmap editing only after authenticated storage and permissions are genuinely available.
- [x] M4-B standalone interactive desktop/mobile Control Room prototype committed on the draft branch (not public website, not authenticated). [Design brief, browser QA and review gate](M4_VISUAL_REVIEW.md).
- [x] M4-B visual direction accepted for further development after actual desktop/mobile browser screenshot review; final physical-device/screen-reader acceptance still pending.
- [x] M4-C zero-cost-first [protected API architecture](M4C_SECURITY_DECISION.md) researched against Cloudflare documentation.
- [x] Dedicated read-only Worker API scaffold with exact Access app audience + stable owner UUID checks, public catalog read-model, narrow public GitHub source/CI endpoints and no write operations.
- [x] 27 offline negative-auth/source integrity tests and dedicated GitHub PR CI; no production credentials or deployment.
- [ ] Configure real Cloudflare Access protected staging on a separately authorized owner account and test every production/preview route and session edge case (account setup requires approval).
- [ ] Connect M4-B UI to secured API only after actual authorization checks pass; no fake live KPI data.
- [~] Chromium design review passes at 1440/768/390/360/320px; owner visual sign-off, file-open, screen-reader and physical-device QA remain pending.
- [ ] Desktop/mobile design approval and realistic operational testing.

**Hard boundary:** a public static page with a client-side password or hidden route **is not** an acceptable owner-only command center.

## M5 — Studio intelligence and cross-project orchestration [ ]

- [ ] Verified, explicitly approved integrations with Backlot, Frame One, CineRelay and future apps.
- [ ] Source-cited studio assistant; no invented build state, metrics, release versions or task completion.
- [ ] Optional notifications, analytics and update subscriptions only with a consent and data-handling design.

## Working rules

- Stay on the approved studio milestone; avoid drifting into building an individual app under the studio task.
- Preserve approved art direction throughout code and screenshot QA; no unreviewed production redesigns.
- Never publish credentials, private analytics, signing materials, unreleased APKs or unapproved releases.
- Branch, test and show visual evidence before merging meaningful user-facing design changes.
- Use real CI, real browser screenshots, and owner sign-off—not progress narration—as evidence of completion.
