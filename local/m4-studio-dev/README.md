# NAVIN STUDIO — Local Studio Control Room (M4-E1)

**Status:** local-only application with a real, file-backed Draft Vault. No cloud account, authentication, GitHub write token, online deployment or paid service. This is **not** a private online service. Anyone with access to the same computer user account could read locally stored drafts.

## Windows quick start (Node.js 22+)

1. Extract the complete ZIP into a normal folder. Do not run the batch files inside ZIP preview mode.
2. Double-click `OPEN-LOCAL-VAULT.bat` to open `http://127.0.0.1:4173/studio-vault`. Alternatively, `OPEN-DEMO.bat` opens the existing Studio Home with a Local Vault link.
3. Create a note, decision draft or plan draft, assign it to one of eight source-catalog projects, edit/delete it, and reload the page. Changes are persisted locally. **Data is not included inside the downloaded ZIP**; restarting/updating the ZIP will not delete your local records.
4. Stop the Node server terminal when finished. To browse the other public-source views use `OPEN-PUBLIC-GITHUB.bat` with no old server still running.

Node built-ins only: **no npm install**, database subscription, API token, Cloudflare or paid hosting needed.

## Storage model and important limitations

- Windows: `%LOCALAPPDATA%\NavinStudio\ControlRoom\studio-drafts.v1.json`.
- macOS: `~/Library/Application Support/NavinStudio/ControlRoom/studio-drafts.v1.json`.
- Linux: `${XDG_DATA_HOME:-~/.local/share}/navin-studio/control-room/studio-drafts.v1.json`.
- The file is plain JSON, **not encrypted**. It is not synchronized, automatically backed up or yet exportable. **Backups/restore are M4-E4.** Do not put secrets, medical details, passwords or private credentials here.
- Windows permissions follow the user's OS account; on POSIX the app requests owner-only file (`0600`) and folder (`0700`) permissions. This is not a substitute for full-disk encryption.
- Data directory is separate from this repo, downloaded builds, public GitHub Pages output and CI artifacts. No browser localStorage for draft text.
- Writes use a single-process queue, optimistic revision check, same-origin JSON + custom header checks, input limits and an atomic temporary-file replacement. A damaged file **fails closed** instead of being silently reset.
- If the disk, profile or machine fails, **unbacked-up local drafts may be lost**. E4 will add a real export/import and restore verification workflow.
- This is not a multi-user or network-exposed system. Do **not** forward the local port to the internet or LAN, and do not treat it as private authenticated hosting.

## API contract

GET routes: `/api/local/status`, `/api/local/drafts` (contains local drafts). Writes are available **only on localhost** through:

- `POST /api/local/drafts` with `{project_id,type,title,body}`.
- `PATCH /api/local/drafts/:id` with `{title?,body?}`.
- `DELETE /api/local/drafts/:id`.

Every write requires exact loopback `Origin`, `Content-Type: application/json`, `X-Navin-Local-Write: 1`, and `If-Match: "<current-revision>"`. Revision conflicts return 409, malformed content 400/415, and a missing precondition 428. No CORS permission is granted. These checks prevent incidental cross-origin writes, but a malicious process on the same device/user account is beyond the local-preview security model.

Drafts have canonical catalog project ID, note/decision/plan type, title (max 140 chars), body (max 6000 chars), creation/update UTC timestamps and random ID. The limit is 500 drafts and 1MB of data. Other Studio endpoints, including GitHub reads, remain read-only.

## Developer commands

```sh
cd local/m4-studio-dev
npm run check
npm run dev:demo
# Ctrl+C to stop, then optionally:
npm run dev:github
```

`npm run check` runs all D1–D5 and M4-E1 tests with Node 22+ and **without any external test dependency or network access**. Actual source adapter requests in GitHub mode may be rate-limited, and CI success remains separate from release readiness.

## Current milestone sequence

M4-D1 through D5 built and reviewed in code/browser; Windows device and manual screen-reader acceptance remain separate. **M4-E1**: persisted on-device draft storage and introductory Vault UI. **Next M4-E2**: full project-linked decisions, milestone planning and notes workflows. **M4-E3**: Studio planning/calendar. **M4-E4**: backup/export/import and restore QA. Hosted private auth stays deferred to M4-G.

## M4-E2 — Project Operations (implemented)

Run `OPEN-PROJECT-OPERATIONS.bat` from the ZIP root or `start-operations.bat` from this folder. Open `http://127.0.0.1:4173/studio-operations`. Each of eight catalog projects now has a project-scoped local plan with three functioning record types: **tasks** (`backlog`, `in_progress`, `blocked`, `done`), **milestones** (`planned`, `active`, `completed`), and **decisions** (`proposed`, `accepted`, `deferred`, `rejected`). Each record has title, optional details/target date, timestamps and a bounded title/status update history. Create, edit, status-update, filter and delete actions are genuine on-device writes, never remote GitHub operations. The existing E1 draft file remains untouched and linked notes appear in E2 workspaces. Project source workspaces link to the associated local plans.

Local storage uses a separate `project-operations.v1.json` in the same user-specific application data folder as the original Vault. Its **revision is independent** of the E1 draft revision. File replacement is atomic, malformed files are not overwritten, same-origin/optimistic write preconditions are required, and the local application is loopback-only. Up to 400 records and 40 title/status history events per record are supported. Once history capacity is reached, the app refuses further edits rather than silently deleting the oldest history. Deleting an item deletes that item's recorded history as well.

**Limits:** plain unencrypted JSON, single-process mutation queue (no cross-process coordination), local user account may read all entries, no backups until E4, no multi-device sync, no online authentication. Local planning state does not imply signed APK/CI success or owner release approval. Never share this working folder's data directory or forward port 4173 onto a network.

Endpoint summary: `GET /api/local/operations` and `/api/local/projects/:id/operations`, `POST /api/local/operations`, `PATCH /api/local/operations/:id`, `DELETE /api/local/operations/:id`, plus read-only local HTML/CSS/JS. Writes require `Origin` matching local port, `X-Navin-Local-Write: 1`, JSON content type and quoted `If-Match` revision. Every other existing Studio feature continues to work without new credentials, installs or subscriptions.

E2 source/tests are in `project-operations.mjs`, `studio-operations.{html,css,js}`, and `tests/project-operations-*.test.mjs`. Run `npm run check` with Node 22+. Browser screenshots are from real Chromium rendering with simulated local API responses because direct loopback browsing is blocked in the testing environment. Physical Windows/browser and screen-reader acceptance are not claimed.

## M4-E3 — Studio Planning (implemented; owner Windows QA still pending)

Run `OPEN-STUDIO-PLANNING.bat` from the extracted ZIP, or `start-planning.bat` here. Open `http://127.0.0.1:4173/studio-planning` in your browser with the local server running. The page now provides:

- An actual date chooser, previous/next day navigation, and a 42-cell selectable monthly calendar.
- **Up to three daily priorities** across the Studio; local create, edit, mark done/planned and delete.
- **Scheduled time blocks** with project, date, start time and duration; editable, deletable and independently completable.
- An all-project/individual-project visibility filter, with daily totals and a clear source status.
- Read-only cross-project **tasks and milestones due on the selected date**, read from the existing E2 operations file. Optionally link a new plan to an E2 task/milestone in the same project. Deleting an E2 item does not silently delete planning data; its link is shown as unavailable. Completing a plan does not change E2 task status.

Storage: **`studio-planning.v1.json`**, alongside but separate from the E1 `studio-drafts.v1.json` and E2 `project-operations.v1.json` under the same per-user application-data folder. Old files are not rewritten/migrated by E3. The new planning file is plain JSON, unencrypted, unsynced, without automatic backup; E4 is responsible for export/import/verified restore. At most 500 entries, up to three priorities per day, input size checks, a revision gate, atomic file replacement and fail-closed corrupted-file handling.

API: `GET /api/local/planning`, `POST /api/local/planning`, `PATCH /api/local/planning/:id`, and `DELETE /api/local/planning/:id` (same loopback-origin JSON/custom header/revision controls as E1/E2). The new page assets are served from `/studio-planning`, `/studio-planning.css` and `/studio-planning.js`. No GitHub writes, online auth, card, Cloudflare or remote storage were added. This is local single-process use; running two server instances pointing to one data folder simultaneously is unsupported.

The E3 interface and five layout widths were checked in Chromium with **simulated API responses**; local server routes/persistence are verified by Node HTTP tests. The testing environment blocks Chromium's direct loopback navigation; the user must still verify real Windows browser persistence and device-specific assistive technology.
