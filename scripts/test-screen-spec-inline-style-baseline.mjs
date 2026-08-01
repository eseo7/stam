#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const FILE = path.join(path.resolve(import.meta.dirname, '..'), 'stam/pages/boards/screen-specification.html');
const html = await readFile(FILE, 'utf8');
const BASELINE_BLOCK_HASH = '5c580746e377195897462c66762d50643c41a47ecd55f39a9be4affc15946cd6';
const allowed = new Map([
  ['span[data-stam-icon="search"]', 'color:var(--t3);flex-shrink:0'],
  ['div.ss-filter-wrap', 'position:relative'],
  ['span#ss-filter-cnt', 'display:none'],
  ...['width:40px','min-width:260px','width:72px','width:92px','width:96px','width:92px','width:110px','width:88px','width:96px']
    .map((style, i) => [`col[${i}]`, style]),
  ['div#ss-dw-tabs', 'display:none'],
  ['button#ssv2-close', 'margin-left:auto;border:0;background:none;font-size:16px;color:var(--t3);cursor:pointer'],
  ['div#ss-template-view', 'display:none'],
  ['div#ss-editor-view', 'display:none'],
  ['div#ss-preview-view', 'display:none'],
]);

function lineAt(index) { return html.slice(0, index).split('\n').length; }
let colIndex = 0;
const actual = [...html.matchAll(/<([a-z][\w-]*)([^>]*?)\sstyle="([^"]*)"([^>]*)>/gi)].map((m) => {
  const tag = m[1].toLowerCase();
  const attrs = m[2] + m[4];
  const id = attrs.match(/\sid="([^"]+)"/i)?.[1];
  const classes = attrs.match(/\sclass="([^"]+)"/i)?.[1]?.split(/\s+/) || [];
  const icon = attrs.match(/\sdata-stam-icon="([^"]+)"/i)?.[1];
  let key;
  if (tag === 'col') key = `col[${colIndex++}]`;
  else if (id) key = `${tag}#${id}`;
  else if (classes.includes('ss-filter-wrap')) key = 'div.ss-filter-wrap';
  else if (icon) key = `${tag}[data-stam-icon="${icon}"]`;
  else key = `${tag}@line${lineAt(m.index)}`;
  return { key, style: m[3], line: lineAt(m.index), tag: m[0] };
});

const violations = actual.filter((item) => !allowed.has(item.key) || allowed.get(item.key) !== item.style);
assert.equal(violations.length, 0, [
  'New or changed inline style outside the baseline allowlist:',
  ...violations.map((v) => `- ${FILE}:${v.line} ${v.key} style="${v.style}" allowed="${allowed.get(v.key) || '(none)'}"`),
].join('\n'));
assert.ok(actual.length <= allowed.size, `inline style baseline increased: actual=${actual.length} allowed=${allowed.size}`);

const blocks = [...html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)];
assert.ok(blocks.length <= 1, `new <style> block added: ${FILE}:${blocks[1] ? lineAt(blocks[1].index) : '?'}`);
if (blocks.length === 1) {
  const hash = crypto.createHash('sha256').update(blocks[0][1]).digest('hex');
  assert.equal(hash, BASELINE_BLOCK_HASH,
    `baseline <style> block changed at ${FILE}:${lineAt(blocks[0].index)}; remove it wholly in PR C or update this debt contract with explicit approval`);
}

const withoutBaseline = html
  .replace(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi, '')
  .replace(/\sstyle="[^"]*"/gi, '');
assert.doesNotMatch(withoutBaseline, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i,
  `new hardcoded color outside the baseline style locations in ${FILE}`);

console.log(`screen spec inline style baseline: PASS (attributes=${actual.length}, blocks=${blocks.length})`);
