/* ============================================================
 * STAM Project Overview Context — guard + selected project context
 * Scope: auth/membership guard, projects/{id} read-only, context bar update.
 * No Firestore writes. Dashboard body data remains static (follow-up PR).
 * Depends: Firebase v8 reserved URLs, stam.project-context-render.js
 * ============================================================ */
(function () {
  'use strict';

  var ROUTES = {
    login: '/pages/auth/login.html',
    projects: '/pages/auth/projects.html',
    accessDenied: '/pages/auth/access-denied.html',
  };

  var STORAGE_PROJECT_ID = 'stam:selectedProjectId';
  var STORAGE_PROJECT_NAME = 'stam:selectedProjectName';
  var CLIENT_CTX_FALLBACK = 'STAM';

  function getAuth() {
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
      return null;
    }
    return firebase.auth();
  }

  function getFirestore() {
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
      return null;
    }
    if (typeof firebase.firestore !== 'function') {
      return null;
    }
    return firebase.firestore();
  }

  function getQueryProjectId() {
    try {
      var params = new URLSearchParams(window.location.search);
      return (params.get('projectId') || '').trim();
    } catch (err) {
      return '';
    }
  }

  function redirect(path) {
    window.location.replace(path);
  }

  function formatRole(role) {
    var key = String(role || '').toLowerCase();
    if (!key) return 'Member';
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  function formatUpdatedAt(value) {
    if (!value) return '';
    if (typeof value.toDate === 'function') {
      try {
        return '업데이트 ' + value.toDate().toLocaleString('ko-KR');
      } catch (err) {
        return '';
      }
    }
    return '업데이트 ' + String(value);
  }

  function formatStatus(status) {
    if (!status) return '진행중';
    var map = {
      active: '진행중',
      archived: '보관',
    };
    return map[String(status).toLowerCase()] || String(status);
  }

  function resolveClient(project) {
    var raw = project.client || project.clientName || '';
    return String(raw).trim();
  }

  function resolveStage(project, projectId) {
    var raw = project.stage || project.description || '';
    raw = String(raw).trim();
    if (raw) return raw;
    return project.name || project.projectName || projectId || 'Project';
  }

  function verifyProjectAccess(db, user, projectId) {
    var memberRef = db.collection('projects').doc(projectId).collection('members').doc(user.uid);
    var projectRef = db.collection('projects').doc(projectId);

    return memberRef.get().then(function (memberSnap) {
      if (!memberSnap.exists) {
        return { ok: false, reason: 'no-member' };
      }

      var member = memberSnap.data() || {};
      if (member.status !== 'active') {
        return { ok: false, reason: 'inactive' };
      }

      return projectRef.get().then(function (projectSnap) {
        if (!projectSnap.exists) {
          return { ok: false, reason: 'no-project' };
        }
        return {
          ok: true,
          project: projectSnap.data() || {},
          member: member,
        };
      });
    });
  }

  function applyProjectContext(projectId, project, member) {
    var name = project.name || project.projectName || projectId;
    var clientRaw = resolveClient(project);
    var clientCtx = clientRaw || CLIENT_CTX_FALLBACK;
    var stage = resolveStage(project, projectId);
    var status = formatStatus(project.status);
    var role = formatRole(member.role);
    var updated = formatUpdatedAt(project.updatedAt);
    var navMeta = {
      title: name,
      stage: stage,
      status: status,
      role: role,
    };

    try {
      sessionStorage.setItem(STORAGE_PROJECT_ID, projectId);
      sessionStorage.setItem(STORAGE_PROJECT_NAME, name);
    } catch (err) { /* ignore */ }

    var ctx = document.querySelector('[data-stam-project-context]');
    if (ctx) {
      ctx.setAttribute('data-pc-title', name);
      ctx.setAttribute('data-pc-client', clientCtx);
      ctx.setAttribute('data-pc-stage', stage);
      ctx.setAttribute('data-pc-status', status);
      ctx.setAttribute('data-pc-role', role);
      if (updated) {
        ctx.setAttribute('data-pc-updated', updated);
      }
    }

    window.STAM = window.STAM || {};
    window.STAM.currentProjectContext = navMeta;

    var leftNav = document.querySelector('[data-stam-left-nav]');
    if (leftNav) {
      leftNav.setAttribute('data-project-title', navMeta.title);
      leftNav.setAttribute('data-project-stage', navMeta.stage);
      leftNav.setAttribute('data-project-status', navMeta.status);
      leftNav.setAttribute('data-project-role', navMeta.role);
    }

    var topbar = document.querySelector('[data-stam-topbar]');
    if (topbar) {
      topbar.setAttribute('data-tb-crumbs', '내 프로젝트|' + name + '|Project Overview');
      topbar.setAttribute('data-tb-client', clientRaw);
    }

    document.title = 'Project Overview — ' + name + ' — STAM';

    if (window.STAM && window.STAM.projectContextRender && typeof STAM.projectContextRender.init === 'function') {
      STAM.projectContextRender.init();
    }
    if (window.STAM && window.STAM.topbarRender && typeof STAM.topbarRender.init === 'function') {
      STAM.topbarRender.init();
    }
    if (window.STAM && window.STAM.navRender && typeof STAM.navRender.init === 'function') {
      STAM.navRender.init('A1');
    }
  }

  function failWithMessage(message, path) {
    window.alert(message);
    redirect(path || ROUTES.projects);
  }

  function revealPage() {
    if (document.body) {
      document.body.hidden = false;
    }
  }

  function initProjectOverviewContext() {
    var projectId = getQueryProjectId();
    if (!projectId) {
      redirect(ROUTES.projects);
      return;
    }

    var auth = getAuth();
    var db = getFirestore();
    if (!auth || !db) {
      failWithMessage('Firebase를 사용할 수 없습니다. Hosting 환경에서 확인해 주세요.', ROUTES.projects);
      return;
    }

    auth.onAuthStateChanged(function (user) {
      if (!user) {
        redirect(ROUTES.login);
        return;
      }

      verifyProjectAccess(db, user, projectId)
        .then(function (result) {
          if (!result.ok) {
            if (result.reason === 'inactive' || result.reason === 'no-member') {
              redirect(ROUTES.accessDenied);
              return;
            }
            redirect(ROUTES.projects);
            return;
          }

          applyProjectContext(projectId, result.project, result.member);
          revealPage();
        })
        .catch(function () {
          failWithMessage('프로젝트 정보를 불러오지 못했습니다.', ROUTES.projects);
        });
    });
  }

  document.addEventListener('DOMContentLoaded', initProjectOverviewContext);

  window.STAM = window.STAM || {};
  window.STAM.projectOverviewContext = {
    verifyProjectAccess: verifyProjectAccess,
    applyProjectContext: applyProjectContext,
  };
}());
