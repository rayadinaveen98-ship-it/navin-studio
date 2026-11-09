import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createSourceAdapter,projects} from './source-adapter.mjs';
import {createWorkspaceSource} from './workspace-source.mjs';
import {createQualitySource} from './quality-source.mjs';
import {createActivitySource} from './activity-source.mjs';
import {homeAssets} from './home-ui.mjs';
import {workspaceAssets} from './workspace-ui.mjs';
import {localAssets} from './ui-assets.mjs';
import {createLocalStore,VaultError} from './local-store.mjs';
import {vaultAssets} from './vault-ui.mjs';
import {createProjectOperations} from './project-operations.mjs';
import {operationsAssets} from './operations-ui.mjs';

const headers={
  'Cache-Control':'no-store, private, max-age=0','Pragma':'no-cache',
  'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
  'Cross-Origin-Resource-Policy':'same-origin','Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
};
const toJson=(obj,status=200)=>({status,type:'application/json; charset=utf-8',body:JSON.stringify(obj)});
async function parseLocalJson(req){
  if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(req.headers['content-type']||''))throw new VaultError('json_required',415);
  const chunks=[];let bytes=0;
  for await(const chunk of req){bytes+=chunk.length;if(bytes>17000)throw new VaultError('request_too_large',413);chunks.push(chunk);}
  try{const obj=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('invalid');return obj;}
  catch{throw new VaultError('invalid_json',400);}
}

function emit(res,{status=200,type='text/plain; charset=utf-8',body=''}){
  res.writeHead(status,{...headers,'Content-Type':type});res.end(body);
}
export function createStudioServer({mode='fixture',fetchImpl=globalThis.fetch,clock=()=>new Date(),dataDir}={}) {
  const adapter=createSourceAdapter({mode,fetchImpl,clock});
  const workspaces=createWorkspaceSource({mode,fetchImpl,clock});
  const quality=createQualitySource({mode,fetchImpl,clock});
  const activity=createActivitySource({mode,fetchImpl,clock});
  const assets=localAssets(mode);
  const vault=createLocalStore({dataDir,clock});
  const operations=createProjectOperations({dataDir,clock});
  const server=createServer(async(req,res)=>{
    const port=server.address()?.port;
    const host='127.0.0.1:'+port;
    const origin='http://'+host;
    const remote=req.socket.remoteAddress;
    if(!['127.0.0.1','::ffff:127.0.0.1'].includes(remote)||req.headers.host!==host||
      (req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']==='cross-site'||
      !req.url?.startsWith('/')){
      emit(res,toJson({ok:false,error:'local_origin_required'},403));return;
    }
    // Local writes are opt-in, same-origin JSON requests with a custom header and
    // optimistic revision; never accept cross-origin forms or plain fetch requests.
    const mutation=!req.url.includes('?') ? /^\/api\/local\/(drafts|operations)(?:\/([0-9a-f-]{36}))?$/.exec(req.url) : null;
    if(req.method!=='GET' && mutation){
      if(req.headers.origin!==origin||req.headers['x-navin-local-write']!=='1'||
        req.headers['sec-fetch-site']==='cross-site'){
        emit(res,toJson({ok:false,error:'same_origin_write_required'},403));return;
      }
      const revHeader=req.headers['if-match'];
      const match=typeof revHeader==='string'?/^"([0-9]{1,12})"$/.exec(revHeader):null;
      if(!match){emit(res,toJson({ok:false,error:'revision_required'},428));return;}
      const revision=Number(match[1]);
      const type=mutation[1];
      const store=type==='operations'?operations:vault;
      const id=mutation[2];
      try{
        let result;
        if(req.method==='POST'&&!id)result=await store.create(revision,await parseLocalJson(req));
        else if(req.method==='PATCH'&&id)result=await store.update(revision,id,await parseLocalJson(req));
        else if(req.method==='DELETE'&&id){
          if((req.headers['content-length']&&req.headers['content-length']!=='0')||req.headers['transfer-encoding'])throw new VaultError('unexpected_body',400);
          result=await store.delete(revision,id);
        }else{emit(res,toJson({ok:false,error:'operation_not_allowed'},405));return;}
        emit(res,toJson(result,req.method==='POST'?201:200));
      }catch(e){emit(res,toJson({ok:false,error:e instanceof VaultError?e.code:'vault_unavailable'},e instanceof VaultError?e.status:503));}
      return;
    }
    if(req.method!=='GET'){emit(res,toJson({ok:false,error:'read_only'},405));return;}

    let url;
    try{url=new URL(req.url,origin)}catch{emit(res,toJson({ok:false,error:'invalid_url'},400));return;}
    if(url.search){emit(res,toJson({ok:false,error:'query_not_supported'},400));return;}
    if(url.pathname==='/'||url.pathname==='/control-room'){
      emit(res,{status:200,type:'text/html; charset=utf-8',body:assets.html});return;
    }
    if(url.pathname==='/control-room.js'){
      emit(res,{status:200,type:'text/javascript; charset=utf-8',body:assets.js});return;
    }
    if(url.pathname==='/control-room.css'){
      emit(res,{status:200,type:'text/css; charset=utf-8',body:assets.css});return;
    }
    if(url.pathname==='/studio-operations'||/^\/studio-operations\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url.pathname)){
      if(url.pathname!=='/studio-operations'&&!projects.some(p=>url.pathname==='/studio-operations/'+p.id)){
        emit(res,toJson({ok:false,error:'project_not_found'},404));return;
      }
      emit(res,{status:200,type:'text/html; charset=utf-8',body:operationsAssets.html});return;
    }
    if(url.pathname==='/studio-operations.css'){
      emit(res,{status:200,type:'text/css; charset=utf-8',body:operationsAssets.css});return;
    }
    if(url.pathname==='/studio-operations.js'){
      emit(res,{status:200,type:'text/javascript; charset=utf-8',body:operationsAssets.js});return;
    }
    if(url.pathname==='/studio-vault'){
      emit(res,{status:200,type:'text/html; charset=utf-8',body:vaultAssets.html});return;
    }
    if(url.pathname==='/studio-vault.css'){
      emit(res,{status:200,type:'text/css; charset=utf-8',body:vaultAssets.css});return;
    }
    if(url.pathname==='/studio-vault.js'){
      emit(res,{status:200,type:'text/javascript; charset=utf-8',body:vaultAssets.js});return;
    }
    if(url.pathname==='/studio-home'){
      emit(res,{status:200,type:'text/html; charset=utf-8',body:homeAssets.html});return;
    }
    if(url.pathname==='/studio-home.css'){
      emit(res,{status:200,type:'text/css; charset=utf-8',body:homeAssets.css});return;
    }
    if(url.pathname==='/studio-home.js'){
      emit(res,{status:200,type:'text/javascript; charset=utf-8',body:homeAssets.js});return;
    }
    if(url.pathname==='/local.css'){
      emit(res,{status:200,type:'text/css; charset=utf-8',body:'/* local UI overrides are included in control-room.css */'});return;
    }
    if(url.pathname==='/workspace.css'){
      emit(res,{status:200,type:'text/css; charset=utf-8',body:workspaceAssets.css});return;
    }
    if(url.pathname==='/workspace.js'){
      emit(res,{status:200,type:'text/javascript; charset=utf-8',body:workspaceAssets.js});return;
    }
    const projectRoute=/^\/workspace\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(url.pathname);
    if(projectRoute){
      if(!projects.some(p=>p.id===projectRoute[1])){emit(res,toJson({ok:false,error:'not_found'},404));return;}
      emit(res,{status:200,type:'text/html; charset=utf-8',body:workspaceAssets.html});return;
    }
    if(url.pathname==='/api/me'){
      emit(res,toJson(adapter.me()));return;
    }
    if(url.pathname==='/api/overview'){
      emit(res,toJson(adapter.overview()));return;
    }
    if(url.pathname==='/api/local/status'||url.pathname==='/api/local/drafts'){
      try{emit(res,toJson(url.pathname==='/api/local/status'?await vault.status():await vault.list()));}
      catch(e){emit(res,toJson({ok:false,error:e instanceof VaultError?e.code:'vault_unavailable'},503));}
      return;
    }
    if(url.pathname==='/api/local/operations'){
      try{emit(res,toJson(await operations.list()));}
      catch(e){emit(res,toJson({ok:false,error:e instanceof VaultError?e.code:'operations_unavailable'},e instanceof VaultError?e.status:503));}
      return;
    }
    const opProjectRoute=/^\/api\/local\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)\/operations$/.exec(url.pathname);
    if(opProjectRoute){
      try{emit(res,toJson(await operations.list(opProjectRoute[1])));}
      catch(e){emit(res,toJson({ok:false,error:e instanceof VaultError?e.code:'operations_unavailable'},e instanceof VaultError?e.status:503));}
      return;
    }
    if(url.pathname==='/api/activity'){
      try{emit(res,toJson(await activity.load()));}
      catch{emit(res,toJson({ok:false,error:'source_unavailable'},503));}
      return;
    }
    if(url.pathname==='/api/projects'){
      emit(res,toJson(adapter.directory()));return;
    }
    const wsMatch=/^\/api\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)\/workspace$/.exec(url.pathname);
    if(wsMatch){
      try{
        const data=await workspaces.load(wsMatch[1]);
        emit(res,toJson(data,data.ok?200:404));
      }catch{emit(res,toJson({ok:false,error:'source_unavailable'},503));}
      return;
    }
    const qualityMatch=/^\/api\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)\/quality$/.exec(url.pathname);
    if(qualityMatch){
      try{const data=await quality.runs(qualityMatch[1]);emit(res,toJson(data,data.ok?200:404));}
      catch{emit(res,toJson({ok:false,error:'source_unavailable'},503));}
      return;
    }
    const jobsMatch=/^\/api\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)\/quality\/runs\/([1-9][0-9]{0,15})\/jobs$/.exec(url.pathname);
    if(jobsMatch){
      try{const data=await quality.jobs(jobsMatch[1],jobsMatch[2]);emit(res,toJson(data,data.ok?200:404));}
      catch{emit(res,toJson({ok:false,error:'source_unavailable'},503));}
      return;
    }
    const match=/^\/api\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(source|ci)$/.exec(url.pathname);
    if(match){
      try{
        const data=await adapter.projectEvidence(match[1],match[2]);
        emit(res,toJson(data,data.ok?200:404));
      }catch{emit(res,toJson({ok:false,error:'source_unavailable'},503));}
      return;
    }
    emit(res,toJson({ok:false,error:'not_found'},404));
  });
  return server;
}

export async function startStudioServer({port=4173,...options}={}){
  if(!Number.isSafeInteger(port)||port<0||port>65535)throw Error('Invalid local port');
  const server=createStudioServer(options);
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(port,'127.0.0.1',resolve);
  });
  return {server,url:'http://127.0.0.1:'+server.address().port+'/'};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const mode=process.argv.includes('--github')?'github':'fixture';
  const requestedPort=process.env.NAVIN_LOCAL_PORT===undefined?4173:Number(process.env.NAVIN_LOCAL_PORT);
  startStudioServer({mode,port:requestedPort}).then(({url})=>{
    console.log('\nNAVIN STUDIO · LOCAL ONLY · '+(mode==='fixture'?'SIMULATED DATA':'PUBLIC GITHUB API'));
    console.log('Open: '+url);
    console.log('Loopback only. Local draft writes allowed; no sign-in, cloud sync, paid API or GitHub write operations.');
    console.log('Press Ctrl+C to exit.\n');
  }).catch(e=>{console.error('Failed to start local server:',e.message);process.exitCode=1;});
}
