import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GET as me} from '../api/me.js';
import {GET as projects} from '../api/projects.js';
import {GET as overview} from '../api/overview.js';
import {GET as workspace} from '../api/workspace.js';
import {GET as quality} from '../api/quality.js';
import {GET as jobs} from '../api/jobs.js';
import {GET as activity} from '../api/activity.js';
import {projects as sourceProjects} from '../lib/source-adapter.mjs';
import {createWorkspaceSource,readGitHub} from '../lib/workspace-source.mjs';
import {createQualitySource} from '../lib/quality-source.mjs';
import {createActivitySource} from '../lib/activity-source.mjs';

const root=resolve(import.meta.dirname,'..');
const request=(path,method='GET')=>new Request('https://studio-preview.example'+path,{method});
const read=async res=>({status:res.status,data:await res.json(),headers:res.headers});

for (const [name,handler,path] of [
 ['me',me,'/api/me'],['catalog',projects,'/api/projects'],['overview',overview,'/api/overview'],['activity',activity,'/api/activity'],
 ['workspace',workspace,'/api/workspace?project=backlot'],['quality',quality,'/api/quality?project=backlot'],['jobs',jobs,'/api/jobs?project=backlot&run=1']
]) {
 test('GET-only: '+name, async()=>{
   for(const method of ['POST','PATCH','PUT','DELETE']){
     const res=await read(await handler(request(path,method)));
     assert.equal(res.status,405); assert.equal(res.data.error,'read_only');
   }
 });
}

test('No hosted owner login or fake role',async()=>{
 const res=await read(await me(request('/api/me')));
 assert.equal(res.status,200);assert.equal(res.data.role,'preview_read_only');
 assert.equal(res.data.mode,'github');assert.notEqual(res.data.role,'owner');
 assert.match(res.data.security,/deployment_protection_required/);
 assert.match(res.headers.get('cache-control'),/no-store/);
 assert.equal(res.headers.get('access-control-allow-origin'),null);
});

test('Eight fixed public source IDs, zero approved releases',async()=>{
 const dir=await read(await projects(request('/api/projects')));
 const ov=await read(await overview(request('/api/overview')));
 assert.equal(dir.data.mode,'github');assert.equal(dir.data.projects.length,8);
 assert.equal(new Set(dir.data.projects.map(p=>p.id)).size,8);
 assert.equal(ov.data.approved_public_release_count,0);
 assert.equal(ov.data.ci_success_count,null);
 for(const p of dir.data.projects){assert(sourceProjects.some(x=>x.id===p.id&&x.repository===p.repository));}
});

for(const path of ['/api/workspace?project=evil','/api/workspace?project=backlot&project=origin','/api/workspace?project=backlot&x=1','/api/quality?project=missing','/api/jobs?project=backlot&run=0','/api/jobs?project=backlot&run=1&run=2']) {
 test('Invalid query rejected: '+path,async()=>{
   const handler=path.startsWith('/api/workspace')?workspace:path.startsWith('/api/quality')?quality:jobs;
   const res=await read(await handler(request(path)));assert.equal(res.status,(path.match(/project=/g)||[]).length>1||(path.match(/run=/g)||[]).length>1?400:404);
 });
}

test('Vercel project has only public GET endpoints; no local/private store files',()=>{
 const config=JSON.parse(readFileSync(resolve(root,'vercel.json'),'utf-8'));
 assert.equal(config.rewrites.find(x=>x.source==='/workspace/:project')?.destination,'/workspace.html');
 const fsFiles=['studio-backup.js','studio-vault.html','studio-planning.html','studio-operations.html','local-store.mjs','project-operations.mjs','studio-planning.mjs'];
 for(const path of fsFiles){assert.throws(()=>readFileSync(resolve(root,path),'utf-8'))}
 assert.equal(config.rewrites.some(x=>x.source.startsWith('/api')),false);
 for(const name of ['index.html','workspace.html']){
   const html=readFileSync(resolve(root,name),'utf-8');
   assert(!html.includes('OPEN LOCAL PROJECT OPERATIONS'));
   assert(!/href="\/(?:studio-backup|studio-operations|studio-vault|studio-planning)"/.test(html));
   assert.match(html,/READ.ONLY|read.only/i);
 }
 const js=readFileSync(resolve(root,'workspace.js'),'utf-8');
 assert(!js.includes("'/api/projects/'+id+'/workspace'"));
 assert(js.includes("'/api/workspace?project='+id"));
 assert(js.includes("'/api/quality?project='+id"));
 assert(js.includes("'/api/jobs?project='+id"));
});

test('Source adapter rejects invalid response, mismatch and untrusted URLs',async()=>{
 const p=sourceProjects[0];
 const fake=async url=>{
  if(url.endsWith('/commits?per_page=5'))return Response.json([{sha:'a'.repeat(40),html_url:'https://evil.example/commit/'+ 'a'.repeat(40),commit:{message:'not trusted'}}]);
  if(url.includes('/pulls?'))return Response.json([]);
  return Response.json({full_name:'attacker/repo',private:false});
 };
 const x=await createWorkspaceSource({mode:'github',fetchImpl:fake}).load(p.id);
 assert.equal(x.ok,true);
 assert.equal(x.repository.state,'unavailable');assert.equal(x.commits.state,'no_records');
 assert.equal(x.pull_requests.state,'no_records');
 assert.equal(x.release_ready,null);
});

test('Quality API preserves missing data as unknown, never marks APK approved',async()=>{
 const out=await createQualitySource({mode:'github',fetchImpl:async()=>Response.json({workflow_runs:[]})}).runs('backlot');
 assert.equal(out.runs.state,'no_records');assert.equal(out.runs.release_ready,null);
});

test('Activity adapter does not follow any arbitrary repo or URL',async()=>{
 const calls=[];const res=await createActivitySource({mode:'github',fetchImpl:async url=>{calls.push(url);return Response.json([])}}).load();
 assert.equal(calls.length,8);assert.equal(res.source_count,8);
 assert.deepEqual(res.records,[]);assert(res.sources.every(x=>x.state==='no_records'));
 for(const u of calls)assert(sourceProjects.some(p=>u==='https://api.github.com/repos/'+p.repository+'/commits?per_page=1'));
});
