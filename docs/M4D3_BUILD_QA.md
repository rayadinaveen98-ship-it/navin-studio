# M4-D3 — Builds and QA Observatory

**Implementation:** 2026-11-09. **Scope:** NAVIN STUDIO's local-only Control Room, separate from public GitHub Pages and hosted Cloudflare Access. No private account, remote writes, or publication.

## Implemented

- Read-only, on-demand public GitHub Actions run feed: up to five returned workflow runs for one of the **eight allowlisted** project repositories.
- Provenance for every accepted run: exact canonical GitHub run and commit link, full SHA, job/run identifiers, branch, event, status, conclusion, created/updated timestamps, observation time.
- On-demand per-run job details: up to ten public GitHub Actions jobs with exact canonical job URLs, statuses, conclusions and timestamps. No logs, artifact binaries or credentials retrieved.
- Independent fixtures: SIMULATED mode makes zero GitHub requests and contains no fake GitHub run/commit/job links. PUBLIC GITHUB mode labels external results as live public requests, or unavailable/rate-limited on failure.
- New Director's Cut **Build & QA** interface in the project workspaces: run history, on-demand job inspection, summary counters, empty/denied/unavailable states, deliberate Refresh action. Switching projects clears previous run/job results and rejects late stale responses.
- Every workflow/job payload sets `release_ready: null` and Android physical-device/signature verification `null`. Green CI, artifact ready, APK signed, physical-device QA and owner release approval are separate facts.
- No GitHub token, paid service, cloud provider, download authority or private data storage required.

## QA and limitations

- `npm run check` in `local/m4-studio-dev`: **71/71 tests passing** in local Node v22. Includes 24 additional source, HTTP and UI tests for D3. (The precise count is verified from the runtime output.)
- Public GitHub response shapes for workflow runs and jobs were cross-checked with Backlot's actual repository through its connected GitHub integration. Not a guarantee of unthrottled public access on the owner's Windows laptop.
- Chromium source-driven browser checks passed with clearly **SIMULATED** responses at 1440, 1024, 768, 390 and 320 CSS pixels: exact eight project navigator entries, quality loading, demo run list, no fake job button, zero horizontal page overflow, no uncaught JS errors, and previous project results cleared when changing to Frame One. Direct navigation to localhost was blocked in the test browser, so the tests injected the exact HTML/CSS/JS and fixture responses without using a hosted URL.
- End-to-end physical Windows and Android tests, screen readers, live local GitHub API rate-limit conditions, and owner visual sign-off remain pending.

## Excluded until future milestone

- M4-D4 Studio Home and attention board.
- M4-E editable roadmap/notes/focus drafts, with deliberate local persistence and export.
- M4-F hardened QA and owner release gate.
- M4-G card-free private hosting/identity only if later required.

**Never merge into the public GitHub Pages admin surface or advertise as private online authentication.**
