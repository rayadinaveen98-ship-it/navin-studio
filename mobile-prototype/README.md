# NAVIN STUDIO — Mobile Experience Prototype v0.1

**Status:** Interactive design prototype for review; not a native Android APK or public release.

Open `index.html` in Chrome/Edge. It is a single self-contained file with embedded art, CSS and JavaScript. On a desktop it shows a phone simulator; on a phone it fills the screen.

## Five connected screens
- **Home** — editorial welcome, featured Backlot project, category discovery, curated studio work
- **Explore** — eight draft project previews, filters, project details and saved collections
- **Releases** — truthful "no approved release" screen, and planned verification steps
- **Journal** — documented 2026-11-08 foundation milestone and a *planned* journey
- **Studio** — creative principles and reduced-motion control

## Working interactions
Bottom tabs, category filters, project detail bottom sheet, save and unsave, searchable directory, Esc-to-close and keyboard search shortcuts (`/`, `Ctrl/Cmd+K`), official source links, and motion preference. LocalStorage is used where available; no data is sent to a server.

No fake APK versions, download buttons, publication statuses, repository-only releases or fabricated analytics are presented. A mock 9:41 status bar is illustrative.

## Verification
Automated Chromium/Playwright testing succeeded for **1440×950**, **390×844**, and **360×720**. Checks covered all tabs, eight project entries, filtering, saving, dialog actions, search, releases, journal, settings, no JavaScript errors and no horizontal overflow. Browser navigation directly to `file://` was blocked by the QA environment; `page.set_content` was used to test the identical document. This is not physical Android-device or cross-browser certification.

## Design review gate
The owner should verify the mobile app structure, visual fidelity, interaction rhythm, device ergonomics, project details and motion. Only after approval should we plan native implementation. Keep the private command-center dashboard prototype as the **next separate stage**.

This public branch contains no access tokens, private-project records, signing keys or approved binary releases.
