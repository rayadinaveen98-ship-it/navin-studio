# Release Verification & Publication Policy (v0.1)

A compiled APK is not automatically a public/stable/verified release.

## States
1. **Development:** work-in-progress commit or branch; not downloadable on public site.
2. **Built:** generated binary exists; not evidence of QA or readiness.
3. **Candidate:** linked to a source revision and test results; still private/unapproved.
4. **Verified candidate:** artifact hash recorded, download tested, signing identity/variant checked and QA results reviewed.
5. **Approved public release:** studio owner approves specific immutable release tag, version, artifact and changelog.
6. **Superseded/withdrawn:** removed from primary download surfaces; withdrawal explained.

## Minimum publication checklist
- [ ] Exact source repository, commit SHA and release tag recorded.
- [ ] Version name/code and target package verified for the distributed artifact.
- [ ] Installability, launch and essential journeys tested on appropriate devices/emulators.
- [ ] Security scan or release review performed; no debug secrets or private credentials.
- [ ] SHA-256 checksum recorded and matched to the binary being distributed.
- [ ] Signing certificate identity checked against expected release lineage.
- [ ] Changelog maps to tested changes; no unverified feature claims.
- [ ] Release asset uploaded to approved stable hosting and linked from published upstream release.
- [ ] Download URL works and points to the expected file.
- [ ] Owner approves publishing that specific release.
- [ ] Public status is updated from source-backed facts.

## Terminology
- **Latest available build** — newest binary we have evidence for, may be untested.
- **Latest published release** — most recent approved publicly published release.
- **Verified** — specifically checked artifact and criteria, not a generic decorative badge.
- **Stable** — a designated distribution channel with QA/approval, not synonymous with latest upstream tag.

## Hosting notes
GitHub Releases can store binaries separately from a static site and exposes published release metadata. Do not rely on expiring Actions artifacts for long-lived public download links. Respect upstream service terms, free-tier limits and asset constraints.

## Display rules
- Before a real approved release, present “No public release yet”; do not invent version numbers, dates or APK sizes.
- When checksums are unavailable, say so plainly instead of pretending complete verification.
- Beta builds must not silently replace stable releases.
- Support withdrawing compromised or mistakenly uploaded artifacts.

## Image mockups
Any version numbers, build counts, traffic metrics, dates or project statuses shown in design exploration images are illustrative placeholders, never release or performance evidence.
