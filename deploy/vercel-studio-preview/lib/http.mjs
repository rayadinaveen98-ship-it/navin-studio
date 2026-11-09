export function json(payload,status=200){
 return new Response(JSON.stringify(payload),{status,headers:{
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'private, no-store, max-age=0',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'X-Frame-Options':'DENY',
  'Cross-Origin-Resource-Policy':'same-origin'
 }});
}
export function apiGet(request,func){
 if(request.method!=='GET')return json({ok:false,error:'read_only'},405);
 const url=new URL(request.url);
 if(url.searchParams.getAll('project').length>1||url.searchParams.getAll('run').length>1)return json({ok:false,error:'invalid_query'},400);
 return Promise.resolve().then(()=>func(url)).then(result=>json(result,result.ok===false?404:200))
 .catch(()=>json({ok:false,error:'source_unavailable'},503));
}
export const validProject=id=>typeof id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
export const validRun=id=>typeof id==='string'&&/^[1-9][0-9]{0,15}$/.test(id)&&Number.isSafeInteger(Number(id));
