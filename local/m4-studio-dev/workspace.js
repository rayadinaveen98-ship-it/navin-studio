'use strict';
/* M4-D2 local-only public repository workspace. No login, persistent drafts,
 * remote writes, browser storage, or release approvals. */
const $=(id)=>document.getElementById(id);
const escapeHtml=(input)=>String(input??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let catalog=[],requestNumber=0;
const SAMPLE_LIMIT=5;
const validId=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const repoRe=/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const routeId=()=>location.pathname.match(/^\/workspace\/([a-z0-9]+(?:-[a-z0-9]+)*)$/)?.[1]||'';
function shortDate(value){if(!value)return'Not observed';const d=new Date(value);return Number.isFinite(d.valueOf())?new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d):'Not observed'}
function cleanRepoUrl(repo){return repoRe.test(repo||'')?'https://github.com/'+repo:null}
async function readLocal(path){if(!/^\/api\/(?:projects|projects\/[a-z0-9-]+\/workspace)$/.test(path))throw Error('unsupported_path');
 const response=await fetch(path,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{accept:'application/json'}});
 if(!response.ok)throw Error('source_unavailable');
 if(!(response.headers.get('content-type')||'').toLowerCase().includes('application/json'))throw Error('unexpected_response');
 const json=await response.json();if(!json||json.ok!==true)throw Error('invalid_response');return json;
}
function setEvidence(state,title,detail){$('evidenceBar').dataset.state=state;$('evidenceTitle').textContent=title;$('evidenceDetail').textContent=detail;}
function setText(id,text){$(id).textContent=text;}
function resetProject(){
 ['repoState','latestSha','pullCount'].forEach(id=>setText(id,'—'));
 setText('repoSignalNote','Not verified');setText('commitSignalNote','Not observed');setText('prSignalNote','At most five; not the total');
 setText('defaultBranch','Unknown');setText('updatedAt','Not observed');setText('archivedState','Unknown');setText('observedAt','Not observed');
 $('commitList').innerHTML='<li class="empty-item">Waiting for source…</li>';
 $('pullList').innerHTML='<li class="empty-item">Waiting for source…</li>';
 for(const id of ['commitsTag','pullsTag']){setText(id,'AWAITING');$(id).dataset.state='loading';}
 $('repoLink').classList.add('hidden');$('repoLink').removeAttribute('href');
}
function navMarkup(row,id){const active=row.id===id;
 return `<button type="button" class="project-nav-item" data-project-id="${escapeHtml(row.id)}" ${active?'aria-current="page"':''}><span class="project-nav-symbol">${escapeHtml((row.name||'?').slice(0,1).toUpperCase())}</span><span class="project-nav-title">${escapeHtml(row.name||row.id)}</span></button>`;
}
function updateNavigation(id){$('projectNavigation').innerHTML=catalog.map(p=>navMarkup(p,id)).join('')||'<p class="nav-loading">Catalog not available.</p>';}
function sourceLabel(state){return({current:'VERIFIED',simulated:'SIMULATED',no_records:'EMPTY',rate_limited_or_denied:'RATE LIMITED',unavailable:'UNAVAILABLE',loading:'AWAITING'})[state]||'UNKNOWN';}
function stateMessage(state,what){
 if(state==='no_records')return 'No recent '+what+' were returned by GitHub. This does not prove there are none in the full history.';
 if(state==='rate_limited_or_denied')return 'Public GitHub requests are currently rate-limited or denied. No cached status is presented as current.';
 if(state==='simulated')return 'These records are examples only. Switch to PUBLIC GITHUB mode to request verifiable evidence.';
 return 'Source unavailable. No '+what+' history can be inferred from this response.';
}
function sourceRecordLink(url,project,type){
 if(typeof url!=='string')return null;
 const base='https://github.com/'+project.repository;
 const pattern=type==='commit'?new RegExp('^'+escapeReg(base)+'/commit/[a-f0-9]{40}$'):new RegExp('^'+escapeReg(base)+'/pull/[1-9][0-9]*$');
 return pattern.test(url)?url:null;
}
const escapeReg=(x)=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function renderCommits(section,project){
 const state=section?.state||'unavailable';setText('commitsTag',sourceLabel(state));$('commitsTag').dataset.state=state;
 const items=Array.isArray(section?.items)?section.items.slice(0,SAMPLE_LIMIT):[];
 const first=state==='current'&&items[0]?.short_sha?items[0].short_sha:null;
 setText('latestSha',first||'—');setText('commitSignalNote',state==='simulated'?'Simulated example':state==='current'&&items.length?'Most recent returned item':'Not observed');
 if(!items.length){$('commitList').innerHTML='<li class="empty-item">'+escapeHtml(stateMessage(state,'commit'))+'</li>';return}
 $('commitList').innerHTML=items.map((item,index)=>{
  const url=state==='current'?sourceRecordLink(item.url,project,'commit'):null;
  const title=escapeHtml(item.title||'Untitled public commit');const label=url?`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="event-title">${title} ↗</a>`:`<span class="event-title">${title}</span>`;
  const meta=[item.short_sha?'<code>'+escapeHtml(item.short_sha)+'</code>':null,escapeHtml(item.author||'Unknown author'),item.authored_at?escapeHtml(shortDate(item.authored_at)):null].filter(Boolean).join('<span aria-hidden="true">·</span>');
  return `<li class="event-item"><span class="event-index">${String(index+1).padStart(2,'0')}</span><div class="event-content">${label}<div class="event-meta">${meta}</div></div></li>`;
 }).join('');
}
function renderPulls(section,project){
 const state=section?.state||'unavailable';setText('pullsTag',sourceLabel(state));$('pullsTag').dataset.state=state;
 const items=Array.isArray(section?.items)?section.items.slice(0,SAMPLE_LIMIT):[];
 setText('pullCount',state==='current'?String(items.length).padStart(2,'0'):'—');
 setText('prSignalNote',state==='simulated'?'Simulated example':state==='current'?'Most recent returned, not total':'Not observed');
 if(!items.length){$('pullList').innerHTML='<li class="empty-item">'+escapeHtml(stateMessage(state,'pull request'))+'</li>';return}
 $('pullList').innerHTML=items.map((item,index)=>{
  const url=state==='current'?sourceRecordLink(item.url,project,'pull'):null;
  const title=escapeHtml(item.title||'Untitled pull request');const label=url?`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="event-title">${title} ↗</a>`:`<span class="event-title">${title}</span>`;
  const status=String(item.state||'unknown');const validState=['open','merged','closed'].includes(status)?status:'sample';
  const meta=['<span class="event-mark '+validState+'">'+escapeHtml(validState.toUpperCase())+'</span>',item.number?'#'+escapeHtml(item.number):null,item.updated_at?escapeHtml(shortDate(item.updated_at)):null].filter(Boolean).join('<span aria-hidden="true">·</span>');
  return `<li class="event-item"><span class="event-index pull">${String(index+1).padStart(2,'0')}</span><div class="event-content">${label}<div class="event-meta">${meta}</div></div></li>`;
 }).join('');
}
function applyWorkspace(payload){
 if(!payload?.project||!validId.test(payload.project.id)||!repoRe.test(payload.project.repository))throw Error('invalid_workspace');
 const project=payload.project;
 if(!['fixture','github'].includes(payload.mode))throw Error('invalid_mode');
 setText('crumbProject',project.name.toUpperCase());setText('projectTitle',project.name);
 setText('projectSummary',project.summary||'No catalog summary available');setText('projectKind',String(project.category||'CREATIVE PROJECT').toUpperCase());
 const index=catalog.findIndex(x=>x.id===project.id);setText('projectNumber',index>=0?'PROJECT DOSSIER / '+String(index+1).padStart(2,'0'):'PROJECT DOSSIER');
 setText('projectEmblem',(project.name||'N')[0].toUpperCase());setText('projectRepository',project.repository);
 const repoUrl=cleanRepoUrl(project.repository);if(repoUrl){$('repoLink').href=repoUrl;$('repoLink').classList.remove('hidden')}
 document.title=project.name+' — NAVIN STUDIO / Local Workspace';
 const demo=payload.mode==='fixture';$('modeChip').textContent=demo?'SIMULATED / OFFLINE':'PUBLIC GITHUB / LIVE REQUEST';$('modeChip').classList.toggle('github',!demo);
 $('ribbon').textContent=demo?'M4-D2 / LOCAL DEVELOPMENT / SIMULATED EXAMPLES — NOT LIVE / NO LOGIN OR WRITES':'M4-D2 / LOCAL DEVELOPMENT / PUBLIC GITHUB REQUESTS / NO LOGIN OR WRITES';
 const repoSection=payload.repository||{state:'unavailable'};
 setText('repoState',sourceLabel(repoSection.state));setText('repoSignalNote',demo?'Simulated repository record':repoSection.state==='current'?'Public GitHub metadata':'No verified metadata');
 const repo=repoSection.data||{};
 setText('defaultBranch',demo?'Not verified':repo.default_branch||'Unknown');
 setText('archivedState',demo?'Not verified':typeof repo.archived==='boolean'?(repo.archived?'Yes':'No'):'Unknown');
 setText('updatedAt',demo?'Not verified':shortDate(repo.updated_at));
 setText('observedAt',shortDate(payload.observed_at));
 renderCommits(payload.commits,project);renderPulls(payload.pull_requests,project);
 if(demo)setEvidence('fixture','SIMULATED DATA — NO LIVE GITHUB EVIDENCE','Example records for layout and interaction testing. None represent actual commits, pulls, builds or milestones.');
 else{
  const ready=[repoSection,payload.commits,payload.pull_requests].filter(x=>x?.state==='current').length;
  const denied=[repoSection,payload.commits,payload.pull_requests].some(x=>x?.state==='rate_limited_or_denied');
  setEvidence(ready?'github':'error',ready?'PUBLIC SOURCE EVIDENCE OBSERVED':denied?'GITHUB RATE LIMIT / DENIED':'SOURCE NOT AVAILABLE',
    `${ready} of 3 public source sections returned verifiable data · observed ${shortDate(payload.observed_at)}. Missing sections remain unknown.`);
 }
}
function applyError(id){
 resetProject();const item=catalog.find(p=>p.id===id);
 setText('crumbProject',item?.name?.toUpperCase()||'UNAVAILABLE');setText('projectTitle',item?.name||'Unavailable');
 setText('projectSummary','This local workspace could not retrieve its source record. No stale activity is shown as current.');
 setText('projectKind','LOCAL SOURCE ERROR');setText('projectRepository','SOURCE REQUEST FAILED');
 $('modeChip').textContent='SOURCE UNAVAILABLE';$('modeChip').classList.remove('github');
 $('commitList').innerHTML='<li class="empty-item">No verifiable commit records are available.</li>';
 $('pullList').innerHTML='<li class="empty-item">No verifiable pull request records are available.</li>';
 setEvidence('error','SOURCE VERIFICATION UNAVAILABLE','Check the local server and your public GitHub connection. No previous project data is presented as fresh.');
}
async function loadProject(id,{navigate=false}={}){
 if(!validId.test(id))return;
 const current=++requestNumber;resetProject();$('workspaceMain').setAttribute('aria-busy','true');$('refreshWorkspace').disabled=true;
 if(navigate)history.pushState({project:id},'', '/workspace/'+id);
 updateNavigation(id);
 setText('projectTitle','Loading workspace');setText('projectSummary','Retrieving the local public-source catalog.');setEvidence('loading','CHECKING PROJECT SOURCE','Loading verified records. The local preview never writes to your repositories.');
 try{
  const payload=await readLocal('/api/projects/'+id+'/workspace');
  if(current!==requestNumber)return;
  if(payload.project_id!==id)throw Error('mismatched_project');
  applyWorkspace(payload);
 }catch{if(current===requestNumber)applyError(id)}
 finally{if(current===requestNumber){$('refreshWorkspace').disabled=false;$('workspaceMain').setAttribute('aria-busy','false')}}
}
async function boot(){
 try{
  const response=await readLocal('/api/projects');
  if(!Array.isArray(response.projects))throw Error('invalid_directory');
  catalog=response.projects.filter(x=>validId.test(x.id||'')&&repoRe.test(x.repository||'')&&typeof x.name==='string');
 }catch{catalog=[]}
 updateNavigation(routeId());
 if(!routeId()){setEvidence('error','UNKNOWN PROJECT PATH','Return to the Control Room to choose a cataloged project.');return}
 await loadProject(routeId());
}
$('projectNavigation').addEventListener('click',event=>{const item=event.target.closest('[data-project-id]');if(item)void loadProject(item.dataset.projectId,{navigate:true})});
$('refreshWorkspace').addEventListener('click',()=>void loadProject(routeId()));
window.addEventListener('popstate',()=>void loadProject(routeId()));
void boot();
