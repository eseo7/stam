#!/usr/bin/env node
/**
 * STAM Board Empty State — shared component contract
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const jsSource = await readFile(new URL('stam/js/stam.board-empty-state.js', ROOT), 'utf8');
const cssSource = await readFile(new URL('stam/css/stam.board-empty-state.css', ROOT), 'utf8');
const rqListSource = await readFile(new URL('stam/js/stam.requirements-firestore-list.js', ROOT), 'utf8');
const fnListSource = await readFile(new URL('stam/js/stam.functional-spec-firestore-list.js', ROOT), 'utf8');
const rqPageSource = await readFile(new URL('stam/pages/boards/requirements.html', ROOT), 'utf8');
const fnPageSource = await readFile(new URL('stam/pages/boards/functional-specification.html', ROOT), 'utf8');

assert.match(jsSource, /window\.STAM\.boardEmptyState\s*=\s*\{/);
assert.match(jsSource, /emptyRow:\s*emptyRow/);
assert.match(jsSource, /loadingRow:\s*loadingRow/);
assert.match(jsSource, /errorRow:\s*errorRow/);
assert.match(jsSource, /messageRow:\s*messageRow/);
assert.match(jsSource, /hydrateIcons:\s*hydrateIcons/);
assert.match(jsSource, /stam-board-empty-row/);
assert.match(jsSource, /stam-board-empty-state/);
assert.doesNotMatch(jsSource, /document\.(getElementById|querySelector)/);

assert.match(cssSource, /\.stam-board-empty-state\s*\{/);
assert.match(cssSource, /min-height:\s*240px/);
assert.match(cssSource, /text-align:\s*center/);

assert.match(rqListSource, /boardEmptyState\(\)/);
assert.doesNotMatch(rqListSource, /function emptyStateIconHtml/);
assert.doesNotMatch(rqListSource, /rq-empty-state/);
assert.match(fnListSource, /boardEmptyState\(\)/);
assert.doesNotMatch(fnListSource, /fn-empty-row/);
assert.doesNotMatch(fnListSource, /function statusMessageRow/);

assert.match(rqPageSource, /stam\.board-empty-state\.js/);
assert.match(rqPageSource, /stam\.board-empty-state\.css/);
assert.match(fnPageSource, /stam\.board-empty-state\.js/);
assert.match(fnPageSource, /stam\.board-empty-state\.css/);

const context = vm.createContext({
  window: {
    STAM: {},
    renderStamIcon(name, options) {
      return '<svg data-icon="' + name + '" class="' + (options && options.className || '') + '"></svg>';
    },
    hydrateStamIcons() {},
  },
  document: {},
});

context.window.window = context.window;

vm.runInContext(jsSource, context, { filename: 'stam.board-empty-state.js' });
const api = context.window.STAM.boardEmptyState;
assert.ok(api);

const emptyHtml = api.emptyRow({
  colspan: 9,
  title: '등록된 기능정의가 없습니다',
  description: '등록 버튼을 눌러 직접 추가하세요.',
});
assert.match(emptyHtml, /stam-board-empty-row--empty/);
assert.match(emptyHtml, /stam-board-empty-state/);
assert.match(emptyHtml, /stam-board-empty-title/);
assert.match(emptyHtml, /stam-board-empty-desc/);
assert.match(emptyHtml, /clipboard-check/);
assert.doesNotMatch(emptyHtml, /Firestore/i);

const loadingHtml = api.loadingRow({
  colspan: 8,
  title: '불러오는 중',
  description: '잠시만 기다려 주세요.',
});
assert.match(loadingHtml, /stam-board-empty-row--loading/);
assert.match(loadingHtml, /stam-board-empty-state--status/);
assert.doesNotMatch(loadingHtml, /stam-board-empty-icon/);

const errorHtml = api.errorRow({
  title: '오류',
  description: '다시 시도',
});
assert.match(errorHtml, /stam-board-empty-row--error/);

const xssHtml = api.emptyRow({
  title: '<script>alert(1)</script>',
  description: 'a & b',
});
assert.doesNotMatch(xssHtml, /<script>/);
assert.match(xssHtml, /&lt;script&gt;/);
assert.match(xssHtml, /a &amp; b/);

console.log('board empty state contract: PASS');
