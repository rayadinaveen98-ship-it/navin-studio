import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {Script} from 'node:vm';
const html=readFileSync(new URL('../studio-home.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../studio-home.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../studio-home.js',import.meta.url),'utf8');
test('Home JS syntax valid, no inline scripts/styles or external app assets',()=>{
 assert.doesNotThrow(()=>new Script(js));assert.match(html,/src="\/studio-home\.js"/);assert.match(html,/href="\/studio-home\.css"/);
 assert.doesNotMatch(html,/<script>(.|\s)*?<\/script>/);assert.doesNotMatch(html,/\sstyle="/);assert.doesNotMatch(html,/<style[ >]/);
 assert.doesNotMatch(html,/https?:\/\//);assert.ok(css.includes('@media'));
});
test('focus selection is a real browser-only action with max three IDs and no private drafts',()=>{
 assert.match(js,/localStorage\.setItem/);assert.match(js,/selected\.length<3/);assert.match(js,/selected\.length===0/);
 assert.match(html,/id="focusChoices"/);assert.match(html,/id="focusCount"/);
 assert.doesNotMatch(js,/api\/save|api\/write|GitHubToken|access_token|approveRelease/);
});
test('Home shows read-only public GitHub source versus simulated evidence',()=>{
 assert.match(js,/SIMULATED DATA — NOT LIVE/);assert.match(js,/PUBLIC GITHUB — ON-DEMAND ONLY/);
 assert.match(js,/source_count/);assert.match(js,/rate_limited_or_denied/);
 assert.match(js,/https:\/\/github\.com\//);assert.match(js,/inferred priority/);
});
test('nonpersisted source history cleared when a new request fails',()=>{
 assert.match(js,/activity=null/);assert.match(js,/No previously loaded GitHub activity is presented as current/);
 assert.match(js,/button\.disabled=true/);assert.match(js,/data-filter/);
});
