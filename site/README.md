# NAVIN STUDIO — Public Studio website

**Status (2026-11-08):** M1 shell, Director's Cut V3 cinematic opening, and M3 cinematic project stories merged into main. The [GitHub Pages publishing workflow](https://github.com/rayadinaveen98-ship-it/navin-studio/actions/runs/42504957343) succeeded for M3 merge commit cecb306. Independent external browser retrieval / physical-device screen-reader review are still open.

**Public URL:** https://rayadinaveen98-ship-it.github.io/navin-studio/

## Implemented

- Home, Creations, Updates/Release Desk, Studio and Journal.
- Eight public development-preview projects backed by cataloged GitHub repositories, with cinematic editorial pages, source links, related projects and shareable hash routes.
- Five-second full-viewport Director's Cut V3 welcome; Skip, Replay, fallback, reduced-motion behavior.
- Responsive navigation, filters and search, semantic project headings and consistent mobile/desktop layouts.
- A verified **no-release** public manifest: zero owner-approved APKs or demos, no fabricated versions or install counts.
- Standalone reproducible HTML build and explicit publishing allowlist; public-only content.

## Build locally

```sh
python3 site/build.py --check
python3 -m http.server 4173 --directory site
```

For changes to site sources, run `python3 site/build.py` to regenerate the checked-in `site/index.html`, then run `python3 site/tests/validate.py` and project tool tests. The real Chrome test runner at `site/tests/intro_browser_smoke.mjs` requires Node, Chromium and a local HTTP server. This is a zero-dependency static frontend.

## Security and truth policy

- `catalog_state: draft` means an editorial development preview, not a published release.
- The app cannot display an APK download unless its owner-approved release and verified asset metadata pass the explicit manifest gates. See `docs/RELEASE_POLICY.md`.
- Never publish private notes, secrets, keystores, draft binaries, owner-only analytics or M4 admin data in the public site.
- M4 will use a separate server-protected authenticated surface; **no admin UI currently exists** in this public frontend.

## What QA has and has not established

CI static validation and **17 real Chrome desktop/mobile scenarios** passed at the M3 merge. Tests include 360px/390px/768px overflow and accessible-control contracts, project route integrity, history, first-load animation and reduced motion. These do not substitute for an independent physical Android check, full assistive-technology review or hosted manual acceptance.

`robots.txt` remains in pre-launch indexing-safe configuration pending launch approval.
