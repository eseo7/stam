/* ============================================================================
 * STAM ScreenAction Firestore Adapter
 * ----------------------------------------------------------------------------
 * Firestore implementation boundary for ScreenAction Domain Service.
 * Screens must not call this adapter directly; use STAM.screenActionService.
 * No UI wiring is performed in this file.
 *
 * Duplicate-name checks use query preflight OUTSIDE transactions.
 * Firebase Web compat Transaction.get() accepts DocumentReference only — not Query.
 * ========================================================================== */
(function () {
  'use strict';

  var COLLECTION = 'screenActions';
  var SCREEN_SPECS_COLLECTION = 'screenSpecs';

  var PREFLIGHT_CODES = {
    PARENT_NOT_FOUND: 'SCREEN_ACTION_PARENT_NOT_FOUND',
    PARENT_PROJECT_MISMATCH: 'SCREEN_ACTION_PARENT_PROJECT_MISMATCH',
    TARGET_NOT_FOUND: 'SCREEN_ACTION_TARGET_NOT_FOUND',
    TARGET_PROJECT_MISMATCH: 'SCREEN_ACTION_TARGET_PROJECT_MISMATCH',
    DUPLICATE_NAME: 'SCREEN_ACTION_DUPLICATE_NAME',
    UPDATE_DOC_MISSING: 'SCREEN_ACTION_NOT_FOUND',
    UPDATE_IMMUTABLE_FIELD: 'SCREEN_ACTION_IMMUTABLE_FIELD',
  };

  var UPDATE_IMMUTABLE_FIELDS = [
    'id',
    'projectId',
    'screenSpecId',
    'createdAt',
    'createdBy',
    'schemaVersion',
  ];

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj || {}, key);
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function preflightError(code, message) {
    var err = new Error(message || ('screenActionFirestoreAdapter: ' + code));
    err.code = code;
    err.preflight = true;
    return err;
  }

  function requireProjectId(projectId) {
    var value = clean(projectId);
    if (!value) throw new Error('screenActionFirestoreAdapter: projectId is required');
    return value;
  }

  function requireActionId(actionId) {
    var value = clean(actionId);
    if (!value) throw new Error('screenActionFirestoreAdapter: actionId is required');
    return value;
  }

  function requireScreenSpecId(screenSpecId) {
    var value = clean(screenSpecId);
    if (!value) throw new Error('screenActionFirestoreAdapter: screenSpecId is required');
    return value;
  }

  function resolveFirestore(provided) {
    if (provided) return provided;
    if (window.firebase && typeof window.firebase.firestore === 'function') {
      return window.firebase.firestore();
    }
    throw new Error('screenActionFirestoreAdapter: Firestore is not available');
  }

  function serverTimestamp() {
    if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
      return window.firebase.firestore.FieldValue.serverTimestamp();
    }
    throw new Error('screenActionFirestoreAdapter: server timestamp is not available');
  }

  function collectionRef(db, projectId) {
    return db.collection('projects').doc(projectId).collection(COLLECTION);
  }

  function screenSpecRef(db, projectId, screenSpecId) {
    return db.collection('projects').doc(projectId).collection(SCREEN_SPECS_COLLECTION).doc(screenSpecId);
  }

  function normalizeName(name) {
    return clean(name).toLowerCase();
  }

  function validateParentSnapshot(snap, projectId) {
    if (!snap || !snap.exists) {
      throw preflightError(PREFLIGHT_CODES.PARENT_NOT_FOUND);
    }
    var parent = snap.data ? snap.data() : {};
    if (clean(parent.projectId) !== requireProjectId(projectId)) {
      throw preflightError(PREFLIGHT_CODES.PARENT_PROJECT_MISMATCH);
    }
    if (parent.isDeleted === true) {
      throw preflightError(PREFLIGHT_CODES.PARENT_NOT_FOUND);
    }
    return parent;
  }

  function validateTargetSnapshot(snap, projectId) {
    if (!snap || !snap.exists) {
      throw preflightError(PREFLIGHT_CODES.TARGET_NOT_FOUND);
    }
    var target = snap.data ? snap.data() : {};
    if (clean(target.projectId) !== requireProjectId(projectId)) {
      throw preflightError(PREFLIGHT_CODES.TARGET_PROJECT_MISMATCH);
    }
    if (target.isDeleted === true) {
      throw preflightError(PREFLIGHT_CODES.TARGET_NOT_FOUND);
    }
    return target;
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

  function compareScreenActions(a, b) {
    var aOrder = Number.isInteger(a.order) ? a.order : 0;
    var bOrder = Number.isInteger(b.order) ? b.order : 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    var aCreated = clean(a.createdAt);
    var bCreated = clean(b.createdAt);
    if (aCreated !== bCreated) {
      return aCreated.localeCompare(bCreated);
    }
    return clean(a.id).localeCompare(clean(b.id));
  }

  function findDuplicateInSnapshot(snapshot, normalizedName, excludeActionId) {
    var excludeId = clean(excludeActionId);
    var duplicate = null;
    snapshot.forEach(function (doc) {
      if (duplicate) return;
      if (excludeId && doc.id === excludeId) return;
      var data = doc.data() || {};
      if (normalizeName(data.name) === normalizedName) {
        duplicate = doc.id;
      }
    });
    return duplicate;
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

  function sanitizeUpdatePatch(patch) {
    var next = Object.assign({}, patch || {});
    UPDATE_IMMUTABLE_FIELDS.forEach(function (key) {
      delete next[key];
    });
    return next;
  }

  function validateUpdateImmutableFields(patch) {
    UPDATE_IMMUTABLE_FIELDS.forEach(function (field) {
      if (hasOwn(patch, field)) {
        throw preflightError(PREFLIGHT_CODES.UPDATE_IMMUTABLE_FIELD);
      }
    });
  }

  function needsTargetPreflight(patch, current) {
    return hasOwn(patch || {}, 'targetScreenSpecId') || hasOwn(patch || {}, 'actionType');
  }

  function effectiveTargetScreenSpecId(patch, current) {
    if (hasOwn(patch || {}, 'targetScreenSpecId')) {
      if (patch.targetScreenSpecId == null) return '';
      return clean(patch.targetScreenSpecId);
    }
    return clean((current || {}).targetScreenSpecId);
  }

  function assertDuplicateNameAbsent(db, projectId, screenSpecId, normalizedName, excludeActionId) {
    return findDuplicateNormalizedName(db, projectId, screenSpecId, normalizedName, excludeActionId).then(function (duplicateId) {
      if (duplicateId) {
        throw preflightError(PREFLIGHT_CODES.DUPLICATE_NAME);
      }
    });
  }

  function assertScreenSpecParentExists(db, projectId, screenSpecId) {
    return screenSpecRef(db, requireProjectId(projectId), requireScreenSpecId(screenSpecId)).get().then(function (snap) {
      return validateParentSnapshot(snap, projectId);
    });
  }

  function assertScreenSpecTargetExistsIfSet(db, projectId, targetScreenSpecId) {
    var tid = clean(targetScreenSpecId);
    if (!tid) return Promise.resolve();
    return screenSpecRef(db, requireProjectId(projectId), tid).get().then(function (snap) {
      return validateTargetSnapshot(snap, projectId);
    });
  }

  function findDuplicateNormalizedName(db, projectId, screenSpecId, normalizedName, excludeActionId) {
    var query = collectionRef(db, requireProjectId(projectId)).where('screenSpecId', '==', requireScreenSpecId(screenSpecId));
    return query.get().then(function (snapshot) {
      return findDuplicateInSnapshot(snapshot, clean(normalizedName).toLowerCase(), excludeActionId);
    });
  }

  function runCreateTransaction(db, projectId, payload) {
    var pid = requireProjectId(projectId);
    var input = Object.assign({}, payload || {});
    var screenSpecId = requireScreenSpecId(input.screenSpecId);
    var targetScreenSpecId = clean(input.targetScreenSpecId);
    var ref = input.id ? collectionRef(db, pid).doc(input.id) : collectionRef(db, pid).doc();
    input.id = input.id || ref.id;
    input.projectId = input.projectId || pid;
    var parentRef = screenSpecRef(db, pid, screenSpecId);
    var targetRef = targetScreenSpecId ? screenSpecRef(db, pid, targetScreenSpecId) : null;

    return db.runTransaction(function (transaction) {
      return transaction.get(parentRef).then(function (parentSnap) {
        validateParentSnapshot(parentSnap, pid);
        if (!targetRef) {
          var writePayload = applyWriteTimestamps(input, 'create');
          transaction.set(ref, writePayload);
          return input.id;
        }
        return transaction.get(targetRef).then(function (targetSnap) {
          validateTargetSnapshot(targetSnap, pid);
          var writePayloadWithTarget = applyWriteTimestamps(input, 'create');
          transaction.set(ref, writePayloadWithTarget);
          return input.id;
        });
      });
    });
  }

  function runUpdateTransaction(db, projectId, actionId, patch, current) {
    var pid = requireProjectId(projectId);
    var aid = requireActionId(actionId);
    var rawPatch = Object.assign({}, patch || {});
    var base = current || {};

    try {
      validateUpdateImmutableFields(rawPatch);
    } catch (err) {
      return Promise.reject(err);
    }

    var ref = collectionRef(db, pid).doc(aid);
    var needTarget = needsTargetPreflight(rawPatch, base);
    var effectiveTarget = effectiveTargetScreenSpecId(rawPatch, base);
    var targetRef = needTarget && effectiveTarget ? screenSpecRef(db, pid, effectiveTarget) : null;

    return db.runTransaction(function (transaction) {
      return transaction.get(ref).then(function (snap) {
        if (!snap || !snap.exists) {
          throw preflightError(PREFLIGHT_CODES.UPDATE_DOC_MISSING);
        }
        if (!targetRef) {
          var writePatch = applyWriteTimestamps(sanitizeUpdatePatch(rawPatch), 'update');
          transaction.update(ref, writePatch);
          return;
        }
        return transaction.get(targetRef).then(function (targetSnap) {
          validateTargetSnapshot(targetSnap, pid);
          var writePatchWithTarget = applyWriteTimestamps(sanitizeUpdatePatch(rawPatch), 'update');
          transaction.update(ref, writePatchWithTarget);
        });
      });
    });
  }

  function runCreatePreflight(db, projectId, payload, excludeActionId) {
    var pid = requireProjectId(projectId);
    var input = payload || {};
    var screenSpecId = requireScreenSpecId(input.screenSpecId);
    var normalizedName = normalizeName(input.name);
    return assertScreenSpecParentExists(db, pid, screenSpecId).then(function () {
      return assertDuplicateNameAbsent(db, pid, screenSpecId, normalizedName, excludeActionId);
    }).then(function () {
      return assertScreenSpecTargetExistsIfSet(db, pid, input.targetScreenSpecId);
    });
  }

  function runUpdatePreflight(db, projectId, actionId, patch, current) {
    var pid = requireProjectId(projectId);
    var aid = requireActionId(actionId);
    var rawPatch = patch || {};
    var base = current || null;
    if (!base) {
      return Promise.reject(preflightError(PREFLIGHT_CODES.UPDATE_DOC_MISSING));
    }

    var chain = Promise.resolve();

    if (hasOwn(rawPatch, 'name')) {
      var normalizedName = normalizeName(rawPatch.name);
      if (normalizeName(rawPatch.name) !== normalizeName(base.name)) {
        chain = chain.then(function () {
          return assertDuplicateNameAbsent(db, pid, base.screenSpecId, normalizedName, aid);
        });
      }
    }

    if (needsTargetPreflight(rawPatch, base)) {
      chain = chain.then(function () {
        return assertScreenSpecTargetExistsIfSet(db, pid, effectiveTargetScreenSpecId(rawPatch, base));
      });
    }

    return chain;
  }

  function createAdapter(options) {
    var opts = options || {};

    function db() {
      return resolveFirestore(opts.firestore);
    }

    function listByScreenSpec(projectId, screenSpecId, query) {
      var pid = requireProjectId(projectId);
      var sid = requireScreenSpecId(screenSpecId);
      var q = query || {};
      return collectionRef(db(), pid).where('screenSpecId', '==', sid).get().then(function (snapshot) {
        var out = [];
        snapshot.forEach(function (doc) {
          var item = fromDoc(pid, doc);
          if (!item) return;
          if (q.actionType && item.actionType !== q.actionType) return;
          out.push(item);
        });
        out.sort(compareScreenActions);
        return out;
      });
    }

    function listByProject(projectId, query) {
      var pid = requireProjectId(projectId);
      var q = query || {};
      if (q.screenSpecId) {
        return listByScreenSpec(pid, q.screenSpecId, q);
      }
      return collectionRef(db(), pid).get().then(function (snapshot) {
        var out = [];
        snapshot.forEach(function (doc) {
          var item = fromDoc(pid, doc);
          if (!item) return;
          if (q.actionType && item.actionType !== q.actionType) return;
          out.push(item);
        });
        out.sort(compareScreenActions);
        return out;
      });
    }

    function getById(projectId, actionId) {
      var pid = requireProjectId(projectId);
      var aid = requireActionId(actionId);
      return collectionRef(db(), pid).doc(aid).get().then(function (snap) {
        return fromDoc(pid, snap);
      });
    }

    function create(projectId, action) {
      var pid = requireProjectId(projectId);
      var input = Object.assign({}, action || {});
      if (hasOwn(action || {}, 'id') && !clean(action.id)) {
        delete input.id;
      }
      return runCreatePreflight(db(), pid, input).then(function () {
        return runCreateTransaction(db(), pid, input);
      }).then(function (createdActionId) {
        return getById(pid, createdActionId);
      });
    }

    function update(projectId, actionId, patch) {
      var pid = requireProjectId(projectId);
      var aid = requireActionId(actionId);
      var rawPatch = Object.assign({}, patch || {});
      return getById(pid, aid).then(function (current) {
        if (!current) {
          throw preflightError(PREFLIGHT_CODES.UPDATE_DOC_MISSING);
        }
        return runUpdatePreflight(db(), pid, aid, rawPatch, current).then(function () {
          return runUpdateTransaction(db(), pid, aid, rawPatch, current);
        });
      }).then(function () {
        return getById(pid, aid);
      });
    }

    function deleteAction(projectId, actionId) {
      var pid = requireProjectId(projectId);
      var aid = requireActionId(actionId);
      return getById(pid, aid).then(function (current) {
        if (!current) {
          throw preflightError(PREFLIGHT_CODES.UPDATE_DOC_MISSING);
        }
        return collectionRef(db(), pid).doc(aid).delete();
      });
    }

    return {
      listByScreenSpec: listByScreenSpec,
      listByProject: listByProject,
      getById: getById,
      create: create,
      update: update,
      delete: deleteAction,
      findDuplicateNormalizedName: function (projectId, screenSpecId, normalizedName, excludeActionId) {
        return findDuplicateNormalizedName(db(), projectId, screenSpecId, normalizedName, excludeActionId);
      },
    };
  }

  window.STAM = window.STAM || {};
  window.STAM.screenActionFirestoreAdapter = {
    COLLECTION: COLLECTION,
    SCREEN_SPECS_COLLECTION: SCREEN_SPECS_COLLECTION,
    PREFLIGHT_CODES: PREFLIGHT_CODES,
    normalizeName: normalizeName,
    compareScreenActions: compareScreenActions,
    runCreatePreflight: runCreatePreflight,
    runCreateTransaction: runCreateTransaction,
    runUpdatePreflight: runUpdatePreflight,
    runUpdateTransaction: runUpdateTransaction,
    assertScreenSpecParentExists: assertScreenSpecParentExists,
    assertScreenSpecTargetExistsIfSet: assertScreenSpecTargetExistsIfSet,
    findDuplicateNormalizedName: findDuplicateNormalizedName,
    validateParentSnapshot: validateParentSnapshot,
    validateTargetSnapshot: validateTargetSnapshot,
    needsTargetPreflight: needsTargetPreflight,
    effectiveTargetScreenSpecId: effectiveTargetScreenSpecId,
    create: createAdapter,
  };
}());
