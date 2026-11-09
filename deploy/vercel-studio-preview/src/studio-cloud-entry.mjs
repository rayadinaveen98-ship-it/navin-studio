import {createAuthClient} from '@neondatabase/auth';

const $=id=>document.getElementById(id);
const state={client:null,token:null,config:null,records:{}};
function message(text,kind='info'){$('account-message').textContent=text;$('connection-status').textContent=kind==='error'?'Access pending':kind==='ready'?'Authenticated':kind==='connected'?'Database connected':'Checking'}
function setDataStatus(kind,text){$('status-'+kind).textContent=text}
function setButtons(enabled){document.querySelectorAll('button[data-action="download"]').forEach(b=>b.disabled=!enabled)}
function clearSession(){state.token=null;state.records={};setButtons(false);for(const kind of ['drafts','operations','planning'])setDataStatus(kind,'Not connected')}
async function tokenFromSession(){
 const result=await state.client.getSession();
 if(!result?.data?.user)return null;
 const value=await state.client.getJWTToken();
 if(typeof value==='string')return value;
 if(value?.data?.token)return value.data.token;
 return null;
}
async function checkSession(){
 clearSession();
 if(!state.client){message('Cloud authentication is not configured. Local Studio data is safe and unchanged.','error');return}
 try{
  const session=await state.client.getSession();
  const signedIn=Boolean(session?.data?.user);
  $('sign-in').hidden=signedIn;$('sign-in').disabled=false;$('sign-out').hidden=!signedIn;
  if(!signedIn){message('Sign in with Google to verify your identity. Only the approved Studio owner can access cloud documents.');return}
  const token=await tokenFromSession();
  if(!token){message('Signed in, but a secure database token is not available. Please refresh or sign in again.','error');return}
  state.token=token;message('Identity confirmed. Checking separate database-owner permission.','ready');
  let denied=false;
  for(const kind of ['drafts','operations','planning']){
   const response=await fetch('/api/cloud-docs?kind='+kind,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
   if(response.status===403){denied=true;setDataStatus(kind,'Owner approval required');continue}
   if(!response.ok){setDataStatus(kind,'Cloud data unavailable');continue}
   const data=await response.json();
   if(data.ok){state.records[kind]=data.record;setDataStatus(kind,data.record?'Cloud revision '+data.record.revision+' · '+new Date(data.record.updated_at).toLocaleDateString():'No cloud document saved yet')}
  }
  if(denied){message('Google sign-in succeeded. This account is not yet approved as the Studio owner. No records are accessible.','error');return}
  setButtons(true);message('Studio owner access confirmed. Cloud copies may be downloaded; no local data is uploaded automatically.','connected');
 }catch{message('Could not complete the sign-in check. No changes were made to local or cloud data.','error')}
}
async function init(){
 clearSession();
 try{
  const response=await fetch('/api/cloud-config',{cache:'no-store'});
  const data=await response.json();
  if(!data.ok)throw Error('config');
  state.config=data;
  $('technical-status').textContent='Database: '+(data.storage_connected?'Connected':'Not configured')+' · Cloud writes: '+(data.writes_enabled?'Enabled':'Locked')+' · Local records migrated: No';
  if(!data.auth_base_url){message('Owner authentication is not configured.','error');return}
  state.client=createAuthClient(data.auth_base_url);
  await checkSession();
 }catch{message('Cannot verify cloud configuration. Public Studio and local Windows data are unaffected.','error')}
}
$('sign-in').addEventListener('click',async()=>{
 if(!state.client)return;
 $('sign-in').disabled=true;
 try{const result=await state.client.signIn.social({provider:'google',callbackURL:location.origin+'/studio-cloud'});if(result?.error){message('Google sign-in could not begin.','error');$('sign-in').disabled=false}}
 catch{message('Google sign-in could not begin.','error');$('sign-in').disabled=false}
});
$('sign-out').addEventListener('click',async()=>{try{await state.client?.signOut()}catch{}clearSession();await checkSession()});
$('refresh').addEventListener('click',checkSession);
document.querySelectorAll('button[data-action="download"]').forEach(button=>button.addEventListener('click',()=>{
 const kind=button.dataset.kind;
 if(!state.token||!Object.hasOwn(state.records,kind))return;
 const data={format:'navin-studio-cloud-dataset-v1',kind,record:state.records[kind],exported_at:new Date().toISOString()};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const anchor=document.createElement('a');anchor.href=url;anchor.download='navin-studio-cloud-'+kind+'.json';anchor.click();URL.revokeObjectURL(url);
}));
init();
