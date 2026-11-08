# M4-A — Verified source inventory and data-permission boundary

**Date:** 2026-11-08  
**Scope:** The eight public GitHub repositories referenced by NAVIN STUDIO's canonical public catalog. **This inventory is NOT a record of deployment or app-release readiness.**

## Accessible public repositories

| Studio project | Public GitHub repository | Verified visibility / default branch |
| --- | --- | --- |
| Backlot | rayadinaveen98-ship-it/framebynavin-android | public / main |
| Frame One | rayadinaveen98-ship-it/frame-one | public / main |
| CineRelay | rayadinaveen98-ship-it/cinerelay | public / main |
| Bridge | rayadinaveen98-ship-it/bridge | public / main |
| ORIGIN | rayadinaveen98-ship-it/origin-creator-journey | public / main |
| PetPing | rayadinaveen98-ship-it/reminder-pet | public / main |
| Game Project 01 | rayadinaveen98-ship-it/game-project-01 | public / main |
| FrameByNavin | rayadinaveen98-ship-it/framebynavin-web | public / main |

All eight repository identities were read from `site/data/projects.json` and subsequently checked through authenticated GitHub repository metadata on 2026-11-08. All are reported not archived.

## What is known vs. unknown

**Known:** each repository is accessible and public, and its default branch was `main` at check time. These are safe **candidate** read-only sources for public commit/PR/workflow metadata.

**Unknown:** true app completion percentage, latest device-tested build, approved release, private implementation plans, install counts, product revenue, and whether a contributor has checked a feature on a physical phone. No such metric can be inferred from a repository merely existing.

**Release truth:** the NAVIN STUDIO public release manifest currently lists zero owner-approved APK releases or demos.

## Proposed read-only connector contract

Before showing a project status:
1. Fetch the exact public repository metadata, then a selected branch commit and workflow evidence from GitHub's public read-only endpoints.
2. Preserve repository, branch, SHA, source URL, data timestamp, response status and permission scope.
3. Show "CI success" only for the exact run/commit; NEVER translate it into "app release ready."
4. On 404, 403, rate limit or network failure, return **unknown / unavailable**, or **stale** with the prior observation timestamp.
5. Rate-limit and cache responsibly; do not provision tokens or a paid service just to run the prototype.
6. Never send private project plans or owner notes to the public Static Studio.

## Permission matrix for the first M4 test

| Operation | Public visitor | Authenticated owner | Initial M4-A proof |
| --- | --- | --- | --- |
| View approved public catalog | Yes | Yes | Existing public site |
| Read public GitHub metadata | Yes | Yes | Source inventory only |
| View private roadmap/notes | No | After server authorization | Not implemented |
| View authenticated personal analytics | No | After explicit source connection | Not implemented |
| Review unpublished APK artifacts | No | After separate protected verification | Not implemented |
| Approve publishing a new APK | No | Explicit audited owner workflow only | Not implemented |
| Edit project repository | No | Separately scoped permission / confirmation | Not implemented |

## Next stage

Finalize auth and hosting security decisions in a **reviewable ADR**, then build an isolated read-only owner-dashboard preview with conspicuously labelled demo records. Do not deploy the prototype as an admin tab on the public website.
