import test from 'node:test';import assert from 'node:assert/strict';
import {createQualitySource} from '../quality-source.mjs';
const repo='rayadinaveen98-ship-it/framebynavin-android';const gh='https://api.github.com/repos/'+repo;const base='https://github.com/'+repo+'/actions/runs/';const sha='a'.repeat(40);
const now=()=>new Date('2026-11-09T14:00:00Z');
const run=(x={})=>({id:1275,html_url:base+'1275',name:'Android QA',status:'completed',conclusion:'success',head_sha:sha,head_branch:'main',run_number:5,run_attempt:1,created_at:'2026-11-09T11:00:00Z',updated_at:'2026-11-09T11:05:00Z',repository:{full_name:repo},...x});
const job=(x={})=>({id:983,run_id:1275,html_url:base+'1275/job/983',name:'Android smoke',status:'completed',conclusion:'success',started_at:'2026-11-09T11:01:00Z',completed_at:'2026-11-09T11:04:00Z',...x});
const asJson=(v,status=200)=>new Response(JSON.stringify(v),{status});
test('fixture mode is conspicuously simulated, includes no real URLs and does not fetch',async()=>{
 let calls=0;const q=createQualitySource({mode:'fixture',clock:now,fetchImpl:()=>{calls++;throw Error('unexpected')}});
 const r=await q.runs('backlot');assert.equal(r.runs.state,'simulated');assert.equal(r.runs.items[0].url,null);assert.equal(r.runs.items[0].head_sha,null);assert.equal(r.runs.release_ready,null);assert.equal(calls,0);
});
test('all eight catalog projects supported in fixture mode',async()=>{
 const q=createQualitySource({mode:'fixture'});for(const id of ['backlot','frame-one','cinerelay','bridge','origin','petping','game-01','framebynavin'])assert.equal((await q.runs(id)).project_id,id);
});
test('unknown project rejected without outbound fetch',async()=>{
 let calls=0;const q=createQualitySource({mode:'github',fetchImpl:()=>{calls++;throw Error('no')}});
 assert.equal((await q.runs('attacker')).ok,false);assert.equal((await q.jobs('attacker','1275')).ok,false);assert.equal(calls,0);
});
test('fixed, bounded GitHub run fetch, exact evidence and no release inference',async()=>{
 const seen=[];const q=createQualitySource({mode:'github',clock:now,fetchImpl:async(url,options)=>{seen.push({url,options});return asJson({total_count:75,workflow_runs:[run()]})}});
 const r=await q.runs('backlot');assert.equal(r.runs.state,'current');assert.equal(r.runs.total_count,75);assert.equal(r.runs.items[0].head_sha,sha);
 assert.equal(r.runs.items[0].url,base+'1275');assert.equal(r.runs.items[0].android_test_verified,null);assert.equal(r.runs.items[0].signing_verified,null);assert.equal(r.runs.items[0].release_ready,null);
 assert.equal(r.observed_at,'2026-11-09T14:00:00.000Z');assert.deepEqual(seen.map(x=>x.url),[gh+'/actions/runs?per_page=5']);
 assert.ok(seen.every(x=>x.options.method==='GET'&&x.options.redirect==='error'&&!x.options.headers.authorization));
});
test('malicious GitHub URLs, mismatched repo and invalid SHA rejected',async()=>{
 for(const row of [run({html_url:'https://attacker.test'}),run({head_sha:'wrong'}),run({repository:{full_name:'evil/repo'}}),run({id:'bad'})]){
  const q=createQualitySource({mode:'github',fetchImpl:async()=>asJson({total_count:1,workflow_runs:[row]})});const r=await q.runs('backlot');assert.equal(r.runs.state,'unavailable');assert.deepEqual(r.runs.items,[]);
 }
});
test('valid runs kept when invalid adjacent rows exist',async()=>{
 const q=createQualitySource({mode:'github',fetchImpl:async()=>asJson({total_count:2,workflow_runs:[run(),run({html_url:'https://evil.test'})]})});
 const r=await q.runs('backlot');assert.equal(r.runs.state,'current');assert.equal(r.runs.items.length,1);
});
test('empty workflow history, malformed shape, and rate limits are distinct',async()=>{
 for(const [upstream,expected] of [[asJson({total_count:0,workflow_runs:[]}),'no_records'],[asJson({foo:1}),'unavailable'],[new Response('{}',{status:429}),'rate_limited_or_denied'],[new Response('{}',{status:403}),'rate_limited_or_denied']]){
  const q=createQualitySource({mode:'github',fetchImpl:async()=>upstream});assert.equal((await q.runs('backlot')).runs.state,expected);
 }
});
test('oversized body and network failures never become verified CI',async()=>{
 const tooLarge=createQualitySource({mode:'github',fetchImpl:async()=>new Response('a'.repeat(1024*1024+20))});assert.equal((await tooLarge.runs('backlot')).runs.state,'unavailable');
 const down=createQualitySource({mode:'github',fetchImpl:async()=>{throw Error('offline')}});assert.equal((await down.runs('backlot')).runs.state,'unavailable');
});
test('invalid run IDs rejected before network',async()=>{
 let calls=0;const q=createQualitySource({mode:'github',fetchImpl:()=>{calls++;throw Error('network')}});
 for(const id of ['0','01','-2','1/../../','foo','12345678901234567','1?x=1','1#frag',''])assert.equal((await q.jobs('backlot',id)).ok,false,id);
 assert.equal(calls,0);
});
test('job inspection uses exact repository and run id, canonical job link',async()=>{
 const seen=[];const q=createQualitySource({mode:'github',clock:now,fetchImpl:async(url,opts)=>{seen.push({url,opts});return asJson({jobs:[job()]})}});
 const r=await q.jobs('backlot','1275');assert.equal(r.jobs.state,'current');assert.equal(r.jobs.items[0].url,base+'1275/job/983');assert.equal(r.jobs.items[0].release_ready,null);assert.equal(r.jobs.items[0].android_test_verified,null);
 assert.deepEqual(seen.map(x=>x.url),[gh+'/actions/runs/1275/jobs?per_page=10']);
});
test('job URL and run ID mismatches are rejected',async()=>{
 for(const j of [job({html_url:'https://evil.test'}),job({run_id:1250}),job({html_url:base+'1275/job/983/extra'})]){
  const q=createQualitySource({mode:'github',fetchImpl:async()=>asJson({jobs:[j]})});assert.equal((await q.jobs('backlot','1275')).jobs.state,'unavailable');
 }
});
test('fixture job details never fabricate CI evidence',async()=>{
 const q=createQualitySource({mode:'fixture',fetchImpl:()=>{throw Error('no')}});const r=await q.jobs('backlot','1275');assert.equal(r.jobs.state,'simulated');assert.deepEqual(r.jobs.items,[]);
});
test('invalid job list, empty job list and rate limit treated distinctly',async()=>{
 for(const [upstream,state] of [[asJson({a:1}),'unavailable'],[asJson({jobs:[]}), 'no_records'],[new Response('{}',{status:429}),'rate_limited_or_denied']]){
  const q=createQualitySource({mode:'github',fetchImpl:async()=>upstream});assert.equal((await q.jobs('backlot','1275')).jobs.state,state);
 }
});
