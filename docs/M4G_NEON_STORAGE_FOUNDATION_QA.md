# NAVIN STUDIO M4-G — Neon Free storage and owner-auth foundation

**Implemented 2026-11-09. Status: setup + code staged; online private editing remains LOCKED.**

## Verified existing site

- Vercel project `navin-studio-private-preview` on connected `navin7` **Hobby** workspace.
- Vercel project security currently reports `ssoProtection.enabled=true`, `deploymentType=all`.
- Last read-only Vercel deployment was `READY`; no local-data or private write routes were in that deployment at initial audit.

## Dedicated backend created (no change to other projects)

- Existing **free** Neon organization, created separate project `navin-studio-private-db`, ID `wandering-sound-42988558`; default branch `br-quiet-voice-bbymcfuv`.
- Neon managed Better Auth enabled, email sign-up disabled and verification required; shared Google provider available, Vercel production/first deployed URL allowlisted as trusted origins.
- Neon Data API enabled with Neon Auth JWT verification and **no default all-table grants**.
- New `studio_owners`, `studio_documents`, `studio_document_history` tables and RLS policies created in this fresh project; `studio_is_owner()` checks an explicit owner allowlist.
- Privilege audit: anonymous `studio_documents` SELECT=false, INSERT=false. RLS forced. **Owner allowlist count=0, cloud document count=0.**
- Vercel environment now has nonsecret Neon Auth/Data API URLs, and `STUDIO_CLOUD_WRITES_ENABLED=false` for preview and production. No Postgres password configured in Vercel.

## Feature code

- `GET /api/cloud-config`: only nonsecret service configuration, no private records.
- `GET /api/cloud-docs?kind=...`: read through Neon JWT + Data API + RLS; owner access must be approved.
- `PUT /api/cloud-docs?kind=...`: fail-closed with 423 until operator intentionally enables server-side write switch; strict kind/revision/schema/body validation; database owns identity; CAS update.
- `/studio-cloud`: new Owner Cloud screen in the Director's Cut visual language with Google sign-in and read-only cloud dataset previews/downloads. No background sync, no local file migration, no release approvals.
- Third-party auth client pinned to `@neondatabase/auth@0.7.0-beta`; bundled by pinned `esbuild@0.28.2` during Vercel build. New build to `dist/`, with existing Studio static screens copied intact.

## Test evidence and remaining gates

- Local source test suite: 34/34 Node tests pass, including 15 cloud-api cases and previous public source adapters.
- Data API RLS verified by SQL metadata/privilege audit. **Real Google login, OAuth callback, authenticated RLS read/denial, live Vercel build and non-owner browser testing are NOT yet certified**; record outcome after deployment.
- The local E1–E4 desktop documents stay authoritative until owner explicitly confirms an export/import approach and recovery QA. Zero private records uploaded.
- **No owner Neon Auth user has been approved**. Any valid login is insufficient to read/write cloud docs until the user ID is explicitly allowlisted and verified.
- Do not represent schema provisioning as full online notes/tasks/planning or automatic cloud synchronization.
- Do not enable cloud writes, expose privileged DB connection strings, deploy a public management app, or link a commercial use case to Vercel Hobby without separate permission and verified plan eligibility.

## Owner onboarding remaining

1. Verify protected Vercel `/studio-cloud` loads and stranger/incognito access is denied at production and preview aliases.
2. Owner signs into Neon Auth via Google in the protected Studio page. Verify actual Neon user identity from the connected database; approve only that unique **verified** user ID in `studio_owners` after explicit owner confirmation.
3. Repeat anonymous, another-user, session-expiry and CSRF/Origin checks. Then test cloud write/rollback using only non-sensitive fixtures and separately approve turning on the write switch.
4. User explicitly approves any personal local-data migration and retains an independent E4 backup before upload.

## Fail-closed owner admission gate

A RLS-protected empty list is NOT evidence of owner approval. The hosted cloud API must first request the `studio_owner_status()` PostgreSQL RPC under the user's verified Neon bearer JWT and require `{"approved":true}` before reading documents or attempting writes. This change is installed in the separate Neon project and covered by negative tests. At this checkpoint the `studio_owners` table remains empty and no account has access.

**Browser build limitation:** Browser bundle depends on pinned `@neondatabase/auth@0.7.0-beta` and `esbuild@0.28.2`. Local npm install was blocked by environment networking; `npm run build` has not been verified locally. The GitHub CI workflow will perform the actual install/build. Do not mark deployment ready until CI and Vercel build succeed.
