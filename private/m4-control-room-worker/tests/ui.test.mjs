import test from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import { controlRoomHtml, controlRoomJs, controlRoomCss } from '../src/control-room-bundle.js';

test('UI runtime is syntactically valid JavaScript, not a broken embedded template',()=>{
  assert.doesNotThrow(()=>new Script(controlRoomJs,{filename:'control-room.js'}));
});
test('UI shell references only auth-checked same-origin Worker resources',()=>{
  assert.match(controlRoomHtml,/<link rel="stylesheet" href="\/control-room\.css">/);
  assert.match(controlRoomHtml,/<script src="\/control-room\.js" defer><\/script>/);
  assert.ok(!/<script>(?:.|\s)*?<\/script>/.test(controlRoomHtml));
  assert.ok(!/<style[\s>]/.test(controlRoomHtml));
  assert.ok(!/\sstyle="/.test(controlRoomHtml));
  assert.equal((controlRoomHtml.match(/src="https?:\/\//g)||[]).length,0);
});
test('UI never persists identity/source responses or supplies browser credentials manually',()=>{
  for(const source of [controlRoomJs,controlRoomHtml]){
    assert.doesNotMatch(source,/\blocalStorage\s*[\[(.]/);
    assert.doesNotMatch(source,/\bsessionStorage\s*[\[(.]/);
    assert.doesNotMatch(source,/\bindexedDB\b/);
    assert.doesNotMatch(source,/\bBearer\s+[a-z0-9-]+/i);
  }
  assert.match(controlRoomJs,/credentials:'same-origin'/);
  assert.match(controlRoomJs,/cache:'no-store'/);
});
test('UI explicitly labels checked source vs denied and unavailable sessions',()=>{
  assert.match(controlRoomJs,/Read-only evidence connected/);
  assert.match(controlRoomJs,/Owner session unavailable/);
  assert.match(controlRoomJs,/Source verification unavailable/);
  assert.match(controlRoomJs,/No cached values are presented as current/);
  assert.match(controlRoomJs,/projects.splice\(0,projects.length\)/);
});
test('UI design retains project directory, source requests, reduced-motion and mobile layouts',()=>{
  assert.match(controlRoomJs,/data-fetch-evidence/);
  assert.match(controlRoomJs,/data-evidence-project/);
  assert.match(controlRoomJs,/api\/projects/);
  assert.match(controlRoomCss,/@media/);
  assert.match(controlRoomHtml,/id="view-projects"/);
  assert.match(controlRoomHtml,/id="view-overview"/);
});
