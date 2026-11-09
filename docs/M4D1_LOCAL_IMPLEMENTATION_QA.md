# M4-D1 — Local Control Room implementation / QA

**Date:** 2026-11-09  
**Status:** Runnable source and Windows launchers committed in [draft PR #24](https://github.com/rayadinaveen98-ship-it/navin-studio/pull/24). **M4-D1 developer implementation complete; user's own Windows/browser acceptance remains pending.** No Cloudflare account, card, backend deployment or private repository connection.

## Working implementation

Location: [local/m4-studio-dev](../local/m4-studio-dev/).

- No-dependency Node.js 22+ local HTTP server, bound only to `127.0.0.1`, with Host/Origin/cross-site checks, no CORS permission, no-store responses, read-only methods, and restrictive CSP.
- Uses the **same** M4-B/M4-C Control Room HTML/CSS/JS, adapted at runtime for a local **no-login** preview, without modifying the public GitHub Pages site.
- Visible, persistent mode labels: `SIMULATED DATA — NOT LIVE` (offline fixture) vs `PUBLIC GITHUB — READ ONLY` (on-demand public GitHub).
- `/api/me` returns role `local_preview`, not `owner`; no fake protected cloud session.
- Catalog projects and zero owner-approved public APK count derived from checked-in canonical Studio data.
- Only 8 allowlisted public repos can be queried via `/api/projects/:id/source` or `/api/projects/:id/ci`, with hard-coded GitHub API URL shapes; no token, private API or arbitrary proxy.
- Source identity, commit/CI run URL and observation timestamp checked. GitHub failures/ratelimits are shown as unavailable, not invented product completion.
- All project UI search, view navigation, source and CI evidence buttons work with either local fixture data or the public-read adapter.

## Verified local QA

- Node: **22/22 tests passed** locally — source/provenance, fixture isolation, source-mode labeling, loopback/Origin/Host, no write methods, read-only routes and JS syntax.
- Browser: real Chromium renders of exact local UI assets with deterministic **mocked `/api` responses** at 1440×900, 768×1024, 390×844 and 360×780. Checked eight project cards, interaction with source evidence, zero page errors, no horizontal scroll overflow; fixed a long-status-banner phone overflow before review.
- Loopback HTTP endpoints themselves were exercised by Node's built-in fetch with a real ephemeral local server; simulated API browser screenshot tests did not independently navigate to localhost because the test environment's Chromium policy returned `ERR_BLOCKED_BY_ADMINISTRATOR`. This limits browser QA claims.
- GitHub CI job [M4-D1 loopback and source truth checks](https://github.com/rayadinaveen98-ship-it/navin-studio/actions/runs/42555668426) **success** on the implementation branch. Do not interpret CI green as production Cloudflare security.
- The public Studio site and M4-C retained Worker security suite continue to run independently.

## What remains before declaring the local product fully accepted

- [ ] User extracts the delivered ZIP and runs `start-demo.bat` on their Windows machine (requires Node 22+).
- [ ] User tests `start-github.bat` with an actual public GitHub internet connection (browser environment blocks outbound GitHub in automated tests); rate limits should show a visible unavailable state.
- [ ] Owner visually reviews actual screenshots and physical-device interaction. Keyboard/screen-reader inspection still required.
- [ ] No private notes, GitHub writes, approvals, cloud hosting or account connection exist in D1; later D2/E/G gates remain.

## Next stage

**M4-D2 Project Workspaces:** extend the actual working local preview with individual project history/PR evidence, narrow release/CI records and owner-selected local draft milestones. Preserve strict provenance, the existing visual system, and demo vs live separation.
