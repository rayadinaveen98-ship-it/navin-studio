# NAVIN STUDIO — M4-D4 Studio Home & Attention Board

**Date:** 2026-11-09. **Status:** locally implemented and tested, not published; final owner/design and physical Windows acceptance outstanding.

## Scope

- Local, read-only Studio Home at `/studio-home`, accessible from the original Control Room.
- Public catalog of eight project IDs; browser-local (low sensitivity) focus project selection up to three (localStorage with honest unsynced/no-backup disclosure).
- On-demand aggregation of **only one latest public GitHub commit per repository** (up to eight requests on each click) via `/api/activity`; source observation timestamp, canonical SHA/URL validation, partial rate-limit/empty/unavailable states and no background polling.
- Focus filter, evidence coverage panel and per-project workspace/QA shortcuts. Never infer APK signing, feature completion, priority, physical-device QA or release approval from GitHub source activity.
- Existing M4-D1/D2/D3 routes and current Director's Cut visual style retained.
- No Cloudflare, hosted admin, deployment, private notes, GitHub writes, token, paid service or cloud storage.

## Verification

- Node.js 22+ `npm run check`: **89 passed**, including all previous D1–D3 suites plus activity adapter, read-only local HTTP route and Home UI contracts.
- Chromium Playwright, exact Home HTML/CSS/JS but **simulated local API replies**: **1440, 1024, 768, 390 and 320 CSS px**, five passed; no document overflow or uncaught JS exceptions. Tested catalog count, no automatic activity fetch, 2 focus IDs stored, 8 demo activity entries, focus filter, source status, failure clearing and clearing focus.
- Additional browser test with **mocked GitHub-shaped public source responses**, not a real user network request: canonical commit links accepted, partial rate-limited repo shown distinctly, uncanonical URI triggers fail-closed clearing. Passed.
- Source adapter never accepts browser-provided arbitrary GitHub URLs. Node tests exercise malformed SHA/URL/timestamp, empty commits, rate limiting, partial outages and oversized payloads using existing bounded GitHub read helper.

## Required owner review

- Windows: extract ZIP, run `OPEN-DEMO.bat`, navigate to Studio Home, choose and clear focus, load simulated activity, switch projects, run `OPEN-PUBLIC-GITHUB.bat` and inspect genuine public commits.
- Compare real Windows Chrome/mobile screens with the supplied screenshots. Verify keyboard focus and screen-reader labels on device. Source-specific live GitHub connectivity may be rate-limited and has not been established on the user's computer.
- No merged public website changes until owner signs off; D5 is still pending.

## Local security / product boundaries

- Focus IDs are browser-only and visible to others using the same browser profile; they are not private notes or authenticated preferences.
- UI binds to `127.0.0.1` via existing server Host/Origin/CORS restrictions. Root project directory and all new routes remain GET-only and return no-store, strict CSP, frame denial.
- Demo mode is always explicitly SIMULATED, and no GitHub network requests happen in it. Green CI is not synonymous with an approved downloadable APK.
- Nothing here configures or requires Cloudflare; authenticated private online deployment remains deferred to M4-G.
