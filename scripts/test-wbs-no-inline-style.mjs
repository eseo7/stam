import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const html = await readFile(new URL('stam/pages/boards/wbs.html', ROOT), 'utf8');

const styleAttrs = [...html.matchAll(/\sstyle\s*=/gi)];
assert.equal(
  styleAttrs.length,
  0,
  'wbs.html must have zero inline style attributes; found ' + styleAttrs.length
);

const styleBlocks = [...html.matchAll(/<style[\s>]/gi)];
assert.equal(
  styleBlocks.length,
  0,
  'wbs.html must have zero inline style blocks; found ' + styleBlocks.length
);

console.log('wbs no inline style: PASS');
