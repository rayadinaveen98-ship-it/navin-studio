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
    if(m.method==='Runtime.exceptionThrown'){
      const d=m.params?.exceptionDetails||{};
      jsErrors.push({text:d.text||'uncaught',url:d.url||'',line:d.lineNumber,column:d.columnNumber,description:d.exception?.description||'',stack:d.stackTrace?.callFrames?.slice(0,3)||[]});
    }
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

  // Project story is a first-class, shareable public page, not a small modal.
  await evaluate('document.querySelector("[data-project=backlot]").click()');
  await until('location.hash==="#project/backlot" && document.querySelector("#view-project")?.classList.contains("is-active")',2500);
  check(await evaluate('document.querySelector("#project-story-title")?.textContent==="Backlot"'),'Wrong desktop project heading');
  check(await evaluate('document.querySelectorAll("#view-project .px-facet").length===3'),'Missing creative-focus sections');
  check(await evaluate('document.querySelector("#view-project .px-access")?.textContent.includes("No studio-approved public download")'),'Unapproved release disclosure missing');
  check(await evaluate('document.querySelector("#view-project a.px-button-primary")?.href.includes("github.com/rayadinaveen98-ship-it/framebynavin-android")'),'Public source link mismatch');
  // Existing site views use a 420ms entry fade; capture the settled design.
  await sleep(580);
  await snap('desktop-project-backlot.png');
  // Capture actual lower-page editorial design, not only the hero.
  await evaluate('document.querySelector(".px-story-grid").scrollIntoView({block:"start",behavior:"instant"})');
  await sleep(190);
  await snap('desktop-project-story.png');
  await evaluate('document.querySelector(".px-explore").scrollIntoView({block:"start",behavior:"instant"})');
  await sleep(190);
  await snap('desktop-project-exploration.png');
  await evaluate('window.scrollTo({top:0,behavior:"instant"})');

  // Related project navigation updates the URL and content; history remains usable.
  await evaluate('document.querySelector("#view-project .px-related-card").click()');
  await until('location.hash.startsWith("#project/") && location.hash!=="#project/backlot"',2000);
  await evaluate('history.back()');
  await until('location.hash==="#project/backlot" && document.querySelector("#project-story-title")?.textContent==="Backlot"',2000);
  await evaluate('document.querySelector("#view-project .px-breadcrumb [data-route=creations]").click()');
  await until('location.hash==="#creations" && document.querySelector("#view-creations")?.classList.contains("is-active")',2000);

  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await openSite();
  await until('document.querySelector("#studio-intro-shell")?.hidden===false',1800);
  await sleep(1900);
  await snap('mobile-mid-animation.png');
  await until('document.querySelector("#studio-intro-shell")?.hidden===true',8500);
  check(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'),'Horizontal overflow on mobile');
  await snap('mobile-real-homepage.png');

  await evaluate('document.querySelector("[data-project=frame-one]").click()');
  await until('location.hash==="#project/frame-one" && document.querySelector("#project-story-title")?.textContent==="Frame One"',2000);
  check(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'),'Project page caused mobile horizontal overflow');
  check(await evaluate('document.querySelector("#view-project .px-hero")?.getBoundingClientRect().width <= window.innerWidth'),'Project hero clipped on mobile');
  await sleep(580);
  await snap('mobile-project-frame-one.png');
  await evaluate('document.querySelector(".px-explore").scrollIntoView({block:"start",behavior:"instant"})');
  await sleep(190);
  await snap('mobile-project-exploration.png');
  await evaluate('document.querySelector(".px-access").scrollIntoView({block:"start",behavior:"instant"})');
  await sleep(190);
  await snap('mobile-project-access.png');
  check(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'),'Mobile lower-page overflow');
  await evaluate('window.scrollTo({top:0,behavior:"instant"})');

  // Accessibility contract for the visible project view (automated checks;
  // not a substitute for physical-device or assistive-technology review).
  const audit=await evaluate(`(() => {
    const root=document.getElementById('view-project');
    const elements=[...root.querySelectorAll('button,a[href]')].filter(el => el.getClientRects().length > 0);
    const missingNames=elements.filter(el => !(el.getAttribute('aria-label') || el.innerText || el.title || '').trim()).map(el => el.outerHTML.slice(0,100));
    const imagesWithoutAlt=[...root.querySelectorAll('img')].filter(el => !el.hasAttribute('alt')).length;
    const breadcrumb=root.querySelector('.px-breadcrumb button');
    const backHeight=breadcrumb?.getBoundingClientRect().height ?? 0;
    return {headings:root.querySelectorAll('h1').length,missingNames,imagesWithoutAlt,backHeight};
  })()`);
  check(audit.headings===1,'Project view must have one semantic h1');
  check(audit.missingNames.length===0,'Unlabelled project controls: '+JSON.stringify(audit.missingNames));
  check(audit.imagesWithoutAlt===0,'Project image missing alt attribute');
  check(audit.backHeight>=44,'Mobile breadcrumb target below 44 CSS pixels: '+audit.backHeight);

  // Non-overflow contract at small-phone and tablet sizes, not only 390px.
  for(const width of [360,768]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    await sleep(160);
    check(await evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'),'Project page overflows at '+width+'px');
  }
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});

  // Every public catalog entry must resolve into its own editorial project page.
  const ids=await evaluate('projects.map(project => project.id)');
  check(ids.length===8,'Public catalog is not eight projects');
  for(const id of ids){
    await evaluate('location.hash = '+JSON.stringify('#project/'+id));
    await until('document.querySelector("#project-story-title")?.textContent === projects.find(p => p.id === '+JSON.stringify(id)+')?.name',2500);
    check(await evaluate('document.querySelector("#view-project .px-access")?.textContent.includes("No studio-approved public download")'),'Incorrect release status for '+id);
  }
  await evaluate('location.hash="#project/frame-one"');
  await until('document.querySelector("#project-story-title")?.textContent==="Frame One"',2000);

  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await openSite();
  await until('document.readyState==="complete"');
  check(await evaluate('document.querySelector("#studio-intro-shell").hidden===true'),'Reduced-motion path played the intro');
  check(await evaluate('!document.body.classList.contains("studio-intro-active")'),'Reduced-motion locked page');

  // Direct deep-link refresh resolves the correct project after catalog loads.
  await cdp('Page.navigate',{url:origin+'/index.html#project/bridge'});
  await until('document.querySelector("#project-story-title")?.textContent==="Bridge" && document.querySelector("#view-project")?.classList.contains("is-active")',3500);
  check(await evaluate('document.title==="Bridge — NAVIN STUDIO"'),'Deep-linked page document title mismatch');

  await writeFile(path.join(artifacts,'browser-exceptions.json'),JSON.stringify(jsErrors,null,2));
  check(jsErrors.length===0,'Unexpected browser script errors: '+JSON.stringify(jsErrors));
  const result={ok:true,scenarios:['fresh-entry','desktop-handoff','skip','replay','SPA-route','desktop-project','related-project','browser-history','mobile-handoff','mobile-overflow','mobile-project','mobile-accessibility-contract','small-screen-360','tablet-768','eight-project-routes','reduced-motion','project-deep-link'],uncaughtErrors:jsErrors};
  await writeFile(path.join(artifacts,'browser-smoke.json'),JSON.stringify(result,null,2));
  console.log('PASS: NAVIN STUDIO V3 + 17 Chrome smoke scenarios.');
}
try {await run();}
catch(e){console.error('FAIL:',e.stack||e);console.error('Chrome stderr:',chromeErr.slice(-1300));process.exitCode=1;}
finally{
  for(const p of pending.values())p.reject(new Error('Browser shutdown'));
  try{connection?.close()}catch{}
  chrome.kill('SIGTERM');
  await rm(profile,{recursive:true,force:true}).catch(()=>{});
}
