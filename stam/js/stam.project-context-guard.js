/* ============================================================
 * STAM Project Context Guard — selected projectId contract
 * Scope: URL query + sessionStorage sync, nav href helper.
 * No Firestore read/write. No auth/membership enforcement.
 * ============================================================ */
(function () {
  'use strict';

  var STORAGE_PROJECT_ID = 'stam:selectedProjectId';
  var STORAGE_PROJECT_NAME = 'stam:selectedProjectName';
  var PROJECTS_ROUTE = '/pages/auth/projects.html';

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function isAuthPath() {
    return /\/pages\/auth\//.test(window.location.pathname || '');
  }

  function getQueryProjectId() {
    try {
      return clean(new URLSearchParams(window.location.search).get('projectId'));
    } catch (err) {
      return '';
    }
  }

  function getStoredProjectId() {
    try {
      return clean(window.sessionStorage.getItem(STORAGE_PROJECT_ID));
    } catch (err) {
      return '';
    }
  }

  function getStoredProjectName() {
    try {
      return clean(window.sessionStorage.getItem(STORAGE_PROJECT_NAME));
    } catch (err) {
      return '';
    }
  }

  function persistSelection(projectId, projectName) {
    try {
      window.sessionStorage.setItem(STORAGE_PROJECT_ID, projectId);
      if (projectName) {
        window.sessionStorage.setItem(STORAGE_PROJECT_NAME, projectName);
      }
    } catch (err) { /* ignore */ }
  }

  function syncUrlProjectId(projectId) {
    if (!projectId) return;
    try {
      var url = new URL(window.location.href);
      if (clean(url.searchParams.get('projectId')) === projectId) return;
      url.searchParams.set('projectId', projectId);
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      return;
    } catch (err) { /* fall through */ }

    var search = window.location.search || '';
    if (search.indexOf('projectId=') >= 0) return;
    var sep = search ? '&' : '?';
    window.history.replaceState(
      null,
      '',
      window.location.pathname + search + sep + 'projectId=' + encodeURIComponent(projectId) + window.location.hash
    );
  }

  function redirectToProjects() {
    window.location.replace(PROJECTS_ROUTE);
  }

  function getSelectedProjectId() {
    return getQueryProjectId() || getStoredProjectId();
  }

  function getSelectedProjectName() {
    return getStoredProjectName();
  }

  function requireProjectContext() {
    if (isAuthPath()) {
      return getSelectedProjectId();
    }

    var urlId = getQueryProjectId();
    var storedId = getStoredProjectId();
    var storedName = getStoredProjectName();

    if (urlId) {
      if (storedId === urlId && storedName) {
        persistSelection(urlId, storedName);
      } else {
        persistSelection(urlId, storedName && storedId === urlId ? storedName : urlId);
      }
      return urlId;
    }

    if (storedId) {
      syncUrlProjectId(storedId);
      return storedId;
    }

    redirectToProjects();
    return '';
  }

  function withProjectId(href) {
    var target = clean(href);
    if (!target || target === '#') return href;
    if (target.indexOf('projectId=') >= 0) return href;

    var projectId = getSelectedProjectId();
    if (!projectId) return href;

    var hashIndex = target.indexOf('#');
    var base = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
    var hash = hashIndex >= 0 ? target.slice(hashIndex) : '';
    var sep = base.indexOf('?') >= 0 ? '&' : '?';
    return base + sep + 'projectId=' + encodeURIComponent(projectId) + hash;
  }

  function autoInit() {
    if (!isAuthPath()) {
      requireProjectContext();
    }
  }

  window.STAM = window.STAM || {};
  window.STAM.projectContextGuard = {
    getSelectedProjectId: getSelectedProjectId,
    getSelectedProjectName: getSelectedProjectName,
    requireProjectContext: requireProjectContext,
    withProjectId: withProjectId,
  };

  autoInit();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  }
}());
