/* ============================================================================
 * STAM Project Member Picker — owner / reviewer selector (WBS-3)
 * ----------------------------------------------------------------------------
 * Uses STAM.referencePicker + STAM.projectMemberReadServiceContract.
 * No write APIs. No auto-mount on file load.
 * ========================================================================== */
(function () {
  'use strict';

  var OWNER_PLACEHOLDER = '담당자 선택';
  var REVIEWER_PLACEHOLDER = '검토자 선택';
  var UNLINK_LABEL = '연결 없음';
  var SEARCH_PLACEHOLDER = '이름 또는 역할 검색';
  var EMPTY_LABEL = '표시할 프로젝트 멤버가 없습니다';

  var pickerByMode = {
    owner: null,
    reviewer: null,
  };

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function memberContract() {
    return window.STAM && window.STAM.projectMemberReadServiceContract;
  }

  function referencePickerApi() {
    if (!window.STAM || !window.STAM.referencePicker || typeof window.STAM.referencePicker.create !== 'function') {
      throw new Error('projectMemberPicker: referencePicker is required');
    }
    return window.STAM.referencePicker;
  }

  function createReadService(memberRole, adapter) {
    var contract = memberContract();
    if (!contract || typeof contract.createService !== 'function') {
      throw new Error('projectMemberPicker: projectMemberReadServiceContract is required');
    }
    var authorize = contract.createMemberRoleAuthorize(function (request) {
      var ctx = request && request.context ? request.context : {};
      return ctx.memberRole || ctx.role || memberRole || '';
    });
    return contract.createService({ authorize: authorize, adapter: adapter || null });
  }

  function listActiveMembers(projectId, context, memberRole, adapter) {
    var pid = clean(projectId);
    if (!pid) return Promise.reject(new Error('projectMemberPicker: projectId is required'));
    var readService = createReadService(memberRole, adapter);
    var ctx = Object.assign({}, context || {}, { memberRole: memberRole || (context && context.memberRole) });
    return readService.listActiveByProject(pid, ctx);
  }

  function disambiguationMeta(item, allItems) {
    var name = clean(item.memberName);
    var sameName = (allItems || []).filter(function (entry) {
      return clean(entry.memberName) === name;
    });
    if (sameName.length <= 1) return clean(item.memberRole);
    var email = clean(item.memberEmail);
    if (email) return clean(item.memberRole) + ' · ' + email;
    var uid = clean(item.memberUid);
    return clean(item.memberRole) + ' · ' + (uid.length > 8 ? uid.slice(0, 8) : uid);
  }

  function ensurePicker(mode) {
    if (pickerByMode[mode]) return pickerByMode[mode];
    var contract = memberContract();
    var isOwner = mode === 'owner';
    pickerByMode[mode] = referencePickerApi().create({
      type: 'projectMember-' + mode,
      placeholder: isOwner ? OWNER_PLACEHOLDER : REVIEWER_PLACEHOLDER,
      unlinkLabel: UNLINK_LABEL,
      searchPlaceholder: SEARCH_PLACEHOLDER,
      emptyLabel: EMPTY_LABEL,
      errorLabel: '프로젝트 멤버 목록을 불러오지 못했습니다',
      allowClear: !isOwner,
      loadItems: function (request) {
        return listActiveMembers(request.projectId, request.context, request.memberRole).then(function (items) {
          var rec = { items: items };
          rec.items.forEach(function (item) {
            item.__all = items;
          });
          return items;
        });
      },
      normalizeItem: function (raw) {
        if (!raw) return null;
        var normalized = contract.normalizeMember(raw.memberUid || raw.id, raw.projectId, {
          userId: raw.memberUid || raw.userId || raw.id,
          projectId: raw.projectId,
          status: raw.status || 'active',
          displayName: raw.memberName || raw.displayName,
          role: raw.memberRole || raw.role,
          email: raw.memberEmail || raw.email,
        });
        if (!normalized) return null;
        var allItems = raw.__all || [normalized];
        return {
          id: normalized.memberUid,
          code: normalized.memberUid,
          title: normalized.memberName,
          meta: disambiguationMeta(normalized, allItems),
          raw: normalized,
        };
      },
      normalizeValue: function (value) {
        if (!value) return { id: '', code: '', title: '', meta: '' };
        var id = clean(value.ownerId || value.reviewerId || value.id || value.memberUid);
        var title = clean(value.ownerName || value.reviewerName || value.memberName || value.title);
        if (!id && !title) return { id: '', code: '', title: '', meta: '' };
        if (!id || !title) {
          throw new Error('projectMemberPicker: partial member value is not allowed');
        }
        return { id: id, code: id, title: title, meta: '' };
      },
      toPublicValue: function (internal) {
        if (isOwner) {
          return {
            ownerId: clean(internal.id),
            ownerName: clean(internal.title),
          };
        }
        return {
          reviewerId: clean(internal.id),
          reviewerName: clean(internal.title),
        };
      },
      formatLabel: function (item) {
        return clean(item.title);
      },
      formatMeta: function (item) {
        return clean(item.meta);
      },
      filterText: function (item, query) {
        if (!query) return true;
        var hay = (clean(item.title) + ' ' + clean(item.meta) + ' ' + clean(item.id)).toLowerCase();
        return hay.indexOf(query) >= 0;
      },
      sortItems: function (items) {
        return (items || []).slice().sort(function (a, b) {
          var at = clean(a.title).localeCompare(clean(b.title));
          if (at !== 0) return at;
          return clean(a.id).localeCompare(clean(b.id));
        });
      },
    });
    return pickerByMode[mode];
  }

  function modeOf(container, options) {
    var opts = options || {};
    var explicitMode = clean(opts.mode);
    if (explicitMode) return explicitMode === 'reviewer' ? 'reviewer' : 'owner';
    var projectMemberMode = clean(container && container.getAttribute('data-stam-project-member-mode'));
    var wbsHook = clean(container && container.getAttribute('data-stam-wbs-member-picker'));
    var mode = projectMemberMode || wbsHook;
    return mode === 'reviewer' ? 'reviewer' : 'owner';
  }

  function pickerFor(container) {
    return ensurePicker(modeOf(container));
  }

  function mountOwner(container, options) {
    if (container) container.setAttribute('data-stam-project-member-mode', 'owner');
    ensurePicker('owner').mount(container, options);
  }

  function mountReviewer(container, options) {
    if (container) container.setAttribute('data-stam-project-member-mode', 'reviewer');
    ensurePicker('reviewer').mount(container, options);
  }

  function mount(container, options) {
    var opts = options || {};
    var mode = modeOf(container, opts);
    if (mode === 'reviewer') mountReviewer(container, opts);
    else mountOwner(container, opts);
  }

  function load(container) {
    return pickerFor(container).load(container);
  }

  function getValue(container) {
    return pickerFor(container).getValue(container);
  }

  function setValue(container, value) {
    pickerFor(container).setValue(container, value);
  }

  function clear(container) {
    pickerFor(container).clear(container);
  }

  function setDisabled(container, disabled) {
    pickerFor(container).setDisabled(container, disabled);
  }

  function refreshContext(container, options) {
    pickerFor(container).refreshContext(container, options);
  }

  function destroy(container) {
    pickerFor(container).destroy(container);
  }

  function applyDefaultOwner(container, members, authUser) {
    var contract = memberContract();
    var member = contract.resolveDefaultOwner(members, authUser);
    if (!member) {
      clear(container);
      return null;
    }
    setValue(container, contract.toOwnerSnapshot(member));
    return contract.toOwnerSnapshot(member);
  }

  window.STAM = window.STAM || {};
  window.STAM.projectMemberPicker = {
    create: function (options) {
      var opts = options || {};
      return {
        mode: opts.mode === 'reviewer' ? 'reviewer' : 'owner',
        mount: function (container, mountOptions) {
          mount(container, Object.assign({}, mountOptions || {}, { mode: opts.mode }));
        },
      };
    },
    createReadService: createReadService,
    listActiveMembers: listActiveMembers,
    mountOwner: mountOwner,
    mountReviewer: mountReviewer,
    mount: mount,
    load: load,
    getValue: getValue,
    setValue: setValue,
    clear: clear,
    setDisabled: setDisabled,
    refreshContext: refreshContext,
    applyDefaultOwner: applyDefaultOwner,
    destroy: destroy,
  };
}());
