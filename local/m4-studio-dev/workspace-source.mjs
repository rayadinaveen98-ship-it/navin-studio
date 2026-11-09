/**
 * M4-D2 read-only project workspaces. Every GitHub URL is built from the
 * checked-in eight-project allowlist. Never accept an arbitrary upstream URL.
 * Live public mode is unauthenticated; fixture mode is visibly simulated.
 */
import {projects} from './source-adapter.mjs';

const byId=new Map(projects.map(p=>[p.id,p]));
const MAX_BYTES=1024*1024;
const TIMEOUT_MS=5000;
const SAMPLE_LIMIT=5;
const repoSafe=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const shaSafe=/^[0-9a-f]{40}$/;
const observed=(clock)=>{const v=clock();return v instanceof Date&&Number.isFinite(v.valueOf())?v.toISOString():null;};
const str=(s,max=140)=>typeof s==='string'?s.trim().slice(0,max):null;
const iso=(s)=>typeof s==='string'&&!Number.isNaN(Date.parse(s))?new Date(s).toISOString():null;
const unavailable=(at,state='unavailable')=>({state,observed_at:at,items:[],data:null});

export async function readGitHub(apiUrl,fetchImpl,expectedArray){
  try{
    const response=await fetchImpl(apiUrl,{
      method:'GET',redirect:'error',signal:AbortSignal.timeout(TIMEOUT_MS),
      headers:{'Accept':'application/vnd.github+json','User-Agent':'NAVIN-STUDIO-Local-Public-ReadOnly','X-GitHub-Api-Version':'2022-11-28'}
    });
    if(response.status!==200)return {state:[403,429].includes(response.status)?'rate_limited_or_denied':'unavailable',value:null};
    if(Number(response.headers.get('content-length')||0)>MAX_BYTES)return {state:'unavailable',value:null};
    // Bound the actual body, even when upstream omits Content-Length.
    const reader=response.body?.getReader();
    if(!reader)return {state:'unavailable',value:null};
    let total=0;const chunks=[];
    try{
      while(true){const {value,done}=await reader.read();if(done)break;
        total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel();return {state:'unavailable',value:null};}
        chunks.push(value);
      }
    }finally{reader.releaseLock()}
    const buffer=new Uint8Array(total);let offset=0;
    for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
    const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer));
    if(expectedArray?!Array.isArray(value):(!value||typeof value!=='object'||Array.isArray(value)))return {state:'unavailable',value:null};
    return {state:'current',value};
  }catch{return {state:'unavailable',value:null};}
}
function normalizedRepo(project,raw){
  if(!raw||raw.full_name!==project.repository||raw.private!==false)return null;
  return {
    repository:project.repository,
    url:'https://github.com/'+project.repository,
    default_branch:str(raw.default_branch,100),
    archived:typeof raw.archived==='boolean'?raw.archived:null,
    updated_at:iso(raw.updated_at),
    // No product progress, build-ready inference, or verified APK claim.
    release_ready:null
  };
}
function normalizedCommits(project,raw){
  if(!Array.isArray(raw))return null;
  return raw.slice(0,SAMPLE_LIMIT).map(item=>{
    const sha=item?.sha;
    if(typeof sha!=='string'||!shaSafe.test(sha)||item?.html_url!=='https://github.com/'+project.repository+'/commit/'+sha)return null;
    return {
      sha,short_sha:sha.slice(0,7),
      title:(str(item?.commit?.message,300)?.split('\n')[0]||'Untitled commit').slice(0,160),
      url:item.html_url,
      authored_at:iso(item?.commit?.author?.date),
      author:str(item?.author?.login,70)||str(item?.commit?.author?.name,70)||null,
    };
  }).filter(Boolean);
}
function normalizedPulls(project,raw){
  if(!Array.isArray(raw))return null;
  return raw.slice(0,SAMPLE_LIMIT).map(item=>{
    const number=item?.number;
    if(!Number.isSafeInteger(number)||number<=0||item?.html_url!=='https://github.com/'+project.repository+'/pull/'+number)return null;
    const merged_at=iso(item.merged_at);
    return {
      number,title:str(item.title,160)||'Untitled pull request',url:item.html_url,
      state:merged_at?'merged':item.state==='open'?'open':item.state==='closed'?'closed':'unknown',
      updated_at:iso(item.updated_at),merged_at,
    };
  }).filter(Boolean);
}
function sectionResponse(result,mapper,project,at){
  if(result.state!=='current')return unavailable(at,result.state);
  const data=mapper(project,result.value);
  if(data===null)return unavailable(at);
  if(Array.isArray(data))return {state:data.length?'current':'no_records',observed_at:at,items:data,data:null};
  return {state:'current',observed_at:at,items:[],data};
}
function simulatedWorkspace(project,at){
  return {
    ok:true,project_id:project.id,project,mode:'fixture',observed_at:at,
    scope:'SIMULATED DATA — sample evidence is not a claim about the repository',
    repository:{state:'simulated',observed_at:at,items:[],data:{repository:project.repository,url:'https://github.com/'+project.repository,default_branch:null,archived:null,updated_at:null,release_ready:null}},
    commits:{state:'simulated',observed_at:at,data:null,items:[
      {sha:null,short_sha:null,title:'Example: refine project interface',url:null,authored_at:null,author:'Sample only'},
      {sha:null,short_sha:null,title:'Example: add test coverage',url:null,authored_at:null,author:'Sample only'}]},
    pull_requests:{state:'simulated',observed_at:at,data:null,items:[
      {number:null,title:'Example: review proposed change',url:null,updated_at:null,state:'sample',merged_at:null}]},
    milestones:{state:'not_connected',items:[],notice:'Owner milestone drafts will be introduced in M4-E. No remote writing is enabled.'},
    release_ready:null
  };
}
export function createWorkspaceSource({mode='fixture',fetchImpl=globalThis.fetch,clock=()=>new Date()}={}){
  if(!['fixture','github'].includes(mode))throw Error('Unknown workspace source mode');
  return {
    async load(id){
      const project=byId.get(id);
      if(!project)return {ok:false,error:'project_not_found'};
      const at=observed(clock);
      if(mode==='fixture')return simulatedWorkspace(project,at);
      if(!repoSafe.test(project.repository))return {ok:false,error:'invalid_catalog_repository'};
      const base='https://api.github.com/repos/'+project.repository;
      const [repo,commits,pulls]=await Promise.all([
        readGitHub(base,fetchImpl,false),
        readGitHub(base+'/commits?per_page='+SAMPLE_LIMIT,fetchImpl,true),
        readGitHub(base+'/pulls?state=all&sort=updated&direction=desc&per_page='+SAMPLE_LIMIT,fetchImpl,true),
      ]);
      return {
        ok:true,project_id:project.id,project,mode:'github',observed_at:at,
        scope:'PUBLIC GITHUB — latest five returned items, not complete history or progress',
        repository:sectionResponse(repo,normalizedRepo,project,at),
        commits:sectionResponse(commits,normalizedCommits,project,at),
        pull_requests:sectionResponse(pulls,normalizedPulls,project,at),
        milestones:{state:'not_connected',items:[],notice:'Owner milestone drafts will be introduced in M4-E. No remote writing is enabled.'},
        release_ready:null
      };
    },
  };
}
