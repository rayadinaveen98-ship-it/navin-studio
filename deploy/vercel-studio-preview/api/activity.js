import {apiGet} from '../lib/http.mjs';import {activity} from '../lib/sources.mjs';
export function GET(request){return apiGet(request,(url)=>url.search?({ok:false,error:'not_found'}):activity.load());}
