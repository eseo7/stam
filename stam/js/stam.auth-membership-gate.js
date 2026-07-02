/* ============================================================
 * STAM Auth Membership Gate — Firestore read-only routing
 * Scope: users/{uid} + projects/{projectId}/members/{uid} lookup,
 *        membership status → auth route target screen.
 * No Firestore writes, no user auto-create, no CRUD.
 * Depends: firebase-firestore v8, /__/firebase/init.js
 * ============================================================ */
(function () {
  'use strict';

  var TARGET_SCREENS = {
    login: 'login',
    'project-select': 'project-select',
    'access-pending': 'access-pending',
    'access-denied': 'access-denied',
    'no-project': 'no-project',
  };

  function normalizeEmail(email) {
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

  function collectStatuses(memberDocs) {
    var statuses = {
      active: false,
      pending: false,
      removed: false,
    };

    memberDocs.forEach(function (doc) {
      var status = doc.exists && doc.data() ? doc.data().status : '';
      if (status === 'active') statuses.active = true;
      if (status === 'pending') statuses.pending = true;
      if (status === 'removed') statuses.removed = true;
    });

    return statuses;
  }

  function resolveTargetFromMembership(userDocSnap, memberDocs) {
    if (userDocSnap && userDocSnap.exists) {
      var userData = userDocSnap.data() || {};
      if (userData.status === 'disabled') {
        return TARGET_SCREENS['access-denied'];
      }
    }

    var statuses = collectStatuses(memberDocs);

    if (statuses.active) {
      return TARGET_SCREENS['project-select'];
    }
    if (statuses.pending) {
      return TARGET_SCREENS['access-pending'];
    }
    if (statuses.removed) {
      return TARGET_SCREENS['access-denied'];
    }
    return TARGET_SCREENS['no-project'];
  }

  function readMembershipDocs(db, uid, emailNormalized) {
    var userRef = db.collection('users').doc(uid);
    var byUserId = db.collectionGroup('members').where('userId', '==', uid);

    var reads = [
      userRef.get(),
      byUserId.get(),
    ];

    if (emailNormalized) {
      reads.push(
        db.collectionGroup('members').where('emailNormalized', '==', emailNormalized).get()
      );
    } else {
      reads.push(Promise.resolve({ docs: [] }));
    }

    return Promise.all(reads).then(function (results) {
      var userDocSnap = results[0];
      var membersByUserId = results[1].docs || [];
      var membersByEmail = results[2].docs || [];

      return {
        userDocSnap: userDocSnap,
        memberDocs: mergeMemberDocs(membersByUserId, membersByEmail),
      };
    });
  }

  function resolveTargetScreen(user) {
    if (!user || !user.uid) {
      return Promise.resolve(TARGET_SCREENS.login);
    }

    var db = getFirestore();
    if (!db) {
      return Promise.reject(new Error('Firestore unavailable'));
    }

    var emailNormalized = normalizeEmail(user.email);

    return readMembershipDocs(db, user.uid, emailNormalized).then(function (payload) {
      return resolveTargetFromMembership(payload.userDocSnap, payload.memberDocs);
    });
  }

  window.STAM = window.STAM || {};
  window.STAM.authMembershipGate = {
    TARGET_SCREENS: TARGET_SCREENS,
    normalizeEmail: normalizeEmail,
    resolveTargetScreen: resolveTargetScreen,
  };
}());
