# NAVIN STUDIO — Public hosting and release monitoring runbook

**2026-11-08 · Stage: review branches, not deployed.**

## Why GitHub Pages

The studio repository is public, and GitHub Pages can host public-repository sites on GitHub Free. This plan requires no paid APIs, application server, database, or separate subscription. The initial site is delivered as a standalone HTML file plus two approved public JSON records and an opt-out `robots.txt`.

GitHub documentation: [Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [custom Actions workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Before first public deployment

1. Review and merge the **Public Web M1** source PR, then merge the stacked **Pages + release watcher** PR. Verify that only public catalog entries are exposed.
2. On the repository's GitHub page, open **Settings → Pages → Build and deployment → Source: GitHub Actions**. Confirm that the Pages feature is enabled.
3. Review the **github-pages** environment and restrict it to deployments from `main` if repository settings allow. Do not configure an owner dashboard in this public repository.
4. Trigger **Publish NAVIN STUDIO website** on `main` or push a reviewed change to `site/**`.
5. Check the GitHub Actions run before opening the **Pages** URL shown by the deployment output. Do not invent or advertise a production URL until a successful run provides it.
6. Manually test direct loads at the repository subpath, Home, Creations, Releases, Studio, Journal, responsive images, keyboard search, nav links, basic screen reader flow and long/short network failures. Review copyright, publication and privacy language before promoting the site.

### Production artifact scope

`site/tools/build_dist.py` copies only the four allowlisted files (and `.nojekyll`): `index.html`, `robots.txt`, `data/projects.json`, and `data/releases.json`. It never copies repo docs, internal notes, tests, source directories, environment files or APKs. Do not add admin credentials to any of these public files.

### Release watcher (review only)

`.github/workflows/release-watch.yml` reads the explicitly listed **public** GitHub project repositories each day using GitHub's REST API. It produces a short-lived Actions artifact, `public-release-candidates`, noting any published GitHub Releases containing `.apk` assets. It is **discovery only**. It does not edit a repo, show APKs on the website, approve release candidates, publish binaries, or send notifications.

New releases will not automatically appear as **verified downloads** until an owner reviews the exact file, source revision, signing certificate, SHA-256, install/QA results and approves the release tag, and the public catalog/manifest are updated. This prevents an accidental/untrusted GitHub build from being distributed as stable software.

### Verification gate

`site/tools/verify_release_assets.py` reads each **already approved** manifest record and checks that the exact public GitHub release tag exists, is published, contains the expected uploaded APK asset, and that GitHub's asset `digest` matches the approved SHA-256. When an approved release is present and the network or digest is unavailable, **deployment fails closed**. This checks metadata, not an actual independent APK hash or Android signing identity: those must be reviewed before publication.

### Future automation (not implemented)

The eventual owner-only dashboard can offer a candidate review queue and publishing interface. It will require secure authentication, source-backed QA, audit events and owner approval. Do not deploy the HTML command-center prototype as though it were a secured admin panel.

## Current limitations

- No Pages site has been deployed or given a verified hostname.
- No GitHub Actions scheduled runs have executed yet; the workflow runs only after merged to the default branch and enabled.
- No project has an approved public APK release, and the site has no download links.
- No real web analytics or automatic UI display of arbitrary new GitHub release candidates has been implemented.
- GitHub Free quotas, usage policies and GitHub Pages setup requirements must be respected.
