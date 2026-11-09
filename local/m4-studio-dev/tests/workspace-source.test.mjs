import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceSource} from '../workspace-source.mjs';

const repo='rayadinaveen98-ship-it/framebynavin-android';
const base='https://github.com/'+repo;
const sha='a'.repeat(40);
const now=()=>new Date('2026-11-09T10:00:00.000Z');
const responder=(overrides={})=>{
 const seen=[];
 const fetchImpl=async(url,options)=>{
  seen.push({url,options});
  const response=overrides[url];
  if(response instanceof Error)throw response;
  if(response)return response;
  if(url.endsWith('/commits?per_page=5'))return Response.json([{sha,html_url:base+'/commit/'+sha,commit:{message:'Improve Backlot home\nMore detail',author:{date:'2026-11-08T14:00:00Z',name:'Contributor'}},author:{login:'public-dev'}}]);
  if(url.endsWith('/pulls?state=all&sort=updated&direction=desc&per_page=5'))return Response.json([{number:12,title:'Source-backed project story',state:'open',html_url:base+'/pull/12',updated_at:'2026-11-09T06:00:00Z',merged_at:null}]);
  return Response.json({full_name:repo,private:false,default_branch:'main',archived:false,updated_at:'2026-11-08T12:00:00Z'});
 };
 return {seen,fetchImpl};
};

test('offline fixtures are visibly simulated and make zero GitHub requests',async()=>{
 const source=createWorkspaceSource({mode:'fixture',clock:now,fetchImpl:()=>{throw Error('must not fetch')}});
 const x=await source.load('backlot');
 assert.equal(x.mode,'fixture');assert.equal(x.repository.state,'simulated');assert.equal(x.commits.state,'simulated');
 assert.ok(x.scope.includes('SIMULATED'));assert.equal(x.commits.items[0].sha,null);assert.equal(x.commits.items[0].url,null);
 assert.equal(x.pull_requests.items[0].url,null);assert.equal(x.release_ready,null);assert.equal(x.milestones.state,'not_connected');
});
test('all eight catalog workspaces resolve without fabricated release readiness',async()=>{
 const source=createWorkspaceSource({mode:'fixture',clock:now});
 for(const id of ['backlot','frame-one','cinerelay','bridge','origin','petping','game-01','framebynavin']){
  const x=await source.load(id);assert.equal(x.ok,true);assert.equal(x.project.id,id);assert.equal(x.release_ready,null);
 }
});
test('unknown project rejected without external fetch',async()=>{
 let calls=0;
 const source=createWorkspaceSource({mode:'github',clock:now,fetchImpl:()=>{calls++;throw Error('no')}});
 const x=await source.load('fake-id');assert.equal(x.ok,false);assert.equal(calls,0);
});
test('public mode fetches only three fixed read-only GitHub URLs',async()=>{
 const {seen,fetchImpl}=responder();
 const x=await createWorkspaceSource({mode:'github',clock:now,fetchImpl}).load('backlot');
 assert.equal(x.mode,'github');assert.equal(x.project.repository,repo);assert.equal(x.repository.state,'current');
 assert.equal(x.commits.state,'current');assert.equal(x.pull_requests.state,'current');
 assert.equal(x.commits.items[0].sha,sha);assert.equal(x.commits.items[0].title,'Improve Backlot home');
 assert.equal(x.commits.items[0].url,base+'/commit/'+sha);
 assert.equal(x.pull_requests.items[0].number,12);assert.equal(x.pull_requests.items[0].url,base+'/pull/12');
 assert.equal(x.observed_at,'2026-11-09T10:00:00.000Z');
 assert.deepEqual(seen.map(s=>s.url).sort(),[
 'https://api.github.com/repos/'+repo,
 'https://api.github.com/repos/'+repo+'/commits?per_page=5',
 'https://api.github.com/repos/'+repo+'/pulls?state=all&sort=updated&direction=desc&per_page=5',
 ].sort());
 assert.ok(seen.every(s=>s.options.method==='GET'&&s.options.redirect==='error'&&!s.options.headers.authorization));
});
test('mismatched or private upstream repo is unavailable, not treated as source proof',async()=>{
 const {fetchImpl}=responder({['https://api.github.com/repos/'+repo]:Response.json({full_name:'attacker/fake',private:false})});
 const x=await createWorkspaceSource({mode:'github',clock:now,fetchImpl}).load('backlot');
 assert.equal(x.repository.state,'unavailable');assert.equal(x.repository.data,null);assert.equal(x.commits.state,'current');
});
test('malicious commit and PR URLs are discarded instead of rendered as links',async()=>{
 const {fetchImpl}=responder({
  ['https://api.github.com/repos/'+repo+'/commits?per_page=5']:Response.json([{sha,html_url:'https://evil.test/commit/'+sha,commit:{message:'oops'}}]),
  ['https://api.github.com/repos/'+repo+'/pulls?state=all&sort=updated&direction=desc&per_page=5']:Response.json([{number:12,html_url:base+'/pull/12/other',title:'bad'}]),
 });
 const x=await createWorkspaceSource({mode:'github',clock:now,fetchImpl}).load('backlot');
 assert.deepEqual(x.commits.items,[]);assert.deepEqual(x.pull_requests.items,[]);
 assert.equal(x.commits.state,'no_records');assert.equal(x.pull_requests.state,'no_records');
});
test('empty upstream commits and PRs produce no_records, not fabricated activity',async()=>{
 const {fetchImpl}=responder({
  ['https://api.github.com/repos/'+repo+'/commits?per_page=5']:Response.json([]),
  ['https://api.github.com/repos/'+repo+'/pulls?state=all&sort=updated&direction=desc&per_page=5']:Response.json([]),
 });
 const x=await createWorkspaceSource({mode:'github',clock:now,fetchImpl}).load('backlot');
 assert.equal(x.commits.state,'no_records');assert.equal(x.pull_requests.state,'no_records');
});
test('partial GitHub API rate limit preserves independent observed sections',async()=>{
 const {fetchImpl}=responder({['https://api.github.com/repos/'+repo+'/commits?per_page=5']:new Response('{}',{status:429})});
 const x=await createWorkspaceSource({mode:'github',clock:now,fetchImpl}).load('backlot');
 assert.equal(x.commits.state,'rate_limited_or_denied');assert.equal(x.commits.items.length,0);
 assert.equal(x.repository.state,'current');assert.equal(x.pull_requests.state,'current');
});
test('invalid list payload never masquerades as zero commits',async()=>{
 const {fetchImpl}=responder({['https://api.github.com/repos/'+repo+'/commits?per_page=5']:Response.json({message:'not an array'})});
 const x=await createWorkspaceSource({mode:'github',clock:now,fetchImpl}).load('backlot');
 assert.equal(x.commits.state,'unavailable');
});
test('an oversized payload is safely rejected',async()=>{
 const huge=new Response('x'.repeat(1024*1024+30),{status:200,headers:{'content-type':'application/json'}});
 const {fetchImpl}=responder({['https://api.github.com/repos/'+repo+'/commits?per_page=5']:huge});
 const x=await createWorkspaceSource({mode:'github',clock:now,fetchImpl}).load('backlot');
 assert.equal(x.commits.state,'unavailable');
});
test('JSON failures, transport failure and denied statuses remain unavailable',async()=>{
 const {fetchImpl}=responder({
  ['https://api.github.com/repos/'+repo+'/commits?per_page=5']:new Response('{bad json',{status:200}),
  ['https://api.github.com/repos/'+repo+'/pulls?state=all&sort=updated&direction=desc&per_page=5']:new Error('private error details must not leak'),
 });
 const x=await createWorkspaceSource({mode:'github',clock:now,fetchImpl}).load('backlot');
 assert.equal(x.commits.state,'unavailable');assert.equal(x.pull_requests.state,'unavailable');
 assert.ok(!JSON.stringify(x).includes('private error details'));
});
test('invalid source mode is rejected before use',()=>{
 assert.throws(()=>createWorkspaceSource({mode:'secret'}),/Unknown workspace source mode/);
});
