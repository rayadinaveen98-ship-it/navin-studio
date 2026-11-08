# M2.2 — Independent APK binary inspection

**Status:** Engineering implementation awaiting real GitHub Actions binary run. The owner has not approved any downloadable APK through NAVIN STUDIO.

## What the inspector does

The read-only script `site/tools/inspect_apk.py` first resolves an existing published GitHub Release and its actual immutable source tag commit using the M2.1 review helper. It chooses exactly one APK asset, checks the published asset size and SHA-256 digest, then **downloads the actual APK bytes** to a temporary directory using HTTPS and an allowlist of GitHub release asset hosts.

After computing its own SHA-256 digest and checking the exact byte count, the script runs two *official Android SDK Build Tools* against that file:

- `apksigner verify --verbose --print-certs candidate.apk` checks Android APK signature integrity and extracts all available signing-certificate SHA-256 fingerprints.
- `aapt dump badging candidate.apk` inspects the Android package ID, version code/name, and min/target SDK when present.

An optional previously trusted package name or certificate fingerprint can be supplied. A mismatch causes inspection to **fail closed**. If no trusted signing baseline exists, the report must not assert publisher authenticity.

The APK is deleted with the temporary directory. The workflow uploads **JSON evidence only**, never the binary.

## Security limits

- Input is an existing public GitHub project id + published tag; no arbitrary URL is accepted from users.
- Downloads require HTTPS, use a restricted redirect-host list, compare byte count, and cap size at 250 MiB.
- Checksum mismatch, bad APK signature, ambiguous asset, missing tools or network outage result in a blocked report and failing workflow.
- Reports never contain GitHub tokens, keystores, passwords, APK binaries or private credentials.
- GitHub Actions uses standard `ubuntu-latest` runners in this **public repo**, avoiding paid Android-device farms or signing services.
- The workflow cannot edit `site/data/releases.json`, create GitHub Releases, sign APKs or approve distribution.
- GitHub's release tag/source commit relationship **does not prove** a reproducible build from source.
- A cryptographically valid debug-signed APK is still **not** automatically stable or safe for general distribution.

## First runner inspection

On the initial push of this workflow to `main`, the read-only workflow attempts inspections of two existing *public release candidates*:

- CineRelay `v0.2.9`
- Frame One `android-preview-latest` (debug prerelease)

Each emits a JSON evidence artifact for 7 days, with a summary on the GitHub Actions run. A failed inspection is useful information—not a publishing failure and not an invitation to bypass the check.

For later runs open [Inspect real APK binaries (never publish)](https://github.com/rayadinaveen98-ship-it/navin-studio/actions/workflows/inspect-apk.yml), select **Run workflow**, and provide the catalog project id plus exact tag. Optional expected package and signer certificate should only be taken from independent, previously authenticated records.

## What remains before any public APK is approved

- [ ] Review the real binary-inspection evidence from GitHub Actions.
- [ ] Confirm release signing identity against a trusted baseline and expected application ID.
- [ ] Check app permissions/privacy and public distribution suitability.
- [ ] Install the exact APK on a device and test core functionality.
- [ ] Review feature claims and release notes.
- [ ] Obtain owner approval for exact tag, commit and binary.
- [ ] Update approved catalog and release manifest via a separately reviewed PR.
- [ ] Verify actual publicly deployed download/installation and rollback procedure.

The website still displays **zero owner-approved APK downloads** until these conditions are met.

## References
- [Android apksigner](https://developer.android.com/tools/apksigner)
- [GitHub Actions usage and billing](https://docs.github.com/en/actions/concepts/billing-and-usage)
- [M2.1 release review](./M2_RELEASE_REVIEW.md)
- [Tracked M2 milestone](https://github.com/rayadinaveen98-ship-it/navin-studio/issues/7)
