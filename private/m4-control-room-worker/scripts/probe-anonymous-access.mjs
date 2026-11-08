#!/usr/bin/env node
/**
 * Anonymous, read-only security preflight for an OWNER-CONFIGURED staging origin.
 *
 * This deliberately sends no Cloudflare credentials, cookies or tokens.
 * A 403 alone is not proof Access is configured: it might come from the Worker.
 * No network request occurs unless the operator passes an HTTPS origin explicitly.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PATHS=Object.freeze(['/control-room','/control-room.js','/control-room.css','/api/overview','/api/projects']);
const ERROR_HELP='Usage: node scripts/probe-anonymous-access.mjs https://your-protected-worker.example';

export function classifyAnonymousResponse({status,location,requestUrl}) {
  if(status===200)return {result:'EXPOSURE',reason:'Protected route returned HTTP 200 to a client without credentials.'};
  if([301,302,303,307,308].includes(status)){
    if(!location)return {result:'INCONCLUSIVE',reason:'Redirect has no Location header.'};
    let target;
    try {target=new URL(location,requestUrl)}catch{return {result:'INCONCLUSIVE',reason:'Redirect target was malformed.'}}
    const cloudflareHost=target.hostname.toLowerCase().endsWith('.cloudflareaccess.com');
    const accessPath=target.pathname.startsWith('/cdn-cgi/access/login');
    if(target.protocol==='https:' && (cloudflareHost || accessPath))
      return {result:'ACCESS_CHALLENGE',reason:'Cloudflare Access login challenge was returned.'};
    return {result:'INCONCLUSIVE',reason:'Redirect was not a recognized Access login challenge.'};
  }
  if(status===401||status===403)
    return {result:'INCONCLUSIVE',reason:'Request was denied, but this does not prove the Access policy is enabled.'};
  return {result:'INCONCLUSIVE',reason:'Unexpected unauthenticated status '+status+'; examine Access policy and routing.'};
}

export function validProbeOrigin(value) {
  if(typeof value!=='string'||!value)return null;
  try {
    const url=new URL(value);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)return null;
    if(url.pathname!=='/' || url.port && url.port!=='443')return null;
    if(url.hostname==='localhost'||url.hostname==='127.0.0.1'||url.hostname.endsWith('.localhost'))return null;
    return url.origin;
  }catch{return null}
}

export async function probeOrigin(origin,fetchImpl=fetch) {
  const valid=validProbeOrigin(origin);
  if(!valid)throw new Error(ERROR_HELP);
  const results=[];
  for(const path of PATHS){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),6000);
    try{
      const url=valid+path;
      const response=await fetchImpl(url,{
        method:'GET',credentials:'omit',redirect:'manual',cache:'no-store',
        headers:{accept:'text/html,application/json,text/css,application/javascript'},
        signal:controller.signal,
      });
      const result=classifyAnonymousResponse({
        status:response.status,location:response.headers.get('location'),requestUrl:url,
      });
      results.push({path,status:response.status,...result});
    }catch{
      results.push({path,status:null,result:'INCONCLUSIVE',reason:'Could not retrieve route anonymously.'});
    }finally{clearTimeout(timeout)}
  }
  return {
    results,
    outcome: results.some(x=>x.result==='EXPOSURE')?'EXPOSURE':
      results.every(x=>x.result==='ACCESS_CHALLENGE')?'ACCESS_CHALLENGE':'INCONCLUSIVE',
  };
}

async function main(){
  const origin=validProbeOrigin(process.argv[2]);
  if(!origin){console.error(ERROR_HELP);process.exitCode=2;return}
  const {results,outcome}=await probeOrigin(origin);
  for(const row of results)console.log([row.path,String(row.status??'NO_RESPONSE'),row.result,row.reason].join(' | '));
  if(outcome==='EXPOSURE'){
    console.error('FAIL: at least one protected route was public. STOP deployment.');process.exitCode=1;
  }else if(outcome==='ACCESS_CHALLENGE'){
    console.log('PASS (anonymous challenge ONLY): every tested route requested Cloudflare Access login.');
    console.log('NOT YET VERIFIED: real-owner login, wrong-owner, session revocation, alternate hosts, or Cloudflare setup.');
  }else{
    console.warn('INCONCLUSIVE: no public 200 found, but Access protection is NOT proven. Inspect policy and routing.');process.exitCode=2;
  }
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  await main();
