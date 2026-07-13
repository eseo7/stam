#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const listSource = await readFile(path.join(ROOT, 'stam/js/stam.wbs-firestore-list.js'), 'utf8');

const context = vm.createContext({
  window: { STAM: {}, STAMBoardList: null },
  document: {
    readyState: 'complete',
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
  },
  Promise, String, Array, Object, Error, Number, Math, Date,
});
context.window.window = context.window;
context.window.document = context.document;

vm.runInContext(listSource, context, { filename: 'stam.wbs-firestore-list.js' });

const api = context.window.STAM.wbsFirestoreList;
const TODAY = '2026-06-07';

assert.deepEqual(api.deriveScheduleState({ status: 'done', startDate: '2026-06-01', endDate: '2026-06-05' }, TODAY).verdict, '완료');
assert.deepEqual(api.deriveScheduleState({ status: 'hold', startDate: '2026-06-01', endDate: '2026-06-05' }, TODAY).verdict, '보류');
assert.deepEqual(api.deriveScheduleState({ status: 'delayed', startDate: '2026-06-01', endDate: '2026-06-05' }, TODAY).risk, '일정 지연');
assert.deepEqual(api.deriveScheduleState({ status: 'in_progress', startDate: '2026-06-01', endDate: '2026-06-05' }, TODAY).verdict, '기간초과');
assert.deepEqual(api.deriveScheduleState({ status: 'wait', startDate: '2026-06-10', endDate: '2026-06-20' }, TODAY).verdict, '미착수');
assert.deepEqual(api.deriveScheduleState({ status: 'in_progress', startDate: '2026-06-01', endDate: '2026-06-20' }, TODAY).verdict, '진행중');
assert.deepEqual(api.deriveScheduleState({ status: 'wait', startDate: '', endDate: '' }, TODAY).verdict, '—');

const items = [
  { status: 'in_progress', endDate: '2026-06-10', functionGroup: 'A', progress: 30 },
  { status: 'delayed', endDate: '2026-06-08', functionGroup: 'A', progress: 10 },
  { status: 'done', endDate: '2026-06-05', functionGroup: 'B', progress: 100 },
  { status: 'wait', endDate: '2026-06-12', functionGroup: 'C', progress: 0 },
  { status: 'in_progress', endDate: '2026-06-07', functionGroup: 'D', progress: 50 },
];
const kpis = api.computeKpis(items, TODAY);
assert.equal(kpis.total, 5);
assert.equal(kpis.inProgress, 2);
assert.equal(kpis.done, 1);
assert.equal(kpis.delayed, 1);
assert.equal(kpis.dueWeek, 1);
assert.equal(kpis.groupCount, 4);

const summary = api.computeTimelineSummary(items);
assert.equal(summary.itemCount, 5);
assert.equal(summary.averageProgress, 38);
assert.equal(summary.groupSummary.length, 4);
assert.equal(summary.groupSummary.find((g) => g.functionGroup === 'A').count, 2);

console.log('wbs derived contract: PASS');
