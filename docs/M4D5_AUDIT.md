# NAVIN STUDIO — M4-D5 cross-screen UX, keyboard and source-integrity audit

**Audit:** November 9, 2026 (India). **Scope:** D1–D4 loopback-only Studio, not the public site. **Status:** code and automated QA verified; owner visual acceptance, physical device and manual screen-reader review pending.

## Fixes

1. **Skip-to-content:** Keyboard-visible "Skip to main content" links and focusable main landmarks in Studio Home, Project Workspaces and the local original Control Room.
2. **Priority buttons:** Keyboard focus survives the Home focus-chooser re-render; pressed state retains accessible text.
3. **Project navigation:** Switching projects focuses the newly opened project title, on success and failure, instead of losing focus when the navigation list is replaced.
4. **Chooser semantics:** Clear accessible group label for selecting up to three focus projects.
5. **No side effects:** No Cloudflare setup, hosted login, paid service, public Studio changes, GitHub write operations, private notes or release approvals.

## Automated results

- **98/98 Node tests pass**. Nine new D5 tests check skip targets, main landmark focusability, semantic headings, reduced-motion support, focus re-render handling, and the local-only security boundary.
- **15/15 Chromium semantic, keyboard and interaction viewport sweeps pass** (three screens at five viewport widths: 1440, 1024, 768, 390 and 320 CSS pixels). Verified no horizontal document overflow or uncaught JS errors.
- Keyboard: first Tab exposes skip link; Enter lands on main; focus selection remains focused when toggled; in-place project switch focuses updated heading; source/QA content resets when switching; dialog Tab/Shift+Tab cycle and Escape close with trigger focus restoration.
- Chrome DevTools Accessibility tree exposes a main landmark and a heading on each screen. **This is not a real screen-reader audit.**
- Demo focus, activity filtering and workflow evidence interactions passed with HTTP-shaped simulated API responses obtained from the Node local preview.
- Screenshots are actual Chromium captures, **not generated visual mockups**.

### Browser-test method and limitations

The execution environment's Chromium is blocked from navigating directly to local HTTP URLs. The script loads the actual UI HTML, CSS and JS in Chromium and supplies API responses read from the running Node demo HTTP server, with a temporary workspace-route fixture and in-memory browser storage substitute. Thus screenshots and interaction checks demonstrate the UI under simulated responses, **not** real Windows browser URL loading, persistent browser profile behavior, live GitHub connectivity, a real screen reader or a physically connected Android phone.

The extracted D5 review ZIP was separately tested again: **98/98 Node tests passed**. No admin service was deployed.

## Required owner acceptance

- [ ] Windows Chrome/Edge: extract ZIP, run OPEN-DEMO.bat, test all three views, keyboard Tab/Shift+Tab, focus project selection, refresh/source failures and project switching.
- [ ] Stop demo server; run OPEN-PUBLIC-GITHUB.bat. Verify genuine canonical GitHub commits, PRs, workflows and individual job links, and that rate limits remain unknown rather than zero progress.
- [ ] Real browser profile persistence of focus selection; show that selections are browser-local and not backed up or synced.
- [ ] Physical Android/phone viewport and touch-target review using a specifically approved safe testing method. **Do not bind the local preview to 0.0.0.0 just to make it remotely accessible.**
- [ ] Actual NVDA/Narrator/VoiceOver/TalkBack test: landmark reading order, labels, dialog focus and announcements.
- [ ] Manual 200% zoom, small-text legibility and gradient contrast review before claiming complete WCAG conformance.
- [ ] Owner approves visual consistency and interaction fidelity before merging a significant UI change.

## Owner review instructions

1. Extract the M4-D5 ZIP without changing its directory structure; install Node.js 22+ if necessary.
2. Open OPEN-DEMO.bat, then http://127.0.0.1:4173/studio-home. Press Tab, confirm the skip link appears, press Enter. Select two projects with keyboard Enter, confirming focus remains on the toggled button.
3. Open a project workspace and switch between Backlot and Frame One. Check that the heading receives focus and the old project's QA evidence is cleared.
4. Open the original Control Room and a project or policy modal. Test Tab/Shift+Tab cycle, Escape, and focus return.
5. Close the demo server. Open OPEN-PUBLIC-GITHUB.bat for actual public repository evidence. Never interpret passing CI as a signed APK or a verified device build.
6. Compare desktop/mobile views with the screenshots; report any discrepancies before approval.

**Release gate:** PR #24 stays draft and unmerged; public GitHub Pages unchanged, with no approved public APK distribution. Cloudflare/hosted private auth deferred to M4-G.
