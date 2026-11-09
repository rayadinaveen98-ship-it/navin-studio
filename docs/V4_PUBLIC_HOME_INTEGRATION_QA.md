# NAVIN STUDIO V4.2 — A+C public Home integration review

**Owner-approved design:** V4.2 A+C hybrid (Living Architecture × Universe Atlas). **Change scope:** only the public Home route, not the private Control Room. **Review status:** local implementation and simulated-environment browser QA; *not merged or published*. No new downloadable app or verified release.

## Integration architecture

- `site/build.py` preserves the original `template.html`, `src/app.js`, `src/styles.css`, `src/project_experience.js` and `src/project_experience.css` build, then calls `site/v4/integrate.py` to replace only the compiled `view-home` region.
- `site/v4/home.html`, `home.css` and `home.js` are separate editable public-only V4 assets, with styles scoped under `#view-home.v4-home` to prevent changes leaking into the M3 project routes.
- The same eight canonical catalog IDs, names, summaries, and public repositories remain available. Concept artwork is labeled; no simulated releases, download links, or unpublished private data.
- V3 five-second cinematic intro, its Skip/Replay entry, global search keyboard accelerator, all eight editorial project routes, Creations, Updates, Studio, Journal, deep links and same-page browser history remain owned by existing site code.
- V4 project story links now use `#project/<id>` in the same tab. V4 nav's Home-internal anchor buttons scroll into the homepage, and off-Home navigation uses the existing routing system.
- Legacy Home's required featured-grid anchor is present but hidden for compatibility with the existing catalog render path. No duplicated legacy IDs for modals or mobile menus.

## Local test evidence

- 7 standard-library tests in `site/tests/v42_integration.py` pass, covering catalog parity, empty release manifest, unique DOM IDs, original project route preservation, CSS scoping and no private API mutations.
- A Chromium integration harness using the **actual assembled site** tested at 1440, 1280, 1024, 768, 390, 320 CSS px: all six passed.
- Browser interactions checked: atlas selection, all eight project cards, category filtering, preview dialog/Escape, same-tab `#project/frame-one` route, original editorial project content, Updates route, and navigation back Home, including the existing mobile menu.
- No horizontal overflow, project-hero collapse, or browser script exceptions in the passing harness. Direct sandbox navigation to local/remote URLs was blocked; only data fetch and intro-frame URL were shimmed by the *test harness* for `about:blank` browser rendering, never in product source.
- V4 modal inert-target and mobile fixed-height inheritance defects found and fixed in the integration review.
- Real GitHub CI on the exact committed site, real hosted GitHub Pages smoke, physical iPhone/Android usability and screen-reader audit remain approval gates.

## Source and release gates

- Production `main` and its GitHub Pages site must remain unchanged until owner confirms the integrated browser screenshots and final CI is green.
- Repository workflows must run `python3 site/build.py --check`, `python3 site/tests/validate.py`, `python3 site/tests/v42_integration.py`, `node --check site/v4/home.js`, and the updated Chrome intro test.
- Zero owner-approved public downloads. The `site/data/projects.json` and `site/data/releases.json` files remain unchanged. Backend private notes, Cloudflare, Neon and the protected Vercel Control Room are out of scope.

## Remaining planned V4 phases

- V4.3 eight project worlds: separate follow-up design approval; never silently rewrite existing M3 content.
- V4.4 Experience Room: only real approved demos/video experiences.
- V4.5 Studio Pulse publishing: curated, dated, externally verifiable approved content, not every GitHub commit.
- V4.6 visual/performance/accessibility/physical-device release acceptance.
