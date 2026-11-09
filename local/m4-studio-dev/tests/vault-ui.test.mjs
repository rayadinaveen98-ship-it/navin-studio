import test from 'node:test';import assert from 'node:assert/strict';
import {Script} from 'node:vm';import {vaultAssets} from '../vault-ui.mjs';

test('Vault client is syntactically valid',()=>{assert.doesNotThrow(()=>new Script(vaultAssets.js))});
test('Vault HTML has standalone main landmark, skip link and labeled inputs',()=>{
 assert.match(vaultAssets.html,/<main\b/);assert.match(vaultAssets.html,/Skip to main content/);
 for(const id of ['vaultProject','vaultType','vaultTitle','vaultBody'])assert.ok(vaultAssets.html.includes('for="'+id+'"'));
 assert.match(vaultAssets.html,/NO CLOUD SYNC/);
});
test('Vault uses on-device API, never cloud, token or hidden auth',()=>{
 assert.match(vaultAssets.js,/\/api\/local\/drafts/);assert.match(vaultAssets.js,/If-Match/);
 assert.doesNotMatch(vaultAssets.js,/localStorage|sessionStorage|Authorization: Bearer|api\.github\.com|https:\/\//);
 assert.match(vaultAssets.js,/stale_revision/);
});
test('Vault HTML/JS/CSS are CSP-compatible and responsive',()=>{
 assert.doesNotMatch(vaultAssets.html,/<script>(?:.|\s)*?<\/script>/);
 assert.doesNotMatch(vaultAssets.html,/\sstyle="/);assert.match(vaultAssets.css,/@media\(max-width:700px\)/);
 assert.match(vaultAssets.css, /prefers-reduced-motion/);
});
test('Vault uses safe DOM text writes rather than injecting user draft HTML',()=>{
 assert.match(vaultAssets.js,/h\.textContent=item\.title/);
 assert.match(vaultAssets.js,/body\.textContent=item\.body/);
 assert.doesNotMatch(vaultAssets.js,/innerHTML/);
});
