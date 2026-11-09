# ADR-005 — NAVIN STUDIO offline-first development order

**Decided:** 2026-11-09  
**Owner direction:** Skip Cloudflare setup for now. Continue building Studio features without card entry, hosting setup or online login.  
**Status:** Development direction accepted; implementation of M4-D onwards still pending.

## Decision

Move Cloudflare Access, hosted private authentication, public-facing admin URLs and cloud storage out of the active development critical path. Treat the existing Cloudflare Worker + 56 offline tests in draft PR #24 as **retained security research and tested prototype code**, NOT a configured service and NOT a requirement to start M4-D.

Develop the next Studio experience locally and in CI, using **public, allowlisted repository metadata** and explicitly labeled fixture data. The existing public GitHub Pages website remains unchanged.

**User requirement:** zero spend. Do not request card details, activate paid APIs, create services or enable auto-billing. Choose an alternative card-free protected deployment option only when the finished private product actually needs hosting, with fresh verification and explicit owner approval.

## Development runtime

1. Create a local-only, no-login development preview of the M4-B Control Room, available from a computer (loopback host only). The existing UI style and interactions remain the visual baseline. This mode is visibly labeled **LOCAL DEVELOPMENT — NOT PRIVATE ONLINE ACCESS**.
2. Use real metadata only from the eight allowlisted **public** GitHub repositories. The source adapter must show evidence URL, observation time and error/freshness state. No fake progress percentage, invented builds, unknown release as approved or implied finished product.
3. Provide a fixture/demo mode for offline QA, with permanently visible **SIMULATED DATA** labeling. Never confuse it with genuine source-backed records. Anonymous GitHub rate limits and outages must result in honest unavailable states.
4. Keep notes, tasks and priority changes local to the owner's device if implemented. Data may be exported and backed up explicitly. Such drafts are **not synchronized** and are **not protected from another user of the same device** by a server login.
5. Do not put local drafts, release authorization capabilities, GitHub write tokens, personal notes or private API responses into the public website, GitHub repository, PR artifacts or hosted previews.
6. Preserve the M4-C real authentication architecture and security test suite unchanged for eventual reuse, but do not provision or deploy it now.

## Ordered roadmap

- **M4-D1 — Local development shell and source contracts:** launch, navigation, honest source states, real/evidence/fixture separation.
- **M4-D2 — Project Command Center:** per-project overview, source links, tracked milestones, related references and latest verifiable GitHub changes.
- **M4-D3 — Builds and QA Observatory:** read-only CI/PR/check status by commit/run, Android test-evidence references, status freshness and explicit unknowns.
- **M4-D4 — Studio Home and attention board:** verified activity, filtered changes, owner-selected focus, no guessed progress scores.
- **M4-D5 — Interaction and quality sign-off:** desktop/mobile screenshots, keyboard and accessibility tests, error/empty/offline behavior, approval before shipping designs.
- **M4-E — Local Studio Operations:** decisions, notes, roadmap drafts, personal prioritization and scheduled planning as local drafts. No remote writes or real approval action until a secure authorizing backend is in place.
- **M4-F — Studio QA/hardening:** responsive, accessibility, import/export, provenance and failure-mode validation. Keep releases disabled without owner-approved verified artifacts.
- **M4-G — Hosting/authentication (DEFERRED):** evaluate card-free secure provider at the end; select and approve account, identity, private server authorization and session management; run deployed security tests and physically review launch. Never publish a static client-side password as “private”.
- **M5 — Studio intelligence/integrations (FUTURE):** opt-in, provenance-backed cross-app connections and AI assistance, after actual trust and source permissions.

## Change-control and exit criteria

- [x] Lock order and zero-spend/no-card rule.
- [x] Preserve verified work and avoid creating a second competing roadmap.
- [ ] Implement M4-D1 runnable local development preview with browser tests.
- [ ] Ship each M4-D slice as real working code with the existing visual baseline and screenshots for owner approval.
- [ ] Do not claim private login, live cloud sync, real release approval or physical-device QA before independently verified.
- [ ] Defer Cloudflare and any other hosted option until explicit later request or actual deployment milestone.

## Scope note

NAVIN STUDIO is the product here; do not pivot into implementing the Backlot/Frame One/CineRelay/etc. app internals. Their repos provide verifiable read-only source evidence.
