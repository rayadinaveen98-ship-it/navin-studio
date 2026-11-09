/** M4-E3 — local-only studio calendar and daily priorities.
 * Separate on-device file from E1 drafts and E2 project records.
 * No encryption, sync, GitHub writes, or automatic backup.
 */
import {mkdir,lstat,open,readFile,rename,unlink,chmod} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {defaultDataDir,VaultError} from './local-store.mjs';
import {projects} from './source-adapter.mjs';

const projectIds=new Set(projects.map(p=>p.id));
const MAX_ENTRIES=500, MAX_FILE=3*1024*1024, UUID=/^[0-9a-f-]{36}$/;
const allowed=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).every(k=>keys.includes(k));
const bad=()=>new VaultError('invalid_fields',400);
const dateOK=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const timeOK=value=>value===null||(typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value));
const instantOK=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const stamp=clock=>{const date=clock();if(!(date instanceof Date)||!Number.isFinite(date.getTime()))throw new VaultError('clock_unavailable',503);return date.toISOString()};
function text(value,limit,required=false){if(typeof value!=='string')throw bad();const valueTrimmed=value.trim();if((required&&!valueTrimmed)||valueTrimmed.length>limit||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(valueTrimmed))throw bad();return valueTrimmed}
function validateEntry(r){
 return allowed(r,['id','project_id','kind','title','details','date','start_time','duration_minutes','linked_operation_id','status','created_at','updated_at'])&&
  typeof r.id==='string'&&UUID.test(r.id)&&projectIds.has(r.project_id)&&['priority','session'].includes(r.kind)&&
  typeof r.title==='string'&&!!r.title.trim()&&r.title.length<=140&&typeof r.details==='string'&&r.details.length<=1200&&
  dateOK(r.date)&&timeOK(r.start_time)&&
  (r.kind==='priority'?(r.start_time===null&&r.duration_minutes===null):
   (r.start_time!==null&&Number.isSafeInteger(r.duration_minutes)&&r.duration_minutes>=15&&r.duration_minutes<=480))&&
  (r.linked_operation_id===null||(typeof r.linked_operation_id==='string'&&UUID.test(r.linked_operation_id)))&&
  ['planned','done'].includes(r.status)&&instantOK(r.created_at)&&instantOK(r.updated_at);
}
function validateSnapshot(snapshot){
 if(!allowed(snapshot,['schema_version','revision','updated_at','entries'])||snapshot.schema_version!==1||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<0||!instantOK(snapshot.updated_at)||!Array.isArray(snapshot.entries)||snapshot.entries.length>MAX_ENTRIES||!snapshot.entries.every(validateEntry)||new Set(snapshot.entries.map(x=>x.id)).size!==snapshot.entries.length)throw new VaultError('planning_integrity_error',503);
 const counts=new Map();
 for(const x of snapshot.entries){if(x.kind==='priority'){const n=(counts.get(x.date)||0)+1;if(n>3)throw new VaultError('planning_integrity_error',503);counts.set(x.date,n)}}
 return snapshot;
}
export function createStudioPlanning({dataDir=defaultDataDir(),clock=()=>new Date(),uid=randomUUID,operations}={}){
 const file=join(resolve(dataDir),'studio-planning.v1.json');let queue=Promise.resolve();
 async function read(){
  try{
   const stat=await lstat(file);
   if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_FILE)throw new VaultError('planning_integrity_error',503);
   return validateSnapshot(JSON.parse(await readFile(file,'utf8')));
  }catch(e){
   if(e?.code==='ENOENT')return {schema_version:1,revision:0,updated_at:'1970-01-01T00:00:00.000Z',entries:[]};
   if(e instanceof VaultError)throw e;
   if(e instanceof SyntaxError)throw new VaultError('planning_integrity_error',503);
   throw new VaultError('planning_unavailable',503);
  }
 }
 async function persist(snapshot){
  const dir=dirname(file);let temp=null;
  try{
   await mkdir(dir,{recursive:true,mode:0o700});
   const dirStat=await lstat(dir);if(!dirStat.isDirectory()||dirStat.isSymbolicLink())throw new Error('unsafe directory');
   if(process.platform!=='win32')await chmod(dir,0o700);
   const raw=JSON.stringify(snapshot,null,2)+'\n';if(Buffer.byteLength(raw,'utf8')>MAX_FILE)throw new VaultError('planning_capacity_exceeded',413);
   temp=file+'.'+uid()+'.tmp';const h=await open(temp,'wx',0o600);
   try{await h.writeFile(raw,'utf8');await h.sync()}finally{await h.close()}
   await rename(temp,file);temp=null;
   if(process.platform!=='win32'){
    await chmod(file,0o600);
    try{const h=await open(dir,'r');try{await h.sync()}finally{await h.close()}}catch{}
   }
  }catch(e){if(e instanceof VaultError)throw e;throw new VaultError('planning_unavailable',503)}
  finally{if(temp)await unlink(temp).catch(()=>{})}
 }
 async function validateLink(id,projectId){
  if(id===null)return;
  if(!operations||typeof operations.list!=='function')throw new VaultError('planning_dependency_unavailable',503);
  const r=await operations.list(projectId);
  if(!r.records.some(x=>x.id===id&&['task','milestone'].includes(x.kind)))throw new VaultError('planning_link_not_found',409);
 }
 function mutate(rev,fn){
  const next=queue.catch(()=>{}).then(async()=>{
   const previous=await read();
   if(!Number.isSafeInteger(rev)||rev<0)throw new VaultError('revision_required',428);
   if(rev!==previous.revision)throw new VaultError('stale_revision',409);
   const entries=structuredClone(previous.entries);const record=await fn(entries);
   const updated={schema_version:1,revision:previous.revision+1,updated_at:stamp(clock),entries};
   validateSnapshot(updated);await persist(updated);
   return {ok:true,revision:updated.revision,record};
  });
  queue=next.then(()=>{},()=>{});return next;
 }
 const normalize=(input,existing)=>{
  if(!allowed(input,existing?['title','details','date','start_time','duration_minutes','linked_operation_id','status']:['project_id','kind','title','details','date','start_time','duration_minutes','linked_operation_id','status'])||!Object.keys(input).length)throw bad();
  const kind=existing?.kind??input.kind,projectId=existing?.project_id??input.project_id;
  if(!['priority','session'].includes(kind)||!projectIds.has(projectId))throw bad();
  const title=Object.hasOwn(input,'title')?text(input.title,140,true):(existing?.title??null);
  if(!title)throw bad();
  const details=Object.hasOwn(input,'details')?text(input.details,1200):(existing?.details??'');
  const date=Object.hasOwn(input,'date')?input.date:(existing?.date??null);if(!dateOK(date))throw bad();
  const time=Object.hasOwn(input,'start_time')?input.start_time:(existing?.start_time??null);
  const duration=Object.hasOwn(input,'duration_minutes')?input.duration_minutes:(existing?.duration_minutes??null);
  if(!timeOK(time))throw bad();
  if(kind==='priority'?(time!==null||duration!==null):time===null||!Number.isSafeInteger(duration)||duration<15||duration>480)throw bad();
  const linked=Object.hasOwn(input,'linked_operation_id')?input.linked_operation_id:(existing?.linked_operation_id??null);
  if(linked!==null&&(typeof linked!=='string'||!UUID.test(linked)))throw bad();
  const status=Object.hasOwn(input,'status')?input.status:(existing?.status??'planned');if(!['planned','done'].includes(status))throw bad();
  return {project_id:projectId,kind,title,details,date,start_time:time,duration_minutes:duration,linked_operation_id:linked,status};
 };
 return {
  file,
  async list(){const x=await read();return {ok:true,storage:'local_file',encrypted:false,synced:false,revision:x.revision,updated_at:x.updated_at,records:x.entries.toReversed()};},
  create(rev,input){const values=normalize(input,null);return mutate(rev,async records=>{
   if(records.length>=MAX_ENTRIES)throw new VaultError('planning_capacity_exceeded',413);
   if(values.kind==='priority'&&records.filter(x=>x.kind==='priority'&&x.date===values.date).length>=3)throw new VaultError('daily_priority_limit',409);
   await validateLink(values.linked_operation_id,values.project_id);
   const at=stamp(clock);const record={id:uid(),...values,created_at:at,updated_at:at};records.push(record);return record;
  })},
  update(rev,id,input){if(typeof id!=='string'||!UUID.test(id))throw bad();return mutate(rev,async records=>{
   const record=records.find(x=>x.id===id);if(!record)throw new VaultError('plan_not_found',404);
   const values=normalize(input,record);
   if(Object.entries(values).every(([k,v])=>record[k]===v))throw new VaultError('no_changes',409);
   if(values.kind==='priority'&&records.some(x=>x.id!==id&&x.kind==='priority'&&x.date===values.date)&&records.filter(x=>x.id!==id&&x.kind==='priority'&&x.date===values.date).length>=3)throw new VaultError('daily_priority_limit',409);
   if(values.linked_operation_id!==record.linked_operation_id)await validateLink(values.linked_operation_id,values.project_id);
   Object.assign(record,values,{updated_at:stamp(clock)});return record;
  })},
  delete(rev,id){if(typeof id!=='string'||!UUID.test(id))throw bad();return mutate(rev,records=>{
   const index=records.findIndex(x=>x.id===id);if(index<0)throw new VaultError('plan_not_found',404);
   const [r]=records.splice(index,1);return {id:r.id,deleted:true};
  })}
 };
}
