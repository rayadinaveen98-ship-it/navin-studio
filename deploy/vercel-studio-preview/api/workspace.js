import {apiGet,validProject} from '../lib/http.mjs';import {workspaces} from '../lib/sources.mjs';
export function GET(request){return apiGet(request,(url)=>{const p=url.searchParams.get('project');return validProject(p)&&url.searchParams.size===1?workspaces.load(p):{ok:false,error:'not_found'};});}
