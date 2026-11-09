import test,{after,before} from 'node:test';
import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
import {startStudioServer} from '../server.mjs';
let server,url;
before(async()=>{const started=await startStudioServer({mode:'fixture',port:0,fetchImpl:()=>{throw Error('fixture must not fetch')}});server=started.server;url=started.url;});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));});
const get=(route,options={})=>fetch(url.slice(0,-1)+route,{redirect:'manual',...options});

test('eight project workspace pages serve local HTML with no inline script',async()=>{
 for(const id of ['backlot','frame-one','cinerelay','bridge','origin','petping','game-01','framebynavin']){
  const r=await get('/workspace/'+id);assert.equal(r.status,200,id);
  assert.match(r.headers.get('content-security-policy'),/script-src 'self'/);
  const html=await r.text();assert.match(html,/<script src="\/workspace.js" defer><\/script>/);
  assert.match(html,/<link rel="stylesheet" href="\/workspace.css">/);
  assert.doesNotMatch(html,/<script>.*<\/script>/);
 }
});
test('workspace JS/CSS load only from loopback with no external dependencies',async()=>{
 for(const [path,kind] of [['/workspace.js','javascript'],['/workspace.css','css']]){
  const r=await get(path);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),new RegExp(kind));
  assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('access-control-allow-origin'),null);
  assert.ok((await r.text()).length>500);
 }
});
test('workspace endpoint exposes only simulated records with no links or tokens',async()=>{
 const r=await get('/api/projects/backlot/workspace');assert.equal(r.status,200);
 const x=await r.json();assert.equal(x.ok,true);assert.equal(x.mode,'fixture');
 assert.equal(x.commits.state,'simulated');assert.equal(x.commits.items[0].url,null);
 assert.equal(x.milestones.state,'not_connected');assert.equal(x.release_ready,null);
});
test('unknown workspace pages and APIs reject, not fallback to a real project',async()=>{
 for(const path of ['/workspace/other','/api/projects/other/workspace','/workspace/backlot/private']){
  const r=await get(path);assert.equal(r.status,404,path);
 }
});
test('only GET allowed; cross-site browser Origin rejected',async()=>{
 const p=await get('/api/projects/backlot/workspace',{method:'POST'});assert.equal(p.status,405);
 const r=await get('/workspace/backlot',{headers:{Origin:'https://foreign.example'}});assert.equal(r.status,403);
});
test('host-header spoofing denied',async()=>{
 const status=await new Promise((resolve,reject)=>{
  const req=httpRequest(url+'workspace/backlot',{headers:{Host:'remote.example'}},res=>{res.resume();resolve(res.statusCode)});
  req.on('error',reject);req.end();
 });
 assert.equal(status,403);
});
