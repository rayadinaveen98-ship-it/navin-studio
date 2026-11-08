# M4-C — Protected Control Room UI integration and Chromium QA

**Date:** 2026-11-08  
**Status:** Implemented, CI-verified and rendered in Chromium **offline using a simulated owner context**. NOT deployed; Cloudflare Access NOT configured. Draft PR #24 awaits security and owner deployment gates.

## Change

The existing M4-B Director's Cut Control Room is now bundled into the isolated Worker and served on three exact owner-protected GET paths:

- `/control-room` — HTML shell, no inline styles or scripts.
- `/control-room.css` — stylesheet.
- `/control-room.js` — interaction logic.

**Every resource** first passes the same `ctx.access.aud` and `ctx.access.getIdentity().user_uuid` owner allowlist check as the API. No Cloudflare Static Assets binding is used. Cloudflare's Workers documentation warns that the Static Assets router does not forward `ctx.access` to the user Worker, so introducing that binding here is blocked pending a redesign and new tests.

The HTML response uses a restrictive CSP with self-only CSS, JS and network connections; all routes have `Cache-Control: no-store`, frame-denial, nosniff and no Access-Control-Allow-Origin. Non-GET, unknown routes, unsupported queries and non-owner requests fail closed.

The Control Room loads `/api/me`, `/api/overview` and `/api/projects` with same-origin, no-store fetches; real public GitHub repository and CI data are fetched only after a project-specific user action. The app presents the source observation time, distinguishes no upstream runs from failures, and clears displayed source values when the owner session is denied or an API request fails. No release approvals, write operations, private notes or OAuth secrets are present.

## Reproducible evidence

- Repository: [draft M4 PR #24](https://github.com/rayadinaveen98-ship-it/navin-studio/pull/24).
- [GitHub source/security CI run](https://github.com/rayadinaveen98-ship-it/navin-studio/actions/runs/42510419061): successful on source/UI commit `8852912bf3cde97cfe52e637e1641e92495278d1`.
- [Public site validation](https://github.com/rayadinaveen98-ship-it/navin-studio/actions/runs/42510419026): successful; no edits to the published public Studio.
- [Public V3 browser regression](https://github.com/rayadinaveen98-ship-it/navin-studio/actions/runs/42510419002): successful.
- **56 Node test cases** passed; includes identity denial, asset route authorization, content-security policy, JSON contract, GitHub source allowlisting, and UI source syntax.
- Exact source bundle downloaded from the GitHub Actions artifact for the committed revision and rendered in local Playwright Chromium **with mocked `/api` responses**.
- Chromium interaction checks succeeded at 1440×900, 768×1024, 390×844 and 360×780: source load state, eight catalog items, two search matches for “frame”, source/CI evidence modal behavior, denial clearing of metrics, no horizontal overflow, and zero uncaught JavaScript errors.
- The Chrome screenshots shown to the owner are **explicitly labeled simulated API evidence**; they do not demonstrate production Cloudflare Access, real connected owner credentials or latest actual GitHub state.

## Additional offline security verification

A follow-up test suite now exercises the Worker through actual **loopback HTTP** (anonymous, non-owner, forged headers, full HTML/JS/CSS/API paths and read-only behavior), in addition to the direct unit and UI checks. An optional, explicit staging probe classifies a Cloudflare Access login redirect as a *challenge* but correctly treats HTTP 403 alone as *inconclusive*. Details and owner-only setup steps: [staging runbook](M4C_STAGING_RUNBOOK.md). These checks are not a substitute for testing an actual Cloudflare configuration.

## Remaining gates

- [x] Same-origin read-only protected UI resources and API integration code.
- [x] Negative authorization and UI-contract tests in GitHub Actions.
- [x] Offline Chrome source-data, denied, mobile and desktop interaction checks.
- [ ] Owner approves provider/account setup and confirms current zero-cost billing protections.
- [ ] Actual Cloudflare Access application protects **production, previews, routes, and alternate hostnames**.
- [ ] Worker environment correctly sets Access app audience and the owner's stable user UUID without committing them.
- [ ] Real deployed E2E: anonymous, unauthorized, expired, revoked, forged headers, redirect behavior, JS/CSS paths and source API.
- [ ] Protected browser UI testing under real HTTP CSP, with accessibility/keyboard, physical device, performance and rollback tests.
- [ ] A full review of authentication/session configuration before private notes, analytics, work queues or release approvals may be introduced.

## Important

This is **not** a live private dashboard. GitHub is not a deployment target for the protected UI. The public website remains separately hosted and unchanged. A green offline test or “Connected” status in a simulated QA screenshot must not be interpreted as cloud authentication or a production-ready release.
