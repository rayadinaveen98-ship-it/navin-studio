# M2 — APK candidate review and source provenance (v0.2)

Updated 2026-11-08. The public website is deployed at
https://rayadinaveen98-ship-it.github.io/navin-studio/ .
**There are still zero owner-approved APK downloads on the studio site.**

## What happens now

1. A read-only scheduled scanner enumerates published GitHub Releases for the public repositories in `site/data/projects.json`.
2. Its GitHub Actions job summary and short-lived JSON artifact list **unapproved candidates**. A GitHub Release by itself never grants website publication permission.
3. A reviewer can trigger **Prepare APK release review packet (not publishing)** from GitHub Actions with an existing catalog project id and published GitHub tag.
4. That workflow resolves an exact APK asset, its GitHub-reported SHA-256 digest, file size, prerelease status, and **actual commit pointed to by the release's Git tag** (including annotated tags). The result is saved as a short-lived JSON artifact.
5. The owner must separately download and hash the actual APK bytes, inspect its Android signing certificate and package identity, test installation and core functionality, review changelog and source revision, and explicitly approve distribution.
6. A reviewed GitHub change updates both catalog and `site/data/releases.json`. The main-branch Pages deployment verifies exact release/tag/asset and digest, plus matches the source commit against the actual Git tag. Only then can the site offer a download.

**This phase does not yet automate steps 5 or 6.** The owner dashboard is a design prototype; it is not secured or connected to GitHub.

## Try an existing candidate

Go to [Actions](https://github.com/rayadinaveen98-ship-it/navin-studio/actions) → **Prepare APK release review packet (not publishing)** → **Run workflow** on the default branch, entering for example:

- Project id: `cinerelay`, tag: `v0.2.9`.
- Project id: `frame-one`, tag: `android-preview-latest`.

These are **GitHub release candidates, not newly certified NAVIN STUDIO releases**. Frame One's APK is a debug prerelease. Its signature, installability and fitness for public distribution have not been independently verified through this project. Always inspect the generated report before using it.

## Reviewer evidence checklist

- [ ] Exact public GitHub release tag and target source commit captured.
- [ ] Asset fetched and independent SHA-256 calculated from actual bytes; matches GitHub's digest.
- [ ] Android package name and version confirmed from the APK; debug/release variant understood.
- [ ] APK signature verified and signing certificate SHA-256 recorded; previous release certificate continuity checked.
- [ ] Installation tested on relevant Android hardware/emulator.
- [ ] Major user journeys and device compatibility checked; any regressions documented.
- [ ] Changelog accurate, screenshot/release artwork cleared, public license/privacy text reviewed.
- [ ] Owner explicitly approves this **particular binary** and tag.
- [ ] Release manifest change reviewed and merged only when every check passes.
- [ ] Actual download verified from deployed website after Pages redeploy.

A checkmark in GitHub Actions is not proof of Android QA. GitHub's asset digest is metadata, not an independently downloaded APK hash; source-tag matching proves reference provenance, **not** that a particular binary was reproducibly built from the source revision.

## Failure handling

- Draft, unpublished, missing/multiple ambiguous assets: review preparation refuses.
- Missing digest, missing or invalid tag, unexpected commit: preparation and/or deploy audit fail closed.
- GitHub API outage: no new approvals or downloads are generated; existing publicly deployed data stays unchanged.
- A withdrawal should be handled by a reviewed manifest removal/replacement and a Pages redeploy.
- Do not place signing keys, account tokens, private QA notes, or proprietary build details in this public repository or JSON artifacts.

## Remaining M2 engineering

- Independently validate Android signature/package and actual binary SHA-256 in a controlled CI process.
- Record durable human owner approval without exposing private credentials; protect the release branch.
- Generate a reviewed release-manifest patch from verified evidence.
- Add stable/beta version history, release withdrawal and end-to-end physical-device download tests.

Related tracker: [issue #7](https://github.com/rayadinaveen98-ship-it/navin-studio/issues/7).
