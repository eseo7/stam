#!/usr/bin/env node
/**
 * STAM Common Picker — CSS duplication gate
 *
 * Ensures artifact pickers (referencePicker core + domain wrappers) do not
 * re-define visual styles in page CSS. Layout-only overrides are allowed.
 *
 * Usage:
 *   node scripts/test-picker-css-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const wbsCss = await readFile(path.join(ROOT, 'stam/css/stam.wbs.css'), 'utf8');
const customSelectCss = await readFile(path.join(ROOT, 'stam/css/stam.custom-select.css'), 'utf8');
const fnCss = await readFile(path.join(ROOT, 'stam/css/stam.functional-specification.css'), 'utf8');
const ssCss = await readFile(path.join(ROOT, 'stam/css/stam.screen-specification.css'), 'utf8');

const FORBIDDEN_WBS_PICKER_VISUAL = [
  /\.wbs-form-row\s+\.stam-cs-trigger\s*\{[^}]*height:/,
  /\[data-stam-reference-picker-toggle\][^}]*height:/,
  /\[data-stam-requirement-picker\][^}]*border:/,
  /\[data-stam-functional-spec-picker\][^}]*border:/,
  /\[data-stam-wbs-member-picker\][^}]*border:/,
  /\.wbs-sel-menu\s*\{[^}]*padding:/,
  /\.wbs-sel-menu\s*\{[^}]*max-height:/,
  /\.wbs-sel\s*\{[^}]*background:/,
  /\.wbs-sel-opt\s*\{[^}]*background:/,
];

for (const re of FORBIDDEN_WBS_PICKER_VISUAL) {
  assert.doesNotMatch(wbsCss, re, `forbidden WBS picker visual override: ${re}`);
}

assert.match(customSelectCss, /\.stam-cs-trigger\s*\{[^}]*height:\s*38px/, 'common trigger height');
assert.match(customSelectCss, /\[data-stam-reference-picker-search\]/, 'reference picker search input styles');
assert.match(customSelectCss, /\.stam-cs-meta/, 'reference picker meta text styles');

assert.doesNotMatch(fnCss, /\.fn-cs-trigger\s*\{/, 'functional-spec must not define fn-cs trigger styles');
assert.doesNotMatch(ssCss, /\.ss-cs-trigger\s*\{/, 'screen-spec must not define ss-cs trigger styles');

const pages = [
  'stam/pages/boards/wbs.html',
  'stam/pages/boards/functional-specification.html',
];

for (const pagePath of pages) {
  const html = await readFile(path.join(ROOT, pagePath), 'utf8');
  assert.match(html, /stam\.custom-select\.css/, `${pagePath} must load stam.custom-select.css`);
  assert.match(html, /stam\.reference-picker\.js/, `${pagePath} must load stam.reference-picker.js`);
}

console.log('picker css contract: PASS');
