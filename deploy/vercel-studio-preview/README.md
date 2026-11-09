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
