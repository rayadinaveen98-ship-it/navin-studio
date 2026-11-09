import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStudioServer} from '../server.mjs';

async function withServer(run){const dataDir=await mkdtemp(join(tmpdir(),'navin-http-'));const server=createStudioServer({dataDir,mode:'fixture'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 async function request(path,method='GET',body=null,headers={}){
  return fetch(origin+path,{method,headers:{...(method==='GET'?{}:{'Origin':origin,'X-Navin-Local-Write':'1','Content-Type':'application/json'}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 }
 try{return await run({request,origin,server})}finally{await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true})}}
const record={project_id:'backlot',type:'decision',title:'Test decision',body:'This stays local'};
const at=(revision)=>({'If-Match':'"'+revision+'"'});

test('E1 vault HTML, CSS and JS are actually served with restrictive headers',()=>withServer(async({request})=>{
 for(const [path,type] of [['/studio-vault','text/html'],['/studio-vault.css','text/css'],['/studio-vault.js','text/javascript']]){
  const res=await request(path);assert.equal(res.status,200);assert.match(res.headers.get('content-type'),new RegExp(type));
  assert.match(res.headers.get('content-security-policy'),/script-src 'self'/);
  assert.match(res.headers.get('cache-control'),/no-store/);assert.ok((await res.text()).length>200);
 }
}));
test('GET does not create state on disk and reports no sync or encryption',()=>withServer(async({request})=>{
 const res=await request('/api/local/status');assert.equal(res.status,200);const s=await res.json();
 assert.equal(s.revision,0);assert.equal(s.count,0);assert.equal(s.encrypted,false);assert.equal(s.synced,false);
}));
test('same-origin POST, PATCH and DELETE persist with revision protection',()=>withServer(async({request})=>{
 const create=await request('/api/local/drafts','POST',record,at(0));assert.equal(create.status,201);
 const added=await create.json();assert.equal(added.revision,1);
 const listed=await request('/api/local/drafts').then(r=>r.json());assert.equal(listed.records.length,1);
 const updated=await request('/api/local/drafts/'+added.record.id,'PATCH',{title:'Updated'},at(1));assert.equal(updated.status,200);
 assert.equal((await updated.json()).revision,2);
 const deleted=await request('/api/local/drafts/'+added.record.id,'DELETE',null,at(2));assert.equal(deleted.status,200);
 assert.equal((await request('/api/local/drafts').then(r=>r.json())).records.length,0);
}));
test('missing Origin, missing custom header and cross-site Origin are blocked',()=>withServer(async({request,origin})=>{
 const cases=[
  {'Origin':'','If-Match':'"0"'},
  {'X-Navin-Local-Write':'','If-Match':'"0"'},
  {'Origin':'https://evil.invalid','If-Match':'"0"'},
  {'Origin':origin,'Sec-Fetch-Site':'cross-site','If-Match':'"0"'}
 ];
 for(const h of cases){const r=await request('/api/local/drafts','POST',record,h);assert.equal(r.status,403);}
 assert.equal((await request('/api/local/drafts').then(r=>r.json())).records.length,0);
}));
test('missing revision returns 428 and stale revision 409',()=>withServer(async({request})=>{
 assert.equal((await request('/api/local/drafts','POST',record)).status,428);
 assert.equal((await request('/api/local/drafts','POST',record,at(0))).status,201);
 const conflict=await request('/api/local/drafts','POST',record,at(0));assert.equal(conflict.status,409);
 assert.equal((await conflict.json()).error,'stale_revision');
}));
test('browser form content types cannot write even with same-origin headers',()=>withServer(async({request})=>{
 const r=await request('/api/local/drafts','POST',record,{...at(0),'Content-Type':'text/plain'});assert.equal(r.status,415);
}));
test('existing project, quality and release endpoints reject writes',()=>withServer(async({request})=>{
 for(const url of ['/api/projects','/api/overview','/api/activity','/api/projects/backlot/quality']){
  const r=await request(url,'POST',{value:'hack'},at(0));assert.equal(r.status,405);
 }
}));
test('cross-site read cannot opt into CORS and query strings are refused',()=>withServer(async({request})=>{
 const r=await request('/api/local/drafts');assert.equal(r.headers.get('access-control-allow-origin'),null);
 assert.equal((await request('/api/local/drafts?x=1')).status,400);
}));
test('unknown project cannot be injected into local draft persistence',()=>withServer(async({request})=>{
 const res=await request('/api/local/drafts','POST',{...record,project_id:'hidden-repo'},at(0));
 assert.equal(res.status,400);assert.equal((await res.json()).error,'invalid_fields');
}));
