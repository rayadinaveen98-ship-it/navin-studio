import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {backupAssets} from '../backup-ui.mjs';
const h=backupAssets.html,j=backupAssets.js,c=backupAssets.css;
test('E4 visual page offers real export/preview/restore controls and truthful plaintext warnings',()=>{
 for(const id of ['backupDownload','backupFile','backupPreview','backupRestore','ackSaved','backupConfirm','previewPanel','previewRows','backupState'])assert.match(h,new RegExp('id="'+id+'"'));
 assert.match(h,/NO CLOUD/);assert.match(h,/not encrypted/);assert.match(h,/not a merge/);assert.match(h,/No account|without an account/);
});
test('E4 UI gates restore behind file validation, current-backup acknowledgment and typed confirmation',()=>{
 assert.match(j,/activePreview/);assert.match(j,/REPLACE LOCAL DATA/);assert.match(j,/ackSaved/);
 assert.match(j,/\/api\/local\/backup\/preview/);assert.match(j,/\/api\/local\/backup\/restore/);
 assert.match(j,/\.disabled=!canRestore/);assert.match(j,/previewRows/);
});
test('E4 UI uses textContent for imported data and no raw HTML injection path',()=>{
 assert.doesNotMatch(j,/innerHTML\s*=/);assert.match(j,/cell\.textContent=value/);
 assert.doesNotMatch(j,/localStorage|sessionStorage|Authorization|github\.com/);
});
test('E4 CSS supports narrow phones, keyboard focus and reduced-motion preferences',()=>{
 assert.match(c,/@media\(max-width:385px\)/);assert.match(c,/@media\(prefers-reduced-motion:reduce\)/);assert.match(c,/:focus-visible/);
 assert.match(h,/skip-link/);assert.match(h,/<main/);assert.match(h,/aria-live/);
});
