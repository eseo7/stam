/* ============================================================
 * STAM Auth Project List — Firestore read + project create (PR #356–#357)
 * Scope: list active memberships, render cards, create project + owner member.
 * Depends: firebase-firestore v8, stam.auth-membership-gate patterns
 * ============================================================ */
(function () {
  'use strict';

  var ROLE_BADGE = {
    owner: { className: 'lock', label: 'Owner' },
    admin: { className: 'lock', label: 'Admin' },
    editor: { className: 'guide', label: 'Editor' },
    viewer: { className: 'guide', label: 'Viewer' },
  };

  var PROJECT_NAME_MIN = 2;
  var PROJECT_NAME_MAX = 60;

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
    var gate = window.STAM && window.STAM.authMembershipGate;
    if (gate && typeof gate.normalizeEmail === 'function') {
      return gate.normalizeEmail(email);
    }
    if (!email || typeof email !== 'string') return '';
    return email.trim().toLowerCase();
  }

  function mergeMemberDocs(primaryDocs, secondaryDocs) {
    var byPath = {};
    (primaryDocs || []).forEach(function (doc) {
      byPath[doc.ref.path] = doc;
    });
    (secondaryDocs || []).forEach(function (doc) {
      byPath[doc.ref.path] = doc;
    });
    return Object.keys(byPath).map(function (path) {
      return byPath[path];
    });
  }

  function readActiveMemberDocs(db, uid, emailNormalized) {
    var reads = [
      db.collectionGroup('members').where('userId', '==', uid).get(),
    ];
    if (emailNormalized) {
      reads.push(
        db.collectionGroup('members').where('emailNormalized', '==', emailNormalized).get()
      );
    } else {
      reads.push(Promise.resolve({ docs: [] }));
    }

    return Promise.all(reads).then(function (results) {
      var merged = mergeMemberDocs(results[0].docs || [], results[1].docs || []);
      return merged.filter(function (doc) {
        var data = doc.data() || {};
        return data.status === 'active';
      });
    });
  }

  function projectIdFromMemberDoc(doc) {
    var data = doc.data() || {};
    if (data.projectId) return data.projectId;
    var parts = doc.ref.path.split('/');
    var projectsIdx = parts.indexOf('projects');
    if (projectsIdx >= 0 && parts[projectsIdx + 1]) {
      return parts[projectsIdx + 1];
    }
    return '';
  }

  function loadProjectRecord(db, projectId) {
    return db.collection('projects').doc(projectId).get().then(function (snap) {
      if (!snap.exists) {
        return { projectId: projectId, name: projectId, description: '' };
      }
      var data = snap.data() || {};
      return {
        projectId: projectId,
        name: data.name || data.projectName || projectId,
        description: data.description || '',
      };
    });
  }

  function loadActiveProjects(user) {
    var db = getFirestore();
    if (!db || !user || !user.uid) {
      return Promise.reject(new Error('Firestore or user unavailable'));
    }

    var emailNormalized = normalizeEmail(user.email);

    return readActiveMemberDocs(db, user.uid, emailNormalized).then(function (memberDocs) {
      if (!memberDocs.length) {
        return [];
      }

      var seen = {};
      var tasks = memberDocs.map(function (memberDoc) {
        var member = memberDoc.data() || {};
        var projectId = projectIdFromMemberDoc(memberDoc);
        if (!projectId || seen[projectId]) {
          return Promise.resolve(null);
        }
        seen[projectId] = true;

        return loadProjectRecord(db, projectId).then(function (project) {
          return {
            projectId: project.projectId,
            name: project.name || member.projectName || projectId,
            description: project.description || '',
            role: (member.role || 'viewer').toLowerCase(),
            status: member.status || 'active',
          };
        });
      });

      return Promise.all(tasks).then(function (rows) {
        return rows.filter(function (row) { return !!row; });
      });
    });
  }

  function validateProjectName(rawName) {
    var name = String(rawName == null ? '' : rawName).trim();
    if (name.length < PROJECT_NAME_MIN) {
      return { ok: false, message: '프로젝트 이름은 2자 이상 입력해 주세요.' };
    }
    if (name.length > PROJECT_NAME_MAX) {
      return { ok: false, message: '프로젝트 이름은 60자 이하로 입력해 주세요.' };
    }
    return { ok: true, value: name };
  }

  function buildTenantId(uid) {
    var prefix = String(uid || '').slice(0, 8);
    return prefix ? 'personal-' + prefix : 'default';
  }

  function createProjectWithOwner(user, projectName) {
    var db = getFirestore();
    if (!db || !user || !user.uid) {
      return Promise.reject(new Error('Firestore or user unavailable'));
    }

    var validation = validateProjectName(projectName);
    if (!validation.ok) {
      return Promise.reject(new Error(validation.message));
    }

    var trimmedName = validation.value;
    var email = user.email || '';
    if (!email) {
      return Promise.reject(new Error('로그인 계정 이메일을 확인할 수 없습니다.'));
    }

    var projectRef = db.collection('projects').doc();
    var projectId = projectRef.id;
    var memberRef = projectRef.collection('members').doc(user.uid);
    var now = firebase.firestore.FieldValue.serverTimestamp();
    var tenantId = buildTenantId(user.uid);
    var emailNormalized = normalizeEmail(email);

    var batch = db.batch();
    batch.set(projectRef, {
      projectId: projectId,
      projectName: trimmedName,
      name: trimmedName,
      status: 'active',
      tenantId: tenantId,
      ownerUid: user.uid,
      ownerEmail: email,
      createdBy: user.uid,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
    });
    batch.set(memberRef, {
      userId: user.uid,
      projectId: projectId,
      projectName: trimmedName,
      tenantId: tenantId,
      email: email,
      emailNormalized: emailNormalized,
      displayName: user.displayName || '',
      role: 'owner',
      status: 'active',
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
      createdBy: user.uid,
    });

    return batch.commit().then(function () {
      return {
        projectId: projectId,
        projectName: trimmedName,
      };
    });
  }

  function projectInitials(name) {
    var text = String(name || '').trim();
    if (!text) return 'PR';
    var parts = text.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return text.slice(0, 2).toUpperCase();
  }

  function roleBadge(role) {
    var key = String(role || '').toLowerCase();
    return ROLE_BADGE[key] || { className: 'plan', label: key || 'Member' };
  }

  function clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function openProjectOverview(projectId, projectName) {
    try {
      sessionStorage.setItem('stam:selectedProjectId', projectId);
      sessionStorage.setItem('stam:selectedProjectName', projectName || projectId);
    } catch (err) { /* ignore */ }

    var url = '/pages/dashboard/project-overview.html?projectId=' + encodeURIComponent(projectId);
    window.location.href = url;
  }

  function bindProjectOpenHandlers(root) {
    root.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-stam-open-project]');
      if (!btn || btn.disabled) return;

      var card = btn.closest('[data-stam-project-id]');
      if (!card) return;

      var projectId = card.getAttribute('data-stam-project-id');
      if (!projectId) return;

      var nameEl = card.querySelector('.stam-project-select-card__name');
      var projectName = nameEl ? nameEl.textContent.trim() : projectId;
      openProjectOverview(projectId, projectName);
    });
  }

  function renderProjectCard(project) {
    var badge = roleBadge(project.role);
    var card = document.createElement('div');
    card.className = 'stam-project-select-card';
    card.setAttribute('data-stam-project-id', project.projectId);

    card.innerHTML =
      '<div class="stam-project-select-card__hdr">' +
        '<div class="stam-project-select-card__ico" aria-hidden="true">' + projectInitials(project.name) + '</div>' +
        '<div class="stam-project-select-card__info">' +
          '<span class="stam-project-select-card__name"></span>' +
          '<span class="stam-project-select-card__desc"></span>' +
        '</div>' +
      '</div>' +
      '<div class="stam-project-select-card__footer">' +
        '<span class="status-badge s-active">접근 활성</span>' +
        '<span class="sbadge ' + badge.className + '"></span>' +
        '<button class="stam-btn stam-btn--sm stam-btn--primary" type="button" data-stam-open-project>프로젝트 열기</button>' +
      '</div>';

    card.querySelector('.stam-project-select-card__name').textContent = project.name;
    card.querySelector('.stam-project-select-card__desc').textContent =
      project.description || project.projectId;
    card.querySelector('.sbadge').textContent = badge.label;

    return card;
  }

  function setLoading(root, message) {
    var loading = root.querySelector('[data-stam-project-list-loading]');
    if (loading) {
      loading.textContent = message;
      loading.hidden = false;
    }
  }

  function hideLoading(root) {
    var loading = root.querySelector('[data-stam-project-list-loading]');
    if (loading) {
      loading.hidden = true;
    }
  }

  function renderProjectList(root, projects) {
    var cardsHost = root.querySelector('[data-stam-project-list-cards]');
    if (!cardsHost) return;

    clearNode(cardsHost);
    hideLoading(root);

    if (!projects.length) {
      setLoading(root, '접근 가능한 프로젝트가 없습니다. 새 프로젝트를 만들거나 초대 상태를 확인해 주세요.');
      return;
    }

    projects.forEach(function (project) {
      cardsHost.appendChild(renderProjectCard(project));
    });
  }

  function renderProjectListError(root, message) {
    var cardsHost = root.querySelector('[data-stam-project-list-cards]');
    if (cardsHost) clearNode(cardsHost);
    setLoading(root, message);
  }

  function setCreateMessage(root, message) {
    var el = root.querySelector('[data-stam-project-create-message]');
    if (!el) return;
    if (!message) {
      el.textContent = '';
      el.hidden = true;
      return;
    }
    el.textContent = message;
    el.hidden = false;
  }

  function setCreatePanelOpen(root, open) {
    var panel = root.querySelector('[data-stam-project-create-panel]');
    var showBtn = root.querySelector('[data-stam-project-create-show]');
    if (panel) panel.hidden = !open;
    if (showBtn) showBtn.hidden = !!open;
  }

  function setCreateBusy(root, busy) {
    root.querySelectorAll('[data-stam-project-create-submit], [data-stam-project-create-cancel], [data-stam-project-create-show]').forEach(function (btn) {
      btn.disabled = !!busy;
      btn.classList.toggle('is-disabled', !!busy);
    });
    var submit = root.querySelector('[data-stam-project-create-submit]');
    if (submit) {
      var label = submit.querySelector('.stam-btn__label');
      if (label) {
        label.textContent = busy ? '프로젝트 만드는 중…' : '프로젝트 만들기';
      } else {
        submit.textContent = busy ? '프로젝트 만드는 중…' : '프로젝트 만들기';
      }
    }
  }

  function bindProjectCreateHandlers(root, user) {
    if (root.getAttribute('data-stam-project-create-bound') === 'true') {
      return;
    }
    root.setAttribute('data-stam-project-create-bound', 'true');

    var nameInput = root.querySelector('[data-stam-project-create-name]');

    root.addEventListener('click', function (event) {
      var showBtn = event.target.closest('[data-stam-project-create-show]');
      if (showBtn && !showBtn.disabled) {
        setCreateMessage(root, '');
        setCreatePanelOpen(root, true);
        if (nameInput) nameInput.focus();
        return;
      }

      var cancelBtn = event.target.closest('[data-stam-project-create-cancel]');
      if (cancelBtn && !cancelBtn.disabled) {
        setCreateMessage(root, '');
        setCreatePanelOpen(root, false);
        if (nameInput) nameInput.value = '';
        return;
      }

      var submitBtn = event.target.closest('[data-stam-project-create-submit]');
      if (!submitBtn || submitBtn.disabled) return;

      var rawName = nameInput ? nameInput.value : '';
      var validation = validateProjectName(rawName);
      if (!validation.ok) {
        setCreateMessage(root, validation.message);
        return;
      }

      setCreateMessage(root, '');
      setCreateBusy(root, true);

      createProjectWithOwner(user, validation.value)
        .then(function (created) {
          openProjectOverview(created.projectId, created.projectName);
        })
        .catch(function (err) {
          var message = (err && err.message)
            ? err.message
            : '프로젝트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.';
          setCreateMessage(root, message);
        })
        .finally(function () {
          setCreateBusy(root, false);
        });
    });
  }

  function initProjectList() {
    if (getScreen() !== 'project-select') return;

    var root = document.querySelector('[data-stam-project-list-root]');
    if (!root) return;

    bindProjectOpenHandlers(root);

    var auth = getAuth();
    if (!auth) {
      renderProjectListError(root, '로그인 기능을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    auth.onAuthStateChanged(function (user) {
      if (!user) return;

      bindProjectCreateHandlers(root, user);
      setLoading(root, '프로젝트 목록을 불러오는 중…');

      loadActiveProjects(user)
        .then(function (projects) {
          renderProjectList(root, projects);
        })
        .catch(function () {
          renderProjectListError(root, '프로젝트 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        });
    });
  }

  function initProjectCreateOnly() {
    if (getScreen() !== 'no-project') return;

    var root = document.querySelector('[data-stam-project-create-root]');
    if (!root) return;

    var auth = getAuth();
    if (!auth) {
      setCreateMessage(root, '로그인 기능을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    auth.onAuthStateChanged(function (user) {
      if (!user) return;
      bindProjectCreateHandlers(root, user);
      setCreatePanelOpen(root, true);
    });
  }

  function initAuthProjectList() {
    initProjectList();
    initProjectCreateOnly();
  }

  document.addEventListener('DOMContentLoaded', initAuthProjectList);

  window.STAM = window.STAM || {};
  window.STAM.authProjectList = {
    loadActiveProjects: loadActiveProjects,
    renderProjectList: renderProjectList,
    validateProjectName: validateProjectName,
    buildTenantId: buildTenantId,
    createProjectWithOwner: createProjectWithOwner,
    openProjectOverview: openProjectOverview,
  };
}());
