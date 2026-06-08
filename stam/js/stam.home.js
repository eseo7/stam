/* ============================================================
 * stam/js/stam.home.js — Service Root Page (index.html) Scripts
 * 의존: stam.theme.js (window.STAM)
 * IA Baseline v3.3 | 2026-06-07
 * ============================================================ */
(function () {
  'use strict';

  /* ---- 초대 수락/거절 버튼 피드백 ---- */
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.btn-accept').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('tr');
        if (!row) { return; }
        var statusCell = row.querySelector('.inv-pending');
        var actionsCell = btn.closest('.inv-actions');
        if (statusCell) {
          statusCell.textContent = '수락됨';
          statusCell.style.background = 'rgba(0,191,64,.12)';
          statusCell.style.color = '#46C97D';
        }
        if (actionsCell) { actionsCell.style.display = 'none'; }
      });
    });

    document.querySelectorAll('.btn-reject').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('tr');
        if (!row) { return; }
        var statusCell = row.querySelector('.inv-pending');
        var actionsCell = btn.closest('.inv-actions');
        if (statusCell) {
          statusCell.textContent = '거절됨';
          statusCell.style.background = 'rgba(255,66,66,.10)';
          statusCell.style.color = '#FF8585';
        }
        if (actionsCell) { actionsCell.style.display = 'none'; }
      });
    });
  });

}());
