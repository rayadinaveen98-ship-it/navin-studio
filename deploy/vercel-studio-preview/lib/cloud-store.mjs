import {json} from './http.mjs';

const kinds=new Set(['drafts','operations','planning']);
const allowedMethods=new Set(['GET','PUT']);
const MAX_BYTES=1024*1024;
const tokenPattern=/^Bearer ([A-Za-z0-9_-]{5,2000}\.[A-Za-z0-9_-]{5,7000}\.[A-Za-z0-9_-]{5,3000})$/;
function response(value,status){return json(value,status);}
export function validateCloudBody(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return false;
 if(!kinds.has(input.kind)||!Number.isSafeInteger(input.revision)||input.revision<0||input.revision>Number.MAX_SAFE_INTEGER-1)return false;
 if(!input.body||typeof input.body!=='object'||Array.isArray(input.body))return false;
 return true;
}
function upstreamUrl(base,kind,revision){
 const baseUrl=new URL(base);
 if(baseUrl.protocol!=='https:'||!baseUrl.pathname.endsWith('/rest/v1'))throw Error('bad_data_api_config');
 const url=new URL(baseUrl.toString().replace(/\/$/,'')+'/studio_documents');
 url.searchParams.set('kind','eq.'+kind);
 if(revision!==undefined)url.searchParams.set('revision','eq.'+revision);
 url.searchParams.set('select','kind,revision,body,updated_at');
 url.searchParams.set('limit','1');
 return url.toString();
}
function upstreamStatus(status){
 if(status===401)return 401;
 if(status===403||status===404)return 403; // no owner grant or permission
 if(status===409||status===412)return 409;
 if(status===413)return 413;
 return 502;
}
export async function handleCloudDocs(request,{fetchImpl=globalThis.fetch,env=process.env}={}){
 if(!allowedMethods.has(request.method))return response({ok:false,error:'method_not_allowed'},405);
 const url=new URL(request.url);
 if(url.searchParams.getAll('kind').length!==1||[...url.searchParams.keys()].some(k=>k!=='kind'))return response({ok:false,error:'invalid_query'},400);
 const kind=url.searchParams.get('kind');
 if(!kinds.has(kind))return response({ok:false,error:'invalid_dataset'},400);
 const origin=request.headers.get('Origin');
 const fetchSite=request.headers.get('Sec-Fetch-Site');
 if(fetchSite==='cross-site'||(origin&&origin!==url.origin)||(request.method==='PUT'&&origin!==url.origin))return response({ok:false,error:'same_origin_required'},403);
 const rawToken=request.headers.get('Authorization')||'';
 const match=tokenPattern.exec(rawToken);
 if(!match)return response({ok:false,error:'neon_sign_in_required'},401);
 if(!env.NEON_DATA_API_URL)return response({ok:false,error:'cloud_data_unconfigured'},503);
 if(request.method==='PUT'&&env.STUDIO_CLOUD_WRITES_ENABLED!=='true')return response({ok:false,error:'cloud_writes_locked'},423);
 let payload,revision;
 if(request.method==='PUT'){
  if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))return response({ok:false,error:'json_required'},415);
  let textBody;
  try{textBody=await request.text()}catch{return response({ok:false,error:'invalid_body'},400)}
  if(Buffer.byteLength(textBody,'utf8')>MAX_BYTES)return response({ok:false,error:'body_too_large'},413);
  try{payload=JSON.parse(textBody)}catch{return response({ok:false,error:'invalid_json'},400)}
  if(!validateCloudBody(payload)||payload.kind!==kind)return response({ok:false,error:'invalid_document'},400);
  revision=payload.revision;
  // Enforce a fixed application JSON envelope; no arbitrary SQL or user-supplied owner identity.
  if(Buffer.byteLength(JSON.stringify(payload.body),'utf8')>MAX_BYTES-4096)return response({ok:false,error:'body_too_large'},413);
 }
 // A SELECT filtered by RLS returns [] for an unapproved account, so it cannot
 // prove owner authorization. This separate SECURITY DEFINER RPC is the gate.
 let admission;
 try{
  const url=new URL(env.NEON_DATA_API_URL.replace(/\/$/,'')+'/rpc/studio_owner_status');
  if(url.protocol!=='https:'||!url.pathname.includes('/rest/v1/'))throw Error('invalid_data_api_url');
  admission=await fetchImpl(url.toString(),{
   method:'GET',headers:{Authorization:rawToken,Accept:'application/json'},signal:AbortSignal.timeout(9000)
  });
 }catch{return response({ok:false,error:'cloud_owner_check_unavailable'},503)}
 if(admission.status===401)return response({ok:false,error:'neon_sign_in_required'},401);
 if(!admission.ok)return response({ok:false,error:'cloud_owner_check_unavailable'},503);
 let approved;
 try{const a=await admission.json();approved=a?.approved===true}catch{return response({ok:false,error:'cloud_owner_check_invalid'},502)}
 if(!approved)return response({ok:false,error:'owner_access_not_approved'},403);
 const method=request.method==='GET'?'GET':revision===0?'POST':'PATCH';
 let target;
 try{target=upstreamUrl(env.NEON_DATA_API_URL,kind,method==='PATCH'?revision:undefined)}
 catch{return response({ok:false,error:'cloud_data_unconfigured'},503)}
 let result;
 try{
  result=await fetchImpl(target,{
   method,
   headers:{'Authorization':rawToken,'Accept':'application/json',...(method!=='GET'?{'Content-Type':'application/json','Prefer':'return=representation'}:{})},
   ...(method!=='GET'?{body:JSON.stringify(method==='POST'?{kind,body:payload.body,revision:1}:{body:payload.body,revision:revision+1})}:{}),
   signal:AbortSignal.timeout(9000)
  });
 }catch{return response({ok:false,error:'cloud_data_unavailable'},503)}
 if(!result.ok)return response({ok:false,error:result.status===401?'neon_sign_in_required':result.status===403||result.status===404?'owner_access_not_approved':result.status===409?'revision_conflict':'cloud_upstream_failure'},upstreamStatus(result.status));
 let rows;
 try{rows=await result.json()}catch{return response({ok:false,error:'cloud_invalid_response'},502)}
 if(!Array.isArray(rows)||rows.length>1)return response({ok:false,error:'cloud_invalid_response'},502);
 if(!rows.length&&method==='PATCH')return response({ok:false,error:'revision_conflict'},409);
 if(!rows.length)return response({ok:true,kind,record:null,storage:'neon_database',sync:'manual'},200);
 const r=rows[0];
 if(!r||r.kind!==kind||!Number.isSafeInteger(Number(r.revision))||Number(r.revision)<1||!r.body||typeof r.body!=='object'||Array.isArray(r.body))return response({ok:false,error:'cloud_invalid_response'},502);
 return response({ok:true,kind,record:{kind:r.kind,revision:Number(r.revision),body:r.body,updated_at:r.updated_at??null},storage:'neon_database',sync:'manual'},200);
}

export function cloudConfig({env=process.env}={}){
 // Base URL is public service configuration, not a DB password or bearer token.
 const url=env.NEON_AUTH_BASE_URL??'';
 const valid=Boolean(url&&url.startsWith('https://')&&url.includes('.neonauth.'));
 return response({ok:true,mode:'owner_login_required',auth_base_url:valid?url:null,writes_enabled:env.STUDIO_CLOUD_WRITES_ENABLED==='true',local_data_migrated:false,storage_connected:Boolean(env.NEON_DATA_API_URL)});
}
