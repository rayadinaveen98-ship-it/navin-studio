/**
 * D1: PUBLIC-ONLY source adapter for a loopback Control Room.
 * No credentials, private repository visibility, write calls or hosting.
 */
import catalog from '../../site/data/projects.json' with { type: 'json' };
import releases from '../../site/data/releases.json' with { type: 'json' };

export const projects = Object.freeze((catalog.projects || []).map((p) => Object.freeze({
  id:p.id,name:p.name,repository:p.repository,category:p.category,summary:p.summary
})));
const byId = new Map(projects.map((p) => [p.id,p]));
export const publishedReleaseCount = Array.isArray(releases.published_releases) ? releases.published_releases.length : 0;

function fixedRepoUrl(repo,kind) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw Error('Invalid allowlist entry');
  return 'https://api.github.com/repos/'+repo+(kind==='ci'?'/actions/runs?per_page=1':'');
}
function currentTime(clock) {
  const date=clock();
  return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function fetchPublic(url, fetchImpl) {
  try {
    const res=await fetchImpl(url, {
      method:'GET', redirect:'error', signal:AbortSignal.timeout(5000),
      headers:{'Accept':'application/vnd.github+json','User-Agent':'NAVIN-STUDIO-Local-Public-ReadOnly','X-GitHub-Api-Version':'2022-11-28'}
    });
    if (!res || res.status!==200) return {ok:false,state:res?.status===403||res?.status===429?'rate_limited_or_denied':'unavailable'};
    const bytes=Number(res.headers?.get?.('content-length')||'0');
    if (bytes>1024*1024) return {ok:false,state:'unavailable'};
    const val=await res.json();
    if (!val || Array.isArray(val)||typeof val!=='object') return {ok:false,state:'unavailable'};
    return {ok:true,val};
  } catch { return {ok:false,state:'unavailable'}; }
}
function repoEvidence(project,val,at) {
  if(val.full_name!==project.repository||val.private!==false) return null;
  return {
    repository:project.repository,
    source_url:'https://github.com/'+project.repository,
    default_branch:typeof val.default_branch==='string'?val.default_branch:null,
    archived:typeof val.archived==='boolean'?val.archived:null,
    updated_at:typeof val.updated_at==='string'?val.updated_at:null,
    observed_at:at,release_ready:null
  };
}
function ciEvidence(project,val,at) {
  if(!Array.isArray(val.workflow_runs))return {state:'unavailable',data:null};
  if(!val.workflow_runs.length)return {state:'no_runs_found',data:null};
  const run=val.workflow_runs[0];
  if(!run || !Number.isSafeInteger(run.id)||run.id<=0)return {state:'unavailable',data:null};
  const expected='https://github.com/'+project.repository+'/actions/runs/'+run.id;
  if(run.html_url!==expected)return {state:'unavailable',data:null};
  return {state:'current',data:{
    repository:project.repository,run_id:run.id,
    workflow:typeof run.name==='string'?run.name.slice(0,160):null,
    status:typeof run.status==='string'?run.status:null,
    conclusion:typeof run.conclusion==='string'?run.conclusion:null,
    head_sha:typeof run.head_sha==='string'&&/^[0-9a-f]{40}$/.test(run.head_sha)?run.head_sha:null,
    run_url:expected,observed_at:at,release_ready:null
  }};
}

export function createSourceAdapter({mode='fixture',fetchImpl=globalThis.fetch,clock=()=>new Date()}={}) {
  if(!['fixture','github'].includes(mode))throw Error('Unknown source mode');
  async function projectEvidence(id,kind) {
    const project=byId.get(id);
    if(!project || !['source','ci'].includes(kind))return {ok:false,error:'not_found'};
    const observed_at=currentTime(clock);
    if(mode==='fixture'){
      // Deliberately no fake CI run or real-world build success in fixtures.
      const data=kind==='source'?{
        repository:project.repository,default_branch:'example (not verified)',archived:null,
        updated_at:null,observed_at,release_ready:null
      }:{
        repository:project.repository,workflow:'Simulated sample — not a real run',
        status:'example only',conclusion:null,head_sha:null,run_url:null,
        observed_at,release_ready:null
      };
      return {ok:true,project_id:id,mode,source_state:'simulated',observed_at,data};
    }
    const upstream=await fetchPublic(fixedRepoUrl(project.repository,kind),fetchImpl);
    if(!upstream.ok)return {ok:true,project_id:id,mode,source_state:upstream.state,observed_at,data:null};
    if(kind==='source'){
      const data=repoEvidence(project,upstream.val,observed_at);
      return {ok:true,project_id:id,mode,source_state:data?'current':'unavailable',observed_at,data};
    }
    const parsed=ciEvidence(project,upstream.val,observed_at);
    return {ok:true,project_id:id,mode,source_state:parsed.state,observed_at,data:parsed.data};
  }
  return {
    mode, projectEvidence,
    me(){return {ok:true,role:'local_preview',mode,security:'loopback_only_no_login',observed_at:currentTime(clock)}} ,
    overview(){return {ok:true,mode,observed_at:currentTime(clock),source:'checked_in_public_catalog',public_project_count:projects.length,approved_public_release_count:publishedReleaseCount,ci_success_count:null,notice:mode==='fixture'?'SIMULATED DATA ONLY — no live GitHub requests':'Public catalog counts are checked-in, not live repo status'}},
    directory(){return {ok:true,mode,observed_at:currentTime(clock),source:'checked_in_public_catalog',projects}},
  };
}
