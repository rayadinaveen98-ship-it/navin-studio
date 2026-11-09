# M4 — Private Creator Command Center: product, security and implementation brief

**Status:** Pre-production; decision and access review, not an implemented authenticated product.  
**Date:** 2026-11-08  
**Owner's approved foundation:** NAVIN STUDIO public Director's Cut visual system, eight catalog projects, verified release gates, and a dedicated PRIVATE studio operating surface.

## 1. Product promise

One source-grounded control room for the owner to understand what is real across their creative and software projects: latest verified builds, releases awaiting judgment, roadmaps, development activity, creative notes, and priorities. The public website remains a presentation platform. The private dashboard is an operations tool.

### Design constraints

- Keep the established cinematic editorial design language; turn down decorative animation during daily operations. Dense information should be scannable and calm.
- No blank or fake buttons: every live control needs a defined action, loading state, empty state, disabled state, and permission boundary.
- Project state is based on actual connected sources. Unknown is shown as **Unknown**, not an invented percentage or optimistic label.
- No unilateral changes to app repositories, releases, roadmaps, or scheduling.
- Mobile supports reviewing decisions and status; desktop prioritizes multi-project operations.

## 2. Trust boundary — non-negotiable

The private Creator Command Center cannot be placed into the public GitHub Pages bundle, hidden behind CSS, or protected by a browser-only password.

An independent protected origin or authenticated backend boundary is required before any owner data can be read.

1. **Identity:** verified login from a supported identity provider. Owner membership is explicitly allowlisted server-side (stable identity identifier, not an easily spoofed email or URL parameter).
2. **Authorization:** every private API endpoint checks the active server session AND owner permissions. A valid login is not by itself permission to access private data or approve a release.
3. **Session safety:** secure, HttpOnly, SameSite cookies, appropriate CSRF controls, expiring sessions, login state/nonce validation and logout. No access tokens in localStorage or client-visible JavaScript.
4. **Secrets:** GitHub/hosting API secrets, signing metadata, credentials and OAuth secrets only in server-managed secret stores. No production credentials in this repository, CI artifacts, previews or screenshots.
5. **Storage:** server-side only where required; least privileges, separate environments, auditability, backups and deletion before adding persistent owner notes.
6. **Fail closed:** unauthenticated/unauthorized sessions return 401/403, not a masked UI with private JSON already delivered. External source outages show a timestamped stale/unknown state without inventing status.
7. **Least privilege:** read-only GitHub access initially. Write actions cannot be enabled until a separate audited, explicit owner-approval workflow is implemented and reviewed.

## 3. Source-of-truth contract

Every status signal must display its origin and observation time. A project listing in the public Studio catalog is NOT evidence that a product has shipped.

Minimum records:

- **Project:** stable id, title, canonical source repo(s), visibility, project kind, public catalog state, allowed data sources.
- **Source snapshot:** project id, source type, canonical source URL, observed timestamp, last successful fetch timestamp, outcome (current / stale / unavailable / denied), last error class.
- **Build / CI status:** exact repository, branch, commit SHA, workflow/run/job IDs, run URL, concluded status, and observation timestamp. No fabricated completion percentages.
- **Release candidate:** immutable upstream release/asset identity, tag, asset size/checksum when verified, signing/QA evidence references, approval state, and explicit reviewer decision.
- **Decision / note:** owner-authored text, project relation, author identity, time, edit history and visibility (private/public-approved).
- **Audit event:** authenticated actor, action, target, decision, old/new state, UTC timestamp, source ref and request ID. Redact secrets.

All unknown metadata remains null/unknown; independent provenance is required for downloaded binaries. Any view composed from cached data visibly labels the freshness window.

## 4. Initial information architecture

### Owner home: The Control Room
- Daily status rail: projects needing attention, verified CI changes, release-review queue, notable unresolved issues.
- Current work: prioritized projects as owner-configured intentions, not guessed from commit recency.
- Activity feed: evidence-backed commits, PRs, checks and publicly authorized releases with links and timestamps.
- "Awaiting evidence" is a valid, honest empty state.

### Projects
- All cataloged projects plus intentionally added private projects; filters by discipline, status evidence and selected focus.
- Per-project workspace tabs: Overview / Roadmap / Builds & QA / Releases / Decisions / Notes.
- Source ownership remains with each project; editing a plan inside the dashboard must specify whether it writes to a trusted project source or stores a private draft.

### Release Desk
- Separate Candidate / QA evidence / Signing review / Owner decision / Published.
- Read-only queue first. Marking a build approved is a separate authenticated action with explicit confirmation, immutable evidence and a reversibility policy.
- "Verified" means actual verification checks are documented, not merely that an upstream asset exists.

### Studio Operations
- Decision log, verified development timeline, manually chosen focus list and future calendar integrations.
- No fabricated sales, audience, install or revenue analytics.

### Settings
- Connected sources and their scopes; access/security status; session logout; storage/data management; visual preferences; audit history.

## 5. M4 execution sequence

**M4-A — Security and data architecture (current).**
Select an auth provider and actual supported zero-spend host/backend after checking current limits; inventory repositories and minimum data scopes; write an authorization threat model and endpoint contracts. Keep this as architecture review, not active login UI.

**M4-B — Visually approved prototype.**
Create responsive desktop and mobile layouts grounded in the existing Director's Cut system and the earlier owner-approved Command Center concept. Prototype data must be conspicuously DEMO / NOT LIVE. Owner reviews REAL rendered browser captures before app implementation. Avoid embedding private user data into public repo/prototypes.

**M4-C — Authenticated read-only foundation.**
Create separate non-public staging; implement identity, server authorization, session lifecycle, access-denial tests, secrets hygiene, rate limits and read-only GitHub source adapter. Prove unauthorized requests cannot fetch any private payload. This stage cannot ship until provider/account permissions are configured and security checks pass.

**M4-D — Truthful dashboard and project workspaces.**
Build project cards, source freshness, commits, PRs, CI and roadmap provenance; handle empty/unknown/error states; owner reviews evidence for several projects.

**M4-E — Release approval and private content.**
Only after independent review: authenticated manual release approvals with signed/reviewed evidence references and audit trail; decisions/notes with persistent storage and backups. Never approve/publicize any APK silently.

**M4-F — QA and controlled owner launch.**
Cross-device functional tests (including physical Android phone), keyboard and screen-reader review, permissions audit, stale-source simulations, mobile responsiveness, performance baseline, secure deployment and rollback.

## 6. Security validation (acceptance test matrix)

- Anonymous visitor cannot fetch private project data, even by guessing API routes or JavaScript asset URLs.
- Authenticated non-owner cannot fetch any owner-only data.
- Expired/revoked owner session cannot fetch cached private responses.
- CSRF attempts and direct HTTP requests cannot perform write operations.
- Public GitHub Pages always shows only the allowlisted public catalog and approved releases.
- Source outage / 403 / 404 / rate limit is explicit and never becomes a success badge.
- No token, private note, private repository URL, or unreleased APK appears in browser bundles, response caching, public previews or CI attachments.
- Every approved release decision records who, when, what exact artifact and which evidence were reviewed.
- All permission and data mutations require discrete approvals and logged rollback paths.

## 7. Approval / implementation gates

Locked: separate public/private surfaces; no fictitious data; zero-cost-first; Director's Cut visual continuity; real device/browser quality gates.

Open decisions: identity provider, isolated hosting architecture, server data freshness policy, initial authorized GitHub repo scopes, whether owner notes need a DB immediately, and final desktop/mobile Command Center compositions.

**Do not** launch a pretend admin page with localStorage login or a secret URL. No vendor accounts, paid services, secrets, or external resources are to be provisioned without the owner's explicit authorization.

## 8. Current status and next deliverable

M3 project stories have merged to main and GitHub Pages deployment workflow reported success on merge commit cecb3060c0ff3f762d005bed1ab5c0bdd197c171. Independent remote browser retrieval and owner physical-device testing remain unconfirmed.

Next M4 deliverable: a provider-neutral threat model + data-source inventory, then actual browser screenshots of a read-only Command Center design concept for the owner's visual approval.
