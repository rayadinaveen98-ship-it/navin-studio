import {apiGet} from '../lib/http.mjs';import {adapter} from '../lib/sources.mjs';
export function GET(request){return apiGet(request,()=>adapter.overview());}
