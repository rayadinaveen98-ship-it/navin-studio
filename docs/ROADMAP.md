# Roadmap — NAVIN STUDIO

Updated: 2026-11-08  
Legend: [x] completed, [~] in progress, [ ] not started.

## M0 — Foundation
- [x] Public GitHub repository located and verified.
- [x] README and working product brief established.
- [x] Document public/private boundaries and release gate.
- [x] Register candidate projects with draft / no-public-release defaults.
- [x] Review high-fidelity screen directions — web, mobile and command center prototypes accepted on 2026-11-08.
- [~] Design direction and responsive information architecture approved; working brand name remains provisional.

**Exit gate:** Owner approves realistic desktop/mobile visuals; data and publication policy reviewed.

## M1 — Public shell
- [x] Implement initial approved responsive public web shell, Home/Creations/Updates/Studio/Journal and project detail dialogs (draft PR #5).
- [~] Accessible skip link, motion preferences and empty states implemented; full screen-reader audit and performance profiling outstanding.
- [~] Catalog-backed public development previews validated; all software-release links remain unapproved/absent.
- [~] Local screenshots and interaction smoke tests at 1440px, 390px and 360px passed; deployed-browser and physical-device QA outstanding.

**Exit gate:** Works locally with complete state coverage; no placeholder downloads or fake metrics.

## M2 — Verified release center
- [ ] GitHub Releases read-model for approved projects.
- [ ] Actual tag/asset mapping, checked download links, changelog and hash display.
- [ ] Stable/beta segmentation and manual approval mechanism.
- [ ] No-release, 404, rate-limit and stale-cache behavior tests.

**Exit gate:** Owner checks an actual APK download on a device and approves displayed metadata.

## M3 — Experiences and launch
- [ ] Host/launch first real working web demo (only with working artifact).
- [ ] Journal and studio update timeline.
- [ ] Security, mobile performance, SEO, accessibility and launch checklist.
- [ ] Deploy public site to an approved free-tier host; verify real URL.

## M4 — Private command center
- [ ] Design admin auth and storage; zero public-data leakage.
- [ ] Source-backed project status, QA evidence and release approval.
- [ ] Transparent analytics with source/timestamp labels.

## M5 — Studio intelligence
- [ ] Scoped assistant with source citations and no fake project state.
- [ ] Approved cross-app integrations and optional update subscriptions.

## Scope control
M0/M1 do not grow to include login, AI chat, editable roadmap, e-commerce or paid APIs. Changes require a new product decision note and re-evaluation of delivery risk.

## Current review checkpoint — 2026-11-08

- Approved experience prototypes: public web, mobile-native visual direction, and private Creator Command Center visual direction.
- **First code milestone:** public website M1 on draft PR #5 (`feature/public-web-m1`). It is **not merged and not deployed**.
- **QA:** checked-in standalone build reproducibility verified; local responsive interaction checks passed. Browser network navigation limits mean hosted-site testing still needs completion.
- **Release safety:** 8 candidate project previews; 0 approved public APKs; 0 downloads advertised.
- **Next engineering gates:** merge only after review, stage on an approved free host, test direct navigation and accessibility, then implement M2 verified release ingestion with owner approval.
