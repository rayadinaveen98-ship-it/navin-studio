# M2.3 — Android emulator installation and first launch

This is an automated **technical smoke test**, NOT real-device QA or owner approval.

## Source
`site/tools/emulator_smoke.py` selects an existing published GitHub APK asset by catalog project + tag, independently verifies its exact downloaded size/SHA-256, validates Android signature integrity and reads the package name.

`.github/workflows/emulator-smoke.yml` launches a clean Android API 35 x86_64 emulator, installs the exact APK with ADB, attempts its launcher intent via `monkey`, confirms its process remains alive, samples startup logcat for an app-specific fatal exception, and captures a PNG screenshot.

The GitHub runner is a standard public-repository Linux runner. The third-party emulator action is pinned to a reviewed upstream commit. No paid device service or developer installation on the owner's laptop is required.

## First candidate
On initial merge into `main`, the workflow attempts CineRelay `v0.2.9`. Future runs may be requested through workflow_dispatch with a catalog project id and tag. For Frame One, remember that the existing `android-preview-latest` is a **debug-signed prerelease** and should not be treated as a stable public release even if emulator smoke passes.

## Tests and boundaries
- `adb install -r` must return success.
- A launcher event must be injected.
- The target package process must still run after a short startup interval.
- Sampled logcat must not show a matching launch FATAL EXCEPTION.
- A screenshot must be captured. It is a technical artifact, **not visual quality approval**.
- Reports are marked `INSTALL_LAUNCH_SMOKE_PASSED_NOT_QA_APPROVED` or `BLOCKED_NOT_QA_APPROVED`.
- No APK is published or copied to the website. The action retains only a JSON summary and a screenshot for seven days.
- The emulator tests only one OS profile. It does not verify login, streaming/news APIs, background permissions, upgrade migration, smooth UI, other Android versions, or real-device behavior.
- The release signing certificate must still be matched to a trusted baseline. No signing secrets are required or stored.

If emulator boot or APK launch fails, we keep the failed run as evidence and investigate rather than claiming release readiness.

## Next release gates
[CineRelay QA issue #12](https://github.com/rayadinaveen98-ship-it/navin-studio/issues/12) tracks human testing and final approval. [Frame One release signing #13](https://github.com/rayadinaveen98-ship-it/navin-studio/issues/13) tracks moving away from debug builds. The public release manifest stays empty.
