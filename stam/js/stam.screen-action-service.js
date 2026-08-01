/* ============================================================================
 * STAM ScreenAction Domain Service Contract
 * ----------------------------------------------------------------------------
 * Domain-first service boundary for screenActions CRUD.
 * - Screens call this service, not Firestore paths.
 * - Firestore is injected through STAM.screenActionFirestoreAdapter.
 * - No UI wiring and no automatic runtime write path are exposed by loading this file.
 * ========================================================================== */
(function () {
  'use strict';

  var ACTIONS = {
    LIST: 'screenAction.list',
    READ: 'screenAction.read',
    CREATE: 'screenAction.create',
    UPDATE: 'screenAction.update',
    DELETE: 'screenAction.delete',
  };

  var ERROR_CODES = {
    VALIDATION_FAILED: 'SCREEN_ACTION_VALIDATION_FAILED',
    PARENT_NOT_FOUND: 'SCREEN_ACTION_PARENT_NOT_FOUND',
    PARENT_PROJECT_MISMATCH: 'SCREEN_ACTION_PARENT_PROJECT_MISMATCH',
    TARGET_NOT_FOUND: 'SCREEN_ACTION_TARGET_NOT_FOUND',
    TARGET_PROJECT_MISMATCH: 'SCREEN_ACTION_TARGET_PROJECT_MISMATCH',
    NOT_FOUND: 'SCREEN_ACTION_NOT_FOUND',
    DUPLICATE_NAME: 'SCREEN_ACTION_DUPLICATE_NAME',
    IMMUTABLE_FIELD: 'SCREEN_ACTION_IMMUTABLE_FIELD',
    PERMISSION_DENIED: 'SCREEN_ACTION_PERMISSION_DENIED',
    TARGET_CONSTRAINT: 'SCREEN_ACTION_TARGET_CONSTRAINT',
    SECTION_NOT_FOUND: 'SCREEN_ACTION_SECTION_NOT_FOUND',
    SECTION_SPEC_MISMATCH: 'SCREEN_ACTION_SECTION_SPEC_MISMATCH',
    ADAPTER_DEPENDENCY_MISSING: 'SCREEN_ACTION_ADAPTER_DEPENDENCY_MISSING',
  };

  var DEFAULT_LAYOUT = { row: null, column: null, span: 12 };

  function compositionContract() {
    return window.STAM && window.STAM.screenConditionContract;
  }

  function normalizeSectionId(value) {
    if (value === undefined || value === null) return null;
    var trimmed = clean(value);
    return trimmed || null;
  }

  function normalizeLayoutForRead(raw) {
    var contract = compositionContract();
    if (contract && contract.normalizeLayoutGridForRead) {
      return contract.normalizeLayoutGridForRead(raw);
    }
    return Object.assign({}, DEFAULT_LAYOUT);
  }

  function normalizeCompositionFieldsForWrite(source, errors) {
    var contract = compositionContract();
    var input = source || {};
    var composition = {
      sectionId: normalizeSectionId(input.sectionId),
      layout: null,
      visibilityCondition: contract && contract.normalizeConditionGroup
        ? contract.normalizeConditionGroup(input.visibilityCondition)
        : (input.visibilityCondition || null),
      enabledCondition: contract && contract.normalizeConditionGroup
        ? contract.normalizeConditionGroup(input.enabledCondition)
        : (input.enabledCondition || null),
    };

    if (contract && contract.normalizeLayoutGridForWrite) {
      if (!hasOwn(input, 'layout')) {
        composition.layout = Object.assign({}, DEFAULT_LAYOUT);
      } else {
        var layout = contract.normalizeLayoutGridForWrite(input.layout, errors, 'layout');
        composition.layout = layout === undefined ? undefined : layout;
      }
    } else {
      composition.layout = hasOwn(input, 'layout') ? input.layout : Object.assign({}, DEFAULT_LAYOUT);
    }

    return composition;
  }

  function validateCompositionFields(doc, context, errors) {
    var writeErrors = [];
    var composition = normalizeCompositionFieldsForWrite(doc, writeErrors);
    writeErrors.forEach(function (entry) {
      errors.push(entry);
    });
    if (writeErrors.length) return composition;

    var contract = compositionContract();
    if (!contract) return composition;

    var sectionsById = (context && context.sectionsById) || {};
    if (composition.sectionId) {
      var section = sectionsById[composition.sectionId];
      if (!section) {
        pushError(errors, 'sectionId', 'section not found');
      } else if (clean(section.screenSpecId) !== clean(doc.screenSpecId)) {
        pushError(errors, 'sectionId', 'section screenSpecId mismatch');
      }
    }

    var fieldIds = (context && context.fieldIds) || [];
    var condCtx = { screenSpecId: doc.screenSpecId, fieldIds: fieldIds };
    ['visibilityCondition', 'enabledCondition'].forEach(function (key) {
      if (composition[key] && contract.validateConditionGroup) {
        contract.validateConditionGroup(composition[key], condCtx, errors, key);
      }
    });

    return composition;
  }

  var WRITE_ROLES = ['owner', 'admin', 'editor'];
  var READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];

  var ACTION_TYPE_VALUES = [
    'navigate', 'submit', 'save', 'cancel', 'delete', 'openDrawer', 'closeDrawer', 'download', 'custom',
  ];

  var CONTROL_TYPE_VALUES = ['button', 'link', 'icon', 'menuItem'];

  var PLACEMENT_VALUES = ['header', 'toolbar', 'form', 'tableRow', 'footer', 'inline'];

  var VARIANT_VALUES = ['primary', 'secondary', 'tertiary', 'danger', 'text'];

  var NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{1,79}$/;
  var SCHEMA_VERSION = 1;

  var CREATE_FORBIDDEN_INPUT_FIELDS = [
    'id', 'projectId', 'schemaVersion', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy',
  ];

  var UPDATE_FORBIDDEN_INPUT_FIELDS = [
    'id', 'projectId', 'screenSpecId', 'schemaVersion', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy',
  ];

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

  function pushError(errors, field, message) {
    errors.push({ field: field, message: message });
  }

  function createServiceError(code, message, extra) {
    var err = new Error(message || ('screenActionService: ' + code));
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
    if (!value) throw new Error('screenActionService: projectId is required');
    return value;
  }

  function requireActionId(actionId) {
    var value = clean(actionId);
    if (!value) throw new Error('screenActionService: actionId is required');
    return value;
  }

  function actorFromContext(context) {
    var ctx = context || {};
    var uid = clean(ctx.actorUid || ctx.uid || ctx.userId);
    if (!uid) throw new Error('screenActionService: actorUid is required');
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

  function validateEnumField(errors, field, value, allowed, mode, required) {
    if (mode === 'create' && required && isAbsent(value)) {
      pushError(errors, field, field + ' is required');
      return undefined;
    }
    if (mode === 'update' && value === undefined) return undefined;
    if (isNull(value)) {
      pushError(errors, field, field + ' cannot be null');
      return undefined;
    }
    var normalized = clean(value);
    if (allowed.indexOf(normalized) < 0) {
      pushError(errors, field, 'invalid ' + field + ' value');
      return undefined;
    }
    return normalized;
  }

  function validateActionType(errors, value, mode) {
    return validateEnumField(errors, 'actionType', value, ACTION_TYPE_VALUES, mode, true);
  }

  function validateControlType(errors, value, mode) {
    if (mode === 'create' && isAbsent(value)) return 'button';
    return validateEnumField(errors, 'controlType', value, CONTROL_TYPE_VALUES, mode, false) || (mode === 'create' ? 'button' : undefined);
  }

  function validatePlacement(errors, value, mode) {
    if (mode === 'create' && isAbsent(value)) return 'toolbar';
    return validateEnumField(errors, 'placement', value, PLACEMENT_VALUES, mode, false) || (mode === 'create' ? 'toolbar' : undefined);
  }

  function validateVariant(errors, value, mode) {
    if (mode === 'create' && isAbsent(value)) return 'secondary';
    return validateEnumField(errors, 'variant', value, VARIANT_VALUES, mode, false) || (mode === 'create' ? 'secondary' : undefined);
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

  function validateBooleanField(errors, field, value, defaultValue) {
    if (value === undefined) return defaultValue;
    if (typeof value !== 'boolean') {
      pushError(errors, field, field + ' must be a boolean');
      return defaultValue;
    }
    return value;
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

  function validateRequiredString(errors, field, value, maxLen) {
    if (isNull(value) || value === undefined) {
      pushError(errors, field, field + ' is required');
      return undefined;
    }
    if (typeof value !== 'string') {
      pushError(errors, field, field + ' must be a string');
      return undefined;
    }
    var trimmed = value.trim();
    if (!trimmed) {
      pushError(errors, field, field + ' cannot be empty');
      return undefined;
    }
    if (trimmed.length > maxLen) {
      pushError(errors, field, field + ' length is invalid');
      return undefined;
    }
    return trimmed;
  }

  function normalizeTargetScreenSpecId(value) {
    if (value === undefined) return undefined;
    if (isNull(value)) return null;
    var trimmed = clean(value);
    return trimmed || null;
  }

  function validateTargetScreenSpecId(errors, value, actionType) {
    var normalized = normalizeTargetScreenSpecId(value);

    if (actionType === 'navigate') {
      if (!normalized) {
        pushError(errors, 'targetScreenSpecId', 'targetScreenSpecId is required for navigate actions');
        return undefined;
      }
      return normalized;
    }

    if (actionType === 'openDrawer') {
      if (value === undefined) return undefined;
      return normalized;
    }

    if (normalized) {
      pushError(errors, 'targetScreenSpecId', 'targetScreenSpecId must be null for action type ' + actionType);
      return undefined;
    }
    return null;
  }

  function validateConfirmFields(errors, confirmRequired, confirmTitle, confirmMessage, mode, source) {
    var required = confirmRequired === true;

    if (!required) {
      if (hasOwn(source, 'confirmTitle') && confirmTitle !== null && clean(confirmTitle)) {
        pushError(errors, 'confirmTitle', 'confirmTitle must be null when confirmRequired is false');
      }
      if (hasOwn(source, 'confirmMessage') && confirmMessage !== null && clean(confirmMessage)) {
        pushError(errors, 'confirmMessage', 'confirmMessage must be null when confirmRequired is false');
      }
      return { confirmTitle: null, confirmMessage: null };
    }

    var title = validateOptionalString(errors, 'confirmTitle', confirmTitle, 120);
    var message;
    if (mode === 'create' || hasOwn(source, 'confirmMessage')) {
      message = validateRequiredString(errors, 'confirmMessage', confirmMessage, 500);
    } else if (confirmRequired === true && !hasOwn(source, 'confirmMessage')) {
      pushError(errors, 'confirmMessage', 'confirmMessage is required when confirmRequired is true');
      message = undefined;
    } else {
      message = validateOptionalString(errors, 'confirmMessage', confirmMessage, 500);
    }

    return { confirmTitle: title === undefined ? null : title, confirmMessage: message };
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

  function resolveActionType(source, mode, fallback) {
    if (hasOwn(source, 'actionType')) return clean(source.actionType) || fallback;
    return mode === 'create' ? fallback : (fallback || '');
  }

  function validateScreenActionInput(input, mode) {
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
      var createActionType = validateActionType(errors, source.actionType, 'create');
      validateControlType(errors, source.controlType, 'create');
      validatePlacement(errors, source.placement, 'create');
      validateVariant(errors, source.variant, 'create');
      validateOrder(errors, source.order, 'create');
      var disabled = validateBooleanField(errors, 'disabled', source.disabled, false);
      var confirmRequired = validateBooleanField(errors, 'confirmRequired', source.confirmRequired, false);
      validateTargetScreenSpecId(
        errors,
        hasOwn(source, 'targetScreenSpecId') ? source.targetScreenSpecId : undefined,
        createActionType || 'custom'
      );
      validateConfirmFields(
        errors,
        confirmRequired,
        hasOwn(source, 'confirmTitle') ? source.confirmTitle : null,
        hasOwn(source, 'confirmMessage') ? source.confirmMessage : null,
        'create',
        source
      );
      validateOptionalString(errors, 'successMessage', source.successMessage, 500);
      return { valid: errors.length === 0, mode: m, errors: errors };
    }

    if (hasOwn(source, 'name')) validateName(errors, 'name', source.name, 'update');
    if (hasOwn(source, 'label')) validateLabel(errors, 'label', source.label, 'update');
    if (hasOwn(source, 'actionType')) validateActionType(errors, source.actionType, 'update');
    if (hasOwn(source, 'controlType')) validateControlType(errors, source.controlType, 'update');
    if (hasOwn(source, 'placement')) validatePlacement(errors, source.placement, 'update');
    if (hasOwn(source, 'variant')) validateVariant(errors, source.variant, 'update');
    if (hasOwn(source, 'order')) validateOrder(errors, source.order, 'update');
    if (hasOwn(source, 'disabled') && typeof source.disabled !== 'boolean') {
      pushError(errors, 'disabled', 'disabled must be a boolean');
    }
    if (hasOwn(source, 'confirmRequired') && typeof source.confirmRequired !== 'boolean') {
      pushError(errors, 'confirmRequired', 'confirmRequired must be a boolean');
    }
    if (hasOwn(source, 'targetScreenSpecId') || hasOwn(source, 'actionType')) {
      var updateActionType = resolveActionType(source, 'update', 'custom');
      validateTargetScreenSpecId(
        errors,
        hasOwn(source, 'targetScreenSpecId') ? source.targetScreenSpecId : undefined,
        updateActionType
      );
    }
    if (hasOwn(source, 'confirmRequired') || hasOwn(source, 'confirmTitle') || hasOwn(source, 'confirmMessage')) {
      var patchConfirmRequired = hasOwn(source, 'confirmRequired') ? source.confirmRequired === true : undefined;
      validateConfirmFields(
        errors,
        patchConfirmRequired,
        hasOwn(source, 'confirmTitle') ? source.confirmTitle : undefined,
        hasOwn(source, 'confirmMessage') ? source.confirmMessage : undefined,
        'update',
        source
      );
    }
    if (hasOwn(source, 'successMessage')) {
      validateOptionalString(errors, 'successMessage', source.successMessage, 500);
    }

    return { valid: errors.length === 0, mode: m, errors: errors };
  }

  function validateCompleteDocument(doc, context) {
    var input = doc || {};
    var errors = [];
    var actionType = validateActionType(errors, input.actionType, 'create');
    validateName(errors, 'name', input.name, 'create');
    validateLabel(errors, 'label', input.label, 'create');
    if (!clean(input.screenSpecId)) {
      pushError(errors, 'screenSpecId', 'screenSpecId is required');
    }
    validateControlType(errors, input.controlType, 'create');
    validatePlacement(errors, input.placement, 'create');
    validateVariant(errors, input.variant, 'create');
    validateOrder(errors, input.order, 'create');
    var disabled = validateBooleanField(errors, 'disabled', input.disabled, false);
    var confirmRequired = validateBooleanField(errors, 'confirmRequired', input.confirmRequired, false);
    validateTargetScreenSpecId(
      errors,
      hasOwn(input, 'targetScreenSpecId') ? input.targetScreenSpecId : null,
      actionType || input.actionType || 'custom'
    );
    validateConfirmFields(
      errors,
      confirmRequired,
      hasOwn(input, 'confirmTitle') ? input.confirmTitle : null,
      hasOwn(input, 'confirmMessage') ? input.confirmMessage : null,
      'create',
      input
    );
    validateOptionalString(errors, 'successMessage', input.successMessage, 500);
    validateCompositionFields(input, context || {}, errors);
    return { valid: errors.length === 0, errors: errors };
  }

  function assertValidInput(input, mode) {
    var result = validateScreenActionInput(input, mode);
    if (!result.valid) {
      throw createServiceError(
        ERROR_CODES.VALIDATION_FAILED,
        'screenActionService: invalid ' + result.mode + ' input',
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
    var name = clean(source.name);
    var label = clean(source.label);
    var validation = validateScreenActionInput(source, 'create');
    if (!validation.valid) {
      throw createServiceError(ERROR_CODES.VALIDATION_FAILED, 'screenActionService: invalid create input', { errors: validation.errors });
    }

    var createValidation = validateCompleteDocument(Object.assign({}, source, { projectId: projectId, screenSpecId: screenSpecId }), context);
    if (!createValidation.valid) {
      throw createServiceError(ERROR_CODES.VALIDATION_FAILED, 'screenActionService: invalid create input', { errors: createValidation.errors });
    }

    var compositionErrors = [];
    var composition = normalizeCompositionFieldsForWrite(source, compositionErrors);
    if (compositionErrors.length) {
      throw createServiceError(ERROR_CODES.VALIDATION_FAILED, 'screenActionService: invalid create input', { errors: compositionErrors });
    }

    var actionType = clean(source.actionType);
    var confirmRequired = source.confirmRequired === true;
    var confirmTitle = null;
    var confirmMessage = null;
    if (confirmRequired) {
      confirmTitle = hasOwn(source, 'confirmTitle') ? (validateOptionalString([], 'confirmTitle', source.confirmTitle, 120) || null) : null;
      confirmMessage = validateRequiredString([], 'confirmMessage', source.confirmMessage, 500);
    }

    var targetScreenSpecId = null;
    if (actionType === 'navigate') {
      targetScreenSpecId = clean(source.targetScreenSpecId);
    } else if (actionType === 'openDrawer') {
      targetScreenSpecId = hasOwn(source, 'targetScreenSpecId')
        ? normalizeTargetScreenSpecId(source.targetScreenSpecId)
        : null;
    }

    return {
      projectId: projectId,
      screenSpecId: screenSpecId,
      order: hasOwn(source, 'order') ? validateOrder([], source.order, 'create') : 0,
      name: name,
      label: label,
      actionType: actionType,
      controlType: hasOwn(source, 'controlType') ? clean(source.controlType) : 'button',
      placement: hasOwn(source, 'placement') ? clean(source.placement) : 'toolbar',
      variant: hasOwn(source, 'variant') ? clean(source.variant) : 'secondary',
      disabled: source.disabled === true,
      confirmRequired: confirmRequired,
      confirmTitle: confirmTitle,
      confirmMessage: confirmMessage,
      successMessage: hasOwn(source, 'successMessage')
        ? (source.successMessage == null ? null : clean(source.successMessage) || null)
        : null,
      targetScreenSpecId: targetScreenSpecId,
      sectionId: composition.sectionId,
      layout: composition.layout,
      visibilityCondition: composition.visibilityCondition,
      enabledCondition: composition.enabledCondition,
      schemaVersion: SCHEMA_VERSION,
      createdAt: t,
      createdBy: actor.uid,
      updatedAt: t,
      updatedBy: actor.uid,
    };
  }

  function applyActionTypeTargetNormalization(merged) {
    var actionType = clean(merged.actionType);
    if (actionType === 'navigate') {
      merged.targetScreenSpecId = normalizeTargetScreenSpecId(merged.targetScreenSpecId);
    } else if (actionType === 'openDrawer') {
      merged.targetScreenSpecId = merged.targetScreenSpecId == null
        ? null
        : normalizeTargetScreenSpecId(merged.targetScreenSpecId);
    } else {
      merged.targetScreenSpecId = null;
    }
  }

  function applyConfirmNormalization(merged) {
    if (merged.confirmRequired !== true) {
      merged.confirmTitle = null;
      merged.confirmMessage = null;
    }
  }

  function applyUpdateStringNormalization(merged, source) {
    if (hasOwn(source, 'name')) merged.name = clean(source.name);
    if (hasOwn(source, 'label')) merged.label = clean(source.label);
    if (hasOwn(source, 'actionType')) merged.actionType = clean(source.actionType);
    if (hasOwn(source, 'controlType')) merged.controlType = clean(source.controlType);
    if (hasOwn(source, 'placement')) merged.placement = clean(source.placement);
    if (hasOwn(source, 'variant')) merged.variant = clean(source.variant);
    if (hasOwn(source, 'confirmTitle')) {
      merged.confirmTitle = source.confirmTitle == null ? null : (clean(source.confirmTitle) || null);
    }
    if (hasOwn(source, 'confirmMessage')) {
      merged.confirmMessage = source.confirmMessage == null ? null : clean(source.confirmMessage);
    }
    if (hasOwn(source, 'successMessage')) {
      merged.successMessage = source.successMessage == null ? null : (clean(source.successMessage) || null);
    }
    if (hasOwn(source, 'targetScreenSpecId')) {
      merged.targetScreenSpecId = normalizeTargetScreenSpecId(source.targetScreenSpecId);
    }
  }

  function buildUpdatePatch(current, patch, context, clock) {
    var base = current || null;
    if (!base || !clean(base.id)) {
      throw new Error('screenActionService: current record is required for update');
    }
    var source = Object.assign({}, patch || {});
    assertValidInput(source, 'update');
    var actor = actorFromContext(context);
    var merged = Object.assign({}, base, source);

    applyActionTypeTargetNormalization(merged);
    applyConfirmNormalization(merged);
    applyUpdateStringNormalization(merged, source);
    applyActionTypeTargetNormalization(merged);

    var compositionErrors = [];
    var composition = normalizeCompositionFieldsForWrite(merged, compositionErrors);
    if (compositionErrors.length) {
      throw createServiceError(
        ERROR_CODES.VALIDATION_FAILED,
        'screenActionService: invalid merged document after update',
        { errors: compositionErrors }
      );
    }
    Object.assign(merged, composition);
    if (hasOwn(source, 'name')) merged.name = clean(source.name);
    if (hasOwn(source, 'label')) merged.label = clean(source.label);

    var complete = validateCompleteDocument(merged, context);
    if (!complete.valid) {
      throw createServiceError(
        ERROR_CODES.VALIDATION_FAILED,
        'screenActionService: invalid merged document after update',
        { errors: complete.errors }
      );
    }

    var next = {};
    [
      'name', 'label', 'actionType', 'controlType', 'placement', 'variant', 'order',
      'disabled', 'confirmRequired', 'confirmTitle', 'confirmMessage', 'successMessage', 'targetScreenSpecId',
      'sectionId', 'layout', 'visibilityCondition', 'enabledCondition',
    ].forEach(function (field) {
      if (hasOwn(source, field)) next[field] = merged[field];
    });

    if (hasOwn(source, 'actionType') && merged.targetScreenSpecId !== base.targetScreenSpecId) {
      next.targetScreenSpecId = merged.targetScreenSpecId;
    }

    if (hasOwn(source, 'confirmRequired')) {
      next.confirmRequired = merged.confirmRequired === true;
      if (merged.confirmRequired !== true) {
        next.confirmTitle = null;
        next.confirmMessage = null;
      }
    }

    next.updatedAt = nowIso(clock);
    next.updatedBy = actor.uid;
    return next;
  }

  function normalizeScreenAction(raw) {
    if (!raw) return null;
    var contract = compositionContract();
    var actionType = ACTION_TYPE_VALUES.indexOf(clean(raw.actionType)) >= 0 ? clean(raw.actionType) : 'custom';
    var targetScreenSpecId = raw.targetScreenSpecId == null ? null : (clean(raw.targetScreenSpecId) || null);
    if (actionType !== 'navigate' && actionType !== 'openDrawer') {
      targetScreenSpecId = null;
    }

    return {
      id: clean(raw.id),
      projectId: clean(raw.projectId),
      screenSpecId: clean(raw.screenSpecId),
      order: Number.isInteger(raw.order) && raw.order >= 0 ? raw.order : 0,
      name: clean(raw.name),
      label: clean(raw.label),
      actionType: actionType,
      controlType: CONTROL_TYPE_VALUES.indexOf(clean(raw.controlType)) >= 0 ? clean(raw.controlType) : 'button',
      placement: PLACEMENT_VALUES.indexOf(clean(raw.placement)) >= 0 ? clean(raw.placement) : 'toolbar',
      variant: VARIANT_VALUES.indexOf(clean(raw.variant)) >= 0 ? clean(raw.variant) : 'secondary',
      disabled: raw.disabled === true,
      confirmRequired: raw.confirmRequired === true,
      confirmTitle: raw.confirmTitle == null ? null : clean(raw.confirmTitle) || null,
      confirmMessage: raw.confirmMessage == null ? null : clean(raw.confirmMessage) || null,
      successMessage: raw.successMessage == null ? null : clean(raw.successMessage) || null,
      targetScreenSpecId: targetScreenSpecId,
      sectionId: normalizeSectionId(raw.sectionId),
      layout: normalizeLayoutForRead(raw.layout),
      visibilityCondition: raw.visibilityCondition || null,
      enabledCondition: raw.enabledCondition || null,
      schemaVersion: contract && contract.normalizeSchemaVersionForRead
        ? contract.normalizeSchemaVersionForRead(raw, SCHEMA_VERSION)
        : (hasOwn(raw, 'schemaVersion') ? raw.schemaVersion : SCHEMA_VERSION),
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

  function canWriteScreenAction(role) {
    return WRITE_ROLES.indexOf(normalizeMemberRole(role)) >= 0;
  }

  function canReadScreenAction(role) {
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
        return canWriteScreenAction(role);
      }
      if (action === ACTIONS.LIST || action === ACTIONS.READ) {
        return canReadScreenAction(role);
      }
      return false;
    };
  }

  function resolveFieldAdapter(fieldAdapter) {
    if (fieldAdapter) return fieldAdapter;
    if (window.STAM && window.STAM.screenFieldFirestoreAdapter) {
      return window.STAM.screenFieldFirestoreAdapter.create();
    }
    return null;
  }

  function resolveSectionAdapter(sectionAdapter) {
    if (sectionAdapter) return sectionAdapter;
    if (window.STAM && window.STAM.screenSectionFirestoreAdapter) {
      return window.STAM.screenSectionFirestoreAdapter.create();
    }
    return null;
  }

  function buildSectionsById(sections) {
    var map = Object.create(null);
    (sections || []).forEach(function (section) {
      if (section && clean(section.id)) {
        map[clean(section.id)] = section;
      }
    });
    return map;
  }

  function requireAdapterMethod(adapter, methodName, label) {
    if (!adapter || typeof adapter[methodName] !== 'function') {
      throw createServiceError(
        ERROR_CODES.ADAPTER_DEPENDENCY_MISSING,
        'screenActionService: ' + label + ' adapter dependency missing'
      );
    }
    return adapter;
  }

  function documentNeedsSectionLookup(doc) {
    return normalizeSectionId(doc && doc.sectionId) != null;
  }

  function documentNeedsFieldIdLookup(doc) {
    var contract = compositionContract();
    if (!contract || !contract.documentHasFieldConditionReferences) return false;
    return contract.documentHasFieldConditionReferences(doc || {}, ['visibilityCondition', 'enabledCondition']);
  }

  function buildCompositionValidationContext(deps, projectId, screenSpecId, doc) {
    try {
      var source = doc || {};
      var needsSections = documentNeedsSectionLookup(source);
      var needsFieldIds = documentNeedsFieldIdLookup(source);

      if (needsSections) {
        requireAdapterMethod(deps.sectionAdapter, 'listByScreenSpec', 'section');
      }
      if (needsFieldIds) {
        requireAdapterMethod(deps.fieldAdapter, 'listByScreenSpec', 'field');
      }

      var fieldIdsPromise = needsFieldIds
        ? deps.fieldAdapter.listByScreenSpec(projectId, screenSpecId).then(function (items) {
          if (!Array.isArray(items)) {
            throw createServiceError(
              ERROR_CODES.ADAPTER_DEPENDENCY_MISSING,
              'screenActionService: field adapter listByScreenSpec returned invalid result'
            );
          }
          return items.map(function (item) {
            return clean(item.id);
          }).filter(Boolean);
        })
        : Promise.resolve([]);

      var sectionsPromise = needsSections
        ? deps.sectionAdapter.listByScreenSpec(projectId, screenSpecId).then(function (items) {
          if (!Array.isArray(items)) {
            throw createServiceError(
              ERROR_CODES.ADAPTER_DEPENDENCY_MISSING,
              'screenActionService: section adapter listByScreenSpec returned invalid result'
            );
          }
          return buildSectionsById(items);
        })
        : Promise.resolve(Object.create(null));

      return Promise.all([fieldIdsPromise, sectionsPromise]).then(function (results) {
        return {
          fieldIds: results[0],
          sectionsById: results[1],
        };
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function resolveAdapter(adapter) {
    if (adapter) return adapter;
    if (window.STAM && window.STAM.screenActionFirestoreAdapter) {
      return window.STAM.screenActionFirestoreAdapter.create();
    }
    throw new Error('screenActionService: adapter is required');
  }

  function mapAdapterError(err) {
    if (!err || !err.code) return err;
    if (err.code === 'SCREEN_ACTION_PARENT_NOT_FOUND') {
      return createServiceError(ERROR_CODES.PARENT_NOT_FOUND, err.message);
    }
    if (err.code === 'SCREEN_ACTION_PARENT_PROJECT_MISMATCH') {
      return createServiceError(ERROR_CODES.PARENT_PROJECT_MISMATCH, err.message);
    }
    if (err.code === 'SCREEN_ACTION_TARGET_NOT_FOUND') {
      return createServiceError(ERROR_CODES.TARGET_NOT_FOUND, err.message);
    }
    if (err.code === 'SCREEN_ACTION_TARGET_PROJECT_MISMATCH') {
      return createServiceError(ERROR_CODES.TARGET_PROJECT_MISMATCH, err.message);
    }
    if (err.code === 'SCREEN_ACTION_TARGET_CONSTRAINT') {
      return createServiceError(ERROR_CODES.TARGET_CONSTRAINT, err.message);
    }
    if (err.code === 'SCREEN_ACTION_DUPLICATE_NAME') {
      return createServiceError(ERROR_CODES.DUPLICATE_NAME, err.message);
    }
    if (err.code === 'SCREEN_ACTION_NOT_FOUND') {
      return createServiceError(ERROR_CODES.NOT_FOUND, err.message);
    }
    if (err.code === 'SCREEN_ACTION_IMMUTABLE_FIELD') {
      return createServiceError(ERROR_CODES.IMMUTABLE_FIELD, err.message);
    }
    if (err.code === 'SCREEN_ACTION_SECTION_NOT_FOUND') {
      return createServiceError(ERROR_CODES.SECTION_NOT_FOUND, err.message);
    }
    if (err.code === 'SCREEN_ACTION_SECTION_SPEC_MISMATCH') {
      return createServiceError(ERROR_CODES.SECTION_SPEC_MISMATCH, err.message);
    }
    return err;
  }

  function rethrowAdapterError(err) {
    throw mapAdapterError(err);
  }

  function preflightDuplicateName(adapter, projectId, screenSpecId, name, excludeActionId) {
    var normalized = normalizeName(name);
    return adapter.findDuplicateNormalizedName(projectId, screenSpecId, normalized, excludeActionId).then(function (duplicateId) {
      if (duplicateId) {
        throw createServiceError(ERROR_CODES.DUPLICATE_NAME, 'screenActionService: duplicate normalized name');
      }
    });
  }

  function sortActions(items, adapter) {
    var out = (items || []).slice();
    if (adapter && typeof adapter.compareScreenActions === 'function') {
      out.sort(adapter.compareScreenActions);
    }
    return out;
  }

  function createService(options) {
    var opts = options || {};
    var adapter = resolveAdapter(opts.adapter);
    var fieldAdapter = resolveFieldAdapter(opts.fieldAdapter);
    var sectionAdapter = resolveSectionAdapter(opts.sectionAdapter);
    var authorize = opts.authorize || defaultAuthorize;
    var clock = opts.clock;

    function compositionDeps() {
      return {
        fieldAdapter: resolveFieldAdapter(fieldAdapter),
        sectionAdapter: sectionAdapter || resolveSectionAdapter(null),
        actionAdapter: adapter,
      };
    }

    function check(action, projectId, payload, context) {
      var ctx = Object.assign({}, context || {}, { projectId: projectId });
      return Promise.resolve(authorize(action, {
        action: action,
        projectId: projectId,
        payload: payload || null,
        context: ctx,
      })).then(function (allowed) {
        if (allowed !== true) {
          throw createServiceError(ERROR_CODES.PERMISSION_DENIED, 'screenActionService: permission denied for ' + action);
        }
        return true;
      });
    }

    function listByScreenSpec(projectId, screenSpecId, query, context) {
      var pid = requireProjectId(projectId);
      var sid = clean(screenSpecId);
      if (!sid) throw new Error('screenActionService: screenSpecId is required');
      return check(ACTIONS.LIST, pid, { screenSpecId: sid, query: query }, context).then(function () {
        return adapter.listByScreenSpec(pid, sid, query);
      }).then(function (items) {
        return sortActions(items, adapter).map(normalizeScreenAction).filter(Boolean);
      });
    }

    function listByProject(projectId, query, context) {
      var pid = requireProjectId(projectId);
      return check(ACTIONS.LIST, pid, query, context).then(function () {
        return adapter.listByProject(pid, query);
      }).then(function (items) {
        return sortActions(items, adapter).map(normalizeScreenAction).filter(Boolean);
      });
    }

    function getById(projectId, actionId, context) {
      var pid = requireProjectId(projectId);
      var aid = requireActionId(actionId);
      return check(ACTIONS.READ, pid, { id: aid }, context).then(function () {
        return adapter.getById(pid, aid);
      }).then(function (raw) {
        return normalizeScreenAction(raw);
      });
    }

    function create(projectId, input, context) {
      var pid = requireProjectId(projectId);
      var source = Object.assign({}, input || {});
      var screenSpecId = clean(source.screenSpecId);

      return buildCompositionValidationContext(compositionDeps(), pid, screenSpecId, source).then(function (validationContext) {
        var ctx = Object.assign({}, context || {}, { projectId: pid }, validationContext);
        var item = buildCreatePayload(source, ctx, clock);
        return check(ACTIONS.CREATE, pid, item, context).then(function () {
          return preflightDuplicateName(adapter, pid, item.screenSpecId, item.name);
        }).then(function () {
          return adapter.create(pid, item);
        }).then(function (saved) {
          return normalizeScreenAction(saved || item);
        });
      }).catch(rethrowAdapterError);
    }

    function update(projectId, actionId, patch, context) {
      var pid = requireProjectId(projectId);
      var aid = requireActionId(actionId);
      return check(ACTIONS.UPDATE, pid, { id: aid, patch: patch }, context).then(function () {
        return adapter.getById(pid, aid);
      }).then(function (currentRaw) {
        var current = normalizeScreenAction(currentRaw);
        if (!current) {
          throw createServiceError(ERROR_CODES.NOT_FOUND, 'screenActionService: screen action not found');
        }
        var mergedForContext = Object.assign({}, current, patch || {});
        return buildCompositionValidationContext(compositionDeps(), pid, current.screenSpecId, mergedForContext).then(function (validationContext) {
          var ctx = Object.assign({}, context || {}, { projectId: pid }, validationContext);
          var nextPatch = buildUpdatePatch(current, patch, ctx, clock);
          if (hasOwn(patch, 'name') && normalizeName(patch.name) !== normalizeName(current.name)) {
            return preflightDuplicateName(adapter, pid, current.screenSpecId, patch.name, aid).then(function () {
              return adapter.update(pid, aid, nextPatch);
            });
          }
          return adapter.update(pid, aid, nextPatch);
        });
      }).then(normalizeScreenAction).catch(rethrowAdapterError);
    }

    function deleteAction(projectId, actionId, context) {
      var pid = requireProjectId(projectId);
      var aid = requireActionId(actionId);
      return check(ACTIONS.DELETE, pid, { id: aid }, context).then(function () {
        return adapter.delete(pid, aid);
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
      delete: deleteAction,
      normalizeScreenAction: normalizeScreenAction,
      validateScreenActionInput: validateScreenActionInput,
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
  window.STAM.screenActionService = createService();
  window.STAM.screenActionServiceContract = {
    ACTIONS: ACTIONS,
    ERROR_CODES: ERROR_CODES,
    WRITE_ROLES: WRITE_ROLES,
    READ_ROLES: READ_ROLES,
    ACTION_TYPE_VALUES: ACTION_TYPE_VALUES,
    CONTROL_TYPE_VALUES: CONTROL_TYPE_VALUES,
    PLACEMENT_VALUES: PLACEMENT_VALUES,
    VARIANT_VALUES: VARIANT_VALUES,
    NAME_RE: NAME_RE,
    SCHEMA_VERSION: SCHEMA_VERSION,
    CREATE_FORBIDDEN_INPUT_FIELDS: CREATE_FORBIDDEN_INPUT_FIELDS,
    UPDATE_FORBIDDEN_INPUT_FIELDS: UPDATE_FORBIDDEN_INPUT_FIELDS,
    createService: createService,
    normalizeScreenAction: normalizeScreenAction,
    validateScreenActionInput: validateScreenActionInput,
    validateCompleteDocument: validateCompleteDocument,
    buildCreatePayload: buildCreatePayload,
    buildUpdatePatch: buildUpdatePatch,
    normalizeName: normalizeName,
    normalizeMemberRole: normalizeMemberRole,
    canWriteScreenAction: canWriteScreenAction,
    canReadScreenAction: canReadScreenAction,
    createMemberRoleAuthorize: createMemberRoleAuthorize,
    mapAdapterError: mapAdapterError,
    DEFAULT_LAYOUT: DEFAULT_LAYOUT,
    normalizeCompositionFieldsForWrite: normalizeCompositionFieldsForWrite,
    validateCompositionFields: validateCompositionFields,
    buildCompositionValidationContext: buildCompositionValidationContext,
  };
}());
