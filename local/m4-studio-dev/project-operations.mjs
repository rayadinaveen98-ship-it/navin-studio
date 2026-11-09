/** M4-E2: project-scoped, local-only tasks, milestones and decisions.
 * Separate versioned file from M4-E1 drafts; no migrations and no GitHub writes.
 * NOT encrypted, synced, remotely authorized or automatically backed up.
 */
import {mkdir, lstat, open, readFile, rename, unlink, chmod} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {defaultDataDir, VaultError} from './local-store.mjs';
import {projects} from './source-adapter.mjs';

const projectIds=new Set(projects.map(p=>p.id));
const STATUS=Object.freeze({
  task:['backlog','in_progress','blocked','done'],
  milestone:['planned','active','completed'],
  decision:['proposed','accepted','deferred','rejected']
});
const TYPES=Object.keys(STATUS);
const MAX_RECORDS=400,MAX_FILE=4*1024*1024,MAX_EVENTS=40;
const safeDate=(s)=>s===null||(typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s);
const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;
const allowed=(o,keys)=>plain(o)&&Object.keys(o).every(k=>keys.includes(k));
const timestamp=clock=>{const d=clock();if(!(d instanceof Date)||!Number.isFinite(d.getTime()))throw new VaultError('clock_unavailable',503);return d.toISOString()};
const bad=()=>new VaultError('invalid_fields',400);
function str(v,max,required=false){if(typeof v!=='string')throw bad();const text=v.trim();if(text.length>max||(required&&!text)||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text))throw bad();return text}
function validRecord(r){
  return allowed(r,['id','project_id','kind','title','details','status','due_date','created_at','updated_at','history'])&&
  typeof r.id==='string'&&/^[a-f0-9-]{36}$/.test(r.id)&&projectIds.has(r.project_id)&&TYPES.includes(r.kind)&&
  typeof r.title==='string'&&r.title.length<=140&&!!r.title.trim()&&typeof r.details==='string'&&r.details.length<=4000&&
  STATUS[r.kind].includes(r.status)&&safeDate(r.due_date)&&
  [r.created_at,r.updated_at].every(v=>typeof v==='string'&&!Number.isNaN(Date.parse(v)))&&
  Array.isArray(r.history)&&r.history.length>0&&r.history.length<=MAX_EVENTS&&
  r.history.every(h=>allowed(h,['action','at','title','status'])&&['created','updated'].includes(h.action)&&
    typeof h.at==='string'&&!Number.isNaN(Date.parse(h.at))&&typeof h.title==='string'&&h.title.length<=140&&
    STATUS[r.kind].includes(h.status));
}
export function validateOperationsSnapshot(data){
  if(!allowed(data,['schema_version','revision','updated_at','records'])||data.schema_version!==1||
    !Number.isSafeInteger(data.revision)||data.revision<0||typeof data.updated_at!=='string'||Number.isNaN(Date.parse(data.updated_at))||
    !Array.isArray(data.records)||data.records.length>MAX_RECORDS||!data.records.every(validRecord)||
    new Set(data.records.map(x=>x.id)).size!==data.records.length)throw new VaultError('operations_integrity_error',503);
  return data;
}
export function createProjectOperations({dataDir=defaultDataDir(),clock=()=>new Date(),uid=randomUUID}={}){
 const file=join(resolve(dataDir),'project-operations.v1.json');
 let chain=Promise.resolve();
 async function read(){
  try{
    const st=await lstat(file);
    if(!st.isFile()||st.isSymbolicLink()||st.size>MAX_FILE)throw new VaultError('operations_integrity_error',503);
    return validateOperationsSnapshot(JSON.parse(await readFile(file,'utf8')));
  }catch(e){
    if(e?.code==='ENOENT')return {schema_version:1,revision:0,updated_at:'1970-01-01T00:00:00.000Z',records:[]};
    if(e instanceof VaultError)throw e;
    if(e instanceof SyntaxError)throw new VaultError('operations_integrity_error',503);
    throw new VaultError('operations_unavailable',503);
  }
 }
 async function save(snapshot){
  const dir=dirname(file);let tmp=null;
  try{
    await mkdir(dir,{recursive:true,mode:0o700});
    const st=await lstat(dir);if(!st.isDirectory()||st.isSymbolicLink())throw new Error('unsafe directory');
    if(process.platform!=='win32')await chmod(dir,0o700);
    const raw=JSON.stringify(snapshot,null,2)+'\n';
    if(Buffer.byteLength(raw)>MAX_FILE)throw new VaultError('operations_capacity_exceeded',413);
    tmp=file+'.'+uid()+'.tmp';const fh=await open(tmp,'wx',0o600);
    try{await fh.writeFile(raw,'utf8');await fh.sync();}finally{await fh.close()}
    await rename(tmp,file);tmp=null;
    if(process.platform!=='win32'){
      await chmod(file,0o600);
      try{const f=await open(dir,'r');try{await f.sync()}finally{await f.close()}}catch{}
    }
  }catch(e){if(e instanceof VaultError)throw e;throw new VaultError('operations_unavailable',503)}
  finally{if(tmp)await unlink(tmp).catch(()=>{})}
 }
 const mutate=(revision,fn)=>{
  const job=chain.catch(()=>{}).then(async()=>{
    const current=await read();
    if(!Number.isSafeInteger(revision)||revision<0)throw new VaultError('revision_required',428);
    if(revision!==current.revision)throw new VaultError('stale_revision',409);
    const records=structuredClone(current.records);const output=fn(records);
    const updated={schema_version:1,revision:current.revision+1,updated_at:timestamp(clock),records};
    validateOperationsSnapshot(updated);await save(updated);
    return {ok:true,revision:updated.revision,record:output};
  });
  chain=job.then(()=>{},()=>{});return job;
 };
 return {
  file,
  async list(projectId=null){
    if(projectId!==null&&!projectIds.has(projectId))throw new VaultError('project_not_found',404);
    const data=await read();
    const records=data.records.filter(r=>projectId===null||r.project_id===projectId);
    return {ok:true,storage:'local_file',encrypted:false,synced:false,revision:data.revision,updated_at:data.updated_at,records:records.toReversed()};
  },
  create(revision,input){
    if(!allowed(input,['project_id','kind','title','details','status','due_date'])||
      !projectIds.has(input.project_id)||!TYPES.includes(input.kind))throw bad();
    const title=str(input.title,140,true),details=str(input.details??'',4000);
    const status=input.status??STATUS[input.kind][0],due_date=input.due_date??null;
    if(!STATUS[input.kind].includes(status)||!safeDate(due_date))throw bad();
    return mutate(revision,rows=>{
      if(rows.length>=MAX_RECORDS)throw new VaultError('operations_capacity_exceeded',413);
      const at=timestamp(clock);const rec={id:uid(),project_id:input.project_id,kind:input.kind,title,details,status,due_date,created_at:at,updated_at:at,history:[{action:'created',at,title,status}]};
      rows.push(rec);return rec;
    });
  },
  update(revision,id,input){
    if(!allowed(input,['title','details','status','due_date'])||!Object.keys(input).length)throw bad();
    const fields={};
    if(Object.hasOwn(input,'title'))fields.title=str(input.title,140,true);
    if(Object.hasOwn(input,'details'))fields.details=str(input.details,4000);
    if(Object.hasOwn(input,'due_date')){if(!safeDate(input.due_date))throw bad();fields.due_date=input.due_date}
    if(Object.hasOwn(input,'status'))fields.status=input.status;
    return mutate(revision,rows=>{
      const rec=rows.find(r=>r.id===id);if(!rec)throw new VaultError('operation_not_found',404);
      if(fields.status!==undefined&&!STATUS[rec.kind].includes(fields.status))throw bad();
      if(rec.history.length>=MAX_EVENTS)throw new VaultError('history_capacity_exceeded',413);
      if(Object.keys(fields).every(k=>rec[k]===fields[k]))throw new VaultError('no_changes',409);
      Object.assign(rec,fields,{updated_at:timestamp(clock)});
      rec.history.push({action:'updated',at:rec.updated_at,title:rec.title,status:rec.status});return rec;
    });
  },
  delete(revision,id){return mutate(revision,rows=>{
    const i=rows.findIndex(x=>x.id===id);if(i<0)throw new VaultError('operation_not_found',404);
    const [r]=rows.splice(i,1);return {id:r.id,deleted:true};
  })}
 };
}
export const allowedStatuses=STATUS;
