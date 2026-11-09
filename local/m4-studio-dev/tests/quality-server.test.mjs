import test,{before,after} from 'node:test';import assert from 'node:assert/strict';import {startStudioServer} from '../server.mjs';
let server,url;before(async()=>{const r=await startStudioServer({mode:'fixture',port:0,fetchImpl:()=>{throw Error('fixture network forbidden')}});server=r.server;url=r.url;});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));});
const get=(path,options={})=>fetch(url.slice(0,-1)+path,{redirect:'manual',...options});
test('fixture quality endpoint is loopback and read-only, with zero external URLs',async()=>{
 const r=await get('/api/projects/backlot/quality');assert.equal(r.status,200);const j=await r.json();assert.equal(j.mode,'fixture');assert.equal(j.runs.state,'simulated');assert.equal(j.runs.items[0].url,null);assert.equal(j.runs.release_ready,null);assert.match(r.headers.get('cache-control'),/no-store/);
});
test('eight project QA routes return safe simulated evidence',async()=>{
 for(const id of ['backlot','frame-one','cinerelay','bridge','origin','petping','game-01','framebynavin'])assert.equal((await get('/api/projects/'+id+'/quality')).status,200,id);
});
test('fixture job details return no fake jobs',async()=>{
 const r=await get('/api/projects/backlot/quality/runs/1275/jobs');assert.equal(r.status,200);const x=await r.json();assert.equal(x.jobs.state,'simulated');assert.equal(x.jobs.items.length,0);
});
test('unknown projects and invalid path variants rejected',async()=>{
 for(const path of ['/api/projects/evil/quality','/api/projects/backlot/quality/runs/0/jobs','/api/projects/backlot/quality/runs/1%2f3/jobs'])assert.equal((await get(path)).status,404,path);
});
test('quality endpoints reject cross-origin, writes, queries',async()=>{
 assert.equal((await get('/api/projects/backlot/quality',{method:'POST'})).status,405);
 assert.equal((await get('/api/projects/backlot/quality?arbitrary=1')).status,400);
 assert.equal((await get('/api/projects/backlot/quality',{headers:{Origin:'https://attacker.example'}})).status,403);
});
