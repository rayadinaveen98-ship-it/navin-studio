import {apiGet,validProject,validRun} from '../lib/http.mjs';import {quality} from '../lib/sources.mjs';
export function GET(request){return apiGet(request,(url)=>{const p=url.searchParams.get('project'),r=url.searchParams.get('run');return validProject(p)&&validRun(r)&&url.searchParams.size===2?quality.jobs(p,r):{ok:false,error:'not_found'};});}
