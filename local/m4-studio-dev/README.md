# NAVIN STUDIO — M4-D2 Local Control Room & Project Workspaces

**Status:** runnable, offline-first developer preview. **Not** a deployed private dashboard; no login, writes, or cloud authentication. This directory is separate from the public Studio `site/` build and the deferred Cloudflare Worker.

## Run on Windows (no cost)

1. Install **Node.js 22 or later** from https://nodejs.org/ if not already installed. No packages or subscriptions are needed.
2. Extract the complete M4-D2 review ZIP to a normal folder (do not run files directly from inside the ZIP).
3. Double-click `start-demo.bat` for unmistakably labeled **SIMULATED DATA**, or `start-github.bat` for real **public GitHub API** evidence on demand. The script opens `http://127.0.0.1:4173/` in your default browser.
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

Neither mode stores tokens, notes or user data, and neither can write to GitHub or approve APKs. A green GitHub Actions run does **not** mean an APK is signed, tested or owner-approved. The public release manifest currently has zero approved downloads.

## Controls and routes

This app binds **only to `127.0.0.1`**, checks Host/Origin and denies browser cross-site fetches. It has strict no-cache/CSP/frame denial headers, no CORS permissions, no sign-in surface, no cookies, no authentication secrets and no online admin route. Anyone using your computer account while this app is running could view its **public-only** content; do not add private notes to it yet.

Read-only routes: `/`, `/control-room`, `/control-room.js`, `/control-room.css`, `/api/me` (returns `local_preview`, not `owner`), `/api/overview`, `/api/projects`, and `/api/projects/:id/{source,ci}` for the fixed eight public project IDs. Unknown routes are 404; query strings 400; write methods 405.

The local UI is generated from the existing M4-B/M4-C visual bundle in `private/m4-control-room-worker/src/control-room-bundle.js`, rather than reimplementing a different design. Keep the `site/data` and `private/m4-control-room-worker/src/control-room-bundle.js` files in the extracted directory as supplied.

## Tests and limitations

```sh
npm run check
```

Runs only Node's built-in test runner; no `npm install`, lockfile, cloud calls or paid API. Real-HTTP server and adapter tests use fake upstream responses. Browser screenshots were rendered in Chromium with actual UI JavaScript and simulated API data; the Chrome policy in our remote test environment blocks direct local HTTP navigation, so **a physical Windows/Android device and full local live-HTTP browser acceptance test remain pending**.

### Next milestone

M4-D2: per-project workspaces with factual source histories and explicit, owner-selected local drafts. No private storage or write operations until an explicit data model and local security/privacy expectations are approved. Cloud hosting and real owner authentication stay deferred to M4-G.
