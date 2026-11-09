import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createHandler } from '../src/index.js';

/**
 * Loopback HTTP tests for the actual Worker Response surface.
 * Test servers inject Access contexts; request headers never create identity.
 * This is NOT Cloudflare Access, and no service is deployed.
 */
const env=Object.freeze({ACCESS_AUD:'fixture-access-app',OWNER_USER_UUID:'fixture-owner-uuid'});
const identity=(id=env.OWNER_USER_UUID,aud=env.ACCESS_AUD)=>({
  access:{aud,getIdentity:async()=>({user_uuid:id,email:'fixture@invalid.test'})}
});
const githubFetch=async(url)=>{
  if(url.endsWith('/actions/runs?per_page=1'))return new Response(JSON.stringify({workflow_runs:[{
    id:724, status:'completed', conclusion:'success', name:'Fixture CI',
    head_sha:'d'.repeat(40),
    html_url:'https://github.com/rayadinaveen98-ship-it/framebynavin-android/actions/runs/724'
  }]}),{status:200});
  return new Response(JSON.stringify({
    full_name:'rayadinaveen98-ship-it/framebynavin-android',
    private:false,archived:false,default_branch:'main',updated_at:'2026-11-08T00:00:00Z'
  }),{status:200});
};
const handler=createHandler({now:()=>new Date('2026-11-09T00:00:00.000Z'),githubFetch});
const contexts=[
  ['owner',identity()],
  ['anonymous',{}],
  ['non-owner',identity('fixture-other-user')],
  ['wrong-audience',identity(env.OWNER_USER_UUID,'other-app')]
];
const servers=new Map();
before(async()=>{
  for(const [name,ctx] of contexts){
    const server=createServer(async(incoming,outgoing)=>{
      try{
        const url='http://127.0.0.1:'+server.address().port+(incoming.url||'/');
        const request=new Request(url,{method:incoming.method,headers:incoming.headers});
        const response=await handler(request,env,ctx);
        outgoing.writeHead(response.status,Object.fromEntries(response.headers.entries()));
        outgoing.end(Buffer.from(await response.arrayBuffer()));
      }catch{
        outgoing.writeHead(500,{'content-type':'text/plain'});outgoing.end('fixture_error');
      }
    });
    server.listen(0,'127.0.0.1');
    await once(server,'listening');
    servers.set(name,{server,origin:'http://127.0.0.1:'+server.address().port});
  }
});
after(async()=>{
  await Promise.all([...servers.values()].map(({server})=>new Promise(resolve=>server.close(resolve))));
});
async function http(name,path,opts={}){
  const {origin}=servers.get(name);
  return fetch(origin+path,{redirect:'manual',...opts});
}
test('anonymous HTTP clients cannot fetch any UI asset or API route',async()=>{
  const paths=['/control-room','/control-room.js','/control-room.css','/api/me','/api/overview','/api/projects','/api/projects/backlot/source','/api/projects/backlot/ci'];
  for(const path of paths){
    const response=await http('anonymous',path);
    assert.equal(response.status,403,path);
    assert.equal((await response.json()).error,'owner_access_required');
    assert.equal(response.headers.get('access-control-allow-origin'),null);
    assert.match(response.headers.get('cache-control')||'',/no-store/);
  }
});
test('nonowner and mismatched Access audience fail closed on HTTP routes',async()=>{
  for(const name of ['non-owner','wrong-audience']){
    for(const path of ['/control-room','/control-room.js','/control-room.css','/api/projects']){
      const response=await http(name,path);
      assert.equal(response.status,403,name+' '+path);
    }
  }
});
test('spoofed identity headers never authorize anonymous browser requests',async()=>{
  const response=await http('anonymous','/control-room',{headers:{'CF-Access-JWT-Assertion':'spoofed','X-Owner-Id':env.OWNER_USER_UUID}});
  assert.equal(response.status,403);
});
test('owner HTTP route serves HTML only after server-side identity injection',async()=>{
  const response=await http('owner','/control-room');
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type')||'',/text\/html/);
  assert.match(response.headers.get('content-security-policy')||'',/script-src 'self'/);
  assert.equal(response.headers.get('access-control-allow-origin'),null);
  assert.match(response.headers.get('cache-control')||'',/no-store/);
  const html=await response.text();
  assert.match(html,/<link rel="stylesheet" href="\/control-room\.css">/);
  assert.match(html,/<script src="\/control-room\.js" defer><\/script>/);
});
test('owner HTML, CSS, JS, API resources are all same-origin and not publicly cached',async()=>{
  for(const [path,type] of [['/control-room.js','text/javascript'],['/control-room.css','text/css'],['/api/overview','application/json']]){
    const r=await http('owner',path);
    assert.equal(r.status,200);
    assert.match(r.headers.get('content-type')||'',new RegExp(type));
    assert.match(r.headers.get('cache-control')||'',/no-store/);
    assert.equal(r.headers.get('x-frame-options'),'DENY');
    assert.equal(r.headers.get('access-control-allow-origin'),null);
    assert.ok((await r.text()).length>60);
  }
});
test('preflight and write attempts cannot use an accidental CORS or write route',async()=>{
  for(const method of ['OPTIONS','POST','PUT','DELETE']){
    const response=await http('owner','/api/projects',{method,headers:{Origin:'https://untrusted.invalid'}});
    assert.equal(response.status,405);
    assert.equal(response.headers.get('allow'),'GET');
    assert.equal(response.headers.get('access-control-allow-origin'),null);
  }
});
test('directory and approved release count remain accurate, with unknown metrics null',async()=>{
  const [overview,projects]=await Promise.all([
    http('owner','/api/overview').then(x=>x.json()),
    http('owner','/api/projects').then(x=>x.json())
  ]);
  assert.equal(overview.approved_public_release_count,0);
  assert.equal(overview.ci_success_count,null);
  assert.equal(overview.public_project_count,projects.projects.length);
  assert.equal(projects.projects.length,8);
});
test('source and CI HTTP endpoints have correct provenance with no APK readiness claim',async()=>{
  const [source,ci]=await Promise.all([
    http('owner','/api/projects/backlot/source').then(x=>x.json()),
    http('owner','/api/projects/backlot/ci').then(x=>x.json())
  ]);
  assert.equal(source.source_state,'current');
  assert.equal(source.data.repository,'rayadinaveen98-ship-it/framebynavin-android');
  assert.equal(source.observed_at,'2026-11-09T00:00:00.000Z');
  assert.equal(ci.source_state,'current');
  assert.equal(ci.data.run_id,724);
  assert.equal(ci.data.release_ready,null);
  assert.equal(ci.data.run_url,'https://github.com/rayadinaveen98-ship-it/framebynavin-android/actions/runs/724');
});
test('owner cannot use origin trickery or query arguments to access unpublished routes',async()=>{
  for(const path of ['/internal','/admin','/control-room/preview','/api/projects?owner=1','/api/projects/evil/source']){
    const response=await http('owner',path);
    assert.ok([400,404].includes(response.status),path);
    assert.equal(response.headers.get('access-control-allow-origin'),null);
  }
});
