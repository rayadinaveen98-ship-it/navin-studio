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
