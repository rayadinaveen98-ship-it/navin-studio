# M4-E4 — Manual Backup & Restore: implementation and QA

**Date:** 2026-11-09  
**Scope:** Local-only NAVIN STUDIO Control Room on the existing draft M4 branch. Cloudflare and any remote owner-auth deployment remain deferred. **No cloud storage, no payment, no online private login, no GitHub writes.**

## Working functionality

- **One-file manual export:** `GET /api/local/backup/export` downloads a JSON archive containing the original versioned snapshots from three local datasets: E1 `studio-drafts.v1.json`, E2 `project-operations.v1.json`, E3 `studio-planning.v1.json`. Counts displayed on `/studio-backup`. Each dataset has a SHA-256 checksum over canonical JSON; the archive is not encrypted, signed, or authenticated.
- **Preview:** choose a `.json` file in the UI; the browser sends the payload to a **loopback-only** server using an origin-checked custom-header JSON POST. The server rejects unknown schema versions, missing/extra fields, checksum failures, oversized or malformed datasets and invalid project record shapes. Preview displays current and imported record counts. No data changes during preview.
- **Deliberate restore:** requires the server-issued short-lived preview ID, current-data unchanged since preview (file content SHA-256 *and* existence), a user acknowledgement of having an independently saved current backup, and exact typed confirmation `REPLACE LOCAL DATA`. The server does not rely on client-side acknowledgement alone: it also verifies the ID and confirmation. Restore replaces all three local datasets rather than merging them.
- **Safer replacement:** before updating any dataset, the server writes `pre-restore-safety-copy.v1.json` in the OS user-data directory and journals original snapshots in a separate pending folder. It atomically replaces each local data file, then marks the journal committed. If a write fails, the journal rolls back originals. If the process ends mid-restore, the next local API request replays recovery. A completed journal is cleaned up without rolling back the new state. If recovery metadata is damaged, local data access fails closed rather than creating an empty replacement.
- **Revision safety:** restored snapshots receive an incremented revision based on the greater of the current and imported revision, so stale open tabs cannot overwrite a restored file using old `If-Match` revisions. Local HTTP reads and writes are serialized within this server process during backup/restore.
- **Scope boundary:** no GitHub tokens, public source caches, APKs, binary releases, browser-local `Studio Home` focus selections, or private online authentication in backup contents. No automatic upload/scheduling/sync.

## Testing performed

- Node built-in tests: **196/196 passed** from source. E4 adds 26 tests: three-dataset round trip, saved E2 record history and E3 links, checksum and schema tamper detection, stale preview rejection, expired/reused previews, rollback after injected failure, interrupted-restore journal recovery, symlink/corruption failures, direct HTTP same-origin write defenses, full HTTP restore, and UI contract/accessibility checks.
- Real Node loopback HTTP contract tests and local filesystem tests: **passed** (E4 tests plus the original E1–E3 suites). On-disk actual data is validated, not fabricated in HTTP tests.
- Actual Chromium-rendered responsive UI: **1440 / 1024 / 768 / 390 / 320px**, no horizontal overflow or JS errors in those scenarios; simulated API responses were used **for the Chromium client interaction test only**. Preview, checkbox and typed-confirmation gating, and simulated restore-response interaction passed. Screenshot fixtures are test records, not the user's personal data.
- **Environment limitation:** Chromium navigation directly to `127.0.0.1` is blocked by browser policy in the test environment. Therefore this is not a claimed end-to-end Chromium-to-localhost test, nor physical Windows/Android or screen-reader acceptance.

## Known limitations and required owner QA

- Backup files and the pre-restore safety copy are **plaintext and unencrypted**. Avoid sensitive secrets, and keep exports private. Checksums detect accidental changes; they **do not prove who made a backup** or prevent deliberate modification with recomputed checksums.
- The safety copy is the *most recent* pre-restore state; another restore will overwrite it. Download a separate backup before restoring. This system does not offer automatic backup or cloud sync.
- Two separate server **processes** sharing the same data directory are not supported as an atomic cross-process writing model. Run one server at a time. Other processes under the same OS user may read or alter local files.
- Unexpected loss of filesystem durability (power failure, disk damage) cannot be ruled out by software; restoration depends on intact journal, directory and disk. A fail-closed state may require manual recovery from a trusted exported copy.
- Browser settings and focus-project IDs stored in localStorage are not included; neither are source repos, binaries, or online services.
- Pending: owner Windows launch, export file download in Edge/Chrome, back up actual E1–E3 content, import preview, inspect counts, confirm restore, check records after restart, physical-device/accessibility review.

## UI entry points

- `OPEN-STUDIO-BACKUP.bat` in the review ZIP.
- `http://127.0.0.1:4173/studio-backup` while local server is running.
- Navigation in Studio Home, Local Vault, Project Operations and Studio Planning.

**Release status:** Feature code and tests ready for owner Windows acceptance; not deployed/merged to the public website. E4 completion does not mean the private hosting milestone M4-G is complete. Next active milestone is M4-F final comprehensive quality and release hardening.
