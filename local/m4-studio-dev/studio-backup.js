/* M4-E4 manual download/restore UI. No sensitive data to GitHub/cloud. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const errorMessage=(e)=>e?.message||'Backup operation failed';
let activePreview=null;
function status(title,detail,kind='ready'){$('backupState').dataset.state=kind;$('backupStateTitle').textContent=title;$('backupStateDetail').textContent=detail;}
function resetPreview(){activePreview=null;$('previewPanel').classList.add('hidden');$('ackSaved').checked=false;$('backupConfirm').value='';$('backupRestore').disabled=true;}
function canRestore(){return Boolean(activePreview&&$('ackSaved').checked&&$('backupConfirm').value==='REPLACE LOCAL DATA')}
function updateRestore(){ $('backupRestore').disabled=!canRestore(); }
async function jsonResponse(response){let data;try{data=await response.json()}catch{throw Error('Unable to read local response')};if(!response.ok||!data?.ok)throw Error(data?.error||'Local request failed');return data;}
async function post(endpoint,body){return jsonResponse(await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Navin-Local-Write':'1'},body:JSON.stringify(body)}));}
async function loadInfo(){
 try{const info=await jsonResponse(await fetch('/api/local/backup/info',{cache:'no-store'}));
  for(const key of ['drafts','operations','planning'])$(key+'Count').textContent=String(info.counts[key]??'—');
  status('Local files are readable','Three source datasets are ready for a manual backup. Nothing was uploaded.');
 }catch(e){status('Storage needs attention',errorMessage(e),'error')}
}
$('backupRefresh').addEventListener('click',loadInfo);
$('backupFile').addEventListener('change',resetPreview);
$('backupConfirm').addEventListener('input',updateRestore);
$('ackSaved').addEventListener('change',updateRestore);
$('backupPreview').addEventListener('click',async()=>{
 resetPreview();const file=$('backupFile').files?.[0];
 if(!file){status('Choose a backup first','Select the JSON backup you want to review.','error');return;}
 if(file.size>10*1024*1024){status('Backup file is too large','This application accepts backups of up to 10 MB.','error');return;}
 $('backupPreview').disabled=true;status('Validating the backup','Checking file format, datasets, checksums and current local revisions.','loading');
 try{
  const fileText=await file.text();let backup;
  try{backup=JSON.parse(fileText)}catch{throw Error('The selected file is not valid JSON')}
  const result=await post('/api/local/backup/preview',{backup});
  activePreview=result.preview_id;
  $('previewExpiry').textContent='Valid until '+new Date(result.expires_at).toLocaleTimeString();
  $('previewCreated').textContent='Backup created: '+new Date(result.created_at).toLocaleString();
  $('previewRows').replaceChildren();
  const names={drafts:'Local Vault',operations:'Project Operations',planning:'Studio Planning'};
  for(const data of result.datasets){const row=document.createElement('tr');for(const value of [names[data.name]||data.name,String(data.current_count),String(data.backup_count)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell)}$('previewRows').append(row)}
  $('previewPanel').classList.remove('hidden');status('Backup validated','Nothing was replaced. Inspect the record counts before choosing to restore.');
 }catch(e){status('Backup validation failed',errorMessage(e),'error');resetPreview()}
 finally{$('backupPreview').disabled=false}
});
$('backupRestore').addEventListener('click',async()=>{
 if(!canRestore())return;
 const id=activePreview; $('backupRestore').disabled=true;
 status('Restoring local data','Writing a pre-restore safety copy and replacing the three local datasets.','loading');
 try{
  const result=await post('/api/local/backup/restore',{preview_id:id,confirmation:'REPLACE LOCAL DATA'});
  resetPreview();
  await loadInfo();
  status('Restore completed',result.cleanup_pending?'The new data was saved; cleanup will be retried on next local request. Refresh any other Studio tabs.':'All three datasets were replaced. Refresh any other Studio tabs before making edits.');
 }catch(e){resetPreview();status('Restore was not applied',errorMessage(e)+'. Your existing files should remain unchanged; if recovery fails, stop editing and use your previous backup.','error');}
});
loadInfo();
})();
