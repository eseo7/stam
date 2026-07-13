/* ============================================================================
 * STAM WBS Firestore Adapter
 * ----------------------------------------------------------------------------
 * Firestore implementation boundary for WBS Domain Service.
 * Screens must not call this adapter directly; use STAM.wbsService.
 * No UI wiring is performed in this file.
 * ========================================================================== */
(function () {
  'use strict';

  var COLLECTION = 'wbsItems';
  var COUNTER_DOC_ID = 'wbsItems';
  var CODE_PREFIX = 'WBS-';

  var REVIEWER_UNLINK_FIELDS = ['reviewerId', 'reviewerName'];
  var REQUIREMENT_UNLINK_FIELDS = ['requirementId', 'requirementCode', 'requirementTitle'];
  var FUNCTIONAL_SPEC_UNLINK_FIELDS = ['functionalSpecId', 'functionalSpecCode', 'functionalSpecTitle'];
  var UNLINK_FIELD_GROUPS = [
    REVIEWER_UNLINK_FIELDS,
    REQUIREMENT_UNLINK_FIELDS,
    FUNCTIONAL_SPEC_UNLINK_FIELDS,
  ];

  var OPTIONAL_CLEAR_FIELDS = [
    'businessArea',
    'screenPath',
    'description',
    'plannedEffort',
    'actualEffort',
  ];

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function requireProjectId(projectId) {
    var value = clean(projectId);
    if (!value) throw new Error('wbsFirestoreAdapter: projectId is required');
    return value;
  }

  function requireWbsItemId(wbsItemId) {
    var value = clean(wbsItemId);
    if (!value) throw new Error('wbsFirestoreAdapter: wbsItemId is required');
    return value;
  }

  function resolveFirestore(provided) {
    if (provided) return provided;
    if (window.firebase && typeof window.firebase.firestore === 'function') {
      return window.firebase.firestore();
    }
    throw new Error('wbsFirestoreAdapter: Firestore is not available');
  }

  function serverTimestamp() {
    if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
      return window.firebase.firestore.FieldValue.serverTimestamp();
    }
    throw new Error('wbsFirestoreAdapter: server timestamp is not available');
  }

  function fieldDelete() {
    if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
      return window.firebase.firestore.FieldValue.delete();
    }
    throw new Error('wbsFirestoreAdapter: field delete is not available');
  }

  function applyWbsUnlinkDeletes(patch) {
    var next = Object.assign({}, patch || {});
    UNLINK_FIELD_GROUPS.forEach(function (fields) {
      fields.forEach(function (field) {
        if (next[field] === '') {
          next[field] = fieldDelete();
        }
      });
    });
    return next;
  }

  function applyOptionalFieldDeletes(patch) {
    var next = Object.assign({}, patch || {});
    OPTIONAL_CLEAR_FIELDS.forEach(function (field) {
      if (next[field] === '' || (typeof next[field] === 'string' && next[field].trim() === '')) {
        next[field] = fieldDelete();
      }
    });
    return next;
  }

  function sanitizeUpdatePatch(patch) {
    var next = Object.assign({}, patch || {});
    [
      'id',
      'projectId',
      'code',
      'createdAt',
      'createdBy',
      'isDeleted',
      'deletedAt',
      'deletedBy',
    ].forEach(function (key) {
      delete next[key];
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

  function formatWbsCodeNumber(lastNumber) {
    var n = lastNumber;
    if (!Number.isInteger(n) || n < 1) {
      throw new Error('wbsFirestoreAdapter: invalid counter number');
    }
    var digits = String(n);
    if (digits.length < 3) {
      digits = digits.padStart(3, '0');
    }
    return CODE_PREFIX + digits;
  }

  function resolveNextCounterNumber(counterData) {
    var lastNumber = counterData && counterData.lastNumber;
    if (!Number.isInteger(lastNumber) || lastNumber < 1) {
      throw new Error('wbsFirestoreAdapter: invalid existing counter lastNumber');
    }
    return lastNumber + 1;
  }

  function createWithAllocatedCode(db, projectId, ref, input) {
    var cref = counterRef(db, projectId);

    return db.runTransaction(function (transaction) {
      return transaction.get(cref).then(function (snap) {
        var nextNumber;
        if (snap.exists) {
          nextNumber = resolveNextCounterNumber(snap.data() || {});
        } else {
          nextNumber = 1;
        }

        var code = formatWbsCodeNumber(nextNumber);
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

  function compareWbsItems(a, b) {
    var aCreated = clean(a.createdAt);
    var bCreated = clean(b.createdAt);
    if (aCreated !== bCreated) {
      return bCreated.localeCompare(aCreated);
    }
    var aCode = clean(a.code || a.id);
    var bCode = clean(b.code || b.id);
    if (aCode !== bCode) {
      return bCode.localeCompare(aCode);
    }
    var aId = clean(a.id);
    var bId = clean(b.id);
    return bId.localeCompare(aId);
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
          if (q.phase && item.phase !== q.phase) return;
          if (q.functionGroup && item.functionGroup !== q.functionGroup) return;
          if (q.ownerId && item.ownerId !== q.ownerId) return;
          out.push(item);
        });
        out.sort(compareWbsItems);
        return out;
      });
    }

    function getById(projectId, wbsItemId) {
      var pid = requireProjectId(projectId);
      var wid = requireWbsItemId(wbsItemId);
      return collectionRef(db(), pid).doc(wid).get().then(function (snap) {
        return fromDoc(pid, snap);
      });
    }

    function create(projectId, wbsItem) {
      var pid = requireProjectId(projectId);
      var input = Object.assign({}, wbsItem || {});

      if (Object.prototype.hasOwnProperty.call(wbsItem || {}, 'code')) {
        throw new Error('wbsFirestoreAdapter: explicit code is not allowed');
      }

      var ref = input.id ? collectionRef(db(), pid).doc(input.id) : collectionRef(db(), pid).doc();
      input.id = input.id || ref.id;
      input.projectId = input.projectId || pid;

      return createWithAllocatedCode(db(), pid, ref, input).then(function () {
        return getById(pid, input.id);
      });
    }

    function update(projectId, wbsItemId, patch) {
      var pid = requireProjectId(projectId);
      var wid = requireWbsItemId(wbsItemId);
      var nextPatch = applyWriteTimestamps(
        applyOptionalFieldDeletes(applyWbsUnlinkDeletes(sanitizeUpdatePatch(patch || {}))),
        'update'
      );
      return collectionRef(db(), pid).doc(wid).update(nextPatch).then(function () {
        return getById(pid, wid);
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
  window.STAM.wbsFirestoreAdapter = {
    COLLECTION: COLLECTION,
    COUNTER_DOC_ID: COUNTER_DOC_ID,
    CODE_PREFIX: CODE_PREFIX,
    formatWbsCodeNumber: formatWbsCodeNumber,
    create: createAdapter,
  };
}());
