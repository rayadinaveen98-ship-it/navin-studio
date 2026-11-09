# NAVIN STUDIO — M4-D4 Local Studio Home, Projects & Builds/QA

**Status:** runnable, offline-first developer preview. **Not** a deployed private dashboard; no login, writes, or cloud authentication. This directory is separate from the public Studio `site/` build and the deferred Cloudflare Worker.

## Run on Windows (no cost)

1. Install **Node.js 22 or later** from https://nodejs.org/ if not already installed. No packages or subscriptions are needed.
2. Extract the complete M4-D4 review ZIP to a normal folder (do not run files directly from inside the ZIP).
3. Double-click `start-demo.bat` for unmistakably labeled **SIMULATED DATA**, or `start-github.bat` for real **public GitHub API** evidence on demand. The script opens the new Studio Home at `http://127.0.0.1:4173/studio-home` in your default browser. The original Control Room remains available at `/`.
4. To stop, close the opened local Node server terminal window. Nothing is deployed online.

Alternatively, from the GitHub checkout:

```powershell
cd local\m4-studio-dev
npm run dev:demo
# or, in a new terminal, after stopping the demo:
npm run dev:github
```

**Port in use?** In a PowerShell terminal, set `$env:NAVIN_LOCAL_PORT="4174"`, run the chosen npm script, and open `http://127.0.0.1:4174/`. The `.bat` files use the default 4173 port.

## Honest source modes

- `dev:demo` (**default**): runs entirely offline with illustrative samples. Every view includes a **SIMULATED DATA — LOCAL DEMO ONLY** banner. It never makes a GitHub request, and never presents an invented CI run, build or release as genuine.
- `dev:github`: same local interface, clearly marked **PUBLIC GITHUB DATA — LOCAL ONLY**. Project identities and approved public release count come from the checked-in site catalog; clicking **Source status** or **Latest CI evidence** fetches only that project's allowlisted public GitHub REST metadata. Each result has the observation timestamp and exact canonical link or an explicit unavailable/rate-limited state. GitHub may rate-limit unauthenticated requests, and this mode cannot access private repo data.

Neither mode stores tokens or private notes and neither can write to GitHub or approve APKs. **M4-D4 stores only the selected focus project IDs in this browser's localStorage** under `navin-studio-local-focus-v1` (max three IDs). This is not encrypted, not backed up or synced, and other people using the same browser profile could see those selections; do not treat it as private cloud storage. A green GitHub Actions run does **not** mean an APK is signed, tested or owner-approved. The public release manifest currently has zero approved downloads.

## Studio Home & Attention Board — M4-D4

Open `http://127.0.0.1:4173/studio-home` directly, or click **Studio Home** in the original Control Room. The new screen retains Director's Cut visual art direction and provides:

- Eight project shortcuts backed by the same checked-in public catalog.
- **Today's focus:** choose/remove/clear up to three project IDs. These are **your own selections**, never inferred from commits, and stored only in the same local browser profile. The selections are available again when you reopen the same local URL/port and browser profile, but they are not backed up or synchronized.
- **Recent activity:** on-demand read-only `GET /api/activity` fetches the **latest one public commit from each of eight allowlisted repos** (up to eight GitHub requests **per click**). No background polling, authentication token, cross-repo writes, or private repository access. Successful evidence must include an exact canonical GitHub commit URL, SHA, and author timestamp. The client displays linked records in descending timestamp order, plus source coverage and explicit `no_records`, `rate_limited_or_denied`, `unavailable` states. A failed refresh discards the previous evidence display rather than claiming old results are new.
- **Focus filter** shows only latest commit evidence for the selected project IDs. Empty states are not treated as project inactivity.
- **SIMULATED mode** never requests GitHub, never shows fabricated SHA or external commit links, and remains visibly labeled.
- **Approved public APKs** are calculated only from the existing release manifest; success in CI never implies APK release approval.

**This is not yet a private owner-authenticated online service.** Do not enter project secrets, credentials, private notes, or sensitive plans here. Full decisions/notes/backups belong to later M4-E; online authentication stays deferred to M4-G. If GitHub public API limits are reached, wait rather than repeatedly pressing Refresh.

## Build & QA Observatory — M4-D3

Open **Projects → Open project workspace → Build & QA** and click **Load workflow evidence**. In PUBLIC GITHUB mode, the workspace requests up to five recent public GitHub Actions workflow runs, with canonical run URLs, commit SHAs, branch, status, conclusion and observation time. Each source-backed run offers **Inspect jobs** to request up to ten canonical public job records. Only the exact checked-in repository is contacted and the service does not download build artifacts or logs.

**OPEN-DEMO.bat** is entirely offline, displays **SIMULATED** results and has no real workflow/job links. **OPEN-PUBLIC-GITHUB.bat** makes read-only unauthenticated public requests only when you click. GitHub may rate-limit requests; the app displays unavailable/rate-limited and does not present old results as fresh.

**A passing GitHub Actions workflow is NOT proof of a signed APK, Android physical-device test or release approval.** These remain unverified. There is no direct release-download control or remote write operation.

## Controls and routes

This app binds **only to `127.0.0.1`**, checks Host/Origin and denies browser cross-site fetches. It has strict no-cache/CSP/frame denial headers, no CORS permissions, no sign-in surface, no cookies, no authentication secrets and no online admin route. Anyone using your computer account while this app is running could view its **public-only** content; do not add private notes to it yet.

New read-only Home endpoint: `/api/activity` (bounded latest one commit per each of eight allowlisted public repositories, manually requested only). New HTML/JS/CSS: `/studio-home`, `/studio-home.js`, `/studio-home.css`. Existing read-only QA endpoints: `/api/projects/:id/quality` (last five public GitHub Actions runs) and `/api/projects/:id/quality/runs/:runId/jobs` (last ten public jobs for a bounded run ID). Existing routes: `/`, `/control-room`, `/control-room.js`, `/control-room.css`, `/api/me` (returns `local_preview`, not `owner`), `/api/overview`, `/api/projects`, and `/api/projects/:id/{source,ci}` for the fixed eight public project IDs. Unknown routes are 404; query strings 400; write methods 405.

The local UI is generated from the existing M4-B/M4-C visual bundle in `private/m4-control-room-worker/src/control-room-bundle.js`, rather than reimplementing a different design. Keep the `site/data` and `private/m4-control-room-worker/src/control-room-bundle.js` files in the extracted directory as supplied.

## Tests and limitations

```sh
npm run check
```

Runs only Node's built-in test runner; no `npm install`, lockfile, cloud calls or paid API. Real-HTTP server and adapter tests use fake upstream responses. Browser screenshots were rendered in Chromium with actual UI JavaScript and simulated API data; the Chrome policy in our remote test environment blocks direct local HTTP navigation, so **a physical Windows/Android device and full local live-HTTP browser acceptance test remain pending**.

### Next milestone

M4-D5: end-to-end product QA, keyboard/accessibility and owner-approved design review. Local notes, editable milestones and backup/restore remain M4-E; online hosting stays deferred to M4-G.
