# M2.6 — CineRelay local-state continuity across Android APK upgrade

**Scope:** QA for the exact published CineRelay `v0.2.7` → `v0.2.9` APKs, on a **disposable rooted Android 15/API 35 emulator**. This is not authenticated user-data migration QA, production signer ownership certification, or release approval.

## Why this check exists

Our earlier emulator run proved Android successfully upgraded the package in place; it did **not** prove that any local state remained after upgrade. We needed a privacy-safe, bounded test rather than using a real account or reading saved sessions.

The CineRelay source at both release tags uses a `cinerelay_welcome` SharedPreferences file containing a `last_played_version` string. The test reads only that non-sensitive preference, after each signed APK launches, and verifies that it changes from `0.2.7` to `0.2.9`.

A second check places a random, synthetic QA-only marker in the same application's private sandbox (a dedicated test file, not an app data file). After `adb install -r` upgrades the package without uninstalling, the marker must remain byte-for-byte identical. The test additionally confirms a readable CineRelay logged-out UI and no app-specific fatal exception in sampled logs.

## Evidence chain

1. Resolve exact public GitHub Release tags and independently verify downloaded APK SHA-256 and file sizes.
2. Verify app package, Android signature integrity, shared certificate identity, increasing Android version code, and source-declared public signing fingerprint.
3. Require an emulator that supports `adb root`. **Fail closed** on ordinary user/production devices.
4. Install v0.2.7, launch, read only `/data/user/0/com.cinerelay.app/shared_prefs/cinerelay_welcome.xml` and its `last_played_version` key.
5. Force-stop that app, write a new random marker to `/data/user/0/com.cinerelay.app/files/navin_studio_synthetic_probe.txt`.
6. Upgrade using `adb install -r` without uninstall/clear. Confirm upgraded version code and preserved marker.
7. Launch v0.2.9, confirm its welcome preference is updated, the logged-out Sign in / Create account controls are visible, and capture a screenshot.
8. Save an allowlisted JSON report plus **logged-out** screenshot. The probe file and raw app-owned preference XML are never published.

## Privacy and limits

- The test **never opens** `cinerelay_session`, `cinerelay_personalization_cache`, `cinerelay_home_cache`, any user account, actual preferences/favorites, or account tokens.
- There are no login credentials, creation of user accounts, production database writes, or authenticated API calls.
- A synthetic sandbox marker demonstrates Android's app-private file retention across an in-place update; it does **not** establish that real CineRelay user data, authentication or database migrations work.
- The app's real non-sensitive welcome preference changing versions demonstrates a narrow, reproducible case of app-owned SharedPreferences continuity.
- Root access is used **only on an ephemeral emulator**. This must never be run against a user's personal Android phone.
- GitHub Actions is read-only and uploads neither APKs nor user data, keystores, tokens, or private credentials.
- No public `site/data/releases.json` or project approval is changed, even if everything passes.

## After this gate

The remaining items before studio approval are an **authorized test account or isolated backend fixture**, full authenticated Home/OTT/Radar and account-switch QA, *actual* user-data migration tests, physical Android device validation, publisher-signing ownership confirmation, and explicit owner approval of the exact APK.

See [CineRelay QA tracker](https://github.com/rayadinaveen98-ship-it/navin-studio/issues/12) and [M2 release roadmap](https://github.com/rayadinaveen98-ship-it/navin-studio/issues/7).
