# NAVIN STUDIO — M4-B Control Room design study

**Status:** Interactive visual review prototype. Not an authenticated product, not deployed, and not approved for production.

The prototype extends the approved **Director's Cut / Living Architecture V3** Studio art direction into a separate private-operations concept. It is a single, standalone HTML file with inline CSS/JavaScript. It contains only public catalog identities, public repository links, and clearly identified conceptual UI.

## Open the prototype

1. Unzip the review package.
2. Open `index.html` in a modern browser. It requires no server, installation or third-party JS/CSS.
3. Use the left navigation (desktop), bottom navigation / drawer (mobile), Projects search and category filters, and project detail dialogs.
4. Explore the Release Desk, Decisions and Studio Log. External source links open public GitHub pages if your browser has internet access.

## Interaction scope

- **Overview:** routes to Projects, Release Desk and Access Blueprint.
- **Projects:** eight public repository records; all/apps/creative filters; name/type/description search; project detail dialog; GitHub source link; copy URL where browser clipboard permissions allow it.
- **Release Desk:** accurate zero-approved-public-APK state, review stages and policy dialog. **No publish or approval action.**
- **Decisions:** documented studio principles, not a live private notes database.
- **Studio Log:** source-linked M3/M4 milestones, not a live feed.
- **Mobile:** bottom navigation and drawer; Escape closes dialogs/drawer, plus responsive 320–1440px layouts.
- **No login:** pretending to authenticate in frontend-only code would be insecure and misleading.

## Verified snapshot

Public Studio catalog: 8 entries. Repository metadata was checked through GitHub on **November 8, 2026**; all eight were publicly accessible at that point. The Studio public release manifest had **zero owner-approved APKs/demos**. These values are **snapshots**, not live updates. The demo cannot infer source builds, feature completion, app installs, revenue or private development statuses.

## QA results

The included `test_m4.py` uses Playwright with Chromium to verify rendering, views, category/search results, dialog opening and Escape dismissal, and no horizontal overflow or JavaScript exceptions at five viewport sizes: **1440, 768, 390, 360 and 320 CSS pixels**. QA also checks absence of third-party runtime script/iframe/stylesheet dependencies.

The local assistant environment blocked navigation to `file://` and localhost; browser testing was executed using Playwright `page.set_content` with the exact standalone HTML source. **The local file-open distribution route was therefore not independently browser-verified.** User-side manual opening and accessibility/physical Android checks remain required. A successful frontend smoke test is not a security audit or visual sign-off.

## Safety boundaries

Never use this concept as a real private dashboard. Do not publish it as an authenticated feature, add client-only login, inject personal notes, expose private GitHub data, or enable release/approval buttons until an isolated protected backend, real identity enforcement, and owner-gated publication are implemented.

**Repository status:** M4 design review remains on the `feature/m4-private-command-center-foundation` branch in draft PR #24. The approved public website is separate.