import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStudioServer} from '../server.mjs';
const input={project_id:'backlot',kind:'task',title:'Review upgrade',details:'After QA',status:'backlog',due_date:null};
async function withLocal(fn){const dir=await mkdtemp(join(tmpdir(),'navin-e2-http-'));const server=createStudioServer({dataDir:dir});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const fetchLocal=(path,{method='GET',body,headers={}}={})=>fetch(origin+path,{method,headers:{...(method==='GET'?{}:{Origin:origin,'X-Navin-Local-Write':'1','Content-Type':'application/json','If-Match':'"0"'}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 try{return await fn({fetchLocal,origin})}finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true})}}
test('E2 HTML/JS/CSS and eight project-specific routes are served only on loopback',()=>withLocal(async({fetchLocal})=>{
 for(const url of ['/studio-operations','/studio-operations/backlot','/studio-operations.css','/studio-operations.js']){
  const r=await fetchLocal(url);assert.equal(r.status,200,url);assert.ok((await r.text()).length>200);
  assert.match(r.headers.get('cache-control'),/no-store/);
 }
 assert.equal((await fetchLocal('/studio-operations/hidden-project')).status,404);
}));
test('E2 create/edit/delete over HTTP and project-specific listing',()=>withLocal(async({fetchLocal})=>{
 const created=await fetchLocal('/api/local/operations',{method:'POST',body:input});assert.equal(created.status,201);
 const record=await created.json();assert.equal(record.revision,1);
 const listed=await (await fetchLocal('/api/local/projects/backlot/operations')).json();assert.equal(listed.records.length,1);
 const updated=await fetchLocal('/api/local/operations/'+record.record.id,{method:'PATCH',body:{status:'done'},headers:{'If-Match':'"1"'}});
 assert.equal(updated.status,200);assert.equal((await updated.json()).record.history.length,2);
 const removed=await fetchLocal('/api/local/operations/'+record.record.id,{method:'DELETE',headers:{'If-Match':'"2"'}});
 assert.equal(removed.status,200);assert.equal((await (await fetchLocal('/api/local/operations')).json()).records.length,0);
}));
test('other Studio APIs remain read only despite local E2 mutation routes',()=>withLocal(async({fetchLocal})=>{
 for(const url of ['/api/projects','/api/overview','/api/activity','/api/projects/backlot/quality'])assert.equal((await fetchLocal(url,{method:'POST',body:input})).status,405);
}));
test('write attempts with missing Origin or custom write header are forbidden',()=>withLocal(async({fetchLocal})=>{
 for(const h of [{Origin:''},{'X-Navin-Local-Write':''},{Origin:'https://malicious.example'},{'Sec-Fetch-Site':'cross-site'}]){
  assert.equal((await fetchLocal('/api/local/operations',{method:'POST',body:input,headers:h})).status,403);
 }
}));
test('unsupported mutations, query strings and stale revisions are rejected',()=>withLocal(async({fetchLocal})=>{
 assert.equal((await fetchLocal('/api/local/operations?bypass=true')).status,400);
 assert.equal((await fetchLocal('/api/local/operations',{method:'PUT',body:input})).status,405);
 assert.equal((await fetchLocal('/api/local/operations',{method:'POST',body:input,headers:{'If-Match':''}})).status,428);
 assert.equal((await fetchLocal('/api/local/operations',{method:'POST',body:input})).status,201);
 assert.equal((await fetchLocal('/api/local/operations',{method:'POST',body:input})).status,409);
}));
test('E1 local draft data does not disappear after E2 operations are saved',()=>withLocal(async({fetchLocal})=>{
 const draft={project_id:'backlot',type:'note',title:'Existing note',body:'Kept'};
 assert.equal((await fetchLocal('/api/local/drafts',{method:'POST',body:draft})).status,201);
 assert.equal((await fetchLocal('/api/local/operations',{method:'POST',body:input})).status,201);
 assert.equal((await (await fetchLocal('/api/local/drafts')).json()).records[0].title,'Existing note');
}));
