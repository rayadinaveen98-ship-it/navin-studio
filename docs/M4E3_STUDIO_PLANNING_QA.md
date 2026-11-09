# NAVIN STUDIO — M4-E3 Studio Planning: implementation & QA

**Date:** 2026-11-09  
**Delivery:** Draft PR #24 branch, local-only Windows Node 22+ application, no hosted private service.  
**Status:** Implemented and locally tested; no claim of physical Windows, device screen-reader or direct localhost Chromium acceptance.

## Scope completed

- A new Studio-wide local `/studio-planning` page built within the approved Director's Cut style; navigation from Studio Home, Project Operations, and Local Vault.
- Daily priorities with a **server-enforced three-per-calendar-day limit**; project/date/title, optional details and E2 task/milestone link; create/edit/status toggle/delete.
- Calendar time blocks with date, 24-hour start time, duration from 15 to 480 minutes, project and optional E2 linkage.
- Previous/next/today date controls, selectable Monday-first 42-day month grid, project visibility filter, daily summary and calendar markers.
- An independently loaded due-date list of genuine E2 task and milestone *local targets*. Planning and E2 task status remain independent. Disappearing E2 links show a missing-reference label.
- New `studio-planning.v1.json` only. E1/E2 files are read as separate sources and never rewritten by E3. Local revision checks, atomic file replacement, size limits, corruption refusal, and no public API write changes.
- No Cloudflare, account setup, payment, credentials, unapproved public APK links or remote repository writes.

## Test evidence

- **170/170 Node tests** passed after implementing E3. E3 tests cover persistence/restart, max 3/day, 24-hour time values, malformed input and dates, no-op and stale revisions, one-process concurrency, cross-project linked-task rejection, deletion/orphan preservation, independent E1/E2 persistence, corrupted file refusal, OS file permissions and same-origin read/write HTTP contracts.
- **Five Chromium browser layout + interaction checks** using the exact E3 HTML/CSS/JS with simulated local API responses: **1440, 1024, 768, 390 and 320 px**. Each tested create priority, create time block, linked due record, status toggle, edit, delete, calendar day navigation, 42-cell calendar, zero JavaScript exceptions and no horizontal overflow. 320px overflow found and fixed before final checks.
- Screenshots in `REVIEW/screenshots/plan-1440.png`, `plan-390.png`, `plan-320.png`; rendering is real Chromium, but API behavior is simulated in the browser QA. The Node HTTP tests separately exercise the real local server.

## Explicit limitations and later milestones

- The browser automation sandbox rejects direct `http://127.0.0.1` navigation, so complete browser+real HTTP combined QA **has not** been performed here.
- Manual Windows browser testing of storage persistence/restart and actual device/screen-reader QA remain pending. No automatic backup or restore yet, and no cross-process file lock for multiple local server instances.
- E4 owns encrypted? **No encryption is promised.** E4 will plan and verify export/import/restore, including schema and revision integrity.
- A local planning item being marked **done** does not imply an E2 task was completed, a build was successfully signed, or an APK was approved for release.
- Physical Android QA and final owner visual sign-off are separate from passing automated tests.

## Manual owner checklist

1. Close old NAVIN STUDIO server, extract the full E3 ZIP, and start `OPEN-STUDIO-PLANNING.bat`.
2. Create three priorities for today across projects. Confirm a fourth is refused.
3. Create a 30/60/90-minute work block and move it to another date.
4. Create an E2 Backlot task with a due date, then reload Planning and link it.
5. Refresh and restart: verify E1 notes, E2 tasks and E3 plan all persist separately.
6. Test keyboard Tab/Enter and narrow Windows/mobile browser at 320–390px. Report visual differences for approval.
7. Avoid deleting local JSON files; backup/export arrives in M4-E4.
