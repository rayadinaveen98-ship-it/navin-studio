import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createSourceAdapter,projects} from './source-adapter.mjs';
import {createWorkspaceSource} from './workspace-source.mjs';
import {createQualitySource} from './quality-source.mjs';
import {workspaceAssets} from './workspace-ui.mjs';
import {localAssets} from './ui-assets.mjs';

const headers={
  'Cache-Control':'no-store, private, max-age=0','Pragma':'no-cache',
  'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
  'Cross-Origin-Resource-Policy':'same-origin','Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
};
const toJson=(obj,status=200)=>({status,type:'application/json; charset=utf-8',body:JSON.stringify(obj)});
function emit(res,{status=200,type='text/plain; charset=utf-8',body=''}){
  res.writeHead(status,{...headers,'Content-Type':type});res.end(body);
}
export function createStudioServer({mode='fixture',fetchImpl=globalThis.fetch,clock=()=>new Date()}={}) {
  const adapter=createSourceAdapter({mode,fetchImpl,clock});
  const workspaces=createWorkspaceSource({mode,fetchImpl,clock});
  const quality=createQualitySource({mode,fetchImpl,clock});
  const assets=localAssets(mode);
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
    console.log('Loopback only. No sign-in, private data, cloud account, paid API or write operations.');
    console.log('Press Ctrl+C to exit.\n');
  }).catch(e=>{console.error('Failed to start local server:',e.message);process.exitCode=1;});
}
