import {apiGet} from '../lib/http.mjs';
export function GET(request){return apiGet(request,()=>({ok:true,role:'preview_read_only',mode:'github',security:'vercel_deployment_protection_required',notice:'Vercel access is deployment-level; this is not authenticated author identity. No private data or write APIs.'}));}
