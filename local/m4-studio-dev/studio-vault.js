/* M4-E1: local drafts. Never stores credentials or sends data to GitHub. */
const $=id=>document.getElementById(id);
let records=[],revision=0,projects=[],editing=null,busy=false;
function status(kind,title,detail){$('vaultState').dataset.state=kind;$('vaultStatusTitle').textContent=title;$('vaultStatusDetail').textContent=detail;}
async function getJSON(path){const r=await fetch(path,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('vault_unavailable');return await r.json();}
async function change(path,method,data){
  const opts={method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Navin-Local-Write':'1','If-Match':'"'+revision+'"'}};
  if(method!=='DELETE')opts.body=JSON.stringify(data);
  const r=await fetch(path,opts);const payload=await r.json();
  if(!r.ok)throw Error(payload.error||'vault_unavailable');
  return payload;
}
function render(){
 $('vaultCount').textContent=String(records.length).padStart(2,'0');
 $('libraryCount').textContent=records.length+' SAVED';
 const list=$('vaultList');list.replaceChildren();
 if(!records.length){const li=document.createElement('li');li.className='vault-empty';li.textContent='No drafts saved yet. Use the form to create your first local record.';list.append(li);return;}
 for(const item of records){
  const li=document.createElement('li');li.className='vault-record';
  const top=document.createElement('div');top.className='vault-record-top';
  const chip=document.createElement('span');chip.className='vault-record-type';chip.textContent=item.type==='decision'?'Decision draft':item.type==='plan'?'Plan draft':'Note';top.append(chip);
  const h=document.createElement('h3');h.textContent=item.title;
  const body=document.createElement('p');body.textContent=item.body||'No details added yet.';
  const meta=document.createElement('div');meta.className='vault-record-meta';meta.textContent=(projects.find(p=>p.id===item.project_id)?.name||'Unknown project')+'  ·  Updated '+(new Date(item.updated_at)).toLocaleString();
  const actions=document.createElement('div');actions.className='vault-record-actions';
  for(const [action,label] of [['edit','Edit'],['delete','Delete']]){const b=document.createElement('button');b.type='button';b.dataset.action=action;b.dataset.id=item.id;b.textContent=label;actions.append(b)}
  li.append(top,h,body,meta,actions);list.append(li);
 }
}
async function reload(){
 try{
  const data=await getJSON('/api/local/drafts');
  if(data.ok!==true||!Array.isArray(data.records)||!Number.isSafeInteger(data.revision))throw Error('invalid_schema');
  records=data.records;revision=data.revision;render();
  status('ready','Local archive ready',records.length+' draft(s) saved on this computer. No cloud sync, encryption or automatic backup.');
 }catch{records=[];render();status('error','Local archive unavailable','Storage could not be safely read. Existing data was not overwritten. Check the local data file and permissions.');}
}
function startEdit(id){const item=records.find(x=>x.id===id);if(!item)return;
 editing=id;$('vaultProject').value=item.project_id;$('vaultType').value=item.type;$('vaultTitle').value=item.title;$('vaultBody').value=item.body;
 $('vaultProject').disabled=true;$('vaultType').disabled=true;$('vaultSave').textContent='Save changes';$('vaultCancel').classList.remove('hidden');
 $('composeHeading').textContent='Edit draft.';$('vaultTitle').focus();}
function cancelEdit(){editing=null;$('vaultForm').reset();$('vaultProject').disabled=false;$('vaultType').disabled=false;$('vaultSave').textContent='Save draft ↗';$('vaultCancel').classList.add('hidden');$('composeHeading').textContent='Create a draft.';}
async function save(e){e.preventDefault();if(busy)return;
 const project_id=$('vaultProject').value,title=$('vaultTitle').value.trim(),body=$('vaultBody').value.trim(),type=$('vaultType').value;
 if(!project_id||!title){status('error','Complete the required fields','Select a project and enter a title.');return;}
 busy=true;$('vaultSave').disabled=true;
 try{
  await change(editing?'/api/local/drafts/'+editing:'/api/local/drafts',editing?'PATCH':'POST',editing?{title,body}:{project_id,type,title,body});
  cancelEdit();await reload();
  status('ready','Draft saved on this computer','Your changes were written to local storage. Export/restore will arrive in E4.');
 }catch(err){await reload();status('error','Draft was not saved',err.message==='stale_revision'?'Another local window changed your drafts. Latest records were reloaded; review before retrying.':'Storage refused the change. No success was claimed.');}
 finally{busy=false;$('vaultSave').disabled=false;}
}
async function deleteRecord(id){if(busy)return;const entry=records.find(x=>x.id===id);if(!entry)return;
 if(!window.confirm('Delete "'+entry.title+'"? This cannot be undone; automatic backups are not active yet.'))return;
 busy=true;
 try{await change('/api/local/drafts/'+id,'DELETE');if(editing===id)cancelEdit();await reload();status('ready','Local draft deleted','The requested record was deleted from this computer.');}
 catch(err){await reload();status('error','Delete did not complete',err.message==='stale_revision'?'Another window changed the data. Latest records were reloaded.':'The local storage operation failed.');}
 finally{busy=false;}
}
async function initialize(){try{
 const catalog=await getJSON('/api/projects');if(!catalog.ok||!Array.isArray(catalog.projects)||catalog.projects.length!==8)throw Error('catalog');
 projects=catalog.projects;
 const select=$('vaultProject');select.replaceChildren();
 for(const p of projects){const option=document.createElement('option');option.value=p.id;option.textContent=p.name;select.append(option);}
 await reload();
 }catch{status('error','Local catalog unavailable','Cannot validate projects. Saving has been disabled.');$('vaultSave').disabled=true;}}
$('vaultForm').addEventListener('submit',save);
$('vaultCancel').addEventListener('click',cancelEdit);
$('vaultReload').addEventListener('click',()=>{void reload()});
$('vaultList').addEventListener('click',event=>{const button=event.target.closest('button[data-action]');if(!button)return;
 if(button.dataset.action==='edit')startEdit(button.dataset.id);
 if(button.dataset.action==='delete')void deleteRecord(button.dataset.id);
});
void initialize();
