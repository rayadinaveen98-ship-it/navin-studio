# M2.4 — In-place upgrade smoke test and signing-continuity check

**Scope:** CineRelay published GitHub APK releases `v0.2.7` → `v0.2.9` on a disposable Android 35 emulator. This is an **engineering QA gate**, not the studio owner's public release approval.

## Evidence chain
1. Resolve each GitHub Release tag to its exact source commit.
2. Download both APK assets from GitHub; independently hash all downloaded bytes and match the GitHub-reported SHA-256 and exact byte count.
3. Run official `apksigner verify --print-certs` and `aapt dump badging` against both downloaded APKs.
4. Require identical package IDs, identical signer certificate fingerprint set, a strictly increasing Android versionCode and no debug-signing subject on the target APK. Optionally compare against a **source-declared** public signing certificate.
5. In a fresh Android emulator, `adb install -r` the older APK, verify its installed Android versionCode, then `adb install -r` the target APK **without uninstalling the older package**. Verify the new installed versionCode.
6. Send a launcher event, check the process remains alive briefly and no app-specific FATAL EXCEPTION appears in sampled startup logs. Save a screenshot.

## Trust boundaries

- The expected signer fingerprint in `site/tools/run_upgrade_smoke.sh` is copied from CineRelay's **public** `apps/android/signing/cinerelay-update-cert.sha256` as of 2026-11-08. The comparison is a useful consistency check, not an independent trust attestation from a keystore owner.
- A successful `adb install -r` without uninstall demonstrates Android package upgrade compatibility on one emulator. **It does not prove user data was created/preserved intact**, login/session continuity or a migration passed.
- No personal accounts are signed in. No API data or film content workflows are tested.
- The emulator output is a JSON report and startup screenshot; the downloaded APKs are temporary and are not uploaded as artifacts.
- All evidence is deliberately tagged *not release approved*, even after technical checks pass.
- No site release manifest is modified and no public APK button is published.

## Reference
- GitHub Actions: `.github/workflows/upgrade-smoke.yml`.
- Script: `site/tools/upgrade_smoke.py`.
- [CineRelay public update signing certificate](https://github.com/rayadinaveen98-ship-it/cinerelay/blob/main/apps/android/signing/cinerelay-update-cert.sha256)
- [CineRelay release notes v0.2.9](https://github.com/rayadinaveen98-ship-it/cinerelay/blob/main/docs/releases/V0.2.9.md)
- [M2 QA tracker](https://github.com/rayadinaveen98-ship-it/navin-studio/issues/12)

## After test
- Independently establish that the signing certificate represents the studio owner's intended production signer.
- Conduct device-based sign-in, discovery, browsing, offline/network failure, permissions, notifications, update migration and accessibility QA, recording results privately where account data is involved.
- Receive explicit owner approval for exact release commit/tag/asset before reviewing a public release manifest change.
