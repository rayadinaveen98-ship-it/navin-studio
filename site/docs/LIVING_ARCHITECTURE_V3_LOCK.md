# NAVIN STUDIO — Director's Cut / Living Architecture V3

**Visual status:** Approved by owner for public-web integration on 2026-11-08.
**Scope:** Five-second full-viewport opening on a fresh webapp page load. This is a studio experience milestone, not a CineRelay/app release.
**Source:** User-approved V3 interactive HTML prototype; implementation asset `site/intro/living-architecture-v3.html`.

## Locked visual identity
- Near-black cinema background, soft warm-coral reflections, cool slate-blue accents.
- The existing three-stroke NAVIN STUDIO mark stays recognizable.
- Animated architectural vault and perspective-runway lights fill the entire viewport.
- On desktop, film/narrative and software/systems worlds flank the centered ident.
- Fine particulate motion, restrained eclipse-halo optics and layered atmospheric beams.
- Never replace the studio homepage with a mock or static video: reveal the real public website beneath the aperture.

## Timing (total 5 seconds)
| Window | Stage |
| --- | --- |
| 0.00–0.70s | The black frame; ambient vault emerges |
| 0.70–1.70s | Dimensional architecture, logo strokes assemble |
| 1.70–2.65s | Wordmark and visual identity reveal |
| 2.65–3.80s | The signature moment; light and tagline |
| 3.80–5.00s | Elliptical aperture transition into the *real* homepage |

## Behavior
- One automatic intro on each full document opening/reload; never again on internal route changes.
- Escape and visible Skip control always immediately unlock the actual website.
- Footer Replay opening control restarts the full five-second ident on demand.
- Site header, main content, footer are temporarily inert while the modal intro plays; focus restored after exit.
- A 6.2-second fallback prevents blocked-frame and JavaScript failures from trapping users.
- `prefers-reduced-motion: reduce` bypasses the animation.
- Automatic audio remains disabled. No third-party runtime content, trackers or libraries.
- Desktop and mobile have independent composition/safe-zone treatment.
- No project-catalog, download-approval or authentication changes.

## Evidence and validation
- `site/tools/tests/test_living_architecture_intro.py` verifies V3 identity, timing, DOM, no stale prototype controls, same-origin message handling, explicit Pages allowlist and JS syntax.
- `site/tests/intro_browser_smoke.mjs` uses actual Chrome CDP against the *built public website*, verifying real homepage transition, Skip, Replay, SPA navigation, mobile overflow, reduced motion and no browser exceptions.
- Public site checks run on PR, and GitHub Pages publishes from `main` only.
- Review CI screenshots: desktop and mobile mid-animation plus actual homepage.
- Owner public-release approval for an APK is a separate process; the release manifest remains empty.

Future adjustments require new owner-reviewed prototype evidence, not ad hoc art-direction changes.
