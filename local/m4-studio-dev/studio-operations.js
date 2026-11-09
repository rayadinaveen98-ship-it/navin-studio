'use strict';
/* M4-E2: local-only project operations. All record text goes through textContent.
 * No GitHub write, remote API, analytics, auth token, or browser draft persistence.
 */
const $=id=>document.getElementById(id);
const STATUSES={task:['backlog','in_progress','blocked','done'],milestone:['planned','active','completed'],decision:['proposed','accepted','deferred','rejected']};
const pretty=s=>String(s).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
let catalog=[],items=[],notes=[],revision=0,chosen='',editing=null,pending=false,safeToEdit=false;
const routeProject=location.pathname.match(/^\/studio-operations\/([a-z0-9]+(?:-[a-z0-9]+)*)$/)?.[1]||null;
function state(kind,title,detail){$('operationsState').dataset.state=kind;$('operationsTitle').textContent=title;$('operationsDetail').textContent=detail;}
async function get(path){const res=await fetch(path,{credentials:'same-origin',cache:'no-store',redirect:'error'});if(!res.ok)throw Error('unavailable');const payload=await res.json();if(!payload?.ok)throw Error('bad_schema');return payload;}
async function mutate(method,id,payload){
  const url='/api/local/operations'+(id?'/'+id:'');
  const opts={method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Navin-Local-Write':'1','If-Match':'"'+revision+'"'}};
  if(method!=='DELETE')opts.body=JSON.stringify(payload);
  const res=await fetch(url,opts);const body=await res.json();if(!res.ok)throw Error(body?.error||'unavailable');return body;
}
function reloadStatuses(selected){const kind=$('recordKind').value;const list=$('recordStatus');list.replaceChildren();for(const status of STATUSES[kind]){const option=document.createElement('option');option.value=status;option.textContent=pretty(status);list.append(option)}if(selected&&STATUSES[kind].includes(selected))list.value=selected;}
function clearEditor(){editing=null;$('operationsForm').reset();$('recordKind').disabled=false;reloadStatuses();$('operationsSave').textContent='Save locally ↗';$('operationsCancel').classList.add('hidden');$('opsFormTitle').textContent='Create an item.';}
function addText(tag,cls,value,parent){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=value;parent.append(el);return el;}
function render(){
  const projectItems=items.filter(x=>x.project_id===chosen),tasks=projectItems.filter(x=>x.kind==='task'),milestones=projectItems.filter(x=>x.kind==='milestone'),decisions=projectItems.filter(x=>x.kind==='decision');
  $('taskMetric').textContent=String(tasks.filter(x=>x.status!=='done').length).padStart(2,'0');$('taskCaption').textContent=tasks.filter(x=>x.status==='done').length+' completed / '+tasks.length+' local';
  $('milestoneMetric').textContent=String(milestones.length).padStart(2,'0');$('milestoneCaption').textContent=milestones.filter(x=>x.status==='completed').length+' completed / '+milestones.length+' local';
  $('decisionMetric').textContent=String(decisions.length).padStart(2,'0');$('decisionCaption').textContent=decisions.filter(x=>x.status==='accepted').length+' accepted / '+decisions.length+' local';
  const filtered=projectItems.filter(x=>$('recordFilter').value==='all'||x.kind===$('recordFilter').value);
  $('recordCount').textContent=projectItems.length+' LOCAL';
  const list=$('operationsList');list.replaceChildren();
  if(!filtered.length){addText('li','vault-empty','No local '+($('recordFilter').value==='all'?'tasks, milestones or decisions':$('recordFilter').value+' records')+' yet for this project.',list)}
  for(const rec of filtered){
    const li=document.createElement('li');li.className='ops-record';
    const header=document.createElement('div');header.className='ops-record-header';addText('span','ops-record-kind',rec.kind,header);addText('span','ops-record-status',pretty(rec.status),header);
    const title=addText('h3','',rec.title,li);title.id='record-'+rec.id;
    li.prepend(header);addText('p','',rec.details||'No additional context recorded.',li);
    addText('div','ops-record-meta','Updated '+new Date(rec.updated_at).toLocaleString()+(rec.due_date?' · Target '+rec.due_date:''),li);
    const actions=document.createElement('div');actions.className='ops-record-actions';
    for(const [act,label] of [['edit','Edit'],['delete','Delete']]){const b=addText('button','',label,actions);b.type='button';b.dataset.op=act;b.dataset.id=rec.id}
    li.append(actions);
    const details=document.createElement('details');details.className='ops-history';addText('summary','','History · '+rec.history.length+' recorded change(s)',details);
    const events=document.createElement('ol');for(const e of rec.history.toReversed())addText('li','',pretty(e.action)+' · '+pretty(e.status)+' · '+e.title+' · '+new Date(e.at).toLocaleString(),events);
    details.append(events);li.append(details);list.append(li);
  }
  const linked=$('linkedNotes');linked.replaceChildren();const personal=notes.filter(x=>x.project_id===chosen);
  if(!personal.length)addText('li','','No E1 notes or plan drafts linked to this project yet.',linked);
  for(const n of personal){const li=addText('li','',n.title,linked);addText('small','',pretty(n.type),li)}
  $('publicSourceLink').href='/workspace/'+chosen;
}
async function refresh(){
  try{
    const [result,draftResult]=await Promise.all([get('/api/local/operations'),get('/api/local/drafts')]);
    if(!Array.isArray(result.records)||!Number.isSafeInteger(result.revision)||!Array.isArray(draftResult.records))throw Error('bad_schema');
    items=result.records;revision=result.revision;notes=draftResult.records;safeToEdit=true;
    $('operationsSave').disabled=false;render();state('ready','Local project operations ready',items.length+' total operation(s) on this computer. No cloud backup, encryption or GitHub writes.');
  }catch{
    items=[];notes=[];safeToEdit=false;$('operationsSave').disabled=true;render();state('error','Local operations unavailable','Your records could not be verified. Editing is disabled; existing files were not overwritten.');
  }
}
function startEdit(id){const item=items.find(x=>x.id===id&&x.project_id===chosen);if(!item||!safeToEdit)return;
  editing=id;$('recordKind').value=item.kind;$('recordKind').disabled=true;reloadStatuses(item.status);
  $('recordTitle').value=item.title;$('recordDetails').value=item.details;$('recordDue').value=item.due_date||'';
  $('operationsSave').textContent='Save changes ↗';$('operationsCancel').classList.remove('hidden');$('opsFormTitle').textContent='Edit '+item.kind+'.';$('recordTitle').focus();
}
async function save(event){event.preventDefault();if(pending||!safeToEdit)return;
  const title=$('recordTitle').value.trim(),details=$('recordDetails').value.trim(),statusValue=$('recordStatus').value,due_date=$('recordDue').value||null;
  if(!title||!chosen){state('error','Add the required information','Choose a project and enter a title.');return;}
  pending=true;$('operationsSave').disabled=true;
  try{
    const payload=editing?{title,details,status:statusValue,due_date}:{project_id:chosen,kind:$('recordKind').value,title,details,status:statusValue,due_date};
    await mutate(editing?'PATCH':'POST',editing,payload);clearEditor();await refresh();state('ready','Saved to this computer','Project changes were saved with revision protection. They are not synchronized.');
  }catch(e){await refresh();state('error','Changes not saved',e.message==='stale_revision'?'Another local window changed the project operations. Review refreshed data before retrying.':e.message==='no_changes'?'No fields changed.':'The save was refused; no success is claimed.');}
  finally{pending=false;if(safeToEdit)$('operationsSave').disabled=false;}
}
async function remove(id){if(pending||!safeToEdit)return;const rec=items.find(x=>x.id===id&&x.project_id===chosen);if(!rec)return;
 if(!window.confirm('Delete "'+rec.title+'" and its recorded history permanently? E4 backup is not available yet.'))return;
 pending=true;try{await mutate('DELETE',id);if(editing===id)clearEditor();await refresh();state('ready','Deleted from this computer','Record and local history were removed. No automatic backup exists.');}
 catch(e){await refresh();state('error','Delete was not completed',e.message==='stale_revision'?'Data changed in another window; review the refreshed records.':'Storage refused the deletion.');}finally{pending=false;}
}
function switchProject(id,updateUrl){if(!catalog.some(p=>p.id===id))return;chosen=id;clearEditor();$('projectPicker').value=id;if(updateUrl)history.pushState({project:id},'', '/studio-operations/'+id);render();}
async function init(){
 try{const info=await get('/api/projects');if(!Array.isArray(info.projects)||info.projects.length!==8)throw Error('bad_catalog');catalog=info.projects;
  const picker=$('projectPicker');picker.replaceChildren();for(const item of catalog){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;picker.append(option)}
  chosen=catalog.some(p=>p.id===routeProject)?routeProject:catalog[0].id;picker.value=chosen;reloadStatuses();await refresh();
 }catch{safeToEdit=false;$('operationsSave').disabled=true;state('error','Project catalog unavailable','Cannot establish the project list. Saving has been disabled.');}
}
$('recordKind').addEventListener('change',()=>reloadStatuses());
$('recordFilter').addEventListener('change',render);
$('projectPicker').addEventListener('change',()=>switchProject($('projectPicker').value,true));
$('operationsForm').addEventListener('submit',save);
$('operationsCancel').addEventListener('click',clearEditor);
$('operationsRefresh').addEventListener('click',()=>{void refresh()});
$('operationsList').addEventListener('click',event=>{const b=event.target.closest('button[data-op]');if(!b)return;if(b.dataset.op==='edit')startEdit(b.dataset.id);if(b.dataset.op==='delete')void remove(b.dataset.id)});
window.addEventListener('popstate',()=>{const id=location.pathname.match(/^\/studio-operations\/([a-z0-9-]+)$/)?.[1];if(id)switchProject(id,false)});
void init();
