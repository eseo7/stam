/* ============================================================================
 * STAM Local Core DB v2 — IndexedDB 어댑터 (실DB 논리 구조 정렬)
 * ----------------------------------------------------------------------------
 * stam.core-db-schema.js 의 논리 구조를 IndexedDB 로 구현한다. 6개 게시판
 * 데이터를 게시판별 store 에 저장하고, import 이력(importBatches/importRows)과
 * 링크/변경기록을 함께 보관한다.
 *
 * 보존 원칙(중요):
 *  - Local DB도 DB다. 사용자가 명시적으로 초기화하지 않는 한 데이터를 보존한다.
 *  - 자동 clear 금지. indexedDB.deleteDatabase() 금지. 자동 seed 금지.
 *  - openDB 는 store/index 구조만 만든다. 데이터 row 자동 생성 없음.
 *  - 삭제는 soft delete(status=deleted) 가 기본. list 기본 조회에서 제외.
 *
 * 외부 라이브러리/Firebase/Firestore/API 미사용.
 * ==========================================================================*/
(function () {
  'use strict';

  var schema = window.STAM_CORE && window.STAM_CORE.schema;
  if (!schema) { throw new Error('stam.local-core-db: schema(stam.core-db-schema.js) 가 먼저 로드되어야 합니다.'); }

  var DB_NAME = schema.DB_NAME;
  var DB_VERSION = schema.DB_VERSION;
  var STORES = schema.STORES;
  var INDEX_KEYPATH = schema.INDEX_KEYPATH;
  var SOFT_DELETE = schema.SOFT_DELETE;
  var DEFAULT_BY = 'prototype-user';

  function nowIso() { return new Date().toISOString(); }

  // ── openDB: store/index 구조만 생성 (seed 없음) ──────────────────
  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB not supported in this browser')); return; }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        Object.keys(STORES).forEach(function (name) {
          var def = STORES[name];
          var os = db.objectStoreNames.contains(name)
            ? e.target.transaction.objectStore(name)
            : db.createObjectStore(name, { keyPath: def.keyPath });
          (def.indexes || []).forEach(function (idxName) {
            if (!os.indexNames.contains(idxName)) {
              os.createIndex(idxName, INDEX_KEYPATH[idxName], { unique: false });
            }
          });
        });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function assertStore(table) {
    if (!STORES[table]) throw new Error('STAM_CORE.db: 알 수 없는 store "' + table + '"');
  }

  function put(table, val) {
    assertStore(table);
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(table, 'readwrite');
        tx.objectStore(table).put(val);
        tx.oncomplete = function () { db.close(); resolve(val); };
        tx.onerror = function () { db.close(); reject(tx.error); };
        tx.onabort = function () { db.close(); reject(tx.error); };
      });
    });
  }

  function get(table, key) {
    assertStore(table);
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var r = db.transaction(table, 'readonly').objectStore(table).get(key);
        r.onsuccess = function () { db.close(); resolve(r.result || null); };
        r.onerror = function () { db.close(); reject(r.error); };
      });
    });
  }

  // ── soft delete 필드 보강 (생성 시 null 로 채움) ────────────────
  function withSoftDeleteFields(rec) {
    if (rec.deletedAt === undefined) rec.deletedAt = null;
    if (rec.deletedBy === undefined) rec.deletedBy = null;
    if (rec.deleteReason === undefined) rec.deleteReason = null;
    return rec;
  }

  // ── createRecord: 게시판/공통 record 생성 ───────────────────────
  function createRecord(table, record) {
    var rec = Object.assign({}, record);
    var t = nowIso();
    if (!rec.status) rec.status = schema.STATUS.DRAFT;
    if (!rec.createdAt) rec.createdAt = t;
    if (!rec.updatedAt) rec.updatedAt = t;
    if (!rec.createdBy) rec.createdBy = DEFAULT_BY;
    if (!rec.updatedBy) rec.updatedBy = DEFAULT_BY;
    withSoftDeleteFields(rec);
    return put(table, rec);
  }

  // ── updateRecord: 부분 갱신 (soft delete 아님) ──────────────────
  function updateRecord(table, key, patch) {
    return get(table, key).then(function (cur) {
      if (!cur) throw new Error('updateRecord: record 없음 (' + table + '/' + key + ')');
      var next = Object.assign({}, cur, patch);
      next.updatedAt = nowIso();
      next.updatedBy = (patch && patch.updatedBy) || DEFAULT_BY;
      return put(table, next);
    });
  }

  // ── softDeleteRecord: 물리 삭제 아님 — status=deleted 로 마킹 ────
  function softDeleteRecord(table, key, opts) {
    opts = opts || {};
    return get(table, key).then(function (cur) {
      if (!cur) return null;
      cur.status = SOFT_DELETE.STATUS_VALUE;
      cur.deletedAt = nowIso();
      cur.deletedBy = opts.by || DEFAULT_BY;
      cur.deleteReason = opts.reason || '';
      cur.updatedAt = cur.deletedAt;
      cur.updatedBy = cur.deletedBy;
      return put(table, cur);
    });
  }

  function getRecord(table, key) { return get(table, key); }

  // ── listRecords: 기본 조회 — deleted 제외 (opts.includeDeleted 로 포함) ──
  function listRecords(table, projectId, opts) {
    assertStore(table);
    opts = opts || {};
    var includeDeleted = !!opts.includeDeleted;
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var out = [];
        var os = db.transaction(table, 'readonly').objectStore(table);
        var cur;
        if (projectId != null && os.indexNames.contains('byProject')) {
          cur = os.index('byProject').openCursor(IDBKeyRange.only(projectId));
        } else {
          cur = os.openCursor();
        }
        cur.onsuccess = function (e) {
          var c = e.target.result;
          if (c) {
            var v = c.value;
            if (includeDeleted || v.status !== SOFT_DELETE.STATUS_VALUE) out.push(v);
            c.continue();
          } else { db.close(); resolve(out); }
        };
        cur.onerror = function () { db.close(); reject(cur.error); };
      });
    });
  }

  // ── 링크 / 변경기록 ─────────────────────────────────────────────
  function saveLink(link) { return put('artifactLinks', link); }
  function appendChange(change) { return put('artifactChanges', change); }

  // ── import 이력 ─────────────────────────────────────────────────
  function createImportBatch(batch) {
    var b = Object.assign({}, batch);
    if (!b.createdAt) b.createdAt = nowIso();
    if (!b.createdBy) b.createdBy = DEFAULT_BY;
    if (!b.status) b.status = schema.STATUS.ACTIVE;
    return put('importBatches', b);
  }
  function saveImportRow(row) {
    var r = Object.assign({}, row);
    if (!r.createdAt) r.createdAt = nowIso();
    return put('importRows', r);
  }

  // ── 명시적 초기화 전용(사용자 버튼) — 자동 호출 금지 ─────────────
  //  사용자가 직접 누른 "초기화"에서만 사용한다. deleteDatabase 는 쓰지 않고
  //  store 별 clear 만 수행한다(구조/DB 자체는 유지).
  function clearStoresExplicit(tableList) {
    var names = tableList && tableList.length ? tableList : Object.keys(STORES);
    names.forEach(assertStore);
    return openDB().then(function (db) {
      return Promise.all(names.map(function (name) {
        return new Promise(function (resolve, reject) {
          var r = db.transaction(name, 'readwrite').objectStore(name).clear();
          r.onsuccess = function () { resolve(); };
          r.onerror = function () { reject(r.error); };
        });
      })).then(function () { db.close(); });
    });
  }

  window.STAM_CORE = window.STAM_CORE || {};
  window.STAM_CORE.db = {
    name: DB_NAME,
    openDB: openDB,
    createRecord: createRecord,
    updateRecord: updateRecord,
    softDeleteRecord: softDeleteRecord,
    getRecord: getRecord,
    listRecords: listRecords,
    saveLink: saveLink,
    appendChange: appendChange,
    createImportBatch: createImportBatch,
    saveImportRow: saveImportRow,
    clearStoresExplicit: clearStoresExplicit
  };
}());
