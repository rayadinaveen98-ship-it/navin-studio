# NAVIN STUDIO

**Working name:** NAVIN STUDIO — *One universe. Many creations.*

An independent creative-and-technology studio platform for original **apps, games, films, stories, and interactive experiences**. Its public website will showcase approved projects and releases; its future private command center will provide a source-backed view of development progress.

> **Project status — Foundation / pre-production (2026-11-08).**
> This repository is not a deployed website. Branding and visual design are not approved yet. Do not present prototype data or example versions as real releases.

## Product principles

1. **Real, never invented.** APK versions, download links, completion percentages, analytics and development statuses must have a verifiable source.
2. **Public and private are separate.** Public users only see published content. Private roadmaps, notes, credentials and unreleased build artifacts must never leak into client-side assets or the public project registry.
3. **Release-gated.** No binary is labeled “verified” unless its source, signing identity, checks, download URL and owner approval have been recorded.
4. **Design approval first.** High-fidelity desktop and mobile designs are reviewed before production UI development.
5. **Performance and accessibility are features.** Responsive layouts, reduced-motion support, keyboard navigation, readable contrast, and fast loading are part of the acceptance criteria.
6. **Low-cost first.** Use free tooling where feasible; check limits and restrictions before provisioning infrastructure.
7. **Cross-project continuity.** Changes to this site do not alter other app repositories automatically.

## Planned visitor areas

- **Home:** featured creations and studio identity
- **Explore:** apps, games, filmmaking, stories and education
- **Project:** approved previews, features, media and development history
- **Releases:** published versions, factual changelogs, verified links and checksums
- **Experiences:** playable web demos and interactive storytelling
- **Journal:** public studio announcements

## Planned owner-only areas (later phase)

Roadmap, project milestones, build verification, release approval, QA checks, analytics and a source-grounded studio assistant. No public frontend-only login is acceptable for confidential data.

## Initial architecture direction

- Responsive TypeScript frontend (React + Vite is a candidate; final stack recorded before implementation)
- Structured project catalog and release metadata
- Read-only release ingestion from permitted public GitHub repositories
- Owner-approved publish gate before displaying a new release
- Hosting evaluated against current free-plan limits and security requirements
- No database or authentication until the first real use case requires it

## Documentation

- [Product brief](docs/PRODUCT.md)
- [Architecture and data boundaries](docs/ARCHITECTURE.md)
- [Release verification and publishing policy](docs/RELEASE_POLICY.md)
- [Roadmap and acceptance criteria](docs/ROADMAP.md)
- [Project catalog candidates](data/projects.json)

## Current milestone

**M0 — Foundation:** define product boundaries, verify source repository, document release policy, prepare visual concepts, and obtain design approval.

No APK files, tokens, private notes, or invented analytics should be committed to this public repository.
