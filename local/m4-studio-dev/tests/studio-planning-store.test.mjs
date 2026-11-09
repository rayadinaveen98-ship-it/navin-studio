import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createProjectOperations} from '../project-operations.mjs';
import {createStudioPlanning} from '../studio-planning.mjs';
import {createLocalStore} from '../local-store.mjs';
const base={project_id:'backlot',kind:'priority',title:'Polish reminder UX',details:'Review scope',date:'2026-11-09',start_time:null,duration_minutes:null,linked_operation_id:null,status:'planned'};
async function sandbox(fn){const dir=await mkdtemp(join(tmpdir(),'navin-e3-'));try{return await fn(dir)}finally{await rm(dir,{recursive:true,force:true})}}
const store=(dir,operations=createProjectOperations({dataDir:dir}))=>createStudioPlanning({dataDir:dir,operations});
test('E3 begins empty in a separate versioned file',()=>sandbox(async dir=>{const s=store(dir);const data=await s.list();assert.equal(data.revision,0);assert.deepEqual(data.records,[]);assert.equal(data.encrypted,false);assert.equal(data.synced,false);assert.match(s.file,/studio-planning\.v1\.json$/)}));
test('E3 creates three priorities, persists across restart, rejects fourth priority for the same day',()=>sandbox(async dir=>{
 const s=store(dir);for(let i=0;i<3;i++)await s.create(i,{...base,title:'Priority '+i,project_id:i%2?'frame-one':'backlot'});
 assert.equal((await s.list()).records.length,3);
 await assert.rejects(()=>s.create(3,{...base,title:'Fourth'}),e=>e.code==='daily_priority_limit'&&e.status===409);
 const reopened=store(dir);assert.equal((await reopened.list()).records[0].title,'Priority 2');
 await reopened.create(3,{...base,title:'Tomorrow',date:'2026-11-10'});assert.equal((await reopened.list()).records.length,4);
}));
test('E3 time blocks validate time and duration and allow status toggles',()=>sandbox(async dir=>{
 const s=store(dir);const input={...base,kind:'session',start_time:'14:30',duration_minutes:90};const saved=await s.create(0,input);
 assert.equal(saved.record.start_time,'14:30');const updated=await s.update(1,saved.record.id,{status:'done',start_time:'16:00'});
 assert.equal(updated.record.status,'done');assert.equal(updated.record.duration_minutes,90);
 assert.equal((await s.list()).records[0].start_time,'16:00');
}));
test('E3 revisions reject stale updates and no-op edits, leave original intact',()=>sandbox(async dir=>{
 const s=store(dir);const saved=await s.create(0,base);const id=saved.record.id;
 await assert.rejects(()=>s.update(0,id,{status:'done'}),e=>e.code==='stale_revision');
 await assert.rejects(()=>s.update(1,id,{title:base.title}),e=>e.code==='no_changes');
 assert.equal((await s.list()).records[0].status,'planned');
 await s.update(1,id,{status:'done'});assert.equal((await s.list()).records[0].status,'done');
}));
test('E3 linked E2 task references are checked for project and kind',()=>sandbox(async dir=>{
 const operations=createProjectOperations({dataDir:dir}),s=store(dir,operations);
 const t=await operations.create(0,{project_id:'backlot',kind:'task',title:'Test reminder sync',details:'',status:'backlog',due_date:'2026-11-09'});
 const id=t.record.id;const saved=await s.create(0,{...base,linked_operation_id:id});
 assert.equal(saved.record.linked_operation_id,id);
 await assert.rejects(()=>s.create(1,{...base,project_id:'frame-one',linked_operation_id:id}),e=>e.code==='planning_link_not_found');
 await operations.delete(1,id);
 // Preserve an orphaned link through unrelated edits, but never approve a fresh broken link.
 await s.update(1,saved.record.id,{title:'Keep local planning even if task was removed'});
 await assert.rejects(()=>s.create(2,{...base,linked_operation_id:id,title:'Broken new link'}),e=>e.code==='planning_link_not_found');
}));
test('E3 link to a decision is rejected, tasks and milestones are accepted',()=>sandbox(async dir=>{
 const operations=createProjectOperations({dataDir:dir}),s=store(dir,operations);
 const op=await operations.create(0,{project_id:'backlot',kind:'decision',title:'Visual direction',details:'',status:'proposed',due_date:null});
 await assert.rejects(()=>s.create(0,{...base,linked_operation_id:op.record.id}),e=>e.code==='planning_link_not_found');
}));
test('E3 refuses invalid dates, projects, statuses, kinds, times and durations',()=>sandbox(async dir=>{
 const s=store(dir);const vals=[{date:'2026-02-30'},{date:'tomorrow'},{project_id:'private-app'},{status:'released'}, {kind:'release'},{start_time:'25:72'},
  {kind:'session',start_time:null,duration_minutes:30},{kind:'session',start_time:'10:00',duration_minutes:5},
  {kind:'session',start_time:'10:00',duration_minutes:500},{title:''},{title:'x'.repeat(141)},{details:'a'.repeat(1201)}, {random:true}, {linked_operation_id:'junk'}];
 for(const value of vals)assert.throws(()=>s.create(0,{...base,...value}),e=>e.code==='invalid_fields');
 assert.equal((await s.list()).revision,0);
}));
test('E3 prevents priority limit bypass by moving priorities into a full day',()=>sandbox(async dir=>{
 const s=store(dir);for(let i=0;i<3;i++)await s.create(i,{...base,title:'P'+i});
 const t=await s.create(3,{...base,title:'Move me',date:'2026-11-10'});
 await assert.rejects(()=>s.update(4,t.record.id,{date:'2026-11-09'}),e=>e.code==='daily_priority_limit');
}));
test('E3 task completion is independent from E2 status, even when linked',()=>sandbox(async dir=>{
 const ops=createProjectOperations({dataDir:dir}),s=store(dir,ops);
 const task=await ops.create(0,{project_id:'backlot',kind:'task',title:'Test reminder sync',details:'',status:'backlog',due_date:'2026-11-09'});
 const plan=await s.create(0,{...base,linked_operation_id:task.record.id});await s.update(1,plan.record.id,{status:'done'});
 assert.equal((await ops.list()).records[0].status,'backlog');
}));
test('E3 file remains independent from E1 and E2 files during writes and deletions',()=>sandbox(async dir=>{
 const notes=createLocalStore({dataDir:dir}),ops=createProjectOperations({dataDir:dir}),s=store(dir,ops);
 await notes.create(0,{project_id:'backlot',type:'note',title:'Existing note',body:'Preserve this'});
 await ops.create(0,{project_id:'backlot',kind:'milestone',title:'Release review',details:'',status:'planned',due_date:'2026-11-12'});
 const item=await s.create(0,base);await s.delete(1,item.record.id);
 assert.equal((await notes.list()).records[0].title,'Existing note');assert.equal((await ops.list()).records[0].title,'Release review');assert.deepEqual((await s.list()).records,[]);
}));
test('E3 refuses to overwrite corrupt JSON rather than silently resetting personal plans',()=>sandbox(async dir=>{
 const s=store(dir);await s.create(0,base);await writeFile(s.file,'{corrupt','utf8');
 await assert.rejects(()=>s.list(),e=>e.code==='planning_integrity_error');
 await assert.rejects(()=>s.create(0,base),e=>e.code==='planning_integrity_error');
 assert.equal(await readFile(s.file,'utf8'),'{corrupt');
}));
test('E3 refuses invalid existing document and duplicate ids',()=>sandbox(async dir=>{
 const s=store(dir),r=await s.create(0,base);const data=JSON.parse(await readFile(s.file,'utf8'));data.entries.push({...r.record});
 await writeFile(s.file,JSON.stringify(data));await assert.rejects(()=>s.list(),e=>e.code==='planning_integrity_error');
}));
test('E3 caps number of priorities in an imported snapshot',()=>sandbox(async dir=>{
 const s=store(dir);await s.create(0,base);const data=JSON.parse(await readFile(s.file,'utf8'));
 for(let i=1;i<4;i++)data.entries.push({...data.entries[0],id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,title:'Extra '+i});
 await writeFile(s.file,JSON.stringify(data));await assert.rejects(()=>s.list(),e=>e.code==='planning_integrity_error');
}));
test('E3 uses file permissions restricted on POSIX',()=>sandbox(async dir=>{const s=store(dir);await s.create(0,base);if(process.platform!=='win32')assert.equal((await stat(s.file)).mode&0o777,0o600)}));
test('E3 concurrent revisions serialize in a single process, only one wins',()=>sandbox(async dir=>{
 const s=store(dir);const result=await Promise.allSettled([s.create(0,{...base,title:'First'}),s.create(0,{...base,title:'Second'})]);
 assert.equal(result.filter(x=>x.status==='fulfilled').length,1);assert.equal(result.filter(x=>x.status==='rejected'&&x.reason.code==='stale_revision').length,1);
}));
