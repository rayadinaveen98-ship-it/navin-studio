/* M4-E3: working local planning client. No third-party libraries, auth token or GitHub writes. */
const $=id=>document.getElementById(id);
const todayLocal=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const parseDate=d=>{const [y,m,day]=d.split('-').map(Number);return new Date(y,m-1,day)};
const fmtDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const addDays=(d,steps)=>{const x=parseDate(d);x.setDate(x.getDate()+steps);return fmtDate(x)};
const projectName=id=>catalog.find(p=>p.id===id)?.name||'Unknown project';
const el=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n};
const empty=(message,tag='li')=>el(tag,'plan-empty',message);
let catalog=[],operations=[],entries=[],revision=null,selectedDate=todayLocal(),monthKey=selectedDate.slice(0,7),filter='all',editing=null,pending=false,canSave=false,operationsAvailable=true;
const dateLabel=d=>parseDate(d).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
function state(mode,title,detail){const box=$('planningState');box.dataset.state=mode;$('planningTitle').textContent=title;$('planningDetail').textContent=detail}
async function get(path){const res=await fetch(path,{headers:{Accept:'application/json'},cache:'no-store'});const data=await res.json();if(!res.ok||!data.ok)throw Error(data.error||'local_unavailable');return data}
async function request(method,id,payload){const path='/api/local/planning'+(id?'/'+id:'');const options={method,headers:{'Content-Type':'application/json','X-Navin-Local-Write':'1','If-Match':'"'+revision+'"'}};
 if(payload!==undefined)options.body=JSON.stringify(payload);
 const res=await fetch(path,options),data=await res.json();if(!res.ok||!data.ok)throw Error(data.error||'local_unavailable');revision=data.revision;return data}
function matchingProject(x){return filter==='all'||x.project_id===filter}
function daily(kind){return entries.filter(x=>x.date===selectedDate&&x.kind===kind&&matchingProject(x))}
function remainingPrioritySlots(){return entries.filter(x=>x.date===$('planDate').value&&x.kind==='priority'&&x.id!==editing).length}
function renderStats(){const pri=entries.filter(x=>x.date===selectedDate&&x.kind==='priority'),sessions=daily('session'),due=operations.filter(x=>x.due_date===selectedDate&&['task','milestone'].includes(x.kind)&&matchingProject(x));
 $('priorityCount').textContent=pri.length+' / 3';$('sessionCount').textContent=String(sessions.length);$('dueCount').textContent=operationsAvailable?String(due.length):'—';$('planRevision').textContent=revision===null?'—':'#'+revision;$('dayProgress').textContent=pri.filter(x=>x.status==='done').length+' done / '+pri.length;
 $('dayCaption').textContent=dateLabel(selectedDate)+(filter==='all'?' · All projects':' · '+projectName(filter));
 $('dayHeading').textContent='The daily cut';$('dayHeading').append(el('span','', '.'));
}
function planRow(x){const li=el('li','plan-entry');li.dataset.status=x.status;const main=el('div');const time=x.kind==='session'?(x.start_time+' · '+x.duration_minutes+' min · '):'';
 main.append(el('div','plan-entry-meta',time+projectName(x.project_id)),el('div','plan-entry-name',x.title));
 if(x.details)main.append(el('p','plan-entry-details',x.details));
 if(x.linked_operation_id){const linked=operations.find(v=>v.id===x.linked_operation_id&&v.project_id===x.project_id),link=el('a','plan-entry-link',linked?'Linked '+linked.kind+': '+linked.title:'Linked E2 item no longer found');
  link.href='/studio-operations/'+encodeURIComponent(x.project_id);main.append(link)}
 const actions=el('div','plan-entry-actions');
 for(const [action,word] of [['toggle',x.status==='done'?'Mark planned':'Mark done'],['edit','Edit'],['delete','Delete']]){
  const b=el('button','',word);b.type='button';b.dataset.action=action;b.dataset.id=x.id;b.setAttribute('aria-label',word+' '+x.title);actions.append(b)
 }
 li.append(main,actions);return li;
}
function renderDay(){const priorities=daily('priority'),sessions=daily('session').sort((a,b)=>a.start_time.localeCompare(b.start_time));
 for(const [id,arr,msg] of [['priorityList',priorities,'No priorities chosen. Add up to three for this day.'],['sessionList',sessions,'No time blocks scheduled for this day.']]){
  const list=$(id);list.replaceChildren();if(!arr.length)list.append(empty(msg));else arr.forEach(x=>list.append(planRow(x)))
 }
}
function renderDue(){const due=operations.filter(x=>x.due_date===selectedDate&&['task','milestone'].includes(x.kind)&&matchingProject(x));
 const box=$('deadlineList');box.replaceChildren();if(!operationsAvailable){box.append(empty('Project targets could not be read. Planning entries remain available.'));return;}
 if(!due.length){box.append(empty('No E2 project targets recorded for this day.'));return;}
 for(const x of due){const li=el('li','plan-deadline');li.append(el('small','',projectName(x.project_id)+' / '+x.kind.toUpperCase()),el('strong','',x.title),el('span','',x.status.replaceAll('_',' ')));
  const link=el('a','', 'Open in Project Operations ↗');link.href='/studio-operations/'+encodeURIComponent(x.project_id);li.append(link);box.append(li)}
}
function renderCalendar(){const [year,month]=monthKey.split('-').map(Number);const first=new Date(year,month-1,1);const weekday=(first.getDay()+6)%7;
 const start=new Date(year,month-1,1-weekday);const box=$('calendarDays');box.replaceChildren();$('calendarMonth').textContent=first.toLocaleDateString(undefined,{month:'long',year:'numeric'});
 const hasPlans=new Set(entries.map(x=>x.date)),hasDue=new Set(operations.filter(x=>x.due_date&&['task','milestone'].includes(x.kind)).map(x=>x.due_date));
 for(let i=0;i<42;i++){const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),val=fmtDate(d);const btn=el('button','plan-calendar-day');
  btn.type='button';btn.dataset.date=val;btn.dataset.muted=String(d.getMonth()!==month-1);btn.dataset.selected=String(val===selectedDate);btn.dataset.today=String(val===todayLocal());btn.setAttribute('aria-label',dateLabel(val)+(hasPlans.has(val)?', planned work':'')+(hasDue.has(val)?', project due':'')+(val===selectedDate?', selected':''));
  if(val===selectedDate)btn.setAttribute('aria-pressed','true');else btn.setAttribute('aria-pressed','false');btn.append(el('span','',String(d.getDate())));
  const dots=el('span','plan-day-dots');if(hasPlans.has(val))dots.append(el('i','plan-dot'));if(hasDue.has(val)&&operationsAvailable)dots.append(el('i','due-dot'));btn.append(dots);box.append(btn)
 }
}
function render(){renderStats();renderDay();renderDue();renderCalendar()}
function chooseDay(val){if(!/^\d{4}-\d{2}-\d{2}$/.test(val)||!Number.isFinite(parseDate(val).getTime()))return;
 selectedDate=val;monthKey=val.slice(0,7);$('selectedDate').value=val;if(!editing)$('planDate').value=val;render()}
function changeMonth(n){const [y,m]=monthKey.split('-').map(Number),d=new Date(y,m-1+n,1);monthKey=fmtDate(d).slice(0,7);renderCalendar()}
function statusError(error){const messages={stale_revision:'Data changed in another window. Review the refreshed calendar before retrying.',daily_priority_limit:'This date already has three priorities. Remove one before adding another.',planning_link_not_found:'The E2 task or milestone was removed or changed. Choose a current linked item.',no_changes:'Nothing changed.',planning_integrity_error:'Planning data appears damaged. The local file was not overwritten.',planning_unavailable:'Local planning storage is unavailable.'};return messages[error]||'No changes were saved. Check the input and refresh the calendar.'}
async function refresh(){try{const [p,o]=await Promise.allSettled([get('/api/local/planning'),get('/api/local/operations')]);
  if(p.status==='rejected')throw p.reason;entries=p.value.records;revision=p.value.revision;canSave=true;
  operationsAvailable=o.status==='fulfilled';operations=operationsAvailable?o.value.records:[];
  $('planSave').disabled=false;renderLinks();render();state(operationsAvailable?'ready':'warning',operationsAvailable?'Local plan ready':'Project targets unavailable',operationsAvailable?'Local E3 planning and E2 targets loaded. Unsynced.':'Planning is available, but E2 records could not be read. Existing links may be unavailable.');
 }catch(e){canSave=false;revision=null;$('planSave').disabled=true;entries=[];operations=[];operationsAvailable=false;render();state('error','Planning not available',statusError(e.message));}}
function renderLinks(){const select=$('planLink'),current=select.value;select.replaceChildren();const none=document.createElement('option');none.value='';none.textContent='No linked item';select.append(none);
 for(const op of operations.filter(x=>x.project_id===$('planProject').value&&['task','milestone'].includes(x.kind))){const option=el('option','',op.kind.toUpperCase()+' · '+op.title);option.value=op.id;select.append(option)}
 if(current&&!operations.some(x=>x.id===current)){const option=el('option','', 'Previously linked item (unavailable)');option.value=current;select.append(option)}select.value=current||'';
}
function changeKind(){const session=$('planKind').value==='session';$('planScheduling').classList.toggle('hidden',!session);$('planTime').required=session;$('planTime').disabled=!session;$('planDuration').disabled=!session}
function clearEditor(){editing=null;$('planningForm').reset();$('planKind').disabled=false;$('planProject').disabled=false;$('planDate').value=selectedDate;$('planFormTitle').textContent='Plan a move';$('planFormTitle').append(el('span','','.'));$('planCancel').classList.add('hidden');if(filter!=='all')$('planProject').value=filter;changeKind();renderLinks();}
function startEdit(x){editing=x.id;$('planKind').value=x.kind;$('planKind').disabled=true;$('planProject').value=x.project_id;$('planProject').disabled=true;
 $('planTitle').value=x.title;$('planDate').value=x.date;$('planTime').value=x.start_time||'09:00';$('planDuration').value=String(x.duration_minutes||60);$('planDetails').value=x.details;
 changeKind();renderLinks();if(x.linked_operation_id&&!Array.from($('planLink').options).some(o=>o.value===x.linked_operation_id)){const orphan=el('option','','Linked E2 item no longer available');orphan.value=x.linked_operation_id;$('planLink').append(orphan)}$('planLink').value=x.linked_operation_id||'';
 $('planFormTitle').textContent='Edit this plan';$('planFormTitle').append(el('span','','.'));$('planCancel').classList.remove('hidden');$('planTitle').focus();
}
async function save(event){event.preventDefault();if(pending||!canSave)return;
 const kind=$('planKind').value,project_id=$('planProject').value,title=$('planTitle').value.trim(),date=$('planDate').value;
 if(!title||!date||!project_id){state('error','Required information missing','Choose a project, title and date.');return;}
 const values={title,date,details:$('planDetails').value.trim(),linked_operation_id:$('planLink').value||null};
 if(kind==='session'){values.start_time=$('planTime').value;values.duration_minutes=Number($('planDuration').value)}else{values.start_time=null;values.duration_minutes=null}
 if(!editing){values.project_id=project_id;values.kind=kind;values.status='planned'}
 if(!editing&&kind==='priority'&&remainingPrioritySlots()>=3){state('error','Daily limit reached','Only three priorities per day are allowed.');return}
 pending=true;$('planSave').disabled=true;
 try{await request(editing?'PATCH':'POST',editing,values);clearEditor();chooseDay(date);await refresh();state('ready','Plan saved on this computer','This is a local draft, not a GitHub update or release approval.');}
 catch(e){await refresh();state('error','Plan not saved',statusError(e.message));}
 finally{pending=false;$('planSave').disabled=!canSave}
}
async function act(action,id){if(pending||!canSave)return;const x=entries.find(v=>v.id===id);if(!x)return;
 if(action==='edit'){startEdit(x);return}
 if(action==='delete'&&!window.confirm('Permanently delete "'+x.title+'" from local planning? Backup is not available yet.'))return;
 pending=true;try{if(action==='toggle')await request('PATCH',id,{status:x.status==='done'?'planned':'done'});else if(action==='delete')await request('DELETE',id);
  if(id===editing)clearEditor();await refresh();state('ready',action==='toggle'?'Planning status updated':'Plan deleted', 'The change was saved locally; E2 task status was not changed.');}
 catch(e){await refresh();state('error','Local change refused',statusError(e.message))}finally{pending=false}
}
async function init(){
 $('selectedDate').value=selectedDate;$('planDate').value=selectedDate;
 try{const data=await get('/api/projects');if(!Array.isArray(data.projects)||data.projects.length!==8)throw Error('project_catalog_unavailable');catalog=data.projects;
  for(const project of catalog){for(const id of ['projectFilter','planProject']){const option=el('option','',project.name);option.value=project.id;$(id).append(option)}}
  await refresh();clearEditor();
 }catch(e){canSave=false;$('planSave').disabled=true;state('error','Studio catalog unavailable','Cannot safely link project plans. Save is disabled.');}
}
$('planningForm').addEventListener('submit',save);$('planKind').addEventListener('change',changeKind);$('planProject').addEventListener('change',()=>{$('planLink').value='';renderLinks()});
$('planCancel').addEventListener('click',clearEditor);$('planningRefresh').addEventListener('click',()=>{void refresh()});
$('selectedDate').addEventListener('change',()=>chooseDay($('selectedDate').value));$('dayToday').addEventListener('click',()=>chooseDay(todayLocal()));
$('dayPrevious').addEventListener('click',()=>chooseDay(addDays(selectedDate,-1)));$('dayNext').addEventListener('click',()=>chooseDay(addDays(selectedDate,1)));
$('monthPrevious').addEventListener('click',()=>changeMonth(-1));$('monthNext').addEventListener('click',()=>changeMonth(1));
$('projectFilter').addEventListener('change',()=>{filter=$('projectFilter').value;if(!editing&&filter!=='all'){$('planProject').value=filter;$('planLink').value=''}renderLinks();render()});
$('calendarDays').addEventListener('click',e=>{const b=e.target.closest('button[data-date]');if(b)chooseDay(b.dataset.date)});
for(const id of ['priorityList','sessionList'])$(id).addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(b)void act(b.dataset.action,b.dataset.id)});
void init();
