/* ============================================================================
 * STAM Project Member Read Service — active member SSOT (WBS-3)
 * ----------------------------------------------------------------------------
 * Read-only boundary for projects/{projectId}/members active members.
 * No write APIs. No UI wiring on file load.
 * ========================================================================== */
(function () {
  'use strict';

  var ACTIONS = {
    READ: 'projectMember.read',
  };

  var READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];
  var VALID_MEMBER_ROLES = ['owner', 'admin', 'editor', 'viewer'];

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function defaultAuthorize() {
    return Promise.resolve(false);
  }

  function normalizeMemberRole(role) {
    return clean(role).toLowerCase();
  }

  function canReadProjectMembers(role) {
    return READ_ROLES.indexOf(normalizeMemberRole(role)) >= 0;
  }

  function createMemberRoleAuthorize(getMemberRole) {
    var resolveRole = typeof getMemberRole === 'function'
      ? getMemberRole
      : function (request) {
        var ctx = request && request.context ? request.context : {};
        return ctx.memberRole || ctx.role || '';
      };

    return function authorize(action, request) {
      if (action !== ACTIONS.READ) return false;
      return canReadProjectMembers(resolveRole(request));
    };
  }

  function normalizeMember(docId, projectId, data) {
    var raw = data || {};
    var memberUid = clean(docId);
    var memberName = clean(raw.displayName);
    var memberRole = normalizeMemberRole(raw.role);
    var memberEmail = clean(raw.email);
    if (!memberUid) return null;
    if (clean(raw.userId) !== memberUid) return null;
    if (clean(raw.projectId) !== clean(projectId)) return null;
    if (clean(raw.status) !== 'active') return null;
    if (!memberName) return null;
    if (VALID_MEMBER_ROLES.indexOf(memberRole) < 0) return null;
    return {
      memberUid: memberUid,
      memberName: memberName,
      memberRole: memberRole,
      memberEmail: memberEmail,
      projectId: clean(projectId),
      status: 'active',
    };
  }

  function compareMembers(a, b) {
    var an = clean(a.memberName).localeCompare(clean(b.memberName));
    if (an !== 0) return an;
    var ar = clean(a.memberRole).localeCompare(clean(b.memberRole));
    if (ar !== 0) return ar;
    return clean(a.memberUid).localeCompare(clean(b.memberUid));
  }

  function resolveFirestore(provided) {
    if (provided) return provided;
    if (window.firebase && typeof window.firebase.firestore === 'function') {
      return window.firebase.firestore();
    }
    throw new Error('projectMemberReadService: Firestore is not available');
  }

  function createFirestoreAdapter(options) {
    var opts = options || {};

    function db() {
      return resolveFirestore(opts.firestore);
    }

    function listActiveByProject(projectId) {
      var pid = clean(projectId);
      if (!pid) return Promise.reject(new Error('projectMemberReadService: projectId is required'));
      return db()
        .collection('projects')
        .doc(pid)
        .collection('members')
        .where('status', '==', 'active')
        .get()
        .then(function (snapshot) {
          var out = [];
          snapshot.forEach(function (doc) {
            var member = normalizeMember(doc.id, pid, doc.data ? doc.data() : {});
            if (member) out.push(member);
          });
          out.sort(compareMembers);
          return out;
        });
    }

    return {
      listActiveByProject: listActiveByProject,
    };
  }

  function resolveAdapter(adapter) {
    if (adapter) return adapter;
    return createFirestoreAdapter();
  }

  function createService(options) {
    var opts = options || {};
    var adapter = resolveAdapter(opts.adapter);
    var authorize = opts.authorize || defaultAuthorize;

    function check(action, projectId, context) {
      var ctx = Object.assign({}, context || {}, { projectId: projectId });
      return Promise.resolve(authorize(action, {
        action: action,
        projectId: projectId,
        context: ctx,
      })).then(function (allowed) {
        if (allowed !== true) throw new Error('projectMemberReadService: permission denied for ' + action);
        return true;
      });
    }

    function listActiveByProject(projectId, context) {
      var pid = clean(projectId);
      if (!pid) return Promise.reject(new Error('projectMemberReadService: projectId is required'));
      return check(ACTIONS.READ, pid, context).then(function () {
        return adapter.listActiveByProject(pid);
      });
    }

    return {
      ACTIONS: ACTIONS,
      listActiveByProject: listActiveByProject,
    };
  }

  function toOwnerSnapshot(member) {
    if (!member) return null;
    return {
      ownerId: clean(member.memberUid),
      ownerName: clean(member.memberName),
    };
  }

  function toReviewerSnapshot(member) {
    if (!member) {
      return {
        reviewerId: '',
        reviewerName: '',
      };
    }
    return {
      reviewerId: clean(member.memberUid),
      reviewerName: clean(member.memberName),
    };
  }

  function resolveDefaultOwner(members, authUser) {
    var uid = clean(authUser && (authUser.uid || authUser.userId));
    if (!uid) return null;
    var list = members || [];
    for (var i = 0; i < list.length; i += 1) {
      if (clean(list[i].memberUid) === uid) return list[i];
    }
    return null;
  }

  window.STAM = window.STAM || {};
  window.STAM.projectMemberReadService = createService();
  window.STAM.projectMemberReadServiceContract = {
    ACTIONS: ACTIONS,
    READ_ROLES: READ_ROLES,
    createFirestoreAdapter: createFirestoreAdapter,
    createService: createService,
    normalizeMember: normalizeMember,
    createMemberRoleAuthorize: createMemberRoleAuthorize,
    canReadProjectMembers: canReadProjectMembers,
    resolveDefaultOwner: resolveDefaultOwner,
    toOwnerSnapshot: toOwnerSnapshot,
    toReviewerSnapshot: toReviewerSnapshot,
  };
}());
