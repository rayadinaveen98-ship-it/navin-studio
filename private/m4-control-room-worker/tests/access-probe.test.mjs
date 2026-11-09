import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyAnonymousResponse,validProbeOrigin,probeOrigin} from '../scripts/probe-anonymous-access.mjs';

const req='https://private.example.com/control-room';
const classify=(status,location)=>classifyAnonymousResponse({status,location,requestUrl:req});

test('anonymous HTTP 200 on private HTML is an exposure and must fail',()=>{
 assert.equal(classify(200,null).result,'EXPOSURE');
});
test('Cloudflare Access login redirect is recognized without visiting it',()=>{
 assert.equal(classify(302,'https://myteam.cloudflareaccess.com/cdn-cgi/access/login/audience?redirect_url=ignored').result,'ACCESS_CHALLENGE');
});
test('relative same-origin Cloudflare Access challenge is recognized',()=>{
 assert.equal(classify(302,'/cdn-cgi/access/login/audience').result,'ACCESS_CHALLENGE');
});
test('generic redirect never proves Access is working',()=>{
 assert.equal(classify(302,'https://example.org/welcome').result,'INCONCLUSIVE');
 assert.equal(classify(301,'/control-room/').result,'INCONCLUSIVE');
});
test('HTTP 403 or 401 remains inconclusive: Worker can reject without Cloudflare',()=>{
 assert.equal(classify(403,null).result,'INCONCLUSIVE');
 assert.equal(classify(401,null).result,'INCONCLUSIVE');
});
test('only explicit HTTPS root origins without credentials or query are accepted',()=>{
 for(const origin of ['http://example.com','http://localhost:8787','https://user:pass@example.com','https://site.example.com/admin','https://site.example.com/?token=x','https://site.example.com/#preview','javascript:alert(1)','']){
  assert.equal(validProbeOrigin(origin),null,origin);
 }
 assert.equal(validProbeOrigin('https://private.example.com'),'https://private.example.com');
 assert.equal(validProbeOrigin('https://private.example.com/'),'https://private.example.com');
});
test('operator probe accepts all Access redirects but DOES NOT claim owner login works',async()=>{
 const called=[];
 const mock=async(url,options)=>{
   called.push({url,options});
   return new Response(null,{status:302,headers:{location:'https://team.cloudflareaccess.com/cdn-cgi/access/login/test'}});
 };
 const answer=await probeOrigin('https://private.example.com',mock);
 assert.equal(answer.outcome,'ACCESS_CHALLENGE');
 assert.equal(answer.results.length,5);
 assert.ok(called.every(x=>x.options.redirect==='manual'&&x.options.credentials==='omit'&&x.options.method==='GET'));
 assert.ok(called.every(x=>x.url.startsWith('https://private.example.com/')));
});
test('mixed 403/302 returns inconclusive; no false security certification',async()=>{
 const mock=async(url)=>new Response(null,{status:url.endsWith('/api/projects')?403:302,headers:url.endsWith('/api/projects')?{}:{location:'https://team.cloudflareaccess.com/cdn-cgi/access/login/test'}});
 const answer=await probeOrigin('https://private.example.com',mock);
 assert.equal(answer.outcome,'INCONCLUSIVE');
});
test('one publicly accessible protected asset makes the result exposure',async()=>{
 const mock=async(url)=>new Response(null,{status:url.endsWith('/control-room.css')?200:302,headers:url.endsWith('/control-room.css')?{}:{location:'https://team.cloudflareaccess.com/cdn-cgi/access/login/test'}});
 const answer=await probeOrigin('https://private.example.com',mock);
 assert.equal(answer.outcome,'EXPOSURE');
});
