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
      deleteUnsupported: '1차 범위에서는 삭제 기능을 지원하지 않습니다.',
    },
    requirements: {
      emptyTitle: '등록된 요구사항이 없습니다',
      emptyDesc: '등록 버튼을 눌러 직접 추가하거나, 요구사항 가져오기를 통해 초안을 생성하세요.',
      loadingTitle: '요구사항을 불러오는 중입니다.',
      loadingDesc: '목록을 불러오고 있습니다.',
      errorTitle: '요구사항을 불러오지 못했습니다.',
    },
    functionalSpec: {
      emptyTitle: '등록된 기능정의서가 없습니다',
      emptyDesc: '등록 버튼을 눌러 직접 추가하거나, 요구사항 가져오기를 통해 초안을 생성하세요.',
      loadingTitle: '기능정의서 목록을 불러오는 중입니다.',
      loadingDesc: '목록을 불러오고 있습니다.',
      errorTitle: '기능정의서 목록을 불러오지 못했습니다.',
    },
    wbs: {
      emptyTitle: '등록된 WBS 작업이 없습니다',
      emptyDesc: '작업 등록 버튼을 눌러 새 작업을 추가하세요.',
      filterEmptyTitle: '조건에 맞는 WBS 작업이 없습니다',
      filterEmptyDesc: '검색어나 필터 조건을 조정해 주세요.',
      loadingTitle: 'WBS 작업 목록을 불러오는 중입니다.',
      loadingDesc: '목록을 불러오고 있습니다.',
      errorTitle: 'WBS 작업 목록을 불러오지 못했습니다.',
      writeDenied: '이 프로젝트에서는 WBS 등록·수정 권한이 없습니다.',
      deleteUnsupported: '1차 범위에서는 WBS 삭제 기능을 지원하지 않습니다.',
      scopeUnsupported: '1차 범위 외 기능입니다.',
      memberSnapshotMismatch: '현재 프로젝트 멤버 정보가 저장 권한 기준과 일치하지 않습니다.',
      memberRoleInvalid: '현재 멤버 역할 값은 owner/admin/editor 중 하나여야 합니다.',
      ownerSnapshotMismatch: '담당자 정보가 프로젝트 멤버 데이터와 일치하지 않습니다.',
      reviewerSnapshotMismatch: '검토자 정보가 프로젝트 멤버 데이터와 일치하지 않습니다.',
      counterInvalid: 'WBS 번호 Counter 데이터 형식이 올바르지 않습니다.',
      preflightReadPermissionDenied: '저장 사전검사 정보를 확인할 권한이 없습니다.',
      rulesRejectedAfterPreflight: '사전검사는 통과했으나 Firestore Rules에서 등록을 거부했습니다.',
      writeCommittedReadFailed: '등록은 완료되었지만 저장 결과를 다시 불러오지 못했습니다. 목록을 새로고침해 확인해 주세요.',
      updateDocMissing: '수정할 WBS 항목을 찾을 수 없습니다. 목록을 새로고침해 주세요.',
      updateVersionInvalid: '현재 WBS 버전 정보가 올바르지 않습니다.',
      updateVersionMismatch: '다른 변경 사항이 먼저 저장되었습니다. 목록을 새로고침한 뒤 다시 수정해 주세요.',
      updateImmutableField: '수정할 수 없는 WBS 기본 정보가 변경 요청에 포함되었습니다.',
      updateReviewerPartial: '검토자 정보는 ID와 이름을 함께 수정해야 합니다.',
      updatePreflightReadPermissionDenied: '수정 사전검사 정보를 확인할 권한이 없습니다.',
      updateRulesRejectedAfterPreflight: '사전검사는 통과했으나 Firestore Rules에서 수정을 거부했습니다.',
      updateCommittedReadFailed: '수정은 완료되었지만 저장 결과를 다시 불러오지 못했습니다. 목록을 새로고침해 확인해 주세요.',
    },
  };
}());
