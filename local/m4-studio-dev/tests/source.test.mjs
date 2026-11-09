import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceAdapter,projects,publishedReleaseCount} from '../source-adapter.mjs';
const clock=()=>new Date('2026-11-09T04:00:00Z');

test('D1 source catalog has eight real project identities and no private credentials',()=>{
  assert.equal(projects.length,8);
  assert.equal(new Set(projects.map(p=>p.id)).size,8);
  assert.ok(projects.some(p=>p.id==='backlot'&&p.repository==='rayadinaveen98-ship-it/framebynavin-android'));
  assert.ok(projects.every(p=>/^[\w.-]+\/[\w.-]+$/.test(p.repository)));
  assert.equal(publishedReleaseCount,0);
});
test('demo mode cannot make outbound GitHub requests and labels ALL source records simulated',async()=>{
  const adapter=createSourceAdapter({clock,mode:'fixture',fetchImpl:()=>{throw Error('Network forbidden in fixture mode')}});
  assert.equal(adapter.me().role,'local_preview');
  assert.equal(adapter.me().mode,'fixture');
  assert.match(adapter.overview().notice,/SIMULATED DATA/);
  for(const project of projects){
    for(const kind of ['source','ci']){
      const d=await adapter.projectEvidence(project.id,kind);
      assert.equal(d.source_state,'simulated');assert.equal(d.mode,'fixture');
      assert.equal(d.data.release_ready,null);
      assert.equal(d.data.observed_at,'2026-11-09T04:00:00.000Z');
      if(kind==='ci')assert.equal(d.data.run_url,null); // never fabricates a run URL
    }
  }
});
test('verified public repo metadata contains provenance and exact canonical identity',async()=>{
  const requests=[];
  const adapter=createSourceAdapter({mode:'github',clock,fetchImpl:async(url,opts)=>{
    requests.push({url,opts});
    return new Response(JSON.stringify({full_name:'rayadinaveen98-ship-it/framebynavin-android',private:false,archived:false,default_branch:'main',updated_at:'2026-11-08T12:00:00Z'}),{status:200});
  }});
  const r=await adapter.projectEvidence('backlot','source');
  assert.equal(r.mode,'github');assert.equal(r.source_state,'current');
  assert.equal(r.data.default_branch,'main');assert.equal(r.data.release_ready,null);
  assert.equal(r.observed_at,'2026-11-09T04:00:00.000Z');
  assert.equal(requests[0].url,'https://api.github.com/repos/rayadinaveen98-ship-it/framebynavin-android');
  assert.equal(requests[0].opts.method,'GET');assert.equal(requests[0].opts.redirect,'error');
  assert.ok(!('Authorization' in requests[0].opts.headers));
});
test('spoofed repo identity or private flag is rejected',async()=>{
  for(const data of [{full_name:'evil/secret',private:false},{full_name:'rayadinaveen98-ship-it/framebynavin-android',private:true}]){
    const adapter=createSourceAdapter({mode:'github',clock,fetchImpl:async()=>new Response(JSON.stringify(data),{status:200})});
    const r=await adapter.projectEvidence('backlot','source');
    assert.equal(r.source_state,'unavailable');assert.equal(r.data,null);
  }
});
test('only checked-in allowlisted projects can produce GitHub requests',async()=>{
  let calls=0;
  const adapter=createSourceAdapter({mode:'github',clock,fetchImpl:async()=>{calls++;return new Response('{}',{status:200})}});
  assert.equal((await adapter.projectEvidence('secret-admin','source')).error,'not_found');
  assert.equal((await adapter.projectEvidence('backlot','delete')).error,'not_found');
  assert.equal(calls,0);
});
test('missing and malformed workflow runs are unavailable, empty runs distinct',async()=>{
  for(const [body,state] of [[{},'unavailable'],[{workflow_runs:[]},'no_runs_found'],[{workflow_runs:[{id:123,html_url:'https://evil.invalid'}]},'unavailable']]){
    const adapter=createSourceAdapter({mode:'github',clock,fetchImpl:async()=>new Response(JSON.stringify(body),{status:200})});
    assert.equal((await adapter.projectEvidence('backlot','ci')).source_state,state);
  }
});
test('real CI run data preserves exact source evidence without claiming APK readiness',async()=>{
  const adapter=createSourceAdapter({mode:'github',clock,fetchImpl:async()=>new Response(JSON.stringify({workflow_runs:[{
    id:840,status:'completed',conclusion:'success',name:'test',head_sha:'a'.repeat(40),html_url:'https://github.com/rayadinaveen98-ship-it/framebynavin-android/actions/runs/840'
  }]}),{status:200})});
  const r=await adapter.projectEvidence('backlot','ci');
  assert.equal(r.source_state,'current');assert.equal(r.data.run_id,840);
  assert.equal(r.data.release_ready,null);assert.equal(r.data.head_sha,'a'.repeat(40));
});
test('public GitHub 403/429 and network outages explicitly mark unavailable',async()=>{
  for(const status of [403,429,404]){
    const adapter=createSourceAdapter({mode:'github',clock,fetchImpl:async()=>new Response('{}',{status})});
    const r=await adapter.projectEvidence('backlot','source');
    assert.equal(r.source_state,status===403||status===429?'rate_limited_or_denied':'unavailable');assert.equal(r.data,null);
  }
  const adapter=createSourceAdapter({mode:'github',clock,fetchImpl:async()=>{throw Error('Offline')}});
  assert.equal((await adapter.projectEvidence('backlot','source')).source_state,'unavailable');
});
test('unsupported modes fail immediately',()=>{
  assert.throws(()=>createSourceAdapter({mode:'paid'}));
});
