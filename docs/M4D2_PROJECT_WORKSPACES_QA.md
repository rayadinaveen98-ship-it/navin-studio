# M4-D2 — Local project workspaces implementation & QA

**Date:** 2026-11-09  
**Status:** **Implemented on draft PR #24; GitHub CI verified.** Real user Windows browser, native device and live network acceptance remain pending. No cloud deployment.

## User-visible change

A new **Project Workspace** link is added to each project's existing modal in the M4-D1 Control Room. Each of the eight approved catalog IDs has a direct loopback-only view at `/workspace/:id`:

- Backlot `backlot`; Frame One `frame-one`; CineRelay `cinerelay`; Bridge `bridge`;
- ORIGIN `origin`; PetPing `petping`; Game Project 01 `game-01`; FrameByNavin `framebynavin`.

Each workspace contains a responsive project navigator, the public catalog description, repository provenance and availability, **five most recent returned commits**, **five recently updated returned PRs**, source metadata, status freshness, per-section error states, and a milestone notice explaining that editable drafts arrive in M4-E. The source UI uses the approved dark Director's Cut / coral-violet visual language, not a separate redesign.

### Source contract

- The `--github` mode calls **only** the three fixed allowlisted GitHub API endpoints per project: repository metadata, `commits?per_page=5`, and `pulls?state=all&sort=updated&direction=desc&per_page=5`.
- No input can set an arbitrary repository or URL. Commit links must match the exact repository + 40-character commit SHA; PR links must match the exact repository + integer PR number. Untrusted titles are HTML-escaped, URL shapes validated, max response size bounded, with 5-second timeouts.
- `--demo` requests **zero** GitHub resources. Its example commits and PRs are permanently marked **SIMULATED**, have no real SHA/PR number/links, and must not be mistaken for the repository's history.
- Data states are independent per section: `current`, `no_records`, `rate_limited_or_denied`, `unavailable`, `simulated`. No record is converted into a fictitious build-ready indicator. A failed refresh clears previous displayed values instead of presenting them as current.
- Milestone note UI clearly states **not connected**; no local note persistence or roadmap writes exist in D2.
- Public GitHub source records are a partial view, not a project-progress percentage, product completeness assessment, complete issue/PR inventory or release certification.
- The checked-in Studio public release manifest has **zero** owner-approved APKs.

## Local-only routes

- `GET /workspace/:id`: project HTML shell; unknown IDs return 404.
- `GET /workspace.js` and `GET /workspace.css`: same-origin source resources, with no external runtime dependencies.
- `GET /api/projects/:id/workspace`: `ok`, `mode`, `observed_at`, `project`, `repository`, `commits`, `pull_requests`, `milestones`, `release_ready:null`.

The server still binds `127.0.0.1` and validates exact Host, Origin and cross-site fetch restrictions, rejects mutations, emits no CORS authorization and sets no-store, CSP and frame-denial headers. It does **not** have secure hosted login and is not safe as a public private-data portal.

## Tests and validation

- **47/47** Node tests passed locally. D2 tests cover eight catalog IDs, exact GitHub fetch targets, identity mismatches, invalid/malicious canonical URLs, partial rate-limit errors, invalid/oversized/transport responses, no records vs unavailable, HTML/CSS/JS syntax, cross-site Host and Origin rejection, POST denial, unknown project routes and UI/fixture contracts. Existing D1 tests also remain green.
- GitHub Actions [M4-D1/D2 local workspace tests](https://github.com/rayadinaveen98-ship-it/navin-studio/actions/workflows/m4-local-control-room.yml) repeats `npm run check` without cloud credentials or deployment.
- Actual Chromium rendered the source HTML, CSS and JS at **1440×900, 768×1024, 390×844, and 320×720**. No page-overflow or JavaScript exceptions. Eight source workspaces switched successfully. Public-response-shaped QA fixtures verified exact SHA/PR links and escaped malicious markup. Failed refresh cleared stale evidence.
- Chromium environment policy **blocks navigation to localhost**. Rendering harness used `page.set_content()` with original HTML/CSS/JS and mocked API responses, adapting only two browser location/history lines for the test origin. This does **not** replace direct deployed/local-origin CSP or real Windows acceptance.
- The matching Backlot public GitHub REST paths and response structure were checked through the connected GitHub source. The app's own public-network request from the owner's Windows machine is **not** yet verified.
- No real mobile-device/screen reader tests or release signing checks were made.

## Windows usage

Extract the **complete** review package, then run `OPEN-DEMO.bat` (simulated, fully offline) or `OPEN-PUBLIC-GITHUB.bat` (public read-only queries), and select Projects → Backlot/Frame One/etc. → **Open project workspace**. Or navigate locally to `http://127.0.0.1:4173/workspace/backlot`. Node 22+ required; no npm install.

## Acceptance and next step

- [x] Eight responsive source workspaces implemented; D1 modal navigation works.
- [x] Public GitHub canonical source adapters + conspicuous simulated demo mode.
- [x] Source/error/refresh states and XSS/link protections unit tested.
- [x] Browser responsive layout and interaction review at four widths.
- [ ] Owner tests ZIP on real Windows and approves visuals; physical Android, keyboard/screen-reader verification outstanding.
- [ ] D3 builds/QA observatory with precise workflow/commit/status evidence. No APK release approval without independent binary and device QA.
- [ ] D4 attention board, D5 final review; later M4-E editable local drafts. Hosting/auth stays M4-G deferred.

**Do not merge any unreviewed visual changes to the public Studio.** This work remains in a draft feature branch.
