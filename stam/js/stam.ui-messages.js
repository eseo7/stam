/* ============================================================================
 * STAM UI Messages — shared copy for table feedback states (v1)
 *
 * Screen JS should prefer these keys and pass title/description into
 * STAM.uiFeedback.table*Row(). Screen-specific overrides are allowed for
 * loading titles only; empty/error copy should stay here.
 * ========================================================================== */
(function () {
  'use strict';

  window.STAM = window.STAM || {};
  if (window.STAM.uiMessages) return;

  window.STAM.uiMessages = {
    common: {
      loading: {
        title: '목록을 불러오는 중입니다.',
        description: '데이터를 불러오고 있습니다.',
      },
      networkError: {
        title: '목록을 불러오지 못했습니다.',
        description: '잠시 후 다시 시도해 주세요.',
      },
      deleteUnsupported: '삭제 기능은 아직 지원하지 않습니다.',
    },
    requirements: {
      emptyTitle: '등록된 요구사항이 없습니다',
      emptyDesc: '등록 버튼을 눌러 직접 추가하거나, 요구사항 가져오기를 통해 초안을 생성하세요.',
      loadingTitle: '요구사항을 불러오는 중입니다.',
      loadingDesc: '목록을 불러오고 있습니다.',
      errorTitle: '요구사항을 불러오지 못했습니다.',
    },
    functionalSpec: {
      emptyTitle: '등록된 기능정의가 없습니다',
      emptyDesc: '등록 버튼을 눌러 직접 추가하거나, 요구사항 가져오기를 통해 초안을 생성하세요.',
      loadingTitle: '기능정의 목록을 불러오는 중입니다.',
      loadingDesc: '목록을 불러오고 있습니다.',
      errorTitle: '기능정의 목록을 불러오지 못했습니다.',
    },
  };
}());
