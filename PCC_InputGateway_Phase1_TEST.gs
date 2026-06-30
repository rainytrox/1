/**
 * PCC_InputGateway_Phase1_TEST.gs
 * PC_00_PROJECT_CONTROL_CENTER V0.3
 * Input Gateway Script – Phase 1
 *
 * Quyết định tham chiếu: D_0011 → D_0016
 * ID format tham chiếu: PCC V0.2
 * Chạy thủ công qua menu "PCC V0.3" > "Run Input Gateway Phase 1"
 *
 * Nguyên tắc:
 * - Header row = 3, data bắt đầu từ dòng 4
 * - Lookup cột theo tên header, không hard-code số cột
 * - Không ghi 00_DASHBOARD, không append/sửa 03_DECISION_LOG
 * - Chỉ append khi mapping header đích đã xác nhận 100%
 * - Thiếu sheet/header bắt buộc → dừng và ghi PCC_ERROR_LOG
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

var PCC_SCRIPT_NAME = 'PCC_InputGateway_Phase1_TEST';
var PCC_HEADER_ROW = 3;
var PCC_DATA_START_ROW = 4;
var PCC_MENU_NAME = 'PCC V0.3';
var PCC_MENU_ITEM = 'Run Input Gateway Phase 1';

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
  'Timestamp',
  'Script',
  'Error Code',
  'Message',
  'Gateway ID',
  'Row Number',
  'Details'
];

var PCC_INPUT_TYPES = ['TASK', 'DOCUMENT', 'DECISION', 'NOTEBOOKLM', 'RISK', 'IDEA'];

var PCC_INPUT_TYPE_TO_SHEET = {
  TASK: PCC_SHEET.TASK,
  DOCUMENT: PCC_SHEET.DOCUMENT,
  DECISION: PCC_SHEET.DECISION_LOG,
  NOTEBOOKLM: PCC_SHEET.NOTEBOOKLM,
  RISK: PCC_SHEET.RISK,
  IDEA: PCC_SHEET.IDEA
};

var PCC_REVIEW_STATUS = {
  NEW: 'NEW',
  CLASSIFIED: 'CLASSIFIED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  NEEDS_CLARIFICATION: 'NEEDS_CLARIFICATION',
  APPROVED_TO_TRANSFER: 'APPROVED_TO_TRANSFER',
  TRANSFERRED: 'TRANSFERRED',
  REJECTED: 'REJECTED'
};

var PCC_VALID_REVIEW_STATUSES = [
  PCC_REVIEW_STATUS.NEW,
  PCC_REVIEW_STATUS.CLASSIFIED,
  PCC_REVIEW_STATUS.PENDING_REVIEW,
  PCC_REVIEW_STATUS.NEEDS_CLARIFICATION,
  PCC_REVIEW_STATUS.APPROVED_TO_TRANSFER,
  PCC_REVIEW_STATUS.TRANSFERRED,
  PCC_REVIEW_STATUS.REJECTED
];

var PCC_TRANSFER_MODE = {
  MANUAL: 'MANUAL',
  AUTO: 'AUTO'
};

/** PCC V0.2 – Gateway ID: GW_0001 */
var PCC_GATEWAY_ID_PREFIX = 'GW_';
var PCC_GATEWAY_ID_PATTERN = /^GW_\d{4}$/;

/**
 * Cấu hình sheet đích theo PCC V0.2.
 *
 * - idHeader / idPattern: dùng cho validate ID và kiểm tra trùng
 * - canAutoGenerateId: false khi không thể tự sinh ID (vd. DOCUMENT: MF_xx_xx_NAME / PC_xx_NAME)
 * - mappingComplete + appendable: chỉ true khi đã xác nhận 100% header mapping
 * - appendFields: chỉ khai báo cột đích đã xác nhận; thiếu bất kỳ cột nào → không append
 */
var PCC_TARGET_SHEET_CONFIG = {
  '01_TASK': {
    idHeader: 'Task ID',
    idPrefix: 'T_',
    idPattern: /^T_\d{4}$/,
    idFormatHint: 'T_0001',
    canAutoGenerateId: true,
    appendable: true,
    mappingComplete: true,
    appendFields: [
      { targetHeader: 'Task ID', gatewayHeader: 'Target ID Proposed' },
      { targetHeader: 'Task Name', gatewayHeader: 'Raw Input' },
      { targetHeader: 'Priority', gatewayHeader: 'Priority' },
      { targetHeader: 'Owner', gatewayHeader: 'Owner' },
      { targetHeader: 'Due Date', gatewayHeader: 'Due Date' },
      { targetHeader: 'Related Document', gatewayHeader: 'Related Document ID' },
      { targetHeader: 'Source', gatewayHeader: 'Gateway ID' },
      { targetHeader: 'Remark', gatewayHeader: 'Remark' }
    ]
  },
  '02_DOCUMENT': {
    idHeader: 'Document ID',
    idPattern: /^(MF|PC)_[A-Z0-9_]+$/,
    idFormatHint: 'MF_xx_xx_NAME hoặc PC_xx_NAME',
    canAutoGenerateId: false,
    appendable: false,
    mappingComplete: false,
    appendFields: []
  },
  '03_DECISION_LOG': {
    idHeader: 'Decision ID',
    idPrefix: 'D_',
    idPattern: /^D_\d{4}$/,
    idFormatHint: 'D_0001',
    canAutoGenerateId: true,
    appendable: false,
    mappingComplete: false,
    appendFields: []
  },
  '04_NOTEBOOKLM': {
    idHeader: 'KB Update ID',
    idPrefix: 'KBU_',
    idPattern: /^KBU_\d{4}$/,
    idFormatHint: 'KBU_0001',
    canAutoGenerateId: true,
    appendable: false,
    mappingComplete: false,
    appendFields: []
  },
  '05_RISK': {
    idHeader: 'Risk ID',
    idPrefix: 'R_',
    idPattern: /^R_\d{4}$/,
    idFormatHint: 'R_0001',
    canAutoGenerateId: true,
    appendable: false,
    mappingComplete: false,
    appendFields: []
  },
  '06_IDEA': {
    idHeader: 'Idea ID',
    idPrefix: 'I_',
    idPattern: /^I_\d{4}$/,
    idFormatHint: 'I_0001',
    canAutoGenerateId: true,
    appendable: false,
    mappingComplete: false,
    appendFields: []
  }
};

var PCC_BLOCKING_VALIDATION_CODES = {
  INVALID_INPUT_TYPE: true,
  INVALID_TARGET_SHEET: true,
  MISSING_REQUIRED_DATA: true,
  MISSING_RISK_LEVEL: true,
  MISSING_RISK_ACTION: true,
  INVALID_TARGET_ID_FORMAT: true,
  DUPLICATE_TARGET_ID: true,
  MULTIPLE_MAIN_IDEAS: true,
  MISSING_TARGET_HEADER: true,
  MISSING_APPEND_MAPPING: true,
  REJECTED_REASON_REQUIRED: true,
  INVALID_DECISION_ID: true,
  DECISION_ID_NOT_FOUND: true,
  TARGET_WRITE_ERROR: true,
  INVALID_REVIEW_STATUS: true
};

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

/**
 * Tạo menu PCC khi mở spreadsheet.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(PCC_MENU_NAME)
    .addItem(PCC_MENU_ITEM, 'runInputGatewayPhase1')
    .addToUi();
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

/**
 * Hàm chính – xử lý toàn bộ dòng trong 07_INPUT_GATEWAY (Phase 1).
 */
function runInputGatewayPhase1() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var runTimestamp = new Date();

  if (!ensureRequiredSheets(ss)) {
    return;
  }

  var gatewaySheet = ss.getSheetByName(PCC_SHEET.INPUT_GATEWAY);
  var gatewayHeaderMap = getHeaderMap(gatewaySheet);
  if (!gatewayHeaderMap) {
    logPccError(ss, 'MISSING_GATEWAY_HEADERS', 'Không đọc được header tại dòng ' + PCC_HEADER_ROW, {
      sheetName: PCC_SHEET.INPUT_GATEWAY
    });
    return;
  }

  if (!ensureRequiredHeaders(ss, gatewaySheet, gatewayHeaderMap, PCC_GATEWAY_HEADERS, PCC_SHEET.INPUT_GATEWAY)) {
    return;
  }

  var targetContext = buildTargetContext_(ss);
  if (!targetContext.ok) {
    return;
  }

  var lastRow = gatewaySheet.getLastRow();
  if (lastRow < PCC_DATA_START_ROW) {
    return;
  }

  var lastCol = gatewaySheet.getLastColumn();
  var dataRange = gatewaySheet.getRange(PCC_DATA_START_ROW, 1, lastRow - PCC_DATA_START_ROW + 1, lastCol);
  var values = dataRange.getValues();

  var gatewayIdState = collectExistingIds_(
    gatewaySheet,
    gatewayHeaderMap,
    PCC_GATEWAY_HEADERS[0],
    PCC_GATEWAY_ID_PATTERN
  );

  for (var i = 0; i < values.length; i++) {
    var rowNumber = PCC_DATA_START_ROW + i;
    var rowObj = rowArrayToObject_(values[i], gatewayHeaderMap);

    if (isBlank_(rowObj['Raw Input'])) {
      continue;
    }

    try {
      processGatewayRow_(
        ss,
        gatewaySheet,
        gatewayHeaderMap,
        rowObj,
        rowNumber,
        targetContext,
        gatewayIdState,
        runTimestamp
      );
    } catch (err) {
      logPccError(ss, 'ROW_PROCESSING_ERROR', 'Lỗi xử lý dòng gateway', {
        gatewayId: rowObj['Gateway ID'] || '',
        rowNumber: rowNumber,
        details: String(err && err.message ? err.message : err)
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Row processing
// ---------------------------------------------------------------------------

/**
 * Xử lý một dòng gateway theo quy tắc Phase 1.
 */
function processGatewayRow_(ss, gatewaySheet, gatewayHeaderMap, rowObj, rowNumber, targetContext, gatewayIdState, runTimestamp) {
  var updates = {};
  var validationCodes = [];

  // Rule 1: Gateway ID trống → tự tạo GW_0001
  if (isBlank_(rowObj['Gateway ID'])) {
    var newGatewayId = generateNextGatewayId(gatewayIdState);
    updates['Gateway ID'] = newGatewayId;
    rowObj['Gateway ID'] = newGatewayId;
    gatewayIdState.existing[newGatewayId] = true;
    gatewayIdState.maxNum = Math.max(gatewayIdState.maxNum, parseIdNumber_(newGatewayId));
  }

  // Rule 3: Review Status trống → NEW
  var reviewStatus = normalizeText_(rowObj['Review Status']);
  if (!reviewStatus) {
    reviewStatus = PCC_REVIEW_STATUS.NEW;
    updates['Review Status'] = reviewStatus;
    rowObj['Review Status'] = reviewStatus;
  } else if (PCC_VALID_REVIEW_STATUSES.indexOf(reviewStatus) === -1) {
    validationCodes.push('INVALID_REVIEW_STATUS');
    reviewStatus = PCC_REVIEW_STATUS.NEEDS_CLARIFICATION;
    updates['Review Status'] = reviewStatus;
    updates['Clarification Needed'] = 'Review Status không hợp lệ: ' + rowObj['Review Status'];
    rowObj['Review Status'] = reviewStatus;
  }

  // Rule 14: REJECTED bắt buộc có Rejected Reason
  if (reviewStatus === PCC_REVIEW_STATUS.REJECTED) {
    if (isBlank_(rowObj['Rejected Reason'])) {
      validationCodes.push('REJECTED_REASON_REQUIRED');
      updates['Validation Result'] = 'REJECTED_REASON_REQUIRED';
    }
  }

  // Rule 4–5: Input Type
  var inputType = normalizeText_(rowObj['Input Type']);
  if (!inputType || PCC_INPUT_TYPES.indexOf(inputType) === -1) {
    updates['Review Status'] = PCC_REVIEW_STATUS.NEEDS_CLARIFICATION;
    updates['Validation Result'] = 'INVALID_INPUT_TYPE';
    updates['Clarification Needed'] = 'Input Type không hợp lệ. Chỉ chấp nhận: ' + PCC_INPUT_TYPES.join(', ');
    updates['Last Update'] = runTimestamp;
    updateGatewayRow(gatewaySheet, gatewayHeaderMap, rowNumber, updates);
    logPccError(ss, 'INVALID_INPUT_TYPE', updates['Clarification Needed'], {
      gatewayId: rowObj['Gateway ID'],
      rowNumber: rowNumber
    });
    return;
  }

  var proposedSheet = PCC_INPUT_TYPE_TO_SHEET[inputType];
  updates['Target Sheet Proposed'] = proposedSheet;
  rowObj['Target Sheet Proposed'] = proposedSheet;

  // Rule 5: Target ID Proposed trống → tạo đề xuất (nếu sheet cho phép auto-generate)
  if (isBlank_(rowObj['Target ID Proposed'])) {
    var generatedTargetId = generateNextTargetId(ss, proposedSheet, targetContext);
    if (generatedTargetId.error) {
      validationCodes.push(generatedTargetId.errorCode);
      updates['Validation Result'] = generatedTargetId.errorCode;
      updates['Clarification Needed'] = generatedTargetId.message;
    } else {
      updates['Target ID Proposed'] = generatedTargetId.id;
      rowObj['Target ID Proposed'] = generatedTargetId.id;
      targetContext.idState[proposedSheet].existing[generatedTargetId.id] = true;
      targetContext.idState[proposedSheet].maxNum = Math.max(
        targetContext.idState[proposedSheet].maxNum,
        parseIdNumber_(generatedTargetId.id)
      );
    }
  }

  // Rule 6–7: RISK / DECISION
  var effectiveSheet = getEffectiveTargetSheet_(rowObj);
  var riskValidation = validateRiskRequirements_(rowObj, effectiveSheet);
  if (!riskValidation.ok) {
    mergeValidation_(validationCodes, updates, riskValidation);
    reviewStatus = PCC_REVIEW_STATUS.NEEDS_CLARIFICATION;
    updates['Review Status'] = reviewStatus;
    rowObj['Review Status'] = reviewStatus;
  }

  applyDecisionManualRules_(rowObj, updates);
  rowObj['Transfer Mode'] = updates['Transfer Mode'] || rowObj['Transfer Mode'];

  // Rule 9: Target Sheet Approved khác Proposed → validate lại theo Approved
  if (!isBlank_(rowObj['Target Sheet Approved']) &&
      normalizeText_(rowObj['Target Sheet Approved']) !== normalizeText_(rowObj['Target Sheet Proposed'])) {
    effectiveSheet = normalizeText_(rowObj['Target Sheet Approved']);
    var approvedRiskValidation = validateRiskRequirements_(rowObj, effectiveSheet);
    if (!approvedRiskValidation.ok) {
      mergeValidation_(validationCodes, updates, approvedRiskValidation);
      reviewStatus = PCC_REVIEW_STATUS.NEEDS_CLARIFICATION;
      updates['Review Status'] = reviewStatus;
      rowObj['Review Status'] = reviewStatus;
    }
    if (effectiveSheet === PCC_SHEET.DECISION_LOG) {
      applyDecisionManualRules_(rowObj, updates);
      rowObj['Transfer Mode'] = updates['Transfer Mode'] || rowObj['Transfer Mode'];
    }
  }

  // Validate tổng thể (classify / gateway status – không append nếu mapping chưa đủ)
  var validation = validateInputGatewayRow(rowObj, targetContext, {
    reviewStatus: reviewStatus,
    effectiveSheet: effectiveSheet
  });
  validationCodes = validationCodes.concat(validation.codes);
  Object.keys(validation.updates).forEach(function (key) {
    updates[key] = validation.updates[key];
    rowObj[key] = validation.updates[key];
  });

  if (validation.clarification) {
    updates['Clarification Needed'] = validation.clarification;
  }

  // Rule 8: CLASSIFIED → PENDING_REVIEW khi đủ điều kiện
  reviewStatus = normalizeText_(updates['Review Status'] || rowObj['Review Status']);
  if (reviewStatus === PCC_REVIEW_STATUS.CLASSIFIED && validation.canMoveToPendingReview) {
    updates['Review Status'] = PCC_REVIEW_STATUS.PENDING_REVIEW;
    reviewStatus = PCC_REVIEW_STATUS.PENDING_REVIEW;
    rowObj['Review Status'] = reviewStatus;
  }

  // NEW → CLASSIFIED sau khi phân loại cơ bản
  if (reviewStatus === PCC_REVIEW_STATUS.NEW && validation.canClassify) {
    updates['Review Status'] = PCC_REVIEW_STATUS.CLASSIFIED;
    reviewStatus = PCC_REVIEW_STATUS.CLASSIFIED;
    rowObj['Review Status'] = reviewStatus;
  }

  // Rule 12: đã transfer → không append lại (trừ DECISION MANUAL đang chờ xác nhận ID)
  var decisionManualRow = isDecisionManualRow_(rowObj, effectiveSheet);
  if (reviewStatus === PCC_REVIEW_STATUS.APPROVED_TO_TRANSFER && !decisionManualRow) {
    if (!isBlank_(rowObj['Created Target ID']) || !isBlank_(rowObj['Transfer Date'])) {
      updates['Validation Result'] = 'ALREADY_TRANSFERRED';
      updates['Last Update'] = runTimestamp;
      updateGatewayRow(gatewaySheet, gatewayHeaderMap, rowNumber, updates);
      return;
    }
  }

  // Rule 13: DECISION MANUAL – xác nhận Created Target ID
  if (decisionManualRow) {
    var decisionResult = processDecisionManualTransfer_(ss, rowObj, targetContext, runTimestamp);
    Object.keys(decisionResult.updates).forEach(function (key) {
      updates[key] = decisionResult.updates[key];
    });
    validationCodes = validationCodes.concat(decisionResult.codes);
    if (decisionResult.done) {
      updates['Last Update'] = runTimestamp;
      if (validationCodes.length > 0 && !updates['Validation Result']) {
        updates['Validation Result'] = validationCodes[validationCodes.length - 1];
      }
      updateGatewayRow(gatewaySheet, gatewayHeaderMap, rowNumber, updates);
      return;
    }
  }

  // Rule 10–11: APPROVED_TO_TRANSFER → append (chỉ khi mapping đủ 100%)
  reviewStatus = normalizeText_(updates['Review Status'] || rowObj['Review Status']);
  if (reviewStatus === PCC_REVIEW_STATUS.APPROVED_TO_TRANSFER) {
    var transferResult = attemptAutoTransfer_(
      ss,
      rowObj,
      effectiveSheet,
      targetContext,
      validationCodes,
      runTimestamp
    );
    Object.keys(transferResult.updates).forEach(function (key) {
      updates[key] = transferResult.updates[key];
    });
    validationCodes = validationCodes.concat(transferResult.codes);
  } else if (validationCodes.length > 0) {
    updates['Validation Result'] = validationCodes[validationCodes.length - 1];
  } else if (!updates['Validation Result'] && validation.validationResult) {
    updates['Validation Result'] = validation.validationResult;
  }

  updates['Last Update'] = runTimestamp;
  updateGatewayRow(gatewaySheet, gatewayHeaderMap, rowNumber, updates);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate một dòng gateway theo Phase 1.
 */
function validateInputGatewayRow(rowObj, targetContext, options) {
  options = options || {};
  var codes = [];
  var updates = {};
  var clarification = '';
  var effectiveSheet = options.effectiveSheet || getEffectiveTargetSheet_(rowObj);

  var inputType = normalizeText_(rowObj['Input Type']);
  if (!inputType || PCC_INPUT_TYPES.indexOf(inputType) === -1) {
    codes.push('INVALID_INPUT_TYPE');
    return buildValidationResult_(false, false, codes, updates, 'INVALID_INPUT_TYPE', clarification);
  }

  if (!effectiveSheet || !PCC_TARGET_SHEET_CONFIG[effectiveSheet]) {
    codes.push('INVALID_TARGET_SHEET');
    clarification = 'Target sheet không hợp lệ: ' + effectiveSheet;
    return buildValidationResult_(false, false, codes, updates, 'INVALID_TARGET_SHEET', clarification);
  }

  if (isBlank_(rowObj['Raw Input'])) {
    codes.push('MISSING_REQUIRED_DATA');
    clarification = 'Thiếu Raw Input';
  }

  if (!hasSingleMainIdea_(rowObj['Raw Input'])) {
    codes.push('MULTIPLE_MAIN_IDEAS');
    clarification = 'Một dòng chỉ được có một ý chính';
  }

  var targetId = normalizeText_(rowObj['Target ID Proposed']);
  var sheetConfig = PCC_TARGET_SHEET_CONFIG[effectiveSheet];
  if (isBlank_(targetId)) {
    codes.push('MISSING_REQUIRED_DATA');
    clarification = clarification || 'Thiếu Target ID Proposed';
  } else if (!isValidTargetIdFormat_(targetId, sheetConfig)) {
    codes.push('INVALID_TARGET_ID_FORMAT');
    clarification = 'Target ID Proposed không đúng định dạng PCC V0.2: ' + sheetConfig.idFormatHint;
  } else if (checkIdExists(effectiveSheet, sheetConfig.idHeader, targetId, targetContext)) {
    codes.push('DUPLICATE_TARGET_ID');
    clarification = 'Target ID Proposed đã tồn tại trong ' + effectiveSheet;
  }

  var riskValidation = validateRiskRequirements_(rowObj, effectiveSheet);
  if (!riskValidation.ok) {
    codes = codes.concat(riskValidation.codes);
    clarification = clarification || riskValidation.message;
  }

  if (inputType === 'DECISION' || effectiveSheet === PCC_SHEET.DECISION_LOG) {
    var transferMode = normalizeText_(updates['Transfer Mode'] || rowObj['Transfer Mode']);
    if (transferMode !== PCC_TRANSFER_MODE.MANUAL) {
      updates['Transfer Mode'] = PCC_TRANSFER_MODE.MANUAL;
      rowObj['Transfer Mode'] = PCC_TRANSFER_MODE.MANUAL;
    }
  }

  // Kiểm tra mapping append – Phase 1 chỉ pass khi mappingComplete và header khớp 100%
  var appendGuard = validateAppendMappingHeaders_(effectiveSheet, targetContext);
  if (!appendGuard.ok && normalizeText_(rowObj['Review Status']) === PCC_REVIEW_STATUS.APPROVED_TO_TRANSFER) {
    codes.push(appendGuard.errorCode);
    clarification = clarification || appendGuard.message;
  }

  var hasBlocking = hasBlockingValidation_(codes);
  var canClassify = !hasBlocking;

  var idValid = !isBlank_(targetId) && isValidTargetIdFormat_(targetId, sheetConfig);
  var canMoveToPendingReview = !hasBlocking &&
    hasSingleMainIdea_(rowObj['Raw Input']) &&
    idValid &&
    !checkIdExists(effectiveSheet, sheetConfig.idHeader, targetId, targetContext) &&
    riskValidation.ok &&
    (inputType !== 'DECISION' || normalizeText_(rowObj['Transfer Mode']) === PCC_TRANSFER_MODE.MANUAL) &&
    (effectiveSheet !== PCC_SHEET.DECISION_LOG || normalizeText_(rowObj['Transfer Mode']) === PCC_TRANSFER_MODE.MANUAL);

  var validationResult = codes.length > 0 ? codes[codes.length - 1] : 'VALIDATION_OK';

  return buildValidationResult_(canClassify, canMoveToPendingReview, codes, updates, validationResult, clarification);
}

/**
 * Kiểm tra một dòng chỉ có một ý chính.
 */
function hasSingleMainIdea_(rawInput) {
  if (isBlank_(rawInput)) {
    return false;
  }

  var text = String(rawInput).trim();
  var bulletCount = (text.match(/^\s*[-*•]\s+/gm) || []).length;
  if (bulletCount > 1) {
    return false;
  }

  var numberedCount = (text.match(/^\s*\d+[\.\)]\s+/gm) || []).length;
  if (numberedCount > 1) {
    return false;
  }

  var lines = text.split(/\r?\n/).map(function (line) {
    return line.trim();
  }).filter(function (line) {
    return line.length > 0;
  });
  if (lines.length > 2) {
    return false;
  }

  var semicolonParts = text.split(';').filter(function (part) {
    return part.trim().length > 10;
  });
  if (semicolonParts.length > 1) {
    return false;
  }

  return true;
}

/**
 * Validate Risk Level / Risk Action khi áp dụng cho sheet RISK.
 */
function validateRiskRequirements_(rowObj, effectiveSheet) {
  var applies = normalizeText_(rowObj['Input Type']) === 'RISK' || effectiveSheet === PCC_SHEET.RISK;
  if (!applies) {
    return { ok: true, codes: [] };
  }

  var codes = [];
  var messages = [];

  if (isBlank_(rowObj['Risk Level'])) {
    codes.push('MISSING_RISK_LEVEL');
    messages.push('Thiếu Risk Level');
  }
  if (isBlank_(rowObj['Risk Action'])) {
    codes.push('MISSING_RISK_ACTION');
    messages.push('Thiếu Risk Action');
  }

  if (codes.length > 0) {
    return {
      ok: false,
      codes: codes,
      message: messages.join('; '),
      errorCode: codes.join('_AND_')
    };
  }

  return { ok: true, codes: [] };
}

/**
 * Kiểm tra mapping append – chỉ pass khi mappingComplete và mọi cột mapping tồn tại.
 */
function validateAppendMappingHeaders_(sheetName, targetContext) {
  var config = PCC_TARGET_SHEET_CONFIG[sheetName];
  if (!config) {
    return {
      ok: false,
      errorCode: 'INVALID_TARGET_SHEET',
      message: 'Không có cấu hình cho sheet: ' + sheetName
    };
  }

  if (!config.mappingComplete || !config.appendable) {
    return {
      ok: false,
      errorCode: 'MISSING_APPEND_MAPPING',
      message: 'Chưa có mapping append đầy đủ cho ' + sheetName + ' – Phase 1 không append'
    };
  }

  if (!config.appendFields || config.appendFields.length === 0) {
    return {
      ok: false,
      errorCode: 'MISSING_APPEND_MAPPING',
      message: 'Thiếu cấu hình append mapping cho ' + sheetName
    };
  }

  var headerMap = targetContext.headerMaps[sheetName];
  if (!headerMap) {
    return {
      ok: false,
      errorCode: 'MISSING_TARGET_HEADER',
      message: 'Không đọc được header của sheet ' + sheetName
    };
  }

  var missing = [];

  if (!headerMap[config.idHeader]) {
    missing.push(config.idHeader);
  }

  config.appendFields.forEach(function (field) {
    if (!headerMap[field.targetHeader]) {
      missing.push(field.targetHeader);
    }
  });

  if (missing.length > 0) {
    return {
      ok: false,
      errorCode: 'MISSING_TARGET_HEADER',
      message: 'Thiếu header bắt buộc trong ' + sheetName + ': ' + unique_(missing).join(', ')
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Transfer
// ---------------------------------------------------------------------------

/**
 * Thử append tự động sang sheet đích khi đủ điều kiện Rule 10.
 * Phase 1: chỉ append khi mapping header đích khớp 100%.
 */
function attemptAutoTransfer_(ss, rowObj, effectiveSheet, targetContext, existingCodes, runTimestamp) {
  var updates = {};
  var codes = existingCodes.slice();

  if (!isBlank_(rowObj['Created Target ID']) || !isBlank_(rowObj['Transfer Date'])) {
    updates['Validation Result'] = 'ALREADY_TRANSFERRED';
    return { updates: updates, codes: codes };
  }

  var sheetConfig = PCC_TARGET_SHEET_CONFIG[effectiveSheet];
  if (!sheetConfig) {
    codes.push('INVALID_TARGET_SHEET');
    updates['Validation Result'] = 'INVALID_TARGET_SHEET';
    return { updates: updates, codes: codes };
  }

  if (effectiveSheet === PCC_SHEET.DECISION_LOG) {
    updates['Transfer Mode'] = PCC_TRANSFER_MODE.MANUAL;
    updates['Validation Result'] = codes.length > 0 ? codes[codes.length - 1] : 'MANUAL_DECISION_REQUIRED';
    return { updates: updates, codes: codes };
  }

  if (!sheetConfig.mappingComplete || !sheetConfig.appendable) {
    codes.push('MISSING_APPEND_MAPPING');
    updates['Validation Result'] = 'MISSING_APPEND_MAPPING';
    updates['Clarification Needed'] = 'Chưa có mapping append đầy đủ cho ' + effectiveSheet + ' – Phase 1 không append';
    return { updates: updates, codes: codes };
  }

  if (hasBlockingValidation_(codes)) {
    updates['Validation Result'] = codes[codes.length - 1];
    updates['Review Status'] = PCC_REVIEW_STATUS.NEEDS_CLARIFICATION;
    return { updates: updates, codes: codes };
  }

  var targetId = normalizeText_(rowObj['Target ID Proposed']);
  if (!isValidTargetIdFormat_(targetId, sheetConfig)) {
    codes.push('INVALID_TARGET_ID_FORMAT');
    updates['Validation Result'] = 'INVALID_TARGET_ID_FORMAT';
    updates['Clarification Needed'] = 'Định dạng ID không hợp lệ. Yêu cầu: ' + sheetConfig.idFormatHint;
    updates['Review Status'] = PCC_REVIEW_STATUS.NEEDS_CLARIFICATION;
    return { updates: updates, codes: codes };
  }

  if (checkIdExists(effectiveSheet, sheetConfig.idHeader, targetId, targetContext)) {
    codes.push('DUPLICATE_TARGET_ID');
    updates['Validation Result'] = 'DUPLICATE_TARGET_ID';
    updates['Review Status'] = PCC_REVIEW_STATUS.NEEDS_CLARIFICATION;
    logPccError(ss, 'DUPLICATE_TARGET_ID', 'Không append vì ID đã tồn tại – cần làm rõ, không sửa bản ghi cũ', {
      gatewayId: rowObj['Gateway ID'],
      details: targetId + ' @ ' + effectiveSheet
    });
    return { updates: updates, codes: codes };
  }

  var appendGuard = validateAppendMappingHeaders_(effectiveSheet, targetContext);
  if (!appendGuard.ok) {
    codes.push(appendGuard.errorCode);
    updates['Validation Result'] = appendGuard.errorCode;
    updates['Clarification Needed'] = appendGuard.message;
    logPccError(ss, appendGuard.errorCode, appendGuard.message, {
      gatewayId: rowObj['Gateway ID'],
      details: effectiveSheet
    });
    return { updates: updates, codes: codes };
  }

  var appendResult = appendToTargetSheet(ss, effectiveSheet, rowObj, targetContext, runTimestamp);
  if (!appendResult.ok) {
    codes.push(appendResult.errorCode);
    updates['Validation Result'] = appendResult.errorCode;
    updates['Clarification Needed'] = appendResult.message;
    updates['Review Status'] = PCC_REVIEW_STATUS.NEEDS_CLARIFICATION;
    logPccError(ss, appendResult.errorCode, appendResult.message, {
      gatewayId: rowObj['Gateway ID'],
      details: effectiveSheet
    });
    return { updates: updates, codes: codes };
  }

  // Rule 11: sau append thành công
  updates['Created Target ID'] = targetId;
  updates['Transfer Date'] = runTimestamp;
  updates['Review Status'] = PCC_REVIEW_STATUS.TRANSFERRED;
  updates['Validation Result'] = 'TRANSFER_OK';
  updates['Transfer Mode'] = PCC_TRANSFER_MODE.AUTO;

  targetContext.idState[effectiveSheet].existing[targetId] = true;
  targetContext.idState[effectiveSheet].maxNum = Math.max(
    targetContext.idState[effectiveSheet].maxNum,
    parseIdNumber_(targetId)
  );

  return { updates: updates, codes: codes };
}

/**
 * Xử lý DECISION MANUAL – Rule 13.
 */
function processDecisionManualTransfer_(ss, rowObj, targetContext, runTimestamp) {
  var updates = {};
  var codes = [];

  if (!isDecisionManualRow_(rowObj, getEffectiveTargetSheet_(rowObj))) {
    return { updates: updates, codes: codes, done: false };
  }

  updates['Transfer Mode'] = PCC_TRANSFER_MODE.MANUAL;

  var createdId = normalizeText_(rowObj['Created Target ID']);
  if (isBlank_(createdId)) {
    return { updates: updates, codes: codes, done: false };
  }

  var decisionConfig = PCC_TARGET_SHEET_CONFIG[PCC_SHEET.DECISION_LOG];
  if (!isValidTargetIdFormat_(createdId, decisionConfig)) {
    codes.push('INVALID_DECISION_ID');
    updates['Validation Result'] = 'INVALID_DECISION_ID';
    updates['Clarification Needed'] = 'Decision ID không đúng định dạng ' + decisionConfig.idFormatHint;
    return { updates: updates, codes: codes, done: true };
  }

  if (!checkIdExists(PCC_SHEET.DECISION_LOG, decisionConfig.idHeader, createdId, targetContext)) {
    codes.push('DECISION_ID_NOT_FOUND');
    updates['Validation Result'] = 'DECISION_ID_NOT_FOUND';
    return { updates: updates, codes: codes, done: true };
  }

  updates['Review Status'] = PCC_REVIEW_STATUS.TRANSFERRED;
  updates['Transfer Date'] = runTimestamp;
  updates['Validation Result'] = 'TRANSFER_OK';
  return { updates: updates, codes: codes, done: true };
}

/**
 * Append một dòng mới vào sheet đích theo mapping đã khai báo.
 * Chỉ gọi khi validateAppendMappingHeaders_ đã pass.
 */
function appendToTargetSheet(ss, sheetName, rowObj, targetContext, runTimestamp) {
  var config = PCC_TARGET_SHEET_CONFIG[sheetName];
  if (!config || !config.appendable || !config.mappingComplete) {
    return {
      ok: false,
      errorCode: 'MISSING_APPEND_MAPPING',
      message: 'Sheet không được append tự động trong Phase 1: ' + sheetName
    };
  }

  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return {
      ok: false,
      errorCode: 'MISSING_SHEET',
      message: 'Không tìm thấy sheet: ' + sheetName
    };
  }

  var headerMap = targetContext.headerMaps[sheetName];
  var mappingGuard = validateAppendMappingHeaders_(sheetName, targetContext);
  if (!mappingGuard.ok) {
    return {
      ok: false,
      errorCode: mappingGuard.errorCode,
      message: mappingGuard.message
    };
  }

  var lastCol = sheet.getLastColumn();
  var rowValues = new Array(lastCol);
  for (var c = 0; c < lastCol; c++) {
    rowValues[c] = '';
  }

  for (var f = 0; f < config.appendFields.length; f++) {
    var field = config.appendFields[f];
    var targetCol = headerMap[field.targetHeader];
    if (!targetCol) {
      return {
        ok: false,
        errorCode: 'MISSING_TARGET_HEADER',
        message: 'Thiếu header "' + field.targetHeader + '" trong ' + sheetName
      };
    }
    var value = rowObj[field.gatewayHeader];
    rowValues[targetCol - 1] = value === undefined || value === null ? '' : value;
  }

  // Ghi Last Update nếu sheet đích có cột này (01_TASK đã xác nhận)
  if (headerMap['Last Update']) {
    rowValues[headerMap['Last Update'] - 1] = runTimestamp || new Date();
  }

  try {
    var nextRow = Math.max(sheet.getLastRow() + 1, PCC_DATA_START_ROW);
    sheet.getRange(nextRow, 1, 1, lastCol).setValues([rowValues]);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      errorCode: 'TARGET_WRITE_ERROR',
      message: 'Không ghi được vào ' + sheetName + ': ' + String(err && err.message ? err.message : err)
    };
  }
}

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

/**
 * Sinh Gateway ID tiếp theo dạng GW_0001.
 */
function generateNextGatewayId(gatewayIdState) {
  gatewayIdState.maxNum += 1;
  return formatId_(PCC_GATEWAY_ID_PREFIX, gatewayIdState.maxNum);
}

/**
 * Sinh Target ID đề xuất cho sheet đích theo PCC V0.2.
 */
function generateNextTargetId(ss, sheetName, targetContext) {
  var config = PCC_TARGET_SHEET_CONFIG[sheetName];
  if (!config) {
    return {
      error: true,
      errorCode: 'INVALID_TARGET_SHEET',
      message: 'Không có cấu hình ID cho sheet: ' + sheetName
    };
  }

  if (config.canAutoGenerateId === false) {
    return {
      error: true,
      errorCode: 'MISSING_REQUIRED_DATA',
      message: 'Target ID Proposed phải điền thủ công cho ' + sheetName +
        ' (định dạng: ' + config.idFormatHint + ')'
    };
  }

  if (!config.idPrefix) {
    return {
      error: true,
      errorCode: 'MISSING_APPEND_MAPPING',
      message: 'Không thể tự sinh ID cho ' + sheetName + ' – thiếu cấu hình prefix'
    };
  }

  if (!targetContext.headerMaps[sheetName]) {
    return {
      error: true,
      errorCode: 'MISSING_TARGET_HEADER',
      message: 'Không đọc được header của sheet: ' + sheetName
    };
  }

  if (!targetContext.headerMaps[sheetName][config.idHeader]) {
    return {
      error: true,
      errorCode: 'MISSING_TARGET_HEADER',
      message: 'Thiếu cột ID bắt buộc "' + config.idHeader + '" trong ' + sheetName
    };
  }

  var idState = targetContext.idState[sheetName];
  idState.maxNum += 1;
  return { id: formatId_(config.idPrefix, idState.maxNum) };
}

/**
 * Kiểm tra ID đã tồn tại trong sheet đích chưa.
 */
function checkIdExists(sheetName, idHeader, idValue, targetContext) {
  if (isBlank_(idValue)) {
    return false;
  }

  var normalizedId = normalizeText_(idValue);
  if (targetContext && targetContext.idState && targetContext.idState[sheetName]) {
    return !!targetContext.idState[sheetName].existing[normalizedId];
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return false;
  }

  var headerMap = getHeaderMap(sheet);
  if (!headerMap || !headerMap[idHeader]) {
    return false;
  }

  var col = headerMap[idHeader];
  var lastRow = sheet.getLastRow();
  if (lastRow < PCC_DATA_START_ROW) {
    return false;
  }

  var values = sheet.getRange(PCC_DATA_START_ROW, col, lastRow - PCC_DATA_START_ROW + 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (normalizeText_(values[i][0]) === normalizedId) {
      return true;
    }
  }
  return false;
}

/**
 * Kiểm tra định dạng ID theo PCC V0.2.
 */
function isValidTargetIdFormat_(idValue, sheetConfig) {
  if (!idValue || !sheetConfig || !sheetConfig.idPattern) {
    return false;
  }
  return sheetConfig.idPattern.test(normalizeText_(idValue));
}

// ---------------------------------------------------------------------------
// Sheet / header guards
// ---------------------------------------------------------------------------

/**
 * Kiểm tra các sheet bắt buộc có tồn tại.
 */
function ensureRequiredSheets(ss) {
  var required = [
    PCC_SHEET.INPUT_GATEWAY,
    PCC_SHEET.ERROR_LOG,
    PCC_SHEET.TASK,
    PCC_SHEET.DOCUMENT,
    PCC_SHEET.DECISION_LOG,
    PCC_SHEET.NOTEBOOKLM,
    PCC_SHEET.RISK,
    PCC_SHEET.IDEA
  ];

  var missing = [];
  required.forEach(function (name) {
    if (!ss.getSheetByName(name)) {
      missing.push(name);
    }
  });

  if (missing.length > 0) {
    logPccError(ss, 'MISSING_SHEET', 'Thiếu sheet bắt buộc', {
      details: missing.join(', ')
    });
    return false;
  }

  return true;
}

/**
 * Kiểm tra header bắt buộc trên một sheet.
 */
function ensureRequiredHeaders(ss, sheet, headerMap, requiredHeaders, sheetLabel) {
  sheetLabel = sheetLabel || sheet.getName();
  var missing = [];

  requiredHeaders.forEach(function (headerName) {
    if (!headerMap[headerName]) {
      missing.push(headerName);
    }
  });

  if (missing.length > 0) {
    logPccError(ss, 'MISSING_HEADER', 'Thiếu header bắt buộc trong ' + sheetLabel, {
      details: missing.join(', ')
    });
    return false;
  }

  return true;
}

/**
 * Đọc header map từ dòng 3.
 *
 * @return {Object|null} Map {HeaderName: columnIndex(1-based)}
 */
function getHeaderMap(sheet) {
  if (!sheet) {
    return null;
  }

  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    return null;
  }

  var headers = sheet.getRange(PCC_HEADER_ROW, 1, 1, lastCol).getValues()[0];
  var map = {};

  headers.forEach(function (header, index) {
    var name = String(header || '').trim();
    if (name) {
      map[name] = index + 1;
    }
  });

  return Object.keys(map).length > 0 ? map : null;
}

// ---------------------------------------------------------------------------
// Gateway row update / error log
// ---------------------------------------------------------------------------

/**
 * Cập nhật các cột được phép trên một dòng gateway.
 */
function updateGatewayRow(sheet, headerMap, rowNumber, updates) {
  if (!sheet || !headerMap || !updates) {
    return;
  }

  Object.keys(updates).forEach(function (headerName) {
    var col = headerMap[headerName];
    if (!col) {
      return;
    }
    sheet.getRange(rowNumber, col).setValue(updates[headerName]);
  });
}

/**
 * Ghi lỗi vào PCC_ERROR_LOG.
 */
function logPccError(ss, errorCode, message, context) {
  context = context || {};
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();

  var errorSheet = ss.getSheetByName(PCC_SHEET.ERROR_LOG);
  if (!errorSheet) {
    Logger.log('[PCC_ERROR] ' + errorCode + ': ' + message + ' | ' + JSON.stringify(context));
    return;
  }

  var headerMap = getHeaderMap(errorSheet);
  if (!headerMap) {
    Logger.log('[PCC_ERROR] ' + errorCode + ': ' + message + ' | ' + JSON.stringify(context));
    return;
  }

  var row = [];
  PCC_ERROR_LOG_HEADERS.forEach(function (header) {
    row.push('');
  });

  setLogCell_(row, headerMap, 'Timestamp', new Date());
  setLogCell_(row, headerMap, 'Script', PCC_SCRIPT_NAME);
  setLogCell_(row, headerMap, 'Error Code', errorCode);
  setLogCell_(row, headerMap, 'Message', message);
  setLogCell_(row, headerMap, 'Gateway ID', context.gatewayId || '');
  setLogCell_(row, headerMap, 'Row Number', context.rowNumber || '');
  setLogCell_(row, headerMap, 'Details', context.details || context.sheetName || '');

  var nextRow = Math.max(errorSheet.getLastRow() + 1, PCC_DATA_START_ROW);
  var lastCol = errorSheet.getLastColumn();
  errorSheet.getRange(nextRow, 1, 1, lastCol).setValues([
    row.slice(0, lastCol)
  ]);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Cache header map và trạng thái ID cho các sheet đích.
 * Chỉ yêu cầu cột ID (idHeader) – không yêu cầu toàn bộ header append.
 */
function buildTargetContext_(ss) {
  var context = {
    ok: true,
    headerMaps: {},
    idState: {}
  };

  Object.keys(PCC_TARGET_SHEET_CONFIG).forEach(function (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      logPccError(ss, 'MISSING_SHEET', 'Thiếu sheet đích: ' + sheetName, { sheetName: sheetName });
      context.ok = false;
      return;
    }

    var headerMap = getHeaderMap(sheet);
    if (!headerMap) {
      logPccError(ss, 'MISSING_TARGET_HEADER', 'Không đọc được header sheet ' + sheetName, { sheetName: sheetName });
      context.ok = false;
      return;
    }

    var config = PCC_TARGET_SHEET_CONFIG[sheetName];
    if (!headerMap[config.idHeader]) {
      logPccError(ss, 'MISSING_TARGET_HEADER', 'Thiếu cột ID "' + config.idHeader + '" trong ' + sheetName, {
        sheetName: sheetName
      });
      context.ok = false;
      return;
    }

    context.headerMaps[sheetName] = headerMap;
    context.idState[sheetName] = collectExistingIds_(
      sheet,
      headerMap,
      config.idHeader,
      config.idPattern
    );
  });

  return context;
}

/**
 * Thu thập ID hiện có và số thứ tự lớn nhất theo pattern PCC V0.2.
 */
function collectExistingIds_(sheet, headerMap, idHeader, idPattern) {
  var state = {
    existing: {},
    maxNum: 0
  };

  var col = headerMap[idHeader];
  if (!col) {
    return state;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < PCC_DATA_START_ROW) {
    return state;
  }

  var values = sheet.getRange(PCC_DATA_START_ROW, col, lastRow - PCC_DATA_START_ROW + 1, 1).getValues();
  values.forEach(function (row) {
    var id = normalizeText_(row[0]);
    if (!id) {
      return;
    }
    state.existing[id] = true;
    if (idPattern.test(id)) {
      state.maxNum = Math.max(state.maxNum, parseIdNumber_(id));
    }
  });

  return state;
}

function rowArrayToObject_(rowArray, headerMap) {
  var obj = {};
  Object.keys(headerMap).forEach(function (header) {
    var colIndex = headerMap[header] - 1;
    obj[header] = rowArray[colIndex];
  });
  return obj;
}

function getEffectiveTargetSheet_(rowObj) {
  var approved = normalizeText_(rowObj['Target Sheet Approved']);
  if (approved) {
    return approved;
  }
  return normalizeText_(rowObj['Target Sheet Proposed']);
}

function isDecisionManualRow_(rowObj, effectiveSheet) {
  return normalizeText_(rowObj['Input Type']) === 'DECISION' ||
    effectiveSheet === PCC_SHEET.DECISION_LOG ||
    normalizeText_(rowObj['Target Sheet Approved']) === PCC_SHEET.DECISION_LOG;
}

function applyDecisionManualRules_(rowObj, updates) {
  if (isDecisionManualRow_(rowObj, getEffectiveTargetSheet_(rowObj))) {
    updates['Transfer Mode'] = PCC_TRANSFER_MODE.MANUAL;
    rowObj['Transfer Mode'] = PCC_TRANSFER_MODE.MANUAL;
  }
  return updates;
}

function hasBlockingValidation_(codes) {
  for (var i = 0; i < codes.length; i++) {
    if (PCC_BLOCKING_VALIDATION_CODES[codes[i]]) {
      return true;
    }
  }
  return false;
}

function buildValidationResult_(canClassify, canMoveToPendingReview, codes, updates, validationResult, clarification) {
  return {
    canClassify: canClassify,
    canMoveToPendingReview: canMoveToPendingReview,
    codes: codes,
    updates: updates,
    validationResult: validationResult,
    clarification: clarification
  };
}

function mergeValidation_(validationCodes, updates, validation) {
  if (!validation) {
    return;
  }
  if (validation.codes && validation.codes.length > 0) {
    validation.codes.forEach(function (code) {
      validationCodes.push(code);
    });
  }
  if (validation.message) {
    updates['Clarification Needed'] = validation.message;
  }
  if (validation.errorCode) {
    updates['Validation Result'] = validation.errorCode;
  }
}

function parseIdNumber_(idValue) {
  var match = String(idValue).match(/_(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

function formatId_(prefix, number) {
  var padded = ('0000' + number).slice(-4);
  return prefix + padded;
}

function normalizeText_(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value;
  }
  return String(value).trim();
}

function isBlank_(value) {
  return normalizeText_(value) === '';
}

function unique_(arr) {
  var seen = {};
  var result = [];
  arr.forEach(function (item) {
    if (!seen[item]) {
      seen[item] = true;
      result.push(item);
    }
  });
  return result;
}

function setLogCell_(row, headerMap, headerName, value) {
  var col = headerMap[headerName];
  if (!col) {
    return;
  }
  row[col - 1] = value;
}
