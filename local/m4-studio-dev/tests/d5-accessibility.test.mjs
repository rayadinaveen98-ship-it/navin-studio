import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {homeAssets} from '../home-ui.mjs';
import {workspaceAssets} from '../workspace-ui.mjs';
import {localAssets} from '../ui-assets.mjs';
const read=(filename)=>readFileSync(new URL('../'+filename, import.meta.url),'utf8');
const views=[['home',homeAssets.html,workspaceAssets.css+'\n'+homeAssets.css],['workspace',workspaceAssets.html,workspaceAssets.css],['control-room',localAssets('fixture').html,localAssets('fixture').css]];
for(const [name,html,css] of views){
 test('D5 '+name+': keyboard skip link targets accessible main landmark',()=>{
  const match=html.match(/<a class="skip-link" href="#([\w-]+)">Skip to main content<\/a>/);
  assert.ok(match,name+' skip link');
  assert.match(html,new RegExp('<main[^>]*id="'+match[1]+'"[^>]*tabindex="-1"'));
  assert.match(css,/\.skip-link:focus-visible/);
  assert.match(css,/outline/);
 });
 test('D5 '+name+': semantic document and motion reduction remain intact',()=>{
  assert.match(html,/<html lang="en">/);
  assert.match(html,/<h1[\s>]/);
  assert.match(html,/<main\b/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.ok(!/<script>(.|\s)*<\/script>/s.test(html),'No inline executable scripts');
 });
}
test('D5 Home: focus selector uses semantic group and pressed state',()=>{
 assert.match(homeAssets.html,/id="focusChoices" role="group" aria-label="Choose up to three focus projects"/);
 const script=read('studio-home.js');
 assert.match(script,/aria-pressed="\$\{active\}"/);
 assert.match(script,/const restoreFocus=document\.activeElement\?\.matches\?/);
 assert.match(script,/next\?\.focus\(\{preventScroll:true\}\)/);
});
test('D5 Workspace: project navigation moves focus to updated heading',()=>{
 const script=read('workspace.js');
 assert.match(workspaceAssets.html,/<h1 id="projectTitle" tabindex="-1">/);
 assert.match(script,/if\(navigate\)\{\$\('projectTitle'\)\.focus\(\{preventScroll:true\}\);\}/);
});
test('D5 boundaries: static local UI contains no fake authentication or inline private secrets',()=>{
 for(const [name,html] of views){
  assert.ok(!html.includes('type="password"'),name);
  assert.doesNotMatch(html,/<iframe\b/i,name);
 }
 assert.match(read('server.mjs'),/server\.listen\(port,'127\.0\.0\.1'/);
});
