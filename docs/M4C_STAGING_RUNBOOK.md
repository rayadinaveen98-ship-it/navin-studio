# M4-C — Protected staging deployment runbook and sign-off gate

**Prepared:** 2026-11-09  
**State:** Ready for owner-led setup review. **NO CLOUD ACCOUNT CONFIGURED, NO WORKER DEPLOYED, NO REAL ACCESS LOGIN VERIFIED.**

## Existing verified implementation

- Owner-checked Worker serves `/control-room`, `/control-room.js`, `/control-room.css` and five read-only API route patterns. Every request requires an Access context with matching application AUD and exact owner `user_uuid`.
- No request can approve an APK or change a project repository.
- Local Node contract tests, loopback HTTP tests, and simulated API browser checks are complete. The public GitHub Pages website is unchanged.
- All existing release entries remain unapproved in the public manifest.

## Prerequisites — before any Cloudflare resource is created

1. **Owner explicitly approves** using a Cloudflare account and agrees to inspect the current Free plan terms and billing safeguards. Do not assume an account or create one autonomously.
2. Determine whether the intended Cloudflare account contains other Workers. **Do not turn on an account-wide Access policy on a shared account without reviewing its impact on public Workers.**
3. Confirm Cloudflare Zero Trust is available on the account and establish one named owner sign-in identity. Do not use open email-domain-wide Access for an owner-only dashboard.
4. Do not place any Cloudflare token, personal email, Access AUD or stable owner UUID in source control, public frontend assets, uploaded QA artifacts or chat screenshots.
5. The exact Worker account, hostname, account billing mode and preview hostname(s) must be known before deployment. Verify alternate routes and higher-priority hostname/path policies cannot bypass Worker Access.

## Safe initial rollout

### Dedicated account with no existing public Workers

1. In Cloudflare dashboard, choose **Workers & Pages → Protect all Workers → Enable Access → All traffic**, using an owner-restricted Access policy. This protects existing/future Workers and previews on that account by default. Confirm **All traffic**, not *Previews only*. Do not proceed if applying it would disrupt an existing public Worker.
2. Deploy only a minimal **deny-everything placeholder** (HTTP 503, no source bundles or private data) while setting up the Worker name/route. This is safer than deploying a working private dashboard before Access is verified.
3. On the specific Worker, open **Access → Protect this Worker behind Access → All traffic**. Restrict the policy to the owner account; verify account-level policies still apply correctly and no higher-priority hostname/path application allows a bypass.
4. Confirm expected challenge/denial on every production/preview/alternate public URL before uploading actual private UI code.

### Shared Cloudflare account that already has public Workers

Do **not** enable all-Workers protection by default. Instead create a temporary inert placeholder Worker that returns only 503, then enable **Worker-level Access → All traffic** on that particular Worker and validate all its routes before ever promoting the private code. Confirm that all known hostnames and previews are covered and no route-level policy overrides protection.

### Enable the real read-only code only after initial protection

1. Owner verifies the actual Access Application Audience (AUD) and stable `user_uuid` through Cloudflare's trusted identity flow.
2. Configure Worker runtime variables `ACCESS_AUD` and `OWNER_USER_UUID` privately in Cloudflare; do **not** commit them. No GitHub Personal Access Token is required for the initial public read-only GitHub API adapter.
3. Promote the reviewed Worker code from M4 PR #24 to the protected staging Worker with no Static Assets binding or Cloudflare Vite generated assets. Cloudflare docs explicitly warn that the Static Assets router does not forward `ctx.access` into the user Worker.
4. Block automatic route/domain creation outside the reviewed Access coverage. If credentials/identity values are absent, the Worker must fail closed with 503; unauthorized identity must fail with 403.

## Independent staging tests

### Anonymous URL security scan

With **no account cookies or credentials**, run:

```sh
cd private/m4-control-room-worker
node scripts/probe-anonymous-access.mjs https://YOUR-PROTECTED-STAGING-ORIGIN
```

This checks the UI HTML, JS, CSS, overview API and projects API routes. It flags HTTP 200 on any private route as an **EXPOSURE**. A Cloudflare Access login redirect is classified as an **ACCESS_CHALLENGE**. **401/403 responses alone are INCONCLUSIVE**: the Worker itself can deny access even if the upstream Access policy is missing. This probe is only one layer of verification; it is not a security certificate.

### Manual browser/identity tests (must use real Cloudflare setup)

| Situation | Expected |
| --- | --- |
| Fresh incognito browser without login | Access challenge or explicit denial; no private HTML/JS/CSS/API body |
| Wrong authenticated identity | Access denial or Worker 403; no owner data |
| Correct identity + correct AUD | Control Room loads, reads actual project catalog and source-labelled GitHub metadata |
| Correct identity through wrong Access app AUD | Worker 403 |
| Logout / session expiry / identity revoked | Requests denied; UI clears formerly fetched status values |
| Request to alternate hostname / custom domain / preview | Same owner protection; no public 200 |
| Forged `Cf-Access-Jwt-Assertion` without valid Access context | Rejected; headers alone cannot authenticate |
| `POST`, `PUT`, `DELETE`, `OPTIONS` | No mutation; Worker returns 405 only for authenticated owner |
| GitHub public API 403, 404, 429, malformed JSON or outage | Honest unavailable / rate-limited status; never synthetic build readiness |
| Hosted browser with CSP and assets | No inline script/style CSP violation, no leaked token or cross-origin API fetch |
| Real Android phone and desktop keyboard/screen reader | Layout, navigation, focus, touch targets and sign-in/out usable |

## Stop conditions

- Any unauthenticated response returns the Control Room HTML, JS, CSS or owner JSON payload.
- Any hostname or preview bypasses the selected Access policy.
- A paid plan, credit card authorization, deployment upgrade or usage-based billing is unexpectedly required.
- An Access user ID, private repository credential, private note or release artifact would be exposed in Git/CI/public files.
- A simulated local test is being mistaken for a real Cloudflare login check.

**Do not promote**, merge into the public website, enable private data syncing, or enable release approval actions until every required staging test is independently verified and the owner explicitly approves launch.

## Sources reviewed

- [Cloudflare Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) (Nov 2, 2026): dedicated Worker and account-wide Access policies, all-traffic coverage, `ctx.access` behavior and limitations.
- [Cloudflare Workers local testing](https://developers.cloudflare.com/workers/testing/) (Oct 18, 2026): local simulations are not production access validation.
- [Worker Static Assets routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/) (Oct 12, 2026): asset router does not pass `ctx.access`.
