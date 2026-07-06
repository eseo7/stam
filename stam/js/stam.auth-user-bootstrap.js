/* ============================================================
 * STAM Auth User Bootstrap — Firestore users/{uid} upsert
 * Scope: create or update login user profile on Google sign-in.
 * Depends: firebase-firestore v8, /__/firebase/init.js
 * ============================================================ */
(function () {
  'use strict';

  var PROVIDER = 'google';
  var DEFAULT_STATUS = 'active';

  function normalizeEmail(email) {
    var gate = window.STAM && window.STAM.authMembershipGate;
    if (gate && typeof gate.normalizeEmail === 'function') {
      return gate.normalizeEmail(email);
    }
    if (!email || typeof email !== 'string') return '';
    return email.trim().toLowerCase();
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

  function serverTimestamp() {
    return firebase.firestore.FieldValue.serverTimestamp();
  }

  function buildUserPayload(user) {
    return {
      email: user.email || '',
      emailNormalized: normalizeEmail(user.email),
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      provider: PROVIDER,
      status: DEFAULT_STATUS,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  function bootstrapUser(user) {
    if (!user || !user.uid) {
      return Promise.reject(new Error('User unavailable'));
    }

    var db = getFirestore();
    if (!db) {
      return Promise.reject(new Error('Firestore unavailable'));
    }

    var userRef = db.collection('users').doc(user.uid);

    return userRef.get().then(function (snap) {
      var payload = buildUserPayload(user);
      if (!snap.exists) {
        payload.createdAt = serverTimestamp();
      }
      return userRef.set(payload, { merge: true });
    });
  }

  window.STAM = window.STAM || {};
  window.STAM.authUserBootstrap = {
    normalizeEmail: normalizeEmail,
    bootstrapUser: bootstrapUser,
  };
}());
