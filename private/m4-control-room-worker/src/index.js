/**
 * NAVIN STUDIO — M4-C protected read-only API foundation.
 * NOT DEPLOYED. Requires Cloudflare Worker-level Access protection, the app's
 * Access AUD, and an allowlisted Cloudflare Access user_uuid before deployment.
 * No private data and no write endpoints. The public Studio remains separate.
 */
import catalog from '../../../site/data/projects.json' with { type: 'json' };
import releases from '../../../site/data/releases.json' with { type: 'json' };

const projectRows = Object.freeze((catalog.projects || []).map(({ id, name, repository, category, summary }) => Object.freeze({ id, name, repository, category, summary })));
const projectsById = new Map(projectRows.map((p) => [p.id, p]));
const APPROVED_RELEASES = Array.isArray(releases.published_releases) ? releases.published_releases.length : 0;
const MAX_WAIT_MS = 4500;

const securityHeaders = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, private, max-age=0',
  'pragma': 'no-cache',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cross-origin-resource-policy': 'same-origin',
  'vary': 'Cookie, Cf-Access-Jwt-Assertion',
});

const json = (obj, code=200, extra={}) => new Response(JSON.stringify(obj), { status: code, headers: { ...securityHeaders, ...extra } });
const error = (code, reason) => json({ ok:false, error:reason }, code, code===405 ? {allow:'GET'} : {});
const configured = (env) => typeof env?.ACCESS_AUD === 'string' && env.ACCESS_AUD.length > 0 &&
  typeof env?.OWNER_USER_UUID === 'string' && env.OWNER_USER_UUID.length > 0;

/** Access ctx can be supplied only by Cloudflare runtime in production. Never use request headers as identity. */
async function isOwner(ctx, env) {
  if (!configured(env) || !ctx?.access || typeof ctx.access.getIdentity !== 'function') return false;
  if (ctx.access.aud !== env.ACCESS_AUD) return false;
  try {
    const identity = await ctx.access.getIdentity();
    return typeof identity?.user_uuid === 'string' && identity.user_uuid.length > 0 &&
      identity.user_uuid === env.OWNER_USER_UUID;
  } catch { return false; }
}

function isoObserved(now) {
  const date = now();
  return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : new Date(0).toISOString();
}

function urlFor(repository, kind) {
  // Never accept a browser-supplied repo name or URL; only the checked-in allowlist.
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Invalid allowlisted repository');
  const base = 'https://api.github.com/repos/' + repository;
  return kind === 'run' ? base + '/actions/runs?per_page=1' : base;
}

async function githubRead(url, githubFetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAX_WAIT_MS);
  try {
    const response = await githubFetch(url, {
      method:'GET', redirect:'error', signal:controller.signal,
      headers: { accept:'application/vnd.github+json', 'user-agent':'NAVIN-STUDIO-Owner-ReadOnly-M4', 'x-github-api-version':'2022-11-28' },
    });
    if (!response || response.status !== 200) return { ok:false, state: response?.status === 403 || response?.status === 429 ? 'rate_limited_or_denied' : 'unavailable' };
    const raw = await response.json();
    if (!raw || typeof raw !== 'object') return { ok:false, state:'unavailable' };
    return { ok:true, value:raw };
  } catch { return { ok:false, state:'unavailable' }; }
  finally { clearTimeout(timeout); }
}

function allowlistedRepoPayload(project, data, observed) {
  // Reject a mismatched upstream repository identity; do not claim success.
  if (data.full_name !== project.repository || data.private !== false) return { state:'unavailable', observed_at:observed };
  return {
    state:'current', observed_at:observed, source:'GitHub public repository metadata',
    repository:project.repository, source_url:'https://github.com/'+project.repository,
    default_branch: typeof data.default_branch === 'string' ? data.default_branch : null,
    archived: typeof data.archived === 'boolean' ? data.archived : null,
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : null,
    // Intentionally no percent complete, device QA claim, or APK ready flag.
  };
}

function ciPayload(project, data, observed) {
  if (!Array.isArray(data.workflow_runs))
    return { state:'unavailable', observed_at:observed, repository:project.repository };
  const run = data.workflow_runs[0] || null;
  if (!run) return { state:'no_runs_found', observed_at:observed, repository:project.repository };
  const url = typeof run.html_url === 'string' ? run.html_url : '';
  const expectedRunUrl = Number.isSafeInteger(run.id) && run.id > 0
    ? 'https://github.com/'+project.repository+'/actions/runs/'+run.id : null;
  if (!expectedRunUrl || url !== expectedRunUrl)
    return { state:'unavailable', observed_at:observed, repository:project.repository };
  return {
    state:'current', observed_at:observed, repository:project.repository,
    run_id: Number.isSafeInteger(run.id) ? run.id : null,
    status: typeof run.status === 'string' ? run.status : 'unknown',
    conclusion: typeof run.conclusion === 'string' ? run.conclusion : null,
    head_sha: /^[0-9a-f]{40}$/.test(run.head_sha || '') ? run.head_sha : null,
    workflow: typeof run.name === 'string' ? run.name.slice(0,160) : null,
    run_url:url,
    // A successful CI job is NOT proof that an Android app is release-ready.
    release_ready:null,
  };
}

/** Dependency injection is used only in local offline tests. No admin test mode is deployed. */
export function createHandler({githubFetch=fetch, now=()=>new Date()}={}) {
  return async function handle(request, env, ctx) {
    // Fail closed even when this Worker is misrouted outside the Access policy.
    if (!configured(env)) return error(503, 'security_not_configured');
    if (!(await isOwner(ctx, env))) return error(403, 'owner_access_required');
    if (request.method !== 'GET') return error(405, 'read_only');
    const url = new URL(request.url);
    if (url.search) return error(400, 'query_not_supported');
    const observed = isoObserved(now);

    if (url.pathname === '/api/me')
      return json({ok:true, role:'owner', source:'cloudflare_access', observed_at:observed});
    if (url.pathname === '/api/overview')
      return json({ok:true, observed_at:observed, source:'checked_in_public_catalog',
        public_project_count:projectRows.length, approved_public_release_count:APPROVED_RELEASES,
        ci_success_count:null, unverified_build_count:null,
        notice:'Public catalog snapshot, not a live private progress dashboard.'});
    if (url.pathname === '/api/projects')
      return json({ok:true, observed_at:observed, source:'checked_in_public_catalog', projects:projectRows});

    const match = /^\/api\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(source|ci)$/.exec(url.pathname);
    if (!match) return error(404, 'not_found');
    const project = projectsById.get(match[1]);
    if (!project) return error(404, 'project_not_found');
    const kind = match[2];
    const received = await githubRead(urlFor(project.repository, kind==='ci' ? 'run' : 'repo'), githubFetch);
    if (!received.ok) return json({ok:true, project_id:project.id, source_state:received.state, observed_at:observed, data:null},200);
    const data = kind==='ci' ? ciPayload(project, received.value, observed) : allowlistedRepoPayload(project, received.value, observed);
    return json({ok:true, project_id:project.id, source_state:data.state, observed_at:observed, data});
  };
}

const handle = createHandler();
export default { fetch: (request, env, ctx) => handle(request, env, ctx) };
