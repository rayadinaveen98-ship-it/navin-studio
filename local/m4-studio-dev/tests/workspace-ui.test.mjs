import test from 'node:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {workspaceAssets} from '../workspace-ui.mjs';
import {localAssets} from '../ui-assets.mjs';

test('project UI JavaScript parses without runtime imports or build tools',()=>{
 assert.doesNotThrow(()=>new Script(workspaceAssets.js,{filename:'workspace.js'}));
});
test('project UI HTML contains only same-origin assets and does not inline scripts or styles',()=>{
 const html=workspaceAssets.html;
 assert.match(html,/<script src="\/workspace.js" defer><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="\/workspace.css">/);
 assert.doesNotMatch(html,/<script>(.|\n)*<\/script>/);
 assert.doesNotMatch(html,/<style(?:\s|>)/);
 assert.doesNotMatch(html,/\sstyle="/);
 assert.doesNotMatch(html,/<(?:script|link)[^>]+https?:/);
});
test('all five D2 functional content zones exist with semantic headings',()=>{
 for(const id of ['projectTitle','projectNavigation','evidenceBar','commitList','pullList','defaultBranch','refreshWorkspace','modeChip']){
  assert.match(workspaceAssets.html,new RegExp('id="'+id+'"'));
 }
});
test('both D1 modes provide real Open workspace navigation',()=>{
 for(const mode of ['fixture','github']){
  const js=localAssets(mode).js;
  assert.match(js,/Open project workspace/);
  assert.match(js,/\/workspace\/\$\{encodeURIComponent\(p.id\)\}/);
 }
});
test('local workspace UI renders separate fixture/live, rate limit and no-record states',()=>{
 const js=workspaceAssets.js;
 for(const value of ['SIMULATED DATA — NO LIVE GITHUB EVIDENCE','PUBLIC SOURCE EVIDENCE OBSERVED','RATE LIMITED','SOURCE NOT AVAILABLE','no_records','rate_limited_or_denied','Source unavailable']){
  assert.ok(js.includes(value),value);
 }
 assert.match(js,/const escapeHtml=/);
});
test('browser workspace never persists identity, injects tokens or mutates projects',()=>{
 const js=workspaceAssets.js;
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB|\bBearer\s+/i);
 assert.doesNotMatch(js,/method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i);
 assert.match(js,/cache:'no-store'/);
 assert.match(js,/credentials:'same-origin'/);
});
test('responsive project workspaces explicitly support tablet, small phones, reduced motion',()=>{
 const css=workspaceAssets.css;
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/@media\(max-width:370px\)/);
 assert.match(css, /prefers-reduced-motion/);
 assert.match(css, /grid-template-columns:minmax\(0,1fr\)/);
});
