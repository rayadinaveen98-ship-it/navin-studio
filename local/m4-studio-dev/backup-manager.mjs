/** M4-E4 — manual offline Studio backups and crash-recoverable restore.
 * The JSON download contains plaintext owner-local drafts. No hosted API, secrets,
 * automatic cloud sync, encryption, or repository writes.
 */
import {randomBytes, randomUUID, createHash} from 'node:crypto';
import {mkdir, lstat, open, readFile, rename, rm, unlink, chmod} from 'node:fs/promises';
import {join, resolve, dirname} from 'node:path';
import {defaultDataDir, VaultError, validateVaultSnapshot} from './local-store.mjs';
import {validateOperationsSnapshot} from './project-operations.mjs';
import {validatePlanningSnapshot} from './studio-planning.mjs';

const FILES={drafts:'studio-drafts.v1.json',operations:'project-operations.v1.json',planning:'studio-planning.v1.json'};
const VALIDATORS={drafts:validateVaultSnapshot,operations:validateOperationsSnapshot,planning:validatePlanningSnapshot};
const EMPTY={drafts:'drafts',operations:'records',planning:'entries'};
const LIMITS={drafts:1024*1024,operations:4*1024*1024,planning:3*1024*1024};
const KEYS=Object.keys(FILES);
const FORMAT='navin-studio-local-backup';
const MAX_BACKUP=10*1024*1024;
const PENDING='.navin-restore-pending-v1';
const PREVIOUS='pre-restore-safety-copy.v1.json';
const bad=(code,status=400)=>new VaultError(code,status);
const isObject=(x)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const exact=(x,keys)=>isObject(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const hash=(value)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stamp=(clock)=>{const v=clock();if(!(v instanceof Date)||!Number.isFinite(v.getTime()))throw bad('clock_unavailable',503);return v.toISOString()};
const defaultSnapshot=k=>({schema_version:1,revision:0,updated_at:'1970-01-01T00:00:00.000Z',[EMPTY[k]]:[]});

function checkSnapshot(k,x){
  try{VALIDATORS[k](x)}catch{throw bad('invalid_backup_dataset_'+k,422)}
  if(Buffer.byteLength(JSON.stringify(x),'utf8')>LIMITS[k])throw bad('backup_dataset_too_large',413);
  return x;
}
function makeBackup(snapshots,clock){
  const datasets={};
  for(const k of KEYS)datasets[k]={sha256:hash(snapshots[k]),snapshot:snapshots[k]};
  return {format:FORMAT,format_version:1,created_at:stamp(clock),datasets};
}
function validateBackup(upload){
  if(!exact(upload,['format','format_version','created_at','datasets'])||upload.format!==FORMAT||upload.format_version!==1||
    typeof upload.created_at!=='string'||!Number.isFinite(Date.parse(upload.created_at))||
    !exact(upload.datasets,KEYS))throw bad('invalid_backup_format',422);
  const snapshots={};
  for(const k of KEYS){
    const item=upload.datasets[k];
    if(!exact(item,['sha256','snapshot'])||typeof item.sha256!=='string'||!/^[a-f0-9]{64}$/.test(item.sha256))throw bad('invalid_backup_format',422);
    snapshots[k]=checkSnapshot(k,item.snapshot);
    if(hash(snapshots[k])!==item.sha256)throw bad('backup_checksum_mismatch',422);
  }
  if(Buffer.byteLength(JSON.stringify(upload),'utf8')>MAX_BACKUP)throw bad('backup_too_large',413);
  return snapshots;
}
async function safeFile(path,maxBytes){
  let st;
  try{st=await lstat(path)}catch(e){if(e?.code==='ENOENT')return null;throw bad('storage_unavailable',503)}
  if(!st.isFile()||st.isSymbolicLink()||st.size>maxBytes)throw bad('storage_integrity_error',503);
  try{return await readFile(path,'utf8')}catch{throw bad('storage_unavailable',503)}
}
async function safeDirectory(dir){
  await mkdir(dir,{recursive:true,mode:0o700});
  const st=await lstat(dir);
  if(!st.isDirectory()||st.isSymbolicLink())throw bad('unsafe_storage_directory',503);
  if(process.platform!=='win32')await chmod(dir,0o700);
}
async function atomicWrite(path,value){
  const folder=dirname(path);
  await safeDirectory(folder);
  let tmp=path+'.'+randomUUID()+'.tmp';
  try{
    const handle=await open(tmp,'wx',0o600);
    try{await handle.writeFile(value,'utf8');await handle.sync()}finally{await handle.close()}
    await rename(tmp,path);tmp=null;
    if(process.platform!=='win32')await chmod(path,0o600);
  }finally{if(tmp)await unlink(tmp).catch(()=>{})}
}
async function durableDirectory(dir){
  if(process.platform!=='win32')try{const h=await open(dir,'r');try{await h.sync()}finally{await h.close()}}catch{}
}

export function createBackupManager({dataDir=defaultDataDir(),clock=()=>new Date(),replaceWrite=atomicWrite}={}){
  const dir=resolve(dataDir);
  const pendingPath=join(dir,PENDING);
  let preview=null;
  // Request serialization is provided by the local HTTP server. Consumers calling
  // this manager directly must also serialize their own independent writes.
  async function readCurrent(){
    const originals={},snapshots={};
    for(const k of KEYS){
      const content=await safeFile(join(dir,FILES[k]),LIMITS[k]);
      originals[k]={existed:content!==null,snapshot:content===null?null:null};
      let snapshot;
      if(content===null)snapshot=defaultSnapshot(k);
      else {
        try{snapshot=JSON.parse(content);VALIDATORS[k](snapshot)}
        catch{throw bad('storage_integrity_error',503)}
      }
      originals[k].snapshot=content===null?null:snapshot;
      snapshots[k]=snapshot;
    }
    return {snapshots,originals};
  }
  async function recover(){
    let state;
    try{state=await lstat(pendingPath)}catch(e){if(e?.code==='ENOENT')return {recovered:false};throw bad('restore_recovery_unavailable',503)}
    if(!state.isDirectory()||state.isSymbolicLink())throw bad('restore_recovery_invalid',503);
    const raw=await safeFile(join(pendingPath,'journal.json'),MAX_BACKUP);
    if(raw===null)throw bad('restore_recovery_invalid',503);
    let journal;
    try{journal=JSON.parse(raw)}catch{throw bad('restore_recovery_invalid',503)}
    if(!exact(journal,['version','originals'])||journal.version!==1||!exact(journal.originals,KEYS))throw bad('restore_recovery_invalid',503);
    for(const k of KEYS){
      const orig=journal.originals[k];
      if(!exact(orig,['existed','snapshot'])||typeof orig.existed!=='boolean'||(orig.existed?orig.snapshot===null:orig.snapshot!==null))throw bad('restore_recovery_invalid',503);
      if(orig.existed)try{checkSnapshot(k,orig.snapshot)}catch{throw bad('restore_recovery_invalid',503)}
    }
    const marker=await safeFile(join(pendingPath,'completed'),40);
    if(marker===null){
      for(const k of KEYS){
        const target=join(dir,FILES[k]);const original=journal.originals[k];
        if(original.existed)await atomicWrite(target,JSON.stringify(original.snapshot,null,2)+'\n');
        else await unlink(target).catch(e=>{if(e?.code!=='ENOENT')throw e});
      }
      await durableDirectory(dir);
    }else if(marker!=='committed\n')throw bad('restore_recovery_invalid',503);
    await rm(pendingPath,{recursive:true,force:false});
    await durableDirectory(dir);
    return {recovered:marker===null,completed:marker!==null};
  }
  async function createExport(){
    await recover();
    const {snapshots}=await readCurrent();
    const backup=makeBackup(snapshots,clock);
    const json=JSON.stringify(backup,null,2)+'\n';
    if(Buffer.byteLength(json)>MAX_BACKUP)throw bad('backup_too_large',413);
    return {backup,json,filename:'NAVIN-STUDIO-backup-'+backup.created_at.slice(0,10)+'.json',counts:Object.fromEntries(KEYS.map(k=>[k,snapshots[k][EMPTY[k]].length]))};
  }
  async function prepare(input){
    await recover();
    const snapshots=validateBackup(input);
    const current=await readCurrent();
    const observed=Object.fromEntries(KEYS.map(k=>[k,{hash:hash(current.snapshots[k]),existed:current.originals[k].existed}]));
    const now=clock();const expires=now.getTime()+5*60*1000;
    if(!Number.isFinite(expires))throw bad('clock_unavailable',503);
    preview={id:randomBytes(24).toString('hex'),expires,snapshots,observed};
    return {ok:true,preview_id:preview.id,expires_at:new Date(expires).toISOString(),created_at:input.created_at,
      datasets:KEYS.map(k=>({name:k,current_count:current.snapshots[k][EMPTY[k]].length,backup_count:snapshots[k][EMPTY[k]].length,
        current_revision:current.snapshots[k].revision,backup_revision:snapshots[k].revision})),
      note:'Restoring replaces all three local datasets. Download your current backup first. The downloaded file is plaintext.'};
  }
  async function restore({preview_id,confirmation}={}){
    if(typeof preview_id!=='string'||confirmation!=='REPLACE LOCAL DATA')throw bad('restore_confirmation_required',400);
    if(!preview||preview_id!==preview.id)throw bad('restore_preview_required',409);
    if(clock().getTime()>preview.expires){preview=null;throw bad('restore_preview_expired',409)}
    await recover();
    const current=await readCurrent();
    for(const k of KEYS){
      if(preview.observed[k].hash!==hash(current.snapshots[k])||preview.observed[k].existed!==current.originals[k].existed){
        preview=null;throw bad('restore_source_changed',409);
      }
    }
    const importing=preview.snapshots;preview=null;
    const updated={};
    for(const k of KEYS){
      updated[k]={...importing[k],revision:Math.max(current.snapshots[k].revision,importing[k].revision)+1,updated_at:stamp(clock)};
      checkSnapshot(k,updated[k]);
      if(Buffer.byteLength(JSON.stringify(updated[k],null,2)+'\n')>LIMITS[k])throw bad('backup_dataset_too_large',413);
    }
    await safeDirectory(dir);
    // Persist a recoverable pre-restore safety copy before any destination change.
    const safety=makeBackup(current.snapshots,clock);
    await atomicWrite(join(dir,PREVIOUS),JSON.stringify(safety,null,2)+'\n');
    // Stage all originals and only then publish the pending journal. A crash in
    // the middle is rolled back on the next local API request or startup.
    const stagePath=join(dir,'.restore-stage-'+randomUUID());
    await mkdir(stagePath,{mode:0o700});
    try{
      await atomicWrite(join(stagePath,'journal.json'),JSON.stringify({version:1,originals:current.originals},null,2)+'\n');
      await durableDirectory(stagePath);
      await rename(stagePath,pendingPath);
      await durableDirectory(dir);
    }catch(e){await rm(stagePath,{recursive:true,force:true}).catch(()=>{});throw bad('restore_staging_failed',503)}
    try{
      for(const k of KEYS)await replaceWrite(join(dir,FILES[k]),JSON.stringify(updated[k],null,2)+'\n');
      await durableDirectory(dir);
      const h=await open(join(pendingPath,'completed'),'wx',0o600);
      try{await h.writeFile('committed\n','utf8');await h.sync()}finally{await h.close()}
      await durableDirectory(pendingPath);
    }catch(e){
      try{await recover()}catch{throw bad('restore_recovery_required',503)}
      throw bad('restore_failed_rolled_back',503);
    }
    try{await recover()}catch{
      // The on-disk committed marker indicates data is valid even if cleanup
      // failed (e.g., transient Windows lock). Recovery will retry next time.
      return {ok:true,restored:true,cleanup_pending:true,revisions:Object.fromEntries(KEYS.map(k=>[k,updated[k].revision]))};
    }
    return {ok:true,restored:true,cleanup_pending:false,revisions:Object.fromEntries(KEYS.map(k=>[k,updated[k].revision]))};
  }
  return {dir,recover,createExport,prepare,restore};
}
