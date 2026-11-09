import test from 'node:test';
import assert from 'node:assert/strict';
import {planningAssets} from '../planning-ui.mjs';
test('E3 has accessible navigation, form labels, calendar day selection and two separated data feeds',()=>{
 const h=planningAssets.html,j=planningAssets.js;
 for(const id of ['planningMain','selectedDate','projectFilter','priorityList','sessionList','calendarDays','planningForm','planTitle','planDate','planProject','planLink','deadlineList','planCancel','planSave'])assert.match(h,new RegExp('id="'+id+'"'));
 assert.match(h,/class="skip-link"/);assert.match(h,/aria-live="polite"/);assert.match(h,/SAVED ON THIS COMPUTER/);
 assert.match(j,/\/api\/local\/planning/);assert.match(j,/\/api\/local\/operations/);assert.match(j,/\/api\/projects/);
 assert.match(j,/document\.createElement/);assert.doesNotMatch(j,/\.innerHTML\s*=/);
});
test('E3 links verified source and local task states as independent values',()=>{
 assert.match(planningAssets.html,/Planning marks do not change E2 task status/);
 assert.match(planningAssets.js,/E2 task status was not changed/);
 assert.match(planningAssets.html,/NO GITHUB WRITES/);
});
test('E3 uses priority max-3, real month grid, keyboard and reduced-motion rules',()=>{
 const j=planningAssets.js,c=planningAssets.css;
 assert.match(j,/remainingPrioritySlots\(\)>=3/);assert.match(j,/i<42/);assert.match(j,/aria-pressed/);
 assert.match(j,/\.focus\(\)/);assert.match(c,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(c,/@media\(max-width:395px\)/);
});
