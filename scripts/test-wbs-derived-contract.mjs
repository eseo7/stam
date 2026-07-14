#!/usr/bin/env node
process.env.TZ = 'Asia/Seoul';

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

assert.equal(process.env.TZ, 'Asia/Seoul');

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

const mondayFixture = api.weekBoundsLocal('2026-06-08');
assert.equal(mondayFixture.monIso, '2026-06-08');
assert.equal(mondayFixture.sunIso, '2026-06-14');

const sundayFixture = api.weekBoundsLocal('2026-06-07');
assert.equal(sundayFixture.monIso, '2026-06-01');
assert.equal(sundayFixture.sunIso, '2026-06-07');

const prevSundayFixture = api.weekBoundsLocal('2026-06-14');
assert.equal(prevSundayFixture.monIso, '2026-06-08');
assert.equal(prevSundayFixture.sunIso, '2026-06-14');

const nextMondayFixture = api.weekBoundsLocal('2026-06-15');
assert.equal(nextMondayFixture.monIso, '2026-06-15');
assert.equal(nextMondayFixture.sunIso, '2026-06-21');

const dueWeekItems = [
  { status: 'in_progress', endDate: '2026-06-07', functionGroup: 'A' },
  { status: 'wait', endDate: '2026-06-15', functionGroup: 'C' },
  { status: 'done', endDate: '2026-06-07', functionGroup: 'D' },
];
const dueWeekKpis = api.computeKpis(dueWeekItems, '2026-06-07');
assert.equal(dueWeekKpis.dueWeek, 1);

assert.doesNotMatch(listSource, /wbs-pct-/);

function makeRow(pct) {
  return {
    functionGroup: 'G',
    progress: pct,
    status: 'in_progress',
    id: 'x',
    code: 'WBS-001',
    title: 't',
    phase: '구현',
    ownerId: 'u',
    ownerName: 'U',
    startDate: '2026-06-01',
    endDate: '2026-06-10',
  };
}

const table = {
  innerHTML: '',
  querySelectorAll() { return []; },
  insertAdjacentHTML(_, html) { this.innerHTML += html; },
};

const overallProgress = { value: 0 };
const gsumCells = [
  null, null, null, null, null,
  {
    innerHTML: '',
    parentElement: {
      querySelector(sel) {
        if (sel === '.wbs-gsum-prog') {
          return { querySelector() { return overallProgress; } };
        }
        return null;
      },
    },
  },
];
const groupsHost = {
  innerHTML: '',
  children: [],
  querySelector() { return null; },
  appendChild(el) {
    this.children.push(el);
    this.innerHTML += el.outerHTML || el.innerHTML || '';
  },
};
const progressBar = { value: 0 };

context.document.createElement = (tag) => {
  const el = { tagName: tag.toUpperCase(), innerHTML: '', attrs: {}, children: [] };
  el.setAttribute = (k, v) => { el.attrs[k] = v; };
  el.getAttribute = (k) => el.attrs[k];
  Object.defineProperty(el, 'outerHTML', {
    get() { return `<${tag}>${el.innerHTML}</${tag}>`; },
  });
  el.appendChild = (child) => { el.children.push(child); };
  return el;
};

context.document.getElementById = () => null;
context.document.querySelector = (sel) => {
  if (sel === '[data-wbs-detail="progressBar"]') return progressBar;
  if (sel === '.wbs-gantt-meta') return { textContent: '' };
  if (sel === '.wbs-gsum-groups') return groupsHost;
  if (sel === '.wbs-gantt-mobile') return { innerHTML: '' };
  return table;
};

context.document.querySelectorAll = (sel) => {
  if (sel === '.wbs-gsum-cell .wbs-gsum-val') return gsumCells;
  return [];
};

for (const pct of [1, 37, 82, 99]) {
  const rows = [makeRow(pct)];
  table.innerHTML = '';
  overallProgress.value = 0;
  groupsHost.innerHTML = '';
  progressBar.value = 0;

  api.renderRows(rows);
  const grpMatch = table.innerHTML.match(/<progress[^>]*value="(\d+)"/);
  assert.ok(grpMatch, `group header progress missing for ${pct}%`);
  assert.equal(Number(grpMatch[1]), pct);

  api.renderTimelineSummary(rows);
  assert.equal(overallProgress.value, pct, `overall progress value for ${pct}%`);

  const grpSummaryMatch = groupsHost.innerHTML.match(/<progress[^>]*value="(\d+)"/);
  assert.ok(grpSummaryMatch, `group summary progress missing for ${pct}%`);
  assert.equal(Number(grpSummaryMatch[1]), pct, `group summary value for ${pct}%`);

  api.renderDetail(rows[0]);
  assert.equal(progressBar.value, pct, `detail progressBar value for ${pct}%`);
}

console.log('wbs derived contract: PASS');
