# Creator Command Center — Interactive Prototype v0.1

**Status:** Design review only (2026-11-08). **Not** a production dashboard, authenticated admin, or real GitHub integration.

## Open
Download `index.html` and open it in Chrome or Edge. It is a fully self-contained HTML file with styles, logic, and imagery embedded. No installation or backend needed.

## Functional screens
- **Overview:** cinematic hero, synthetic project KPI overview, sample roadmap, illustrated progress, simulated QA workflow, simulated owner release gate, source-empty analytics and activity timeline.
- **Projects:** browse eight editorial candidates, search/filter projects and inspect their sample milestone drawer.
- **Roadmap:** check or uncheck synthetic milestone entries; overview metrics recompute.
- **Releases:** honest empty real-release registry and six-item publishing gate simulation. Completing and clicking approval modifies only the local preview; no APK or GitHub Release is uploaded or published.
- **Builds & QA:** proposal for pipeline evidence and local simulation of checks.
- **Analytics:** empty real metrics plus an explicitly fictional chart with an adjustable time range.
- **Activity Journal:** known foundation/prototype milestones, separated from local interactions.
- **Settings:** compact density, artwork, reduced motion, sample workspace on/off and reset.
- **Navigation:** responsive sidebar, mobile drawer, hash links, and global search via Ctrl/Cmd+K or /.

## Source and security
No private source repository data is read. No external requests are made. No credentials or signing keys. The “studio owner” display is decorative and does **not** authenticate a user. All sample progress/QA/status/analytics figures are fictional; no APK versions, downloads or official release dates are invented.

## Review gate
The public web and mobile experience prototypes were accepted for design direction. This third dashboard prototype awaits owner review and approval before architectural/production implementation. Do not deploy this as a private authenticated dashboard.

## QA
Chromium automated smoke tests passed at **1600×1000, 1200×900, 390×844 and 360×740**, including project detail interactions, roadmap checkbox, release-gate simulation, analytics period, settings, search, JS-error and overflow checks. See `QA_REPORT.md`.

The downloadable ZIP from the design chat additionally includes editable CSS/JS, a standalone HTML assembler, local artwork, browser test scripts and review screenshots.
