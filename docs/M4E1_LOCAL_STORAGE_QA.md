# NAVIN STUDIO — M4-E1 Local Data Foundation & Vault

**Date:** November 9, 2026
**Status:** local source and browser-UI QA completed, owner Windows/physical-device acceptance pending. No cloud setup or paid services.

## Built

- Local-only Node 22 runtime; existing Director's Cut Studio Home now links to the new `/studio-vault` screen.
- Persistent file-backed JSON data model in the current OS user-data directory, **outside repo and release archive**.
- Strictly linked to one of eight cataloged project IDs; note, decision draft and plan draft categories; title/body input limits.
- Functional local create/edit/delete actions in the Vault screen; no inert Save buttons.
- Revision-based optimistic concurrency (409 stale revision), fail-closed corrupt-file handling, serialized in-process writes, atomic temp-file + rename and OS file permissions (POSIX 0600; Windows user-level protections).
- Dedicated local write API with exact loopback Host, exact Origin, custom X-Navin-Local-Write request header, application/json, If-Match revision, no CORS, and no GitHub/server/cloud writes.
- Clear **not encrypted, not synced, not backed up** disclosure. Do not store private secrets. E4 will add explicit backup and restore.

## Tests

- Existing D1–D5 + new E1 Node suite: **124/124 passed** from local development source.
- New cases cover persistence across reopened store, concurrency conflicts, update/delete, input/schema limits, corrupt file, symlink, file modes, HTTP forbidden cross-site writes, accidental mutations of existing GitHub/read-only APIs, safe client DOM writes and CSP compatibility.
- Exact HTML, CSS and JavaScript rendered with Chromium `page.set_content()` across **1440, 1024, 768, 390, 320 CSS px**, all with one main landmark, zero JS exceptions and no horizontal overflow.
- Playwright Chromium simulated E1 API flow: create → edit → delete passed at **1440px and 390px**. Screenshots are in `REVIEW/screenshots/` and `REVIEW/NAVIN-STUDIO-M4-E1-Visual-Review.png`.
- **Runtime limitation:** Chromium in this environment blocks direct `127.0.0.1` navigation with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. The server and persistence were separately exercised by real Node loopback HTTP tests; browser screenshots use mocked API responses. This is NOT physical Windows/Android testing or production browser certification.

## Pending owner verification

- Extract ZIP and launch `OPEN-LOCAL-VAULT.bat` on Windows with Node 22+.
- Save a draft, reload, close/reopen server and verify record persists.
- Open two tabs and confirm conflicting writes produce safe reload messaging.
- Confirm normal Windows user-data permissions and available disk space.
- Keyboard navigation, screen reader, user account isolation and manual accessibility review.
- M4-E2: full project operations; M4-E3: planning/calendar; M4-E4: export/import/restore QA.

**Caution:** storing records locally is not synonymous with encryption or automatic backup. There is no online login; never expose the loopback port to the network or publish private records on GitHub Pages.
