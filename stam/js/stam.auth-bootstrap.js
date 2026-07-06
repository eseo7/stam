/* ============================================================
 * STAM Auth Bootstrap — Firebase Auth v8 (Hosting reserved URLs)
 * Scope: Google sign-in, auth state, sign-out, route guard shell.
 * Membership routing: STAM.authMembershipGate (stam.auth-membership-gate.js).
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

  function getScreen() {
    var body = document.body;
    return body ? body.getAttribute('data-stam-auth-screen') || '' : '';
  }

  function routeFor(screen) {
    return ROUTES[screen] || ROUTES.login;
  }

  function getAuth() {
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
      return null;
    }
    return firebase.auth();
  }

  function updateAccountEmail(email) {
    document.querySelectorAll('.stam-auth-state-card__row').forEach(function (row) {
      var label = row.querySelector('.stam-auth-state-card__label');
      var value = row.querySelector('.stam-auth-state-card__value');
      if (!label || !value) return;
      if (label.textContent.trim() !== '로그인 계정') return;
      value.textContent = email || '—';
    });
  }

  function updateUserAccountDisplay(user) {
    if (!user) return;

    var email = user.email || '—';
    var displayName = user.displayName || user.email || '—';

    document.querySelectorAll('[data-stam-user-email]').forEach(function (el) {
      el.textContent = email;
    });
    document.querySelectorAll('[data-stam-user-display-name]').forEach(function (el) {
      el.textContent = displayName;
    });
    updateAccountEmail(user.email || user.displayName || '—');
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

  function redirectTo(screen) {
    window.location.replace(routeFor(screen));
  }

  function applyMembershipRouteGuard(screen, targetScreen) {
    if (targetScreen === screen) {
      return;
    }

    if (screen === 'login') {
      redirectTo(targetScreen);
      return;
    }

    if (screen === 'project-select') {
      if (targetScreen !== 'project-select') {
        redirectTo(targetScreen);
      }
      return;
    }

    if (targetScreen === 'project-select') {
      redirectTo(targetScreen);
    }
  }

  function handleSignedOut(screen) {
    if (screen !== 'login') {
      redirectTo('login');
    }
  }

  function handleSignedIn(user, screen) {
    updateUserAccountDisplay(user);

    var bootstrap = window.STAM && window.STAM.authUserBootstrap;
    var gate = window.STAM && window.STAM.authMembershipGate;

    var bootstrapPromise = (bootstrap && typeof bootstrap.bootstrapUser === 'function')
      ? bootstrap.bootstrapUser(user)
      : Promise.resolve();

    bootstrapPromise
      .catch(function () {
        /* bootstrap failure is non-fatal; membership gate still routes access */
      })
      .then(function () {
        if (!gate || typeof gate.resolveTargetScreen !== 'function') {
          if (screen === 'login') {
            redirectTo('project-select');
          }
          return;
        }

        return gate.resolveTargetScreen(user).then(function (targetScreen) {
          applyMembershipRouteGuard(screen, targetScreen);
        });
      })
      .catch(function () {
        if (screen === 'login') {
          showAuthMessage('접근 권한 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        }
      });
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
      return;
    }

    clearAuthMessage();
    setGoogleButtonBusy(true);

    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    auth.signInWithPopup(provider)
      .catch(function (err) {
        if (err && err.code === 'auth/popup-closed-by-user') {
          return;
        }
        var msg = (err && err.message) ? err.message : 'Google 로그인에 실패했습니다.';
        showAuthMessage(msg);
      })
      .finally(function () {
        setGoogleButtonBusy(false);
      });
  }

  function signOut() {
    var auth = getAuth();
    if (!auth) {
      redirectTo('login');
      return;
    }

    auth.signOut()
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
  }

  function initAuthBootstrap() {
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

  document.addEventListener('DOMContentLoaded', initAuthBootstrap);

  window.STAM = window.STAM || {};
  window.STAM.authBootstrap = {
    getScreen: getScreen,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
  };
}());
