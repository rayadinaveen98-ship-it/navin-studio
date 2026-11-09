import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {startStudioServer} from '../server.mjs';
import {projects} from '../source-adapter.mjs';
const servers=new Map(),calls={fixture:0,github:0};
before(async()=>{
 for(const mode of ['fixture','github']){
  const {server,url}=await startStudioServer({port:0,mode,fetchImpl:async(path)=>{
   calls[mode]++;
   const repo=path.slice('https://api.github.com/repos/'.length).split('/commits?')[0];const p=projects.find(p=>p.repository===repo);
   return Response.json([{sha:'b'.repeat(40),html_url:'https://github.com/'+repo+'/commit/'+'b'.repeat(40),commit:{message:'Change '+p?.name,author:{date:'2026-11-09T12:00:00Z'}}}]);
  }});servers.set(mode,{server,url});
 }
});
after(async()=>Promise.all([...servers.values()].map(({server})=>new Promise(ok=>server.close(ok)))));
const get=(mode,path,options)=>fetch(servers.get(mode).url.replace(/\/$/,'')+path,options);
test('studio-home HTML/CSS/JS served only from local loopback; source API is separate',async()=>{
 for(const mode of ['fixture','github']){
  const html=await get(mode,'/studio-home');assert.equal(html.status,200);assert.match((await html.text()),/Today's focus/);
  const css=await get(mode,'/studio-home.css');assert.match(css.headers.get('content-type'),/text\/css/);assert.ok((await css.text()).length>2000);
  const js=await get(mode,'/studio-home.js');assert.match(js.headers.get('content-type'),/text\/javascript/);assert.ok((await js.text()).length>2000);
 }
});
test('source route responds with eight canonical catalog identities and no APK claims',async()=>{
 const before=calls.fixture;const d=await get('fixture','/api/activity').then(r=>r.json());
 assert.equal(d.mode,'fixture');assert.equal(d.records.length,8);assert.equal(d.release_ready,null);assert.equal(calls.fixture,before);
 const g=await get('github','/api/activity').then(r=>r.json());
 assert.equal(g.mode,'github');assert.equal(g.sources.length,8);assert.equal(g.records.length,8);assert.equal(calls.github,8);
});
test('host, origin and sec-fetch-site checks block cross-origin home access',async()=>{
 for(const path of ['/studio-home','/studio-home.js','/api/activity']){
  const r=await get('fixture',path,{headers:{Origin:'https://example.net'}});assert.equal(r.status,403);
  const x=await get('fixture',path,{headers:{'Sec-Fetch-Site':'cross-site'}});assert.equal(x.status,403);
 }
});
test('no writes, no query bypass, no cross-origin sharing, no public CORS',async()=>{
 for(const method of ['POST','PUT','DELETE','OPTIONS'])assert.equal((await get('github','/api/activity',{method})).status,405);
 for(const path of ['/api/activity?repo=evil','/studio-home?secret=1','/studio-home/nope']){const r=await get('fixture',path);assert.ok([400,404].includes(r.status));}
 for(const path of ['/studio-home','/api/activity']){const r=await get('fixture',path);assert.equal(r.headers.get('access-control-allow-origin'),null);assert.match(r.headers.get('cache-control'),/no-store/)}
});
test('overview remains connected to main Control Room and no approved releases',async()=>{
 const r=await get('fixture','/api/overview').then(r=>r.json());assert.equal(r.approved_public_release_count,0);
 const app=await get('fixture','/');assert.match(await app.text(),/Studio Home ↗/);
});
