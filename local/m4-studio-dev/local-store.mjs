/**
 * M4-E1: local-only, file-backed Studio drafts.
 * Not encrypted; other processes under the same OS account may read it.
 * Never writes to a source checkout, GitHub or the public web.
 */
import {homedir, platform} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {mkdir, lstat, open, readFile, rename, unlink, chmod} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {projects} from './source-adapter.mjs';

const projectIds = new Set(projects.map(p=>p.id));
const types = new Set(['note','decision','plan']);
const MAX_DRAFTS=500;
const MAX_BYTES=1024*1024;
const LIMITS={title:140,body:6000};
const iso=(clock)=>{const d=clock();if(!(d instanceof Date)||!Number.isFinite(d.getTime()))throw new Error('Invalid local clock');return d.toISOString();};

export function defaultDataDir({home=homedir(),env=process.env,os=platform()}={}){
  if(os==='win32')return join(env.LOCALAPPDATA||join(home,'AppData','Local'),'NavinStudio','ControlRoom');
  if(os==='darwin')return join(home,'Library','Application Support','NavinStudio','ControlRoom');
  return join(env.XDG_DATA_HOME||join(home,'.local','share'),'navin-studio','control-room');
}

export class VaultError extends Error {
  constructor(code,status=400){super(code);this.name='VaultError';this.code=code;this.status=status;}
}
const bad=(s)=>new VaultError(s,400);
const isPlain=(x)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const exactKeys=(x,allowed)=>isPlain(x)&&Object.keys(x).every(k=>allowed.includes(k));
const normText=(x,limit,required=false)=>{
  if(typeof x!=='string')throw bad('invalid_fields');
  const v=x.trim();
  if(v.length>limit||(required&&!v)||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v))throw bad('invalid_fields');
  return v;
};
function validDraft(d){
  return exactKeys(d,['id','project_id','type','title','body','created_at','updated_at'])&&
    typeof d.id==='string'&&/^[0-9a-f-]{36}$/.test(d.id)&&
    projectIds.has(d.project_id)&&types.has(d.type)&&
    typeof d.title==='string'&&!!d.title.trim()&&d.title.length<=LIMITS.title&&
    typeof d.body==='string'&&d.body.length<=LIMITS.body&&
    typeof d.created_at==='string'&&!Number.isNaN(Date.parse(d.created_at))&&
    typeof d.updated_at==='string'&&!Number.isNaN(Date.parse(d.updated_at));
}
export function validateVaultSnapshot(data){
  if(!exactKeys(data,['schema_version','revision','updated_at','drafts'])||data.schema_version!==1||
    !Number.isSafeInteger(data.revision)||data.revision<0||
    !Array.isArray(data.drafts)||data.drafts.length>MAX_DRAFTS||
    typeof data.updated_at!=='string'||Number.isNaN(Date.parse(data.updated_at))||
    !data.drafts.every(validDraft)||new Set(data.drafts.map(d=>d.id)).size!==data.drafts.length)
    throw new VaultError('vault_integrity_error',503);
  return data;
}
export function createLocalStore({dataDir=defaultDataDir(),clock=()=>new Date(),uid=randomUUID}={}){
  const file=join(resolve(dataDir),'studio-drafts.v1.json');
  let chain=Promise.resolve();
  async function read(){
    let raw;
    try{
      const stat=await lstat(file);
      if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_BYTES)throw new VaultError('vault_integrity_error',503);
      raw=await readFile(file,'utf8');
    }catch(e){
      if(e?.code==='ENOENT')return {schema_version:1,revision:0,updated_at:'1970-01-01T00:00:00.000Z',drafts:[]};
      if(e instanceof VaultError)throw e;
      throw new VaultError('vault_unavailable',503);
    }
    try{return validateVaultSnapshot(JSON.parse(raw));}
    catch(e){if(e instanceof VaultError)throw e;throw new VaultError('vault_integrity_error',503);}
  }
  async function persist(snapshot){
    const folder=dirname(file);
    let tmp=null;
    try{
      await mkdir(folder,{recursive:true,mode:0o700});
      const dirStat=await lstat(folder);
      if(!dirStat.isDirectory()||dirStat.isSymbolicLink())throw new Error('Unsafe data directory');
      if(process.platform!=='win32')await chmod(folder,0o700);
      const json=JSON.stringify(snapshot,null,2)+'\n';
      if(Buffer.byteLength(json,'utf8')>MAX_BYTES)throw new VaultError('vault_capacity_exceeded',413);
      tmp=file+'.'+uid()+'.tmp';
      const fh=await open(tmp,'wx',0o600);
      try{await fh.writeFile(json,'utf8');await fh.sync();}finally{await fh.close();}
      await rename(tmp,file);
      tmp=null;
      if(process.platform!=='win32')await chmod(file,0o600);
      // Best-effort folder fsync: directory handles vary by OS/filesystem.
      if(process.platform!=='win32'){
        try{const dir=await open(folder,'r');try{await dir.sync()}finally{await dir.close()}}catch{}
      }
    }catch(e){
      if(e instanceof VaultError)throw e;
      throw new VaultError('vault_unavailable',503);
    }finally{if(tmp)await unlink(tmp).catch(()=>{});}
  }
  function transact(expectedRevision,mutation){
    const next=chain.catch(()=>{}).then(async()=>{
      const current=await read();
      if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw new VaultError('revision_required',428);
      if(expectedRevision!==current.revision)throw new VaultError('stale_revision',409);
      const drafts=current.drafts.map(d=>({...d}));
      const result=mutation(drafts);
      const updated={schema_version:1,revision:current.revision+1,updated_at:iso(clock),drafts};
      validateVaultSnapshot(updated);
      await persist(updated);
      return {ok:true,revision:updated.revision,record:result};
    });
    chain=next.then(()=>{},()=>{});
    return next;
  }
  return {
    file,
    async status(){const s=await read();return {ok:true,storage:'local_file',encrypted:false,synced:false,revision:s.revision,count:s.drafts.length,updated_at:s.updated_at};},
    async list(){const s=await read();return {ok:true,revision:s.revision,updated_at:s.updated_at,records:[...s.drafts].reverse()};},
    create(rev,input){
      if(!exactKeys(input,['project_id','type','title','body'])||!projectIds.has(input.project_id)||!types.has(input.type))throw bad('invalid_fields');
      const title=normText(input.title,LIMITS.title,true),body=normText(input.body,LIMITS.body);
      return transact(rev,drafts=>{
        if(drafts.length>=MAX_DRAFTS)throw new VaultError('vault_capacity_exceeded',413);
        const now=iso(clock);
        const record={id:uid(),project_id:input.project_id,type:input.type,title,body,created_at:now,updated_at:now};
        drafts.push(record);return record;
      });
    },
    update(rev,id,input){
      if(!exactKeys(input,['title','body'])||Object.keys(input).length===0)throw bad('invalid_fields');
      const values={};
      if(Object.hasOwn(input,'title'))values.title=normText(input.title,LIMITS.title,true);
      if(Object.hasOwn(input,'body'))values.body=normText(input.body,LIMITS.body);
      return transact(rev,drafts=>{
        const entry=drafts.find(d=>d.id===id);
        if(!entry)throw new VaultError('draft_not_found',404);
        Object.assign(entry,values,{updated_at:iso(clock)});
        return {...entry};
      });
    },
    delete(rev,id){return transact(rev,drafts=>{
      const index=drafts.findIndex(d=>d.id===id);
      if(index<0)throw new VaultError('draft_not_found',404);
      const [removed]=drafts.splice(index,1);
      return {id:removed.id,deleted:true};
    });}
  };
}
