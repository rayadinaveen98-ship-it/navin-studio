# NAVIN STUDIO — Public Website M1

**Status:** First real public-web implementation for review. **Not deployed** and **not merged to main**.

This is an accessible, mobile-responsive static site based on the approved cinematic web prototype. Unlike the exploratory prototype, project records come from `data/projects.json` and releases are separate, approval-gated records from `data/releases.json`. No APK version or download is claimed until the required evidence exists.

## What's implemented

- Home, Creations, Updates/Release Desk, Studio and Journal views
- Eight public development-preview entries backed by known project repositories
- Category filters, full-directory search, project detail dialogs, responsive navigation and reduced-motion support
- Real no-release state with **zero approved APKs**, no fabricated counters or links
- A standalone HTML release artifact that bundles artwork and requires no runtime dependencies
- Editable sources in `src/`, source template and standard-library build script

## Local run

```sh
python3 site/build.py --check
python3 -m http.server 4173 --directory site
```

Browse to `http://localhost:4173`. You can also open `site/index.html` directly for an offline snapshot because the build includes the current editorial catalog as a fallback. When served over HTTP, the UI loads its catalog and release manifest from the JSON files.

Edit `src/app.js`, `src/styles.css` or `template.html`; then regenerate with `python3 site/build.py`. Run `python3 site/tests/validate.py` and optional Playwright tests before committing. No npm packages or paid services are necessary.

## Security and publication boundaries

- `catalog_state: draft` means **development preview**, not a published release.
- The website shows no verified APKs, downloads, build statuses or analytics without approved source records.
- For a release to be listed, source commit hash, SHA-256, signing-review flag, QA flag, owner-approval flag, exact published release tag and public GitHub Releases asset URL must be consistent with the project manifest. This gate is necessary but does **not** itself verify a binary; verification happens outside the site.
- Public repository only: never commit signing keys, credentials, private app records or unreleased APKs.
- No authentication or admin dashboard here. The separate dashboard prototype is not a secure production admin product.

## Checks and limits

The modular **working copy** was checked locally in Chromium at 1440px, 390px and 360px and passed navigation/search/project/release-empty/error/overflow checks. However, the GitHub standalone variation was not independently browser-certified in this environment, and browser network navigation was blocked; a verified hosted end-to-end smoke test is a launch gate. See `QA_REPORT.md`.

The temporary `robots.txt` opts out of indexing until explicit launch approval. No hosting, domain, GitHub-release sync, native Android implementation or private dashboards have been deployed.
