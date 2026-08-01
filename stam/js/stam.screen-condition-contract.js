/* ============================================================================
 * STAM Screen Condition & Composition Contract
 * ----------------------------------------------------------------------------
 * Shared normalization and validation for ConditionGroup, layout grid,
 * fieldRole, and sectionType used by screenSections / screenFields /
 * screenActions composition extensions.
 * - Shape validation and Firestore reference validation are separated.
 * - No condition evaluator runtime; storage contract only.
 * - Flat condition groups only (no nested groups).
 * ========================================================================== */
(function () {
  'use strict';

  window.STAM = window.STAM || {};
  if (window.STAM.screenConditionContract) return;

  var LOGIC_VALUES = ['all', 'any'];
  var SOURCE_VALUES = ['field', 'role', 'screenMode', 'recordState'];
  var OPERATOR_VALUES = [
    'eq', 'neq', 'in', 'notIn', 'exists', 'notExists', 'contains', 'gt', 'gte', 'lt', 'lte',
  ];
  var SCREEN_MODE_VALUES = ['list', 'create', 'detail', 'edit', 'popup'];
  var ROLE_VALUES = ['owner', 'admin', 'editor', 'viewer'];
  var MAX_CONDITIONS = 20;
  var SPAN_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  var FIELD_ROLE_VALUES = ['input', 'display', 'filter', 'tableColumn', 'repeaterItem'];
  var LAYOUT_GRID_KEYS = ['row', 'column', 'span'];
  var SECTION_TYPE_VALUES = [
    'search', 'form', 'detail', 'table', 'card', 'tabs', 'tab', 'repeater', 'history', 'custom',
  ];

  var NULL_SOURCE_ID_SOURCES = ['role', 'screenMode', 'recordState'];
  var ARRAY_OPERATORS = ['in', 'notIn'];
  var NULL_VALUE_OPERATORS = ['exists', 'notExists'];
  var NUMERIC_OPERATORS = ['gt', 'gte', 'lt', 'lte'];

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj || {}, key);
  }

  function includesValue(list, value) {
    return list.indexOf(value) !== -1;
  }

  function pushError(errors, field, message) {
    errors.push({ field: field, message: message });
  }

  function isBlankString(value) {
    return typeof value === 'string' && value.trim() === '';
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function isNonNegativeInteger(value) {
    return Number.isInteger(value) && value >= 0;
  }

  function isPlainObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
  }

  function isJsonSafeValue(value) {
    if (value === null) return true;
    var valueType = typeof value;
    if (valueType === 'string' || valueType === 'boolean') return true;
    if (valueType === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i += 1) {
        if (!isJsonSafeValue(value[i])) return false;
      }
      return true;
    }
    return false;
  }

  function toFieldIdSet(fieldIds) {
    if (!fieldIds) return new Set();
    if (fieldIds instanceof Set) return fieldIds;
    if (Array.isArray(fieldIds)) return new Set(fieldIds);
    return new Set();
  }

  function resolveRoleValues(context) {
    if (context && context.roleValues && context.roleValues.length) {
      return context.roleValues;
    }
    return ROLE_VALUES;
  }

  function normalizeNullableString(value) {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string') return value;
    var trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  function normalizeConditionValue(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
      return value.map(function (entry) {
        if (typeof entry === 'string') return entry.trim();
        return entry;
      });
    }
    return value;
  }

  function normalizeConditionItem(item) {
    if (!isPlainObject(item)) return item;

    var source = clean(item.source);
    var normalized = {
      source: source,
      sourceId: normalizeNullableString(item.sourceId),
      operator: clean(item.operator),
      value: normalizeConditionValue(item.value),
    };

    if (includesValue(NULL_SOURCE_ID_SOURCES, source)) {
      normalized.sourceId = null;
    }

    return normalized;
  }

  function normalizeConditionGroup(group) {
    if (group === null) return null;
    if (!isPlainObject(group)) return group;

    var conditions = Array.isArray(group.conditions)
      ? group.conditions.map(normalizeConditionItem)
      : group.conditions;

    return {
      logic: clean(group.logic),
      conditions: conditions,
    };
  }

  function isNestedConditionGroup(item) {
    return isPlainObject(item) && (hasOwn(item, 'logic') || hasOwn(item, 'conditions'));
  }

  function validateNonEmptyStringValues(values, errors, fieldPrefix, label) {
    var valid = true;
    var entries = Array.isArray(values) ? values : [values];

    entries.forEach(function (entry, index) {
      var suffix = Array.isArray(values) ? ('[' + index + ']') : '';
      if (typeof entry !== 'string' || isBlankString(entry)) {
        pushError(errors, fieldPrefix + '.value' + suffix, label + ' must be a non-empty string');
        valid = false;
      }
    });

    return valid;
  }

  function validateScalarMembership(values, allowedValues, errors, fieldPrefix, label) {
    var valid = validateNonEmptyStringValues(values, errors, fieldPrefix, label);
    if (!valid || !allowedValues) return valid;

    var entries = Array.isArray(values) ? values : [values];
    entries.forEach(function (entry, index) {
      var suffix = Array.isArray(values) ? ('[' + index + ']') : '';
      if (!includesValue(allowedValues, entry)) {
        pushError(errors, fieldPrefix + '.value' + suffix, 'unsupported ' + label + ': ' + entry);
        valid = false;
      }
    });

    return valid;
  }

  function validateOperatorValue(operator, value, errors, fieldPrefix) {
    var valid = true;
    var valueField = fieldPrefix + '.value';

    if (includesValue(NULL_VALUE_OPERATORS, operator)) {
      if (value !== null) {
        pushError(errors, valueField, operator + ' requires null value');
        valid = false;
      }
      return valid;
    }

    if (includesValue(ARRAY_OPERATORS, operator)) {
      if (!Array.isArray(value)) {
        pushError(errors, valueField, operator + ' requires an array value');
        return false;
      }
      if (value.length === 0) {
        pushError(errors, valueField, operator + ' requires a non-empty array value');
        valid = false;
      }
      value.forEach(function (entry, index) {
        if (!isJsonSafeValue(entry) || Array.isArray(entry)) {
          pushError(errors, valueField + '[' + index + ']', 'array entries must be JSON-safe scalars');
          valid = false;
        }
      });
      return valid;
    }

    if (includesValue(NUMERIC_OPERATORS, operator)) {
      if (!isFiniteNumber(value)) {
        pushError(errors, valueField, operator + ' requires a finite number value');
        valid = false;
      }
      return valid;
    }

    if (operator === 'contains') {
      if (typeof value === 'string') {
        if (isBlankString(value)) {
          pushError(errors, valueField, 'contains requires a non-empty string value');
          valid = false;
        }
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          pushError(errors, valueField, 'contains requires a non-empty array value');
          valid = false;
        }
        value.forEach(function (entry, index) {
          if (typeof entry !== 'string' || isBlankString(entry)) {
            pushError(errors, valueField + '[' + index + ']', 'contains array entries must be non-empty strings');
            valid = false;
          }
        });
      } else {
        pushError(errors, valueField, 'contains requires a string or array value');
        valid = false;
      }
      return valid;
    }

    if (operator === 'eq' || operator === 'neq') {
      if (!isJsonSafeValue(value) || Array.isArray(value)) {
        pushError(errors, valueField, operator + ' requires a JSON-safe scalar value');
        valid = false;
      }
      return valid;
    }

    if (!isJsonSafeValue(value)) {
      pushError(errors, valueField, 'value must be JSON-safe');
      valid = false;
    }

    return valid;
  }

  function validateSourceValueShape(source, operator, value, errors, fieldPrefix, context) {
    if (source === 'role') {
      if (includesValue(ARRAY_OPERATORS, operator)) {
        return validateScalarMembership(value, resolveRoleValues(context), errors, fieldPrefix, 'role');
      }
      return validateScalarMembership(value, resolveRoleValues(context), errors, fieldPrefix, 'role');
    }

    if (source === 'screenMode') {
      return validateScalarMembership(value, SCREEN_MODE_VALUES, errors, fieldPrefix, 'screen mode');
    }

    if (source === 'recordState') {
      return validateNonEmptyStringValues(value, errors, fieldPrefix, 'record state');
    }

    return true;
  }

  function validateConditionItemShape(item, errors, fieldPrefix, context) {
    var valid = true;
    var itemPrefix = fieldPrefix;

    if (!isPlainObject(item)) {
      pushError(errors, itemPrefix, 'condition must be an object');
      return false;
    }

    if (isNestedConditionGroup(item)) {
      pushError(errors, itemPrefix, 'nested condition groups are not supported');
      return false;
    }

    if (!hasOwn(item, 'source') || isBlankString(item.source)) {
      pushError(errors, itemPrefix + '.source', 'source is required');
      valid = false;
    } else if (!includesValue(SOURCE_VALUES, item.source)) {
      pushError(errors, itemPrefix + '.source', 'unsupported source: ' + item.source);
      valid = false;
    }

    if (!hasOwn(item, 'operator') || isBlankString(item.operator)) {
      pushError(errors, itemPrefix + '.operator', 'operator is required');
      valid = false;
    } else if (!includesValue(OPERATOR_VALUES, item.operator)) {
      pushError(errors, itemPrefix + '.operator', 'unsupported operator: ' + item.operator);
      valid = false;
    }

    if (!hasOwn(item, 'value')) {
      pushError(errors, itemPrefix + '.value', 'value is required');
      valid = false;
    } else if (!isJsonSafeValue(item.value)) {
      pushError(errors, itemPrefix + '.value', 'value must be JSON-safe');
      valid = false;
    }

    var source = item.source;
    if (includesValue(SOURCE_VALUES, source)) {
      if (source === 'field') {
        if (item.sourceId == null || isBlankString(String(item.sourceId))) {
          pushError(errors, itemPrefix + '.sourceId', 'field source requires sourceId');
          valid = false;
        }
      } else if (item.sourceId != null) {
        pushError(errors, itemPrefix + '.sourceId', source + ' source requires null sourceId');
        valid = false;
      }
    }

    if (hasOwn(item, 'operator') && hasOwn(item, 'value') && includesValue(OPERATOR_VALUES, item.operator)) {
      if (!validateOperatorValue(item.operator, item.value, errors, itemPrefix)) {
        valid = false;
      }
    }

    if (valid && includesValue(SOURCE_VALUES, source) && hasOwn(item, 'operator') && hasOwn(item, 'value')) {
      if (!validateSourceValueShape(source, item.operator, item.value, errors, itemPrefix, context)) {
        valid = false;
      }
    }

    return valid;
  }

  function validateConditionGroupShape(group, errors, fieldPrefix, context) {
    errors = errors || [];
    fieldPrefix = fieldPrefix || 'condition';
    context = context || {};

    if (group === null) return true;

    if (!isPlainObject(group)) {
      pushError(errors, fieldPrefix, 'condition group must be an object or null');
      return false;
    }

    var valid = true;

    if (!hasOwn(group, 'logic') || isBlankString(group.logic)) {
      pushError(errors, fieldPrefix + '.logic', 'logic is required');
      valid = false;
    } else if (!includesValue(LOGIC_VALUES, group.logic)) {
      pushError(errors, fieldPrefix + '.logic', 'unsupported logic: ' + group.logic);
      valid = false;
    }

    if (!Array.isArray(group.conditions)) {
      pushError(errors, fieldPrefix + '.conditions', 'conditions must be an array');
      return false;
    }

    if (group.conditions.length === 0) {
      pushError(errors, fieldPrefix + '.conditions', 'conditions must contain at least one item');
      valid = false;
    } else if (group.conditions.length > MAX_CONDITIONS) {
      pushError(errors, fieldPrefix + '.conditions', 'conditions must contain at most ' + MAX_CONDITIONS + ' items');
      valid = false;
    }

    group.conditions.forEach(function (item, index) {
      if (!validateConditionItemShape(item, errors, fieldPrefix + '.conditions[' + index + ']', context)) {
        valid = false;
      }
    });

    return valid;
  }

  function validateConditionReferences(group, context, errors, fieldPrefix) {
    errors = errors || [];
    fieldPrefix = fieldPrefix || 'condition';
    context = context || {};

    if (group === null) return true;
    if (!isPlainObject(group) || !Array.isArray(group.conditions)) return true;

    var fieldIds = toFieldIdSet(context.fieldIds);
    var valid = true;

    group.conditions.forEach(function (item, index) {
      if (!isPlainObject(item) || item.source !== 'field') return;

      var sourceId = normalizeNullableString(item.sourceId);
      if (!sourceId) return;

      if (!fieldIds.has(sourceId)) {
        pushError(
          errors,
          fieldPrefix + '.conditions[' + index + '].sourceId',
          'field sourceId must reference an existing screenField in the same screenSpec'
        );
        valid = false;
      }
    });

    return valid;
  }

  function validateConditionGroup(group, context, errors, fieldPrefix) {
    errors = errors || [];
    fieldPrefix = fieldPrefix || 'condition';
    context = context || {};

    if (group === null) return true;

    var shapeOk = validateConditionGroupShape(group, errors, fieldPrefix, context);
    if (!shapeOk) return false;

    return validateConditionReferences(group, context, errors, fieldPrefix);
  }

  function normalizeLayoutGridForRead(raw) {
    if (!isPlainObject(raw)) {
      return { row: null, column: null, span: 12 };
    }
    return {
      row: hasOwn(raw, 'row') ? raw.row : null,
      column: hasOwn(raw, 'column') ? raw.column : null,
      span: hasOwn(raw, 'span') ? raw.span : 12,
    };
  }

  function normalizeLayoutGridForWrite(layout, errors, fieldPrefix) {
    errors = errors || [];
    fieldPrefix = fieldPrefix || 'layout';

    if (layout == null) {
      pushError(errors, fieldPrefix, 'layout is required');
      return undefined;
    }

    if (!isPlainObject(layout)) {
      pushError(errors, fieldPrefix, 'layout must be an object');
      return undefined;
    }

    var valid = true;
    Object.keys(layout).forEach(function (key) {
      if (!includesValue(LAYOUT_GRID_KEYS, key)) {
        pushError(errors, fieldPrefix + '.' + key, 'unknown layout key');
        valid = false;
      }
    });

    var normalized = {
      row: null,
      column: null,
      span: 12,
    };

    if (hasOwn(layout, 'row')) {
      if (layout.row !== null && !isNonNegativeInteger(layout.row)) {
        pushError(errors, fieldPrefix + '.row', 'row must be null or a non-negative integer');
        valid = false;
      } else {
        normalized.row = layout.row;
      }
    }

    if (hasOwn(layout, 'column')) {
      if (layout.column !== null && !isNonNegativeInteger(layout.column)) {
        pushError(errors, fieldPrefix + '.column', 'column must be null or a non-negative integer');
        valid = false;
      } else {
        normalized.column = layout.column;
      }
    }

    if (hasOwn(layout, 'span')) {
      if (!includesValue(SPAN_VALUES, layout.span)) {
        pushError(errors, fieldPrefix + '.span', 'span must be an integer between 1 and 12');
        valid = false;
      } else {
        normalized.span = layout.span;
      }
    }

    return valid ? normalized : undefined;
  }

  function resolveFieldRoleForWrite(source, errors, defaultWhenMissing) {
    if (!hasOwn(source || {}, 'fieldRole')) {
      return defaultWhenMissing;
    }

    if (source.fieldRole === null || source.fieldRole === undefined) {
      pushError(errors, 'fieldRole', 'fieldRole cannot be null');
      return undefined;
    }

    if (typeof source.fieldRole !== 'string') {
      pushError(errors, 'fieldRole', 'fieldRole must be a string');
      return undefined;
    }

    if (isBlankString(source.fieldRole)) {
      pushError(errors, 'fieldRole', 'fieldRole cannot be empty');
      return undefined;
    }

    var normalized = clean(source.fieldRole);
    if (!includesValue(FIELD_ROLE_VALUES, normalized)) {
      pushError(errors, 'fieldRole', 'unsupported fieldRole: ' + normalized);
      return undefined;
    }

    return normalized;
  }

  function normalizeFieldRoleForRead(raw) {
    if (!hasOwn(raw || {}, 'fieldRole') || raw.fieldRole === undefined) {
      return 'input';
    }
    if (raw.fieldRole === null) {
      return null;
    }
    if (typeof raw.fieldRole === 'string') {
      return raw.fieldRole.trim();
    }
    return raw.fieldRole;
  }

  function normalizeSchemaVersionForRead(raw, defaultVersion) {
    if (!hasOwn(raw || {}, 'schemaVersion')) {
      return defaultVersion;
    }
    return raw.schemaVersion;
  }

  function conditionGroupReferencesFieldId(group, fieldId) {
    if (!group || !Array.isArray(group.conditions)) return false;
    var target = clean(fieldId);
    if (!target) return false;

    for (var i = 0; i < group.conditions.length; i += 1) {
      var item = group.conditions[i];
      if (!isPlainObject(item) || item.source !== 'field') continue;
      if (clean(item.sourceId) === target) return true;
    }

    return false;
  }

  function documentReferencesFieldId(doc, fieldId, conditionKeys) {
    if (!doc) return false;
    var keys = conditionKeys || ['visibilityCondition', 'enabledCondition', 'requiredCondition'];
    for (var i = 0; i < keys.length; i += 1) {
      if (conditionGroupReferencesFieldId(doc[keys[i]], fieldId)) return true;
    }
    return false;
  }

  function validateLayoutGrid(layout, errors, fieldPrefix) {
    errors = errors || [];
    fieldPrefix = fieldPrefix || 'layout';

    if (layout == null) {
      pushError(errors, fieldPrefix, 'layout is required');
      return false;
    }

    if (!isPlainObject(layout)) {
      pushError(errors, fieldPrefix, 'layout must be an object');
      return false;
    }

    var valid = true;

    Object.keys(layout).forEach(function (key) {
      if (!includesValue(LAYOUT_GRID_KEYS, key)) {
        pushError(errors, fieldPrefix + '.' + key, 'unknown layout key');
        valid = false;
      }
    });

    if (hasOwn(layout, 'row')) {
      if (layout.row !== null && !isNonNegativeInteger(layout.row)) {
        pushError(errors, fieldPrefix + '.row', 'row must be null or a non-negative integer');
        valid = false;
      }
    }

    if (hasOwn(layout, 'column')) {
      if (layout.column !== null && !isNonNegativeInteger(layout.column)) {
        pushError(errors, fieldPrefix + '.column', 'column must be null or a non-negative integer');
        valid = false;
      }
    }

    if (hasOwn(layout, 'span') && !includesValue(SPAN_VALUES, layout.span)) {
      pushError(errors, fieldPrefix + '.span', 'span must be an integer between 1 and 12');
      valid = false;
    }

    return valid;
  }

  function validateFieldRole(role, errors) {
    errors = errors || [];

    if (isBlankString(role)) {
      pushError(errors, 'fieldRole', 'fieldRole is required');
      return false;
    }

    var normalized = clean(role);
    if (!includesValue(FIELD_ROLE_VALUES, normalized)) {
      pushError(errors, 'fieldRole', 'unsupported fieldRole: ' + normalized);
      return false;
    }

    return true;
  }

  function validateSectionType(type, errors) {
    errors = errors || [];

    if (isBlankString(type)) {
      pushError(errors, 'sectionType', 'sectionType is required');
      return false;
    }

    var normalized = clean(type);
    if (!includesValue(SECTION_TYPE_VALUES, normalized)) {
      pushError(errors, 'sectionType', 'unsupported sectionType: ' + normalized);
      return false;
    }

    return true;
  }

  window.STAM.screenConditionContract = {
    LOGIC_VALUES: LOGIC_VALUES,
    SOURCE_VALUES: SOURCE_VALUES,
    OPERATOR_VALUES: OPERATOR_VALUES,
    SCREEN_MODE_VALUES: SCREEN_MODE_VALUES,
    ROLE_VALUES: ROLE_VALUES,
    MAX_CONDITIONS: MAX_CONDITIONS,
    SPAN_VALUES: SPAN_VALUES,
    FIELD_ROLE_VALUES: FIELD_ROLE_VALUES,
    LAYOUT_GRID_KEYS: LAYOUT_GRID_KEYS,
    SECTION_TYPE_VALUES: SECTION_TYPE_VALUES,
    clean: clean,
    normalizeNullableString: normalizeNullableString,
    normalizeConditionItem: normalizeConditionItem,
    normalizeConditionGroup: normalizeConditionGroup,
    validateConditionGroupShape: validateConditionGroupShape,
    validateConditionReferences: validateConditionReferences,
    validateConditionGroup: validateConditionGroup,
    validateLayoutGrid: validateLayoutGrid,
    normalizeLayoutGridForRead: normalizeLayoutGridForRead,
    normalizeLayoutGridForWrite: normalizeLayoutGridForWrite,
    resolveFieldRoleForWrite: resolveFieldRoleForWrite,
    normalizeFieldRoleForRead: normalizeFieldRoleForRead,
    normalizeSchemaVersionForRead: normalizeSchemaVersionForRead,
    conditionGroupReferencesFieldId: conditionGroupReferencesFieldId,
    documentReferencesFieldId: documentReferencesFieldId,
    validateFieldRole: validateFieldRole,
    validateSectionType: validateSectionType,
  };
}());
