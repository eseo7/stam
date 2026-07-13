#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const crudSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-firestore-crud.js'), 'utf8');
const listSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-firestore-list.js'), 'utf8');
const pageSource = await readFile(path.join(ROOT, 'stam/pages/boards/wbs.html'), 'utf8');

assert.match(crudSource, /svc\.create\(projectId, input, context\)/);
assert.match(crudSource, /svc\.update\(projectId, item\.id, patch, context\)/);
assert.equal(/collection\(['"]wbsItems['"]\)/.test(crudSource), false);
assert.equal(/\.softDelete\(/.test(crudSource), false);
assert.match(crudSource, /canWriteWbs/);
assert.match(crudSource, /requirementPicker/);
assert.match(crudSource, /initAll/);
assert.match(crudSource, /fnApi\.load\(fnPicker\)/);
assert.match(crudSource, /applyDefaultOwner/);
assert.match(crudSource, /omitWhenUnlinked: true/);
assert.match(crudSource, /reviewerId: ''/);
assert.doesNotMatch(crudSource, /setTimeout/);
assert.match(listSource, /refreshCrudAccessUI/);
assert.match(pageSource, /stam\.wbs-firestore-crud\.js/);
assert.match(pageSource, /stam\.wbs-firestore-list\.js/);
assert.doesNotMatch(pageSource, /stam\.wbs-crud\.js/);

console.log('wbs crud ui contract: PASS');
