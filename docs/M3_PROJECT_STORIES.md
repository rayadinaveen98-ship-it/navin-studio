# M3 — Editorial project stories (review build)

**Status:** Owner-approved visual direction; production merge pending final green branch checks. See [M3 visual QA](M3_VISUAL_QA.md).

## What changes

The public site currently opens a compact information dialog when a project card is clicked. This milestone makes all eight catalog projects actual, shareable **public editorial pages** instead.

- Route: `#project/<catalog-id>` (e.g. `#project/backlot`).
- Real browser history and browser Back/Forward, direct-link reload and updated page titles.
- Existing NAVIN STUDIO dark cinematic direction and the existing authored imagery, carried into a larger responsive composition.
- Hero identity, concept narrative, three **creative exploration directions**, source link, honest preview/release disclaimer, and related-project discovery.
- Explicit return to Creations and copyable project deep link.
- Updated keyboard/browser smoke tests for desktop and mobile.
- `prefers-reduced-motion` disables decorative motion.

## Editorial truth rules

1. **No fake product screenshots.** Existing imagery is clearly identified as concept artwork, not product UI.
2. **No invented versions, user counts, roadmap percentages, app installs, download metrics or approvals.**
3. Eight descriptive texts are **creative briefs and exploratory intents**, not claims that functionality is shipped.
4. Verified public release links remain controlled by `site/data/projects.json` and `site/data/releases.json`. This work does **not** change either file.
5. If no verified approved release exists, project detail explicitly states there is no studio-approved download/demo.
6. Public source links come only from the validated project catalog's repository field; no new third-party assets are loaded.
7. No private admin or Creator Command Center data appears on these pages.

## Visual language

We keep the approved Director's Cut identity: warm coral light, slate-blue/violet supporting colors, typographic rhythm, dimensional art, atmospheric gradients and restrained motion. The project-specific `tone` is a subtle accent only—not a redesign of studio branding.

**Desktop:** image/art and typography share a large cinematic hero, followed by a grounded fact strip, long-form intent, three craft directions, access status and related projects.

**Mobile:** artwork stacks above the heading. All components become vertically readable. Share, Back and repository actions remain real interactive controls.

## Gate before public deployment

- [x] Public-site reproducibility and regression tests pass.
- [x] Chrome desktop project click, facts, navigation, browser history, share link, and no unauthorized download assertions pass.
- [x] Chrome mobile 360px/390px/768px layout and direct-link refresh pass without overflow.
- [x] Browser screenshots reviewed against the approved visual language.
- [x] **Owner approves the final desktop/mobile layouts.**
- [ ] Only then merge into `main` and confirm GitHub Pages.

## After this milestone

The **private Creator Command Center** needs authenticated, server-enforced authorization and a clearly separated data source. It will not be implemented as an unprotected admin tab or client-side-only password prompt on public GitHub Pages. A later milestone can provide a source-backed dashboard only after access design, permissions and data provenance are approved.

