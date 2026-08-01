/* ============================================================================
 * STAM ScreenSection Firestore Adapter
 * ----------------------------------------------------------------------------
 * Firestore implementation boundary for ScreenSection Domain Service.
 * Screens must not call this adapter directly; use STAM.screenSectionService.
 * No UI wiring is performed in this file.
 *
 * Duplicate-name checks use query preflight OUTSIDE transactions.
 * Firebase Web compat Transaction.get() accepts DocumentReference only — not Query.
 * ========================================================================== */
(function () {
  'use strict';

  var COLLECTION = 'screenSections';
  var SCREEN_SPECS_COLLECTION = 'screenSpecs';
  var SCREEN_FIELDS_COLLECTION = 'screenFields';
  var SCREEN_ACTIONS_COLLECTION = 'screenActions';

  var PREFLIGHT_CODES = {
    PARENT_NOT_FOUND: 'SCREEN_SECTION_PARENT_NOT_FOUND',
    PARENT_PROJECT_MISMATCH: 'SCREEN_SECTION_PARENT_PROJECT_MISMATCH',
    DUPLICATE_NAME: 'SCREEN_SECTION_DUPLICATE_NAME',
    UPDATE_DOC_MISSING: 'SCREEN_SECTION_NOT_FOUND',
    UPDATE_IMMUTABLE_FIELD: 'SCREEN_SECTION_IMMUTABLE_FIELD',
    CHILD_SECTIONS_EXIST: 'SCREEN_SECTION_CHILD_SECTIONS_EXIST',
    FIELDS_REFERENCE_SECTION: 'SCREEN_SECTION_FIELDS_REFERENCE_SECTION',
    ACTIONS_REFERENCE_SECTION: 'SCREEN_SECTION_ACTIONS_REFERENCE_SECTION',
    SECTION_PARENT_INVALID: 'SCREEN_SECTION_SECTION_PARENT_INVALID',
    SECTION_CYCLE: 'SCREEN_SECTION_SECTION_CYCLE',
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
    var err = new Error(message || ('screenSectionFirestoreAdapter: ' + code));
    err.code = code;
    err.preflight = true;
    return err;
  }

  function requireProjectId(projectId) {
    var value = clean(projectId);
    if (!value) throw new Error('screenSectionFirestoreAdapter: projectId is required');
    return value;
  }

  function requireSectionId(sectionId) {
    var value = clean(sectionId);
    if (!value) throw new Error('screenSectionFirestoreAdapter: sectionId is required');
    return value;
  }

  function requireScreenSpecId(screenSpecId) {
    var value = clean(screenSpecId);
    if (!value) throw new Error('screenSectionFirestoreAdapter: screenSpecId is required');
    return value;
  }

  function resolveFirestore(provided) {
    if (provided) return provided;
    if (window.firebase && typeof window.firebase.firestore === 'function') {
      return window.firebase.firestore();
    }
    throw new Error('screenSectionFirestoreAdapter: Firestore is not available');
  }

  function serverTimestamp() {
    if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
      return window.firebase.firestore.FieldValue.serverTimestamp();
    }
    throw new Error('screenSectionFirestoreAdapter: server timestamp is not available');
  }

  function collectionRef(db, projectId) {
    return db.collection('projects').doc(projectId).collection(COLLECTION);
  }

  function screenFieldsCollectionRef(db, projectId) {
    return db.collection('projects').doc(projectId).collection(SCREEN_FIELDS_COLLECTION);
  }

  function screenActionsCollectionRef(db, projectId) {
    return db.collection('projects').doc(projectId).collection(SCREEN_ACTIONS_COLLECTION);
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

  function compareScreenSections(a, b) {
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

  function findDuplicateInSnapshot(snapshot, normalizedName, excludeSectionId) {
    var excludeId = clean(excludeSectionId);
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

  function assertDuplicateNameAbsent(db, projectId, screenSpecId, normalizedName, excludeSectionId) {
    return findDuplicateNormalizedName(db, projectId, screenSpecId, normalizedName, excludeSectionId).then(function (duplicateId) {
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

  function findDuplicateNormalizedName(db, projectId, screenSpecId, normalizedName, excludeSectionId) {
    var query = collectionRef(db, requireProjectId(projectId)).where('screenSpecId', '==', requireScreenSpecId(screenSpecId));
    return query.get().then(function (snapshot) {
      return findDuplicateInSnapshot(snapshot, clean(normalizedName).toLowerCase(), excludeSectionId);
    });
  }

  function defaultCountChildSections(db, projectId, screenSpecId, sectionId) {
    var pid = requireProjectId(projectId);
    var sid = requireScreenSpecId(screenSpecId);
    var parentId = requireSectionId(sectionId);
    return collectionRef(db, pid)
      .where('screenSpecId', '==', sid)
      .where('parentSectionId', '==', parentId)
      .get()
      .then(function (snapshot) {
        return snapshot.size;
      });
  }

  function defaultCountFieldsReferencingSection(db, projectId, screenSpecId, sectionId) {
    var pid = requireProjectId(projectId);
    var sid = requireScreenSpecId(screenSpecId);
    var refSectionId = requireSectionId(sectionId);
    return screenFieldsCollectionRef(db, pid)
      .where('screenSpecId', '==', sid)
      .where('sectionId', '==', refSectionId)
      .get()
      .then(function (snapshot) {
        return snapshot.size;
      });
  }

  function defaultCountActionsReferencingSection(db, projectId, screenSpecId, sectionId) {
    var pid = requireProjectId(projectId);
    var sid = requireScreenSpecId(screenSpecId);
    var refSectionId = requireSectionId(sectionId);
    return screenActionsCollectionRef(db, pid)
      .where('screenSpecId', '==', sid)
      .where('sectionId', '==', refSectionId)
      .get()
      .then(function (snapshot) {
        return snapshot.size;
      });
  }

  function defaultListFieldIdsByScreenSpec(db, projectId, screenSpecId) {
    var pid = requireProjectId(projectId);
    var sid = requireScreenSpecId(screenSpecId);
    return screenFieldsCollectionRef(db, pid)
      .where('screenSpecId', '==', sid)
      .get()
      .then(function (snapshot) {
        var ids = [];
        snapshot.forEach(function (doc) {
          ids.push(doc.id);
        });
        return ids;
      });
  }

  function runCreateTransaction(db, projectId, payload) {
    var pid = requireProjectId(projectId);
    var input = Object.assign({}, payload || {});
    var screenSpecId = requireScreenSpecId(input.screenSpecId);
    var ref = input.id ? collectionRef(db, pid).doc(input.id) : collectionRef(db, pid).doc();
    input.id = input.id || ref.id;
    input.projectId = input.projectId || pid;
    var parentRef = screenSpecRef(db, pid, screenSpecId);

    return db.runTransaction(function (transaction) {
      return transaction.get(parentRef).then(function (parentSnap) {
        validateParentSnapshot(parentSnap, pid);
        var writePayload = applyWriteTimestamps(input, 'create');
        transaction.set(ref, writePayload);
        return input.id;
      });
    });
  }

  function runUpdateTransaction(db, projectId, sectionId, patch) {
    var pid = requireProjectId(projectId);
    var sid = requireSectionId(sectionId);
    var rawPatch = Object.assign({}, patch || {});

    try {
      validateUpdateImmutableFields(rawPatch);
    } catch (err) {
      return Promise.reject(err);
    }

    var ref = collectionRef(db, pid).doc(sid);
    return db.runTransaction(function (transaction) {
      return transaction.get(ref).then(function (snap) {
        if (!snap || !snap.exists) {
          throw preflightError(PREFLIGHT_CODES.UPDATE_DOC_MISSING);
        }
        var writePatch = applyWriteTimestamps(sanitizeUpdatePatch(rawPatch), 'update');
        transaction.update(ref, writePatch);
      });
    });
  }

  function runCreatePreflight(db, projectId, payload, excludeSectionId) {
    var pid = requireProjectId(projectId);
    var input = payload || {};
    var screenSpecId = requireScreenSpecId(input.screenSpecId);
    var normalizedName = normalizeName(input.name);
    return assertScreenSpecParentExists(db, pid, screenSpecId).then(function () {
      return assertDuplicateNameAbsent(db, pid, screenSpecId, normalizedName, excludeSectionId);
    });
  }

  function runUpdatePreflight(db, projectId, sectionId, patch, current) {
    var pid = requireProjectId(projectId);
    var sid = requireSectionId(sectionId);
    var rawPatch = patch || {};
    var base = current || null;
    if (!base) {
      return Promise.reject(preflightError(PREFLIGHT_CODES.UPDATE_DOC_MISSING));
    }
    if (!hasOwn(rawPatch, 'name')) {
      return Promise.resolve();
    }
    var normalizedName = normalizeName(rawPatch.name);
    if (normalizeName(rawPatch.name) === normalizeName(base.name)) {
      return Promise.resolve();
    }
    return assertDuplicateNameAbsent(db, pid, base.screenSpecId, normalizedName, sid);
  }

  function createAdapter(options) {
    var opts = options || {};

    function db() {
      return resolveFirestore(opts.firestore);
    }

    var countChildSections = typeof opts.countChildSections === 'function'
      ? opts.countChildSections
      : function (projectId, screenSpecId, sectionId) {
        return defaultCountChildSections(db(), projectId, screenSpecId, sectionId);
      };

    var countFieldsReferencingSection = typeof opts.countFieldsReferencingSection === 'function'
      ? opts.countFieldsReferencingSection
      : function (projectId, screenSpecId, sectionId) {
        return defaultCountFieldsReferencingSection(db(), projectId, screenSpecId, sectionId);
      };

    var countActionsReferencingSection = typeof opts.countActionsReferencingSection === 'function'
      ? opts.countActionsReferencingSection
      : function (projectId, screenSpecId, sectionId) {
        return defaultCountActionsReferencingSection(db(), projectId, screenSpecId, sectionId);
      };

    var listFieldIdsByScreenSpec = typeof opts.listFieldIdsByScreenSpec === 'function'
      ? opts.listFieldIdsByScreenSpec
      : function (projectId, screenSpecId) {
        return defaultListFieldIdsByScreenSpec(db(), projectId, screenSpecId);
      };

    function listByScreenSpec(projectId, screenSpecId, query) {
      var pid = requireProjectId(projectId);
      var sid = requireScreenSpecId(screenSpecId);
      var q = query || {};
      return collectionRef(db(), pid).where('screenSpecId', '==', sid).get().then(function (snapshot) {
        var out = [];
        snapshot.forEach(function (doc) {
          var item = fromDoc(pid, doc);
          if (!item) return;
          if (q.sectionType && item.sectionType !== q.sectionType) return;
          if (q.parentSectionId !== undefined && item.parentSectionId !== q.parentSectionId) return;
          out.push(item);
        });
        out.sort(compareScreenSections);
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
          if (q.sectionType && item.sectionType !== q.sectionType) return;
          out.push(item);
        });
        out.sort(compareScreenSections);
        return out;
      });
    }

    function getById(projectId, sectionId) {
      var pid = requireProjectId(projectId);
      var sid = requireSectionId(sectionId);
      return collectionRef(db(), pid).doc(sid).get().then(function (snap) {
        return fromDoc(pid, snap);
      });
    }

    function create(projectId, section) {
      var pid = requireProjectId(projectId);
      var input = Object.assign({}, section || {});
      if (hasOwn(section || {}, 'id') && !clean(section.id)) {
        delete input.id;
      }
      return runCreatePreflight(db(), pid, input).then(function () {
        return runCreateTransaction(db(), pid, input);
      }).then(function (createdSectionId) {
        return getById(pid, createdSectionId);
      });
    }

    function update(projectId, sectionId, patch) {
      var pid = requireProjectId(projectId);
      var sid = requireSectionId(sectionId);
      var rawPatch = Object.assign({}, patch || {});
      return getById(pid, sid).then(function (current) {
        if (!current) {
          throw preflightError(PREFLIGHT_CODES.UPDATE_DOC_MISSING);
        }
        return runUpdatePreflight(db(), pid, sid, rawPatch, current).then(function () {
          return runUpdateTransaction(db(), pid, sid, rawPatch);
        });
      }).then(function () {
        return getById(pid, sid);
      });
    }

    function deleteSection(projectId, sectionId) {
      var pid = requireProjectId(projectId);
      var sid = requireSectionId(sectionId);
      return getById(pid, sid).then(function (current) {
        if (!current) {
          throw preflightError(PREFLIGHT_CODES.UPDATE_DOC_MISSING);
        }
        return collectionRef(db(), pid).doc(sid).delete();
      });
    }

    return {
      listByScreenSpec: listByScreenSpec,
      listByProject: listByProject,
      getById: getById,
      create: create,
      update: update,
      delete: deleteSection,
      findDuplicateNormalizedName: function (projectId, screenSpecId, normalizedName, excludeSectionId) {
        return findDuplicateNormalizedName(db(), projectId, screenSpecId, normalizedName, excludeSectionId);
      },
      countChildSections: countChildSections,
      countFieldsReferencingSection: countFieldsReferencingSection,
      countActionsReferencingSection: countActionsReferencingSection,
      listFieldIdsByScreenSpec: listFieldIdsByScreenSpec,
      compareScreenSections: compareScreenSections,
    };
  }

  window.STAM = window.STAM || {};
  window.STAM.screenSectionFirestoreAdapter = {
    COLLECTION: COLLECTION,
    SCREEN_SPECS_COLLECTION: SCREEN_SPECS_COLLECTION,
    SCREEN_FIELDS_COLLECTION: SCREEN_FIELDS_COLLECTION,
    SCREEN_ACTIONS_COLLECTION: SCREEN_ACTIONS_COLLECTION,
    PREFLIGHT_CODES: PREFLIGHT_CODES,
    normalizeName: normalizeName,
    compareScreenSections: compareScreenSections,
    runCreatePreflight: runCreatePreflight,
    runCreateTransaction: runCreateTransaction,
    runUpdatePreflight: runUpdatePreflight,
    runUpdateTransaction: runUpdateTransaction,
    assertScreenSpecParentExists: assertScreenSpecParentExists,
    findDuplicateNormalizedName: findDuplicateNormalizedName,
    validateParentSnapshot: validateParentSnapshot,
    defaultCountChildSections: defaultCountChildSections,
    defaultCountFieldsReferencingSection: defaultCountFieldsReferencingSection,
    defaultCountActionsReferencingSection: defaultCountActionsReferencingSection,
    defaultListFieldIdsByScreenSpec: defaultListFieldIdsByScreenSpec,
    create: createAdapter,
  };
}());
