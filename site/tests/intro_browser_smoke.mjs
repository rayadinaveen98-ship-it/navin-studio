#!/usr/bin/env node
/** Actual Chrome/Chromium smoke of V3 over the current website. No npm packages. */
import {spawn} from 'node:child_process';
import {readFile, mkdir, mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const origin=process.env.STUDIO_TEST_ORIGIN || 'http://127.0.0.1:4173';
const artifacts=process.env.STUDIO_TEST_ARTIFACTS || path.resolve('site/qa-intro-evidence');
const executable=process.env.CHROME_BIN || 'chromium';
const profile=await mkdtemp(path.join(tmpdir(),'navin-studio-chrome-'));
await mkdir(artifacts,{recursive:true});
const chrome=spawn(executable,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--disable-gpu','--hide-scrollbars','--no-first-run','--no-default-browser-check',
  '--remote-debugging-port=0','--user-data-dir='+profile,
  '--window-size=1440,900','about:blank'
],{stdio:['ignore','ignore','pipe']});
let chromeErr='',connection,seq=0;
const pending=new Map(),jsErrors=[];
chrome.stderr?.on('data',chunk=>{chromeErr+=String(chunk).slice(-4000);});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const check=(condition,message)=>{if(!condition)throw new Error(message)};
async function retry(task,ms=12000){
  const start=Date.now();let last;
  do {try{const result=await task();if(result)return result;}catch(e){last=e;}await sleep(120);}
  while(Date.now()-start<ms);
  throw new Error('Timed out waiting for '+(last?.message||'browser state'));
}
async function cdp(method,params={}){
  const id=++seq;
  return await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method))},13000);
    pending.set(id,{resolve:v=>{clearTimeout(timeout);resolve(v)},reject:e=>{clearTimeout(timeout);reject(e)}});
    connection.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression){
  const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw new Error('Browser JS evaluation error '+JSON.stringify(r.exceptionDetails));
  return r.result?.value;
}
async function until(expression,timeout=9000){
  return await retry(async()=>await evaluate(expression),timeout);
}
async function snap(name){
  const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(path.join(artifacts,name),Buffer.from(r.data,'base64'));
}
async function openSite(){
  await cdp('Page.navigate',{url:origin+'/index.html'});
  await until('document.readyState==="complete"',7500);
}
async function run(){
  const portString=await retry(async()=>{
    const raw=await readFile(path.join(profile,'DevToolsActivePort'),'utf8');
    return raw.split('\n')[0]?.trim();
  },12000);
  const tabs=await retry(async()=>{
    const x=await fetch('http://127.0.0.1:'+portString+'/json/list').then(r=>r.json());
    return x.find(t=>t.type==='page'&&t.webSocketDebuggerUrl);
  });
  connection=new WebSocket(tabs.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
    connection.addEventListener('open',resolve,{once:true});
    connection.addEventListener('error',reject,{once:true});
  });
  connection.addEventListener('message',event=>{
    const m=JSON.parse(event.data);
    if(m.id && pending.has(m.id)){
      const p=pending.get(m.id);pending.delete(m.id);
      m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);
    }
    if(m.method==='Runtime.exceptionThrown')jsErrors.push(m.params?.exceptionDetails?.text||'uncaught script error');
  });
  await cdp('Page.enable');
  await cdp('Runtime.enable');

  await openSite();
  await until('document.querySelector("#studio-intro-shell")?.hidden===false',1800);
  const frameUrl=await evaluate('document.querySelector("#studio-intro-frame")?.src');
  check(frameUrl.endsWith('/intro/living-architecture-v3.html'),'Wrong cinematic asset path');
  await sleep(1150);
  await snap('desktop-mid-animation.png');
  await until('document.querySelector("#studio-intro-shell")?.hidden===true',8500);
  check(await evaluate('!document.querySelector("header.site-header").inert && !document.getElementById("main-content").inert'),'Main website remained inert');
  check(await evaluate('document.getElementById("hero-title")?.textContent.includes("NAVIN")'),'Homepage content not visible');
  await snap('desktop-real-homepage.png');

  await openSite();
  await until('document.querySelector("#studio-intro-shell")?.hidden===false',1800);
  await evaluate('document.querySelector("#studio-intro-skip").click()');
  await until('document.querySelector("#studio-intro-shell")?.hidden===true',1200);
  check(await evaluate('!document.body.classList.contains("studio-intro-active")'),'Skip failed to unlock body');

  await evaluate('document.querySelector("#studio-replay-intro").click()');
  await until('document.querySelector("#studio-intro-shell")?.hidden===false',1200);
  await evaluate('document.querySelector("#studio-intro-skip").click()');
  await until('document.querySelector("#studio-intro-shell")?.hidden===true',1200);
  await evaluate('document.querySelector("[data-route=creations]").click()');
  await sleep(300);
  check(await evaluate('document.querySelector("#studio-intro-shell").hidden===true'),'Internal navigation replayed opening');

  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await openSite();
  await until('document.querySelector("#studio-intro-shell")?.hidden===false',1800);
  await sleep(1900);
  await snap('mobile-mid-animation.png');
  await until('document.querySelector("#studio-intro-shell")?.hidden===true',8500);
  check(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'),'Horizontal overflow on mobile');
  await snap('mobile-real-homepage.png');

  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await openSite();
  await until('document.readyState==="complete"');
  check(await evaluate('document.querySelector("#studio-intro-shell").hidden===true'),'Reduced-motion path played the intro');
  check(await evaluate('!document.body.classList.contains("studio-intro-active")'),'Reduced-motion locked page');

  check(jsErrors.length===0,'Unexpected browser script errors: '+jsErrors.join(' | '));
  const result={ok:true,scenarios:['fresh-entry','desktop-handoff','skip','replay','SPA-route','mobile-handoff','mobile-overflow','reduced-motion'],uncaughtErrors:jsErrors};
  await writeFile(path.join(artifacts,'browser-smoke.json'),JSON.stringify(result,null,2));
  console.log('PASS: NAVIN STUDIO V3 + 8 Chrome smoke scenarios.');
}
try {await run();}
catch(e){console.error('FAIL:',e.stack||e);console.error('Chrome stderr:',chromeErr.slice(-1300));process.exitCode=1;}
finally{
  for(const p of pending.values())p.reject(new Error('Browser shutdown'));
  try{connection?.close()}catch{}
  chrome.kill('SIGTERM');
  await rm(profile,{recursive:true,force:true}).catch(()=>{});
}
