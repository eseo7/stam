/* ============================================================================
 * STAM Project Cycle DB Prototype — Local Adapter (IndexedDB)
 * ----------------------------------------------------------------------------
 * CycleRepo 인터페이스의 IndexedDB 구현. 외부 의존(Firebase/Firestore) 없음.
 * 한 브라우저 안에서 실제 저장/조회/재로드 유지를 검증한다.
 *
 * DB명: stam-prototype-cycle-db
 * stores: projects / artifacts / artifactLinks / artifactChanges
 * ==========================================================================*/
(function () {
  'use strict';

  var DB_NAME = 'stam-prototype-cycle-db';
  var DB_VER = 1;

  // store -> keyPath
  var STORES = {
    projects: 'projectId',
    artifacts: 'artifactId',
    artifactLinks: 'linkId',
    artifactChanges: 'changeId'
  };

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB not supported in this browser'));
        return;
      }
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        Object.keys(STORES).forEach(function (name) {
          if (db.objectStoreNames.contains(name)) return;
          var os = db.createObjectStore(name, { keyPath: STORES[name] });
          if (name === 'artifacts') {
            os.createIndex('byProject', 'projectId', { unique: false });
            os.createIndex('byProjectType', ['projectId', 'artifactType'], { unique: false });
          } else if (name === 'artifactLinks') {
            os.createIndex('byProject', 'projectId', { unique: false });
            os.createIndex('byFrom', ['projectId', 'fromArtifactId'], { unique: false });
            os.createIndex('byTo', ['projectId', 'toArtifactId'], { unique: false });
          } else if (name === 'artifactChanges') {
            os.createIndex('byProject', 'projectId', { unique: false });
            os.createIndex('byArtifact', ['projectId', 'artifactId'], { unique: false });
          }
        });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function withStore(store, mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, mode);
        var os = tx.objectStore(store);
        var out = fn(os);
        tx.oncomplete = function () { db.close(); resolve(out && out.value !== undefined ? out.value : out); };
        tx.onerror = function () { db.close(); reject(tx.error); };
        tx.onabort = function () { db.close(); reject(tx.error); };
      });
    });
  }

  function put(store, val) {
    return withStore(store, 'readwrite', function (os) {
      os.put(val);
      return { value: val };
    });
  }

  function getOne(store, key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var r = db.transaction(store, 'readonly').objectStore(store).get(key);
        r.onsuccess = function () { db.close(); resolve(r.result || null); };
        r.onerror = function () { db.close(); reject(r.error); };
      });
    });
  }

  function listByProject(store, projectId) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var out = [];
        var idx = db.transaction(store, 'readonly').objectStore(store).index('byProject');
        var cur = idx.openCursor(IDBKeyRange.only(projectId));
        cur.onsuccess = function (e) {
          var c = e.target.result;
          if (c) { out.push(c.value); c.continue(); }
          else { db.close(); resolve(out); }
        };
        cur.onerror = function () { db.close(); reject(cur.error); };
      });
    });
  }

  function clearAllStores() {
    return openDb().then(function (db) {
      return Promise.all(Object.keys(STORES).map(function (name) {
        return new Promise(function (resolve, reject) {
          var r = db.transaction(name, 'readwrite').objectStore(name).clear();
          r.onsuccess = function () { resolve(); };
          r.onerror = function () { reject(r.error); };
        });
      })).then(function () { db.close(); });
    });
  }

  var adapter = {
    name: 'local-indexeddb',
    dbName: DB_NAME,

    // ── CycleRepo interface ──────────────────────────────────────
    getProject: function (projectId) { return getOne('projects', projectId); },
    saveArtifact: function (artifact) { return put('artifacts', artifact); },
    listArtifacts: function (projectId) { return listByProject('artifacts', projectId); },
    saveLink: function (link) { return put('artifactLinks', link); },
    listLinks: function (projectId) { return listByProject('artifactLinks', projectId); },
    appendChange: function (change) { return put('artifactChanges', change); },
    listChanges: function (projectId) { return listByProject('artifactChanges', projectId); },

    // ── helpers (인터페이스 외) ─────────────────────────────────
    saveProject: function (project) { return put('projects', project); },
    reset: function () { return clearAllStores(); }
  };

  window.STAM_CYCLE = window.STAM_CYCLE || {};
  if (window.STAM_CYCLE.repoContract && window.STAM_CYCLE.repoContract.assertImplements) {
    window.STAM_CYCLE.repoContract.assertImplements(adapter, 'local-indexeddb');
  }
  window.STAM_CYCLE.LocalRepo = adapter;
}());
