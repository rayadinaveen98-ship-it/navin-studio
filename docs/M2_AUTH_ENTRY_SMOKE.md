# CineRelay M2.5 — Account-entry smoke test, no credentials

**Scope:** NAVIN STUDIO public-release preparation for the exact CineRelay `v0.2.9` GitHub APK. This is **not authentication testing or owner approval**.

## Why this test

CineRelay requires an account before the main Home/OTT/Radar experience. We must not create throwaway user accounts, transmit fabricated credentials, or place private account tokens in this public repo. We can still verify the public screens and their navigation directly on a disposable Android 15 emulator.

The test uses the actual source UX labels from `apps/android/app/src/main/java/com/cinerelay/app/ui/FirstRunAuthV050.kt`:
- Welcome: **Sign in**, **Create account**
- Sign-in form: **Welcome back**, **Email**, **Password**, accessible **Back**
- Create-account form: **Choose your sources after signing up.**, **Email**, **Password**, accessible **Back**

## Technical checks
1. Resolve `cinerelay` + `v0.2.9` from public GitHub Releases and actual source tag.
2. Download the exact published APK. Verify its downloaded SHA-256 byte hash and Android signing/manifest identity.
3. Install on a fresh Android API 35 emulator and launch its activity.
4. Dump Android's visible accessibility tree for the CineRelay package; refuse system ANR overlays and unrelated app nodes.
5. Find welcome buttons, tap **Sign in**, verify Email/Password sign-in form, use visible **Back** control to return.
6. Tap **Create account**, verify Email/Password creation form, use **Back** and verify welcome again.
7. Confirm the target app process survives navigation and no app-specific fatal exception is visible in sampled logs.
8. Save only sanitized non-personal JSON results plus four screenshots of blank-form screens. Raw UI trees are not uploaded.

The GitHub Action uses a pinned Android emulator runner and only read-only GitHub credentials. It does not upload APKs, edit `site/data/releases.json`, or send any account-creation/sign-in requests.

## What this cannot establish
- Actual email/password authentication, confirmation-email delivery or account creation
- Authenticated Home, radar, OTT, favorites, news data, push notifications or account migration
- SharedPreferences/session state persistence after an upgrade
- Production backend availability or account privacy
- Physical Android device QA
- Owner release approval

Do not claim an authenticated user journey passed based on blank-form UI tests. The next stage needs an **authorized disposable test account** or a backend-isolated integration test environment, and explicit test-data handling rules. Do not store credentials in code, Actions logs or artifacts.

## Links
- [CineRelay QA tracker](https://github.com/rayadinaveen98-ship-it/navin-studio/issues/12)
- [M2 release gate](https://github.com/rayadinaveen98-ship-it/navin-studio/issues/7)
