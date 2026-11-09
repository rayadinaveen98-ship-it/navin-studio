import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {request as nodeRequest} from 'node:http';
import {startStudioServer} from '../server.mjs';
const servers=new Map();
let outbound=0;
before(async()=>{
  for(const mode of ['fixture','github']){
    const app=await startStudioServer({port:0,mode,fetchImpl:async(url)=>{
      outbound++;
      return new Response(JSON.stringify({full_name:'rayadinaveen98-ship-it/framebynavin-android',private:false,default_branch:'main',archived:false}),{status:200});
    }});
    servers.set(mode,app);
  }
});
after(async()=>{
  await Promise.all([...servers.values()].map(({server})=>new Promise(resolve=>server.close(resolve))));
});
const request=(mode,path='/',init={})=>fetch(servers.get(mode).url.replace(/\/$/,'')+path,{redirect:'manual',...init});

test('server binds to loopback only and routes are not public-hosted',()=>{
  assert.deepEqual([...servers.values()].map(x=>x.server.address().address),['127.0.0.1','127.0.0.1']);
});
test('local pages label simulation vs real public GitHub mode at the top',async()=>{
  const d=await request('fixture');const g=await request('github');
  assert.equal(d.status,200);assert.equal(g.status,200);
  assert.match(await d.text(),/SIMULATED DATA — NOT LIVE/);
  assert.match(await g.text(),/PUBLIC GITHUB — READ ONLY/);
  assert.equal(d.headers.get('access-control-allow-origin'),null);
  assert.match(d.headers.get('content-security-policy'),/default-src 'none'/);
});
test('local frontend JavaScript has valid no-login mode and CSS is served',async()=>{
  for(const mode of ['fixture','github']){
    const js=await request(mode,'/control-room.js');assert.equal(js.status,200);
    const text=await js.text();assert.match(text,/user.role!=='local_preview'/);
    assert.doesNotMatch(text,/user.role!=='owner'/);
    const css=await request(mode,'/control-room.css');assert.match(css.headers.get('content-type'),/text\/css/);
    assert.ok((await css.text()).length>26000);
  }
});
test('local /api/me never pretends to be authenticated owner',async()=>{
  for(const mode of ['fixture','github']){
    const res=await request(mode,'/api/me');const data=await res.json();
    assert.equal(data.role,'local_preview');assert.equal(data.mode,mode);
    assert.equal(data.security,'loopback_only_no_login');
  }
});
test('overview counts and project catalog match checked-in release policy',async()=>{
  for(const mode of ['fixture','github']){
    const overview=await request(mode,'/api/overview').then(x=>x.json());
    const projects=await request(mode,'/api/projects').then(x=>x.json());
    assert.equal(overview.public_project_count,8);assert.equal(overview.approved_public_release_count,0);
    assert.equal(projects.projects.length,8);
  }
});
test('fixture mode requests never trigger any GitHub HTTP fetch',async()=>{
  const initial=outbound;
  const r=await request('fixture','/api/projects/backlot/source');const data=await r.json();
  assert.equal(r.status,200);assert.equal(data.source_state,'simulated');
  assert.equal(outbound,initial);
});
test('github mode makes narrow live-public requests through allowlist only',async()=>{
  const before=outbound;
  const r=await request('github','/api/projects/backlot/source');const data=await r.json();
  assert.equal(r.status,200);assert.equal(data.source_state,'current');assert.equal(outbound,before+1);
});
test('write methods and arbitrary project targets are blocked',async()=>{
  for(const method of ['POST','PUT','DELETE','OPTIONS']){
    const response=await request('fixture','/api/projects',{method});assert.equal(response.status,405);
  }
  const response=await request('github','/api/projects/attacker/source');assert.equal(response.status,404);
});
test('fake Host and cross-site Origin are denied before resources can be served',async()=>{
  const url=servers.get('fixture').url;
  const a=await new Promise((resolve,reject)=>{const req=nodeRequest(url,{headers:{Host:'evil.example'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode))});req.on('error',reject);req.end()});assert.equal(a,403);
  const b=await fetch(url,{headers:{Origin:'https://evil.example'}});assert.equal(b.status,403);
  const c=await fetch(url,{headers:{'Sec-Fetch-Site':'cross-site'}});assert.equal(c.status,403);
});
test('query-string and unknown routes are denied without outbound source fetch',async()=>{
  const before=outbound;
  assert.equal((await request('github','/api/projects?token=ignored')).status,400);
  assert.equal((await request('github','/private')).status,404);
  assert.equal((await request('github','/api/projects/backlot/admin')).status,404);
  assert.equal(outbound,before);
});
