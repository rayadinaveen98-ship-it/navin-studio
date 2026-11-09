import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStudioServer} from '../server.mjs';
async function local(fn){
 const dir=await mkdtemp(join(tmpdir(),'navin-e4-http-'));
 const server=createStudioServer({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const call=(path,{method='GET',payload,headers={}}={})=>fetch(origin+path,{method,headers:{...(method==='GET'?{}:{Origin:origin,'X-Navin-Local-Write':'1','Content-Type':'application/json'}),...headers},...(payload!==undefined?{body:JSON.stringify(payload)}:{})});
 try{await fn({dir,origin,call})}finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true})}
}
const task={project_id:'backlot',kind:'task',title:'Backup verification',details:'',due_date:null,status:'backlog'};
const draft={project_id:'backlot',type:'note',title:'Original',body:'Private'};
const plan={project_id:'backlot',kind:'priority',title:'Tomorrow',details:'',date:'2026-11-10',start_time:null,duration_minutes:null,linked_operation_id:null,status:'planned'};
const json=async response=>({status:response.status,data:await response.json()});

test('E4 backup page, CSS, JS, local counts and download are served without caching',()=>local(async({call})=>{
 for(const path of ['/studio-backup','/studio-backup.css','/studio-backup.js']){const r=await call(path);assert.equal(r.status,200,path);assert.match(r.headers.get('cache-control'),/no-store/);assert.ok((await r.text()).length>500)}
 const info=await json(await call('/api/local/backup/info'));
 assert.deepEqual(info.data.counts,{drafts:0,operations:0,planning:0});assert.equal(info.data.encrypted,false);
 const response=await call('/api/local/backup/export');assert.equal(response.status,200);
 assert.match(response.headers.get('content-disposition'),/attachment; filename="NAVIN-STUDIO-backup-\d{4}-\d{2}-\d{2}\.json"/);
 assert.equal((await response.json()).format,'navin-studio-local-backup');
}));
test('E4 end-to-end through HTTP export, preview and restore preserves all three datasets',()=>local(async({call})=>{
 let r=await json(await call('/api/local/drafts',{method:'POST',payload:draft,headers:{'If-Match':'"0"'}}));assert.equal(r.status,201);
 r=await json(await call('/api/local/operations',{method:'POST',payload:task,headers:{'If-Match':'"0"'}}));assert.equal(r.status,201);
 r=await json(await call('/api/local/planning',{method:'POST',payload:plan,headers:{'If-Match':'"0"'}}));assert.equal(r.status,201);
 const backup=(await json(await call('/api/local/backup/export'))).data;
 await call('/api/local/drafts',{method:'POST',payload:{...draft,title:'Later'},headers:{'If-Match':'"1"'}});
 const preview=await json(await call('/api/local/backup/preview',{method:'POST',payload:{backup}}));
 assert.equal(preview.status,200);assert.deepEqual(preview.data.datasets.map(x=>x.current_count),[2,1,1]);
 assert.deepEqual(preview.data.datasets.map(x=>x.backup_count),[1,1,1]);
 assert.equal((await json(await call('/api/local/drafts'))).data.records.length,2,'preview is read-only');
 r=await json(await call('/api/local/backup/restore',{method:'POST',payload:{preview_id:preview.data.preview_id,confirmation:'REPLACE LOCAL DATA'}}));
 assert.equal(r.status,200);assert.equal(r.data.restored,true);
 for(const [path,expected] of [['drafts',1],['operations',1],['planning',1]]){
  const out=(await json(await call('/api/local/'+path))).data;assert.equal(out.records.length,expected,path);
 }
}));
test('E4 write protection requires origin and private custom header; cross-site writes denied',()=>local(async({call})=>{
 const backup=(await json(await call('/api/local/backup/export'))).data;
 for(const headers of [{Origin:''},{Origin:'https://other.invalid'},{'X-Navin-Local-Write':''},{'Sec-Fetch-Site':'cross-site'}]){
  const r=await call('/api/local/backup/preview',{method:'POST',payload:{backup},headers});assert.equal(r.status,403);
 }
 assert.equal((await call('/api/local/backup/restore',{method:'POST',payload:{preview_id:'x',confirmation:'REPLACE LOCAL DATA'},headers:{Origin:''}})).status,403);
}));
test('E4 rejects invalid JSON payload, invalid file, empty confirmation, unsupported HTTP methods',()=>local(async({call,origin})=>{
 const r=await fetch(origin+'/api/local/backup/preview',{method:'POST',headers:{Origin:origin,'X-Navin-Local-Write':'1','Content-Type':'text/plain'},body:'some backup'});assert.equal(r.status,415);
 assert.equal((await call('/api/local/backup/preview',{method:'POST',payload:{backup:{bad:1}}})).status,422);
 assert.equal((await call('/api/local/backup/restore',{method:'POST',payload:{preview_id:'test',confirmation:'yes'}})).status,400);
 assert.equal((await call('/api/local/backup/preview',{method:'PUT',payload:{}})).status,405);
 assert.equal((await call('/api/local/backup/export?bypass=1')).status,400);
}));
test('E4 refuse checksum tampering from browser and prevent stale edit after restore',()=>local(async({call})=>{
 await call('/api/local/drafts',{method:'POST',payload:draft,headers:{'If-Match':'"0"'}});
 const backup=(await json(await call('/api/local/backup/export'))).data;
 const altered=structuredClone(backup);altered.datasets.drafts.snapshot.revision=50;
 assert.equal((await call('/api/local/backup/preview',{method:'POST',payload:{backup:altered}})).status,422);
 const preview=(await json(await call('/api/local/backup/preview',{method:'POST',payload:{backup}}))).data;
 const restored=(await json(await call('/api/local/backup/restore',{method:'POST',payload:{preview_id:preview.preview_id,confirmation:'REPLACE LOCAL DATA'}}))).data;
 assert.equal(restored.restored,true);
 const stale=await call('/api/local/drafts',{method:'POST',payload:draft,headers:{'If-Match':'"1"'}});
 assert.equal(stale.status,409,'old tab cannot overwrite restored data');
}));
test('E4 restore refuses preview if local data changes after validation',()=>local(async({call})=>{
 const backup=(await json(await call('/api/local/backup/export'))).data;
 const p=(await json(await call('/api/local/backup/preview',{method:'POST',payload:{backup}}))).data;
 await call('/api/local/drafts',{method:'POST',payload:draft,headers:{'If-Match':'"0"'}});
 const result=await json(await call('/api/local/backup/restore',{method:'POST',payload:{preview_id:p.preview_id,confirmation:'REPLACE LOCAL DATA'}}));
 assert.equal(result.status,409);assert.equal(result.data.error,'restore_source_changed');
}));
test('E4 local reads fail closed if recovery journal is incomplete',()=>local(async({call,dir})=>{
 const {mkdir}=await import('node:fs/promises');await mkdir(join(dir,'.navin-restore-pending-v1'));
 assert.equal((await call('/api/local/drafts')).status,503);
 assert.equal((await call('/api/local/backup/export')).status,503);
 const before=await readFile(join(dir,'.navin-restore-pending-v1','journal.json'),'utf8').catch(()=>null);assert.equal(before,null);
}));
