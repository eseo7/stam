import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const html = await readFile(new URL('stam/pages/boards/requirements.html', ROOT), 'utf8');

const matches = [...html.matchAll(/\sstyle\s*=/gi)];
assert.equal(
  matches.length,
  0,
  'requirements.html must have zero inline style attributes; found ' + matches.length
);

console.log('requirements no inline style: PASS');
