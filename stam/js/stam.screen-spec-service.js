/* ============================================================================
 * STAM ScreenSpec Domain Service Contract
 * ----------------------------------------------------------------------------
 * Domain-first service boundary for screenSpecs CRUD.
 * - Screens call this service, not Firestore paths.
 * - Firestore is injected through STAM.screenSpecFirestoreAdapter.
 * - No UI wiring and no automatic runtime write path are exposed by loading this file.
 * ========================================================================== */
(function () {
  'use strict';

  var ACTIONS = {
    LIST: 'screenSpec.list',
    READ: 'screenSpec.read',
    CREATE: 'screenSpec.create',
    UPDATE: 'screenSpec.update',
  };

  var ERROR_CODES = {
    UPDATE_VERSION_MISMATCH: 'SCREEN_SPEC_UPDATE_VERSION_MISMATCH',
  };

  var WRITE_ROLES = ['owner', 'admin', 'editor'];
  var READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];

  var SCREEN_TYPE_VALUES = ['list', 'detail', 'form', 'popup', 'admin', 'main', 'result', 'other'];
  var WRITE_STATUS_VALUES = ['writing', 'complete'];
  var REVIEW_STATUS_VALUES = ['none', 'pending', 'done'];
  var APPROVAL_STATUS_VALUES = ['none', 'approved', 'rejected'];

  var DEFAULT_SCREEN_TYPE = 'other';
  var DEFAULT_WRITE_STATUS = 'writing';
  var DEFAULT_REVIEW_STATUS = 'none';
  var DEFAULT_APPROVAL_STATUS = 'none';
  var DEFAULT_IMAGE_COUNT = 0;
  var DEFAULT_ANNOTATION_COUNT = 0;

  var ENUM_VALUES = {
    screenType: SCREEN_TYPE_VALUES,
    writeStatus: WRITE_STATUS_VALUES,
    reviewStatus: REVIEW_STATUS_VALUES,
    approvalStatus: APPROVAL_STATUS_VALUES,
  };

  var ENUM_DEFAULTS = {
    screenType: DEFAULT_SCREEN_TYPE,
    writeStatus: DEFAULT_WRITE_STATUS,
    reviewStatus: DEFAULT_REVIEW_STATUS,
    approvalStatus: DEFAULT_APPROVAL_STATUS,
    imageCount: DEFAULT_IMAGE_COUNT,
    annotationCount: DEFAULT_ANNOTATION_COUNT,
  };

  var FORBIDDEN_FIELDS = [
    'screenName',
    'functionId',
    'wbsId',
    'menuId',
    'importBatchId',
    'importRowId',
    'sourceType',
    'artifactLinks',
    'screenFields',
    'screenActions',
  ];

  var CREATE_FORBIDDEN_INPUT_FIELDS = [
    'code',
    'version',
    'isDeleted',
    'deletedAt',
    'deletedBy',
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
  ];

  var UPDATE_FORBIDDEN_INPUT_FIELDS = [
    'id',
    'projectId',
    'code',
    'version',
    'isDeleted',
    'deletedAt',
    'deletedBy',
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
  ];

  var REQUIREMENT_FIELDS = ['requirementId', 'requirementCode', 'requirementTitle'];
  var FUNCTIONAL_SPEC_FIELDS = ['functionalSpecId', 'functionalSpecCode', 'functionalSpecTitle'];
  var WBS_ITEM_FIELDS = ['wbsItemId', 'wbsItemCode', 'wbsItemTitle'];
  var MENU_SCREEN_FIELDS = ['menuScreenId', 'menuScreenCode', 'menuScreenTitle'];
  var LINK_FIELD_GROUPS = [
  { name: 'requirement', fields: REQUIREMENT_FIELDS, codeField: 'requirementCode', codeRe: /^REQ_[0-9]{3,}$/ },
  { name: 'functionalSpec', fields: FUNCTIONAL_SPEC_FIELDS, codeField: 'functionalSpecCode', codeRe: /^FN_[0-9]{3,}$/ },
  { name: 'wbsItem', fields: WBS_ITEM_FIELDS, codeField: 'wbsItemCode', codeRe: /^WBS-[0-9]{3,}$/ },
  { name: 'menuScreen', fields: MENU_SCREEN_FIELDS, codeField: 'menuScreenCode', codeRe: null },
  ];

  var OPTIONAL_STRING_FIELDS = ['templateId', 'routePath', 'menuPath', 'description'];
  var OPTIONAL_COUNT_FIELDS = ['imageCount', 'annotationCount'];
  var OPTIONAL_CLEAR_FIELDS = OPTIONAL_STRING_FIELDS.concat(OPTIONAL_COUNT_FIELDS);

  var OWNER_FIELDS = ['ownerId', 'ownerName'];

  var OPTIONAL_STRING_MAX = {
    templateId: 120,
    routePath: 500,
    menuPath: 500,
    description: 4000,
  };

  function nowIso(clock) {
    return clock ? clock() : new Date().toISOString();
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj || {}, key);
  }

  function isAbsent(value) {
    return value === undefined;
  }

  function isNull(value) {
    return value === null;
  }

  function isFieldOmitted(source, field) {
    return !hasOwn(source, field) || isAbsent(source[field]);
  }

  function isBlankString(value) {
    return typeof value === 'string' && value.trim() === '';
  }

  function isOptionalClearSentinel(value) {
    return value === '' || isBlankString(value);
  }

  function pushError(errors, field, message) {
    errors.push({ field: field, message: message });
  }

  function requireProjectId(projectId) {
    var value = clean(projectId);
    if (!value) throw new Error('screenSpecService: projectId is required');
    return value;
  }

  function requireScreenSpecId(screenSpecId) {
    var value = clean(screenSpecId);
    if (!value) throw new Error('screenSpecService: screenSpecId is required');
    return value;
  }

  function createServiceError(code, message) {
    var err = new Error(message || ('screenSpecService: ' + code));
    err.code = code;
    if (code === ERROR_CODES.UPDATE_VERSION_MISMATCH) {
      err.conflict = true;
    }
    return err;
  }

  function actorFromContext(context) {
    var ctx = context || {};
    var uid = clean(ctx.actorUid || ctx.uid || ctx.userId);
    if (!uid) throw new Error('screenSpecService: actorUid is required');
    return {
      uid: uid,
      name: clean(ctx.actorName || ctx.userName || ctx.displayName),
    };
  }

  function normalizeCount(value) {
    if (value === undefined) return undefined;
    if (typeof value === 'number') {
      if (!Number.isInteger(value)) return NaN;
      return value;
    }
    if (typeof value === 'string') {
      var trimmed = value.trim();
      if (!trimmed) return NaN;
      var n = Number(trimmed);
      if (!Number.isFinite(n) || !Number.isInteger(n)) return NaN;
      return n;
    }
    return NaN;
  }

  function normalizeEnumField(field, value) {
    var raw = typeof value === 'string' ? clean(value) : value;
    if (!raw) return ENUM_DEFAULTS[field];
    return ENUM_VALUES[field].indexOf(raw) >= 0 ? raw : ENUM_DEFAULTS[field];
  }

  function normalizeStoredCount(value, defaultValue) {
    var count = normalizeCount(value);
    if (Number.isNaN(count) || count < 0) return defaultValue;
    return count;
  }

  function normalizeStoredVersion(value) {
    var version = normalizeCount(value);
    if (Number.isNaN(version) || version < 1) return 1;
    return version;
  }

  function validateEnumField(errors, field, value, allowDefaultWhenAbsent) {
    if (isAbsent(value)) {
      if (allowDefaultWhenAbsent) return ENUM_DEFAULTS[field];
      return undefined;
    }
    if (isNull(value)) {
      pushError(errors, field, field + ' cannot be null');
      return undefined;
    }
    if (isBlankString(value)) {
      pushError(errors, field, field + ' cannot be empty');
      return undefined;
    }
    var normalized = typeof value === 'string' ? value.trim() : value;
    if (ENUM_VALUES[field].indexOf(normalized) < 0) {
      pushError(errors, field, 'invalid ' + field + ' value');
      return undefined;
    }
    return normalized;
  }

  function validateOptionalString(errors, field, value, maxLen) {
    if (value === undefined) return undefined;
    if (typeof value !== 'string') {
      pushError(errors, field, field + ' must be a string');
      return undefined;
    }
    var trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.length < 1 || trimmed.length > maxLen) {
      pushError(errors, field, field + ' length is invalid');
      return undefined;
    }
    return trimmed;
  }

  function validateCountField(errors, field, value, mode) {
    if (value === undefined) return undefined;
    if (isNull(value)) {
      pushError(errors, field, field + ' cannot be null');
      return undefined;
    }
    if (mode === 'update' && isOptionalClearSentinel(value)) return '';
    var count = normalizeCount(value);
    if (Number.isNaN(count)) {
      pushError(errors, field, field + ' must be a non-negative integer');
      return undefined;
    }
    if (count < 0) {
      pushError(errors, field, field + ' must be a non-negative integer');
      return undefined;
    }
    return count;
  }

  function hasAnyField(source, fields) {
    return fields.some(function (field) { return hasOwn(source, field); });
  }

  function fieldsAllEmpty(source, fields) {
    return fields.every(function (field) { return hasOwn(source, field) && clean(source[field]) === ''; });
  }

  function fieldsAllNonEmpty(source, fields) {
    return fields.every(function (field) { return clean(source[field]) !== ''; });
  }

  function validatePairGroup(errors, fields, source, mode, groupName, options) {
    var opts = options || {};
    var present = fields.filter(function (field) { return hasOwn(source, field); });
    var values = fields.map(function (field) { return source[field]; });

    if (mode === 'create') {
      if (present.length === 0) return;
      if (present.length !== fields.length) {
        pushError(errors, groupName, 'partial ' + groupName + ' pair/triplet is not allowed');
        return;
      }
      fields.forEach(function (field) {
        if (isNull(source[field])) pushError(errors, field, field + ' cannot be null');
      });
      var allEmpty = values.every(function (value) { return clean(value) === ''; });
      if (allEmpty) return;
      var allNonEmpty = values.every(function (value) { return clean(value) !== ''; });
      if (!allNonEmpty) {
        pushError(errors, groupName, 'partial ' + groupName + ' pair/triplet is not allowed');
      }
      return;
    }

    if (mode === 'update') {
      var allUndefined = fields.every(function (field) { return isAbsent(source[field]); });
      if (allUndefined) return;
      var allPresent = fields.every(function (field) { return hasOwn(source, field); });
      if (!allPresent) {
        pushError(errors, groupName, 'partial ' + groupName + ' unlink/change is not allowed');
        return;
      }
      fields.forEach(function (field) {
        if (isNull(source[field])) pushError(errors, field, field + ' cannot be null');
      });
      if (opts.allowUnlink) {
        var unlink = values.every(function (value) { return clean(value) === ''; });
        var link = values.every(function (value) { return clean(value) !== ''; });
        if (!unlink && !link) {
          pushError(errors, groupName, 'partial ' + groupName + ' unlink/change is not allowed');
        }
      }
    }
  }

  function validateLinkGroups(errors, source, mode) {
    LINK_FIELD_GROUPS.forEach(function (group) {
      validatePairGroup(errors, group.fields, source, mode, group.name, { allowUnlink: mode === 'update' });
      if (mode === 'create' || hasAnyField(source, group.fields)) {
        var code = clean(source[group.codeField]);
        if (code && group.codeRe && !group.codeRe.test(code)) {
          pushError(errors, group.codeField, group.codeField + ' format is invalid');
        }
        if (code && !group.codeRe && code.length < 1) {
          pushError(errors, group.codeField, group.codeField + ' cannot be empty');
        }
      }
    });
  }

  function validateForbiddenFields(errors, source, mode) {
    FORBIDDEN_FIELDS.forEach(function (field) {
      if (hasOwn(source, field)) {
        pushError(errors, field, field + ' is not allowed');
      }
    });
    if (mode === 'create') {
      CREATE_FORBIDDEN_INPUT_FIELDS.forEach(function (field) {
        if (hasOwn(source, field)) {
          pushError(errors, field, field + ' cannot be specified on create input');
        }
      });
      if (hasOwn(source, 'code')) {
        pushError(errors, 'code', 'code cannot be specified on input');
      }
    }
    if (mode === 'update') {
      UPDATE_FORBIDDEN_INPUT_FIELDS.forEach(function (field) {
        if (hasOwn(source, field)) {
          pushError(errors, field, field + ' cannot be specified on update input');
        }
      });
    }
  }

  function validateOwnerFields(errors, source, mode) {
    if (mode === 'create') {
      var hasOwnerId = hasOwn(source, 'ownerId');
      var hasOwnerName = hasOwn(source, 'ownerName');
      if (!hasOwnerId || !hasOwnerName) {
        pushError(errors, 'owner', 'ownerId and ownerName are required on create');
        return;
      }
      if (isNull(source.ownerId) || isNull(source.ownerName)) {
        pushError(errors, 'owner', 'ownerId and ownerName cannot be null');
        return;
      }
      if (!clean(source.ownerId) || !clean(source.ownerName)) {
        pushError(errors, 'owner', 'ownerId and ownerName must be non-empty');
      }
      return;
    }

    var ownerTouched = hasOwn(source, 'ownerId') || hasOwn(source, 'ownerName');
    if (!ownerTouched) return;
    if (!hasOwn(source, 'ownerId') || !hasOwn(source, 'ownerName')) {
      pushError(errors, 'owner', 'ownerId and ownerName must be provided together on update');
      return;
    }
    if (isNull(source.ownerId) || isNull(source.ownerName)) {
      pushError(errors, 'owner', 'owner unlink is not allowed');
      return;
    }
    if (!clean(source.ownerId) || !clean(source.ownerName)) {
      pushError(errors, 'owner', 'owner unlink is not allowed');
    }
  }

  function validateScreenSpecInput(input, mode) {
    var source = input || {};
    var m = clean(mode) || 'create';
    var errors = [];

    if (m !== 'create' && m !== 'update') {
      pushError(errors, 'mode', 'mode must be create or update');
      return { valid: false, mode: m, errors: errors };
    }

    validateForbiddenFields(errors, source, m);

    if (m === 'update' && Object.keys(source).length === 0) {
      pushError(errors, 'patch', 'at least one field is required');
    }

    if (m === 'create') {
      if (!clean(source.title)) pushError(errors, 'title', 'title is required');
      ['screenType', 'writeStatus', 'reviewStatus', 'approvalStatus'].forEach(function (field) {
        if (!isFieldOmitted(source, field)) {
          validateEnumField(errors, field, source[field], false);
        }
      });
      OPTIONAL_COUNT_FIELDS.forEach(function (field) {
        if (!isFieldOmitted(source, field)) {
          validateCountField(errors, field, source[field], 'create');
        }
      });
    } else {
      if (hasOwn(source, 'title')) {
        var title = clean(source.title);
        if (!title || title.length < 2 || title.length > 120) {
          pushError(errors, 'title', 'title must be 2-120 characters');
        }
      }
      ['screenType', 'writeStatus', 'reviewStatus', 'approvalStatus'].forEach(function (field) {
        if (hasOwn(source, field)) validateEnumField(errors, field, source[field], false);
      });
      OPTIONAL_STRING_FIELDS.forEach(function (field) {
        if (hasOwn(source, field)) {
          if (isNull(source[field])) {
            pushError(errors, field, field + ' cannot be null');
          } else if (!isOptionalClearSentinel(source[field])) {
            validateOptionalString(errors, field, source[field], OPTIONAL_STRING_MAX[field]);
          }
        }
      });
      OPTIONAL_COUNT_FIELDS.forEach(function (field) {
        if (hasOwn(source, field)) validateCountField(errors, field, source[field], 'update');
      });
    }

    validateOwnerFields(errors, source, m);
    validateLinkGroups(errors, source, m);

    if (m === 'create') {
      OPTIONAL_STRING_FIELDS.forEach(function (field) {
        if (hasOwn(source, field) && !isNull(source[field]) && !isOptionalClearSentinel(source[field])) {
          validateOptionalString(errors, field, source[field], OPTIONAL_STRING_MAX[field]);
        }
      });
    }

    return {
      valid: errors.length === 0,
      mode: m,
      errors: errors,
    };
  }

  function assertValidInput(input, mode) {
    var result = validateScreenSpecInput(input, mode);
    if (!result.valid) {
      throw new Error('screenSpecService: invalid ' + result.mode + ' input: ' + result.errors.map(function (err) {
        return err.field + ' ' + err.message;
      }).join(', '));
    }
    return result;
  }

  function resolveCreateEnumDefault(source, field, errors) {
    if (isFieldOmitted(source, field)) return ENUM_DEFAULTS[field];
    return validateEnumField(errors, field, source[field], false);
  }

  function resolveCreateCountDefault(source, field, errors) {
    if (isFieldOmitted(source, field)) return ENUM_DEFAULTS[field];
    if (isNull(source[field])) {
      pushError(errors, field, field + ' cannot be null');
      return NaN;
    }
    var count = normalizeCount(source[field]);
    if (Number.isNaN(count) || count < 0) {
      pushError(errors, field, field + ' must be a non-negative integer');
      return NaN;
    }
    return count;
  }

  function assignOptionalStrings(target, source) {
    OPTIONAL_STRING_FIELDS.forEach(function (field) {
      if (!hasOwn(source, field) || isOptionalClearSentinel(source[field])) return;
      var value = validateOptionalString([], field, source[field], OPTIONAL_STRING_MAX[field]);
      if (value) target[field] = value;
    });
  }

  function assignOptionalCounts(target, source) {
    OPTIONAL_COUNT_FIELDS.forEach(function (field) {
      if (!hasOwn(source, field) || isOptionalClearSentinel(source[field])) return;
      var count = normalizeCount(source[field]);
      if (!Number.isNaN(count) && count >= 0) target[field] = count;
    });
  }

  function assignLinkTriplet(target, source, fields) {
    if (!hasAnyField(source, fields)) return;
    if (fieldsAllEmpty(source, fields)) return;
    if (fieldsAllNonEmpty(source, fields)) {
      fields.forEach(function (field) {
        target[field] = clean(source[field]);
      });
    }
  }

  function buildCreatePayload(input, context, clock) {
    var source = Object.assign({}, input || {});
    var ctx = context || {};
    var actor = actorFromContext(ctx);
    var t = nowIso(clock);

    assertValidInput(source, 'create');

    var projectId = requireProjectId(clean(source.projectId || ctx.projectId));
    var payloadErrors = [];
    var screenType = resolveCreateEnumDefault(source, 'screenType', payloadErrors);
    var writeStatus = resolveCreateEnumDefault(source, 'writeStatus', payloadErrors);
    var reviewStatus = resolveCreateEnumDefault(source, 'reviewStatus', payloadErrors);
    var approvalStatus = resolveCreateEnumDefault(source, 'approvalStatus', payloadErrors);
    var imageCount = resolveCreateCountDefault(source, 'imageCount', payloadErrors);
    var annotationCount = resolveCreateCountDefault(source, 'annotationCount', payloadErrors);

    var title = clean(source.title);
    if (!title || title.length < 2 || title.length > 120) {
      payloadErrors.push({ field: 'title', message: 'title must be 2-120 characters' });
    }

    if (payloadErrors.length) {
      throw new Error('screenSpecService: invalid create input: ' + payloadErrors.map(function (err) {
        return err.field + ' ' + err.message;
      }).join(', '));
    }

    var payload = {
      id: clean(source.id) || undefined,
      projectId: projectId,
      title: title,
      screenType: screenType,
      writeStatus: writeStatus,
      reviewStatus: reviewStatus,
      approvalStatus: approvalStatus,
      ownerId: clean(source.ownerId),
      ownerName: clean(source.ownerName),
      imageCount: imageCount,
      annotationCount: annotationCount,
      createdAt: t,
      createdBy: actor.uid,
      updatedAt: t,
      updatedBy: actor.uid,
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
      version: 1,
    };

    assignOptionalStrings(payload, source);
    LINK_FIELD_GROUPS.forEach(function (group) {
      assignLinkTriplet(payload, source, group.fields);
    });

    return payload;
  }

  function buildUpdatePatch(current, patch, context, clock) {
    var base = current || null;
    if (!base || !clean(base.id)) {
      throw new Error('screenSpecService: current record is required for update');
    }
    var version = Number(base.version);
    if (!Number.isInteger(version) || version < 1) {
      throw new Error('screenSpecService: current.version must be an integer >= 1');
    }

    var source = Object.assign({}, patch || {});
    assertValidInput(source, 'update');

    var actor = actorFromContext(context);
    var next = {};

    if (hasOwn(source, 'title')) next.title = clean(source.title);
    ['screenType', 'writeStatus', 'reviewStatus', 'approvalStatus'].forEach(function (field) {
      if (hasOwn(source, field)) next[field] = source[field];
    });
    if (hasOwn(source, 'ownerId')) next.ownerId = clean(source.ownerId);
    if (hasOwn(source, 'ownerName')) next.ownerName = clean(source.ownerName);

    OPTIONAL_STRING_FIELDS.forEach(function (field) {
      if (!hasOwn(source, field)) return;
      if (isOptionalClearSentinel(source[field])) {
        next[field] = '';
      } else {
        var value = validateOptionalString([], field, source[field], OPTIONAL_STRING_MAX[field]);
        if (value) next[field] = value;
      }
    });

    OPTIONAL_COUNT_FIELDS.forEach(function (field) {
      if (!hasOwn(source, field)) return;
      if (isOptionalClearSentinel(source[field])) {
        next[field] = '';
      } else {
        var count = normalizeCount(source[field]);
        if (!Number.isNaN(count) && count >= 0) next[field] = count;
      }
    });

    LINK_FIELD_GROUPS.forEach(function (group) {
      if (!hasAnyField(source, group.fields)) return;
      if (fieldsAllEmpty(source, group.fields)) {
        group.fields.forEach(function (field) { next[field] = ''; });
      } else if (fieldsAllNonEmpty(source, group.fields)) {
        group.fields.forEach(function (field) {
          next[field] = clean(source[field]);
        });
      }
    });

    next.updatedAt = nowIso(clock);
    next.updatedBy = actor.uid;
    next.version = version + 1;

    return next;
  }

  function normalizeScreenSpec(raw) {
    if (!raw) return null;
    var item = {
      id: clean(raw.id),
      projectId: clean(raw.projectId),
      code: clean(raw.code),
      title: clean(raw.title),
      screenType: normalizeEnumField('screenType', raw.screenType),
      writeStatus: normalizeEnumField('writeStatus', raw.writeStatus),
      reviewStatus: normalizeEnumField('reviewStatus', raw.reviewStatus),
      approvalStatus: normalizeEnumField('approvalStatus', raw.approvalStatus),
      ownerId: clean(raw.ownerId),
      ownerName: clean(raw.ownerName),
      imageCount: normalizeStoredCount(raw.imageCount, DEFAULT_IMAGE_COUNT),
      annotationCount: normalizeStoredCount(raw.annotationCount, DEFAULT_ANNOTATION_COUNT),
      createdAt: raw.createdAt || null,
      createdBy: clean(raw.createdBy),
      updatedAt: raw.updatedAt || null,
      updatedBy: clean(raw.updatedBy),
      deletedAt: raw.deletedAt || null,
      deletedBy: raw.deletedBy == null ? null : clean(raw.deletedBy),
      isDeleted: raw.isDeleted === true,
      version: normalizeStoredVersion(raw.version),
    };

    OPTIONAL_STRING_FIELDS.forEach(function (field) {
      if (raw[field] != null && clean(raw[field])) item[field] = clean(raw[field]);
    });

    LINK_FIELD_GROUPS.forEach(function (group) {
      if (group.fields.every(function (field) { return clean(raw[field]); })) {
        group.fields.forEach(function (field) {
          item[field] = clean(raw[field]);
        });
      }
    });

    return item;
  }

  function defaultAuthorize() {
    return Promise.resolve(false);
  }

  function normalizeMemberRole(role) {
    return clean(role).toLowerCase();
  }

  function canWriteScreenSpec(role) {
    return WRITE_ROLES.indexOf(normalizeMemberRole(role)) >= 0;
  }

  function canReadScreenSpec(role) {
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
      if (actionRequiresWrite(action)) {
        return canWriteScreenSpec(role);
      }
      if (action === ACTIONS.LIST || action === ACTIONS.READ) {
        return canReadScreenSpec(role);
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
    if (window.STAM && window.STAM.screenSpecFirestoreAdapter) {
      return window.STAM.screenSpecFirestoreAdapter.create();
    }
    throw new Error('screenSpecService: adapter is required');
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
        if (allowed !== true) throw new Error('screenSpecService: permission denied for ' + action);
        return true;
      });
    }

    function listByProject(projectId, query, context) {
      var pid = requireProjectId(projectId);
      var q = Object.assign({ includeDeleted: false }, query || {});
      return check(ACTIONS.LIST, pid, q, context).then(function () {
        return adapter.listByProject(pid, q);
      }).then(function (items) {
        return (items || []).map(normalizeScreenSpec).filter(Boolean);
      });
    }

    function getById(projectId, screenSpecId, context) {
      var pid = requireProjectId(projectId);
      var sid = requireScreenSpecId(screenSpecId);
      return check(ACTIONS.READ, pid, { id: sid }, context).then(function () {
        return adapter.getById(pid, sid);
      }).then(normalizeScreenSpec);
    }

    function create(projectId, input, context) {
      var pid = requireProjectId(projectId);
      var item = buildCreatePayload(Object.assign({}, input || {}, { projectId: pid }), context, clock);
      return check(ACTIONS.CREATE, pid, item, context).then(function () {
        return adapter.create(pid, item);
      }).then(function (saved) {
        return normalizeScreenSpec(saved || item);
      });
    }

    function update(projectId, screenSpecId, patch, context) {
      var pid = requireProjectId(projectId);
      var sid = requireScreenSpecId(screenSpecId);
      return check(ACTIONS.UPDATE, pid, { id: sid, patch: patch }, context).then(function () {
        return adapter.getById(pid, sid);
      }).then(function (currentRaw) {
        var current = normalizeScreenSpec(currentRaw);
        if (!current) throw new Error('screenSpecService: screen spec not found');
        var ctx = context || {};
        if (hasOwn(ctx, 'expectedVersion') && ctx.expectedVersion !== undefined && ctx.expectedVersion !== null && ctx.expectedVersion !== '') {
          var expectedVersion = normalizeCount(ctx.expectedVersion);
          if (Number.isNaN(expectedVersion) || expectedVersion !== current.version) {
            return Promise.reject(createServiceError(
              ERROR_CODES.UPDATE_VERSION_MISMATCH,
              'screenSpecService: update version mismatch'
            ));
          }
        }
        var nextPatch = buildUpdatePatch(current, patch, context, clock);
        return adapter.update(pid, sid, nextPatch);
      }).then(normalizeScreenSpec);
    }

    return {
      ACTIONS: ACTIONS,
      authorize: function (action, context) {
        return authorize(action, { action: action, context: context || {} });
      },
      listByProject: listByProject,
      getById: getById,
      create: create,
      update: update,
      normalizeScreenSpec: normalizeScreenSpec,
      validateScreenSpecInput: validateScreenSpecInput,
      buildCreatePayload: function (input, context) {
        return buildCreatePayload(input, context, clock);
      },
      buildUpdatePatch: function (current, patch, context) {
        return buildUpdatePatch(current, patch, context, clock);
      },
    };
  }

  window.STAM = window.STAM || {};
  window.STAM.screenSpecService = createService();
  window.STAM.screenSpecServiceContract = {
    ACTIONS: ACTIONS,
    ERROR_CODES: ERROR_CODES,
    WRITE_ROLES: WRITE_ROLES,
    READ_ROLES: READ_ROLES,
    SCREEN_TYPE_VALUES: SCREEN_TYPE_VALUES,
    WRITE_STATUS_VALUES: WRITE_STATUS_VALUES,
    REVIEW_STATUS_VALUES: REVIEW_STATUS_VALUES,
    APPROVAL_STATUS_VALUES: APPROVAL_STATUS_VALUES,
    FORBIDDEN_FIELDS: FORBIDDEN_FIELDS,
    createService: createService,
    normalizeScreenSpec: normalizeScreenSpec,
    validateScreenSpecInput: validateScreenSpecInput,
    buildCreatePayload: buildCreatePayload,
    buildUpdatePatch: buildUpdatePatch,
    normalizeMemberRole: normalizeMemberRole,
    canWriteScreenSpec: canWriteScreenSpec,
    canReadScreenSpec: canReadScreenSpec,
    createMemberRoleAuthorize: createMemberRoleAuthorize,
  };
}());
