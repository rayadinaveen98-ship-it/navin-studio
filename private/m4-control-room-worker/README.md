# NAVIN STUDIO — M4-C protected read-only API

**Status:** local/CI implementation only — NOT deployed, NOT a real signed-in account, NOT a completed private dashboard. This folder is isolated from the public GitHub Pages `site/` build.

## Security decision

Cloudflare Workers Free + Cloudflare Access Free are the first candidate providers. Cloudflare supports Worker-level Access protection, including preview and production URLs. When Access has authenticated a request directly invoking the Worker, `ctx.access` provides the authenticated identity. We require both the Access application AUD and an exact stable owner `user_uuid` match.

**No request header, email-domain rule, URL parameter, client-side password, localStorage item or demo-mode switch establishes identity.** No deployed test bypass or user-controlled repository fetch path exists. There are no write endpoints.

## Implemented endpoints — all owner-only GET

| Endpoint | Safe, read-only result |
| --- | --- |
| `/api/me` | Minimal owner access status; no email or identity ID returned |
| `/api/overview` | Number of public catalog projects and owner-approved public releases, plus timestamp; unknown CI stats remain null |
| `/api/projects` | Eight source-backed public catalog records |
| `/api/projects/:id/source` | Exact allowlisted public GitHub repository metadata or a stated unavailable/rate-limit result |
| `/api/projects/:id/ci` | Most recent public Actions run status, commit SHA, and canonical evidence link; never claims APK release-readiness |

Data sources are the checked-in `site/data/projects.json` and `site/data/releases.json` plus limited public GitHub API queries. Each response has a timestamp and private no-store caching; the upstream cannot be controlled by query strings. Non-GET methods return 405 after owner verification. Unknown routes return 404. Missing security configuration returns 503; no authenticated owner context returns 403.

## Run offline tests

Requires Node.js 22+; **no npm dependencies and no network access required**.

```sh
cd private/m4-control-room-worker
npm run check
```

The 25 tests simulate Access context **only inside Node** and verify negative authorization, forged headers, strict API paths, prevention of public/private data confusion, read-only methods, allowlisted GitHub fetch URLs, GitHub failures, source identity checks, evidence timestamping and truthful CI status. These tests DO NOT prove that a real Cloudflare Access app is configured.

The repository's dedicated [M4 CI workflow](../../.github/workflows/m4-private-api-checks.yml) repeats the suite on PRs without cloud credentials or deployment steps.

## Deployment gate — NOT satisfied

1. Request explicit permission to use a zero-cost Cloudflare account. Verify account-specific plan/billing terms before activating; never select paid upgrades or enable auto-billing.
2. Create a distinct private Worker, with **Worker-level** Access covering *production and previews*. Explicitly verify no bypass or alternative public hostname/route. Do not expose this API via the public Studio's GitHub Pages origin.
3. Create an Access policy permitting only the owner's verified account. Do not grant access to an entire email domain or presume a username/email means authorization.
4. Confirm real Access Audience (AUD) and stable `user_uuid` through trusted Access identity context. Configure the Worker environment bindings `ACCESS_AUD` and `OWNER_USER_UUID` after this verification. **Keep real identifiers out of the public repo.**
5. Independently test the ACTUAL deployment: anonymous, expired/revoked session, wrong Access app AUD, non-owner, copied headers, every preview route/custom domain, direct endpoint URL, CORS, responses after logout.
6. Review session policy, CSRF for any future mutations, Access cookie flags, denial logging, rate limiting, rate-limit resilience, physical-device browser acceptance, and rollback.
7. Integrate the visually reviewed M4-B Control Room UI only after the protected backend gate passes, on a protected same-origin surface. Do not publish it as a static unprotected admin route.

The example `wrangler.example.jsonc` intentionally disables `workers.dev`, omits both required values, and is **not** a deployable Wrangler configuration. There is NO production auth, actual GitHub token, private data store, APK release approval, background monitoring or deployment here.

## Cloudflare limitations to retain in review

Cloudflare documents that `ctx.access` does not propagate through Service Binding calls and can be affected by Static Assets routing. Production must use directly Access-protected Worker invocations and independently exercise those claims. GitHub public API is rate-limited; errors must remain honest rather than showing stale data as current.

## Documentation reviewed Nov 8, 2026

- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/
- https://developers.cloudflare.com/workers/platform/limits/
- https://www.cloudflare.com/en-in/sase/products/access/
