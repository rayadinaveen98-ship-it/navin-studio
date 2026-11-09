import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createProjectOperations} from '../project-operations.mjs';
async function data(fn){const dir=await mkdtemp(join(tmpdir(),'navin-e2-store-'));try{return await fn(dir)}finally{await rm(dir,{recursive:true,force:true})}}
const task={project_id:'backlot',kind:'task',title:'Verify reminder sync',details:'Review source evidence',status:'in_progress',due_date:'2026-11-12'};
const milestone={project_id:'frame-one',kind:'milestone',title:'Chapter progression',details:'Visible in app',status:'active',due_date:null};
const decision={project_id:'backlot',kind:'decision',title:'Approve design direction',details:'Pending owner review',status:'proposed',due_date:null};
test('E2 storage begins empty, independent of E1 Vault, no implicit file creation',()=>data(async dir=>{
 const store=createProjectOperations({dataDir:dir});const result=await store.list();
 assert.equal(result.revision,0);assert.deepEqual(result.records,[]);assert.equal(result.encrypted,false);assert.equal(result.synced,false);
}));
test('create task, milestone and decision then query by project',()=>data(async dir=>{
 const s=createProjectOperations({dataDir:dir});await s.create(0,task);await s.create(1,milestone);await s.create(2,decision);
 assert.equal((await s.list()).records.length,3);
 const backlot=await s.list('backlot');assert.equal(backlot.records.length,2);assert.ok(backlot.records.every(r=>r.project_id==='backlot'));
 const frame=await s.list('frame-one');assert.equal(frame.records.length,1);assert.equal(frame.records[0].kind,'milestone');
}));
test('updates preserve history and remain after reopening store',()=>data(async dir=>{
 const s=createProjectOperations({dataDir:dir});const first=await s.create(0,decision);const id=first.record.id;
 const revised=await s.update(1,id,{status:'accepted',title:'Visual direction accepted'});
 assert.equal(revised.revision,2);assert.equal(revised.record.history.length,2);
 const reopened=createProjectOperations({dataDir:dir});const items=(await reopened.list('backlot')).records;
 assert.equal(items[0].status,'accepted');assert.equal(items[0].history[1].status,'accepted');
 assert.equal(items[0].history[0].title,'Approve design direction');
}));
test('stale revision blocks concurrent update and old state is retained',()=>data(async dir=>{
 const s=createProjectOperations({dataDir:dir});const saved=await s.create(0,task);
 await assert.rejects(()=>s.update(0,saved.record.id,{status:'done'}),e=>e.status===409&&e.code==='stale_revision');
 const current=(await s.list()).records[0];assert.equal(current.status,'in_progress');
}));
test('deleting a record also removes its local revision history',()=>data(async dir=>{
 const s=createProjectOperations({dataDir:dir});const r=await s.create(0,decision);await s.update(1,r.record.id,{status:'accepted'});
 assert.equal((await s.delete(2,r.record.id)).record.deleted,true);
 assert.deepEqual((await s.list()).records,[]);
 assert.equal((await readFile(s.file,'utf8')).includes('Approve design direction'),false);
}));
test('invalid kinds/statuses/project IDs are refused without writing state',()=>data(async dir=>{
 const s=createProjectOperations({dataDir:dir});
 for(const value of [{...task,project_id:'secret'}, {...task,kind:'release'}, {...task,status:'ready_to_publish'},{...task,due_date:'2026-02-30'}]){
  assert.throws(()=>s.create(0,value),e=>e.code==='invalid_fields');
 }
 assert.equal((await s.list()).revision,0);
}));
test('record cannot change project/kind and statuses must match record type',()=>data(async dir=>{
 const s=createProjectOperations({dataDir:dir});const r=await s.create(0,task);
 assert.throws(()=>s.update(1,r.record.id,{project_id:'frame-one'}),e=>e.code==='invalid_fields');
 assert.throws(()=>s.update(1,r.record.id,{kind:'decision'}),e=>e.code==='invalid_fields');
 await assert.rejects(()=>s.update(1,r.record.id,{status:'accepted'}),e=>e.code==='invalid_fields');
 assert.equal((await s.list()).revision,1);
}));
test('no-op update does not create fictitious history',()=>data(async dir=>{
 const s=createProjectOperations({dataDir:dir});const r=await s.create(0,task);
 await assert.rejects(()=>s.update(1,r.record.id,{title:task.title}),e=>e.code==='no_changes');
 assert.equal((await s.list()).records[0].history.length,1);
}));
test('missing record and missing project return 404',()=>data(async dir=>{
 const s=createProjectOperations({dataDir:dir});
 await assert.rejects(()=>s.list('not-a-project'),e=>e.status===404);
 await assert.rejects(()=>s.delete(0,'a'.repeat(36)),e=>e.status===404);
}));
test('corrupted local file is never overwritten by a new save',()=>data(async dir=>{
 const s=createProjectOperations({dataDir:dir});await writeFile(s.file,'{ damaged','utf8');
 await assert.rejects(()=>s.list(),e=>e.code==='operations_integrity_error');
 await assert.rejects(()=>s.create(0,task),e=>e.code==='operations_integrity_error');
 assert.equal(await readFile(s.file,'utf8'),'{ damaged');
}));
test('fields have enforced size caps',()=>data(async dir=>{
 const s=createProjectOperations({dataDir:dir});
 assert.throws(()=>s.create(0,{...task,title:'a'.repeat(141)}),e=>e.code==='invalid_fields');
 assert.throws(()=>s.create(0,{...task,details:'b'.repeat(4001)}),e=>e.code==='invalid_fields');
 assert.throws(()=>s.create(0,{...task,title:'\u0000bad'}),e=>e.code==='invalid_fields');
}));
test('writes use restricted file permissions on supported POSIX systems',()=>data(async dir=>{
 const s=createProjectOperations({dataDir:dir});await s.create(0,task);
 if(process.platform!=='win32')assert.equal((await stat(s.file)).mode&0o777,0o600);
}));
