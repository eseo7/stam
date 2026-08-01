#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const [css, html, crud] = await Promise.all([
  readFile(path.join(ROOT, 'stam/css/stam.screen-specification.css'), 'utf8'),
  readFile(path.join(ROOT, 'stam/pages/boards/screen-specification.html'), 'utf8'),
  readFile(path.join(ROOT, 'stam/js/stam.screen-specification-crud.js'), 'utf8'),
]);

function declarations(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(escaped + '\\s*\\{([^}]*)\\}', 'm'));
  assert.ok(match, `missing CSS rule: ${selector}`);
  return Object.fromEntries(match[1].split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const split = part.indexOf(':');
    return [part.slice(0, split).trim(), part.slice(split + 1).trim()];
  }));
}

const selector = '#ssv2-drawer .ssv2-foot-row[hidden]';
const rule = declarations(css, selector);
assert.equal(rule.display, 'none', `${selector} must remove hidden footer groups from layout`);
assert.equal(Object.keys(rule).length, 1, `${selector} must remain a visibility-only fix`);
assert.doesNotMatch(css.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{[^}]*\\}'))[0], /!important/i);

assert.match(html, /id="ssv2-foot-detail"/);
assert.match(html, /id="ssv2-foot-form" hidden/);
assert.match(crud, /fd\.hidden = isForm/);
assert.match(crud, /ff\.hidden = !isForm/);
assert.doesNotMatch(crud, /ssv2-foot-(?:detail|form)[\s\S]{0,160}style\.display/);

const drawerRule = html.match(/\.ssv2-drawer\s*\{([^}]*)\}/)?.[1] || '';
assert.match(drawerRule, /width:460px/);
assert.match(drawerRule, /max-width:94vw/);
const buttonRule = html.match(/\.ssv2-fbtn\s*\{([^}]*)\}/)?.[1] || '';
assert.match(buttonRule, /padding:6px 13px/);
assert.match(buttonRule, /transition:all 120ms/);
assert.doesNotMatch(buttonRule, /position:|transform:|margin:/);

assert.match(html, /id="ss-drawer"/, 'legacy drawer must remain unchanged in this fix');
assert.match(html, /id="ss-dw-scrim"/, 'legacy scrim must remain unchanged in this fix');

console.log('screen spec drawer footer visibility contract: PASS');
