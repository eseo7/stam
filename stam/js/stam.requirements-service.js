/* ============================================================================
 * STAM Requirement Domain Service Contract
 * ----------------------------------------------------------------------------
 * Domain-first service boundary for Requirement CRUD.
 * - Screens call this service, not Firestore paths.
 * - Firestore is injected through STAM.requirementsFirestoreAdapter.
 * - No UI wiring and no automatic runtime write path are exposed by loading this file.
 * ========================================================================== */
(function () {
  'use strict';

  var ACTIONS = {
    READ: 'requirement.read',
    CREATE: 'requirement.create',
    UPDATE: 'requirement.update',
    DELETE: 'requirement.delete',
  };

  var STATUS_VALUES = ['draft', 'active', 'review', 'approved', 'archived'];
  var PRIORITY_VALUES = ['low', 'normal', 'high', 'critical'];
  var VISIBILITY_VALUES = ['project', 'internal', 'customer', 'private'];

  var DEFAULT_STATUS = 'draft';
  var DEFAULT_PRIORITY = 'normal';
  var DEFAULT_VISIBILITY = 'project';
  var DEFAULT_REVIEW_STATUS = 'Review Needed';
  var DEFAULT_APPROVAL_STATUS = 'none';
  var DEFAULT_SOURCE = 'web';

  var ENUM_VALUES = {
    status: STATUS_VALUES,
    priority: PRIORITY_VALUES,
    visibility: VISIBILITY_VALUES,
  };

  var ENUM_DEFAULTS = {
    status: DEFAULT_STATUS,
    priority: DEFAULT_PRIORITY,
    visibility: DEFAULT_VISIBILITY,
  };

  function nowIso(clock) {
    return clock ? clock() : new Date().toISOString();
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function clone(value) {
    if (value == null || typeof value !== 'object') return value;
    return JSON.parse(JSON.stringify(value));
  }

  function requireProjectId(projectId) {
    var value = clean(projectId);
    if (!value) throw new Error('requirementsService: projectId is required');
    return value;
  }

  function requireRequirementId(requirementId) {
    var value = clean(requirementId);
    if (!value) throw new Error('requirementsService: requirementId is required');
    return value;
  }

  function actorFromContext(context) {
    var ctx = context || {};
    return {
      uid: clean(ctx.actorUid || ctx.uid || ctx.userId || ctx.createdBy || ctx.updatedBy) || 'unknown',
      name: clean(ctx.actorName || ctx.userName || ctx.displayName || ctx.ownerName),
    };
  }

  function requestIdFromContext(context) {
    var ctx = context || {};
    return clean(ctx.requestId || ctx.operationId);
  }

  function normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];
    return tags.map(clean).filter(Boolean);
  }

  function normalizeSortOrder(sortOrder) {
    if (sortOrder == null || sortOrder === '') return null;
    var n = Number(sortOrder);
    return Number.isFinite(n) ? n : null;
  }

  function normalizeEnum(field, value) {
    var values = ENUM_VALUES[field];
    if (!values) return clean(value);
    var raw = clean(value).toLowerCase();
    if (!raw) return ENUM_DEFAULTS[field];
    return values.indexOf(raw) >= 0 ? raw : ENUM_DEFAULTS[field];
  }

  function changedFields(before, after) {
    var keys = {};
    Object.keys(before || {}).forEach(function (key) { keys[key] = true; });
    Object.keys(after || {}).forEach(function (key) { keys[key] = true; });
    return Object.keys(keys).filter(function (key) {
      return JSON.stringify(before ? before[key] : undefined) !== JSON.stringify(after ? after[key] : undefined);
    }).sort();
  }

  function validateRequirementInput(input, mode) {
    var source = input || {};
    var m = clean(mode) || 'create';
    var errors = [];
    if (m !== 'create' && m !== 'update') {
      errors.push({ field: 'mode', message: 'mode must be create or update' });
    }
    if (m === 'create' && !clean(source.title)) {
      errors.push({ field: 'title', message: 'title is required' });
    }
    if (m === 'update' && Object.keys(source).length === 0) {
      errors.push({ field: 'patch', message: 'at least one field is required' });
    }
    if (source.tags !== undefined && !Array.isArray(source.tags)) {
      errors.push({ field: 'tags', message: 'tags must be an array' });
    }
    if (source.sortOrder !== undefined && source.sortOrder !== null && source.sortOrder !== '') {
      var sortOrder = Number(source.sortOrder);
      if (!Number.isFinite(sortOrder)) {
        errors.push({ field: 'sortOrder', message: 'sortOrder must be a number' });
      }
    }
    return {
      valid: errors.length === 0,
      mode: m,
      errors: errors,
    };
  }

  function assertValidInput(input, mode) {
    var result = validateRequirementInput(input, mode);
    if (!result.valid) {
      throw new Error('requirementsService: invalid ' + result.mode + ' input: ' + result.errors.map(function (err) {
        return err.field + ' ' + err.message;
      }).join(', '));
    }
    return result;
  }

  function projectIdFromInput(input, context) {
    var source = input || {};
    var ctx = context || {};
    return clean(source.projectId || ctx.projectId);
  }

  function buildCreatePayload(input, context, clock) {
    var source = input || {};
    assertValidInput(source, 'create');
    var projectId = requireProjectId(projectIdFromInput(source, context));
    var actor = actorFromContext(context);
    var t = nowIso(clock);

    return {
      id: clean(source.id) || undefined,
      projectId: projectId,
      code: clean(source.code),
      title: clean(source.title),
      description: clean(source.description),
      status: normalizeEnum('status', source.status),
      priority: normalizeEnum('priority', source.priority),
      ownerUid: clean(source.ownerUid) || actor.uid,
      ownerName: clean(source.ownerName) || actor.name,
      createdAt: source.createdAt || t,
      createdBy: clean(source.createdBy) || actor.uid,
      updatedAt: source.updatedAt || t,
      updatedBy: clean(source.updatedBy) || actor.uid,
      deletedAt: source.deletedAt || null,
      deletedBy: source.deletedBy || null,
      isDeleted: source.isDeleted === true,
      version: Number.isFinite(Number(source.version)) ? Number(source.version) : 1,
      sortOrder: normalizeSortOrder(source.sortOrder),
      tags: normalizeTags(source.tags),
      visibility: normalizeEnum('visibility', source.visibility),
      reviewStatus: clean(source.reviewStatus) || DEFAULT_REVIEW_STATUS,
      approvalStatus: clean(source.approvalStatus) || DEFAULT_APPROVAL_STATUS,
    };
  }

  function normalizeRequirement(raw) {
    if (!raw) return null;
    return {
      id: clean(raw.id),
      projectId: clean(raw.projectId),
      code: clean(raw.code),
      title: clean(raw.title),
      description: clean(raw.description),
      status: normalizeEnum('status', raw.status),
      priority: normalizeEnum('priority', raw.priority),
      ownerUid: clean(raw.ownerUid),
      ownerName: clean(raw.ownerName),
      createdAt: raw.createdAt || null,
      createdBy: clean(raw.createdBy),
      updatedAt: raw.updatedAt || null,
      updatedBy: clean(raw.updatedBy),
      deletedAt: raw.deletedAt || null,
      deletedBy: raw.deletedBy || null,
      isDeleted: raw.isDeleted === true,
      version: Number.isFinite(Number(raw.version)) ? Number(raw.version) : 1,
      sortOrder: normalizeSortOrder(raw.sortOrder),
      tags: normalizeTags(raw.tags),
      visibility: normalizeEnum('visibility', raw.visibility),
      reviewStatus: clean(raw.reviewStatus) || DEFAULT_REVIEW_STATUS,
      approvalStatus: clean(raw.approvalStatus) || DEFAULT_APPROVAL_STATUS,
    };
  }

  function buildUpdatePatch(patch, context, clock) {
    assertValidInput(patch || {}, 'update');
    var actor = actorFromContext(context);
    var source = Object.assign({}, patch || {});
    [
      'id',
      'projectId',
      'createdAt',
      'createdBy',
      'deletedAt',
      'deletedBy',
      'isDeleted',
    ].forEach(function (key) {
      delete source[key];
    });
    if (source.tags !== undefined) source.tags = normalizeTags(source.tags);
    if (source.sortOrder !== undefined) source.sortOrder = normalizeSortOrder(source.sortOrder);
    ['status', 'priority', 'visibility'].forEach(function (field) {
      if (source[field] !== undefined) source[field] = normalizeEnum(field, source[field]);
    });
    source.updatedAt = nowIso(clock);
    source.updatedBy = actor.uid;
    return source;
  }

  function buildAuditEvent(action, before, after, context, clock) {
    var actor = actorFromContext(context);
    var target = after || before || {};
    return {
      actorUid: actor.uid,
      actorName: actor.name,
      projectId: target.projectId || (context && context.projectId) || '',
      targetType: 'Requirement',
      targetId: target.id || '',
      action: action,
      beforeSnapshot: before ? clone(before) : null,
      afterSnapshot: after ? clone(after) : null,
      changedFields: changedFields(before || {}, after || {}),
      createdAt: nowIso(clock),
      requestId: requestIdFromContext(context),
      source: clean(context && context.source) || DEFAULT_SOURCE,
    };
  }

  function defaultAuthorize() {
    return Promise.resolve(true);
  }

  function resolveAdapter(adapter) {
    if (adapter) return adapter;
    return {
      listByProject: function () {
        return defaultAdapter().listByProject.apply(null, arguments);
      },
      getById: function () {
        return defaultAdapter().getById.apply(null, arguments);
      },
      create: function () {
        return defaultAdapter().create.apply(null, arguments);
      },
      update: function () {
        return defaultAdapter().update.apply(null, arguments);
      },
      softDelete: function () {
        return defaultAdapter().softDelete.apply(null, arguments);
      },
    };
  }

  function defaultAdapter() {
    if (window.STAM && window.STAM.requirementsFirestoreAdapter) {
      return window.STAM.requirementsFirestoreAdapter.create();
    }
    throw new Error('requirementsService: adapter is required');
  }

  function createService(options) {
    var opts = options || {};
    var adapter = resolveAdapter(opts.adapter);
    var authorize = opts.authorize || defaultAuthorize;
    var clock = opts.clock;

    function check(action, projectId, payload, context) {
      var ctx = Object.assign({}, context || {}, { projectId: projectId });
      return Promise.resolve(authorize(action, {
        action: action,
        projectId: projectId,
        payload: payload || null,
        context: ctx,
      })).then(function (allowed) {
        if (allowed === false) throw new Error('requirementsService: permission denied for ' + action);
        return true;
      });
    }

    function listByProject(projectId, query, context) {
      var pid = requireProjectId(projectId);
      var q = Object.assign({ includeDeleted: false }, query || {});
      return check(ACTIONS.READ, pid, q, context).then(function () {
        return adapter.listByProject(pid, q);
      }).then(function (items) {
        return (items || []).map(normalizeRequirement).filter(Boolean);
      });
    }

    function getById(projectId, requirementId, context) {
      var pid = requireProjectId(projectId);
      var rid = requireRequirementId(requirementId);
      return check(ACTIONS.READ, pid, { id: rid }, context).then(function () {
        return adapter.getById(pid, rid);
      }).then(normalizeRequirement);
    }

    function create(projectId, input, context) {
      var pid = requireProjectId(projectId);
      var requirement = buildCreatePayload(Object.assign({}, input || {}, { projectId: pid }), context, clock);
      return check(ACTIONS.CREATE, pid, requirement, context).then(function () {
        return adapter.create(pid, requirement);
      }).then(function (saved) {
        return normalizeRequirement(saved || requirement);
      });
    }

    function update(projectId, requirementId, patch, context) {
      var pid = requireProjectId(projectId);
      var rid = requireRequirementId(requirementId);
      var sanitized = buildUpdatePatch(patch, context, clock);
      return check(ACTIONS.UPDATE, pid, { id: rid, patch: sanitized }, context).then(function () {
        return adapter.getById(pid, rid);
      }).then(function (currentRaw) {
        var current = normalizeRequirement(currentRaw);
        if (!current) throw new Error('requirementsService: requirement not found');
        var nextPatch = Object.assign({}, sanitized, {
          version: current.version + 1,
        });
        return adapter.update(pid, rid, nextPatch);
      }).then(normalizeRequirement);
    }

    function softDelete(projectId, requirementId, reason, context) {
      var pid = requireProjectId(projectId);
      var rid = requireRequirementId(requirementId);
      var actor = actorFromContext(context);
      return check(ACTIONS.DELETE, pid, { id: rid, reason: reason || '' }, context).then(function () {
        return adapter.getById(pid, rid);
      }).then(function (currentRaw) {
        var current = normalizeRequirement(currentRaw);
        if (!current) throw new Error('requirementsService: requirement not found');
        var t = nowIso(clock);
        var patch = {
          isDeleted: true,
          deletedAt: t,
          deletedBy: actor.uid,
          updatedAt: t,
          updatedBy: actor.uid,
          version: current.version + 1,
        };
        if (reason) patch.deleteReason = clean(reason);
        return adapter.softDelete(pid, rid, patch);
      }).then(normalizeRequirement);
    }

    return {
      ACTIONS: ACTIONS,
      listByProject: listByProject,
      getById: getById,
      create: create,
      update: update,
      softDelete: softDelete,
      normalizeRequirement: normalizeRequirement,
      validateRequirementInput: validateRequirementInput,
      buildCreatePayload: function (input, context) {
        return buildCreatePayload(input, context, clock);
      },
      buildUpdatePatch: function (patch, context) {
        return buildUpdatePatch(patch, context, clock);
      },
      toDomainRequirement: normalizeRequirement,
      buildAuditEvent: function (action, before, after, context) {
        return buildAuditEvent(action, before, after, context, clock);
      },
    };
  }

  window.STAM = window.STAM || {};
  window.STAM.requirementsService = createService();
  window.STAM.requirementsServiceContract = {
    ACTIONS: ACTIONS,
    createService: createService,
    normalizeRequirement: normalizeRequirement,
    validateRequirementInput: validateRequirementInput,
    buildCreatePayload: buildCreatePayload,
    buildUpdatePatch: buildUpdatePatch,
    toDomainRequirement: normalizeRequirement,
    buildAuditEvent: buildAuditEvent,
  };
}());
