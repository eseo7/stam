#!/usr/bin/env node
/**
 * STAM PR D1 — shared ConditionGroup Firestore rules static contract.
 *
 * Static source inspection only — does not execute Rules Emulator.
 *
 * Usage:
 *   node scripts/test-screen-composition-rules-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const rulesSource = await readFile(path.join(ROOT, 'firestore.rules'), 'utf8');

const compositionHelpers = rulesSource.match(
  /\/\/ ── Shared composition shape helpers \(PR D1\)[\s\S]*?\/\/ ── ScreenSection write helpers \(ScreenSection-1\)/,
);
assert.ok(compositionHelpers, 'composition helper block must exist');
const helpers = compositionHelpers[0];

let testCount = 0;
function test(name, fn) {
  testCount += 1;
  fn();
}

test('full condition helper block exists (non-recursive)', () => {
  assert.match(helpers, /function isValidConditionSource\(/);
  assert.match(helpers, /function isValidConditionOperator\(/);
  assert.match(helpers, /function isValidConditionSourceId\(/);
  assert.match(helpers, /function isValidConditionValue\(/);
  assert.match(helpers, /function isValidConditionItem\(/);
  assert.match(helpers, /function isValidConditionItems\(/);
  assert.match(helpers, /function isValidConditionGroupShape\(group\)/);
  assert.doesNotMatch(helpers, /function isValidConditionItemBasic\(/);
  assert.doesNotMatch(helpers, /function isValidConditionItemsBasic\(/);
});

test('ConditionGroup allows only logic and conditions keys', () => {
  assert.match(helpers, /group\.keys\(\)\.hasOnly\(\['logic', 'conditions'\]\)/);
  assert.match(helpers, /group\.keys\(\)\.hasAll\(\['logic', 'conditions'\]\)/);
});

test('logic enum all|any', () => {
  assert.match(helpers, /group\.logic == 'all' \|\| group\.logic == 'any'/);
});

test('conditions count bounds 1..20', () => {
  assert.match(helpers, /group\.conditions\.size\(\) >= 1/);
  assert.match(helpers, /group\.conditions\.size\(\) <= 20/);
});

test('all 20 condition indices validated with size guards', () => {
  for (let i = 0; i < 20; i += 1) {
    assert.match(helpers, new RegExp(`conditions\\.size\\(\\) < ${i + 1} \\|\\| isValidConditionItem\\(conditions\\[${i}\\]\\)`));
  }
});

test('condition item allows only contract keys', () => {
  assert.match(helpers, /item\.keys\(\)\.hasOnly\(\['source', 'sourceId', 'operator', 'value'\]\)/);
  assert.match(helpers, /item\.keys\(\)\.hasAll\(\['source', 'sourceId', 'operator', 'value'\]\)/);
});

test('source enum matches JS contract', () => {
  for (const source of ['field', 'role', 'screenMode', 'recordState']) {
    assert.match(helpers, new RegExp(`source == '${source}'`));
  }
});

test('operator enum matches JS contract', () => {
  for (const operator of ['eq', 'neq', 'in', 'notIn', 'exists', 'notExists', 'contains', 'gt', 'gte', 'lt', 'lte']) {
    assert.match(helpers, new RegExp(`operator == '${operator}'`));
  }
});

test('field sourceId requires non-empty string', () => {
  assert.match(helpers, /source == 'field'\s*\?\s*sourceId is string && sourceId\.size\(\) > 0/);
});

test('non-field sourceId requires null', () => {
  assert.match(helpers, /source == 'role' \|\| source == 'screenMode' \|\| source == 'recordState'\)\s*\?\s*sourceId == null/);
});

test('exists/notExists require null value', () => {
  assert.match(helpers, /operator == 'exists' \|\| operator == 'notExists'\)\s*\?\s*value == null/);
});

test('in/notIn require non-empty list value', () => {
  assert.match(helpers, /operator == 'in' \|\| operator == 'notIn'\)\s*\?\s*value is list && value\.size\(\) > 0/);
});

test('gt/gte/lt/lte require number value', () => {
  assert.match(helpers, /operator == 'gt' \|\| operator == 'gte' \|\| operator == 'lt' \|\| operator == 'lte'\)\s*\?\s*value is int \|\| value is float/);
});

test('eq/neq reject list and map values', () => {
  assert.match(helpers, /operator == 'eq' \|\| operator == 'neq'\)\s*\?\s*isValidConditionScalar\(value\) && !\(value is list\) && !\(value is map\)/);
});

test('contains accepts non-empty string or non-empty list', () => {
  assert.match(helpers, /operator == 'contains'\s*\?\s*\(value is string && value\.size\(\) > 0\) \|\| \(value is list && value\.size\(\) > 0\)/);
});

test('unknown operator rejected via false fallback', () => {
  assert.match(helpers, /function isValidConditionValue\(operator, value\)[\s\S]*?: false;/);
});

test('item validation requires map type', () => {
  assert.match(helpers, /function isValidConditionItem\(item\)[\s\S]*?return item is map/);
});

test('nested condition groups rejected via hasOnly keys', () => {
  assert.match(helpers, /item\.keys\(\)\.hasOnly\(\['source', 'sourceId', 'operator', 'value'\]\)/);
});

test('screenFields composition uses ConditionGroup shape', () => {
  assert.match(rulesSource, /function isValidScreenFieldComposition\(data\)/);
  assert.match(rulesSource, /isValidConditionGroupShape\(data\.visibilityCondition\)/);
  assert.match(rulesSource, /isValidConditionGroupShape\(data\.enabledCondition\)/);
  assert.match(rulesSource, /isValidConditionGroupShape\(data\.requiredCondition\)/);
});

test('screenActions composition uses ConditionGroup shape', () => {
  assert.match(rulesSource, /function isValidScreenActionComposition\(data\)/);
  assert.match(rulesSource, /isValidConditionGroupShape\(data\.visibilityCondition\)/);
  assert.match(rulesSource, /isValidConditionGroupShape\(data\.enabledCondition\)/);
});

test('screenSections visibilityCondition uses ConditionGroup shape', () => {
  assert.match(rulesSource, /isValidConditionGroupShape\(data\.visibilityCondition\)/);
});

console.log(`screen composition rules contract (${testCount} cases, static): PASS`);
