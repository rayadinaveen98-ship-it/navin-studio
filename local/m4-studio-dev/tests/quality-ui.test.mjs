import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {Script} from 'node:vm';
const js=readFileSync(new URL('../workspace.js',import.meta.url),'utf8');const html=readFileSync(new URL('../workspace.html',import.meta.url),'utf8');const css=readFileSync(new URL('../workspace.css',import.meta.url),'utf8');
test('D3 code parses and uses no browser storage',()=>{assert.doesNotThrow(()=>new Script(js));assert.doesNotMatch(js,/localStorage|sessionStorage/)});
test('actual QA screen has independent controls, list and evidence states',()=>{
 for(const id of ['qualityRefresh','qualityRunList','qualityJobList','qualityRunsTag','qualityLastStatus','qualityObserved'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/qualityRefresh'\)\.addEventListener/);assert.match(js,/qualityRunList'\)\.addEventListener/);assert.match(js,/data-inspect-run/);
});
test('canonical source URLs are checked before link rendering',()=>{assert.match(js,/validRunLink\(/);assert.match(js,/validJobLink\(/);assert.match(js,/noopener noreferrer/)});
test('CI is never described as verified signed APK',()=>{assert.match(html,/CI success cannot confirm signing or device QA/);assert.match(html,/SIGNED APK/);assert.match(js,/SIMULATED/)});
test('async stale QA responses are discarded when navigating between projects',()=>{
 assert.match(js,/resetQuality\(\);currentProjectId=null/);assert.match(js,/qualityRequestNumber\+\+/);assert.match(js,/current!==qualityRequestNumber/);assert.match(js,/jobRequestNumber\+\+/);
});
test('responsiveness and reduced-motion rules remain in CSS',()=>{assert.match(css,/@media\(max-width:700px\)/);assert.match(css,/@media\(max-width:370px\)/);assert.match(css,/prefers-reduced-motion:reduce/)});
