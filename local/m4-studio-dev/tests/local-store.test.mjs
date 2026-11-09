import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir, writeFile, lstat, rm, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLocalStore,defaultDataDir,VaultError} from '../local-store.mjs';

const fixture=()=>({project_id:'backlot',type:'note',title:'One local idea',body:'Do not put this in GitHub.'});
async function withTemp(run){const folder=await mkdtemp(join(tmpdir(),'nstudio-vault-'));try{return await run(folder)}finally{await rm(folder,{recursive:true,force:true})}}
const clock=()=>new Date('2026-11-09T12:00:00Z');

test('initial vault is empty and has no disk file until first save',()=>withTemp(async(dir)=>{
 const vault=createLocalStore({dataDir:dir,clock});
 assert.equal((await vault.status()).revision,0);
 assert.equal((await vault.list()).records.length,0);
 assert.deepEqual(await readdir(dir),[]);
}));
test('create persists to disk and survives a completely new process model',()=>withTemp(async(dir)=>{
 const store=createLocalStore({dataDir:dir,clock});
 const added=await store.create(0,fixture());
 assert.equal(added.revision,1);assert.equal(added.record.project_id,'backlot');
 const next=createLocalStore({dataDir:dir,clock});
 const state=await next.list();
 assert.equal(state.records[0].title,'One local idea');assert.equal(state.revision,1);
 const raw=JSON.parse(await readFile(next.file,'utf8'));assert.equal(raw.schema_version,1);
}));
test('update preserves immutable ID/project/type and increments revision',()=>withTemp(async(dir)=>{
 const store=createLocalStore({dataDir:dir,clock});
 const added=await store.create(0,fixture());
 const update=await store.update(1,added.record.id,{title:'Revised title',body:'Revised body'});
 assert.equal(update.revision,2);assert.equal(update.record.id,added.record.id);
 assert.equal(update.record.project_id,'backlot');assert.equal(update.record.body,'Revised body');
 assert.equal((await store.list()).records[0].title,'Revised title');
}));
test('delete is durable and leaves unrelated records intact',()=>withTemp(async(dir)=>{
 const store=createLocalStore({dataDir:dir,clock});
 const first=await store.create(0,fixture());
 await store.create(1,{...fixture(),title:'Second',project_id:'frame-one'});
 const gone=await store.delete(2,first.record.id);
 assert.equal(gone.record.deleted,true);
 const next=createLocalStore({dataDir:dir,clock});
 assert.equal((await next.list()).records.length,1);
 assert.equal((await next.list()).records[0].project_id,'frame-one');
}));
test('stale edit is refused; race between same revision allows at most one save',()=>withTemp(async(dir)=>{
 const store=createLocalStore({dataDir:dir,clock});
 const jobs=await Promise.allSettled([store.create(0,fixture()),store.create(0,{...fixture(),title:'Competing'})]);
 assert.equal(jobs.filter(x=>x.status==='fulfilled').length,1);
 const failed=jobs.find(x=>x.status==='rejected');
 assert.equal(failed.reason.code,'stale_revision');
 assert.equal((await store.list()).records.length,1);
}));
test('unknown projects, excessive length and client-supplied IDs are rejected',()=>withTemp(async(dir)=>{
 const store=createLocalStore({dataDir:dir,clock});
 for(const item of [{...fixture(),project_id:'secret'},{...fixture(),title:' '},{...fixture(),title:'x'.repeat(141)},{...fixture(),body:'b'.repeat(6001)},{...fixture(),id:'override'}]){
   assert.throws(()=>store.create(0,item),{code:'invalid_fields'});
 }
 assert.equal((await store.list()).records.length,0);
}));
test('update cannot change association or type; unknown draft cannot be changed',()=>withTemp(async(dir)=>{
 const store=createLocalStore({dataDir:dir,clock});
 const added=await store.create(0,fixture());
 assert.throws(()=>store.update(1,added.record.id,{project_id:'bridge'}),{code:'invalid_fields'});
 await assert.rejects(store.update(1,'a'.repeat(36),{title:'Unknown'}),{code:'draft_not_found'});
 assert.equal((await store.list()).revision,1);
}));
test('corrupted file fails closed and is never replaced by a new empty vault',()=>withTemp(async(dir)=>{
 const store=createLocalStore({dataDir:dir,clock});
 await store.create(0,fixture());
 await writeFile(store.file,'{ corrupt records','utf8');
 await assert.rejects(store.list(),{code:'vault_integrity_error'});
 await assert.rejects(store.create(1,fixture()),{code:'vault_integrity_error'});
 assert.equal(await readFile(store.file,'utf8'),'{ corrupt records');
}));
test('symlink data file is not read or rewritten',()=>withTemp(async(dir)=>{
 const store=createLocalStore({dataDir:dir,clock});
 const external=join(dir,'external.json');await writeFile(external,'PRIVATE');
 await symlink(external,store.file);
 await assert.rejects(store.list(),{code:'vault_integrity_error'});
 await assert.rejects(store.create(0,fixture()),{code:'vault_integrity_error'});
 assert.equal(await readFile(external,'utf8'),'PRIVATE');
}));
test('persistent vault uses narrow filesystem permissions on POSIX',()=>withTemp(async(dir)=>{
 const store=createLocalStore({dataDir:join(dir,'inner'),clock});await store.create(0,fixture());
 const fileMode=(await lstat(store.file)).mode&0o777;
 if(process.platform!=='win32')assert.equal(fileMode,0o600);
}));
test('no extra temporary files remain following successful save',()=>withTemp(async(dir)=>{
 const store=createLocalStore({dataDir:dir,clock});await store.create(0,fixture());
 assert.deepEqual(await readdir(dir),['studio-drafts.v1.json']);
}));
test('default OS folder is outside the checkout and Windows uses LOCALAPPDATA',()=>{
 const windows=defaultDataDir({os:'win32',home:'C:\\Users\\Studio',env:{LOCALAPPDATA:'C:\\Users\\Studio\\AppData\\Local'}});
 assert.match(windows,/NavinStudio/);assert.match(windows,/ControlRoom/);
 const linux=defaultDataDir({os:'linux',home:'/home/studio',env:{}});assert.match(linux,/\.local/);
});
