/* ============================================================================
 * STAM ScreenSpec Firestore Adapter
 * ----------------------------------------------------------------------------
 * Firestore implementation boundary for ScreenSpec Domain Service.
 * Screens must not call this adapter directly; use STAM.screenSpecService.
 * No UI wiring is performed in this file.
 * ========================================================================== */
(function () {
  'use strict';

  var COLLECTION = 'screenSpecs';
  var COUNTER_DOC_ID = 'screenSpecs';
  var CODE_PREFIX = 'SCR-';

  var REQUIREMENT_UNLINK_FIELDS = ['requirementId', 'requirementCode', 'requirementTitle'];
  var FUNCTIONAL_SPEC_UNLINK_FIELDS = ['functionalSpecId', 'functionalSpecCode', 'functionalSpecTitle'];
  var WBS_ITEM_UNLINK_FIELDS = ['wbsItemId', 'wbsItemCode', 'wbsItemTitle'];
  var MENU_SCREEN_UNLINK_FIELDS = ['menuScreenId', 'menuScreenCode', 'menuScreenTitle'];
  var UNLINK_FIELD_GROUPS = [
    REQUIREMENT_UNLINK_FIELDS,
    FUNCTIONAL_SPEC_UNLINK_FIELDS,
    WBS_ITEM_UNLINK_FIELDS,
    MENU_SCREEN_UNLINK_FIELDS,
  ];

  var OPTIONAL_CLEAR_FIELDS = [
    'templateId',
    'routePath',
    'menuPath',
    'description',
    'imageCount',
    'annotationCount',
  ];

  var PREFLIGHT_CODES = {
    UPDATE_DOC_MISSING: 'SCREEN_SPEC_UPDATE_DOC_MISSING',
    UPDATE_CURRENT_VERSION_INVALID: 'SCREEN_SPEC_UPDATE_CURRENT_VERSION_INVALID',
    UPDATE_VERSION_MISMATCH: 'SCREEN_SPEC_UPDATE_VERSION_MISMATCH',
    UPDATE_IMMUTABLE_FIELD: 'SCREEN_SPEC_UPDATE_IMMUTABLE_FIELD',
  };

  var UPDATE_IMMUTABLE_FIELDS = [
    'id',
    'projectId',
    'code',
    'createdAt',
    'createdBy',
    'isDeleted',
    'deletedAt',
    'deletedBy',
  ];

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj || {}, key);
  }

  function preflightError(code) {
    var err = new Error('screenSpecFirestoreAdapter: ' + code);
    err.code = code;
    err.preflight = true;
    if (code === PREFLIGHT_CODES.UPDATE_VERSION_MISMATCH) {
      err.conflict = true;
    }
    return err;
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function requireProjectId(projectId) {
    var value = clean(projectId);
    if (!value) throw new Error('screenSpecFirestoreAdapter: projectId is required');
    return value;
  }

  function requireScreenSpecId(screenSpecId) {
    var value = clean(screenSpecId);
    if (!value) throw new Error('screenSpecFirestoreAdapter: screenSpecId is required');
    return value;
  }

  function resolveFirestore(provided) {
    if (provided) return provided;
    if (window.firebase && typeof window.firebase.firestore === 'function') {
      return window.firebase.firestore();
    }
    throw new Error('screenSpecFirestoreAdapter: Firestore is not available');
  }

  function serverTimestamp() {
    if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
      return window.firebase.firestore.FieldValue.serverTimestamp();
    }
    throw new Error('screenSpecFirestoreAdapter: server timestamp is not available');
  }

  function fieldDelete() {
    if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
      return window.firebase.firestore.FieldValue.delete();
    }
    throw new Error('screenSpecFirestoreAdapter: field delete is not available');
  }

  function applyScreenSpecUnlinkDeletes(patch) {
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

  function formatScreenSpecCodeNumber(lastNumber) {
    var n = lastNumber;
    if (!Number.isInteger(n) || n < 1) {
      throw new Error('screenSpecFirestoreAdapter: invalid counter number');
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
      throw new Error('screenSpecFirestoreAdapter: invalid existing counter lastNumber');
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

        var code = formatScreenSpecCodeNumber(nextNumber);
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

  function compareScreenSpecs(a, b) {
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

  function validateUpdateImmutableFields(patch) {
    UPDATE_IMMUTABLE_FIELDS.forEach(function (field) {
      if (hasOwn(patch, field)) {
        throw preflightError(PREFLIGHT_CODES.UPDATE_IMMUTABLE_FIELD);
      }
    });
  }

  function validateUpdateVersion(current, patch) {
    var currentVersion = current.version;
    if (!Number.isInteger(currentVersion) || currentVersion < 1) {
      throw preflightError(PREFLIGHT_CODES.UPDATE_CURRENT_VERSION_INVALID);
    }
    var patchVersion = patch.version;
    if (!Number.isInteger(patchVersion) || patchVersion !== currentVersion + 1) {
      throw preflightError(PREFLIGHT_CODES.UPDATE_VERSION_MISMATCH);
    }
  }

  function runUpdatePreflight(db, projectId, screenSpecId, patch) {
    try {
      validateUpdateImmutableFields(patch || {});
    } catch (err) {
      return Promise.reject(err);
    }

    var specRef = collectionRef(db, projectId).doc(screenSpecId);
    return specRef.get().then(function (snap) {
      if (!snap || !snap.exists) {
        throw preflightError(PREFLIGHT_CODES.UPDATE_DOC_MISSING);
      }
      var current = snap.data ? snap.data() : {};
      validateUpdateVersion(current, patch || {});
    });
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
          if (q.screenType && item.screenType !== q.screenType) return;
          if (q.writeStatus && item.writeStatus !== q.writeStatus) return;
          if (q.reviewStatus && item.reviewStatus !== q.reviewStatus) return;
          if (q.approvalStatus && item.approvalStatus !== q.approvalStatus) return;
          if (q.ownerId && item.ownerId !== q.ownerId) return;
          out.push(item);
        });
        out.sort(compareScreenSpecs);
        return out;
      });
    }

    function getById(projectId, screenSpecId) {
      var pid = requireProjectId(projectId);
      var sid = requireScreenSpecId(screenSpecId);
      return collectionRef(db(), pid).doc(sid).get().then(function (snap) {
        return fromDoc(pid, snap);
      });
    }

    function create(projectId, screenSpec) {
      var pid = requireProjectId(projectId);
      var input = Object.assign({}, screenSpec || {});

      if (Object.prototype.hasOwnProperty.call(screenSpec || {}, 'code')) {
        throw new Error('screenSpecFirestoreAdapter: explicit code is not allowed');
      }

      var ref = input.id ? collectionRef(db(), pid).doc(input.id) : collectionRef(db(), pid).doc();
      input.id = input.id || ref.id;
      input.projectId = input.projectId || pid;

      return createWithAllocatedCode(db(), pid, ref, input).then(function () {
        return getById(pid, input.id);
      });
    }

    function update(projectId, screenSpecId, patch) {
      var pid = requireProjectId(projectId);
      var sid = requireScreenSpecId(screenSpecId);
      var rawPatch = Object.assign({}, patch || {});

      return runUpdatePreflight(db(), pid, sid, rawPatch).catch(function (err) {
        if (!err.preflight) {
          err.screenSpecUpdateStage = 'preflight-read';
        }
        throw err;
      }).then(function () {
        var nextPatch = applyWriteTimestamps(
          applyOptionalFieldDeletes(applyScreenSpecUnlinkDeletes(sanitizeUpdatePatch(rawPatch))),
          'update'
        );
        return collectionRef(db(), pid).doc(sid).update(nextPatch).catch(function (err) {
          err.updatePreflightPassed = true;
          err.screenSpecUpdateStage = 'document-write';
          throw err;
        });
      }).then(function () {
        return getById(pid, sid).catch(function (err) {
          err.updatePreflightPassed = true;
          err.updateCommitted = true;
          err.screenSpecUpdateStage = 'post-update-read';
          throw err;
        });
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
  window.STAM.screenSpecFirestoreAdapter = {
    COLLECTION: COLLECTION,
    COUNTER_DOC_ID: COUNTER_DOC_ID,
    CODE_PREFIX: CODE_PREFIX,
    PREFLIGHT_CODES: PREFLIGHT_CODES,
    runUpdatePreflight: runUpdatePreflight,
    formatScreenSpecCodeNumber: formatScreenSpecCodeNumber,
    create: createAdapter,
  };
}());
