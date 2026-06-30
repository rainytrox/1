/**
 * PCC_InputGateway_Phase1_TEST.gs
 * PC_00_PROJECT_CONTROL_CENTER V0.3
 * Input Gateway Phase 1 TEST (Validation-only / Classification-only)
 *
 * Quyết định áp dụng:
 * - D_0011, D_0012, D_0013, D_0014, D_0015, D_0016
 * - D_0017, D_0018 (Phase 1 TEST: không append sang sheet đích)
 *
 * Nguyên tắc bắt buộc:
 * - Header row = 3, data bắt đầu = 4
 * - Lookup cột theo tên header
 * - Không tạo trigger tự động
 * - Chỉ chạy thủ công bằng menu
 * - Không ghi 00_DASHBOARD
 * - Không ghi bất kỳ sheet đích nào (01..06)
 * - Chỉ cập nhật một số cột cho phép trong 07_INPUT_GATEWAY
 * - Chỉ ghi lỗi vào PCC_ERROR_LOG
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

var PCC_SCRIPT_NAME = 'PCC_InputGateway_Phase1_TEST';
var PCC_HEADER_ROW = 3;
var PCC_DATA_START_ROW = 4;

var PCC_MENU_NAME = 'PCC V0.3';
var PCC_MENU_ITEM = 'Run Input Gateway Phase 1 TEST';

var PCC_SHEET = {
  DASHBOARD: '00_DASHBOARD',
  TASK: '01_TASK',
  DOCUMENT: '02_DOCUMENT',
  DECISION_LOG: '03_DECISION_LOG',
  NOTEBOOKLM: '04_NOTEBOOKLM',
  RISK: '05_RISK',
  IDEA: '06_IDEA',
  INPUT_GATEWAY: '07_INPUT_GATEWAY',
  ERROR_LOG: 'PCC_ERROR_LOG'
};

var PCC_GATEWAY_HEADERS = [
  'Gateway ID',
  'Input Date',
  'Input By',
  'Raw Input',
  'Input Type',
  'Target Sheet Proposed',
  'Target Sheet Approved',
  'Target ID Proposed',
  'Related Document ID',
  'Related Task ID',
  'Related Decision ID',
  'Priority',
  'Risk Level',
  'Risk Action',
  'Owner',
  'Due Date',
  'Review Status',
  'Reviewer',
  'Review Date',
  'Clarification Needed',
  'Rejected Reason',
  'Approved By',
  'Approved Date',
  'Created Target ID',
  'Transfer Mode',
  'Transfer Date',
  'Validation Result',
  'Remark',
  'Last Update'
];

var PCC_ERROR_LOG_HEADERS = [
  'Run Time',
  'Sheet Name',
  'Row Number',
  'Field Name',
  'ID Value',
  'Error Type',
  'Severity',
  'Message',
  'Suggested Action'
];

var PCC_ALLOWED_GATEWAY_UPDATE_HEADERS = {
  'Gateway ID': true,
  'Target Sheet Proposed': true,
  'Target ID Proposed': true,
  'Review Status': true,
  'Transfer Mode': true,
  'Validation Result': true,
  'Clarification Needed': true,
  'Last Update': true
};

var PCC_VALID_REVIEW_STATUS = {
  NEW: 'NEW',
  CLASSIFIED: 'CLASSIFIED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  NEEDS_CLARIFICATION: 'NEEDS_CLARIFICATION',
  APPROVED_TO_TRANSFER: 'APPROVED_TO_TRANSFER',
  TRANSFERRED: 'TRANSFERRED',
  REJECTED: 'REJECTED'
};

var PCC_REVIEW_STATUS_LIST = [
  PCC_VALID_REVIEW_STATUS.NEW,
  PCC_VALID_REVIEW_STATUS.CLASSIFIED,
  PCC_VALID_REVIEW_STATUS.PENDING_REVIEW,
  PCC_VALID_REVIEW_STATUS.NEEDS_CLARIFICATION,
  PCC_VALID_REVIEW_STATUS.APPROVED_TO_TRANSFER,
  PCC_VALID_REVIEW_STATUS.TRANSFERRED,
  PCC_VALID_REVIEW_STATUS.REJECTED
];

var PCC_INPUT_TYPE_LIST = [
  'TASK',
  'DOCUMENT',
  'DECISION',
  'NOTEBOOKLM',
  'RISK',
  'IDEA'
];

var PCC_INPUT_TYPE_TO_TARGET_SHEET = {
  TASK: PCC_SHEET.TASK,
  DOCUMENT: PCC_SHEET.DOCUMENT,
  DECISION: PCC_SHEET.DECISION_LOG,
  NOTEBOOKLM: PCC_SHEET.NOTEBOOKLM,
  RISK: PCC_SHEET.RISK,
  IDEA: PCC_SHEET.IDEA
};

var PCC_TRANSFER_MODE = {
  MANUAL: 'MANUAL'
};

var PCC_VALIDATION_RESULT = {
  VALIDATION_OK: 'VALIDATION_OK',
  INVALID_REVIEW_STATUS: 'INVALID_REVIEW_STATUS',
  INVALID_INPUT_TYPE: 'INVALID_INPUT_TYPE',
  INVALID_TARGET_SHEET: 'INVALID_TARGET_SHEET',
  MISSING_TARGET_ID: 'MISSING_TARGET_ID',
  INVALID_TARGET_ID_FORMAT: 'INVALID_TARGET_ID_FORMAT',
  DUPLICATE_TARGET_ID: 'DUPLICATE_TARGET_ID',
  DUPLICATE_TARGET_ID_IN_GATEWAY_RUN: 'DUPLICATE_TARGET_ID_IN_GATEWAY_RUN',
  MULTIPLE_MAIN_IDEAS: 'MULTIPLE_MAIN_IDEAS',
  MISSING_RISK_LEVEL: 'MISSING_RISK_LEVEL',
  MISSING_RISK_ACTION: 'MISSING_RISK_ACTION',
  REJECTED_REASON_REQUIRED: 'REJECTED_REASON_REQUIRED',
  DECISION_ID_CONFIRMED: 'DECISION_ID_CONFIRMED',
  INVALID_DECISION_ID: 'INVALID_DECISION_ID',
  DECISION_ID_NOT_FOUND: 'DECISION_ID_NOT_FOUND',
  APPROVED_BUT_APPEND_DISABLED_PHASE1: 'APPROVED_BUT_APPEND_DISABLED_PHASE1',
  MISSING_REQUIRED_DATA: 'MISSING_REQUIRED_DATA',
  MISSING_SHEET: 'MISSING_SHEET',
  MISSING_HEADER: 'MISSING_HEADER'
};

var PCC_GATEWAY_ID_PREFIX = 'GW_';
var PCC_GATEWAY_ID_PATTERN = /^GW_\d{4}$/;

var PCC_TARGET_ID_CONFIG = {
  '01_TASK': {
    idHeader: 'Task ID',
    prefix: 'T_',
    pattern: /^T_\d{4}$/,
    suggestable: true
  },
  '02_DOCUMENT': {
    idHeader: 'Document ID',
    pattern: /^(MF|PC)_[A-Z0-9_]+$/,
    suggestable: false
  },
  '03_DECISION_LOG': {
    idHeader: 'Decision ID',
    prefix: 'D_',
    pattern: /^D_\d{4}$/,
    suggestable: true
  },
  '04_NOTEBOOKLM': {
    idHeader: 'KB Update ID',
    prefix: 'KBU_',
    pattern: /^KBU_\d{4}$/,
    suggestable: true
  },
  '05_RISK': {
    idHeader: 'Risk ID',
    prefix: 'R_',
    pattern: /^R_\d{4}$/,
    suggestable: true
  },
  '06_IDEA': {
    idHeader: 'Idea ID',
    prefix: 'I_',
    pattern: /^I_\d{4}$/,
    suggestable: true
  }
};

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

/**
 * Tạo menu chạy thủ công.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(PCC_MENU_NAME)
    .addItem(PCC_MENU_ITEM, 'runInputGatewayPhase1Test')
    .addToUi();
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

/**
 * Hàm chính Phase 1 TEST.
 * - Validation-only / classification-only
 * - Không append bất kỳ sheet đích nào
 */
function runInputGatewayPhase1Test() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var requiredSheetsOk = ensureRequiredSheets(ss);
  if (!requiredSheetsOk) {
    return;
  }

  var gatewaySheet = ss.getSheetByName(PCC_SHEET.INPUT_GATEWAY);
  var gatewayHeaderMap = getHeaderMap(gatewaySheet);
  if (!gatewayHeaderMap) {
    logPccError(ss, PCC_VALIDATION_RESULT.MISSING_HEADER, 'Không đọc được header 07_INPUT_GATEWAY', {
      sheetName: PCC_SHEET.INPUT_GATEWAY,
      severity: 'ERROR',
      suggestedAction: 'Kiểm tra header row = 3'
    });
    return;
  }

  if (!ensureRequiredHeaders(ss, gatewaySheet, gatewayHeaderMap, PCC_GATEWAY_HEADERS, PCC_SHEET.INPUT_GATEWAY)) {
    return;
  }

  var errorSheet = ss.getSheetByName(PCC_SHEET.ERROR_LOG);
  var errorHeaderMap = getHeaderMap(errorSheet);
  if (!errorHeaderMap) {
    return;
  }
  if (!ensureRequiredHeaders(ss, errorSheet, errorHeaderMap, PCC_ERROR_LOG_HEADERS, PCC_SHEET.ERROR_LOG)) {
    return;
  }

  var context = buildRuntimeContext_(ss, gatewaySheet, gatewayHeaderMap);
  if (!context.ok) {
    return;
  }

  var lastRow = gatewaySheet.getLastRow();
  if (lastRow < PCC_DATA_START_ROW) {
    return;
  }

  var lastCol = gatewaySheet.getLastColumn();
  var numRows = lastRow - PCC_DATA_START_ROW + 1;
  var values = gatewaySheet.getRange(PCC_DATA_START_ROW, 1, numRows, lastCol).getValues();

  for (var i = 0; i < values.length; i++) {
    var rowNumber = PCC_DATA_START_ROW + i;
    var rowObject = mapRowToObject_(values[i], gatewayHeaderMap);

    if (isBlank(rowObject['Raw Input'])) {
      continue;
    }

    var result = validateGatewayRowPhase1(ss, rowObject, rowNumber, context);
    if (result.hasChanges) {
      result.updates['Last Update'] = new Date();
      updateGatewayRow(gatewaySheet, gatewayHeaderMap, rowNumber, result.updates);
    }
  }
}

// ---------------------------------------------------------------------------
// Core validation
// ---------------------------------------------------------------------------

/**
 * Validate/classify một dòng gateway theo Phase 1 TEST.
 */
function validateGatewayRowPhase1(ss, rowObject, rowNumber, context) {
  var updates = {};
  var notes = [];
  var validationEvents = [];

  // 1) Raw Input trống đã được skip từ main loop.

  // 2) Gateway ID trống => tự sinh
  var gatewayId = normalizeText(rowObject['Gateway ID']);
  if (isBlank(gatewayId)) {
    gatewayId = generateNextGatewayId(context.gatewayIdState);
    updates['Gateway ID'] = gatewayId;
    rowObject['Gateway ID'] = gatewayId;
  }

  // 3) Review Status trống => NEW
  var reviewStatus = normalizeText(rowObject['Review Status']);
  if (isBlank(reviewStatus)) {
    reviewStatus = PCC_VALID_REVIEW_STATUS.NEW;
    updates['Review Status'] = reviewStatus;
    rowObject['Review Status'] = reviewStatus;
  }

  // 4) Review Status không hợp lệ
  if (!isValidReviewStatus_(reviewStatus)) {
    reviewStatus = PCC_VALID_REVIEW_STATUS.NEEDS_CLARIFICATION;
    updates['Review Status'] = reviewStatus;
    rowObject['Review Status'] = reviewStatus;
    validationEvents.push(PCC_VALIDATION_RESULT.INVALID_REVIEW_STATUS);
    notes.push('Review Status không hợp lệ');
  }

  // 5) Input Type do user nhập/chọn - script chỉ validate
  var inputType = normalizeText(rowObject['Input Type']);
  var inputTypeValid = isValidInputType_(inputType);
  if (!inputTypeValid) {
    reviewStatus = PCC_VALID_REVIEW_STATUS.NEEDS_CLARIFICATION;
    updates['Review Status'] = reviewStatus;
    rowObject['Review Status'] = reviewStatus;
    validationEvents.push(PCC_VALIDATION_RESULT.INVALID_INPUT_TYPE);
    notes.push('Input Type không hợp lệ hoặc còn trống');
  }

  // 6) Input Type hợp lệ => set Target Sheet Proposed
  var targetSheetProposed = normalizeText(rowObject['Target Sheet Proposed']);
  if (inputTypeValid) {
    targetSheetProposed = PCC_INPUT_TYPE_TO_TARGET_SHEET[inputType];
    updates['Target Sheet Proposed'] = targetSheetProposed;
    rowObject['Target Sheet Proposed'] = targetSheetProposed;
  }

  // Xác định sheet hiệu lực để validate ID
  var targetSheetApproved = normalizeText(rowObject['Target Sheet Approved']);
  var effectiveTargetSheet = !isBlank(targetSheetApproved) ? targetSheetApproved : targetSheetProposed;
  var effectiveTargetConfig = PCC_TARGET_ID_CONFIG[effectiveTargetSheet];

  if (!isBlank(effectiveTargetSheet) && !effectiveTargetConfig) {
    reviewStatus = PCC_VALID_REVIEW_STATUS.NEEDS_CLARIFICATION;
    updates['Review Status'] = reviewStatus;
    rowObject['Review Status'] = reviewStatus;
    validationEvents.push(PCC_VALIDATION_RESULT.INVALID_TARGET_SHEET);
    notes.push('Target Sheet không hợp lệ');
  }

  // 7) Gợi ý Target ID Proposed nếu trống (trừ DOCUMENT)
  var targetIdProposed = normalizeText(rowObject['Target ID Proposed']);
  if (isBlank(targetIdProposed) && effectiveTargetConfig) {
    var suggestion = generateNextTargetIdSuggestion(ss, effectiveTargetSheet, context);
    if (suggestion.hasSuggestion) {
      targetIdProposed = suggestion.targetId;
      updates['Target ID Proposed'] = targetIdProposed;
      rowObject['Target ID Proposed'] = targetIdProposed;
    } else {
      validationEvents.push(PCC_VALIDATION_RESULT.MISSING_TARGET_ID);
      notes.push(suggestion.message);
    }
  }

  // Register proposed ID cho lần chạy hiện tại
  if (!isBlank(targetIdProposed) && !isBlank(effectiveTargetSheet)) {
    registerProposedIdInRun(context.proposedIdsInRun, effectiveTargetSheet, targetIdProposed, rowNumber);
  }

  // 8) Validate format Target ID theo sheet hiệu lực
  if (!isBlank(targetIdProposed) && effectiveTargetConfig) {
    if (!effectiveTargetConfig.pattern.test(targetIdProposed)) {
      validationEvents.push(PCC_VALIDATION_RESULT.INVALID_TARGET_ID_FORMAT);
      notes.push('Target ID Proposed sai định dạng theo ' + effectiveTargetSheet);
    }
  } else if (isBlank(targetIdProposed) && effectiveTargetConfig) {
    validationEvents.push(PCC_VALIDATION_RESULT.MISSING_TARGET_ID);
    notes.push('Thiếu Target ID Proposed');
  }

  // 9) Kiểm tra trùng trong sheet đích
  if (!isBlank(targetIdProposed) && effectiveTargetConfig && effectiveTargetConfig.pattern.test(targetIdProposed)) {
    if (checkIdExists(effectiveTargetSheet, targetIdProposed, context)) {
      validationEvents.push(PCC_VALIDATION_RESULT.DUPLICATE_TARGET_ID);
      notes.push('Target ID Proposed đã tồn tại trong sheet đích');
    }
  }

  // 10) Kiểm tra trùng giữa các dòng gateway cùng lần chạy
  if (!isBlank(targetIdProposed) && !isBlank(effectiveTargetSheet)) {
    if (isProposedIdDuplicateInRun(context.proposedIdsInRun, effectiveTargetSheet, targetIdProposed, rowNumber)) {
      validationEvents.push(PCC_VALIDATION_RESULT.DUPLICATE_TARGET_ID_IN_GATEWAY_RUN);
      notes.push('Target ID Proposed trùng với dòng gateway khác trong lần chạy');
    }
  }

  // 11,12) Multiple main ideas heuristic cố định
  if (detectMultipleMainIdeas(rowObject['Raw Input'])) {
    reviewStatus = PCC_VALID_REVIEW_STATUS.NEEDS_CLARIFICATION;
    updates['Review Status'] = reviewStatus;
    rowObject['Review Status'] = reviewStatus;
    validationEvents.push(PCC_VALIDATION_RESULT.MULTIPLE_MAIN_IDEAS);
    notes.push('Một dòng Gateway chỉ được đại diện cho một bản ghi đích');
  }

  // 13) RISK bắt buộc Risk Level + Risk Action
  var riskApplies = (inputType === 'RISK' || targetSheetApproved === PCC_SHEET.RISK);
  if (riskApplies) {
    if (isBlank(rowObject['Risk Level'])) {
      reviewStatus = PCC_VALID_REVIEW_STATUS.NEEDS_CLARIFICATION;
      updates['Review Status'] = reviewStatus;
      rowObject['Review Status'] = reviewStatus;
      validationEvents.push(PCC_VALIDATION_RESULT.MISSING_RISK_LEVEL);
      notes.push('Thiếu Risk Level');
    }
    if (isBlank(rowObject['Risk Action'])) {
      reviewStatus = PCC_VALID_REVIEW_STATUS.NEEDS_CLARIFICATION;
      updates['Review Status'] = reviewStatus;
      rowObject['Review Status'] = reviewStatus;
      validationEvents.push(PCC_VALIDATION_RESULT.MISSING_RISK_ACTION);
      notes.push('Thiếu Risk Action');
    }
  }

  // 14) DECISION => Transfer Mode MANUAL
  var decisionApplies = (inputType === 'DECISION' || targetSheetApproved === PCC_SHEET.DECISION_LOG);
  if (decisionApplies) {
    updates['Transfer Mode'] = PCC_TRANSFER_MODE.MANUAL;
    rowObject['Transfer Mode'] = PCC_TRANSFER_MODE.MANUAL;
  }

  // 15) DECISION MANUAL confirm branch
  if (effectiveTargetSheet === PCC_SHEET.DECISION_LOG) {
    var createdDecisionId = normalizeText(rowObject['Created Target ID']);
    if (!isBlank(createdDecisionId)) {
      var decisionPattern = PCC_TARGET_ID_CONFIG[PCC_SHEET.DECISION_LOG].pattern;
      if (!decisionPattern.test(createdDecisionId)) {
        validationEvents.push(PCC_VALIDATION_RESULT.INVALID_DECISION_ID);
        notes.push('Created Target ID không đúng định dạng Decision ID');
      } else {
        var decisionExists = checkIdExists(PCC_SHEET.DECISION_LOG, createdDecisionId, context);
        if (decisionExists) {
          validationEvents.push(PCC_VALIDATION_RESULT.DECISION_ID_CONFIRMED);
          notes.push('Decision ID đã tồn tại trong 03_DECISION_LOG');
        } else {
          validationEvents.push(PCC_VALIDATION_RESULT.DECISION_ID_NOT_FOUND);
          notes.push('Không tìm thấy Decision ID trong 03_DECISION_LOG');
        }
      }
    }
  }

  // 16) REJECTED bắt buộc có Rejected Reason
  if (reviewStatus === PCC_VALID_REVIEW_STATUS.REJECTED) {
    if (isBlank(rowObject['Rejected Reason'])) {
      validationEvents.push(PCC_VALIDATION_RESULT.REJECTED_REASON_REQUIRED);
      notes.push('Rejected Reason là bắt buộc khi Review Status = REJECTED');
    }
  }

  // 17) APPROVED_TO_TRANSFER trong Phase 1 TEST => luôn disable append
  if (reviewStatus === PCC_VALID_REVIEW_STATUS.APPROVED_TO_TRANSFER) {
    validationEvents.push(PCC_VALIDATION_RESULT.APPROVED_BUT_APPEND_DISABLED_PHASE1);
    notes.push('Phase 1 TEST không append sang sheet đích');
  }

  // 18,19) Chuyển trạng thái NEW/CLASSIFIED khi đủ điều kiện
  var readiness = evaluateReadiness_(rowObject, reviewStatus, validationEvents);
  if (reviewStatus === PCC_VALID_REVIEW_STATUS.NEW && readiness.canClassify) {
    updates['Review Status'] = PCC_VALID_REVIEW_STATUS.CLASSIFIED;
    reviewStatus = PCC_VALID_REVIEW_STATUS.CLASSIFIED;
    rowObject['Review Status'] = reviewStatus;
  }

  if (reviewStatus === PCC_VALID_REVIEW_STATUS.CLASSIFIED && readiness.canMoveToPendingReview) {
    updates['Review Status'] = PCC_VALID_REVIEW_STATUS.PENDING_REVIEW;
    reviewStatus = PCC_VALID_REVIEW_STATUS.PENDING_REVIEW;
    rowObject['Review Status'] = reviewStatus;
  }

  if (readiness.mustClarify &&
      reviewStatus !== PCC_VALID_REVIEW_STATUS.REJECTED &&
      reviewStatus !== PCC_VALID_REVIEW_STATUS.APPROVED_TO_TRANSFER &&
      reviewStatus !== PCC_VALID_REVIEW_STATUS.TRANSFERRED) {
    updates['Review Status'] = PCC_VALID_REVIEW_STATUS.NEEDS_CLARIFICATION;
    reviewStatus = PCC_VALID_REVIEW_STATUS.NEEDS_CLARIFICATION;
    rowObject['Review Status'] = reviewStatus;
  }

  // Resolve Validation Result theo enum cố định
  var finalValidationResult = resolveValidationResult_(validationEvents);
  updates['Validation Result'] = finalValidationResult;

  // Clarification
  if (finalValidationResult === PCC_VALIDATION_RESULT.VALIDATION_OK) {
    updates['Clarification Needed'] = '';
  } else {
    updates['Clarification Needed'] = buildClarificationMessage_(notes);
  }

  // Log lỗi nặng
  if (finalValidationResult === PCC_VALIDATION_RESULT.MISSING_SHEET ||
      finalValidationResult === PCC_VALIDATION_RESULT.MISSING_HEADER) {
    logPccError(ss, finalValidationResult, updates['Clarification Needed'], {
      sheetName: PCC_SHEET.INPUT_GATEWAY,
      rowNumber: rowNumber,
      fieldName: 'Validation Result',
      idValue: gatewayId,
      severity: 'ERROR',
      suggestedAction: 'Kiểm tra cấu trúc hệ thống sheet/header'
    });
  }

  // Log các lỗi validation chính
  if (finalValidationResult !== PCC_VALIDATION_RESULT.VALIDATION_OK &&
      finalValidationResult !== PCC_VALIDATION_RESULT.DECISION_ID_CONFIRMED) {
    logPccError(ss, finalValidationResult, updates['Clarification Needed'], {
      sheetName: PCC_SHEET.INPUT_GATEWAY,
      rowNumber: rowNumber,
      fieldName: 'Validation Result',
      idValue: gatewayId,
      severity: 'WARNING',
      suggestedAction: 'Cập nhật dữ liệu đầu vào trước khi gửi duyệt'
    });
  }

  var filteredUpdates = filterAllowedGatewayUpdates_(updates);
  return {
    updates: filteredUpdates,
    hasChanges: Object.keys(filteredUpdates).length > 0
  };
}

// ---------------------------------------------------------------------------
// Required helpers
// ---------------------------------------------------------------------------

/**
 * Lấy map header -> column index (1-based) từ dòng header chuẩn.
 */
function getHeaderMap(sheet) {
  if (!sheet) {
    return null;
  }
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    return null;
  }
  var headerValues = sheet.getRange(PCC_HEADER_ROW, 1, 1, lastCol).getValues()[0];
  var map = {};
  for (var i = 0; i < headerValues.length; i++) {
    var name = normalizeText(headerValues[i]);
    if (!isBlank(name)) {
      map[name] = i + 1;
    }
  }
  if (Object.keys(map).length === 0) {
    return null;
  }
  return map;
}

/**
 * Kiểm tra sự tồn tại các sheet bắt buộc.
 */
function ensureRequiredSheets(ss) {
  var requiredSheetNames = [
    PCC_SHEET.INPUT_GATEWAY,
    PCC_SHEET.TASK,
    PCC_SHEET.DOCUMENT,
    PCC_SHEET.DECISION_LOG,
    PCC_SHEET.NOTEBOOKLM,
    PCC_SHEET.RISK,
    PCC_SHEET.IDEA,
    PCC_SHEET.ERROR_LOG
  ];

  var missingSheets = [];
  for (var i = 0; i < requiredSheetNames.length; i++) {
    if (!ss.getSheetByName(requiredSheetNames[i])) {
      missingSheets.push(requiredSheetNames[i]);
    }
  }

  if (missingSheets.length > 0) {
    logPccError(ss, PCC_VALIDATION_RESULT.MISSING_SHEET, 'Thiếu sheet bắt buộc: ' + missingSheets.join(', '), {
      sheetName: '',
      rowNumber: '',
      fieldName: 'Sheet',
      idValue: '',
      severity: 'ERROR',
      suggestedAction: 'Tạo đủ các sheet bắt buộc theo PCC V0.3'
    });
    return false;
  }
  return true;
}

/**
 * Kiểm tra đủ header bắt buộc trên một sheet.
 */
function ensureRequiredHeaders(ss, sheet, headerMap, requiredHeaders, sheetName) {
  var missingHeaders = [];
  for (var i = 0; i < requiredHeaders.length; i++) {
    if (!headerMap[requiredHeaders[i]]) {
      missingHeaders.push(requiredHeaders[i]);
    }
  }
  if (missingHeaders.length > 0) {
    logPccError(ss, PCC_VALIDATION_RESULT.MISSING_HEADER, 'Thiếu header: ' + missingHeaders.join(', '), {
      sheetName: sheetName || (sheet ? sheet.getName() : ''),
      rowNumber: '',
      fieldName: 'Header',
      idValue: '',
      severity: 'ERROR',
      suggestedAction: 'Bổ sung đủ header theo đặc tả PCC'
    });
    return false;
  }
  return true;
}

/**
 * Sinh Gateway ID tiếp theo theo định dạng GW_0001.
 */
function generateNextGatewayId(gatewayIdState) {
  gatewayIdState.maxNumber += 1;
  return formatSequenceId_(PCC_GATEWAY_ID_PREFIX, gatewayIdState.maxNumber);
}

/**
 * Sinh gợi ý Target ID Proposed theo sheet đích.
 * DOCUMENT không được tự sinh.
 */
function generateNextTargetIdSuggestion(ss, targetSheetName, context) {
  var config = PCC_TARGET_ID_CONFIG[targetSheetName];
  if (!config) {
    return {
      hasSuggestion: false,
      targetId: '',
      message: 'Target sheet không hợp lệ'
    };
  }

  if (!config.suggestable) {
    return {
      hasSuggestion: false,
      targetId: '',
      message: 'Document ID cần nhập tay theo mã tài liệu dạng MF_... hoặc PC_...'
    };
  }

  if (!config.prefix) {
    return {
      hasSuggestion: false,
      targetId: '',
      message: 'Không có cấu hình prefix để gợi ý ID'
    };
  }

  var state = context.targetIdStates[targetSheetName];
  if (!state) {
    return {
      hasSuggestion: false,
      targetId: '',
      message: 'Không có trạng thái ID cho target sheet'
    };
  }

  var loopSafety = 0;
  var candidate = '';
  do {
    state.maxNumber += 1;
    candidate = formatSequenceId_(config.prefix, state.maxNumber);
    loopSafety += 1;
  } while (
    loopSafety < 10000 &&
    (state.existing[candidate] ||
      isProposedIdDuplicateInRun(context.proposedIdsInRun, targetSheetName, candidate, null))
  );

  if (loopSafety >= 10000) {
    return {
      hasSuggestion: false,
      targetId: '',
      message: 'Không tìm được Target ID khả dụng để gợi ý'
    };
  }

  return {
    hasSuggestion: true,
    targetId: candidate,
    message: ''
  };
}

/**
 * Kiểm tra ID đã tồn tại trong sheet đích.
 */
function checkIdExists(targetSheetName, idValue, context) {
  var normalizedId = normalizeText(idValue);
  if (isBlank(normalizedId)) {
    return false;
  }
  if (!context || !context.targetIdStates || !context.targetIdStates[targetSheetName]) {
    return false;
  }
  return !!context.targetIdStates[targetSheetName].existing[normalizedId];
}

/**
 * Đăng ký Target ID Proposed trong cùng lần chạy.
 */
function registerProposedIdInRun(proposedIdsInRun, targetSheetName, targetId, rowNumber) {
  var sheetName = normalizeText(targetSheetName);
  var idValue = normalizeText(targetId);
  if (isBlank(sheetName) || isBlank(idValue)) {
    return;
  }
  if (!proposedIdsInRun[sheetName]) {
    proposedIdsInRun[sheetName] = {};
  }
  if (!proposedIdsInRun[sheetName][idValue]) {
    proposedIdsInRun[sheetName][idValue] = [];
  }
  proposedIdsInRun[sheetName][idValue].push(rowNumber);
}

/**
 * Kiểm tra trùng Target ID Proposed trong cùng lần chạy.
 * - currentRowNumber = null: chỉ kiểm tra ID đã từng xuất hiện hay chưa.
 * - currentRowNumber có giá trị: bỏ qua chính dòng hiện tại.
 */
function isProposedIdDuplicateInRun(proposedIdsInRun, targetSheetName, targetId, currentRowNumber) {
  var sheetName = normalizeText(targetSheetName);
  var idValue = normalizeText(targetId);
  if (isBlank(sheetName) || isBlank(idValue)) {
    return false;
  }
  if (!proposedIdsInRun[sheetName] || !proposedIdsInRun[sheetName][idValue]) {
    return false;
  }
  var rows = proposedIdsInRun[sheetName][idValue];
  if (currentRowNumber === null || currentRowNumber === undefined) {
    return rows.length > 0;
  }
  for (var i = 0; i < rows.length; i++) {
    if (rows[i] !== currentRowNumber) {
      return true;
    }
  }
  return false;
}

/**
 * Heuristic cố định để phát hiện multiple main ideas.
 */
function detectMultipleMainIdeas(rawInputValue) {
  var text = String(rawInputValue === null || rawInputValue === undefined ? '' : rawInputValue);
  if (isBlank(text)) {
    return false;
  }

  // Rule A: >= 2 dòng bullet bắt đầu bằng -, *, •
  var bulletMatches = text.match(/^\s*[-*•]\s+/gm);
  if (bulletMatches && bulletMatches.length >= 2) {
    return true;
  }

  // Rule B: >= 2 dòng đánh số bắt đầu 1. 2. 1) 2)
  var numberedMatches = text.match(/^\s*\d+[\.\)]\s+/gm);
  if (numberedMatches && numberedMatches.length >= 2) {
    return true;
  }

  // Rule C: >= 2 đoạn ngăn bởi ; và mỗi đoạn > 15 ký tự
  var parts = text.split(';');
  var longParts = 0;
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].trim().length > 15) {
      longParts += 1;
    }
  }
  if (longParts >= 2) {
    return true;
  }

  return false;
}

/**
 * Cập nhật một dòng trong 07_INPUT_GATEWAY.
 * Chỉ cập nhật các cột cho phép.
 */
function updateGatewayRow(gatewaySheet, headerMap, rowNumber, updates) {
  var keys = Object.keys(updates);
  for (var i = 0; i < keys.length; i++) {
    var header = keys[i];
    if (!PCC_ALLOWED_GATEWAY_UPDATE_HEADERS[header]) {
      continue;
    }
    var col = headerMap[header];
    if (!col) {
      continue;
    }
    gatewaySheet.getRange(rowNumber, col).setValue(updates[header]);
  }
}

/**
 * Ghi lỗi vào PCC_ERROR_LOG.
 */
function logPccError(ss, errorCode, message, context) {
  context = context || {};
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();

  var errorSheet = ss.getSheetByName(PCC_SHEET.ERROR_LOG);
  if (!errorSheet) {
    Logger.log('[PCC_ERROR][' + errorCode + '] ' + message);
    return;
  }

  var headerMap = getHeaderMap(errorSheet);
  if (!headerMap) {
    Logger.log('[PCC_ERROR][' + errorCode + '] ' + message);
    return;
  }

  var row = [];
  var maxCol = errorSheet.getLastColumn();
  for (var i = 0; i < maxCol; i++) {
    row.push('');
  }

  setByHeader_(row, headerMap, 'Run Time', new Date());
  setByHeader_(row, headerMap, 'Sheet Name', context.sheetName || '');
  setByHeader_(row, headerMap, 'Row Number', context.rowNumber || '');
  setByHeader_(row, headerMap, 'Field Name', context.fieldName || '');
  setByHeader_(row, headerMap, 'ID Value', context.idValue || context.gatewayId || '');
  setByHeader_(row, headerMap, 'Error Type', errorCode);
  setByHeader_(row, headerMap, 'Severity', context.severity || 'ERROR');
  setByHeader_(row, headerMap, 'Message', message || '');
  setByHeader_(row, headerMap, 'Suggested Action', context.suggestedAction || '');

  var nextRow = Math.max(errorSheet.getLastRow() + 1, PCC_DATA_START_ROW);
  errorSheet.getRange(nextRow, 1, 1, maxCol).setValues([row]);
}

/**
 * Chuẩn hóa text.
 */
function normalizeText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value;
  }
  return String(value).trim();
}

/**
 * Kiểm tra rỗng.
 */
function isBlank(value) {
  return normalizeText(value) === '';
}

// ---------------------------------------------------------------------------
// Internal helper utilities
// ---------------------------------------------------------------------------

/**
 * Build context runtime:
 * - trạng thái Gateway ID
 * - tập ID hiện có ở các sheet đích
 * - map proposed IDs trong lần chạy
 */
function buildRuntimeContext_(ss, gatewaySheet, gatewayHeaderMap) {
  var context = {
    ok: true,
    gatewayIdState: {
      maxNumber: 0
    },
    targetIdStates: {},
    proposedIdsInRun: {}
  };

  // Gateway ID state từ 07_INPUT_GATEWAY
  var gatewayIdCol = gatewayHeaderMap['Gateway ID'];
  if (!gatewayIdCol) {
    logPccError(ss, PCC_VALIDATION_RESULT.MISSING_HEADER, 'Thiếu header Gateway ID', {
      sheetName: PCC_SHEET.INPUT_GATEWAY,
      fieldName: 'Gateway ID',
      severity: 'ERROR',
      suggestedAction: 'Bổ sung header Gateway ID tại dòng 3'
    });
    context.ok = false;
    return context;
  }

  var gatewayLastRow = gatewaySheet.getLastRow();
  if (gatewayLastRow >= PCC_DATA_START_ROW) {
    var gatewayIds = gatewaySheet
      .getRange(PCC_DATA_START_ROW, gatewayIdCol, gatewayLastRow - PCC_DATA_START_ROW + 1, 1)
      .getValues();
    for (var i = 0; i < gatewayIds.length; i++) {
      var gid = normalizeText(gatewayIds[i][0]);
      if (PCC_GATEWAY_ID_PATTERN.test(gid)) {
        context.gatewayIdState.maxNumber = Math.max(
          context.gatewayIdState.maxNumber,
          parseIdNumber_(gid)
        );
      }
    }
  }

  // Target ID state từ từng sheet đích
  var targetSheetNames = [
    PCC_SHEET.TASK,
    PCC_SHEET.DOCUMENT,
    PCC_SHEET.DECISION_LOG,
    PCC_SHEET.NOTEBOOKLM,
    PCC_SHEET.RISK,
    PCC_SHEET.IDEA
  ];

  for (var s = 0; s < targetSheetNames.length; s++) {
    var sheetName = targetSheetNames[s];
    var targetSheet = ss.getSheetByName(sheetName);
    if (!targetSheet) {
      logPccError(ss, PCC_VALIDATION_RESULT.MISSING_SHEET, 'Thiếu sheet đích: ' + sheetName, {
        sheetName: sheetName,
        fieldName: 'Sheet',
        severity: 'ERROR',
        suggestedAction: 'Tạo sheet còn thiếu'
      });
      context.ok = false;
      continue;
    }

    var targetHeaderMap = getHeaderMap(targetSheet);
    if (!targetHeaderMap) {
      logPccError(ss, PCC_VALIDATION_RESULT.MISSING_HEADER, 'Không đọc được header: ' + sheetName, {
        sheetName: sheetName,
        fieldName: 'Header',
        severity: 'ERROR',
        suggestedAction: 'Kiểm tra header row = 3'
      });
      context.ok = false;
      continue;
    }

    var config = PCC_TARGET_ID_CONFIG[sheetName];
    var idHeader = config.idHeader;
    var idCol = targetHeaderMap[idHeader];
    if (!idCol) {
      logPccError(ss, PCC_VALIDATION_RESULT.MISSING_HEADER, 'Thiếu header ID: ' + idHeader, {
        sheetName: sheetName,
        fieldName: idHeader,
        severity: 'ERROR',
        suggestedAction: 'Bổ sung đúng tên cột ID'
      });
      context.ok = false;
      continue;
    }

    var state = {
      existing: {},
      maxNumber: 0
    };

    var targetLastRow = targetSheet.getLastRow();
    if (targetLastRow >= PCC_DATA_START_ROW) {
      var idValues = targetSheet
        .getRange(PCC_DATA_START_ROW, idCol, targetLastRow - PCC_DATA_START_ROW + 1, 1)
        .getValues();
      for (var r = 0; r < idValues.length; r++) {
        var id = normalizeText(idValues[r][0]);
        if (isBlank(id)) {
          continue;
        }
        state.existing[id] = true;
        if (config.prefix && config.pattern.test(id)) {
          state.maxNumber = Math.max(state.maxNumber, parseIdNumber_(id));
        }
      }
    }

    context.targetIdStates[sheetName] = state;
  }

  return context;
}

/**
 * Map array row -> object theo header.
 */
function mapRowToObject_(rowArray, headerMap) {
  var obj = {};
  var headers = Object.keys(headerMap);
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    obj[h] = rowArray[headerMap[h] - 1];
  }
  return obj;
}

/**
 * Kiểm tra status hợp lệ.
 */
function isValidReviewStatus_(value) {
  var status = normalizeText(value);
  for (var i = 0; i < PCC_REVIEW_STATUS_LIST.length; i++) {
    if (PCC_REVIEW_STATUS_LIST[i] === status) {
      return true;
    }
  }
  return false;
}

/**
 * Kiểm tra input type hợp lệ.
 */
function isValidInputType_(value) {
  var inputType = normalizeText(value);
  for (var i = 0; i < PCC_INPUT_TYPE_LIST.length; i++) {
    if (PCC_INPUT_TYPE_LIST[i] === inputType) {
      return true;
    }
  }
  return false;
}

/**
 * Đánh giá điều kiện chuyển trạng thái NEW/CLASSIFIED.
 */
function evaluateReadiness_(rowObject, reviewStatus, validationEvents) {
  var blockingCodes = {
    INVALID_REVIEW_STATUS: true,
    INVALID_INPUT_TYPE: true,
    INVALID_TARGET_SHEET: true,
    MISSING_TARGET_ID: true,
    INVALID_TARGET_ID_FORMAT: true,
    DUPLICATE_TARGET_ID: true,
    DUPLICATE_TARGET_ID_IN_GATEWAY_RUN: true,
    MULTIPLE_MAIN_IDEAS: true,
    MISSING_RISK_LEVEL: true,
    MISSING_RISK_ACTION: true,
    REJECTED_REASON_REQUIRED: true,
    INVALID_DECISION_ID: true,
    DECISION_ID_NOT_FOUND: true,
    MISSING_REQUIRED_DATA: true,
    MISSING_SHEET: true,
    MISSING_HEADER: true
  };

  var hasBlockingError = false;
  for (var i = 0; i < validationEvents.length; i++) {
    if (blockingCodes[validationEvents[i]]) {
      hasBlockingError = true;
      break;
    }
  }

  var canClassify = !hasBlockingError;

  var canMoveToPendingReview =
    !hasBlockingError &&
    reviewStatus === PCC_VALID_REVIEW_STATUS.CLASSIFIED &&
    !isBlank(rowObject['Input Type']) &&
    !isBlank(rowObject['Target Sheet Proposed']) &&
    !isBlank(rowObject['Target ID Proposed']);

  var mustClarify = hasBlockingError;

  return {
    canClassify: canClassify,
    canMoveToPendingReview: canMoveToPendingReview,
    mustClarify: mustClarify
  };
}

/**
 * Resolve Validation Result cuối cùng theo thứ tự ưu tiên.
 * Không dùng giá trị ngoài enum cố định.
 */
function resolveValidationResult_(validationEvents) {
  if (!validationEvents || validationEvents.length === 0) {
    return PCC_VALIDATION_RESULT.VALIDATION_OK;
  }

  var priority = [
    PCC_VALIDATION_RESULT.MISSING_SHEET,
    PCC_VALIDATION_RESULT.MISSING_HEADER,
    PCC_VALIDATION_RESULT.INVALID_REVIEW_STATUS,
    PCC_VALIDATION_RESULT.INVALID_INPUT_TYPE,
    PCC_VALIDATION_RESULT.INVALID_TARGET_SHEET,
    PCC_VALIDATION_RESULT.MISSING_TARGET_ID,
    PCC_VALIDATION_RESULT.INVALID_TARGET_ID_FORMAT,
    PCC_VALIDATION_RESULT.DUPLICATE_TARGET_ID,
    PCC_VALIDATION_RESULT.DUPLICATE_TARGET_ID_IN_GATEWAY_RUN,
    PCC_VALIDATION_RESULT.MULTIPLE_MAIN_IDEAS,
    PCC_VALIDATION_RESULT.MISSING_RISK_LEVEL,
    PCC_VALIDATION_RESULT.MISSING_RISK_ACTION,
    PCC_VALIDATION_RESULT.REJECTED_REASON_REQUIRED,
    PCC_VALIDATION_RESULT.INVALID_DECISION_ID,
    PCC_VALIDATION_RESULT.DECISION_ID_NOT_FOUND,
    PCC_VALIDATION_RESULT.DECISION_ID_CONFIRMED,
    PCC_VALIDATION_RESULT.APPROVED_BUT_APPEND_DISABLED_PHASE1,
    PCC_VALIDATION_RESULT.MISSING_REQUIRED_DATA
  ];

  var unique = {};
  for (var i = 0; i < validationEvents.length; i++) {
    unique[validationEvents[i]] = true;
  }

  for (var p = 0; p < priority.length; p++) {
    if (unique[priority[p]]) {
      return priority[p];
    }
  }

  return PCC_VALIDATION_RESULT.VALIDATION_OK;
}

/**
 * Tạo clarification message gọn, không rỗng.
 */
function buildClarificationMessage_(notes) {
  var uniqueNotes = [];
  var seen = {};
  for (var i = 0; i < notes.length; i++) {
    var note = normalizeText(notes[i]);
    if (isBlank(note)) {
      continue;
    }
    if (!seen[note]) {
      seen[note] = true;
      uniqueNotes.push(note);
    }
  }
  if (uniqueNotes.length === 0) {
    return 'Cần làm rõ dữ liệu đầu vào';
  }
  return uniqueNotes.join(' | ');
}

/**
 * Lọc chỉ giữ lại cột được phép cập nhật trong Gateway.
 */
function filterAllowedGatewayUpdates_(updates) {
  var filtered = {};
  var keys = Object.keys(updates);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (PCC_ALLOWED_GATEWAY_UPDATE_HEADERS[k]) {
      filtered[k] = updates[k];
    }
  }
  return filtered;
}

/**
 * Set value theo header (1-based) vào row array.
 */
function setByHeader_(rowArray, headerMap, headerName, value) {
  var col = headerMap[headerName];
  if (!col) {
    return;
  }
  rowArray[col - 1] = value;
}

/**
 * Parse phần số cuối ID dạng PREFIX_0001.
 */
function parseIdNumber_(idValue) {
  var match = String(idValue).match(/_(\d+)$/);
  if (!match) {
    return 0;
  }
  return parseInt(match[1], 10);
}

/**
 * Format ID sequence 4 chữ số.
 */
function formatSequenceId_(prefix, number) {
  var padded = ('0000' + number).slice(-4);
  return prefix + padded;
}
