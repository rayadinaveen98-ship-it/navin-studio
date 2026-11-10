# NAVIN STUDIO V4.3 — Premium public Project Worlds

**2026-11-10** · **Status:** stacked draft review, owner visual/physical-device approval pending. This is a public website upgrade, **not** a private Control Room or public APK release.

## Product scope

- Preserves A+C V4.2 public Home on the unmerged review branch and upgrades only `#project/<catalog-id>` routes.
- Eight first-class world links from the *existing* public catalog, each indicating the current route. Source-bound project names, categories, copy, visual concept references, and public GitHub repository links are unchanged.
- Refined responsive project hero, visual depth and pointer-controlled art movement (fine pointer + no-reduced-motion only), legible concept-art disclaimer, and an accessible creative-direction interaction based on M3's **existing three authored focus areas**.
- Three creative focus cards upgraded to genuine accessible tabs with Arrow Left/Right/Up/Down, Home/End keys, explicit `aria-selected`, active `tabindex`, and a text panel with editorial content; not simulated product functionality.
- Next-world navigator uses the existing public route and remains compatible with browser history, mobile navigation, search, sharing and the Update/Release Desk.
- Existing project descriptions, long-form stories, availability disclaimers, repositories, and related-project cards remain intact. No authenticated features, fake release stats, videos, APKs, demo promises or third-party trackers.

## Implementation boundaries

- New modular `site/v4/worlds.css` and `site/v4/worlds.js` are injected **after** the M3 project runtime via `site/v4/integrate.py`. All style selectors are scoped to `#view-project`.
- Existing authored source data in `site/data/projects.json` and `site/data/releases.json` is not changed.
- The integration is additive: legacy `renderProjectExperience(project)` runs first, then V4.3 enhances the rendered result. Project route identity and deep-link resolution are still controlled by the original site.
- The existing static build output is still generated deterministically with Python standard library; added dedicated contract tests run with Python built-in `unittest`.
- Existing concept illustrations have legacy baked-in text; a visual overlay makes these less prominent. Actual product screenshots will be introduced only after approved assets exist.

## Verified local checks

- `node --check site/v4/worlds.js`: passed.
- `python -m unittest discover -s site/tests -p 'v43_worlds.py'`: 7/7 passed.
- Playwright Chromium tested the exact assembled page with a local JSON-response shim (sandbox blocks direct `file://` and localhost browser navigation): **6 viewports passed** at 1440, 1280, 1024, 768, 390 and 320px.
- Tested selecting all three creative lenses by click and keyboard, world rail switching, next-world navigation, existing Creations and Updates routes, eight direct project route identities and honest no-release disclosures.
- No browser JavaScript exceptions or horizontal overflow in the passing checks; full-page screenshots inspected and legacy halo/mobile concept-lettering visual defects corrected.

## Outstanding gates

- Re-run public-source build `python3 site/build.py --check`, public release verification, and legacy 17-scenario Chrome workflow in GitHub CI on the exact V4.3 commit.
- Verify real GitHub Pages or protected review staging navigation, viewport and touch performance. Physical Android/iPhone, keyboard-only screen-reader review not certified by simulated browser tests.
- Obtain owner visual approval before merging V4.3 (or parent V4.2 PR) to public `main`; preserve `0` studio-approved downloads.
- Do not deploy the unfinished V4 branch or edit Cloudflare/Vercel private Control Room as part of this change.
