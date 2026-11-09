'use strict';
/* M4-D4 — local-only Studio Home. Only low-sensitivity project IDs in browser storage.
 * No notes, tokens, access credentials, remote writes, or inferred completion. */
const $=(id)=>document.getElementById(id);
const safeText=(value)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const repoRe=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const idRe=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STORAGE='navin-studio-local-focus-v1';
let catalog=[],selected=[],mode='unknown',activity=null,filter='all',requestSerial=0;
function dateText(s){if(typeof s!=='string'||Number.isNaN(Date.parse(s)))return 'Time not verified';return new Date(s).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});}
function stateTitle(s){return ({current:'Verified source',simulated:'Simulated',no_records:'No latest commit',rate_limited_or_denied:'Rate limited',unavailable:'Unavailable'})[s]||'Unknown';}
function setStatus(state,title,detail){$('homeStatus').dataset.state=state;$('homeStatusTitle').textContent=title;$('homeStatusDetail').textContent=detail;}
function validCatalog(projects){return Array.isArray(projects)&&projects.length===8&&projects.every(p=>p&&idRe.test(p.id)&&typeof p.name==='string'&&p.name.length<=110&&repoRe.test(p.repository)&&typeof p.category==='string')&&new Set(projects.map(p=>p.id)).size===8;}
async function readLocal(path){if(!['/api/me','/api/projects','/api/overview','/api/activity'].includes(path))throw Error('blocked_route');
 const response=await fetch(path,{method:'GET',redirect:'error',cache:'no-store',credentials:'same-origin',headers:{accept:'application/json'}});
 if(!response.ok||!(response.headers.get('content-type')||'').includes('application/json'))throw Error('source_unavailable');
 const json=await response.json();if(json?.ok!==true)throw Error('invalid_source');return json;
}
function storedIds(){try{const raw=JSON.parse(localStorage.getItem(STORAGE)||'[]');return Array.isArray(raw)?raw.filter(id=>typeof id==='string'&&idRe.test(id)).slice(0,3):[]}catch{return []}}
function saveFocus(){try{localStorage.setItem(STORAGE,JSON.stringify(selected));return true}catch{return false}}
function renderFocus(){const byId=new Map(catalog.map(p=>[p.id,p]));selected=selected.filter(id=>byId.has(id)).slice(0,3);
 $('focusCount').innerHTML=selected.length+' <em>/ 3</em>';
 $('clearFocus').disabled=selected.length===0;
 $('focusStack').innerHTML=selected.length?selected.map((id,i)=>{const p=byId.get(id);return `<div class="focus-card"><span class="focus-no">0${i+1}</span><div class="focus-text"><strong>${safeText(p.name)}</strong><span>Chosen by you · not an inferred priority</span></div><a href="/workspace/${encodeURIComponent(id)}">Open ↗</a></div>`}).join(''):'<div class="focus-empty"><strong>No focus chosen yet.</strong><br>Pick up to three projects from the selector.<br>Nothing is automatically prioritized.</div>';
 $('focusChoices').innerHTML=catalog.map(p=>{const active=selected.includes(p.id),disabled=!active&&selected.length>=3;return `<button class="focus-choice" type="button" data-choice="${safeText(p.id)}" aria-pressed="${active}" ${disabled?'disabled':''}><span class="focus-name">${safeText(p.name)}</span><span class="focus-symbol" aria-hidden="true">${active?'✓':'+'}</span></button>`}).join('');
 if(filter==='focus')renderRecords();
}
function toggleFocus(id){if(!catalog.some(p=>p.id===id))return;const exists=selected.includes(id);
 if(exists)selected=selected.filter(x=>x!==id);else if(selected.length<3)selected=[...selected,id];else return;
 const saved=saveFocus();renderFocus();if(!saved)setStatus('error','Browser storage unavailable','Your focus is still selected for this page session, but cannot be saved in this browser.');
}
function renderCatalog(){const html=catalog.map(p=>`<a class="project-nav-item" href="/workspace/${encodeURIComponent(p.id)}"><span class="project-nav-symbol" aria-hidden="true">${safeText(p.name.slice(0,1).toUpperCase())}</span><span class="project-nav-title">${safeText(p.name)}</span></a>`).join('');$('sideProjects').innerHTML=html;}
function validActivity(v){return v?.ok===true&&v.mode===mode&&v.source_count===catalog.length&&Array.isArray(v.sources)&&v.sources.length===catalog.length&&Array.isArray(v.records)&&v.records.length<=catalog.length&&v.release_ready===null;}
function normalizedRecord(r){const p=catalog.find(x=>x.id===r?.project_id);if(!p||r.repository!==p.repository||typeof r.title!=='string')return null;
 if(mode==='fixture'&&r.simulated===true&&r.url===null&&r.sha===null)return {...r,project_name:p.name};
 if(mode!=='github'||r.simulated!==false||!/^[0-9a-f]{40}$/.test(r.sha||'')||r.url!=='https://github.com/'+p.repository+'/commit/'+r.sha||typeof r.authored_at!=='string'||Number.isNaN(Date.parse(r.authored_at)))return null;
 return {...r,project_name:p.name};}
function renderRecords(){if(!activity){$('activityList').innerHTML='<li class="feed-empty">Choose Load latest activity to inspect the available sources.</li>';return;}
 const filtered=activity.records.filter(r=>filter==='all'||selected.includes(r.project_id));
 $('activityList').innerHTML=filtered.length?filtered.map((r,i)=>{const url=mode==='github'?r.url:null;const headline=url?`<a href="${safeText(url)}" target="_blank" rel="noopener noreferrer">${safeText(r.title)} ↗</a>`:`<strong>${safeText(r.title)}</strong>`;
 return `<li class="activity-item"><span class="activity-glyph" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><div class="activity-body">${headline}<div class="activity-meta"><span class="activity-badge">${safeText(r.project_name)}</span><span>${mode==='fixture'?'SIMULATED · NOT LIVE':dateText(r.authored_at)}</span>${r.short_sha?`<span class="mono">${safeText(r.short_sha)}</span>`:''}<a href="/workspace/${encodeURIComponent(r.project_id)}">Workspace ↗</a></div></div></li>`;}).join(''):
 `<li class="feed-empty">${filter==='focus'?'None of your selected projects has a returned activity record. Source failures remain unknown.':'No verifiable latest commits returned. Check the source coverage states.'}</li>`;
}
function renderActivity(snapshot){const allowed=new Set(catalog.map(p=>p.id));const src=new Map();for(const entry of snapshot.sources){if(!allowed.has(entry.id)||src.has(entry.id)||entry.repository!==catalog.find(p=>p.id===entry.id).repository)return false;src.set(entry.id,entry)}
 if(src.size!==catalog.length)return false;
 const records=snapshot.records.map(normalizedRecord);if(records.some(x=>!x))return false;
 if(mode==='fixture' && (snapshot.sources.some(s=>s.state!=='simulated')||records.some(r=>!r.simulated)))return false;
 if(mode==='github' && (snapshot.sources.some(s=>s.state==='simulated')||records.some(r=>r.simulated)))return false;
 activity={...snapshot,records};
 $('activityTag').textContent=mode==='fixture'?'SIMULATED':records.length?'PUBLIC EVIDENCE':'NO VERIFIED CHANGES';
 $('activityTag').dataset.state=mode==='fixture'?'simulated':records.length?'current':'unavailable';
 const current=snapshot.sources.filter(s=>s.state==='current').length;
 $('sourceCount').textContent=mode==='fixture'?'0 / 8':`${current} / ${catalog.length}`;
 $('sourceCountNote').textContent=mode==='fixture'?'Offline examples only':'Successfully read public source';
 $('activitySummary').textContent=mode==='fixture'?'SIMULATED DATA — illustrative cards, not actual GitHub activity.':`${records.length} verified latest-commit records returned across ${catalog.length} repositories. Requests observed ${snapshot.observed_at||'at unknown time'}; rate limits or missing records are explicitly marked.`;
 $('sourceList').innerHTML=catalog.map(p=>{const state=src.get(p.id).state;return `<li class="source-entry" data-state="${safeText(state)}"><a href="/workspace/${encodeURIComponent(p.id)}">${safeText(p.name)}</a><span>${stateTitle(state)}</span></li>`;}).join('');
 $('sourceObserved').textContent=mode==='fixture'?'Simulated only. No GitHub requests.':`Observed: ${snapshot.observed_at||'unknown'} · One request per repo (up to 8) · no polling.`;
 renderRecords();return true;
}
async function loadActivity(){const n=++requestSerial;const button=$('loadActivity');button.disabled=true;button.textContent='Checking sources…';
 $('activityTag').textContent='LOADING';$('sourceCountNote').textContent='Checking public source response';
 $('activityList').innerHTML='<li class="feed-empty">Checking source adapter…</li>';
 try{const data=await readLocal('/api/activity');if(n!==requestSerial)return;if(!validActivity(data)||!renderActivity(data))throw Error('invalid_source');
 setStatus(mode==='fixture'?'simulated':'github',mode==='fixture'?'SIMULATED ACTIVITY — NOT LIVE':'PUBLIC REPOSITORY ACTIVITY OBSERVED',mode==='fixture'?'No GitHub requests made. Cards are examples only.':'Source results explicitly identify unavailable and rate-limited repositories. No progress inference.');
 }catch{if(n!==requestSerial)return;activity=null;$('sourceCount').textContent='—';$('sourceCountNote').textContent='Not verified';$('sourceList').innerHTML='<li class="feed-empty">Source request failed. No stale source records shown as current.</li>';
 $('activityList').innerHTML='<li class="feed-empty">Unable to verify the activity snapshot. Retry when public GitHub access is available.</li>';$('activityTag').textContent='UNAVAILABLE';
 setStatus('error','Activity evidence unavailable','No previously loaded GitHub activity is presented as current.');
 }finally{if(n===requestSerial){button.disabled=false;button.innerHTML='Load latest activity <span aria-hidden="true">↻</span>';}}
}
async function initialize(){try{
 const [me,dir,overview]=await Promise.all([readLocal('/api/me'),readLocal('/api/projects'),readLocal('/api/overview')]);
 if(me.role!=='local_preview'||!['github','fixture'].includes(me.mode)||dir.mode!==me.mode||!validCatalog(dir.projects)||overview.public_project_count!==dir.projects.length||!Number.isSafeInteger(overview.approved_public_release_count))throw Error('invalid_catalog');
 mode=me.mode;catalog=dir.projects;selected=storedIds().filter(id=>catalog.some(p=>p.id===id)).slice(0,3);
 renderCatalog();renderFocus();$('projectCount').textContent=String(catalog.length).padStart(2,'0');$('approvedCount').textContent=String(overview.approved_public_release_count).padStart(2,'0');
 $('modeRibbon').textContent=mode==='fixture'?'SIMULATED DATA — NOT LIVE':'PUBLIC GITHUB — ON-DEMAND ONLY';
 $('heroMode').textContent=mode==='fixture'?'SIMULATED DATA · NOT LIVE':'PUBLIC SOURCES · READ ONLY';
 $('modeChip').textContent=mode==='fixture'?'SIMULATED · OFFLINE':'PUBLIC GITHUB · READ ONLY';$('modeChip').classList.toggle('github',mode==='github');
 setStatus(mode==='fixture'?'simulated':'github',mode==='fixture'?'LOCAL SIMULATED WORKSPACE':'PUBLIC SOURCE WORKSPACE','Eight catalog projects loaded. Activity is requested only when you choose to load it. No automatic GitHub network polling.');
 }catch{catalog=[];selected=[];$('sideProjects').innerHTML='';$('focusChoices').innerHTML='';$('focusStack').innerHTML='<div class="focus-empty">Local catalog unavailable. Restart this preview.</div>';
 $('projectCount').textContent='—';$('approvedCount').textContent='—';$('modeRibbon').textContent='LOCAL CATALOG UNAVAILABLE';$('loadActivity').disabled=true;
 setStatus('error','Catalog failed verification','The local source could not be loaded; no project or release numbers are inferred.');
 }finally{$('homeMain').setAttribute('aria-busy','false');}}
$('focusChoices').addEventListener('click',(event)=>{const button=event.target.closest('[data-choice]');if(button)toggleFocus(button.dataset.choice);});
$('clearFocus').addEventListener('click',()=>{selected=[];saveFocus();renderFocus();});
$('loadActivity').addEventListener('click',()=>{void loadActivity();});
$('activityFilters').addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;filter=button.dataset.filter==='focus'?'focus':'all';for(const item of $('activityFilters').querySelectorAll('button'))item.setAttribute('aria-pressed',String(item.dataset.filter===filter));renderRecords();});
void initialize();
