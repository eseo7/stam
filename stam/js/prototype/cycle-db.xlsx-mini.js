/* ============================================================================
 * STAM Project Cycle DB Prototype — 최소 .xlsx 리더 (의존성/CDN 없음)
 * ----------------------------------------------------------------------------
 * .xlsx 는 사실상 여러 XML 파일을 담은 ZIP 컨테이너다. 이 모듈은 외부 라이브러리
 * 없이 브라우저 내장 API 만으로 첫 번째 시트를 읽는다.
 *   - ZIP 파싱   : ArrayBuffer 에서 중앙 디렉터리(Central Directory) 직접 해석
 *   - 압축 해제  : DecompressionStream('deflate-raw')  (브라우저 내장)
 *   - XML 파싱   : DOMParser                            (브라우저 내장)
 *
 * 이번 단계 범위(1차 시트/기본 헤더):
 *   - 첫 번째 시트만 읽는다.
 *   - 첫 행을 header, 이후 행을 data row 로 본다.
 *   - 병합 셀/다중 시트/고급 매핑은 다루지 않는다.
 *   - .xls(구 BIFF 바이너리)는 ZIP 이 아니므로 지원하지 않는다(명확히 안내).
 *
 * 반환: Promise<{ sheetName, aoa: string[][] }>  (aoa = array-of-arrays)
 * 오류는 Error.code 로 구분: 'NOT_ZIP' | 'NO_SHEET' | 'UNSUPPORTED' | 'READ'
 * ==========================================================================*/
(function () {
  'use strict';

  function err(code, message) { var e = new Error(message); e.code = code; return e; }

  // ── ZIP: 중앙 디렉터리에서 { name -> {method, offset, compSize} } ──────────
  function parseZip(buf) {
    var dv = new DataView(buf);
    var u8 = new Uint8Array(buf);
    if (u8.length < 4 || u8[0] !== 0x50 || u8[1] !== 0x4b) {
      throw err('NOT_ZIP', 'ZIP(.xlsx) 형식이 아닙니다.');
    }
    // End Of Central Directory(EOCD) 시그니처 0x06054b50 를 뒤에서 탐색
    var eocd = -1;
    for (var i = u8.length - 22; i >= 0 && i >= u8.length - 22 - 65536; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw err('NOT_ZIP', 'ZIP 중앙 디렉터리를 찾을 수 없습니다.');
    var cdCount = dv.getUint16(eocd + 10, true);
    var cdOffset = dv.getUint32(eocd + 16, true);

    var entries = {};
    var p = cdOffset;
    for (var n = 0; n < cdCount; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break; // central file header
      var method = dv.getUint16(p + 10, true);
      var compSize = dv.getUint32(p + 20, true);
      var nameLen = dv.getUint16(p + 28, true);
      var extraLen = dv.getUint16(p + 30, true);
      var commentLen = dv.getUint16(p + 32, true);
      var localOff = dv.getUint32(p + 42, true);
      var name = utf8(u8.subarray(p + 46, p + 46 + nameLen));
      entries[name] = { method: method, compSize: compSize, localOffset: localOff };
      p += 46 + nameLen + extraLen + commentLen;
    }
    return { dv: dv, u8: u8, entries: entries };
  }

  function utf8(bytes) {
    if (window.TextDecoder) return new TextDecoder('utf-8').decode(bytes);
    var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    try { return decodeURIComponent(escape(s)); } catch (e) { return s; }
  }

  // ── 한 엔트리의 압축 데이터 → 문자열(텍스트) ────────────────────────────
  function readEntryText(zip, name) {
    var e = zip.entries[name];
    if (!e) return Promise.resolve(null);
    // 로컬 헤더에서 실제 데이터 시작 위치 계산
    var dv = zip.dv;
    var lp = e.localOffset;
    if (dv.getUint32(lp, true) !== 0x04034b50) return Promise.resolve(null);
    var nameLen = dv.getUint16(lp + 26, true);
    var extraLen = dv.getUint16(lp + 28, true);
    var dataStart = lp + 30 + nameLen + extraLen;
    var comp = zip.u8.subarray(dataStart, dataStart + e.compSize);

    if (e.method === 0) return Promise.resolve(utf8(comp)); // stored(무압축)
    if (e.method !== 8) return Promise.reject(err('UNSUPPORTED', '지원하지 않는 ZIP 압축 방식(method ' + e.method + ').'));
    if (!('DecompressionStream' in window)) {
      return Promise.reject(err('UNSUPPORTED', '이 브라우저는 DecompressionStream 을 지원하지 않습니다(최신 브라우저 필요).'));
    }
    // raw DEFLATE 해제
    var ds = new DecompressionStream('deflate-raw');
    var stream = new Response(comp).body.pipeThrough(ds);
    return new Response(stream).arrayBuffer().then(function (ab) { return utf8(new Uint8Array(ab)); });
  }

  // ── 컬럼 문자("A","AB") → 0-based 인덱스 ────────────────────────────────
  function colIndex(ref) {
    var m = /^([A-Z]+)/.exec(ref || '');
    if (!m) return -1;
    var s = m[1], n = 0;
    for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  }

  function parseXml(text) {
    return new DOMParser().parseFromString(text, 'application/xml');
  }
  function textOf(el) {
    // <si> 안의 모든 <t> 텍스트를 연결(서식 런 <r><t> 포함)
    var ts = el.getElementsByTagName('t');
    if (!ts.length) return '';
    var out = ''; for (var i = 0; i < ts.length; i++) out += ts[i].textContent;
    return out;
  }

  // ── workbook.xml + rels 로 첫 번째 시트 이름/경로 결정 ──────────────────
  function firstSheetInfo(zip) {
    return readEntryText(zip, 'xl/workbook.xml').then(function (wbText) {
      var name = '시트1', target = 'xl/worksheets/sheet1.xml', rid = null;
      if (wbText) {
        var doc = parseXml(wbText);
        var sheets = doc.getElementsByTagName('sheet');
        if (sheets.length) {
          name = sheets[0].getAttribute('name') || name;
          rid = sheets[0].getAttribute('r:id') ||
            (sheets[0].getAttributeNS ? sheets[0].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') : null);
        }
      }
      if (!rid) return { name: name, target: target };
      return readEntryText(zip, 'xl/_rels/workbook.xml.rels').then(function (relText) {
        if (relText) {
          var rels = parseXml(relText).getElementsByTagName('Relationship');
          for (var i = 0; i < rels.length; i++) {
            if (rels[i].getAttribute('Id') === rid) {
              var t = rels[i].getAttribute('Target') || '';
              t = t.replace(/^\//, '').replace(/^xl\//, '');
              target = 'xl/' + t;
              break;
            }
          }
        }
        return { name: name, target: target };
      });
    });
  }

  // ── 시트 XML + sharedStrings → aoa ──────────────────────────────────────
  function buildAoa(zip, sheetTarget) {
    return Promise.all([
      readEntryText(zip, 'xl/sharedStrings.xml'),
      readEntryText(zip, sheetTarget)
    ]).then(function (res) {
      var sstText = res[0], sheetText = res[1];
      if (!sheetText) {
        // 폴백: 무엇이든 첫 worksheet
        var keys = Object.keys(zip.entries).filter(function (k) { return /^xl\/worksheets\/.*\.xml$/.test(k); });
        if (!keys.length) throw err('NO_SHEET', '워크시트를 찾을 수 없습니다.');
        return readEntryText(zip, keys[0]).then(function (t) { return finish(sstText, t); });
      }
      return finish(sstText, sheetText);
    });

    function finish(sstText, sheetText) {
      var shared = [];
      if (sstText) {
        var sis = parseXml(sstText).getElementsByTagName('si');
        for (var i = 0; i < sis.length; i++) shared.push(textOf(sis[i]));
      }
      var doc = parseXml(sheetText);
      var rows = doc.getElementsByTagName('row');
      var aoa = [];
      for (var r = 0; r < rows.length; r++) {
        var cells = rows[r].getElementsByTagName('c');
        var arr = [];
        for (var c = 0; c < cells.length; c++) {
          var cell = cells[c];
          var ci = colIndex(cell.getAttribute('r'));
          if (ci < 0) ci = arr.length;
          var t = cell.getAttribute('t');
          var val = '';
          if (t === 's') {
            var vEl = cell.getElementsByTagName('v')[0];
            var idx = vEl ? parseInt(vEl.textContent, 10) : -1;
            val = (idx >= 0 && idx < shared.length) ? shared[idx] : '';
          } else if (t === 'inlineStr') {
            val = textOf(cell);
          } else {
            var v2 = cell.getElementsByTagName('v')[0];
            val = v2 ? v2.textContent : '';
          }
          while (arr.length < ci) arr.push('');
          arr[ci] = val;
        }
        aoa.push(arr);
      }
      return aoa;
    }
  }

  // ── 공개 API: ArrayBuffer → { sheetName, aoa } ──────────────────────────
  function readFirstSheet(arrayBuffer) {
    return Promise.resolve().then(function () {
      var zip = parseZip(arrayBuffer);
      return firstSheetInfo(zip).then(function (info) {
        return buildAoa(zip, info.target).then(function (aoa) {
          return { sheetName: info.name, aoa: aoa };
        });
      });
    });
  }

  // File → ArrayBuffer → readFirstSheet
  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onerror = function () { reject(err('READ', '파일을 읽을 수 없습니다.')); };
      fr.onload = function () { resolve(fr.result); };
      fr.readAsArrayBuffer(file);
    }).then(readFirstSheet);
  }

  window.STAM_CYCLE = window.STAM_CYCLE || {};
  window.STAM_CYCLE.xlsx = {
    readFirstSheet: readFirstSheet,
    readFile: readFile
  };
}());
