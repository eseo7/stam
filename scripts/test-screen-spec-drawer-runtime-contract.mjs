#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const html = await readFile(path.join(ROOT, 'stam/pages/boards/screen-specification.html'), 'utf8');
const crud = await readFile(path.join(ROOT, 'stam/js/stam.screen-specification-crud.js'), 'utf8');
const legacy = await readFile(path.join(ROOT, 'stam/js/stam.screen-specification.js'), 'utf8');

const LIVE_CONTRACT = {
  drawer: 'ssv2-drawer',
  scrim: 'ssv2-scrim',
  trigger: 'data-ssv2-reg',
  closeTriggers: ['ssv2-close', 'ssv2-cancel-btn', 'ssv2-scrim'],
};
const KNOWN_GAPS = Object.freeze({
  escapeClose: 'not implemented for the live ssv2 drawer',
  focusTrap: 'not implemented',
  focusRestore: 'not implemented',
  bodyScrollLock: 'not implemented',
});

for (const id of ['ss-drawer', 'ssv2-drawer']) {
  assert.match(html, new RegExp(`id="${id}"`), `LIVE CONTRACT inventory: #${id} must be documented`);
}
assert.match(html, /id="ssv2-drawer"[^>]*role="dialog"[^>]*aria-modal="true"/);
assert.match(html, /class="stam-drawer-scrim" id="ssv2-scrim"/);
assert.match(html, /data-ssv2-reg="1"/);
assert.match(crud, /function openDrawerRegister\(\)/);
assert.match(crud, /drawer\.setAttribute\('data-open', 'true'\)/);
assert.match(crud, /setMode\('register'\)/);
assert.match(crud, /form\.hidden = !isForm/);
assert.match(crud, /function closeDrawer\(\)/);
assert.match(crud, /drawer\.setAttribute\('data-open', 'false'\)/);
for (const id of LIVE_CONTRACT.closeTriggers) {
  assert.match(crud, new RegExp(`\\$\\('${id}'\\)`), `LIVE CONTRACT close trigger missing: #${id}`);
}
assert.match(crud, /scrim\.classList\.add\('show'\)/);
assert.match(crud, /scrim\.classList\.remove\('show'\)/);

const openRegisterBody = crud.match(/function openDrawerRegister\(\) \{([\s\S]*?)\n  \}/)?.[1] || '';
assert.doesNotMatch(openRegisterBody, /ss-drawer|showDw/, 'FORBIDDEN DIRECT ACCESS: live register must not open legacy drawer');
assert.match(legacy, /function openDetail\(id\) \{\s*if \(SS_FIRESTORE_LIVE\) return;/);

console.log('screen spec drawer runtime contract: PASS');
console.log('KNOWN GAP:', JSON.stringify(KNOWN_GAPS));
