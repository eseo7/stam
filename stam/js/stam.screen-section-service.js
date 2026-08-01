/* ============================================================================
 * STAM ScreenSection Domain Service Contract
 * ----------------------------------------------------------------------------
 * Domain-first service boundary for screenSections CRUD.
 * - Screens call this service, not Firestore paths.
 * - Firestore is injected through STAM.screenSectionFirestoreAdapter.
 * - No UI wiring and no automatic runtime write path are exposed by loading this file.
 * ========================================================================== */
(function () {
  'use strict';

  var ACTIONS = {
    LIST: 'screenSection.list',
    READ: 'screenSection.read',
    CREATE: 'screenSection.create',
    UPDATE: 'screenSection.update',
    DELETE: 'screenSection.delete',
  };

  var ERROR_CODES = {
    VALIDATION_FAILED: 'SCREEN_SECTION_VALIDATION_FAILED',
    PARENT_NOT_FOUND: 'SCREEN_SECTION_PARENT_NOT_FOUND',
    PARENT_PROJECT_MISMATCH: 'SCREEN_SECTION_PARENT_PROJECT_MISMATCH',
    NOT_FOUND: 'SCREEN_SECTION_NOT_FOUND',
    DUPLICATE_NAME: 'SCREEN_SECTION_DUPLICATE_NAME',
    IMMUTABLE_FIELD: 'SCREEN_SECTION_IMMUTABLE_FIELD',
    PERMISSION_DENIED: 'SCREEN_SECTION_PERMISSION_DENIED',
    CHILD_SECTIONS_EXIST: 'SCREEN_SECTION_CHILD_SECTIONS_EXIST',
    FIELDS_REFERENCE_SECTION: 'SCREEN_SECTION_FIELDS_REFERENCE_SECTION',
    ACTIONS_REFERENCE_SECTION: 'SCREEN_SECTION_ACTIONS_REFERENCE_SECTION',
    SECTION_PARENT_INVALID: 'SCREEN_SECTION_SECTION_PARENT_INVALID',
    SECTION_CYCLE: 'SCREEN_SECTION_SECTION_CYCLE',
  };

  var WRITE_ROLES = ['owner', 'admin', 'editor'];
  var READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];

  var LAYOUT_COLUMNS_VALUES = [1, 2, 3, 4, 6, 12];
  var LAYOUT_GAP_VALUES = ['none', 'sm', 'md', 'lg'];

  var NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{1,79}$/;
  var SCHEMA_VERSION = 1;

  var CREATE_FORBIDDEN_INPUT_FIELDS = [
    'id', 'projectId', 'schemaVersion', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy',
  ];

  var UPDATE_FORBIDDEN_INPUT_FIELDS = [
    'id', 'projectId', 'screenSpecId', 'schemaVersion', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy',
  ];

  function conditionContract() {
    return window.STAM && window.STAM.screenConditionContract;
  }

  function sectionTypeValues() {
    var contract = conditionContract();
    if (contract && contract.SECTION_TYPE_VALUES) {
      return contract.SECTION_TYPE_VALUES.slice();
    }
    return ['search', 'form', 'detail', 'table', 'card', 'tabs', 'tab', 'repeater', 'history', 'custom'];
  }

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

  function isPlainObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
  }

  function pushError(errors, field, message) {
    errors.push({ field: field, message: message });
  }

  function createServiceError(code, message, extra) {
    var err = new Error(message || ('screenSectionService: ' + code));
    err.code = code;
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        err[key] = extra[key];
      });
    }
    return err;
  }

  function requireProjectId(projectId) {
    var value = clean(projectId);
    if (!value) throw new Error('screenSectionService: projectId is required');
    return value;
  }

  function requireSectionId(sectionId) {
    var value = clean(sectionId);
    if (!value) throw new Error('screenSectionService: sectionId is required');
    return value;
  }

  function actorFromContext(context) {
    var ctx = context || {};
    var uid = clean(ctx.actorUid || ctx.uid || ctx.userId);
    if (!uid) throw new Error('screenSectionService: actorUid is required');
    return { uid: uid };
  }

  function normalizeName(name) {
    return clean(name).toLowerCase();
  }

  function normalizeCount(value) {
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

  function normalizeParentSectionId(value) {
    if (value === undefined) return undefined;
    if (isNull(value)) return null;
    var trimmed = clean(value);
    return trimmed || null;
  }

  function defaultLayout() {
    return {
      columns: 1,
      gap: 'md',
      collapsible: false,
      defaultCollapsed: false,
    };
  }

  function normalizeLayoutObject(layout) {
    var source = isPlainObject(layout) ? layout : {};
    var columns = source.columns !== undefined ? normalizeCount(source.columns) : 1;
    if (LAYOUT_COLUMNS_VALUES.indexOf(columns) < 0) {
      columns = 1;
    }
    var gap = clean(source.gap) || 'md';
    if (LAYOUT_GAP_VALUES.indexOf(gap) < 0) {
      gap = 'md';
    }
    var collapsible = source.collapsible === true;
    var defaultCollapsed = collapsible && source.defaultCollapsed === true;
    return {
      columns: columns,
      gap: gap,
      collapsible: collapsible,
      defaultCollapsed: defaultCollapsed,
    };
  }

  function validateName(errors, field, value, mode) {
    if (mode === 'create' && isAbsent(value)) {
      pushError(errors, field, field + ' is required');
      return undefined;
    }
    if (mode === 'update' && !hasOwn({ name: value }, 'name') && value === undefined) return undefined;
    if (hasOwn({ name: value }, 'name') || mode === 'create') {
      if (isNull(value)) {
        pushError(errors, field, field + ' cannot be null');
        return undefined;
      }
      var trimmed = clean(value);
      if (!trimmed) {
        pushError(errors, field, field + ' cannot be empty');
        return undefined;
      }
      if (!NAME_RE.test(trimmed)) {
        pushError(errors, field, field + ' format is invalid');
        return undefined;
      }
      return trimmed;
    }
    return undefined;
  }

  function validateLabel(errors, field, value, mode) {
    if (mode === 'create' && isAbsent(value)) {
      pushError(errors, field, field + ' is required');
      return undefined;
    }
    if (mode === 'update' && !hasOwn({ label: value }, 'label') && value === undefined) return undefined;
    if (isNull(value)) {
      pushError(errors, field, field + ' cannot be null');
      return undefined;
    }
    var trimmed = clean(value);
    if (!trimmed || trimmed.length < 1 || trimmed.length > 120) {
      pushError(errors, field, field + ' must be 1-120 characters');
      return undefined;
    }
    return trimmed;
  }

  function validateSectionType(errors, value, mode) {
    var allowed = sectionTypeValues();
    if (mode === 'create' && isAbsent(value)) {
      pushError(errors, 'sectionType', 'sectionType is required');
      return undefined;
    }
    if (mode === 'update' && value === undefined) return undefined;
    if (isNull(value)) {
      pushError(errors, 'sectionType', 'sectionType cannot be null');
      return undefined;
    }
    var normalized = clean(value);
    if (allowed.indexOf(normalized) < 0) {
      pushError(errors, 'sectionType', 'invalid sectionType value');
      return undefined;
    }
    return normalized;
  }

  function validateOrder(errors, value, mode) {
    if (value === undefined) return mode === 'create' ? 0 : undefined;
    if (isNull(value)) {
      pushError(errors, 'order', 'order cannot be null');
      return undefined;
    }
    var order = normalizeCount(value);
    if (Number.isNaN(order) || order < 0) {
      pushError(errors, 'order', 'order must be a non-negative integer');
      return undefined;
    }
    return order;
  }

  function validateOptionalString(errors, field, value, maxLen) {
    if (value === undefined) return undefined;
    if (isNull(value)) return null;
    if (typeof value !== 'string') {
      pushError(errors, field, field + ' must be a string or null');
      return undefined;
    }
    var trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.length > maxLen) {
      pushError(errors, field, field + ' length is invalid');
      return undefined;
    }
    return trimmed;
  }

  function validateLayout(errors, layout, mode) {
    if (mode === 'create' && layout === undefined) {
      return defaultLayout();
    }
    if (layout === undefined) return undefined;
    if (!isPlainObject(layout)) {
      pushError(errors, 'layout', 'layout must be an object');
      return undefined;
    }
    var normalized = {};
    var columns = layout.columns !== undefined ? normalizeCount(layout.columns) : 1;
    if (Number.isNaN(columns) || LAYOUT_COLUMNS_VALUES.indexOf(columns) < 0) {
      pushError(errors, 'layout.columns', 'layout.columns is invalid');
    } else {
      normalized.columns = columns;
    }
    var gap = clean(layout.gap) || 'md';
    if (LAYOUT_GAP_VALUES.indexOf(gap) < 0) {
      pushError(errors, 'layout.gap', 'layout.gap is invalid');
    } else {
      normalized.gap = gap;
    }
    if (layout.collapsible !== undefined && typeof layout.collapsible !== 'boolean') {
      pushError(errors, 'layout.collapsible', 'layout.collapsible must be a boolean');
    } else {
      normalized.collapsible = layout.collapsible === true;
    }
    if (layout.defaultCollapsed !== undefined && typeof layout.defaultCollapsed !== 'boolean') {
      pushError(errors, 'layout.defaultCollapsed', 'layout.defaultCollapsed must be a boolean');
    } else {
      normalized.defaultCollapsed = normalized.collapsible === true && layout.defaultCollapsed === true;
    }
    return normalized;
  }

  function validateParentSectionId(errors, value, sectionType, mode) {
    if (value === undefined && mode === 'create') {
      value = null;
    }
    if (value === undefined) return undefined;
    var normalized = normalizeParentSectionId(value);
    if (sectionType === 'tab' && !normalized) {
      pushError(errors, 'parentSectionId', 'parentSectionId is required for tab sections');
    }
    return normalized;
  }

  function validateTabParentRules(errors, sectionType, parentSectionType) {
    if (sectionType !== 'tab') return;
    if (parentSectionType !== 'tabs') {
      pushError(errors, 'parentSectionId', 'tab sections require a parent section with sectionType tabs');
    }
  }

  function validateVisibilityConditionShape(errors, value, fieldPrefix) {
    var contract = conditionContract();
    if (!contract) {
      if (value !== null && value !== undefined) {
        pushError(errors, fieldPrefix, 'screenConditionContract is required for visibilityCondition validation');
      }
      return value === undefined ? null : value;
    }
    if (value === undefined) return undefined;
    if (value === null) return null;
    var normalized = contract.normalizeConditionGroup(value);
    if (!contract.validateConditionGroupShape(normalized, errors, fieldPrefix, {})) {
      return undefined;
    }
    return normalized;
  }

  function validateVisibilityConditionReferences(errors, value, fieldIds, fieldPrefix) {
    var contract = conditionContract();
    if (!contract || value === null || value === undefined) return true;
    return contract.validateConditionReferences(value, { fieldIds: fieldIds }, errors, fieldPrefix);
  }

  function validateForbiddenFields(errors, source, mode) {
    if (mode === 'create') {
      CREATE_FORBIDDEN_INPUT_FIELDS.forEach(function (field) {
        if (hasOwn(source, field)) {
          pushError(errors, field, field + ' cannot be specified on create input');
        }
      });
    }
    if (mode === 'update') {
      UPDATE_FORBIDDEN_INPUT_FIELDS.forEach(function (field) {
        if (hasOwn(source, field)) {
          pushError(errors, field, field + ' cannot be specified on update input');
        }
      });
    }
  }

  function validateScreenSectionInput(input, mode) {
    var source = input || {};
    var m = clean(mode) || 'create';
    var errors = [];

    validateForbiddenFields(errors, source, m);

    if (m === 'update' && Object.keys(source).length === 0) {
      pushError(errors, 'patch', 'at least one field is required');
      return { valid: false, mode: m, errors: errors };
    }

    if (m === 'create') {
      if (!clean(source.screenSpecId)) {
        pushError(errors, 'screenSpecId', 'screenSpecId is required');
      }
      validateName(errors, 'name', source.name, 'create');
      validateLabel(errors, 'label', source.label, 'create');
      var createSectionType = validateSectionType(errors, source.sectionType, 'create');
      var createSectionTypeValue = createSectionType || clean(source.sectionType);
      validateParentSectionId(
        errors,
        hasOwn(source, 'parentSectionId') ? source.parentSectionId : null,
        createSectionTypeValue,
        'create'
      );
      validateOrder(errors, source.order, 'create');
      validateLayout(errors, source.layout, 'create');
      validateVisibilityConditionShape(
        errors,
        hasOwn(source, 'visibilityCondition') ? source.visibilityCondition : null,
        'visibilityCondition'
      );
      validateOptionalString(errors, 'description', hasOwn(source, 'description') ? source.description : null, 500);
      return { valid: errors.length === 0, mode: m, errors: errors };
    }

    if (hasOwn(source, 'name')) validateName(errors, 'name', source.name, 'update');
    if (hasOwn(source, 'label')) validateLabel(errors, 'label', source.label, 'update');
    if (hasOwn(source, 'sectionType')) validateSectionType(errors, source.sectionType, 'update');
    if (hasOwn(source, 'parentSectionId')) {
      validateParentSectionId(
        errors,
        source.parentSectionId,
        hasOwn(source, 'sectionType') ? clean(source.sectionType) : 'custom',
        'update'
      );
    }
    if (hasOwn(source, 'order')) validateOrder(errors, source.order, 'update');
    if (hasOwn(source, 'layout')) validateLayout(errors, source.layout, 'update');
    if (hasOwn(source, 'visibilityCondition')) {
      validateVisibilityConditionShape(errors, source.visibilityCondition, 'visibilityCondition');
    }
    if (hasOwn(source, 'description')) {
      validateOptionalString(errors, 'description', source.description, 500);
    }

    return { valid: errors.length === 0, mode: m, errors: errors };
  }

  function validateCompleteDocument(doc, context) {
    var input = doc || {};
    var errors = [];
    var ctx = context || {};
    var sectionType = validateSectionType(errors, input.sectionType, 'create');
    validateName(errors, 'name', input.name, 'create');
    validateLabel(errors, 'label', input.label, 'create');
    if (!clean(input.screenSpecId)) {
      pushError(errors, 'screenSpecId', 'screenSpecId is required');
    }
    var parentSectionId = validateParentSectionId(
      errors,
      hasOwn(input, 'parentSectionId') ? input.parentSectionId : null,
      sectionType || input.sectionType || 'custom',
      'create'
    );
    if (ctx.parentSectionType) {
      validateTabParentRules(errors, sectionType || input.sectionType, ctx.parentSectionType);
    } else if ((sectionType || input.sectionType) === 'tab' && !parentSectionId) {
      pushError(errors, 'parentSectionId', 'parentSectionId is required for tab sections');
    }
    validateOrder(errors, input.order, 'create');
    var layout = validateLayout(errors, input.layout, 'create');
    if (layout) {
      input.layout = layout;
    }
    var visibilityCondition = validateVisibilityConditionShape(
      errors,
      hasOwn(input, 'visibilityCondition') ? input.visibilityCondition : null,
      'visibilityCondition'
    );
    if (visibilityCondition !== undefined) {
      validateVisibilityConditionReferences(
        errors,
        visibilityCondition,
        ctx.fieldIds || [],
        'visibilityCondition'
      );
    }
    validateOptionalString(errors, 'description', hasOwn(input, 'description') ? input.description : null, 500);
    return { valid: errors.length === 0, errors: errors };
  }

  function assertValidInput(input, mode) {
    var result = validateScreenSectionInput(input, mode);
    if (!result.valid) {
      throw createServiceError(
        ERROR_CODES.VALIDATION_FAILED,
        'screenSectionService: invalid ' + result.mode + ' input',
        { errors: result.errors }
      );
    }
    return result;
  }

  function buildCreatePayload(input, context, clock) {
    var source = Object.assign({}, input || {});
    var actor = actorFromContext(context);
    var t = nowIso(clock);
    assertValidInput(source, 'create');

    var projectId = requireProjectId(clean((context && context.projectId) || source.projectId));
    var screenSpecId = clean(source.screenSpecId);
    var validation = validateScreenSectionInput(source, 'create');
    if (!validation.valid) {
      throw createServiceError(ERROR_CODES.VALIDATION_FAILED, 'screenSectionService: invalid create input', { errors: validation.errors });
    }

    var sectionType = clean(source.sectionType);
    var parentSectionId = hasOwn(source, 'parentSectionId')
      ? normalizeParentSectionId(source.parentSectionId)
      : null;
    var layout = normalizeLayoutObject(hasOwn(source, 'layout') ? source.layout : defaultLayout());
    var visibilityCondition = hasOwn(source, 'visibilityCondition')
      ? (conditionContract() ? conditionContract().normalizeConditionGroup(source.visibilityCondition) : source.visibilityCondition)
      : null;
    if (visibilityCondition === undefined) visibilityCondition = null;

    var draft = {
      projectId: projectId,
      screenSpecId: screenSpecId,
      name: clean(source.name),
      label: clean(source.label),
      sectionType: sectionType,
      parentSectionId: parentSectionId,
      order: hasOwn(source, 'order') ? validateOrder([], source.order, 'create') : 0,
      layout: layout,
      visibilityCondition: visibilityCondition,
      description: hasOwn(source, 'description')
        ? (source.description == null ? null : clean(source.description) || null)
        : null,
    };

    var createValidation = validateCompleteDocument(Object.assign({}, draft), context || {});
    if (!createValidation.valid) {
      throw createServiceError(ERROR_CODES.VALIDATION_FAILED, 'screenSectionService: invalid create input', { errors: createValidation.errors });
    }

    return Object.assign({}, draft, {
      schemaVersion: SCHEMA_VERSION,
      createdAt: t,
      createdBy: actor.uid,
      updatedAt: t,
      updatedBy: actor.uid,
    });
  }

  function applyUpdateStringNormalization(merged, source) {
    if (hasOwn(source, 'name')) merged.name = clean(source.name);
    if (hasOwn(source, 'label')) merged.label = clean(source.label);
    if (hasOwn(source, 'sectionType')) merged.sectionType = clean(source.sectionType);
    if (hasOwn(source, 'description')) {
      merged.description = source.description == null ? null : (clean(source.description) || null);
    }
  }

  function applyLayoutNormalization(merged, source, base) {
    if (hasOwn(source, 'layout')) {
      merged.layout = normalizeLayoutObject(Object.assign({}, (base && base.layout) || defaultLayout(), source.layout));
    } else {
      merged.layout = normalizeLayoutObject(merged.layout || defaultLayout());
    }
  }

  function applyParentSectionNormalization(merged, source) {
    if (hasOwn(source, 'parentSectionId')) {
      merged.parentSectionId = normalizeParentSectionId(source.parentSectionId);
    }
  }

  function applyVisibilityNormalization(merged, source) {
    if (!hasOwn(source, 'visibilityCondition')) return;
    var contract = conditionContract();
    if (!contract) {
      merged.visibilityCondition = source.visibilityCondition == null ? null : source.visibilityCondition;
      return;
    }
    merged.visibilityCondition = source.visibilityCondition == null
      ? null
      : contract.normalizeConditionGroup(source.visibilityCondition);
  }

  function buildUpdatePatch(current, patch, context, clock) {
    var base = current || null;
    if (!base || !clean(base.id)) {
      throw new Error('screenSectionService: current record is required for update');
    }
    var source = Object.assign({}, patch || {});
    assertValidInput(source, 'update');
    var actor = actorFromContext(context);
    var merged = Object.assign({}, base, source);

    applyParentSectionNormalization(merged, source);
    applyLayoutNormalization(merged, source, base);
    applyVisibilityNormalization(merged, source);
    applyUpdateStringNormalization(merged, source);
    applyLayoutNormalization(merged, source, base);

    var complete = validateCompleteDocument(merged, context || {});
    if (!complete.valid) {
      throw createServiceError(
        ERROR_CODES.VALIDATION_FAILED,
        'screenSectionService: invalid merged document after update',
        { errors: complete.errors }
      );
    }

    var next = {};
    ['name', 'label', 'sectionType', 'parentSectionId', 'order', 'layout', 'visibilityCondition', 'description'].forEach(function (field) {
      if (hasOwn(source, field)) next[field] = merged[field];
    });

    if (hasOwn(source, 'layout')) {
      next.layout = merged.layout;
    }

    next.updatedAt = nowIso(clock);
    next.updatedBy = actor.uid;
    return next;
  }

  function normalizeScreenSection(raw) {
    if (!raw) return null;
    var contract = conditionContract();
    var sectionType = clean(raw.sectionType);
    var allowed = sectionTypeValues();
    if (allowed.indexOf(sectionType) < 0) {
      sectionType = 'custom';
    }
    var visibilityCondition = raw.visibilityCondition == null
      ? null
      : (contract ? contract.normalizeConditionGroup(raw.visibilityCondition) : raw.visibilityCondition);

    return {
      id: clean(raw.id),
      projectId: clean(raw.projectId),
      screenSpecId: clean(raw.screenSpecId),
      name: clean(raw.name),
      label: clean(raw.label),
      sectionType: sectionType,
      parentSectionId: raw.parentSectionId == null ? null : (clean(raw.parentSectionId) || null),
      order: Number.isInteger(raw.order) && raw.order >= 0 ? raw.order : 0,
      layout: normalizeLayoutObject(raw.layout || defaultLayout()),
      visibilityCondition: visibilityCondition,
      description: raw.description == null ? null : clean(raw.description) || null,
      schemaVersion: raw.schemaVersion === 1 ? 1 : 1,
      createdAt: raw.createdAt || null,
      createdBy: clean(raw.createdBy),
      updatedAt: raw.updatedAt || null,
      updatedBy: clean(raw.updatedBy),
    };
  }

  function defaultAuthorize() {
    return Promise.resolve(false);
  }

  function normalizeMemberRole(role) {
    return clean(role).toLowerCase();
  }

  function canWriteScreenSection(role) {
    return WRITE_ROLES.indexOf(normalizeMemberRole(role)) >= 0;
  }

  function canReadScreenSection(role) {
    return READ_ROLES.indexOf(normalizeMemberRole(role)) >= 0;
  }

  function actionRequiresWrite(action) {
    return action === ACTIONS.CREATE || action === ACTIONS.UPDATE || action === ACTIONS.DELETE;
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
        return canWriteScreenSection(role);
      }
      if (action === ACTIONS.LIST || action === ACTIONS.READ) {
        return canReadScreenSection(role);
      }
      return false;
    };
  }

  function resolveAdapter(adapter) {
    if (adapter) return adapter;
    if (window.STAM && window.STAM.screenSectionFirestoreAdapter) {
      return window.STAM.screenSectionFirestoreAdapter.create();
    }
    throw new Error('screenSectionService: adapter is required');
  }

  function mapAdapterError(err) {
    if (!err || !err.code) return err;
    if (err.code === 'SCREEN_SECTION_PARENT_NOT_FOUND') {
      return createServiceError(ERROR_CODES.PARENT_NOT_FOUND, err.message);
    }
    if (err.code === 'SCREEN_SECTION_PARENT_PROJECT_MISMATCH') {
      return createServiceError(ERROR_CODES.PARENT_PROJECT_MISMATCH, err.message);
    }
    if (err.code === 'SCREEN_SECTION_DUPLICATE_NAME') {
      return createServiceError(ERROR_CODES.DUPLICATE_NAME, err.message);
    }
    if (err.code === 'SCREEN_SECTION_NOT_FOUND') {
      return createServiceError(ERROR_CODES.NOT_FOUND, err.message);
    }
    if (err.code === 'SCREEN_SECTION_IMMUTABLE_FIELD') {
      return createServiceError(ERROR_CODES.IMMUTABLE_FIELD, err.message);
    }
    if (err.code === 'SCREEN_SECTION_CHILD_SECTIONS_EXIST') {
      return createServiceError(ERROR_CODES.CHILD_SECTIONS_EXIST, err.message);
    }
    if (err.code === 'SCREEN_SECTION_FIELDS_REFERENCE_SECTION') {
      return createServiceError(ERROR_CODES.FIELDS_REFERENCE_SECTION, err.message);
    }
    if (err.code === 'SCREEN_SECTION_ACTIONS_REFERENCE_SECTION') {
      return createServiceError(ERROR_CODES.ACTIONS_REFERENCE_SECTION, err.message);
    }
    if (err.code === 'SCREEN_SECTION_SECTION_PARENT_INVALID') {
      return createServiceError(ERROR_CODES.SECTION_PARENT_INVALID, err.message);
    }
    if (err.code === 'SCREEN_SECTION_SECTION_CYCLE') {
      return createServiceError(ERROR_CODES.SECTION_CYCLE, err.message);
    }
    return err;
  }

  function rethrowAdapterError(err) {
    throw mapAdapterError(err);
  }

  function preflightDuplicateName(adapter, projectId, screenSpecId, name, excludeSectionId) {
    var normalized = normalizeName(name);
    return adapter.findDuplicateNormalizedName(projectId, screenSpecId, normalized, excludeSectionId).then(function (duplicateId) {
      if (duplicateId) {
        throw createServiceError(ERROR_CODES.DUPLICATE_NAME, 'screenSectionService: duplicate normalized name');
      }
    });
  }

  function sortSections(items, adapter) {
    var out = (items || []).slice();
    if (adapter && typeof adapter.compareScreenSections === 'function') {
      out.sort(adapter.compareScreenSections);
    }
    return out;
  }

  function listFieldIds(adapter, projectId, screenSpecId) {
    if (adapter && typeof adapter.listFieldIdsByScreenSpec === 'function') {
      return adapter.listFieldIdsByScreenSpec(projectId, screenSpecId);
    }
    return Promise.resolve([]);
  }

  function loadParentSection(adapter, projectId, parentSectionId) {
    if (!clean(parentSectionId)) return Promise.resolve(null);
    return adapter.getById(projectId, parentSectionId).then(function (raw) {
      return normalizeScreenSection(raw);
    });
  }

  function assertParentSectionValid(currentSectionId, screenSpecId, sectionType, parentSectionId, parentSection) {
    if (clean(parentSectionId) && !parentSection) {
      throw createServiceError(ERROR_CODES.SECTION_PARENT_INVALID, 'screenSectionService: parent section not found');
    }
    if (!parentSection) {
      if (sectionType === 'tab') {
        throw createServiceError(ERROR_CODES.SECTION_PARENT_INVALID, 'screenSectionService: tab sections require a parent section');
      }
      return;
    }
    if (parentSection.screenSpecId !== screenSpecId) {
      throw createServiceError(ERROR_CODES.SECTION_PARENT_INVALID, 'screenSectionService: parent section must belong to the same screenSpec');
    }
    if (currentSectionId && parentSection.id === currentSectionId) {
      throw createServiceError(ERROR_CODES.SECTION_CYCLE, 'screenSectionService: section cannot reference itself as parent');
    }
    if (sectionType === 'tab' && parentSection.sectionType !== 'tabs') {
      throw createServiceError(ERROR_CODES.SECTION_PARENT_INVALID, 'screenSectionService: tab sections require a tabs parent');
    }
  }

  function assertNoAncestorCycle(adapter, projectId, sectionId, parentSectionId, screenSpecId) {
    if (!clean(parentSectionId)) return Promise.resolve();
    if (parentSectionId === sectionId) {
      return Promise.reject(createServiceError(ERROR_CODES.SECTION_CYCLE, 'screenSectionService: section parent cycle detected'));
    }
    var visited = Object.create(null);
    var currentId = parentSectionId;

    function walk() {
      if (!currentId) return Promise.resolve();
      if (sectionId && currentId === sectionId) {
        return Promise.reject(createServiceError(ERROR_CODES.SECTION_CYCLE, 'screenSectionService: section parent cycle detected'));
      }
      if (visited[currentId]) {
        return Promise.reject(createServiceError(ERROR_CODES.SECTION_CYCLE, 'screenSectionService: section parent cycle detected'));
      }
      visited[currentId] = true;
      return adapter.getById(projectId, currentId).then(function (raw) {
        var section = normalizeScreenSection(raw);
        if (!section || section.screenSpecId !== screenSpecId) {
          throw createServiceError(ERROR_CODES.SECTION_PARENT_INVALID, 'screenSectionService: parent section is invalid');
        }
        currentId = section.parentSectionId;
        return walk();
      });
    }

    return walk();
  }

  function buildValidationContext(adapter, projectId, screenSpecId, parentSectionId, sectionType, sectionId) {
    return listFieldIds(adapter, projectId, screenSpecId).then(function (fieldIds) {
      return loadParentSection(adapter, projectId, parentSectionId).then(function (parentSection) {
        assertParentSectionValid(sectionId || '', screenSpecId, sectionType, parentSectionId, parentSection);
        return {
          fieldIds: fieldIds,
          parentSectionType: parentSection ? parentSection.sectionType : null,
        };
      });
    });
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
        if (allowed !== true) {
          throw createServiceError(ERROR_CODES.PERMISSION_DENIED, 'screenSectionService: permission denied for ' + action);
        }
        return true;
      });
    }

    function listByScreenSpec(projectId, screenSpecId, query, context) {
      var pid = requireProjectId(projectId);
      var sid = clean(screenSpecId);
      if (!sid) throw new Error('screenSectionService: screenSpecId is required');
      return check(ACTIONS.LIST, pid, { screenSpecId: sid, query: query }, context).then(function () {
        return adapter.listByScreenSpec(pid, sid, query);
      }).then(function (items) {
        return sortSections(items, adapter).map(normalizeScreenSection).filter(Boolean);
      });
    }

    function listByProject(projectId, query, context) {
      var pid = requireProjectId(projectId);
      return check(ACTIONS.LIST, pid, query, context).then(function () {
        return adapter.listByProject(pid, query);
      }).then(function (items) {
        return sortSections(items, adapter).map(normalizeScreenSection).filter(Boolean);
      });
    }

    function getById(projectId, sectionId, context) {
      var pid = requireProjectId(projectId);
      var sid = requireSectionId(sectionId);
      return check(ACTIONS.READ, pid, { id: sid }, context).then(function () {
        return adapter.getById(pid, sid);
      }).then(function (raw) {
        return normalizeScreenSection(raw);
      });
    }

    function create(projectId, input, context) {
      var pid = requireProjectId(projectId);
      var ctx = Object.assign({}, context || {}, { projectId: pid });
      var source = Object.assign({}, input || {});
      var sectionType = clean(source.sectionType);
      var parentSectionId = hasOwn(source, 'parentSectionId')
        ? normalizeParentSectionId(source.parentSectionId)
        : null;
      var screenSpecId = clean(source.screenSpecId);

      return buildValidationContext(adapter, pid, screenSpecId, parentSectionId, sectionType).then(function (validationContext) {
        var item = buildCreatePayload(source, Object.assign({}, ctx, validationContext), clock);
        return check(ACTIONS.CREATE, pid, item, context).then(function () {
          return preflightDuplicateName(adapter, pid, item.screenSpecId, item.name);
        }).then(function () {
          return assertNoAncestorCycle(adapter, pid, '', item.parentSectionId, item.screenSpecId);
        }).then(function () {
          return adapter.create(pid, item);
        }).then(function (saved) {
          return normalizeScreenSection(saved || item);
        });
      }).catch(rethrowAdapterError);
    }

    function update(projectId, sectionId, patch, context) {
      var pid = requireProjectId(projectId);
      var sid = requireSectionId(sectionId);
      return check(ACTIONS.UPDATE, pid, { id: sid, patch: patch }, context).then(function () {
        return adapter.getById(pid, sid);
      }).then(function (currentRaw) {
        var current = normalizeScreenSection(currentRaw);
        if (!current) {
          throw createServiceError(ERROR_CODES.NOT_FOUND, 'screenSectionService: screen section not found');
        }
        var nextParentSectionId = hasOwn(patch || {}, 'parentSectionId')
          ? normalizeParentSectionId(patch.parentSectionId)
          : current.parentSectionId;
        var nextSectionType = hasOwn(patch || {}, 'sectionType') ? clean(patch.sectionType) : current.sectionType;

        return buildValidationContext(
          adapter,
          pid,
          current.screenSpecId,
          nextParentSectionId,
          nextSectionType,
          sid
        ).then(function (validationContext) {
          return assertNoAncestorCycle(adapter, pid, sid, nextParentSectionId, current.screenSpecId).then(function () {
            var nextPatch = buildUpdatePatch(current, patch, Object.assign({}, context, validationContext), clock);
            if (hasOwn(patch, 'name') && normalizeName(patch.name) !== normalizeName(current.name)) {
              return preflightDuplicateName(adapter, pid, current.screenSpecId, patch.name, sid).then(function () {
                return adapter.update(pid, sid, nextPatch);
              });
            }
            return adapter.update(pid, sid, nextPatch);
          });
        });
      }).then(normalizeScreenSection).catch(rethrowAdapterError);
    }

    function deleteSection(projectId, sectionId, context) {
      var pid = requireProjectId(projectId);
      var sid = requireSectionId(sectionId);
      return check(ACTIONS.DELETE, pid, { id: sid }, context).then(function () {
        return adapter.getById(pid, sid);
      }).then(function (currentRaw) {
        var current = normalizeScreenSection(currentRaw);
        if (!current) {
          throw createServiceError(ERROR_CODES.NOT_FOUND, 'screenSectionService: screen section not found');
        }
        var childCountPromise = typeof adapter.countChildSections === 'function'
          ? adapter.countChildSections(pid, current.screenSpecId, sid)
          : Promise.resolve(0);
        var fieldCountPromise = typeof adapter.countFieldsReferencingSection === 'function'
          ? adapter.countFieldsReferencingSection(pid, current.screenSpecId, sid)
          : Promise.resolve(0);
        var actionCountPromise = typeof adapter.countActionsReferencingSection === 'function'
          ? adapter.countActionsReferencingSection(pid, current.screenSpecId, sid)
          : Promise.resolve(0);

        return Promise.all([childCountPromise, fieldCountPromise, actionCountPromise]).then(function (counts) {
          if (counts[0] > 0) {
            throw createServiceError(ERROR_CODES.CHILD_SECTIONS_EXIST, 'screenSectionService: child sections exist');
          }
          if (counts[1] > 0) {
            throw createServiceError(ERROR_CODES.FIELDS_REFERENCE_SECTION, 'screenSectionService: fields reference section');
          }
          if (counts[2] > 0) {
            throw createServiceError(ERROR_CODES.ACTIONS_REFERENCE_SECTION, 'screenSectionService: actions reference section');
          }
          return adapter.delete(pid, sid);
        });
      }).catch(rethrowAdapterError);
    }

    return {
      ACTIONS: ACTIONS,
      ERROR_CODES: ERROR_CODES,
      authorize: function (action, context) {
        return authorize(action, { action: action, context: context || {} });
      },
      listByScreenSpec: listByScreenSpec,
      listByProject: listByProject,
      getById: getById,
      create: create,
      update: update,
      delete: deleteSection,
      normalizeScreenSection: normalizeScreenSection,
      validateScreenSectionInput: validateScreenSectionInput,
      buildCreatePayload: function (input, context) {
        return buildCreatePayload(input, context, clock);
      },
      buildUpdatePatch: function (current, patch, context) {
        return buildUpdatePatch(current, patch, context, clock);
      },
      normalizeName: normalizeName,
    };
  }

  window.STAM = window.STAM || {};
  window.STAM.screenSectionService = createService();
  window.STAM.screenSectionServiceContract = {
    ACTIONS: ACTIONS,
    ERROR_CODES: ERROR_CODES,
    WRITE_ROLES: WRITE_ROLES,
    READ_ROLES: READ_ROLES,
    SECTION_TYPE_VALUES: sectionTypeValues(),
    LAYOUT_COLUMNS_VALUES: LAYOUT_COLUMNS_VALUES,
    LAYOUT_GAP_VALUES: LAYOUT_GAP_VALUES,
    NAME_RE: NAME_RE,
    SCHEMA_VERSION: SCHEMA_VERSION,
    CREATE_FORBIDDEN_INPUT_FIELDS: CREATE_FORBIDDEN_INPUT_FIELDS,
    UPDATE_FORBIDDEN_INPUT_FIELDS: UPDATE_FORBIDDEN_INPUT_FIELDS,
    createService: createService,
    normalizeScreenSection: normalizeScreenSection,
    validateScreenSectionInput: validateScreenSectionInput,
    validateCompleteDocument: validateCompleteDocument,
    buildCreatePayload: buildCreatePayload,
    buildUpdatePatch: buildUpdatePatch,
    normalizeName: normalizeName,
    normalizeLayoutObject: normalizeLayoutObject,
    normalizeParentSectionId: normalizeParentSectionId,
    normalizeMemberRole: normalizeMemberRole,
    canWriteScreenSection: canWriteScreenSection,
    canReadScreenSection: canReadScreenSection,
    createMemberRoleAuthorize: createMemberRoleAuthorize,
    mapAdapterError: mapAdapterError,
  };
}());
