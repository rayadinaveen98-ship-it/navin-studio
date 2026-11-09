# NAVIN STUDIO — M4-D1 Local Control Room

**Status:** runnable, offline-first developer preview. **Not** a deployed private dashboard; no login, writes, or cloud authentication. This folder is separate from the public Studio `site/` build and the deferred Cloudflare Worker.

## Run on Windows (no cost)

1. Install **Node.js 22 or later** from https://nodejs.org/ if not already installed. No packages or subscriptions are needed.
2. Extract the complete M4-D1 review ZIP to a normal folder, or clone this repository including `site/data` and `private/m4-control-room-worker/src/control-room-bundle.js`.
3. Double-click `start-demo.bat` for visibly marked **SIMULATED DATA**, or `start-github.bat` for real **public GitHub API** evidence on demand. The script opens `http://127.0.0.1:4173/`.
4. Close the opened local Node server terminal window to stop. Nothing is deployed online.

From a repository checkout, you can instead run:

```powershell
cd local\m4-studio-dev
npm run dev:demo
# Stop with Ctrl+C, then optionally:
npm run dev:github
```

**Port occupied?** In PowerShell set `$env:NAVIN_LOCAL_PORT="4174"`, run the chosen npm script, and open `http://127.0.0.1:4174/`. The batch launchers assume port 4173.

## Source modes

- `dev:demo` (**default**): fully offline illustrated samples. **SIMULATED DATA — NOT LIVE** always appears in the visible banner. Never issues GitHub requests or presents a fictional CI run as verified.
- `dev:github`: same local interface marked **PUBLIC GITHUB — READ ONLY**. Project identities and approved release count come from the checked-in Studio catalog. Clicking **Source status** or **Latest CI evidence** requests narrow public GitHub REST metadata for only that allowlisted project, with a source observation time and a real canonical URL or an explicit unavailable/rate-limited state. GitHub may rate-limit unauthenticated requests.

Both modes have **zero** paid services, credentials, login, private data storage, cross-repo writes, APK approvals and fake completion percentages. The release manifest currently has zero owner-approved public APKs.

## Local security boundary

The HTTP server binds **only** to `127.0.0.1`, validates Host and Origin, rejects browser cross-site fetches, and sets no-store/CSP/frame-denial headers. It never grants network-wide access or CORS permissions. Anyone using the same computer account may view its public-only content; do not place private notes in this preview.

Supported GET paths: `/`, `/control-room`, `/control-room.js`, `/control-room.css`, `/api/me` (explicit `local_preview` role), `/api/overview`, `/api/projects`, and `/api/projects/:id/{source,ci}` for eight known public project IDs. Other paths are 404, query strings 400 and writes 405.

The local UI is derived from the *existing* Director's Cut M4-B/M4-C visual bundle rather than reimplementing a different app. It is not the future secure hosted owner login. The original Worker access checks and public GitHub Pages output are unchanged.

## Tests and limitations

```sh
npm run check
```

Runs Node's built-in test runner with no `npm install`, package downloads, cloud service or paid API. Tests cover loopback HTTP, source allowlists, demo-vs-public labeling, rate limits and outage states, and local visual asset syntax. Chromium desktop/mobile screenshots were rendered with actual UI JavaScript and simulated API responses. The test environment's Chrome policy blocks direct localhost navigation, so physical Windows/Android browser acceptance and real public GitHub API responses **on the user's machine** remain to be verified.

**Next:** M4-D2 per-project workspaces with verifiable GitHub histories, exact evidence timestamps, and explicitly labeled local drafts. Cloud hosting and real owner login stay deferred to M4-G.
