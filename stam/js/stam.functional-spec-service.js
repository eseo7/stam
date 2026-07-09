/* ============================================================================
 * STAM Functional Specification Domain Service Contract
 * ----------------------------------------------------------------------------
 * Domain-first service boundary for Functional Specification CRUD.
 * - Screens call this service, not Firestore paths.
 * - Firestore is injected through STAM.functionalSpecFirestoreAdapter.
 * - No UI wiring and no automatic runtime write path are exposed by loading this file.
 * ========================================================================== */
(function () {
  'use strict';

  var ACTIONS = {
    READ: 'functionalSpec.read',
    CREATE: 'functionalSpec.create',
    UPDATE: 'functionalSpec.update',
    DELETE: 'functionalSpec.delete',
  };

  var WRITE_ROLES = ['owner', 'admin', 'editor'];
  var READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];

  var STATUS_VALUES = ['draft', 'review', 'done', 'approved', 'hold'];
  var PRIORITY_VALUES = ['high', 'mid', 'low'];
  var FUNCTION_TYPE_VALUES = [
    'view', 'create', 'update', 'delete', 'approve', 'notify', 'export', 'integrate',
  ];

  var DEFAULT_STATUS = 'draft';
  var DEFAULT_PRIORITY = 'mid';
  var DEFAULT_REVIEW_STATUS = 'Review Needed';
  var DEFAULT_SOURCE = 'web';

  var ENUM_VALUES = {
    status: STATUS_VALUES,
    priority: PRIORITY_VALUES,
    functionType: FUNCTION_TYPE_VALUES,
  };

  var ENUM_DEFAULTS = {
    status: DEFAULT_STATUS,
    priority: DEFAULT_PRIORITY,
  };

  var OPTIONAL_STRING_FIELDS = [
    'code',
    'description',
    'functionType',
    'requirementId',
    'requirementCode',
    'requirementTitle',
    'linkedScreen',
    'inputSpec',
    'businessRule',
    'exceptionRule',
    'apiRef',
    'note',
    'reviewStatus',
  ];

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
    if (!value) throw new Error('functionalSpecService: projectId is required');
    return value;
  }

  function requireFunctionalSpecId(functionalSpecId) {
    var value = clean(functionalSpecId);
    if (!value) throw new Error('functionalSpecService: functionalSpecId is required');
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

  function normalizeEnum(field, value) {
    var values = ENUM_VALUES[field];
    if (!values) return clean(value);
    var raw = clean(value).toLowerCase();
    if (!raw) return ENUM_DEFAULTS[field] || '';
    return values.indexOf(raw) >= 0 ? raw : (ENUM_DEFAULTS[field] || '');
  }

  function changedFields(before, after) {
    var keys = {};
    Object.keys(before || {}).forEach(function (key) { keys[key] = true; });
    Object.keys(after || {}).forEach(function (key) { keys[key] = true; });
    return Object.keys(keys).filter(function (key) {
      return JSON.stringify(before ? before[key] : undefined) !== JSON.stringify(after ? after[key] : undefined);
    }).sort();
  }

  function validateFunctionalSpecInput(input, mode) {
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
    return {
      valid: errors.length === 0,
      mode: m,
      errors: errors,
    };
  }

  function assertValidInput(input, mode) {
    var result = validateFunctionalSpecInput(input, mode);
    if (!result.valid) {
      throw new Error('functionalSpecService: invalid ' + result.mode + ' input: ' + result.errors.map(function (err) {
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

  function assignOptionalStrings(target, source) {
    OPTIONAL_STRING_FIELDS.forEach(function (field) {
      if (field === 'functionType') {
        var ft = normalizeEnum('functionType', source.functionType);
        if (ft) target.functionType = ft;
        return;
      }
      var value = clean(source[field]);
      if (value) target[field] = value;
    });
  }

  function buildCreatePayload(input, context, clock) {
    var source = input || {};
    assertValidInput(source, 'create');
    var projectId = requireProjectId(projectIdFromInput(source, context));
    var actor = actorFromContext(context);
    var t = nowIso(clock);

    var payload = {
      id: clean(source.id) || undefined,
      projectId: projectId,
      title: clean(source.title),
      status: normalizeEnum('status', source.status),
      priority: normalizeEnum('priority', source.priority),
      ownerUid: clean(source.ownerUid) || actor.uid,
      ownerName: clean(source.ownerName) || actor.name,
      createdAt: source.createdAt || t,
      createdBy: clean(source.createdBy) || actor.uid,
      updatedAt: source.updatedAt || t,
      updatedBy: clean(source.updatedBy) || actor.uid,
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
      version: Number.isFinite(Number(source.version)) ? Number(source.version) : 1,
    };

    assignOptionalStrings(payload, source);
    if (!payload.reviewStatus) payload.reviewStatus = DEFAULT_REVIEW_STATUS;

    return payload;
  }

  function normalizeFunctionalSpec(raw) {
    if (!raw) return null;
    var next = {
      id: clean(raw.id),
      projectId: clean(raw.projectId),
      code: clean(raw.code),
      title: clean(raw.title),
      description: clean(raw.description),
      status: normalizeEnum('status', raw.status),
      priority: normalizeEnum('priority', raw.priority),
      functionType: clean(raw.functionType) ? normalizeEnum('functionType', raw.functionType) : '',
      ownerUid: clean(raw.ownerUid),
      ownerName: clean(raw.ownerName),
      requirementId: clean(raw.requirementId),
      requirementCode: clean(raw.requirementCode),
      requirementTitle: clean(raw.requirementTitle),
      linkedScreen: clean(raw.linkedScreen),
      inputSpec: clean(raw.inputSpec),
      businessRule: clean(raw.businessRule),
      exceptionRule: clean(raw.exceptionRule),
      apiRef: clean(raw.apiRef),
      note: clean(raw.note),
      createdAt: raw.createdAt || null,
      createdBy: clean(raw.createdBy),
      updatedAt: raw.updatedAt || null,
      updatedBy: clean(raw.updatedBy),
      deletedAt: raw.deletedAt || null,
      deletedBy: raw.deletedBy == null ? null : clean(raw.deletedBy),
      isDeleted: raw.isDeleted === true,
      version: Number.isFinite(Number(raw.version)) ? Number(raw.version) : 1,
      reviewStatus: clean(raw.reviewStatus) || DEFAULT_REVIEW_STATUS,
    };
    return next;
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
      'version',
    ].forEach(function (key) {
      delete source[key];
    });
    if (source.title !== undefined) source.title = clean(source.title);
    if (source.status !== undefined) source.status = normalizeEnum('status', source.status);
    if (source.priority !== undefined) source.priority = normalizeEnum('priority', source.priority);
    if (source.functionType !== undefined) {
      var ft = clean(source.functionType);
      if (ft) source.functionType = normalizeEnum('functionType', ft);
      else delete source.functionType;
    }
    OPTIONAL_STRING_FIELDS.forEach(function (field) {
      if (source[field] !== undefined) source[field] = clean(source[field]);
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
      targetType: 'FunctionalSpecification',
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
    return Promise.resolve(false);
  }

  function normalizeMemberRole(role) {
    return clean(role).toLowerCase();
  }

  function canWriteFunctionalSpecs(role) {
    return WRITE_ROLES.indexOf(normalizeMemberRole(role)) >= 0;
  }

  function canReadFunctionalSpecs(role) {
    return READ_ROLES.indexOf(normalizeMemberRole(role)) >= 0;
  }

  function actionRequiresWrite(action) {
    return action === ACTIONS.CREATE || action === ACTIONS.UPDATE;
  }

  function createMemberRoleAuthorize(getMemberRole) {
    var resolveRole = typeof getMemberRole === 'function'
      ? getMemberRole
      : function (request) {
        var ctx = request && request.context ? request.context : {};
        return ctx.memberRole || ctx.role || '';
      };

    return function authorize(action, request) {
      var role = normalizeMemberRole(resolveRole(request));
      if (action === ACTIONS.DELETE) {
        return false;
      }
      if (actionRequiresWrite(action)) {
        return canWriteFunctionalSpecs(role);
      }
      if (action === ACTIONS.READ) {
        return canReadFunctionalSpecs(role);
      }
      return false;
    };
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
    };
  }

  function defaultAdapter() {
    if (window.STAM && window.STAM.functionalSpecFirestoreAdapter) {
      return window.STAM.functionalSpecFirestoreAdapter.create();
    }
    throw new Error('functionalSpecService: adapter is required');
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
        if (allowed === false) throw new Error('functionalSpecService: permission denied for ' + action);
        return true;
      });
    }

    function listByProject(projectId, query, context) {
      var pid = requireProjectId(projectId);
      var q = Object.assign({ includeDeleted: false }, query || {});
      return check(ACTIONS.READ, pid, q, context).then(function () {
        return adapter.listByProject(pid, q);
      }).then(function (items) {
        return (items || []).map(normalizeFunctionalSpec).filter(Boolean);
      });
    }

    function getById(projectId, functionalSpecId, context) {
      var pid = requireProjectId(projectId);
      var fid = requireFunctionalSpecId(functionalSpecId);
      return check(ACTIONS.READ, pid, { id: fid }, context).then(function () {
        return adapter.getById(pid, fid);
      }).then(normalizeFunctionalSpec);
    }

    function create(projectId, input, context) {
      var pid = requireProjectId(projectId);
      var spec = buildCreatePayload(Object.assign({}, input || {}, { projectId: pid }), context, clock);
      return check(ACTIONS.CREATE, pid, spec, context).then(function () {
        return adapter.create(pid, spec);
      }).then(function (saved) {
        return normalizeFunctionalSpec(saved || spec);
      });
    }

    function update(projectId, functionalSpecId, patch, context) {
      var pid = requireProjectId(projectId);
      var fid = requireFunctionalSpecId(functionalSpecId);
      var sanitized = buildUpdatePatch(patch, context, clock);
      return check(ACTIONS.UPDATE, pid, { id: fid, patch: sanitized }, context).then(function () {
        return adapter.getById(pid, fid);
      }).then(function (currentRaw) {
        var current = normalizeFunctionalSpec(currentRaw);
        if (!current) throw new Error('functionalSpecService: functional specification not found');
        var nextPatch = Object.assign({}, sanitized, {
          version: current.version + 1,
        });
        return adapter.update(pid, fid, nextPatch);
      }).then(normalizeFunctionalSpec);
    }

    return {
      ACTIONS: ACTIONS,
      listByProject: listByProject,
      getById: getById,
      create: create,
      update: update,
      normalizeFunctionalSpec: normalizeFunctionalSpec,
      validateFunctionalSpecInput: validateFunctionalSpecInput,
      buildCreatePayload: function (input, context) {
        return buildCreatePayload(input, context, clock);
      },
      buildUpdatePatch: function (patch, context) {
        return buildUpdatePatch(patch, context, clock);
      },
      toDomainFunctionalSpec: normalizeFunctionalSpec,
      buildAuditEvent: function (action, before, after, context) {
        return buildAuditEvent(action, before, after, context, clock);
      },
    };
  }

  window.STAM = window.STAM || {};
  window.STAM.functionalSpecService = createService();
  window.STAM.functionalSpecServiceContract = {
    ACTIONS: ACTIONS,
    WRITE_ROLES: WRITE_ROLES,
    READ_ROLES: READ_ROLES,
    STATUS_VALUES: STATUS_VALUES,
    PRIORITY_VALUES: PRIORITY_VALUES,
    FUNCTION_TYPE_VALUES: FUNCTION_TYPE_VALUES,
    createService: createService,
    normalizeFunctionalSpec: normalizeFunctionalSpec,
    validateFunctionalSpecInput: validateFunctionalSpecInput,
    buildCreatePayload: buildCreatePayload,
    buildUpdatePatch: buildUpdatePatch,
    toDomainFunctionalSpec: normalizeFunctionalSpec,
    buildAuditEvent: buildAuditEvent,
    normalizeMemberRole: normalizeMemberRole,
    canWriteFunctionalSpecs: canWriteFunctionalSpecs,
    canReadFunctionalSpecs: canReadFunctionalSpecs,
    createMemberRoleAuthorize: createMemberRoleAuthorize,
  };
}());
