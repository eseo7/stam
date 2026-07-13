/* ============================================================================
 * STAM WBS Domain Service Contract
 * ----------------------------------------------------------------------------
 * Domain-first service boundary for WBS item CRUD.
 * - Screens call this service, not Firestore paths.
 * - Firestore is injected through STAM.wbsFirestoreAdapter.
 * - No UI wiring and no automatic runtime write path are exposed by loading this file.
 * ========================================================================== */
(function () {
  'use strict';

  var ACTIONS = {
    READ: 'wbs.read',
    CREATE: 'wbs.create',
    UPDATE: 'wbs.update',
  };

  var WRITE_ROLES = ['owner', 'admin', 'editor'];
  var READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];

  var PHASE_VALUES = ['착수', '분석', '설계', '구현', '검수', '오픈', '완료'];
  var STATUS_VALUES = ['wait', 'in_progress', 'delayed', 'done', 'hold'];
  var PRIORITY_VALUES = ['high', 'mid', 'low'];

  var DEFAULT_STATUS = 'wait';
  var DEFAULT_PRIORITY = 'mid';
  var DEFAULT_PROGRESS = 0;

  var ENUM_VALUES = {
    phase: PHASE_VALUES,
    status: STATUS_VALUES,
    priority: PRIORITY_VALUES,
  };

  var ENUM_DEFAULTS = {
    status: DEFAULT_STATUS,
    priority: DEFAULT_PRIORITY,
    progress: DEFAULT_PROGRESS,
  };

  var FORBIDDEN_FIELDS = [
    'approvalStatus',
    'riskLevel',
    'meetingIds',
    'parentId',
    'sortOrder',
    'reviewStatus',
    'importBatchId',
    'screenSpecId',
    'taskName',
    'taskType',
    'menuPath',
    'assignee',
    'reviewer',
    'effortEstimate',
    'functionId',
    'screenId',
    'parentWbsId',
    'sourceType',
  ];

  var REVIEWER_FIELDS = ['reviewerId', 'reviewerName'];
  var REQUIREMENT_FIELDS = ['requirementId', 'requirementCode', 'requirementTitle'];
  var FUNCTIONAL_SPEC_FIELDS = ['functionalSpecId', 'functionalSpecCode', 'functionalSpecTitle'];

  var OPTIONAL_STRING_FIELDS = [
    'businessArea',
    'screenPath',
    'description',
  ];

  var OPTIONAL_EFFORT_FIELDS = ['plannedEffort', 'actualEffort'];

  var IMMUTABLE_UPDATE_FIELDS = [
    'id',
    'projectId',
    'code',
    'createdAt',
    'createdBy',
    'isDeleted',
    'deletedAt',
    'deletedBy',
  ];

  var OWNER_FIELDS = ['ownerId', 'ownerName'];

  var REQ_CODE_RE = /^REQ_[0-9]{3,}$/;
  var FN_CODE_RE = /^FN_[0-9]{3,}$/;
  var DATE_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

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

  function requireProjectId(projectId) {
    var value = clean(projectId);
    if (!value) throw new Error('wbsService: projectId is required');
    return value;
  }

  function requireWbsItemId(wbsItemId) {
    var value = clean(wbsItemId);
    if (!value) throw new Error('wbsService: wbsItemId is required');
    return value;
  }

  function actorFromContext(context) {
    var ctx = context || {};
    var uid = clean(ctx.actorUid || ctx.uid || ctx.userId);
    if (!uid) throw new Error('wbsService: actorUid is required');
    return {
      uid: uid,
      name: clean(ctx.actorName || ctx.userName || ctx.displayName),
    };
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  function daysInMonth(year, month) {
    if (month === 2) return isLeapYear(year) ? 29 : 28;
    if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
    return 31;
  }

  function isValidCalendarDate(dateStr) {
    if (!DATE_RE.test(dateStr)) return false;
    var parts = dateStr.split('-');
    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > daysInMonth(year, month)) return false;
    var probe = new Date(year, month - 1, day);
    return probe.getFullYear() === year
      && probe.getMonth() === month - 1
      && probe.getDate() === day;
  }

  function normalizeEffort(value) {
    if (value === undefined || value === null || value === '') return undefined;
    var n = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(n) || n < 0) return NaN;
    return n;
  }

  function normalizeProgress(value) {
    if (value === undefined || value === null || value === '') return undefined;
    var n = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(n) || !Number.isInteger(n)) return NaN;
    return n;
  }

  function validateEnumField(errors, field, value, allowDefault) {
    if (isAbsent(value)) {
      if (allowDefault) return ENUM_DEFAULTS[field];
      return undefined;
    }
    var raw = typeof value === 'string' ? value.trim() : value;
    if (field === 'phase') {
      if (typeof raw !== 'string' || !raw) {
        pushError(errors, field, 'phase is required');
        return undefined;
      }
      if (PHASE_VALUES.indexOf(raw) < 0) {
        pushError(errors, field, 'invalid phase value');
        return undefined;
      }
      return raw;
    }
    var normalized = typeof raw === 'string' ? raw.toLowerCase() : raw;
    if (!normalized && allowDefault) return ENUM_DEFAULTS[field];
    if (ENUM_VALUES[field].indexOf(normalized) < 0) {
      pushError(errors, field, 'invalid ' + field + ' value');
      return undefined;
    }
    return normalized;
  }

  function validateProgressContract(errors, status, progress) {
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      pushError(errors, 'progress', 'progress must be an integer between 0 and 100');
      return;
    }
    if (status === 'done' && progress !== 100) {
      pushError(errors, 'progress', 'done status requires progress 100');
    } else if (status !== 'done' && progress >= 100) {
      pushError(errors, 'progress', 'non-done status requires progress below 100');
    }
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
      if (allEmpty) {
        pushError(errors, groupName, groupName + ' cannot be empty on create');
        return;
      }
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

  function validateRequirementTriplet(errors, source, mode) {
    validatePairGroup(errors, REQUIREMENT_FIELDS, source, mode, 'requirement', { allowUnlink: true });
    if (mode === 'create' || hasAnyField(source, REQUIREMENT_FIELDS)) {
      var code = clean(source.requirementCode);
      if (code && !REQ_CODE_RE.test(code)) {
        pushError(errors, 'requirementCode', 'requirementCode must match ^REQ_[0-9]{3,}$');
      }
    }
  }

  function validateFunctionalSpecTriplet(errors, source, mode) {
    validatePairGroup(errors, FUNCTIONAL_SPEC_FIELDS, source, mode, 'functionalSpec', { allowUnlink: true });
    if (mode === 'create' || hasAnyField(source, FUNCTIONAL_SPEC_FIELDS)) {
      var code = clean(source.functionalSpecCode);
      if (code && !FN_CODE_RE.test(code)) {
        pushError(errors, 'functionalSpecCode', 'functionalSpecCode must match ^FN_[0-9]{3,}$');
      }
    }
  }

  function hasAnyField(source, fields) {
    return fields.some(function (field) { return hasOwn(source, field); });
  }

  function validateForbiddenFields(errors, source) {
    FORBIDDEN_FIELDS.forEach(function (field) {
      if (hasOwn(source, field)) {
        pushError(errors, field, field + ' is not allowed');
      }
    });
    if (hasOwn(source, 'code')) {
      pushError(errors, 'code', 'code cannot be specified on input');
    }
  }

  function validateOwnerFields(errors, source, mode, current) {
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
    if (current && clean(source.ownerId) === '' && clean(source.ownerName) === '') {
      pushError(errors, 'owner', 'owner unlink is not allowed');
    }
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

  function validateWbsRecord(record, mode) {
    var source = record || {};
    var m = clean(mode) || 'create';
    var errors = [];

    if (m !== 'create' && m !== 'update') {
      pushError(errors, 'mode', 'mode must be create or update');
      return { valid: false, mode: m, errors: errors };
    }

    var title = clean(source.title);
    if (!title || title.length < 2 || title.length > 120) {
      pushError(errors, 'title', 'title must be 2-120 characters');
    }

    var phase = validateEnumField(errors, 'phase', source.phase, false);
    var status = validateEnumField(errors, 'status', source.status, m === 'create');
    var priority = validateEnumField(errors, 'priority', source.priority, m === 'create');

    var functionGroup = clean(source.functionGroup);
    if (!functionGroup || functionGroup.length < 1 || functionGroup.length > 120) {
      pushError(errors, 'functionGroup', 'functionGroup must be 1-120 characters');
    }

    var startDate = clean(source.startDate);
    var endDate = clean(source.endDate);
    if (!startDate || !isValidCalendarDate(startDate)) {
      pushError(errors, 'startDate', 'startDate must be a valid YYYY-MM-DD calendar date');
    }
    if (!endDate || !isValidCalendarDate(endDate)) {
      pushError(errors, 'endDate', 'endDate must be a valid YYYY-MM-DD calendar date');
    }
    if (startDate && endDate && isValidCalendarDate(startDate) && isValidCalendarDate(endDate) && endDate < startDate) {
      pushError(errors, 'endDate', 'endDate must be greater than or equal to startDate');
    }

    var progress;
    if (m === 'create' && isAbsent(source.progress)) {
      progress = DEFAULT_PROGRESS;
    } else {
      progress = normalizeProgress(source.progress);
      if (progress === undefined || Number.isNaN(progress)) {
        pushError(errors, 'progress', 'progress must be an integer');
        progress = NaN;
      }
    }

    if (status && !Number.isNaN(progress)) {
      validateProgressContract(errors, status, progress);
    }

    validateOwnerFields(errors, source, m, null);
    validatePairGroup(errors, REVIEWER_FIELDS, source, m, 'reviewer', { allowUnlink: m === 'update' });
    validateRequirementTriplet(errors, source, m);
    validateFunctionalSpecTriplet(errors, source, m);

    OPTIONAL_STRING_FIELDS.forEach(function (field) {
      if (hasOwn(source, field)) {
        var max = field === 'description' ? 4000 : (field === 'screenPath' ? 500 : 120);
        var min = field === 'screenPath' ? 0 : 1;
        var val = validateOptionalString(errors, field, source[field], max);
        if (val !== undefined && val === '' && min > 0) {
          // omit on payload build
        } else if (val !== undefined && val !== '' && min > 0 && val.length < min) {
          pushError(errors, field, field + ' length is invalid');
        }
      }
    });

    OPTIONAL_EFFORT_FIELDS.forEach(function (field) {
      if (hasOwn(source, field)) {
        var effort = normalizeEffort(source[field]);
        if (Number.isNaN(effort)) {
          pushError(errors, field, field + ' must be a non-negative number');
        }
      }
    });

  if (m === 'create') {
      if (!clean(source.projectId)) pushError(errors, 'projectId', 'projectId is required');
      ['createdAt', 'createdBy', 'updatedAt', 'updatedBy'].forEach(function (field) {
        if (!clean(source[field])) pushError(errors, field, field + ' is required');
      });
      if (source.deletedAt !== null) pushError(errors, 'deletedAt', 'deletedAt must be null on create');
      if (source.deletedBy !== null) pushError(errors, 'deletedBy', 'deletedBy must be null on create');
      if (source.isDeleted !== false) pushError(errors, 'isDeleted', 'isDeleted must be false on create');
      if (Number(source.version) !== 1) pushError(errors, 'version', 'version must be 1 on create');
    }

    return {
      valid: errors.length === 0,
      mode: m,
      errors: errors,
      normalized: {
        phase: phase,
        status: status,
        priority: priority,
        progress: progress,
      },
    };
  }

  function validateWbsInput(input, mode) {
    var source = input || {};
    var m = clean(mode) || 'create';
    var errors = [];

    if (m !== 'create' && m !== 'update') {
      pushError(errors, 'mode', 'mode must be create or update');
      return { valid: false, mode: m, errors: errors };
    }

    validateForbiddenFields(errors, source);

    if (m === 'update' && Object.keys(source).length === 0) {
      pushError(errors, 'patch', 'at least one field is required');
    }

    if (m === 'create') {
      if (hasOwn(source, 'status') && source.status !== undefined && source.status !== null && source.status !== '') {
        validateEnumField(errors, 'status', source.status, false);
      }
      if (hasOwn(source, 'priority') && source.priority !== undefined && source.priority !== null && source.priority !== '') {
        validateEnumField(errors, 'priority', source.priority, false);
      }
      if (hasOwn(source, 'phase')) validateEnumField(errors, 'phase', source.phase, false);
      if (hasOwn(source, 'progress') && source.progress !== undefined && source.progress !== null && source.progress !== '') {
        var p = normalizeProgress(source.progress);
        if (Number.isNaN(p)) pushError(errors, 'progress', 'progress must be an integer');
      }
    } else {
      ['phase', 'status', 'priority'].forEach(function (field) {
        if (hasOwn(source, field)) validateEnumField(errors, field, source[field], false);
      });
      if (hasOwn(source, 'progress')) {
        var progressVal = normalizeProgress(source.progress);
        if (Number.isNaN(progressVal)) pushError(errors, 'progress', 'progress must be an integer');
      }
    }

    validateOwnerFields(errors, source, m, null);
    validatePairGroup(errors, REVIEWER_FIELDS, source, m, 'reviewer', { allowUnlink: m === 'update' });
    validateRequirementTriplet(errors, source, m);
    validateFunctionalSpecTriplet(errors, source, m);

    if (m === 'create') {
      if (!clean(source.title)) pushError(errors, 'title', 'title is required');
      if (!clean(source.phase)) pushError(errors, 'phase', 'phase is required');
      if (!clean(source.functionGroup)) pushError(errors, 'functionGroup', 'functionGroup is required');
      if (!clean(source.startDate)) pushError(errors, 'startDate', 'startDate is required');
      if (!clean(source.endDate)) pushError(errors, 'endDate', 'endDate is required');
    }

    if (hasOwn(source, 'startDate') && clean(source.startDate) && !isValidCalendarDate(clean(source.startDate))) {
      pushError(errors, 'startDate', 'startDate must be a valid YYYY-MM-DD calendar date');
    }
    if (hasOwn(source, 'endDate') && clean(source.endDate) && !isValidCalendarDate(clean(source.endDate))) {
      pushError(errors, 'endDate', 'endDate must be a valid YYYY-MM-DD calendar date');
    }
    if (hasOwn(source, 'startDate') && hasOwn(source, 'endDate')
      && isValidCalendarDate(clean(source.startDate))
      && isValidCalendarDate(clean(source.endDate))
      && clean(source.endDate) < clean(source.startDate)) {
      pushError(errors, 'endDate', 'endDate must be greater than or equal to startDate');
    }

    FORBIDDEN_FIELDS.forEach(function (field) {
      if (hasOwn(source, field)) pushError(errors, field, field + ' is not allowed');
    });

    return {
      valid: errors.length === 0,
      mode: m,
      errors: errors,
    };
  }

  function assertValidInput(input, mode) {
    var result = validateWbsInput(input, mode);
    if (!result.valid) {
      throw new Error('wbsService: invalid ' + result.mode + ' input: ' + result.errors.map(function (err) {
        return err.field + ' ' + err.message;
      }).join(', '));
    }
    return result;
  }

  function assertValidRecord(record, mode) {
    var result = validateWbsRecord(record, mode);
    if (!result.valid) {
      throw new Error('wbsService: invalid ' + result.mode + ' record: ' + result.errors.map(function (err) {
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
      if (!hasOwn(source, field)) return;
      var value = validateOptionalString([], field, source[field], field === 'description' ? 4000 : (field === 'screenPath' ? 500 : 120));
      if (value) target[field] = value;
    });
  }

  function assignOptionalEffort(target, source) {
    OPTIONAL_EFFORT_FIELDS.forEach(function (field) {
      if (!hasOwn(source, field)) return;
      var effort = normalizeEffort(source[field]);
      if (effort !== undefined && !Number.isNaN(effort)) target[field] = effort;
    });
  }

  function assignLinkTriplet(target, source, fields) {
    var present = fields.filter(function (field) { return hasOwn(source, field); });
    if (present.length === 0) return;
    var allNonEmpty = fields.every(function (field) { return clean(source[field]) !== ''; });
    if (allNonEmpty) {
      fields.forEach(function (field) {
        target[field] = field.indexOf('Title') >= 0 ? clean(source[field]) : clean(source[field]);
      });
    }
  }

  function assignReviewer(target, source) {
    if (!hasAnyField(source, REVIEWER_FIELDS)) return;
    if (fieldsAllEmpty(source, REVIEWER_FIELDS)) return;
    if (fieldsAllNonEmpty(source, REVIEWER_FIELDS)) {
      target.reviewerId = clean(source.reviewerId);
      target.reviewerName = clean(source.reviewerName);
    }
  }

  function fieldsAllEmpty(source, fields) {
    return fields.every(function (field) { return hasOwn(source, field) && clean(source[field]) === ''; });
  }

  function fieldsAllNonEmpty(source, fields) {
    return fields.every(function (field) { return clean(source[field]) !== ''; });
  }

  function buildPayload(input, mode, context, current) {
    var source = Object.assign({}, input || {});
    var m = clean(mode) || 'create';
    var ctx = context || {};
    var actor = actorFromContext(ctx);
    var t = nowIso(ctx.clock);

    if (m === 'create') {
      assertValidInput(source, 'create');
      var projectId = requireProjectId(projectIdFromInput(source, ctx));
      var status = hasOwn(source, 'status') && !isAbsent(source.status) && clean(source.status) !== ''
        ? validateEnumField([], 'status', source.status, false)
        : DEFAULT_STATUS;
      var priority = hasOwn(source, 'priority') && !isAbsent(source.priority) && clean(source.priority) !== ''
        ? validateEnumField([], 'priority', source.priority, false)
        : DEFAULT_PRIORITY;
      var progress = hasOwn(source, 'progress') && !isAbsent(source.progress) && source.progress !== ''
        ? normalizeProgress(source.progress)
        : DEFAULT_PROGRESS;

      var payload = {
        id: clean(source.id) || undefined,
        projectId: projectId,
        title: clean(source.title),
        phase: validateEnumField([], 'phase', source.phase, false),
        functionGroup: clean(source.functionGroup),
        status: status,
        priority: priority,
        ownerId: clean(source.ownerId),
        ownerName: clean(source.ownerName),
        startDate: clean(source.startDate),
        endDate: clean(source.endDate),
        progress: progress,
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
      assignOptionalEffort(payload, source);
      assignReviewer(payload, source);
      assignLinkTriplet(payload, source, REQUIREMENT_FIELDS);
      assignLinkTriplet(payload, source, FUNCTIONAL_SPEC_FIELDS);

      assertValidRecord(payload, 'create');
      return payload;
    }

    var base = Object.assign({}, current || {});
    var patch = Object.assign({}, source || {});
    IMMUTABLE_UPDATE_FIELDS.forEach(function (key) { delete patch[key]; });
    delete patch.version;

    var candidate = Object.assign({}, base);
    Object.keys(patch).forEach(function (key) {
      candidate[key] = patch[key];
    });

    if (hasOwn(patch, 'title')) candidate.title = clean(patch.title);
    if (hasOwn(patch, 'phase')) candidate.phase = patch.phase;
    if (hasOwn(patch, 'functionGroup')) candidate.functionGroup = clean(patch.functionGroup);
    if (hasOwn(patch, 'status')) candidate.status = patch.status;
    if (hasOwn(patch, 'priority')) candidate.priority = patch.priority;
    if (hasOwn(patch, 'startDate')) candidate.startDate = clean(patch.startDate);
    if (hasOwn(patch, 'endDate')) candidate.endDate = clean(patch.endDate);
    if (hasOwn(patch, 'progress')) candidate.progress = normalizeProgress(patch.progress);
    if (hasOwn(patch, 'ownerId')) candidate.ownerId = clean(patch.ownerId);
    if (hasOwn(patch, 'ownerName')) candidate.ownerName = clean(patch.ownerName);

    assignOptionalStrings(candidate, patch);
    OPTIONAL_STRING_FIELDS.forEach(function (field) {
      if (hasOwn(patch, field) && clean(patch[field]) === '') delete candidate[field];
    });
    assignOptionalEffort(candidate, patch);

    if (fieldsAllEmpty(patch, REVIEWER_FIELDS)) {
      delete candidate.reviewerId;
      delete candidate.reviewerName;
    } else if (fieldsAllNonEmpty(patch, REVIEWER_FIELDS)) {
      candidate.reviewerId = clean(patch.reviewerId);
      candidate.reviewerName = clean(patch.reviewerName);
    }

    if (fieldsAllEmpty(patch, REQUIREMENT_FIELDS)) {
      REQUIREMENT_FIELDS.forEach(function (field) { delete candidate[field]; });
    } else if (fieldsAllNonEmpty(patch, REQUIREMENT_FIELDS)) {
      assignLinkTriplet(candidate, patch, REQUIREMENT_FIELDS);
    }

    if (fieldsAllEmpty(patch, FUNCTIONAL_SPEC_FIELDS)) {
      FUNCTIONAL_SPEC_FIELDS.forEach(function (field) { delete candidate[field]; });
    } else if (fieldsAllNonEmpty(patch, FUNCTIONAL_SPEC_FIELDS)) {
      assignLinkTriplet(candidate, patch, FUNCTIONAL_SPEC_FIELDS);
    }

    assertValidRecord(candidate, 'update');
    return candidate;
  }

  function buildCreatePayload(input, context, clock) {
    return buildPayload(input, 'create', Object.assign({}, context || {}, { clock: clock }), null);
  }

  function buildUpdatePatch(patch, context, clock) {
    assertValidInput(patch || {}, 'update');
    var actor = actorFromContext(context);
    var source = Object.assign({}, patch || {});
    IMMUTABLE_UPDATE_FIELDS.concat(['version']).forEach(function (key) {
      delete source[key];
    });

    var next = {};
    Object.keys(source).forEach(function (key) {
      next[key] = source[key];
    });
    next.updatedAt = nowIso(clock);
    next.updatedBy = actor.uid;
    return next;
  }

  function normalizeWbsItem(raw) {
    if (!raw) return null;
    var item = {
      id: clean(raw.id),
      projectId: clean(raw.projectId),
      code: clean(raw.code),
      title: clean(raw.title),
      phase: clean(raw.phase),
      functionGroup: clean(raw.functionGroup),
      status: STATUS_VALUES.indexOf(clean(raw.status)) >= 0 ? clean(raw.status) : clean(raw.status),
      priority: PRIORITY_VALUES.indexOf(clean(raw.priority)) >= 0 ? clean(raw.priority) : clean(raw.priority),
      ownerId: clean(raw.ownerId),
      ownerName: clean(raw.ownerName),
      startDate: clean(raw.startDate),
      endDate: clean(raw.endDate),
      progress: normalizeProgress(raw.progress),
      createdAt: raw.createdAt || null,
      createdBy: clean(raw.createdBy),
      updatedAt: raw.updatedAt || null,
      updatedBy: clean(raw.updatedBy),
      deletedAt: raw.deletedAt || null,
      deletedBy: raw.deletedBy == null ? null : clean(raw.deletedBy),
      isDeleted: raw.isDeleted === true,
      version: Number.isFinite(Number(raw.version)) ? Number(raw.version) : 1,
    };

    OPTIONAL_STRING_FIELDS.forEach(function (field) {
      if (raw[field] != null && clean(raw[field])) item[field] = clean(raw[field]);
    });
    OPTIONAL_EFFORT_FIELDS.forEach(function (field) {
      if (raw[field] != null && !Number.isNaN(normalizeEffort(raw[field]))) {
        item[field] = normalizeEffort(raw[field]);
      }
    });
    if (clean(raw.reviewerId) && clean(raw.reviewerName)) {
      item.reviewerId = clean(raw.reviewerId);
      item.reviewerName = clean(raw.reviewerName);
    }
    if (clean(raw.requirementId) && clean(raw.requirementCode) && clean(raw.requirementTitle)) {
      item.requirementId = clean(raw.requirementId);
      item.requirementCode = clean(raw.requirementCode);
      item.requirementTitle = clean(raw.requirementTitle);
    }
    if (clean(raw.functionalSpecId) && clean(raw.functionalSpecCode) && clean(raw.functionalSpecTitle)) {
      item.functionalSpecId = clean(raw.functionalSpecId);
      item.functionalSpecCode = clean(raw.functionalSpecCode);
      item.functionalSpecTitle = clean(raw.functionalSpecTitle);
    }
    return item;
  }

  function defaultAuthorize() {
    return Promise.resolve(false);
  }

  function normalizeMemberRole(role) {
    return clean(role).toLowerCase();
  }

  function canWriteWbs(role) {
    return WRITE_ROLES.indexOf(normalizeMemberRole(role)) >= 0;
  }

  function canReadWbs(role) {
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
        return canWriteWbs(role);
      }
      if (action === ACTIONS.READ) {
        return canReadWbs(role);
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
    if (window.STAM && window.STAM.wbsFirestoreAdapter) {
      return window.STAM.wbsFirestoreAdapter.create();
    }
    throw new Error('wbsService: adapter is required');
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
        if (allowed === false) throw new Error('wbsService: permission denied for ' + action);
        return true;
      });
    }

    function listByProject(projectId, query, context) {
      var pid = requireProjectId(projectId);
      var q = Object.assign({ includeDeleted: false }, query || {});
      return check(ACTIONS.READ, pid, q, context).then(function () {
        return adapter.listByProject(pid, q);
      }).then(function (items) {
        return (items || []).map(normalizeWbsItem).filter(Boolean);
      });
    }

    function getById(projectId, wbsItemId, context) {
      var pid = requireProjectId(projectId);
      var wid = requireWbsItemId(wbsItemId);
      return check(ACTIONS.READ, pid, { id: wid }, context).then(function () {
        return adapter.getById(pid, wid);
      }).then(normalizeWbsItem);
    }

    function create(projectId, input, context) {
      var pid = requireProjectId(projectId);
      var item = buildCreatePayload(Object.assign({}, input || {}, { projectId: pid }), context, clock);
      return check(ACTIONS.CREATE, pid, item, context).then(function () {
        return adapter.create(pid, item);
      }).then(function (saved) {
        return normalizeWbsItem(saved || item);
      });
    }

    function update(projectId, wbsItemId, patch, context) {
      var pid = requireProjectId(projectId);
      var wid = requireWbsItemId(wbsItemId);
      var sanitized = buildUpdatePatch(patch, context, clock);
      return check(ACTIONS.UPDATE, pid, { id: wid, patch: sanitized }, context).then(function () {
        return adapter.getById(pid, wid);
      }).then(function (currentRaw) {
        var current = normalizeWbsItem(currentRaw);
        if (!current) throw new Error('wbsService: wbs item not found');
        var finalCandidate = buildPayload(sanitized, 'update', context, current);
        var nextPatch = Object.assign({}, sanitized, {
          title: finalCandidate.title,
          phase: finalCandidate.phase,
          functionGroup: finalCandidate.functionGroup,
          status: finalCandidate.status,
          priority: finalCandidate.priority,
          ownerId: finalCandidate.ownerId,
          ownerName: finalCandidate.ownerName,
          startDate: finalCandidate.startDate,
          endDate: finalCandidate.endDate,
          progress: finalCandidate.progress,
          version: current.version + 1,
          updatedBy: actorFromContext(context).uid,
          updatedAt: nowIso(clock),
        });

        OPTIONAL_STRING_FIELDS.forEach(function (field) {
          if (finalCandidate[field] !== undefined) nextPatch[field] = finalCandidate[field];
          else if (hasOwn(sanitized, field) && clean(sanitized[field]) === '') nextPatch[field] = '';
        });
        OPTIONAL_EFFORT_FIELDS.forEach(function (field) {
          if (finalCandidate[field] !== undefined) nextPatch[field] = finalCandidate[field];
        });

        if (fieldsAllEmpty(sanitized, REVIEWER_FIELDS)) {
          nextPatch.reviewerId = '';
          nextPatch.reviewerName = '';
        } else if (fieldsAllNonEmpty(sanitized, REVIEWER_FIELDS)) {
          nextPatch.reviewerId = finalCandidate.reviewerId;
          nextPatch.reviewerName = finalCandidate.reviewerName;
        }

        if (fieldsAllEmpty(sanitized, REQUIREMENT_FIELDS)) {
          REQUIREMENT_FIELDS.forEach(function (field) { nextPatch[field] = ''; });
        } else if (fieldsAllNonEmpty(sanitized, REQUIREMENT_FIELDS)) {
          REQUIREMENT_FIELDS.forEach(function (field) {
            nextPatch[field] = finalCandidate[field];
          });
        }

        if (fieldsAllEmpty(sanitized, FUNCTIONAL_SPEC_FIELDS)) {
          FUNCTIONAL_SPEC_FIELDS.forEach(function (field) { nextPatch[field] = ''; });
        } else if (fieldsAllNonEmpty(sanitized, FUNCTIONAL_SPEC_FIELDS)) {
          FUNCTIONAL_SPEC_FIELDS.forEach(function (field) {
            nextPatch[field] = finalCandidate[field];
          });
        }

        return adapter.update(pid, wid, nextPatch);
      }).then(normalizeWbsItem);
    }

    return {
      ACTIONS: ACTIONS,
      listByProject: listByProject,
      getById: getById,
      create: create,
      update: update,
      normalizeWbsItem: normalizeWbsItem,
      validateWbsInput: validateWbsInput,
      validateWbsRecord: validateWbsRecord,
      buildCreatePayload: function (input, context) {
        return buildCreatePayload(input, context, clock);
      },
      buildUpdatePatch: function (patch, context) {
        return buildUpdatePatch(patch, context, clock);
      },
      buildPayload: function (input, mode, context, current) {
        return buildPayload(input, mode, Object.assign({}, context || {}, { clock: clock }), current);
      },
    };
  }

  window.STAM = window.STAM || {};
  window.STAM.wbsService = createService();
  window.STAM.wbsServiceContract = {
    ACTIONS: ACTIONS,
    WRITE_ROLES: WRITE_ROLES,
    READ_ROLES: READ_ROLES,
    PHASE_VALUES: PHASE_VALUES,
    STATUS_VALUES: STATUS_VALUES,
    PRIORITY_VALUES: PRIORITY_VALUES,
    FORBIDDEN_FIELDS: FORBIDDEN_FIELDS,
    createService: createService,
    normalizeWbsItem: normalizeWbsItem,
    validateWbsInput: validateWbsInput,
    validateWbsRecord: validateWbsRecord,
    buildCreatePayload: buildCreatePayload,
    buildUpdatePatch: buildUpdatePatch,
    buildPayload: buildPayload,
    normalizeMemberRole: normalizeMemberRole,
    canWriteWbs: canWriteWbs,
    canReadWbs: canReadWbs,
    createMemberRoleAuthorize: createMemberRoleAuthorize,
    isValidCalendarDate: isValidCalendarDate,
  };
}());
