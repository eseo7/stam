/* ============================================================================
 * STAM Requirements Firestore Adapter
 * ----------------------------------------------------------------------------
 * Firestore implementation boundary for Requirement Domain Service.
 * Screens must not call this adapter directly; use STAM.requirementsService.
 * No UI wiring is performed in this file.
 * ========================================================================== */
(function () {
  'use strict';

  var COLLECTION = 'requirements';

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function requireProjectId(projectId) {
    var value = clean(projectId);
    if (!value) throw new Error('requirementsFirestoreAdapter: projectId is required');
    return value;
  }

  function requireRequirementId(requirementId) {
    var value = clean(requirementId);
    if (!value) throw new Error('requirementsFirestoreAdapter: requirementId is required');
    return value;
  }

  function resolveFirestore(provided) {
    if (provided) return provided;
    if (window.firebase && typeof window.firebase.firestore === 'function') {
      return window.firebase.firestore();
    }
    throw new Error('requirementsFirestoreAdapter: Firestore is not available');
  }

  function collectionRef(db, projectId) {
    return db.collection('projects').doc(projectId).collection(COLLECTION);
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

  function compareRequirement(a, b) {
    var ao = a.sortOrder == null ? Number.MAX_SAFE_INTEGER : Number(a.sortOrder);
    var bo = b.sortOrder == null ? Number.MAX_SAFE_INTEGER : Number(b.sortOrder);
    if (ao !== bo) return ao - bo;
    var ac = clean(a.code || a.id);
    var bc = clean(b.code || b.id);
    return ac.localeCompare(bc);
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
        out.sort(compareRequirement);
        return out;
      });
    }

    function getById(projectId, requirementId) {
      var pid = requireProjectId(projectId);
      var rid = requireRequirementId(requirementId);
      return collectionRef(db(), pid).doc(rid).get().then(function (snap) {
        return fromDoc(pid, snap);
      });
    }

    function create(projectId, requirement) {
      var pid = requireProjectId(projectId);
      var input = Object.assign({}, requirement || {});
      var ref = input.id ? collectionRef(db(), pid).doc(input.id) : collectionRef(db(), pid).doc();
      input.id = input.id || ref.id;
      input.projectId = input.projectId || pid;
      return ref.set(input).then(function () {
        return input;
      });
    }

    function update(projectId, requirementId, patch) {
      var pid = requireProjectId(projectId);
      var rid = requireRequirementId(requirementId);
      var nextPatch = Object.assign({}, patch || {});
      return collectionRef(db(), pid).doc(rid).update(nextPatch).then(function () {
        return getById(pid, rid);
      });
    }

    function softDelete(projectId, requirementId, patch) {
      return update(projectId, requirementId, patch);
    }

    return {
      listByProject: listByProject,
      getById: getById,
      create: create,
      update: update,
      softDelete: softDelete,
    };
  }

  window.STAM = window.STAM || {};
  window.STAM.requirementsFirestoreAdapter = {
    COLLECTION: COLLECTION,
    create: createAdapter,
  };
}());
