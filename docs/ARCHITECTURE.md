# Architecture and data boundaries (ADR-001 draft)

Date: 2026-11-08

## Guiding separation
Keep the static public catalog, verified release metadata and private operations separate. Do not ship API tokens, personal roadmap notes or admin-only data to browser bundles.

## Candidate implementation
- **Public client:** React + TypeScript + Vite SPA/SSG; selected only after visual approval.
- **Content:** checked-in, validated JSON catalog for explicitly approved public projects.
- **Public release source:** GitHub Releases API for repositories with published releases. A Git tag, Actions artifact or commit is **not** a public release.
- **Release status gate:** a small explicit allowlist or publication manifest confirms which upstream releases are approved for NAVIN STUDIO. A new upstream release should not silently appear before approval.
- **Hosting:** evaluate Cloudflare Workers/static assets and Pages Free against current constraints before committing. No spending or paid storage provisioning without approval.
- **Private command center:** postponed; requires real authentication and authorization, server-side data access and an audit model.

## Read model contract (conceptual)
Each public project has:
- stable `id`, `name`, `category`, `platforms`
- `catalog_state` in `draft | published | archived`
- `release_repo` (optional; verified GitHub owner/repo)
- `published_release_tag` (null until an owner-approved release exists)
- `demo_url` (null until tested)
- `description`, imagery and accessibility metadata when approved

No project version should be invented from commit counts or build numbers.

## Release ingestion
1. Read an allowlisted public repo's GitHub published Releases through public read-only API.
2. Match the owner-approved release tag (if any); ignore drafts and unpublished builds.
3. Validate supported artifact format, accessible download link, actual file size and checksum metadata when available.
4. Show provenance, release date and download. Do not label as locally signed/QA-verified without evidence.
5. On 404, rate limit or outage, show last known approved metadata clearly marked with its last verification timestamp, or an honest unavailable state. Never fabricate fresh results.

A public site may fetch live GitHub API data, but a build-time cached snapshot and refresh policy can reduce API/rate-limit exposure. Do not put a privileged token in frontend code.

## Security
- Public repository contains only public-facing product information and code.
- No secrets, API keys, signing keys or keystores in Git or deployment output.
- Never expose GitHub private-repo metadata through a public static JSON file.
- Never give viewers links to draft APKs, unreviewed binaries or internal CI artifacts.
- Releases must have provenance/QA fields with explicit missing/unverified states.
- Later admin functions must use identity-based authorization and audit events, not obscured URLs.

## Performance
- Aggressive image optimization, responsive srcsets, lazy-load media, minimal JS.
- Respect `prefers-reduced-motion`; avoid autoplay-heavy backgrounds.
- Add real performance budgets and tests after UI direction approved.

## Decisions pending
- Visual direction, typography and exact frontend framework.
- Cloudflare Pages vs Workers hosting after live deployment feasibility checks.
- Source of release approval truth and whether releases are mirrored.
- Private admin authentication design and storage only in later phases.
