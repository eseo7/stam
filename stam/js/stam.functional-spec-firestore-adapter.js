/* ============================================================================
 * STAM Functional Specification Firestore Adapter
 * ----------------------------------------------------------------------------
 * Firestore implementation boundary for Functional Specification Domain Service.
 * Screens must not call this adapter directly; use STAM.functionalSpecService.
 * No UI wiring is performed in this file.
 * ========================================================================== */
(function () {
  'use strict';

  var COLLECTION = 'functionalSpecifications';
  var COUNTER_DOC_ID = 'functionalSpecifications';
  var CODE_PREFIX = 'FN_';

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function requireProjectId(projectId) {
    var value = clean(projectId);
    if (!value) throw new Error('functionalSpecFirestoreAdapter: projectId is required');
    return value;
  }

  function requireFunctionalSpecId(functionalSpecId) {
    var value = clean(functionalSpecId);
    if (!value) throw new Error('functionalSpecFirestoreAdapter: functionalSpecId is required');
    return value;
  }

  function resolveFirestore(provided) {
    if (provided) return provided;
    if (window.firebase && typeof window.firebase.firestore === 'function') {
      return window.firebase.firestore();
    }
    throw new Error('functionalSpecFirestoreAdapter: Firestore is not available');
  }

  var REQUIREMENT_UNLINK_FIELDS = ['requirementId', 'requirementCode', 'requirementTitle'];

  function serverTimestamp() {
    if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
      return window.firebase.firestore.FieldValue.serverTimestamp();
    }
    throw new Error('functionalSpecFirestoreAdapter: server timestamp is not available');
  }

  function fieldDelete() {
    if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
      return window.firebase.firestore.FieldValue.delete();
    }
    throw new Error('functionalSpecFirestoreAdapter: field delete is not available');
  }

  function applyRequirementUnlinkDeletes(patch) {
    var next = Object.assign({}, patch || {});
    REQUIREMENT_UNLINK_FIELDS.forEach(function (field) {
      if (next[field] === '') {
        next[field] = fieldDelete();
      }
    });
    return next;
  }

  function applyWriteTimestamps(payload, mode) {
    var next = Object.assign({}, payload || {});
    if (mode === 'create') {
      next.createdAt = serverTimestamp();
      next.updatedAt = serverTimestamp();
    } else if (mode === 'update') {
      next.updatedAt = serverTimestamp();
      delete next.createdAt;
    }
    return next;
  }

  function collectionRef(db, projectId) {
    return db.collection('projects').doc(projectId).collection(COLLECTION);
  }

  function counterRef(db, projectId) {
    return db.collection('projects').doc(projectId).collection('counters').doc(COUNTER_DOC_ID);
  }

  function formatFunctionalSpecCodeNumber(lastNumber) {
    var n = Number(lastNumber);
    if (!Number.isFinite(n) || n < 1) return CODE_PREFIX + '001';
    return CODE_PREFIX + String(Math.floor(n)).padStart(3, '0');
  }

  function createWithAllocatedCode(db, projectId, ref, input) {
    var cref = counterRef(db, projectId);

    return db.runTransaction(function (transaction) {
      return transaction.get(cref).then(function (snap) {
        var lastNumber = 0;

        if (snap.exists) {
          var counterData = snap.data() || {};
          lastNumber = Number.isInteger(counterData.lastNumber)
            ? counterData.lastNumber
            : 0;
        }

        var nextNumber = lastNumber + 1;
        var code = formatFunctionalSpecCodeNumber(nextNumber);
        var payload = applyWriteTimestamps(
          Object.assign({}, input, { code: code }),
          'create'
        );

        transaction.set(cref, { lastNumber: nextNumber }, { merge: true });
        transaction.set(ref, payload);

        return code;
      });
    });
  }

  function toPlainTimestamp(value) {
    if (!value) return value;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    return value;
  }

  function normalizeValue(value) {
    if (Array.isArray(value)) {
      return value.map(normalizeValue);
    }
    if (value && typeof value === 'object') {
      if (typeof value.toDate === 'function' || value instanceof Date) {
        return toPlainTimestamp(value);
      }
      var out = {};
      Object.keys(value).forEach(function (key) {
        out[key] = normalizeValue(value[key]);
      });
      return out;
    }
    return value;
  }

  function fromDoc(projectId, snap) {
    if (!snap || !snap.exists) return null;
    var data = normalizeValue(snap.data ? snap.data() : {});
    data.id = data.id || snap.id;
    data.projectId = data.projectId || projectId;
    return data;
  }

  function compareFunctionalSpec(a, b) {
    var api = typeof window !== 'undefined' && window.STAMBoardList;
    if (api && typeof api.compareBoardRegistration === 'function') {
      return api.compareBoardRegistration(a, b);
    }
    var ac = clean(a.code || a.id);
    var bc = clean(b.code || b.id);
    return bc.localeCompare(ac);
  }

  function createAdapter(options) {
    var opts = options || {};

    function db() {
      return resolveFirestore(opts.firestore);
    }

    function listByProject(projectId, query) {
      var pid = requireProjectId(projectId);
      var q = query || {};
      return collectionRef(db(), pid).get().then(function (snapshot) {
        var out = [];
        snapshot.forEach(function (doc) {
          var item = fromDoc(pid, doc);
          if (!item) return;
          if (!q.includeDeleted && item.isDeleted === true) return;
          if (q.status && item.status !== q.status) return;
          out.push(item);
        });
        out.sort(compareFunctionalSpec);
        return out;
      });
    }

    function getById(projectId, functionalSpecId) {
      var pid = requireProjectId(projectId);
      var fid = requireFunctionalSpecId(functionalSpecId);
      return collectionRef(db(), pid).doc(fid).get().then(function (snap) {
        return fromDoc(pid, snap);
      });
    }

    function create(projectId, functionalSpec) {
      var pid = requireProjectId(projectId);
      var input = Object.assign({}, functionalSpec || {});
      var ref = input.id ? collectionRef(db(), pid).doc(input.id) : collectionRef(db(), pid).doc();
      input.id = input.id || ref.id;
      input.projectId = input.projectId || pid;

      if (clean(input.code)) {
        input.code = clean(input.code);
        var explicitPayload = applyWriteTimestamps(input, 'create');
        return ref.set(explicitPayload).then(function () {
          return getById(pid, input.id);
        });
      }

      return createWithAllocatedCode(db(), pid, ref, input).then(function () {
        return getById(pid, input.id);
      });
    }

    function update(projectId, functionalSpecId, patch) {
      var pid = requireProjectId(projectId);
      var fid = requireFunctionalSpecId(functionalSpecId);
      var nextPatch = applyWriteTimestamps(
        applyRequirementUnlinkDeletes(Object.assign({}, patch || {})),
        'update'
      );
      return collectionRef(db(), pid).doc(fid).update(nextPatch).then(function () {
        return getById(pid, fid);
      });
    }

    return {
      listByProject: listByProject,
      getById: getById,
      create: create,
      update: update,
    };
  }

  window.STAM = window.STAM || {};
  window.STAM.functionalSpecFirestoreAdapter = {
    COLLECTION: COLLECTION,
    COUNTER_DOC_ID: COUNTER_DOC_ID,
    CODE_PREFIX: CODE_PREFIX,
    formatFunctionalSpecCodeNumber: formatFunctionalSpecCodeNumber,
    create: createAdapter,
  };
}());
