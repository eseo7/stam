/* ============================================================================
 * STAM ScreenField Domain Service Contract
 * ----------------------------------------------------------------------------
 * Domain-first service boundary for screenFields CRUD.
 * - Screens call this service, not Firestore paths.
 * - Firestore is injected through STAM.screenFieldFirestoreAdapter.
 * - No UI wiring and no automatic runtime write path are exposed by loading this file.
 * ========================================================================== */
(function () {
  'use strict';

  var ACTIONS = {
    LIST: 'screenField.list',
    READ: 'screenField.read',
    CREATE: 'screenField.create',
    UPDATE: 'screenField.update',
    DELETE: 'screenField.delete',
  };

  var ERROR_CODES = {
    VALIDATION_FAILED: 'SCREEN_FIELD_VALIDATION_FAILED',
    PARENT_NOT_FOUND: 'SCREEN_FIELD_PARENT_NOT_FOUND',
    PARENT_PROJECT_MISMATCH: 'SCREEN_FIELD_PARENT_PROJECT_MISMATCH',
    NOT_FOUND: 'SCREEN_FIELD_NOT_FOUND',
    DUPLICATE_NAME: 'SCREEN_FIELD_DUPLICATE_NAME',
    IMMUTABLE_FIELD: 'SCREEN_FIELD_IMMUTABLE_FIELD',
    PERMISSION_DENIED: 'SCREEN_FIELD_PERMISSION_DENIED',
    TYPE_CONSTRAINT: 'SCREEN_FIELD_TYPE_CONSTRAINT',
    DEFAULT_VALUE_INVALID: 'SCREEN_FIELD_DEFAULT_VALUE_INVALID',
    OPTIONS_INVALID: 'SCREEN_FIELD_OPTIONS_INVALID',
    VALIDATION_RULE_INVALID: 'SCREEN_FIELD_VALIDATION_RULE_INVALID',
    SECTION_NOT_FOUND: 'SCREEN_FIELD_SECTION_NOT_FOUND',
    SECTION_SPEC_MISMATCH: 'SCREEN_FIELD_SECTION_SPEC_MISMATCH',
    FIELD_ROLE_SECTION_MISMATCH: 'SCREEN_FIELD_FIELD_ROLE_SECTION_MISMATCH',
  };

  var DEFAULT_LAYOUT = { row: null, column: null, span: 12 };
  var FIELD_ROLE_VALUES = ['input', 'display', 'filter', 'tableColumn', 'repeaterItem'];

  function compositionContract() {
    return window.STAM && window.STAM.screenConditionContract;
  }

  function normalizeSectionId(value) {
    if (value === undefined || value === null) return null;
    var trimmed = clean(value);
    return trimmed || null;
  }

  function normalizeLayout(raw) {
    var layout = raw && typeof raw === 'object' ? raw : {};
    var contract = compositionContract();
    var span = layout.span == null ? 12 : layout.span;
    var normalized = {
      row: layout.row == null ? null : layout.row,
      column: layout.column == null ? null : layout.column,
      span: span,
    };
    if (contract && contract.validateLayoutGrid) {
      var errors = [];
      contract.validateLayoutGrid(normalized, errors, 'layout');
      if (errors.length) return DEFAULT_LAYOUT;
    }
    return normalized;
  }

  function normalizeCompositionFields(raw) {
    var source = raw || {};
    return {
      sectionId: normalizeSectionId(source.sectionId),
      fieldRole: FIELD_ROLE_VALUES.indexOf(clean(source.fieldRole)) >= 0 ? clean(source.fieldRole) : 'input',
      layout: normalizeLayout(source.layout),
      visibilityCondition: compositionContract() && compositionContract().normalizeConditionGroup
        ? compositionContract().normalizeConditionGroup(source.visibilityCondition)
        : (source.visibilityCondition || null),
      enabledCondition: compositionContract() && compositionContract().normalizeConditionGroup
        ? compositionContract().normalizeConditionGroup(source.enabledCondition)
        : (source.enabledCondition || null),
      requiredCondition: compositionContract() && compositionContract().normalizeConditionGroup
        ? compositionContract().normalizeConditionGroup(source.requiredCondition)
        : (source.requiredCondition || null),
    };
  }

  function validateCompositionFields(doc, context, errors) {
    var composition = normalizeCompositionFields(doc);
    var contract = compositionContract();
    if (!contract) return composition;

    if (composition.fieldRole && contract.validateFieldRole) {
      contract.validateFieldRole(composition.fieldRole, errors);
    }
    if (contract.validateLayoutGrid) {
      contract.validateLayoutGrid(composition.layout, errors, 'layout');
    }

    var sectionsById = (context && context.sectionsById) || {};
    if (composition.sectionId) {
      var section = sectionsById[composition.sectionId];
      if (!section) {
        pushError(errors, 'sectionId', 'section not found');
      } else if (clean(section.screenSpecId) !== clean(doc.screenSpecId)) {
        pushError(errors, 'sectionId', 'section screenSpecId mismatch');
      } else {
        if (composition.fieldRole === 'tableColumn' && section.sectionType !== 'table') {
          pushError(errors, 'fieldRole', 'tableColumn requires table section');
        }
        if (composition.fieldRole === 'repeaterItem' && section.sectionType !== 'repeater') {
          pushError(errors, 'fieldRole', 'repeaterItem requires repeater section');
        }
      }
    }

    var fieldIds = (context && context.fieldIds) || [];
    var condCtx = { screenSpecId: doc.screenSpecId, fieldIds: fieldIds };
    ['visibilityCondition', 'enabledCondition', 'requiredCondition'].forEach(function (key) {
      if (composition[key] && contract.validateConditionGroup) {
        contract.validateConditionGroup(composition[key], condCtx, errors, key);
      }
    });

    return composition;
  }

  var WRITE_ROLES = ['owner', 'admin', 'editor'];
  var READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];

  var TYPE_VALUES = [
    'text', 'textarea', 'number', 'boolean', 'switch', 'select', 'multiselect',
    'date', 'datetime', 'file', 'image', 'editor',
  ];

  var TEXT_TYPES = ['text', 'textarea', 'editor'];
  var SELECT_TYPES = ['select', 'multiselect'];
  var FILE_TYPES = ['file', 'image'];
  var BOOL_TYPES = ['boolean', 'switch'];

  var NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{1,79}$/;
  var OPTION_VALUE_RE = /^[a-zA-Z0-9_-]{1,80}$/;
  var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

  var MAX_OPTIONS = 100;
  var MAX_VALIDATION_RULES = 10;
  var SCHEMA_VERSION = 1;

  var CREATE_FORBIDDEN_INPUT_FIELDS = [
    'id', 'projectId', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'schemaVersion',
  ];

  var UPDATE_FORBIDDEN_INPUT_FIELDS = [
    'id', 'projectId', 'screenSpecId', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'schemaVersion',
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
    var err = new Error(message || ('screenFieldService: ' + code));
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
    if (!value) throw new Error('screenFieldService: projectId is required');
    return value;
  }

  function requireFieldId(fieldId) {
    var value = clean(fieldId);
    if (!value) throw new Error('screenFieldService: fieldId is required');
    return value;
  }

  function actorFromContext(context) {
    var ctx = context || {};
    var uid = clean(ctx.actorUid || ctx.uid || ctx.userId);
    if (!uid) throw new Error('screenFieldService: actorUid is required');
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

  function isTextType(type) {
    return TEXT_TYPES.indexOf(type) >= 0;
  }

  function isSelectType(type) {
    return SELECT_TYPES.indexOf(type) >= 0;
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

  function validateType(errors, value, mode) {
    if (mode === 'create' && isAbsent(value)) {
      pushError(errors, 'type', 'type is required');
      return undefined;
    }
    if (mode === 'update' && value === undefined) return undefined;
    if (isNull(value)) {
      pushError(errors, 'type', 'type cannot be null');
      return undefined;
    }
    var normalized = clean(value);
    if (TYPE_VALUES.indexOf(normalized) < 0) {
      pushError(errors, 'type', 'invalid type value');
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

  function validateOptionalLength(errors, field, value, type) {
    if (value === undefined) return undefined;
    if (!isTextType(type)) {
      if (!isNull(value)) {
        pushError(errors, field, field + ' is not allowed for type ' + type);
      }
      return isNull(value) ? null : undefined;
    }
    if (isNull(value)) return null;
    var len = normalizeCount(value);
    if (Number.isNaN(len) || len < 0) {
      pushError(errors, field, field + ' must be a non-negative integer or null');
      return undefined;
    }
    return len;
  }

  function normalizeOptionsInput(options) {
    if (!Array.isArray(options)) return options;
    return options.map(function (item) {
      if (!item || typeof item !== 'object') return item;
      var next = Object.assign({}, item);
      if (typeof next.value === 'string') next.value = next.value.trim();
      if (typeof next.label === 'string') next.label = next.label.trim();
      return next;
    });
  }

  function validateOptions(errors, options, type) {
    if (!isSelectType(type)) {
      if (Array.isArray(options) && options.length > 0) {
        pushError(errors, 'options', 'options must be empty for type ' + type);
      }
      return [];
    }
    if (!Array.isArray(options)) {
      pushError(errors, 'options', 'options must be an array');
      return undefined;
    }
    if (options.length < 1) {
      pushError(errors, 'options', 'options must contain at least one item for ' + type);
      return undefined;
    }
    if (options.length > MAX_OPTIONS) {
      pushError(errors, 'options', 'options cannot exceed ' + MAX_OPTIONS + ' items');
      return undefined;
    }
    var seen = Object.create(null);
    var normalized = [];
    options.forEach(function (item, index) {
      if (!item || typeof item !== 'object') {
        pushError(errors, 'options[' + index + ']', 'option must be an object');
        return;
      }
      var value = clean(item.value);
      var label = clean(item.label);
      if (!value || !label) {
        pushError(errors, 'options[' + index + ']', 'option label and value are required');
        return;
      }
      if (label.length > 120) {
        pushError(errors, 'options[' + index + '].label', 'option label length is invalid');
      }
      if (!OPTION_VALUE_RE.test(value)) {
        pushError(errors, 'options[' + index + '].value', 'option value format is invalid');
      }
      if (hasOwn(seen, value)) {
        pushError(errors, 'options[' + index + '].value', 'duplicate option value');
      }
      seen[value] = true;
      var option = { value: value, label: label };
      if (hasOwn(item, 'disabled')) {
        if (typeof item.disabled !== 'boolean') {
          pushError(errors, 'options[' + index + '].disabled', 'option disabled must be a boolean');
        } else {
          option.disabled = item.disabled;
        }
      }
      normalized.push(option);
    });
    return normalized;
  }

  function validateValidationRules(errors, rules, type) {
    if (rules === undefined) return [];
    if (!Array.isArray(rules)) {
      pushError(errors, 'validationRules', 'validationRules must be an array');
      return undefined;
    }
    if (rules.length > MAX_VALIDATION_RULES) {
      pushError(errors, 'validationRules', 'validationRules cannot exceed ' + MAX_VALIDATION_RULES + ' items');
      return undefined;
    }
    var normalized = [];
    rules.forEach(function (rule, index) {
      if (!rule || typeof rule !== 'object') {
        pushError(errors, 'validationRules[' + index + ']', 'validation rule must be an object');
        return;
      }
      if (rule.kind !== 'regex') {
        pushError(errors, 'validationRules[' + index + '].kind', 'only regex validation rules are allowed');
        return;
      }
      if (typeof rule.pattern !== 'string' || !clean(rule.pattern)) {
        pushError(errors, 'validationRules[' + index + '].pattern', 'pattern is required');
        return;
      }
      if (rule.pattern.length > 500) {
        pushError(errors, 'validationRules[' + index + '].pattern', 'pattern length is invalid');
        return;
      }
      try {
        // eslint-disable-next-line no-new
        new RegExp(rule.pattern, typeof rule.flags === 'string' ? rule.flags : undefined);
      } catch (regexErr) {
        pushError(errors, 'validationRules[' + index + '].pattern', 'pattern is invalid');
        return;
      }
      if (rule.flags !== undefined) {
        if (typeof rule.flags !== 'string' || rule.flags.length > 4 || !/^[gimsu]*$/.test(rule.flags)) {
          pushError(errors, 'validationRules[' + index + '].flags', 'flags are invalid');
          return;
        }
      }
      var normalizedRule = { kind: 'regex', pattern: rule.pattern };
      if (rule.flags) normalizedRule.flags = rule.flags;
      normalized.push(normalizedRule);
    });
    if (!isTextType(type) && normalized.length > 0 && FILE_TYPES.indexOf(type) < 0 && !isSelectType(type) && type !== 'number') {
      // allowed but non-text types storing regex is tolerated; no extra error in PR B
    }
    return normalized;
  }

  function optionValues(options) {
    return (options || []).map(function (item) { return item.value; });
  }

  function validateDefaultValue(errors, value, type, options, minLength, maxLength) {
    if (value === undefined) return null;
    if (FILE_TYPES.indexOf(type) >= 0) {
      if (!isNull(value)) {
        pushError(errors, 'defaultValue', 'defaultValue must be null for file/image types');
      }
      return null;
    }
    if (isNull(value)) return null;

    if (TEXT_TYPES.indexOf(type) >= 0) {
      if (typeof value !== 'string') {
        pushError(errors, 'defaultValue', 'defaultValue must be a string or null');
        return undefined;
      }
      var len = value.length;
      if (minLength != null && len < minLength) {
        pushError(errors, 'defaultValue', 'defaultValue is shorter than minLength');
      }
      if (maxLength != null && len > maxLength) {
        pushError(errors, 'defaultValue', 'defaultValue is longer than maxLength');
      }
      return value;
    }

    if (type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        pushError(errors, 'defaultValue', 'defaultValue must be a finite number or null');
      }
      return value;
    }

    if (BOOL_TYPES.indexOf(type) >= 0) {
      if (typeof value !== 'boolean') {
        pushError(errors, 'defaultValue', 'defaultValue must be a boolean or null');
      }
      return value;
    }

    if (type === 'select') {
      if (typeof value !== 'string') {
        pushError(errors, 'defaultValue', 'defaultValue must be a string or null');
        return undefined;
      }
      if (optionValues(options).indexOf(value) < 0) {
        pushError(errors, 'defaultValue', 'defaultValue must match an option value');
      }
      return value;
    }

    if (type === 'multiselect') {
      if (!Array.isArray(value)) {
        pushError(errors, 'defaultValue', 'defaultValue must be an array or null');
        return undefined;
      }
      var allowed = optionValues(options);
      var seen = Object.create(null);
      value.forEach(function (item, index) {
        if (typeof item !== 'string') {
          pushError(errors, 'defaultValue[' + index + ']', 'defaultValue items must be strings');
          return;
        }
        if (allowed.indexOf(item) < 0) {
          pushError(errors, 'defaultValue[' + index + ']', 'defaultValue item must match an option value');
        }
        if (hasOwn(seen, item)) {
          pushError(errors, 'defaultValue[' + index + ']', 'defaultValue items must be unique');
        }
        seen[item] = true;
      });
      return value.slice();
    }

    if (type === 'date') {
      if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) {
        pushError(errors, 'defaultValue', 'defaultValue must be an ISO date string or null');
      }
      return value;
    }

    if (type === 'datetime') {
      if (typeof value !== 'string' || !ISO_DATETIME_RE.test(value)) {
        pushError(errors, 'defaultValue', 'defaultValue must be an ISO datetime string or null');
      }
      return value;
    }

    return value;
  }

  function validateMinMaxPair(errors, minLength, maxLength) {
    if (minLength != null && maxLength != null && minLength > maxLength) {
      pushError(errors, 'minLength', 'minLength cannot be greater than maxLength');
    }
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

  function validateScreenFieldInput(input, mode) {
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
      var createType = validateType(errors, source.type, 'create');
      validateOrder(errors, source.order, 'create');
      validateBooleanField(errors, 'required', source.required, false);
      validateBooleanField(errors, 'readonly', source.readonly, false);
      validateBooleanField(errors, 'disabled', source.disabled, false);
      validateOptionalString(errors, 'placeholder', source.placeholder, 200);
      validateOptionalString(errors, 'helpText', source.helpText, 500);
      var minLength = validateOptionalLength(errors, 'minLength', source.minLength, createType || 'text');
      var maxLength = validateOptionalLength(errors, 'maxLength', source.maxLength, createType || 'text');
      validateMinMaxPair(errors, minLength, maxLength);
      var options = validateOptions(errors, normalizeOptionsInput(source.options), createType || 'text');
      validateValidationRules(errors, source.validationRules, createType || 'text');
      validateDefaultValue(
        errors,
        hasOwn(source, 'defaultValue') ? source.defaultValue : null,
        createType || 'text',
        options || [],
        minLength,
        maxLength
      );
      return { valid: errors.length === 0, mode: m, errors: errors };
    }

    if (hasOwn(source, 'name')) validateName(errors, 'name', source.name, 'update');
    if (hasOwn(source, 'label')) validateLabel(errors, 'label', source.label, 'update');
    if (hasOwn(source, 'type')) validateType(errors, source.type, 'create');
    if (hasOwn(source, 'order')) validateOrder(errors, source.order, 'update');
    ['required', 'readonly', 'disabled'].forEach(function (field) {
      if (hasOwn(source, field) && typeof source[field] !== 'boolean') {
        pushError(errors, field, field + ' must be a boolean');
      }
    });
    if (hasOwn(source, 'placeholder')) validateOptionalString(errors, 'placeholder', source.placeholder, 200);
    if (hasOwn(source, 'helpText')) validateOptionalString(errors, 'helpText', source.helpText, 500);
    if (hasOwn(source, 'validationRules')) {
      validateValidationRules(errors, source.validationRules, source.type || 'text');
    }
    if (hasOwn(source, 'options') && !Array.isArray(source.options)) {
      pushError(errors, 'options', 'options must be an array');
    }
    if (hasOwn(source, 'minLength') && source.minLength !== null && normalizeCount(source.minLength) !== source.minLength && Number.isNaN(normalizeCount(source.minLength))) {
      pushError(errors, 'minLength', 'minLength must be a non-negative integer or null');
    }
    if (hasOwn(source, 'maxLength') && source.maxLength !== null && Number.isNaN(normalizeCount(source.maxLength))) {
      pushError(errors, 'maxLength', 'maxLength must be a non-negative integer or null');
    }

    return { valid: errors.length === 0, mode: m, errors: errors };
  }

  function validateCompleteDocument(doc, context) {
    var input = doc || {};
    var errors = [];
    var type = validateType(errors, input.type, 'create');
    validateName(errors, 'name', input.name, 'create');
    validateLabel(errors, 'label', input.label, 'create');
    if (!clean(input.screenSpecId)) {
      pushError(errors, 'screenSpecId', 'screenSpecId is required');
    }
    validateOrder(errors, input.order, 'create');
    validateBooleanField(errors, 'required', input.required, false);
    validateBooleanField(errors, 'readonly', input.readonly, false);
    validateBooleanField(errors, 'disabled', input.disabled, false);
    var placeholder = validateOptionalString(errors, 'placeholder', input.placeholder, 200);
    var helpText = validateOptionalString(errors, 'helpText', input.helpText, 500);
    var minLength = validateOptionalLength(errors, 'minLength', input.minLength, type || input.type || 'text');
    var maxLength = validateOptionalLength(errors, 'maxLength', input.maxLength, type || input.type || 'text');
    validateMinMaxPair(errors, minLength, maxLength);
    var options = validateOptions(errors, normalizeOptionsInput(input.options), type || input.type || 'text');
    validateValidationRules(errors, input.validationRules, type || input.type || 'text');
    validateDefaultValue(
      errors,
      hasOwn(input, 'defaultValue') ? input.defaultValue : null,
      type || input.type || 'text',
      options || [],
      minLength,
      maxLength
    );
    validateCompositionFields(input, context || {}, errors);
    return { valid: errors.length === 0, errors: errors };
  }

  function assertValidInput(input, mode) {
    var result = validateScreenFieldInput(input, mode);
    if (!result.valid) {
      throw createServiceError(
        ERROR_CODES.VALIDATION_FAILED,
        'screenFieldService: invalid ' + result.mode + ' input',
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
    var validation = validateScreenFieldInput(source, 'create');
    if (!validation.valid) {
      throw createServiceError(ERROR_CODES.VALIDATION_FAILED, 'screenFieldService: invalid create input', { errors: validation.errors });
    }

    var createValidation = validateCompleteDocument(Object.assign({}, source, { projectId: projectId }), context);
    if (!createValidation.valid) {
      throw createServiceError(ERROR_CODES.VALIDATION_FAILED, 'screenFieldService: invalid create input', { errors: createValidation.errors });
    }

    var composition = normalizeCompositionFields(source);

    return {
      projectId: projectId,
      screenSpecId: screenSpecId,
      order: hasOwn(source, 'order') ? validateOrder([], source.order, 'create') : 0,
      name: name,
      label: label,
      type: clean(source.type),
      required: source.required === true,
      readonly: source.readonly === true,
      disabled: source.disabled === true,
      defaultValue: hasOwn(source, 'defaultValue') ? source.defaultValue : null,
      placeholder: hasOwn(source, 'placeholder') ? (source.placeholder == null ? null : clean(source.placeholder) || null) : null,
      helpText: hasOwn(source, 'helpText') ? (source.helpText == null ? null : clean(source.helpText) || null) : null,
      minLength: hasOwn(source, 'minLength') ? source.minLength : null,
      maxLength: hasOwn(source, 'maxLength') ? source.maxLength : null,
      options: Array.isArray(source.options) ? normalizeOptionsInput(source.options) : [],
      validationRules: Array.isArray(source.validationRules) ? source.validationRules : [],
      sectionId: composition.sectionId,
      fieldRole: composition.fieldRole,
      layout: composition.layout,
      visibilityCondition: composition.visibilityCondition,
      enabledCondition: composition.enabledCondition,
      requiredCondition: composition.requiredCondition,
      schemaVersion: SCHEMA_VERSION,
      createdAt: t,
      createdBy: actor.uid,
      updatedAt: t,
      updatedBy: actor.uid,
    };
  }

  function buildUpdatePatch(current, patch, context, clock) {
    var base = current || null;
    if (!base || !clean(base.id)) {
      throw new Error('screenFieldService: current record is required for update');
    }
    var source = Object.assign({}, patch || {});
    assertValidInput(source, 'update');
    var actor = actorFromContext(context);
    var merged = Object.assign({}, base, source);
    var composition = normalizeCompositionFields(merged);
    Object.assign(merged, composition);
    if (hasOwn(source, 'name')) merged.name = clean(source.name);
    if (hasOwn(source, 'label')) merged.label = clean(source.label);

    var complete = validateCompleteDocument(merged, context);
    if (!complete.valid) {
      throw createServiceError(
        ERROR_CODES.VALIDATION_FAILED,
        'screenFieldService: invalid merged document after update',
        { errors: complete.errors }
      );
    }

    var next = {};
    ['name', 'label', 'type', 'order', 'required', 'readonly', 'disabled', 'defaultValue',
      'placeholder', 'helpText', 'minLength', 'maxLength', 'options', 'validationRules',
      'sectionId', 'fieldRole', 'layout', 'visibilityCondition', 'enabledCondition', 'requiredCondition'].forEach(function (field) {
      if (hasOwn(source, field)) next[field] = merged[field];
    });
    next.updatedAt = nowIso(clock);
    next.updatedBy = actor.uid;
    return next;
  }

  function normalizeScreenField(raw) {
    if (!raw) return null;
    return {
      id: clean(raw.id),
      projectId: clean(raw.projectId),
      screenSpecId: clean(raw.screenSpecId),
      order: Number.isInteger(raw.order) && raw.order >= 0 ? raw.order : 0,
      name: clean(raw.name),
      label: clean(raw.label),
      type: TYPE_VALUES.indexOf(clean(raw.type)) >= 0 ? clean(raw.type) : 'text',
      required: raw.required === true,
      readonly: raw.readonly === true,
      disabled: raw.disabled === true,
      defaultValue: raw.defaultValue === undefined ? null : raw.defaultValue,
      placeholder: raw.placeholder == null ? null : clean(raw.placeholder) || null,
      helpText: raw.helpText == null ? null : clean(raw.helpText) || null,
      minLength: raw.minLength == null ? null : normalizeCount(raw.minLength),
      maxLength: raw.maxLength == null ? null : normalizeCount(raw.maxLength),
      options: Array.isArray(raw.options) ? raw.options : [],
      validationRules: Array.isArray(raw.validationRules) ? raw.validationRules : [],
      sectionId: normalizeSectionId(raw.sectionId),
      fieldRole: FIELD_ROLE_VALUES.indexOf(clean(raw.fieldRole)) >= 0 ? clean(raw.fieldRole) : 'input',
      layout: normalizeLayout(raw.layout),
      visibilityCondition: raw.visibilityCondition || null,
      enabledCondition: raw.enabledCondition || null,
      requiredCondition: raw.requiredCondition || null,
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

  function canWriteScreenField(role) {
    return WRITE_ROLES.indexOf(normalizeMemberRole(role)) >= 0;
  }

  function canReadScreenField(role) {
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
        return canWriteScreenField(role);
      }
      if (action === ACTIONS.LIST || action === ACTIONS.READ) {
        return canReadScreenField(role);
      }
      return false;
    };
  }

  function resolveAdapter(adapter) {
    if (adapter) return adapter;
    if (window.STAM && window.STAM.screenFieldFirestoreAdapter) {
      return window.STAM.screenFieldFirestoreAdapter.create();
    }
    throw new Error('screenFieldService: adapter is required');
  }

  function mapAdapterError(err) {
    if (!err || !err.code) return err;
    if (err.code === 'SCREEN_FIELD_PARENT_NOT_FOUND') {
      return createServiceError(ERROR_CODES.PARENT_NOT_FOUND, err.message);
    }
    if (err.code === 'SCREEN_FIELD_PARENT_PROJECT_MISMATCH') {
      return createServiceError(ERROR_CODES.PARENT_PROJECT_MISMATCH, err.message);
    }
    if (err.code === 'SCREEN_FIELD_DUPLICATE_NAME') {
      return createServiceError(ERROR_CODES.DUPLICATE_NAME, err.message);
    }
    if (err.code === 'SCREEN_FIELD_NOT_FOUND') {
      return createServiceError(ERROR_CODES.NOT_FOUND, err.message);
    }
    if (err.code === 'SCREEN_FIELD_IMMUTABLE_FIELD') {
      return createServiceError(ERROR_CODES.IMMUTABLE_FIELD, err.message);
    }
    return err;
  }

  function rethrowAdapterError(err) {
    throw mapAdapterError(err);
  }

  function preflightDuplicateName(adapter, projectId, screenSpecId, name, excludeFieldId) {
    var normalized = normalizeName(name);
    return adapter.findDuplicateNormalizedName(projectId, screenSpecId, normalized, excludeFieldId).then(function (duplicateId) {
      if (duplicateId) {
        throw createServiceError(ERROR_CODES.DUPLICATE_NAME, 'screenFieldService: duplicate normalized name');
      }
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
          throw createServiceError(ERROR_CODES.PERMISSION_DENIED, 'screenFieldService: permission denied for ' + action);
        }
        return true;
      });
    }

    function listByScreenSpec(projectId, screenSpecId, query, context) {
      var pid = requireProjectId(projectId);
      var sid = clean(screenSpecId);
      if (!sid) throw new Error('screenFieldService: screenSpecId is required');
      return check(ACTIONS.LIST, pid, { screenSpecId: sid, query: query }, context).then(function () {
        return adapter.listByScreenSpec(pid, sid, query);
      }).then(function (items) {
        return (items || []).map(normalizeScreenField).filter(Boolean);
      });
    }

    function listByProject(projectId, query, context) {
      var pid = requireProjectId(projectId);
      return check(ACTIONS.LIST, pid, query, context).then(function () {
        return adapter.listByProject(pid, query);
      }).then(function (items) {
        return (items || []).map(normalizeScreenField).filter(Boolean);
      });
    }

    function getById(projectId, fieldId, context) {
      var pid = requireProjectId(projectId);
      var fid = requireFieldId(fieldId);
      return check(ACTIONS.READ, pid, { id: fid }, context).then(function () {
        return adapter.getById(pid, fid);
      }).then(function (raw) {
        return normalizeScreenField(raw);
      });
    }

    function create(projectId, input, context) {
      var pid = requireProjectId(projectId);
      var ctx = Object.assign({}, context || {}, { projectId: pid });
      var item = buildCreatePayload(Object.assign({}, input || {}), ctx, clock);
      return check(ACTIONS.CREATE, pid, item, context).then(function () {
        return preflightDuplicateName(adapter, pid, item.screenSpecId, item.name);
      }).then(function () {
        return adapter.create(pid, item);
      }).then(function (saved) {
        return normalizeScreenField(saved || item);
      }).catch(rethrowAdapterError);
    }

    function update(projectId, fieldId, patch, context) {
      var pid = requireProjectId(projectId);
      var fid = requireFieldId(fieldId);
      return check(ACTIONS.UPDATE, pid, { id: fid, patch: patch }, context).then(function () {
        return adapter.getById(pid, fid);
      }).then(function (currentRaw) {
        var current = normalizeScreenField(currentRaw);
        if (!current) {
          throw createServiceError(ERROR_CODES.NOT_FOUND, 'screenFieldService: screen field not found');
        }
        var nextPatch = buildUpdatePatch(current, patch, context, clock);
        if (hasOwn(patch, 'name') && normalizeName(patch.name) !== normalizeName(current.name)) {
          return preflightDuplicateName(adapter, pid, current.screenSpecId, patch.name, fid).then(function () {
            return adapter.update(pid, fid, nextPatch);
          });
        }
        return adapter.update(pid, fid, nextPatch);
      }).then(normalizeScreenField).catch(rethrowAdapterError);
    }

    function deleteField(projectId, fieldId, context) {
      var pid = requireProjectId(projectId);
      var fid = requireFieldId(fieldId);
      return check(ACTIONS.DELETE, pid, { id: fid }, context).then(function () {
        return adapter.delete(pid, fid);
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
      delete: deleteField,
      normalizeScreenField: normalizeScreenField,
      validateScreenFieldInput: validateScreenFieldInput,
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
  window.STAM.screenFieldService = createService();
  window.STAM.screenFieldServiceContract = {
    ACTIONS: ACTIONS,
    ERROR_CODES: ERROR_CODES,
    WRITE_ROLES: WRITE_ROLES,
    READ_ROLES: READ_ROLES,
    TYPE_VALUES: TYPE_VALUES,
    NAME_RE: NAME_RE,
    MAX_OPTIONS: MAX_OPTIONS,
    SCHEMA_VERSION: SCHEMA_VERSION,
    CREATE_FORBIDDEN_INPUT_FIELDS: CREATE_FORBIDDEN_INPUT_FIELDS,
    UPDATE_FORBIDDEN_INPUT_FIELDS: UPDATE_FORBIDDEN_INPUT_FIELDS,
    createService: createService,
    normalizeScreenField: normalizeScreenField,
    validateScreenFieldInput: validateScreenFieldInput,
    buildCreatePayload: buildCreatePayload,
    buildUpdatePatch: buildUpdatePatch,
    normalizeName: normalizeName,
    DEFAULT_LAYOUT: DEFAULT_LAYOUT,
    FIELD_ROLE_VALUES: FIELD_ROLE_VALUES,
    normalizeCompositionFields: normalizeCompositionFields,
    validateCompositionFields: validateCompositionFields,
    normalizeMemberRole: normalizeMemberRole,
    canWriteScreenField: canWriteScreenField,
    canReadScreenField: canReadScreenField,
    createMemberRoleAuthorize: createMemberRoleAuthorize,
  };
}());
