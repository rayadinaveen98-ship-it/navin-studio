import test from 'node:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {localAssets} from '../ui-assets.mjs';

test('local UI derives runnable JavaScript from the approved Control Room without syntax errors',()=>{
  for(const mode of ['fixture','github']){
    const a=localAssets(mode);
    assert.doesNotThrow(()=>new Script(a.js));
    assert.match(a.html,/<script src="\/control-room.js" defer><\/script>/);
    assert.match(a.html,/<link rel="stylesheet" href="\/control-room.css">/);
    assert.doesNotMatch(a.html,/<script>(.|\n)*?<\/script>/);
  }
});
test('demo and public mode are visibly different, and neither claims a private login',()=>{
  const demo=localAssets('fixture');
  const live=localAssets('github');
  assert.match(demo.html,/SIMULATED DATA — NOT LIVE/);
  assert.match(live.html,/PUBLIC GITHUB — READ ONLY/);
  assert.match(demo.html,/NO LOGIN OR WRITES/);
  assert.match(live.html,/NO LOGIN OR WRITES/);
  assert.match(demo.js,/SIMULATED EXAMPLE — NOT LIVE/);
  assert.match(demo.js,/user.role!=='local_preview'/);
  assert.doesNotMatch(demo.js,/document.getElementById\('apiAccessValue'\).textContent='Protected'/);
});
test('phone banner uses wrapping, remains visibly labeled, and no remote runtime libraries',()=>{
  for(const mode of ['fixture','github']){
    const a=localAssets(mode);
    assert.match(a.css,/\.demo-banner\{min-height:45px;height:auto;display:flex;flex-wrap:wrap/);
    assert.doesNotMatch(a.html,/<script[^>]*src="https?:\/\//);
    assert.match(a.js,/credentials:'same-origin'/);
    assert.match(a.js,/cache:'no-store'/);
  }
});
