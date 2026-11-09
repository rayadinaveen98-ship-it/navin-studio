# NAVIN STUDIO — Vercel Protected Read-only Web Preview (M4-G V1)

**Separate deployment root from the existing GitHub Pages site and the Windows Control Room.**

- **What is included:** Director’s Cut Studio Home, eight public GitHub project workspaces, commits/PRs, GitHub Actions run/job evidence. Exact source links and observed timestamps; no automated release-ready conclusions.
- **NOT INCLUDED:** Local Vault, E1–E4 notes/tasks/decisions/planning/backup, APK artifacts, signing, owner actions, GitHub writes, persistent storage, authentication credentials or private APIs.
- **Security:** Before ANY deployment, create a separate Vercel project with **no initial deployment**, then enable `ssoProtection.deploymentType = "all"` and verify the setting. Vercel Authentication provides only deployment-level access, not application-level proof of owner identity. Never switch on writes relying solely on this login.
- **Web deployment root:** `deploy/vercel-studio-preview` (in the full repository). Node 22, no npm dependencies. Static HTML/CSS/JS with six GET-only Node functions in `api/`.
- **Read-only:** All other HTTP methods fail with 405 and unknown project IDs fail with 404. Upstream sources are fixed to eight public GitHub repositories and use bounded responses with exact URL validation.
- **Privacy:** A public Git repository necessarily contains the preview source. It does not contain private user notes or auth secrets. Focus preferences store only project IDs in the browser.
- **Cost:** Use Vercel Hobby solely for personal, non-commercial testing within the free plan; no paid feature/card required. Hosted write access requires a separate, approved durable database, server-side authorization and a migration plan.
- **Limitations:** Vercel Functions are stateless; local JSON stores must not be copied. Live public GitHub API requests can be rate limited.

Run `npm test` locally (Node 22+). Do not deploy until access is set to All Deployments and verified, including anonymous API/asset requests and alternate URLs.

## New Cloud Storage Foundation (2026-11-09)

The `/studio-cloud` page is an **owner-onboarding preview**, not a finished cloud-sync release. A dedicated Neon **Free** project was provisioned for Studio. It is separate from all other Neon projects. The schema in `sql/001_owner_scoped_documents.sql` has been applied and audited; the SQL is a fresh-project migration, not idempotent for repeated execution.

Vercel project protection currently reads **Vercel Authentication → All Deployments**. That protects the pages; the database uses a separate Neon Auth identity and PostgreSQL RLS.

### Cloud API

- `GET /api/cloud-config`: public-to-protected-frontend configuration only, never a database credential.
- `GET /api/cloud-docs?kind=drafts|operations|planning`: requires a valid Neon Auth Bearer JWT. Data API verifies the token, and RLS requires an explicitly approved owner ID. No owner is approved yet.
- `PUT /api/cloud-docs?kind=...`: **locked by default** (`STUDIO_CLOUD_WRITES_ENABLED=false`). When deliberately enabled after owner approval and tests, accepts strict JSON `{kind,revision,body}`. Revision `0` inserts a new dataset; positive revision is CAS-updated against the exact old revision. All ownership is sourced from `auth.user_id()` **inside the database**, not from a user-input field or unsigned decoded JWT.
- No GET/PUT/POST endpoints accept arbitrary repo paths, SQL, other dataset kinds or GitHub write instructions.

### Hosting environment (never commit values containing bearer tokens or Postgres passwords)

The following values are *service URLs / controls*, not secrets, but configure them through Vercel Project Settings rather than hardcoding them in browser source:

- `NEON_AUTH_BASE_URL`: Neon managed auth HTTPS base URL.
- `NEON_DATA_API_URL`: Neon Data API HTTPS base URL (`/rest/v1`).
- `STUDIO_CLOUD_WRITES_ENABLED=false` until owner sign-in and RLS end-to-end verification.

No `DATABASE_URL` is necessary for the cloud-doc proxy. Do not add privileged Neon DB credentials to browser code, Vercel previews, GitHub Actions or client environment variables.

### Sign-in and permissions

The private `/studio-cloud` screen loads the Neon Auth SDK locally bundled at build time, and offers Google sign-in. The user is **not automatically an approved owner**: a known verified Neon Auth user ID must be added to `public.studio_owners` through an audited, separate owner confirmation before any private read/edit capability. For security, do **not** put the auth user's email or a login token in the allowlist without verifying their identity. Until approval, attempts fail closed.

Importantly, the existing E1–E4 local JSON stores are **still authoritative**. Nothing uploads or synchronizes automatically. The current cloud UI only downloads owner-authorized cloud copies; full on-device E4 export import, user-facing editing, conflict and rollback flows need separate integration and real acceptance tests before turning on writes.

### Test locally (no cloud required)

`npm run check` runs API, security and source truth tests without installing anything. `npm run build` requires the pinned `@neondatabase/auth@0.7.0-beta` and `esbuild@0.28.2` packages from the npm registry, and generates local bundled assets into `dist/` for Vercel; CI should verify a fresh clean build before publishing.
