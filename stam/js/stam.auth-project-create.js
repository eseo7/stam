/* ============================================================
 * STAM Auth Project Create — owner bootstrap on project create
 * Scope: create projects/{projectId} + members/{uid} (role: owner).
 * Depends: firebase-firestore v8, stam.auth-user-bootstrap patterns
 * ============================================================ */
(function () {
  'use strict';

  var DEFAULT_TENANT_ID = 'stam';

  function getScreen() {
    var body = document.body;
    return body ? body.getAttribute('data-stam-auth-screen') || '' : '';
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

  function getAuth() {
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
      return null;
    }
    return firebase.auth();
  }

  function normalizeEmail(email) {
    var bootstrap = window.STAM && window.STAM.authUserBootstrap;
    if (bootstrap && typeof bootstrap.normalizeEmail === 'function') {
      return bootstrap.normalizeEmail(email);
    }
    if (!email || typeof email !== 'string') return '';
    return email.trim().toLowerCase();
  }

  function serverTimestamp() {
    return firebase.firestore.FieldValue.serverTimestamp();
  }

  function slugCode(name) {
    var text = String(name || '').trim().toLowerCase();
    if (!text) return 'project';
    var slug = text
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    return slug || 'project';
  }

  function setCreateBusy(busy) {
    document.querySelectorAll('[data-stam-auth-action="create-project"]').forEach(function (btn) {
      btn.disabled = !!busy;
      btn.classList.toggle('is-disabled', !!busy);
      var label = btn.querySelector('.stam-btn__label');
      if (label) {
        label.textContent = busy ? '프로젝트 생성 중…' : '새 프로젝트 만들기';
      }
    });
  }

  function showCreateMessage(message) {
    document.querySelectorAll('[data-stam-project-create-message]').forEach(function (el) {
      el.textContent = message;
      el.hidden = !message;
    });
  }

  function clearCreateMessage() {
    showCreateMessage('');
  }

  function readCreateInput() {
    var nameInput = document.querySelector('[data-stam-project-create-name]');
    var descriptionInput = document.querySelector('[data-stam-project-create-description]');
    return {
      name: nameInput ? nameInput.value : '',
      description: descriptionInput ? descriptionInput.value : '',
    };
  }

  function createProject(user, input) {
    if (!user || !user.uid) {
      return Promise.reject(new Error('로그인이 필요합니다.'));
    }

    var name = String((input && input.name) || '').trim();
    if (!name) {
      return Promise.reject(new Error('프로젝트 이름을 입력해 주세요.'));
    }

    var db = getFirestore();
    if (!db) {
      return Promise.reject(new Error('데이터 저장소를 불러오지 못했습니다.'));
    }

    var projectRef = db.collection('projects').doc();
    var projectId = projectRef.id;
    var now = serverTimestamp();
    var email = user.email || '';
    var emailNormalized = normalizeEmail(email);
    var description = String((input && input.description) || '').trim();

    var projectDoc = {
      tenantId: DEFAULT_TENANT_ID,
      name: name,
      code: slugCode(name),
      description: description,
      status: 'active',
      ownerUserId: user.uid,
      createdAt: now,
      createdBy: user.uid,
      updatedAt: now,
      updatedBy: user.uid,
    };

    var memberDoc = {
      userId: user.uid,
      email: email,
      emailNormalized: emailNormalized,
      projectId: projectId,
      projectName: name,
      tenantId: DEFAULT_TENANT_ID,
      role: 'owner',
      status: 'active',
      joinedAt: now,
      createdAt: now,
      createdBy: user.uid,
      updatedAt: now,
      updatedBy: user.uid,
    };

    var batch = db.batch();
    batch.set(projectRef, projectDoc);
    batch.set(projectRef.collection('members').doc(user.uid), memberDoc);

    return batch.commit().then(function () {
      return {
        projectId: projectId,
        name: name,
      };
    });
  }

  function handleCreateProject() {
    var auth = getAuth();
    if (!auth) {
      showCreateMessage('로그인 기능을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    var user = auth.currentUser;
    if (!user) {
      showCreateMessage('로그인이 필요합니다.');
      return;
    }

    clearCreateMessage();
    setCreateBusy(true);

    var bootstrap = window.STAM && window.STAM.authUserBootstrap;
    var bootstrapPromise = (bootstrap && typeof bootstrap.bootstrapUser === 'function')
      ? bootstrap.bootstrapUser(user)
      : Promise.resolve();

    bootstrapPromise
      .then(function () {
        return createProject(user, readCreateInput());
      })
      .then(function () {
        window.location.replace('projects.html');
      })
      .catch(function (err) {
        var msg = (err && err.message) ? err.message : '프로젝트 생성에 실패했습니다.';
        showCreateMessage(msg);
      })
      .finally(function () {
        setCreateBusy(false);
      });
  }

  function onActionClick(event) {
    var btn = event.target.closest('[data-stam-auth-action="create-project"]');
    if (!btn || btn.disabled) return;
    handleCreateProject();
  }

  function initProjectCreate() {
    var screen = getScreen();
    if (screen !== 'project-select' && screen !== 'no-project') return;
    if (!document.querySelector('[data-stam-project-create-root]')) return;

    document.addEventListener('click', onActionClick);
  }

  document.addEventListener('DOMContentLoaded', initProjectCreate);

  window.STAM = window.STAM || {};
  window.STAM.authProjectCreate = {
    createProject: createProject,
    slugCode: slugCode,
  };
}());
