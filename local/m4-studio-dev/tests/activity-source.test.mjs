import test from 'node:test';
import assert from 'node:assert/strict';
import {createActivitySource} from '../activity-source.mjs';
import {projects} from '../source-adapter.mjs';
const now=()=>new Date('2026-11-09T14:30:00.000Z');
const sha='a'.repeat(40);
const good=(p)=>({sha,html_url:'https://github.com/'+p.repository+'/commit/'+sha,commit:{message:'Update '+p.name+'\nExtra details',author:{date:'2026-11-09T12:00:00Z'}},author:{login:'verified-author'}});
const fakeFetch=(result='current')=>async(url,opts)=>{
 const repo=url.slice('https://api.github.com/repos/'.length).split('/commits?')[0];
 const project=projects.find(p=>p.repository===repo);
 assert.ok(project,'Must not fetch arbitrary repo: '+url);
 assert.equal(url,'https://api.github.com/repos/'+repo+'/commits?per_page=1');
 assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');assert.ok(!opts.headers.authorization);
 if(result==='rate_limited')return new Response('{}',{status:429});
 if(result==='empty')return Response.json([]);
 return Response.json([good(project)]);
};
test('fixture mode uses zero network requests and never provides fake evidence URLs or SHA',async()=>{
 let count=0;const model=await createActivitySource({mode:'fixture',clock:now,fetchImpl:()=>{count++;throw Error('Unexpected')}}).load();
 assert.equal(count,0);assert.equal(model.mode,'fixture');assert.equal(model.source_count,8);
 assert.equal(model.sources.length,8);assert.equal(model.records.length,8);
 assert.ok(model.sources.every(x=>x.state==='simulated'));
 assert.ok(model.records.every(x=>x.simulated&&x.sha===null&&x.url===null&&x.authored_at===null));
 assert.equal(model.release_ready,null);
});
test('all 8 public allowlisted GitHub repos queried once with one commit per repo',async()=>{
 const calls=[];const result=await createActivitySource({mode:'github',clock:now,fetchImpl:async(url,options)=>{calls.push(url);return fakeFetch()(url,options)}}).load();
 assert.equal(calls.length,8);assert.equal(new Set(calls).size,8);assert.equal(result.records.length,8);
 assert.equal(result.sources.length,8);assert.ok(result.sources.every(s=>s.state==='current'));
 assert.ok(result.records.every(x=>x.url==='https://github.com/'+x.repository+'/commit/'+x.sha));
 assert.equal(result.observed_at,'2026-11-09T14:30:00.000Z');assert.equal(result.release_ready,null);
});
test('newest known authored timestamp first, with fixed project tie-breaker',async()=>{
 const rows=await createActivitySource({mode:'github',clock:now,fetchImpl:async(url,options)=>{
  const repo=url.slice('https://api.github.com/repos/'.length).split('/commits?')[0];
  const p=projects.find(x=>x.repository===repo);const commit=good(p);
  commit.commit.author.date=p.id==='frame-one'?'2026-11-09T13:00:00Z':'2026-11-09T12:00:00Z';
  return Response.json([commit]);
 }}).load();
 assert.equal(rows.records[0].project_id,'frame-one');
});
test('malicious commit URL does not leak into source snapshot',async()=>{
 const r=await createActivitySource({mode:'github',clock:now,fetchImpl:async()=>Response.json([{...good(projects[0]),html_url:'https://evil.test/commit/'+sha}])}).load();
 assert.equal(r.records.length,0);assert.ok(r.sources.every(x=>x.state==='unavailable'));
});
test('malformed SHA, invalid missing dates and bogus JSON are unavailable not zero-progress',async()=>{
 for(const payload of [[{...good(projects[0]),sha:'not-a-sha'}],[{...good(projects[0]),commit:{message:'a',author:{date:'not a date'}}}],{error:'rate_limited'}]){
  const rows=await createActivitySource({mode:'github',clock:now,fetchImpl:async()=>Response.json(payload)}).load();
  assert.ok(rows.sources.every(x=>x.state==='unavailable'));
  assert.equal(rows.records.length,0);
 }
});
test('rate-limited, empty and current are distinct and provenance-backed',async()=>{
 const cases=[['rate_limited','rate_limited_or_denied'],['empty','no_records'],['current','current']];
 for(const [kind,state] of cases){const a=await createActivitySource({mode:'github',clock:now,fetchImpl:fakeFetch(kind)}).load();
  assert.ok(a.sources.every(x=>x.state===state));assert.equal(a.records.length,state==='current'?8:0);
 }
});
test('partial upstream failures preserve successes and never fabricate all-green coverage',async()=>{
 const r=await createActivitySource({mode:'github',clock:now,fetchImpl:async(url,opts)=>url.includes('/framebynavin-android/')?new Response('{}',{status:429}):fakeFetch()(url,opts)}).load();
 assert.equal(r.sources.find(x=>x.id==='backlot').state,'rate_limited_or_denied');assert.equal(r.records.length,7);
 assert.equal(r.records.some(x=>x.project_id==='backlot'),false);
});
test('transport outage reports unavailable for each source without leaking exception',async()=>{
 const r=await createActivitySource({mode:'github',clock:now,fetchImpl:async()=>{throw Error('sensitive test token')}}).load();
 assert.equal(r.records.length,0);assert.ok(r.sources.every(x=>x.state==='unavailable'));
 assert.ok(!JSON.stringify(r).includes('sensitive test token'));
});
test('unknown source mode rejected immediately',()=>assert.throws(()=>createActivitySource({mode:'third_party'}),/Unsupported source mode/));
