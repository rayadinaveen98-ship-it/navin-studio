import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../src/index.js';

const env = Object.freeze({ACCESS_AUD:'access-app-test-audience',OWNER_USER_UUID:'owner-stable-cloudflare-identity'});
const ctx = (uuid=env.OWNER_USER_UUID,aud=env.ACCESS_AUD) => ({access:{aud,getIdentity:async()=>({user_uuid:uuid,email:'not-used@example.test'})}});
const req = (path='/api/projects',method='GET',headers={})=>new Request('https://private.example.test'+path,{method,headers});
const make = (overrides={}) => createHandler({ now:()=>new Date('2026-11-08T17:00:00.000Z'), githubFetch:async()=>{throw Error('Unexpected network access')}, ...overrides });
const call=async(handler,request=req(),givenEnv=env,givenCtx=ctx())=>{
 const response=await handler(request,givenEnv,givenCtx);
 return {response,body:await response.json()};
};

for (const field of ['ACCESS_AUD','OWNER_USER_UUID']) {
 test('configuration fails closed without '+field,async()=>{
  let calls=0;
  const handler=make({githubFetch:async()=>{calls++;throw Error('must not run')}});
  const val={...env}; delete val[field];
  const r=await call(handler,req('/api/projects/backlot/source'),val,ctx());
  assert.equal(r.response.status,503);assert.equal(r.body.error,'security_not_configured');assert.equal(calls,0);
 });
}

test('missing access context -> 403; forged access header has no effect',async()=>{
 const handler=make();
 const r=await call(handler,req('/api/projects','GET',{'Cf-Access-Jwt-Assertion':'fake.jwt.fake','x-owner-id':env.OWNER_USER_UUID}),env,{});
 assert.equal(r.response.status,403);assert.equal(r.body.error,'owner_access_required');
});
test('wrong Access application audience -> 403',async()=>{
 const r=await call(make(),req(),env,ctx(env.OWNER_USER_UUID,'another-app'));
 assert.equal(r.response.status,403);
});
test('non-owner authenticated identity -> 403',async()=>{
 const r=await call(make(),req(),env,ctx('a-different-user'));
 assert.equal(r.response.status,403);
});
test('missing owner identity -> 403',async()=>{
 const r=await call(make(),req(),env,{access:{aud:env.ACCESS_AUD,getIdentity:async()=>({email:'owner@example.test'})}});
 assert.equal(r.response.status,403);
});
test('identity provider exception -> 403',async()=>{
 const r=await call(make(),req(),env,{access:{aud:env.ACCESS_AUD,getIdentity:async()=>{throw Error('upstream error')}}});
 assert.equal(r.response.status,403);
});
test('no alternate/test/auth bypass through query, headers or localhost',async()=>{
 for(const path of ['/api/projects?admin=true','/api/projects?dev=1']){
  const res=await call(make(),req(path),env,{});assert.equal(res.response.status,403);
 }
});
test('read-only operations: POST, PUT, DELETE, OPTIONS all rejected',async()=>{
 for(const method of ['POST','PUT','DELETE','OPTIONS']){
  const r=await call(make(),req('/api/projects',method));assert.equal(r.response.status,405);assert.equal(r.response.headers.get('allow'),'GET');
 }
});
test('authenticated owner returns only minimal session fields (no PII)',async()=>{
 const r=await call(make(),req('/api/me'));
 assert.equal(r.response.status,200);assert.equal(r.body.role,'owner');assert.equal(r.body.observed_at,'2026-11-08T17:00:00.000Z');
 assert.ok(!('email' in r.body));assert.ok(!('user_uuid' in r.body));
});
test('all API responses explicitly disable caching, framing, sniffing, and cross-origin resource use',async()=>{
 for(const [url,identity] of [['/api/me',ctx()],['/api/projects',{}]]){
  const {response}=await call(make(),req(url),env,identity);
  assert.match(response.headers.get('cache-control'),/no-store/);
  assert.equal(response.headers.get('x-frame-options'),'DENY');
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal(response.headers.get('cross-origin-resource-policy'),'same-origin');
  assert.equal(response.headers.get('access-control-allow-origin'),null);
 }
});
test('known project catalog count is eight and does not contain confidential fields',async()=>{
 const r=await call(make(),req('/api/projects'));
 assert.equal(r.response.status,200);assert.equal(r.body.projects.length,8);
 const backlot=r.body.projects.find(x=>x.id==='backlot');
 assert.equal(backlot.repository,'rayadinaveen98-ship-it/framebynavin-android');
 assert.ok(!('private_notes' in backlot));assert.ok(!('token' in backlot));
});
test('overview only reports catalog count, approved releases=0; no invented CI stats',async()=>{
 const r=await call(make(),req('/api/overview'));
 assert.equal(r.body.public_project_count,8);assert.equal(r.body.approved_public_release_count,0);
 assert.equal(r.body.ci_success_count,null);assert.equal(r.body.unverified_build_count,null);
});
test('unknown or malformed routes never trigger GitHub fetch',async()=>{
 let calls=0;const handler=make({githubFetch:async()=>{calls++;throw Error('unexpected')}});
 for(const path of ['/api/projects/other/source','/api/projects/https:%2f%2fevil.com/source','/api/projects/backlot/secret','/private','/api/health']){
  const r=await call(handler,req(path));assert.equal(r.response.status,404);
 }
 assert.equal(calls,0);
});
test('query-string requests denied for authenticated owner',async()=>{
 const r=await call(make(),req('/api/projects?repo=attacker/repo'));
 assert.equal(r.response.status,400);
});
test('upstream GitHub fetch limited to allowlisted repository, no cookies or tokens forwarded',async()=>{
 let got;
 const handler=make({githubFetch:async(u,opts)=>{got={url:u,opts};return new Response(JSON.stringify({full_name:'rayadinaveen98-ship-it/framebynavin-android',private:false,default_branch:'main',archived:false,updated_at:'2026-11-07T18:00:00Z'}),{status:200})}});
 const r=await call(handler,req('/api/projects/backlot/source'));
 assert.equal(r.response.status,200);assert.equal(r.body.source_state,'current');assert.equal(r.body.data.repository,'rayadinaveen98-ship-it/framebynavin-android');
 assert.equal(got.url,'https://api.github.com/repos/rayadinaveen98-ship-it/framebynavin-android');
 assert.equal(got.opts.redirect,'error');assert.equal(got.opts.method,'GET');
 assert.ok(!('authorization' in got.opts.headers));assert.ok(!('cookie' in got.opts.headers));
 assert.ok(!('completion' in r.body.data));assert.ok(!('release_ready' in r.body.data));
});
test('upstream mismatched repo response is not trusted',async()=>{
 const handler=make({githubFetch:async()=>new Response(JSON.stringify({full_name:'attacker/evil',private:false}),{status:200})});
 const r=await call(handler,req('/api/projects/backlot/source'));
 assert.equal(r.body.source_state,'unavailable');
});
test('upstream private repo response is not trusted',async()=>{
 const handler=make({githubFetch:async()=>new Response(JSON.stringify({full_name:'rayadinaveen98-ship-it/framebynavin-android',private:true}),{status:200})});
 const r=await call(handler,req('/api/projects/backlot/source'));
 assert.equal(r.body.source_state,'unavailable');
});
test('GitHub 403/429 errors report unavailable/rate-limited, never source success',async()=>{
 for(const code of [403,429]){
  const handler=make({githubFetch:async()=>new Response('{}',{status:code})});
  const r=await call(handler,req('/api/projects/backlot/source'));
  assert.equal(r.body.source_state,'rate_limited_or_denied');assert.equal(r.body.data,null);
 }
});
test('GitHub 404/503 errors never invent state',async()=>{
 for(const code of [404,503]){
  const handler=make({githubFetch:async()=>new Response('{}',{status:code})});
  const r=await call(handler,req('/api/projects/backlot/ci'));
  assert.equal(r.body.source_state,'unavailable');assert.equal(r.body.data,null);
 }
});
test('malformed public GitHub response reports unavailable',async()=>{
 const handler=make({githubFetch:async()=>new Response('{bad json',{status:200})});
 const r=await call(handler,req('/api/projects/backlot/source'));
 assert.equal(r.body.source_state,'unavailable');
});
test('transport error reports unavailable and no raw error details',async()=>{
 const handler=make({githubFetch:async()=>{throw Error('secret system detail')}});
 const r=await call(handler,req('/api/projects/backlot/source'));
 assert.equal(r.body.source_state,'unavailable');assert.ok(!JSON.stringify(r.body).includes('secret system detail'));
});
test('CI evidence returns precise run identity but never claims release-ready',async()=>{
 const handler=make({githubFetch:async(u)=>{
  assert.equal(u,'https://api.github.com/repos/rayadinaveen98-ship-it/framebynavin-android/actions/runs?per_page=1');
  return new Response(JSON.stringify({workflow_runs:[{id:42,status:'completed',conclusion:'success',head_sha:'a'.repeat(40),name:'Android CI',html_url:'https://github.com/rayadinaveen98-ship-it/framebynavin-android/actions/runs/42'}]}),{status:200});
 }});
 const r=await call(handler,req('/api/projects/backlot/ci'));
 assert.equal(r.body.source_state,'current');assert.equal(r.body.data.run_id,42);
 assert.equal(r.body.data.release_ready,null);assert.equal(r.body.data.head_sha,'a'.repeat(40));
});
test('CI fabricated non-allowlisted HTML link rejected',async()=>{
 const handler=make({githubFetch:async()=>new Response(JSON.stringify({workflow_runs:[{id:1,html_url:'https://evil.example.com/actions/runs/1'}]}),{status:200})});
 const r=await call(handler,req('/api/projects/backlot/ci'));
 assert.equal(r.body.source_state,'unavailable');
});
test('CI empty workflow list does not claim build success',async()=>{
 const handler=make({githubFetch:async()=>new Response(JSON.stringify({workflow_runs:[]}),{status:200})});
 const r=await call(handler,req('/api/projects/backlot/ci'));
 assert.equal(r.body.source_state,'no_runs_found');
});

test('CI malformed response is unknown rather than invented no-runs outcome',async()=>{
 const handler=make({githubFetch:async()=>new Response(JSON.stringify({not_workflow_runs:true}),{status:200})});
 const r=await call(handler,req('/api/projects/backlot/ci'));
 assert.equal(r.body.source_state,'unavailable');
});
test('CI evidence URL must exactly match an integer run ID',async()=>{
 const handler=make({githubFetch:async()=>new Response(JSON.stringify({workflow_runs:[{id:42,html_url:'https://github.com/rayadinaveen98-ship-it/framebynavin-android/actions/runs/42/extra'}]}),{status:200})});
 const r=await call(handler,req('/api/projects/backlot/ci'));
 assert.equal(r.body.source_state,'unavailable');
});
