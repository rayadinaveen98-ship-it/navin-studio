import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
const html=read('studio-operations.html'),css=read('studio-operations.css'),js=read('studio-operations.js');
test('E2 page has meaningful landmarks and labeled editing controls',()=>{
 for(const id of ['operationsMain','operationsForm','recordTitle','recordKind','recordStatus','recordDue','recordDetails','operationsList','projectPicker','linkedNotes'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/<main\b/);assert.match(html,/Skip to main content/);assert.match(html,/role="status"/);
});
test('project Operations UI has reduced motion support via approved shared styles',()=>{
 assert.ok(read('workspace.css').includes('prefers-reduced-motion'));
 assert.ok(css.includes('@media(max-width:700px)'));
 assert.ok(css.includes('@media(max-width:370px)'));
});
test('data is not sent to GitHub, localStorage or browser third parties',()=>{
 assert.ok(js.includes("'/api/local/operations'"));assert.ok(js.includes("'/api/local/drafts'"));
 assert.ok(!/localStorage|sessionStorage|https:\/\/api.github.com/.test(js));
 assert.ok(!/<script>(?:.|\n)*<\/script>/.test(html));
});
test('UI builds operation titles, decision history and linked notes using DOM textContent',()=>{
 assert.ok(js.includes('textContent=value'));
 assert.ok(js.includes('history'));
 assert.ok(js.includes('linkedNotes'));
 assert.ok(js.includes("['edit','Edit']"));
 assert.ok(!js.includes('innerHTML='));
});
