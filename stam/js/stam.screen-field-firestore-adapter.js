/* ============================================================================
 * STAM ScreenField Firestore Adapter
 * ----------------------------------------------------------------------------
 * Firestore implementation boundary for ScreenField Domain Service.
 * Screens must not call this adapter directly; use STAM.screenFieldService.
 * No UI wiring is performed in this file.
 * ========================================================================== */
(function () {
  'use strict';

  var COLLECTION = 'screenFields';
  var SCREEN_SPECS_COLLECTION = 'screenSpecs';

  var PREFLIGHT_CODES = {
    PARENT_NOT_FOUND: 'SCREEN_FIELD_PARENT_NOT_FOUND',
    PARENT_PROJECT_MISMATCH: 'SCREEN_FIELD_PARENT_PROJECT_MISMATCH',
    DUPLICATE_NAME: 'SCREEN_FIELD_DUPLICATE_NAME',
    UPDATE_DOC_MISSING: 'SCREEN_FIELD_NOT_FOUND',
    UPDATE_IMMUTABLE_FIELD: 'SCREEN_FIELD_IMMUTABLE_FIELD',
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
    var err = new Error(message || ('screenFieldFirestoreAdapter: ' + code));
    err.code = code;
    err.preflight = true;
    return err;
  }

  function requireProjectId(projectId) {
    var value = clean(projectId);
    if (!value) throw new Error('screenFieldFirestoreAdapter: projectId is required');
    return value;
  }

  function requireFieldId(fieldId) {
    var value = clean(fieldId);
    if (!value) throw new Error('screenFieldFirestoreAdapter: fieldId is required');
    return value;
  }

  function requireScreenSpecId(screenSpecId) {
    var value = clean(screenSpecId);
    if (!value) throw new Error('screenFieldFirestoreAdapter: screenSpecId is required');
    return value;
  }

  function resolveFirestore(provided) {
    if (provided) return provided;
    if (window.firebase && typeof window.firebase.firestore === 'function') {
      return window.firebase.firestore();
    }
    throw new Error('screenFieldFirestoreAdapter: Firestore is not available');
  }

  function serverTimestamp() {
    if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
      return window.firebase.firestore.FieldValue.serverTimestamp();
    }
    throw new Error('screenFieldFirestoreAdapter: server timestamp is not available');
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

  function compareScreenFields(a, b) {
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

  function assertParentScreenSpec(transaction, db, projectId, screenSpecId) {
    var ref = screenSpecRef(db, projectId, screenSpecId);
    return transaction.get(ref).then(function (snap) {
      if (!snap || !snap.exists) {
        throw preflightError(PREFLIGHT_CODES.PARENT_NOT_FOUND);
      }
      var parent = snap.data() || {};
      if (clean(parent.projectId) && clean(parent.projectId) !== projectId) {
        throw preflightError(PREFLIGHT_CODES.PARENT_PROJECT_MISMATCH);
      }
      if (parent.isDeleted === true) {
        throw preflightError(PREFLIGHT_CODES.PARENT_NOT_FOUND);
      }
      return parent;
    });
  }

  function findDuplicateInSnapshot(snapshot, normalizedName, excludeFieldId) {
    var excludeId = clean(excludeFieldId);
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

  function runDuplicateNameQuery(transaction, db, projectId, screenSpecId, normalizedName, excludeFieldId) {
    var query = collectionRef(db, projectId).where('screenSpecId', '==', screenSpecId);
    return transaction.get(query).then(function (snapshot) {
      if (findDuplicateInSnapshot(snapshot, normalizedName, excludeFieldId)) {
        throw preflightError(PREFLIGHT_CODES.DUPLICATE_NAME);
      }
    });
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

  function runCreateTransaction(db, projectId, payload) {
    var pid = requireProjectId(projectId);
    var input = Object.assign({}, payload || {});
    var screenSpecId = requireScreenSpecId(input.screenSpecId);
    var normalizedName = normalizeName(input.name);
    var ref = input.id ? collectionRef(db, pid).doc(input.id) : collectionRef(db, pid).doc();
    input.id = input.id || ref.id;
    input.projectId = input.projectId || pid;

    return db.runTransaction(function (transaction) {
      return assertParentScreenSpec(transaction, db, pid, screenSpecId).then(function () {
        return runDuplicateNameQuery(transaction, db, pid, screenSpecId, normalizedName);
      }).then(function () {
        var writePayload = applyWriteTimestamps(input, 'create');
        transaction.set(ref, writePayload);
        return input.id;
      });
    });
  }

  function runUpdateTransaction(db, projectId, fieldId, patch, currentName) {
    var pid = requireProjectId(projectId);
    var fid = requireFieldId(fieldId);
    var rawPatch = Object.assign({}, patch || {});

    try {
      validateUpdateImmutableFields(rawPatch);
    } catch (err) {
      return Promise.reject(err);
    }

    var ref = collectionRef(db, pid).doc(fid);
    return db.runTransaction(function (transaction) {
      return transaction.get(ref).then(function (snap) {
        if (!snap || !snap.exists) {
          throw preflightError(PREFLIGHT_CODES.UPDATE_DOC_MISSING);
        }
        var current = snap.data() || {};
        var screenSpecId = clean(current.screenSpecId);
        var nextName = hasOwn(rawPatch, 'name') ? rawPatch.name : current.name;
        var normalizedName = normalizeName(nextName);
        var currentNormalized = normalizeName(currentName != null ? currentName : current.name);
        if (normalizedName !== currentNormalized) {
          return runDuplicateNameQuery(transaction, db, pid, screenSpecId, normalizedName, fid);
        }
      }).then(function () {
        var writePatch = applyWriteTimestamps(sanitizeUpdatePatch(rawPatch), 'update');
        transaction.update(ref, writePatch);
      });
    });
  }

  function assertScreenSpecParentExists(db, projectId, screenSpecId) {
    return screenSpecRef(db, requireProjectId(projectId), requireScreenSpecId(screenSpecId)).get().then(function (snap) {
      if (!snap || !snap.exists) {
        throw preflightError(PREFLIGHT_CODES.PARENT_NOT_FOUND);
      }
      var parent = snap.data() || {};
      if (clean(parent.projectId) && clean(parent.projectId) !== requireProjectId(projectId)) {
        throw preflightError(PREFLIGHT_CODES.PARENT_PROJECT_MISMATCH);
      }
      if (parent.isDeleted === true) {
        throw preflightError(PREFLIGHT_CODES.PARENT_NOT_FOUND);
      }
      return parent;
    });
  }

  function findDuplicateNormalizedName(db, projectId, screenSpecId, normalizedName, excludeFieldId) {
    var query = collectionRef(db, requireProjectId(projectId)).where('screenSpecId', '==', requireScreenSpecId(screenSpecId));
    return query.get().then(function (snapshot) {
      return findDuplicateInSnapshot(snapshot, clean(normalizedName).toLowerCase(), excludeFieldId);
    });
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
          if (q.type && item.type !== q.type) return;
          out.push(item);
        });
        out.sort(compareScreenFields);
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
          if (q.type && item.type !== q.type) return;
          out.push(item);
        });
        out.sort(compareScreenFields);
        return out;
      });
    }

    function getById(projectId, fieldId) {
      var pid = requireProjectId(projectId);
      var fid = requireFieldId(fieldId);
      return collectionRef(db(), pid).doc(fid).get().then(function (snap) {
        return fromDoc(pid, snap);
      });
    }

    function create(projectId, field) {
      var pid = requireProjectId(projectId);
      var input = Object.assign({}, field || {});
      if (hasOwn(field || {}, 'id') && !clean(field.id)) {
        delete input.id;
      }
      return runCreateTransaction(db(), pid, input).then(function (fieldId) {
        return getById(pid, fieldId);
      });
    }

    function update(projectId, fieldId, patch) {
      var pid = requireProjectId(projectId);
      var fid = requireFieldId(fieldId);
      var rawPatch = Object.assign({}, patch || {});
      return getById(pid, fid).then(function (current) {
        if (!current) {
          throw preflightError(PREFLIGHT_CODES.UPDATE_DOC_MISSING);
        }
        return runUpdateTransaction(db(), pid, fid, rawPatch, current.name);
      }).then(function () {
        return getById(pid, fid);
      });
    }

    function deleteField(projectId, fieldId) {
      var pid = requireProjectId(projectId);
      var fid = requireFieldId(fieldId);
      return getById(pid, fid).then(function (current) {
        if (!current) {
          throw preflightError(PREFLIGHT_CODES.UPDATE_DOC_MISSING);
        }
        return collectionRef(db(), pid).doc(fid).delete();
      });
    }

    return {
      listByScreenSpec: listByScreenSpec,
      listByProject: listByProject,
      getById: getById,
      create: create,
      update: update,
      delete: deleteField,
      findDuplicateNormalizedName: function (projectId, screenSpecId, normalizedName, excludeFieldId) {
        return findDuplicateNormalizedName(db(), projectId, screenSpecId, normalizedName, excludeFieldId);
      },
    };
  }

  window.STAM = window.STAM || {};
  window.STAM.screenFieldFirestoreAdapter = {
    COLLECTION: COLLECTION,
    SCREEN_SPECS_COLLECTION: SCREEN_SPECS_COLLECTION,
    PREFLIGHT_CODES: PREFLIGHT_CODES,
    normalizeName: normalizeName,
    compareScreenFields: compareScreenFields,
    runCreateTransaction: runCreateTransaction,
    runUpdateTransaction: runUpdateTransaction,
    assertScreenSpecParentExists: assertScreenSpecParentExists,
    findDuplicateNormalizedName: findDuplicateNormalizedName,
    create: createAdapter,
  };
}());
