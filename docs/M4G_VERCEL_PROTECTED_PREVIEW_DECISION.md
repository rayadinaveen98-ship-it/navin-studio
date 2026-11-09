# ADR-006 — Vercel-first protected web preview (no card)

**Decision date:** 2026-11-09
**Status:** Preferred deployment direction, NOT deployed. Supersedes Cloudflare Access as the first-hosting candidate.
**Scope:** NAVIN STUDIO private Control Room. Keep existing public GitHub Pages site unchanged.

## Verified environment

- Existing connected Vercel workspace: `navin7`, Hobby plan. No new Vercel signup is needed.
- Vercel Hobby offers Git integration, hosted static apps and Node.js Functions within free usage limits; Hobby cannot be used for commercial deployments. See https://vercel.com/docs/plans/hobby and https://vercel.com/docs/limits/fair-use-guidelines .
- On 2026-09-09 Vercel announced that **All Deployments** protection with Vercel Authentication became free on every plan (including Hobby): https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan . Older Vercel deployment protection docs may still say Pro is required.
- Vercel Functions' filesystem is read-only, except ephemeral `/tmp`: https://vercel.com/docs/functions/runtimes . The current E1/E2/E3 on-disk JSON writes and E4 recovery journal **cannot safely run as persistent hosted data**. A redeploy or function recycle can discard writes.
- Existing local server protects only loopback requests; never expose its local POST/PATCH/DELETE implementation directly as an Internet API.

## Safe implementation order

1. **V1 — Vercel-compatible read-only preview:** Build a separate deployable frontend and serverless read-only API adapter sourced only from the public allowlisted catalog/GitHub metadata; do not publish E1–E4 private data, fake release approvals or token-bearing routes. CI and local browser tests before linking project.
2. **V2 — Provision protected project:** Confirm Vercel project `navin-studio-private-preview` belongs to the existing Hobby workspace, turn on **Vercel Authentication → All Deployments** before any usable preview route; avoid making a first public URL. Verify anonymous GET, API, assets, alternate preview and production URLs actually deny access. Prefer isolated project over moving existing public Pages site.
3. **V3 — Hosted data architecture:** Select a genuinely free/card-free durable provider (or defer writes), redesign data storage and user permissions, migrate only deliberately approved data with working backups and rollback; test authentication and server-side owner restrictions before enabling API writes. No user data upload without explicit authorization.
4. **V4 — Launch gate:** User reviews screenshots and real protected preview, verifies imports, access boundaries and recovery, and approves any production domain and commercial-use licensing. Keep local E1–E4 authoritative until a complete transition is proven.

## Boundaries

- No payment card, paid subscription, trial with automatic billing or hidden overage.
- Hobby is for personal non-commercial projects only. If NAVIN STUDIO becomes a public commercial showcase or operates commercially, choose an eligible deployment arrangement before publication.
- Vercel Authentication is an access gate, not a persistence database nor a substitute for app-level authorization on any future write API.
- Do not turn on auto-deployment from the draft repo branch before the project is protected. A private repo or obscure preview URL by itself is not access control.
- Never misrepresent the local app as an already online private web app.
