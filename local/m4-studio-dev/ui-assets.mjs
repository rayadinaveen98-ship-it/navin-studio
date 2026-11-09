/** Presentation adapter: derives the local preview from the *same* M4-B/M4-C visual source.
 * Never modify or expose the protected Worker source or security checks.
 */
import {controlRoomHtml,controlRoomCss,controlRoomJs} from '../../private/m4-control-room-worker/src/control-room-bundle.js';

function uniqueReplace(source,from,to) {
  if(source.split(from).length!==2)throw Error('M4 design source changed; local preview needs review: '+from.slice(0,55));
  return source.replace(from,to);
}
export function localAssets(mode){
  if(!['github','fixture'].includes(mode))throw Error('Unknown mode');
  const demo=mode==='fixture';
  const headline=demo?'SIMULATED DATA — NOT LIVE':'PUBLIC GITHUB — READ ONLY';
  let html=uniqueReplace(controlRoomHtml,
    'M4 / Protected owner interface <span aria-hidden="true">·</span> Public-source read-only evidence <span aria-hidden="true">·</span> No private notes or release actions',
    'M4-D1 · LOCAL ONLY <span aria-hidden="true">·</span> '+headline+' <span aria-hidden="true">·</span> NO LOGIN OR WRITES');
  html=uniqueReplace(html,'<link rel="stylesheet" href="/control-room.css">','<link rel="stylesheet" href="/control-room.css"><link rel="stylesheet" href="/local.css">');
  html=uniqueReplace(html,'<span class="avatar" aria-label="Preview owner identity">N</span>','<span class="avatar" aria-label="Local demo user (not authenticated)">N</span>');
  html=uniqueReplace(html,'<title>NAVIN STUDIO — The Control Room · M4 Concept</title>',
    '<title>NAVIN STUDIO — Local Control Room · '+(demo?'SIMULATED':'PUBLIC SOURCE')+'</title>');
  html=html.replaceAll('Owner session checked at runtime','Local session · no sign-in');
  html=html.replaceAll('All eight source repositories have been verified as publicly accessible. Development readiness is not inferred from repository activity.','Eight public repository paths from the Studio catalog. Live GitHub source details are requested only when you inspect a project.');
  html=html.replaceAll('Protected owner interface','Local development preview');
  let js=uniqueReplace(controlRoomJs,"if(user.role!=='owner')throw Error('access_denied');","if(user.role!=='local_preview')throw Error('access_denied');");
  js=uniqueReplace(js,"document.getElementById('apiAccessValue').textContent='Protected';","document.getElementById('apiAccessValue').textContent='Local only';");
  js=uniqueReplace(js,"document.getElementById('apiAccessNote').textContent='Owner API · read-only';",
    "document.getElementById('apiAccessNote').textContent='"+(demo?'SIMULATED · NO LIVE DATA':'PUBLIC ONLY · READ-ONLY')+"';");
  js=uniqueReplace(js,"setProtectedState('ready','Read-only evidence connected','Public catalog verified by owner-only API · observed '+(overview.observed_at||'timestamp unavailable')+'. GitHub CI evidence is requested per project.');",
    "setProtectedState('ready','"+(demo?'LOCAL SIMULATED DATA':'PUBLIC GITHUB SOURCE MODE')+"','"+(demo?
    'This is a simulated demo, not a live GitHub check. ':'Public catalog loaded from checked-in source; verify individual GitHub records on demand. ')+"Observed '+(overview.observed_at||'unknown')+'.');");
  js=uniqueReplace(js,"if(data.source_state!=='current'||!part) {", "if(!['current','simulated'].includes(data.source_state)||!part) {");
  js=uniqueReplace(js,"target.textContent='Repository: '+(part.repository||'unknown')", "target.textContent=(data.source_state==='simulated'?'SIMULATED EXAMPLE — NOT LIVE\\n':'')+'Repository: '+(part.repository||'unknown')");
  js=uniqueReplace(js,"target.textContent='Workflow: '+(part.workflow||'unnamed')", "target.textContent=(data.source_state==='simulated'?'SIMULATED EXAMPLE — NOT LIVE\\n':'')+'Workflow: '+(part.workflow||'unnamed')");
  js=js.replaceAll('Public repository accessible · Preview','Public catalog · verify on request');
  js=js.replaceAll('Owner session unavailable','Local source unavailable').replaceAll('Owner API · read-only','Local public source only');
  js=js.replaceAll('Owner access is required. Sign in again through the protected application address; this page does not expose private data.',
    'Local server returned an unexpected response. Restart this loopback preview; no private accounts are connected.');
  js=js.replaceAll('Read-only evidence connected',demo?'SIMULATED demo loaded':'PUBLIC source loaded');
  js=js.replaceAll('Checking protected source access','Checking local source mode');
  const css=controlRoomCss+'\n/* M4-D1 local-only status chrome; base Director\'s Cut UI remains unchanged. */\n'
    +'.demo-banner{font-size:10px;letter-spacing:.06em;background:'+(demo?'#392b24':'#21302e')+';color:#f6e5d7;white-space:normal;overflow-wrap:anywhere}\n'
    +'.api-rail[data-state="ready"]{border-color:'+(demo?'#d3a47470':'#8fd9bd55')+'}\n'
    +'@media(max-width:600px){.demo-banner{min-height:45px;height:auto;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:3px 6px;font-size:9px;letter-spacing:.04em;padding:7px 12px;text-align:center}.shell{min-height:calc(100vh - 45px)}.sidebar{top:45px;height:calc(100vh - 45px)}.topbar{top:45px}}\n';
  return {html,js,css};
}
