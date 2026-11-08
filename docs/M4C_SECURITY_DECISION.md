# ADR-004 — M4-C protected owner API architecture

**Date:** 2026-11-08  
**State:** Proposed, source-verified and locally implemented; account deployment/owner identity not configured.

## Decision

Keep the NAVIN STUDIO public presentation on GitHub Pages. Implement its private Creator Command Center as a **distinct Cloudflare Access–protected Worker**. Use Cloudflare's Access `ctx.access` (directly authenticated Worker invocations) with an additional exact allowlist of the owner user UUID and the expected Access app audience. Never trust browser-supplied identity fields or expose private data through the public `site/` bundle.

## Why now?

The M4-B standalone Control Room prototype has passed browser interaction/layout tests and is pending visual sign-off. M4-C needs a real server authorization boundary before any private functionality or GitHub integration, even if the first read endpoints only use already-public data.

## Current free-first provider evidence

1. Workers Free supports up to 100,000 requests/day and documented CPU/subrequest limits (Cloudflare Workers Limits, checked 2026-11-08).
2. Cloudflare Access has a $0 small-team tier and supports worker-level policies covering production **and preview URLs** (Access official documentation).
3. `ctx.access` is present after successful Worker-level authentication and supports `getIdentity()`; the identity includes a stable user UUID. It does **not** automatically propagate through Service Bindings or some Static Assets routing paths. This architecture deliberately uses a Worker-only API first.

These are public service offerings, not a guarantee the user's account has a particular entitlement, Cloudflare login, domain or cost configuration. No provider has been provisioned.

## Implemented M4-C proof

- Dedicated source folder under `private/m4-control-room-worker/`, outside GitHub Pages.
- Owner-checked `/control-room`, `/control-room.js` and `/control-room.css` resources; **no Static Assets binding** to bypass identity context.
- Read-only UI loads authenticated same-origin API responses with timestamps; browser QA is simulated and not evidence of live Access configuration.
- Explicit allowlisted eight public projects imported from the authoritative site catalog.
- Server-side default-deny authorization and exact owner/AUD check for **every request**.
- 5 read-only endpoints: `me`, `overview`, `projects`, per-project repository metadata and latest public CI run.
- Fixed upstream GitHub REST URL only; no arbitrary repository input, redirects or caller tokens forwarded.
- Time-limited reads, error classes, cache-control no-store, no cross-origin data sharing, no fake readiness or private analytics.
- No real identity values/secrets, DB, login, release approvals or deployable Worker configuration.
- Offline tests for negative authorization, response restrictions, GitHub evidence, and source failure states. Dedicated automated PR validation.

## Risks and open work

| Risk | Mitigation / gate |
| --- | --- |
| Wrong Access policy/alternative unprotected URL | Require worker-level Access on all routes/previews and test against real external URLs |
| Unauthorized identity despite login | Exact server-side allowlisted stable owner UUID and matching application AUD |
| Accidental static admin exposure | Separate Worker folder, no integration with the published `site/` asset allowlist |
| Rate-limited public GitHub API | Explicit rate-limit state, later source-aware caching with freshness evidence |
| Cross-origin request / CSRF | No CORS and no write APIs now; origin, anti-CSRF and audit gates before future writes |
| Fake product progress | CI results always scoped to precise run/commit, never translated to approved APK status |
| More users or paid resources | Reconfirm current quotas/account settings before provisioning; reject auto-upgrade |
| Missing real JWT/protected-origin QA | Do not deploy or call production-secure until actual Access and negative-route checks pass |

## Acceptance before M4-C becomes deployment-ready

- [x] Public provider feasibility researched with official documentation.
- [x] Read-only authenticated-by-context API and ownership checks implemented.
- [x] 38 offline unit/security/UI contract tests pass.
- [x] Dedicated CI checks configured.
- [ ] Owner approves account/provider and configures Access app protected for previews and production.
- [ ] Real Access identity and audience configured without committing identity identifiers.
- [ ] Negative-path tests against real deployed endpoints and alternate hostnames.
- [ ] Owner-reviewed physical-device login and logout tests, accessibility and API audit.
- [x] Frontend integrated into owner-checked Worker sources and rendered with simulated API responses in Chromium; [QA](M4C_CONNECTED_UI_QA.md).
- [ ] Independent real Cloudflare Access protected-origin frontend integration and authorization tests.

**No deployment / money / credentials / login has been authorized by this ADR.**
