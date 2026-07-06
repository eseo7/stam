/* ============================================================
 * STAM Auth — Google Provider skeleton (PR #354)
 * Scope: sign-in/out, auth state, route guard, user display.
 * No Firestore read/write. No users/{uid} upsert.
 * Depends: /__/firebase/init.js (auto-init), firebase-auth v8 compat
 * ============================================================ */
(function () {
  'use strict';

  var ROUTES = {
    login: 'login.html',
    'project-select': 'projects.html',
    'access-pending': 'access-pending.html',
    'access-denied': 'access-denied.html',
    'no-project': 'no-project.html',
  };

  var PROTECTED_SCREENS = {
    'project-select': true,
    'access-pending': true,
    'access-denied': true,
    'no-project': true,
  };

  function getScreen() {
    var body = document.body;
    return body ? body.getAttribute('data-stam-auth-screen') || '' : '';
  }

  function routeFor(screen) {
    return ROUTES[screen] || ROUTES.login;
  }

  function redirectTo(screen) {
    window.location.replace(routeFor(screen));
  }

  function getAuth() {
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
      return null;
    }
    return firebase.auth();
  }

  function getCurrentUser() {
    var auth = getAuth();
    return auth ? auth.currentUser : null;
  }

  function requireAuth() {
    return new Promise(function (resolve, reject) {
      var auth = getAuth();
      if (!auth) {
        redirectTo('login');
        reject(new Error('Auth unavailable'));
        return;
      }

      var unsubscribe = auth.onAuthStateChanged(function (user) {
        unsubscribe();
        if (!user) {
          redirectTo('login');
          reject(new Error('Not signed in'));
          return;
        }
        resolve(user);
      });
    });
  }

  function renderAuthUser(user) {
    var subject = user || getCurrentUser();
    if (!subject) return;

    var display = subject.email || subject.displayName || '—';

    document.querySelectorAll('.stam-auth-state-card__row').forEach(function (row) {
      var label = row.querySelector('.stam-auth-state-card__label');
      var value = row.querySelector('.stam-auth-state-card__value');
      if (!label || !value) return;
      if (label.textContent.trim() !== '로그인 계정') return;
      value.textContent = display;
    });

    document.querySelectorAll('[data-stam-auth-user-email]').forEach(function (el) {
      el.textContent = subject.email || '—';
    });

    document.querySelectorAll('[data-stam-auth-user-name]').forEach(function (el) {
      el.textContent = subject.displayName || subject.email || '—';
    });

    document.querySelectorAll('[data-stam-auth-user-photo]').forEach(function (el) {
      if (subject.photoURL) {
        el.src = subject.photoURL;
        el.hidden = false;
      } else {
        el.removeAttribute('src');
        el.hidden = true;
      }
    });
  }

  function setGoogleButtonBusy(busy) {
    document.querySelectorAll('[data-stam-auth-action="google-sign-in"]').forEach(function (btn) {
      btn.disabled = !!busy;
      btn.classList.toggle('is-disabled', !!busy);
      var label = btn.querySelector('.stam-btn__label');
      if (label) {
        label.textContent = busy ? 'Google 로그인 중…' : 'Google로 계속하기';
      }
    });
  }

  function showAuthMessage(message) {
    var card = document.querySelector('.stam-auth-card');
    if (!card) return;
    var el = card.querySelector('[data-stam-auth-message]');
    if (!el) {
      el = document.createElement('p');
      el.className = 'stam-auth-helper';
      el.setAttribute('data-stam-auth-message', '');
      card.appendChild(el);
    }
    el.textContent = message;
  }

  function clearAuthMessage() {
    document.querySelectorAll('[data-stam-auth-message]').forEach(function (el) {
      el.remove();
    });
  }

  function renderProjectSelectSkeleton() {
    if (getScreen() !== 'project-select') return;

    var loading = document.querySelector('[data-stam-project-list-loading]');
    if (loading) {
      loading.textContent = '프로젝트 목록 연결은 다음 단계에서 제공됩니다.';
      loading.removeAttribute('data-stam-project-list-loading');
      loading.setAttribute('data-stam-project-list-skeleton', '');
    }

    document.querySelectorAll('[data-stam-auth-action="create-project"]').forEach(function (btn) {
      btn.disabled = true;
      btn.classList.add('is-disabled');
      btn.setAttribute('aria-disabled', 'true');
    });
  }

  function handleSignedOut(screen) {
    if (PROTECTED_SCREENS[screen]) {
      redirectTo('login');
    }
  }

  function handleSignedIn(user, screen) {
    renderAuthUser(user);

    if (screen === 'login') {
      redirectTo('project-select');
      return;
    }

    if (screen === 'project-select') {
      renderProjectSelectSkeleton();
    }
  }

  function handleAuthState(user) {
    var screen = getScreen();

    if (!user) {
      handleSignedOut(screen);
      return;
    }

    handleSignedIn(user, screen);
  }

  function signInWithGoogle() {
    var auth = getAuth();
    if (!auth) {
      showAuthMessage('로그인 기능을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return Promise.reject(new Error('Auth unavailable'));
    }

    clearAuthMessage();
    setGoogleButtonBusy(true);

    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    return auth.signInWithPopup(provider)
      .catch(function (err) {
        if (err && err.code === 'auth/popup-closed-by-user') {
          return null;
        }
        showAuthMessage('Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        throw err;
      })
      .finally(function () {
        setGoogleButtonBusy(false);
      });
  }

  function signOut() {
    var auth = getAuth();
    if (!auth) {
      redirectTo('login');
      return Promise.resolve();
    }

    return auth.signOut()
      .catch(function () { /* redirect regardless */ })
      .finally(function () {
        redirectTo('login');
      });
  }

  function onActionClick(event) {
    var btn = event.target.closest('[data-stam-auth-action]');
    if (!btn || btn.disabled) return;

    var action = btn.getAttribute('data-stam-auth-action');
    if (action === 'google-sign-in') {
      if (getScreen() !== 'login') return;
      signInWithGoogle();
      return;
    }
    if (action === 'sign-out') {
      signOut();
      return;
    }
    if (action === 'refresh-status') {
      window.location.reload();
      return;
    }
    if (action === 'contact-admin') {
      showAuthMessage('프로젝트 관리자에게 사용 중인 Google 계정으로 접근 권한을 요청해 주세요.');
      return;
    }
    if (action === 'create-project') {
      showAuthMessage('프로젝트 생성은 다음 단계에서 제공됩니다.');
    }
  }

  function initAuth() {
    var auth = getAuth();
    if (!auth) {
      if (getScreen() === 'login') {
        showAuthMessage('로그인 준비 중입니다. 잠시 후 다시 시도해 주세요.');
      }
      return;
    }

    clearAuthMessage();
    auth.onAuthStateChanged(handleAuthState);
    document.addEventListener('click', onActionClick);
  }

  document.addEventListener('DOMContentLoaded', initAuth);

  window.STAM = window.STAM || {};
  window.STAM.auth = {
    getScreen: getScreen,
    getCurrentUser: getCurrentUser,
    requireAuth: requireAuth,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    renderAuthUser: renderAuthUser,
  };
}());
