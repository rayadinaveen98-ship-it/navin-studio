import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,readdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackupManager} from '../backup-manager.mjs';
import {createLocalStore} from '../local-store.mjs';
import {createProjectOperations} from '../project-operations.mjs';
import {createStudioPlanning} from '../studio-planning.mjs';
const CLOCK=()=>new Date('2026-11-09T13:30:00Z');
async function tmp(fn){const dir=await mkdtemp(join(tmpdir(),'navin-e4-backup-'));try{return await fn(dir)}finally{await rm(dir,{recursive:true,force:true})}}
async function seed(dir){
 const v=createLocalStore({dataDir:dir,clock:CLOCK});const ops=createProjectOperations({dataDir:dir,clock:CLOCK});const p=createStudioPlanning({dataDir:dir,clock:CLOCK,operations:ops});
 await v.create(0,{project_id:'backlot',type:'note',title:'Local note',body:'Example private draft'});
 const task=await ops.create(0,{project_id:'backlot',kind:'task',title:'Verify backups',details:'No external writes',status:'backlog',due_date:null});
 await p.create(0,{project_id:'backlot',kind:'priority',title:'Test restore',details:'',date:'2026-11-09',start_time:null,duration_minutes:null,linked_operation_id:task.record.id,status:'planned'});
 return {v,ops,p};
}
const expectCode=(code)=>e=>e.code===code;

test('E4 first export is empty, versioned, checksum-labeled and creates no data files',()=>tmp(async dir=>{
 const m=createBackupManager({dataDir:dir,clock:CLOCK});const x=await m.createExport();
 assert.deepEqual(x.counts,{drafts:0,operations:0,planning:0});assert.equal(x.backup.format_version,1);
 assert.equal(x.backup.created_at,'2026-11-09T13:30:00.000Z');
 assert.equal(x.backup.datasets.drafts.sha256.length,64);
 assert.deepEqual(await readdir(dir),[]);
}));
test('E4 exports all three real datasets with full history, links and dates',()=>tmp(async dir=>{
 const {ops}=await seed(dir);const rec=(await ops.list()).records[0];await ops.update(1,rec.id,{status:'in_progress'});
 const b=(await createBackupManager({dataDir:dir,clock:CLOCK}).createExport()).backup;
 assert.equal(b.datasets.drafts.snapshot.drafts.length,1);
 assert.equal(b.datasets.operations.snapshot.records[0].history.length,2);
 assert.equal(b.datasets.planning.snapshot.entries[0].linked_operation_id,rec.id);
}));
test('E4 preview contains accurate replacement counts but does not modify files',()=>tmp(async dir=>{
 const m=createBackupManager({dataDir:dir,clock:CLOCK});const original=(await m.createExport()).backup;
 const {v}=await seed(dir);const raw=await readFile(v.file,'utf8');
 const preview=await m.prepare(original);
 assert.deepEqual(preview.datasets.map(x=>[x.name,x.current_count,x.backup_count]),[['drafts',1,0],['operations',1,0],['planning',1,0]]);
 assert.equal(await readFile(v.file,'utf8'),raw);assert.equal(preview.preview_id.length,48);
}));
test('E4 restores all datasets, increments revisions and saves pre-restore safety copy',()=>tmp(async dir=>{
 await seed(dir);const m=createBackupManager({dataDir:dir,clock:CLOCK});const original=(await m.createExport()).backup;
 const {v,ops,p}=await seedMore(dir);
 const preview=await m.prepare(original);
 const result=await m.restore({preview_id:preview.preview_id,confirmation:'REPLACE LOCAL DATA'});
 assert.equal(result.ok,true);assert.equal(result.restored,true);
 assert.equal((await v.list()).records.length,1);
 assert.equal((await ops.list()).records.length,1);
 assert.equal((await p.list()).records.length,1);
 assert.ok((await v.list()).revision>original.datasets.drafts.snapshot.revision);
 const copy=JSON.parse(await readFile(join(dir,'pre-restore-safety-copy.v1.json'),'utf8'));
 assert.equal(copy.datasets.drafts.snapshot.drafts.length,2);
 assert.deepEqual((await readdir(dir)).filter(x=>x.includes('restore-pending')),[]);
}));
async function seedMore(dir){
 const v=createLocalStore({dataDir:dir,clock:CLOCK});const ops=createProjectOperations({dataDir:dir,clock:CLOCK});const p=createStudioPlanning({dataDir:dir,clock:CLOCK,operations:ops});
 await v.create(1,{project_id:'frame-one',type:'note',title:'Second note',body:'Second'});
 await ops.create(1,{project_id:'frame-one',kind:'milestone',title:'Second milestone'});
 await p.create(1,{project_id:'frame-one',kind:'priority',title:'Second priority',date:'2026-11-10',start_time:null,duration_minutes:null,linked_operation_id:null,details:'',status:'planned'});
 return {v,ops,p};
}
test('E4 preview rejects backup with modified data but original checksum',()=>tmp(async dir=>{
 const m=createBackupManager({dataDir:dir,clock:CLOCK});const backup=(await m.createExport()).backup;
 backup.datasets.drafts.snapshot.drafts.push({malformed:true});
 await assert.rejects(m.prepare(backup),e=>['invalid_backup_dataset_drafts','backup_checksum_mismatch'].includes(e.code));
}));
test('E4 preview rejects checksum mismatch for otherwise valid revision edit',()=>tmp(async dir=>{
 const m=createBackupManager({dataDir:dir,clock:CLOCK});const backup=(await m.createExport()).backup;
 backup.datasets.drafts.snapshot.revision=7;
 await assert.rejects(m.prepare(backup),expectCode('backup_checksum_mismatch'));
}));
test('E4 preview rejects unknown formats, extra keys and incomplete datasets',()=>tmp(async dir=>{
 const m=createBackupManager({dataDir:dir,clock:CLOCK});const b=(await m.createExport()).backup;
 for(const invalid of [{...b,format:'third-party'}, {...b,malicious:1},{...b,datasets:{drafts:b.datasets.drafts}},{...b,format_version:2}]){
  await assert.rejects(m.prepare(invalid),expectCode('invalid_backup_format'));
 }
}));
test('E4 restore requires current valid preview and exact explicit typed confirmation',()=>tmp(async dir=>{
 const m=createBackupManager({dataDir:dir,clock:CLOCK});const b=(await m.createExport()).backup;const p=await m.prepare(b);
 await assert.rejects(m.restore({preview_id:p.preview_id,confirmation:'yes'}),expectCode('restore_confirmation_required'));
 await assert.rejects(m.restore({preview_id:'nope',confirmation:'REPLACE LOCAL DATA'}),expectCode('restore_preview_required'));
 assert.equal((await m.restore({preview_id:p.preview_id,confirmation:'REPLACE LOCAL DATA'})).restored,true);
 await assert.rejects(m.restore({preview_id:p.preview_id,confirmation:'REPLACE LOCAL DATA'}),expectCode('restore_preview_required'));
}));
test('E4 restore refuses changed local data after preview, preserving newer edit',()=>tmp(async dir=>{
 const {v}=await seed(dir);const m=createBackupManager({dataDir:dir,clock:CLOCK});const b=(await m.createExport()).backup;const p=await m.prepare(b);
 await v.create(1,{project_id:'backlot',type:'note',title:'Newer work',body:'Never lose this'});
 await assert.rejects(m.restore({preview_id:p.preview_id,confirmation:'REPLACE LOCAL DATA'}),expectCode('restore_source_changed'));
 assert.equal((await v.list()).records.length,2);
}));
test('E4 restore refuses damaged on-disk store and leaves original damaged bytes untouched',()=>tmp(async dir=>{
 const {v}=await seed(dir);const m=createBackupManager({dataDir:dir,clock:CLOCK});const b=(await m.createExport()).backup;
 await writeFile(v.file,'{broken','utf8');
 await assert.rejects(m.prepare(b),expectCode('storage_integrity_error'));
 await assert.rejects(m.createExport(),expectCode('storage_integrity_error'));
 assert.equal(await readFile(v.file,'utf8'),'{broken');
}));
test('E4 restore rolls back all three sources on a mid-write failure',()=>tmp(async dir=>{
 await seed(dir);const first=createBackupManager({dataDir:dir,clock:CLOCK});const original=(await first.createExport()).backup;
 const {v,ops,p}=await seedMore(dir);
 let writes=0;const fail=createBackupManager({dataDir:dir,clock:CLOCK,replaceWrite:async()=>{if(++writes===2)throw Error('disk failure');}});
 const preview=await fail.prepare(original);
 await assert.rejects(fail.restore({preview_id:preview.preview_id,confirmation:'REPLACE LOCAL DATA'}),expectCode('restore_failed_rolled_back'));
 assert.equal((await v.list()).records.length,2);assert.equal((await ops.list()).records.length,2);assert.equal((await p.list()).records.length,2);
}));
test('E4 startup recovers interrupted transaction with journal and restores originals',()=>tmp(async dir=>{
 await seed(dir);const m=createBackupManager({dataDir:dir,clock:CLOCK});const base=(await m.createExport()).backup;
 const {v}=await seedMore(dir);const current=(await v.list()).records.length;
 // Simulate process death without rollback by making rollback fail only for the
 // test, then verify that a new manager on restart can finish recovery.
 const {mkdir,writeFile:put,rename:mv}=await import('node:fs/promises');
 const orig=JSON.parse((await m.createExport()).json);
 const stage=join(dir,'.navin-restore-pending-v1');await mkdir(stage);
 const originals=Object.fromEntries(['drafts','operations','planning'].map(k=>[k,{existed:true,snapshot:orig.datasets[k].snapshot}]));
 await put(join(stage,'journal.json'),JSON.stringify({version:1,originals}));
 await put(v.file,JSON.stringify(base.datasets.drafts.snapshot));
 const restarted=createBackupManager({dataDir:dir,clock:CLOCK});const res=await restarted.recover();
 assert.equal(res.recovered,true);assert.equal((await v.list()).records.length,current);
 assert.equal((await restarted.recover()).recovered,false);
}));
test('E4 completed journal is cleaned without undoing successfully restored state',()=>tmp(async dir=>{
 await seed(dir);const m=createBackupManager({dataDir:dir,clock:CLOCK});const exp=(await m.createExport()).backup;
 const {mkdir,writeFile:put}=await import('node:fs/promises');
 const pending=join(dir,'.navin-restore-pending-v1');await mkdir(pending);
 const orig=Object.fromEntries(['drafts','operations','planning'].map(k=>[k,{existed:true,snapshot:exp.datasets[k].snapshot}]));
 await put(join(pending,'journal.json'),JSON.stringify({version:1,originals:orig}));
 await put(join(pending,'completed'),'committed\n');
 const res=await m.recover();assert.equal(res.recovered,false);assert.equal(res.completed,true);
 assert.equal((await m.createExport()).counts.drafts,1);
}));
test('E4 detects symlink in data file and refuses to export or restore',()=>tmp(async dir=>{
 const outside=join(dir,'outside.json');await writeFile(outside,'PRIVATE');
 await symlink(outside,join(dir,'studio-drafts.v1.json'));
 await assert.rejects(createBackupManager({dataDir:dir}).createExport(),expectCode('storage_integrity_error'));
 assert.equal(await readFile(outside,'utf8'),'PRIVATE');
}));
test('E4 preview expires after five minutes',()=>tmp(async dir=>{
 let time=new Date('2026-11-09T10:00:00Z');const m=createBackupManager({dataDir:dir,clock:()=>time});const b=(await m.createExport()).backup;
 const p=await m.prepare(b);time=new Date('2026-11-09T10:06:00Z');
 await assert.rejects(m.restore({preview_id:p.preview_id,confirmation:'REPLACE LOCAL DATA'}),expectCode('restore_preview_expired'));
}));
