#!/usr/bin/env node
/**
 * STAM WBS-3 — Project member read service + picker contract
 *
 * Usage:
 *   node scripts/test-project-member-picker-contract.mjs
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const referenceSource = await readFile(path.join(ROOT, 'stam/js/stam.reference-picker.js'), 'utf8');
const readServiceSource = await readFile(path.join(ROOT, 'stam/js/stam.project-member-read-service.js'), 'utf8');
const pickerSource = await readFile(path.join(ROOT, 'stam/js/stam.project-member-picker.js'), 'utf8');

assert.match(readServiceSource, /collection\('members'\)/);
assert.match(readServiceSource, /where\('status', '==', 'active'\)/);
assert.doesNotMatch(readServiceSource, /collectionGroup/);
assert.doesNotMatch(readServiceSource, /function create\(/);
assert.doesNotMatch(readServiceSource, /function update\(/);
assert.doesNotMatch(readServiceSource, /function delete\(/);
assert.doesNotMatch(readServiceSource, /\.set\(/);
assert.doesNotMatch(readServiceSource, /transaction/);
assert.doesNotMatch(readServiceSource, /batch/);

assert.match(pickerSource, /STAM\.referencePicker/);
assert.match(pickerSource, /projectMemberReadServiceContract/);

function createFakeFirestore(membersByProject) {
  const paths = [];
  return {
    paths,
    collection(name) {
      paths.push(name);
      return {
        doc(id) {
          paths.push(id);
          return {
            collection(sub) {
              paths.push(sub);
              return {
                where(field, op, value) {
                  paths.push(`${field}${op}${value}`);
                  return {
                    get() {
                      const docs = (membersByProject[id] || []).map((entry) => ({
                        id: entry.id,
                        data: () => entry.data,
                      }));
                      return Promise.resolve({
                        forEach(fn) { docs.forEach(fn); },
                      });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

function createContext() {
  const window = {};
  const context = vm.createContext({
    window,
    document: {
      documentElement: { getAttribute() { return null; }, setAttribute() {} },
      addEventListener() {},
      querySelectorAll() { return []; },
    },
    console,
    Date,
    Promise,
    Number,
    String,
    JSON,
    Array,
    Object,
    Error,
    WeakMap,
    Set,
  });
  window.window = window;
  return { context, window };
}

const { context, window } = createContext();
const firestore = createFakeFirestore({
  P1: [
    { id: 'uid-a', data: { userId: 'uid-a', projectId: 'P1', status: 'active', displayName: 'Alice', role: 'editor', email: 'a@x.com' } },
    { id: 'uid-b', data: { userId: 'uid-b', projectId: 'P1', status: 'active', displayName: 'Bob', role: 'viewer', email: 'b@x.com' } },
    { id: 'uid-bad', data: { userId: 'other', projectId: 'P1', status: 'active', displayName: 'Bad', role: 'viewer' } },
    { id: 'uid-pend', data: { userId: 'uid-pend', projectId: 'P1', status: 'pending', displayName: 'Pending', role: 'viewer' } },
    { id: 'uid-dup', data: { userId: 'uid-dup', projectId: 'P1', status: 'active', displayName: 'Alice', role: 'admin', email: 'dup@x.com' } },
  ],
});
window.firebase = { firestore: () => firestore };

vm.runInContext(referenceSource, context, { filename: 'stam.reference-picker.js' });
vm.runInContext(readServiceSource, context, { filename: 'stam.project-member-read-service.js' });
vm.runInContext(pickerSource, context, { filename: 'stam.project-member-picker.js' });

const contract = window.STAM.projectMemberReadServiceContract;
assert.equal(contract.ACTIONS.READ, 'projectMember.read');
assert.equal(JSON.stringify(contract.READ_ROLES), JSON.stringify(['owner', 'admin', 'editor', 'viewer']));

const adapter = contract.createFirestoreAdapter({ firestore });
assert.equal(typeof adapter.listActiveByProject, 'function');
assert.equal(typeof adapter.create, 'undefined');

const service = contract.createService({
  adapter,
  authorize: contract.createMemberRoleAuthorize(() => 'editor'),
});
const members = await service.listActiveByProject('P1', { memberRole: 'editor' });
assert.equal(members.length, 3);
const names = members.map((m) => m.memberName).sort();
assert.equal(names.join('|'), 'Alice|Alice|Bob');

await assert.rejects(() => window.STAM.projectMemberReadService.listActiveByProject('P1', {}), /permission denied/);

const authMatch = contract.resolveDefaultOwner(members, { uid: 'uid-a' });
assert.equal(authMatch.memberUid, 'uid-a');
assert.equal(contract.resolveDefaultOwner(members, { uid: 'missing' }), null);
assert.equal(contract.resolveDefaultOwner(members, { uid: 'uid-b' }).memberUid, 'uid-b');
assert.equal(contract.resolveDefaultOwner(members, { email: 'a@x.com' }), null);

const alice = members.find((m) => m.memberUid === 'uid-a');
const ownerSnap = contract.toOwnerSnapshot(alice);
assert.equal(ownerSnap.ownerId, 'uid-a');
assert.equal(ownerSnap.ownerName, 'Alice');
const reviewerEmpty = contract.toReviewerSnapshot(null);
assert.equal(reviewerEmpty.reviewerId, '');
assert.equal(reviewerEmpty.reviewerName, '');
const bob = members.find((m) => m.memberUid === 'uid-b');
const reviewerSnap = contract.toReviewerSnapshot(bob);
assert.equal(reviewerSnap.reviewerId, 'uid-b');
assert.equal(reviewerSnap.reviewerName, 'Bob');

assert.equal(firestore.paths.join('/'), 'projects/P1/members/status==active');

const picker = window.STAM.projectMemberPicker;
['create', 'mountOwner', 'mountReviewer', 'load', 'getValue', 'setValue', 'clear', 'setDisabled', 'refreshContext', 'applyDefaultOwner', 'destroy'].forEach((name) => {
  assert.equal(typeof picker[name], 'function', name);
});

const ownerCfg = picker.create({ mode: 'owner' });
const reviewerCfg = picker.create({ mode: 'reviewer' });
assert.equal(ownerCfg.mode, 'owner');
assert.equal(reviewerCfg.mode, 'reviewer');

console.log('project member picker contract: PASS');
