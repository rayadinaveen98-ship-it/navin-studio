import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStudioServer} from '../server.mjs';
const p={project_id:'backlot',kind:'priority',title:'Backlot source check',details:'',date:'2026-11-09',start_time:null,duration_minutes:null,linked_operation_id:null,status:'planned'};
async function local(fn){const dir=await mkdtemp(join(tmpdir(),'navin-e3-http-')),server=createStudioServer({dataDir:dir});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const call=(path,{method='GET',payload,headers={}}={})=>fetch(origin+path,{method,headers:{...(method==='GET'?{}:{Origin:origin,'X-Navin-Local-Write':'1','If-Match':'"0"','Content-Type':'application/json'}),...headers},...(payload!==undefined?{body:JSON.stringify(payload)}:{})});
 try{await fn({call,origin,server})}finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true})}}
test('E3 page, CSS, JS and planning snapshot served from loopback with no caching',()=>local(async({call})=>{
 for(const path of ['/studio-planning','/studio-planning.css','/studio-planning.js']){const res=await call(path);assert.equal(res.status,200,path);assert.match(res.headers.get('cache-control'),/no-store/);assert.ok((await res.text()).length>500)}
 const initial=await (await call('/api/local/planning')).json();assert.equal(initial.revision,0);assert.deepEqual(initial.records,[]);
}));
test('E3 CREATE/PATCH/DELETE persists through HTTP and changes revision',()=>local(async({call})=>{
 let r=await call('/api/local/planning',{method:'POST',payload:p});assert.equal(r.status,201);const create=await r.json();assert.equal(create.revision,1);
 r=await call('/api/local/planning/'+create.record.id,{method:'PATCH',payload:{status:'done'},headers:{'If-Match':'"1"'}});assert.equal(r.status,200);assert.equal((await r.json()).revision,2);
 const listed=await (await call('/api/local/planning')).json();assert.equal(listed.records[0].status,'done');
 r=await call('/api/local/planning/'+create.record.id,{method:'DELETE',headers:{'If-Match':'"2"'}});assert.equal(r.status,200);assert.deepEqual((await (await call('/api/local/planning')).json()).records,[]);
}));
test('E3 write route rejects missing Origin, custom header, foreign origins and cross-site requests',()=>local(async({call})=>{
 for(const h of [{Origin:''},{'X-Navin-Local-Write':''},{Origin:'https://attacker.invalid'},{'Sec-Fetch-Site':'cross-site'}]){
  const r=await call('/api/local/planning',{method:'POST',payload:p,headers:h});assert.equal(r.status,403)
 }
}));
test('E3 rejects query bypasses, unsupported verbs, missing or stale revisions',()=>local(async({call})=>{
 assert.equal((await call('/api/local/planning?bypass=1')).status,400);
 assert.equal((await call('/api/local/planning',{method:'PUT',payload:p})).status,405);
 assert.equal((await call('/api/local/planning',{method:'POST',payload:p,headers:{'If-Match':''}})).status,428);
 assert.equal((await call('/api/local/planning',{method:'POST',payload:p})).status,201);
 assert.equal((await call('/api/local/planning',{method:'POST',payload:p})).status,409);
}));
test('E3 planning write cannot mutate public repo endpoints or E1/E2 records',()=>local(async({call})=>{
 assert.equal((await call('/api/projects',{method:'POST',payload:p})).status,405);
 assert.equal((await call('/api/projects/backlot/workspace',{method:'POST',payload:p})).status,405);
 assert.equal((await call('/api/local/planning',{method:'POST',payload:p})).status,201);
 assert.deepEqual((await (await call('/api/local/operations')).json()).records,[]);
 assert.deepEqual((await (await call('/api/local/drafts')).json()).records,[]);
}));
test('E3 rejects non-JSON writes and unexpected body on DELETE',()=>local(async({call})=>{
 const origin=(await call('/')).url.replace(/\/$/,'');
 const r=await fetch(origin+'/api/local/planning',{method:'POST',headers:{Origin:origin,'X-Navin-Local-Write':'1','If-Match':'"0"','Content-Type':'text/plain'},body:'hi'});assert.equal(r.status,415);
 const c=await (await call('/api/local/planning',{method:'POST',payload:p})).json();
 const d=await call('/api/local/planning/'+c.record.id,{method:'DELETE',payload:{bad:1},headers:{'If-Match':'"1"'}});
 assert.equal(d.status,400);
}));
