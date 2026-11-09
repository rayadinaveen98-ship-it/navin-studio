/**
 * M4-D3 — public GitHub Actions read-only QA observatory.
 * Fixed project allowlist, bounded response parsing, explicit run/job evidence.
 * A green CI run is NEVER evidence of a release-ready/signed Android APK.
 */
import {projects} from './source-adapter.mjs';
import {readGitHub} from './workspace-source.mjs';

const byId=new Map(projects.map(p=>[p.id,p]));
const RUN_LIMIT=5, JOB_LIMIT=10;
const SHA=/^[0-9a-f]{40}$/;
const REPO=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const at=(clock)=>{const d=clock();return d instanceof Date&&Number.isFinite(d.getTime())?d.toISOString():null;};
const iso=(v)=>typeof v==='string'&&!Number.isNaN(Date.parse(v))?new Date(v).toISOString():null;
const bounded=(v,n=150)=>typeof v==='string'?v.trim().slice(0,n):null;
const unknown=(observed_at,state='unavailable')=>({state,observed_at,items:[],total_count:null,release_ready:null});
const fixedBase=(p)=>'https://api.github.com/repos/'+p.repository;
const sourceBase=(p)=>'https://github.com/'+p.repository+'/actions/runs/';

function normalizeRun(p,row){
  if(!row||!Number.isSafeInteger(row.id)||row.id<1)return null;
  const url=sourceBase(p)+row.id;
  if(row.html_url!==url || !SHA.test(row.head_sha||''))return null;
  if(row.repository?.full_name && row.repository.full_name!==p.repository)return null;
  return {
    id:row.id, url, name:bounded(row.name,160)||'Unnamed workflow',
    run_number:Number.isSafeInteger(row.run_number)&&row.run_number>0?row.run_number:null,
    run_attempt:Number.isSafeInteger(row.run_attempt)&&row.run_attempt>0?row.run_attempt:null,
    status:bounded(row.status,40)||'unknown', conclusion:bounded(row.conclusion,40),
    head_sha:row.head_sha,short_sha:row.head_sha.slice(0,7),
    branch:bounded(row.head_branch,160),event:bounded(row.event,90),
    created_at:iso(row.created_at),updated_at:iso(row.updated_at),
    release_ready:null,android_test_verified:null,signing_verified:null,
  };
}
function normalizeJob(p,runId,row){
  if(!row||!Number.isSafeInteger(row.id)||row.id<1)return null;
  const url=sourceBase(p)+runId+'/job/'+row.id;
  if(row.html_url!==url || row.run_id!==runId)return null;
  return {
    id:row.id, run_id:runId,url,name:bounded(row.name,160)||'Unnamed job',
    status:bounded(row.status,40)||'unknown',conclusion:bounded(row.conclusion,40),
    started_at:iso(row.started_at),completed_at:iso(row.completed_at),
    qa_scope:'GitHub Actions job result only',android_test_verified:null,release_ready:null
  };
}
function demoRuns(p,observed_at){
  return {
    ok:true,project_id:p.id,mode:'fixture',observed_at,
    source:'SIMULATED DATA — NO REAL GITHUB REQUESTS',
    runs:{state:'simulated',observed_at,total_count:null,release_ready:null,items:[
      {id:null,url:null,name:'Example: workflow checks',run_number:null,run_attempt:null,status:'completed',conclusion:'sample only',head_sha:null,short_sha:null,branch:null,event:'sample',created_at:null,updated_at:null,release_ready:null,android_test_verified:null,signing_verified:null},
      {id:null,url:null,name:'Example: Android smoke test',run_number:null,run_attempt:null,status:'queued',conclusion:null,head_sha:null,short_sha:null,branch:null,event:'sample',created_at:null,updated_at:null,release_ready:null,android_test_verified:null,signing_verified:null}
    ]},
    note:'All workflow entries are illustrations. No APK, signing, device or release readiness is verified.'
  };
}
export function createQualitySource({mode='fixture',fetchImpl=globalThis.fetch,clock=()=>new Date()}={}){
  if(!['fixture','github'].includes(mode))throw Error('Unknown quality source mode');
  return {
    async runs(id){
      const project=byId.get(id);if(!project)return {ok:false,error:'project_not_found'};
      const observed_at=at(clock);
      if(mode==='fixture')return demoRuns(project,observed_at);
      if(!REPO.test(project.repository))return {ok:false,error:'invalid_catalog_repository'};
      const raw=await readGitHub(fixedBase(project)+'/actions/runs?per_page='+RUN_LIMIT,fetchImpl,false);
      if(raw.state!=='current')return {ok:true,mode,project_id:id,observed_at,source:'GitHub public Actions API',runs:unknown(observed_at,raw.state),note:'No build readiness can be inferred.'};
      const list=raw.value?.workflow_runs;
      if(!Array.isArray(list))return {ok:true,mode,project_id:id,observed_at,source:'GitHub public Actions API',runs:unknown(observed_at),note:'GitHub response did not contain a valid run list.'};
      const items=list.slice(0,RUN_LIMIT).map(item=>normalizeRun(project,item)).filter(Boolean);
      const total=Number.isSafeInteger(raw.value.total_count)&&raw.value.total_count>=0?raw.value.total_count:null;
      const state=list.length&&!items.length?'unavailable':items.length?'current':'no_records';
      return {ok:true,mode,project_id:id,observed_at,source:'GitHub public Actions API',runs:{state,observed_at,total_count:state==='current'||state==='no_records'?total:null,release_ready:null,items:state==='current'?items:[]},note:'Workflow conclusions are evidence of those runs only, not validated APK artifacts.'};
    },
    async jobs(id,runIdText){
      const project=byId.get(id);if(!project)return {ok:false,error:'project_not_found'};
      if(!/^[1-9]\d{0,15}$/.test(String(runIdText)))return {ok:false,error:'invalid_run_id'};
      const runId=Number(runIdText);if(!Number.isSafeInteger(runId))return {ok:false,error:'invalid_run_id'};
      const observed_at=at(clock);
      if(mode==='fixture')return {ok:true,project_id:id,mode,run_id:runId,observed_at,jobs:unknown(observed_at,'simulated'),note:'Simulated mode does not invent job evidence.'};
      if(!REPO.test(project.repository))return {ok:false,error:'invalid_catalog_repository'};
      const raw=await readGitHub(fixedBase(project)+'/actions/runs/'+runId+'/jobs?per_page='+JOB_LIMIT,fetchImpl,false);
      if(raw.state!=='current')return {ok:true,project_id:id,mode,run_id:runId,observed_at,jobs:unknown(observed_at,raw.state)};
      if(!Array.isArray(raw.value?.jobs))return {ok:true,project_id:id,mode,run_id:runId,observed_at,jobs:unknown(observed_at)};
      const items=raw.value.jobs.slice(0,JOB_LIMIT).map(item=>normalizeJob(project,runId,item)).filter(Boolean);
      const state=raw.value.jobs.length&&!items.length?'unavailable':items.length?'current':'no_records';
      return {ok:true,project_id:id,mode,run_id:runId,observed_at,jobs:{state,observed_at,items:state==='current'?items:[],total_count:null,release_ready:null},note:'GitHub jobs are not proof of signed artifact or physical device QA.'};
    },
  };
}
