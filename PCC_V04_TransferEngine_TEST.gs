/**
 * PCC_V04_TransferEngine_TEST.gs
 * PC_00_PROJECT_CONTROL_CENTER V0.4 – Gói 2B (TEST ONLY)
 *
 * Transfer Engine cho form V0.4. Chạy thủ công: runTransferEngineV04_TEST_ONLY()
 * Không sửa Gói 1, không sửa onOpen, không tạo trigger, không dùng getUi().
 *
 * File TEST: PC_00_PROJECT_CONTROL_CENTER_TEST_V0.4
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

var PCC_V04_TE_HEADER_ROW = 3;
var PCC_V04_TE_DATA_START_ROW = 4;
var PCC_V04_TE_ERROR_LOG_HEADER_ROW = 1;
var PCC_V04_TE_ERROR_LOG_DATA_START_ROW = 2;

var PCC_V04_TE_SHEET = {
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

var PCC_V04_TE_REVIEW_STATUS = {
  APPROVED_TO_TRANSFER: 'APPROVED_TO_TRANSFER',
  TRANSFERRED: 'TRANSFERRED',
  NEEDS_CLARIFICATION: 'NEEDS_CLARIFICATION'
};

var PCC_V04_TE_TRANSFER_MODE = {
  AUTO: 'AUTO',
  AUTO_RECOVERED: 'AUTO_RECOVERED',
  MANUAL_REQUIRED: 'MANUAL_REQUIRED'
};

var PCC_V04_TE_VALIDATION = {
  TRANSFER_OK: 'TRANSFER_OK',
  MISSING_APPROVED_TARGET: 'BLOCKED:MISSING_APPROVED_TARGET',
  FORBIDDEN_TARGET_SHEET: 'BLOCKED:FORBIDDEN_TARGET_SHEET',
  MISSING_TARGET_ID: 'BLOCKED:MISSING_TARGET_ID',
  TRANSFER_LOCK_WITHOUT_TARGET_ID: 'BLOCKED:TRANSFER_LOCK_WITHOUT_TARGET_ID',
  DECISION_MANUAL_ONLY: 'SKIPPED:DECISION_MANUAL_ONLY',
  CLASSIFY_REQUIRED: 'SKIPPED:CLASSIFY_REQUIRED',
  UPDATE_EXISTING_MANUAL: 'SKIPPED:UPDATE_EXISTING_MANUAL_V05',
  TARGET_WRITE_ERROR: 'BLOCKED:TARGET_WRITE_ERROR',
  MISSING_SHEET: 'BLOCKED:MISSING_SHEET'
};

var PCC_V04_TE_AUTO_TRANSFER_SHEETS = {
  '01_TASK': true,
  '02_DOCUMENT': true,
  '04_NOTEBOOKLM': true,
  '05_RISK': true,
  '06_IDEA': true
};

var PCC_V04_TE_FORBIDDEN_TARGETS = {
  '00_DASHBOARD': true,
  '03_DECISION_LOG': true
};

var PCC_V04_TE_ID_HEADER_BY_SHEET = {
  '01_TASK': 'Task ID',
  '02_DOCUMENT': 'Document ID',
  '04_NOTEBOOKLM': 'KB Update ID',
  '05_RISK': 'Risk ID',
  '06_IDEA': 'Idea ID'
};

var PCC_V04_TE_GATEWAY_WRITABLE = {
  'Review Status': true,
  'Created Target ID': true,
  'Transfer Mode': true,
  'Transfer Date': true,
  'Validation Result': true,
  'Remark': true
};

var PCC_V04_TE_RECOVER_REMARK =
  'Recovered existing target row, no duplicate append.';
var PCC_V04_TE_SUCCESS_REMARK =
  'Transferred by PCC V0.4 TEST Transfer Engine';

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

/**
 * Transfer Engine V0.4 TEST – chạy thủ công từ Apps Script Editor.
 */
function runTransferEngineV04_TEST_ONLY() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var gatewaySheet = ss.getSheetByName(PCC_V04_TE_SHEET.INPUT_GATEWAY);
  if (!gatewaySheet) {
    throw new Error('Thiếu sheet: ' + PCC_V04_TE_SHEET.INPUT_GATEWAY);
  }

  var gatewayHeaderMap = pccV04Te_getHeaderMap_(gatewaySheet, PCC_V04_TE_HEADER_ROW);
  if (!gatewayHeaderMap) {
    throw new Error('Không đọc được header 07_INPUT_GATEWAY');
  }

  var targetContext = pccV04Te_buildTargetContext_(ss);
  var lastRow = gatewaySheet.getLastRow();
  if (lastRow < PCC_V04_TE_DATA_START_ROW) {
    return;
  }

  var lastCol = gatewaySheet.getLastColumn();
  var values = gatewaySheet
    .getRange(PCC_V04_TE_DATA_START_ROW, 1, lastRow - PCC_V04_TE_DATA_START_ROW + 1, lastCol)
    .getValues();

  for (var i = 0; i < values.length; i++) {
    var rowNumber = PCC_V04_TE_DATA_START_ROW + i;
    var rowObject = pccV04Te_mapRowToObject_(values[i], gatewayHeaderMap);
    pccV04Te_processOneRow_(
      ss,
      gatewaySheet,
      gatewayHeaderMap,
      rowObject,
      rowNumber,
      targetContext
    );
  }
}

// ---------------------------------------------------------------------------
// Row processing
// ---------------------------------------------------------------------------

function pccV04Te_processOneRow_(
  ss,
  gatewaySheet,
  gatewayHeaderMap,
  rowObject,
  rowNumber,
  targetContext
) {
  if (pccV04Te_isBlank_(rowObject['Raw Input'])) {
    return;
  }

  var reviewStatus = pccV04Te_normalize_(rowObject['Review Status']);
  if (reviewStatus !== PCC_V04_TE_REVIEW_STATUS.APPROVED_TO_TRANSFER) {
    return;
  }

  var validationResult = pccV04Te_normalize_(rowObject['Validation Result']);
  if (pccV04Te_startsWithBlockedOrSkipped_(validationResult)) {
    return;
  }

  if (!pccV04Te_isBlank_(rowObject['Created Target ID'])) {
    return;
  }

  var skipResult = pccV04Te_checkSkipConditions_(rowObject);
  if (skipResult) {
    pccV04Te_applyGatewayResult_(
      ss,
      gatewaySheet,
      gatewayHeaderMap,
      rowObject,
      rowNumber,
      skipResult.updates,
      skipResult.validationResult,
      skipResult.logMessage,
      skipResult.logOnce
    );
    return;
  }

  var approvedSheet = pccV04Te_normalize_(rowObject['Target Sheet Approved']);
  if (pccV04Te_isBlank_(approvedSheet)) {
    pccV04Te_applyGatewayResult_(
      ss,
      gatewaySheet,
      gatewayHeaderMap,
      rowObject,
      rowNumber,
      {},
      PCC_V04_TE_VALIDATION.MISSING_APPROVED_TARGET,
      'Target Sheet Approved trống – không transfer',
      true
    );
    return;
  }

  if (PCC_V04_TE_FORBIDDEN_TARGETS[approvedSheet]) {
    var forbiddenCode =
      approvedSheet === PCC_V04_TE_SHEET.DASHBOARD
        ? PCC_V04_TE_VALIDATION.FORBIDDEN_TARGET_SHEET
        : PCC_V04_TE_VALIDATION.DECISION_MANUAL_ONLY;
    var forbiddenUpdates =
      approvedSheet === PCC_V04_TE_SHEET.DECISION_LOG
        ? { 'Transfer Mode': PCC_V04_TE_TRANSFER_MODE.MANUAL_REQUIRED }
        : {};
    pccV04Te_applyGatewayResult_(
      ss,
      gatewaySheet,
      gatewayHeaderMap,
      rowObject,
      rowNumber,
      forbiddenUpdates,
      forbiddenCode,
      'Sheet đích bị cấm auto-transfer: ' + approvedSheet,
      true
    );
    return;
  }

  if (!PCC_V04_TE_AUTO_TRANSFER_SHEETS[approvedSheet]) {
    pccV04Te_applyGatewayResult_(
      ss,
      gatewaySheet,
      gatewayHeaderMap,
      rowObject,
      rowNumber,
      {},
      PCC_V04_TE_VALIDATION.FORBIDDEN_TARGET_SHEET,
      'Target Sheet Approved không nằm trong danh sách auto-transfer',
      true
    );
    return;
  }

  var targetId = pccV04Te_normalize_(rowObject['Target ID Proposed']);
  if (pccV04Te_isBlank_(targetId)) {
    pccV04Te_applyGatewayResult_(
      ss,
      gatewaySheet,
      gatewayHeaderMap,
      rowObject,
      rowNumber,
      {},
      PCC_V04_TE_VALIDATION.MISSING_TARGET_ID,
      'Thiếu Target ID Proposed',
      true
    );
    return;
  }

  var transferDate = rowObject['Transfer Date'];
  var hasTransferDate = !pccV04Te_isBlank_(transferDate);
  var idExists = pccV04Te_idExistsInTarget_(
    approvedSheet,
    targetId,
    targetContext
  );

  if (idExists) {
    pccV04Te_applyRecover_(
      ss,
      gatewaySheet,
      gatewayHeaderMap,
      rowObject,
      rowNumber,
      targetId
    );
    return;
  }

  if (hasTransferDate) {
    pccV04Te_applyGatewayResult_(
      ss,
      gatewaySheet,
      gatewayHeaderMap,
      rowObject,
      rowNumber,
      {},
      PCC_V04_TE_VALIDATION.TRANSFER_LOCK_WITHOUT_TARGET_ID,
      'Transfer Date có nhưng Created Target ID trống và không tìm thấy ID trong sheet đích',
      true
    );
    return;
  }

  var now = new Date();
  pccV04Te_updateGatewayFields_(
    gatewaySheet,
    gatewayHeaderMap,
    rowNumber,
    { 'Transfer Date': now }
  );
  rowObject['Transfer Date'] = now;

  var appendResult = pccV04Te_appendToTargetSheet_(
    ss,
    approvedSheet,
    rowObject,
    targetContext,
    now
  );

  if (!appendResult.ok) {
    pccV04Te_applyGatewayResult_(
      ss,
      gatewaySheet,
      gatewayHeaderMap,
      rowObject,
      rowNumber,
      {},
      appendResult.validationResult,
      appendResult.message,
      true
    );
    return;
  }

  targetContext.idSets[approvedSheet][targetId] = true;

  pccV04Te_applyGatewayResult_(
    ss,
    gatewaySheet,
    gatewayHeaderMap,
    rowObject,
    rowNumber,
    {
      'Created Target ID': targetId,
      'Review Status': PCC_V04_TE_REVIEW_STATUS.TRANSFERRED,
      'Transfer Mode': PCC_V04_TE_TRANSFER_MODE.AUTO,
      'Remark': PCC_V04_TE_SUCCESS_REMARK
    },
    PCC_V04_TE_VALIDATION.TRANSFER_OK,
    '',
    false
  );
}

function pccV04Te_checkSkipConditions_(rowObject) {
  var inputType = pccV04Te_normalize_(rowObject['Input Type']);
  var requestedAction = pccV04Te_normalize_(rowObject['Requested Action']);
  var approvedSheet = pccV04Te_normalize_(rowObject['Target Sheet Approved']);

  if (
    inputType === 'DECISION' ||
    requestedAction === 'MANUAL_DECISION_LOG' ||
    approvedSheet === PCC_V04_TE_SHEET.DECISION_LOG
  ) {
    return {
      updates: { 'Transfer Mode': PCC_V04_TE_TRANSFER_MODE.MANUAL_REQUIRED },
      validationResult: PCC_V04_TE_VALIDATION.DECISION_MANUAL_ONLY,
      logMessage: 'Decision manual-only – không auto-append',
      logOnce: true
    };
  }

  if (inputType === 'UNKNOWN' || requestedAction === 'CLASSIFY_FOR_ME') {
    return {
      updates: {
        'Review Status': PCC_V04_TE_REVIEW_STATUS.NEEDS_CLARIFICATION
      },
      validationResult: PCC_V04_TE_VALIDATION.CLASSIFY_REQUIRED,
      logMessage: 'Cần phân loại thủ công trước khi transfer',
      logOnce: true
    };
  }

  if (requestedAction === 'UPDATE_EXISTING') {
    return {
      updates: { 'Transfer Mode': PCC_V04_TE_TRANSFER_MODE.MANUAL_REQUIRED },
      validationResult: PCC_V04_TE_VALIDATION.UPDATE_EXISTING_MANUAL,
      logMessage: 'UPDATE_EXISTING – V0.4 không auto-update sheet đích',
      logOnce: true
    };
  }

  return null;
}

function pccV04Te_applyRecover_(
  ss,
  gatewaySheet,
  gatewayHeaderMap,
  rowObject,
  rowNumber,
  targetId
) {
  pccV04Te_applyGatewayResult_(
    ss,
    gatewaySheet,
    gatewayHeaderMap,
    rowObject,
    rowNumber,
    {
      'Created Target ID': targetId,
      'Review Status': PCC_V04_TE_REVIEW_STATUS.TRANSFERRED,
      'Transfer Mode': PCC_V04_TE_TRANSFER_MODE.AUTO_RECOVERED,
      'Remark': PCC_V04_TE_RECOVER_REMARK
    },
    PCC_V04_TE_VALIDATION.TRANSFER_OK,
    '',
    false
  );
}

function pccV04Te_applyGatewayResult_(
  ss,
  gatewaySheet,
  gatewayHeaderMap,
  rowObject,
  rowNumber,
  fieldUpdates,
  validationResult,
  logMessage,
  shouldLog
) {
  var updates = fieldUpdates || {};
  updates['Validation Result'] = validationResult;

  pccV04Te_updateGatewayFields_(
    gatewaySheet,
    gatewayHeaderMap,
    rowNumber,
    updates
  );

  if (
    shouldLog &&
    logMessage &&
    !pccV04Te_startsWithBlockedOrSkipped_(pccV04Te_normalize_(rowObject['Validation Result']))
  ) {
    pccV04Te_logError_(
      ss,
      validationResult,
      logMessage,
      {
        sheetName: PCC_V04_TE_SHEET.INPUT_GATEWAY,
        rowNumber: rowNumber,
        fieldName: 'Validation Result',
        idValue: pccV04Te_normalize_(rowObject['Gateway ID']),
        severity: pccV04Te_startsWithBlocked_(validationResult) ? 'ERROR' : 'WARNING',
        suggestedAction: 'Kiểm tra dữ liệu gateway trước khi transfer lại'
      }
    );
  }
}

// ---------------------------------------------------------------------------
// Append to target sheet
// ---------------------------------------------------------------------------

function pccV04Te_appendToTargetSheet_(ss, sheetName, rowObject, targetContext, now) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return {
      ok: false,
      validationResult: PCC_V04_TE_VALIDATION.MISSING_SHEET,
      message: 'Không tìm thấy sheet: ' + sheetName
    };
  }

  var headerMap = targetContext.headerMaps[sheetName];
  if (!headerMap) {
    return {
      ok: false,
      validationResult: PCC_V04_TE_VALIDATION.TARGET_WRITE_ERROR,
      message: 'Không đọc được header sheet đích: ' + sheetName
    };
  }

  var mappings = pccV04Te_getMappingsForSheet_(sheetName, rowObject, now);
  var lastCol = sheet.getLastColumn();
  var rowValues = [];
  for (var c = 0; c < lastCol; c++) {
    rowValues.push('');
  }

  for (var m = 0; m < mappings.length; m++) {
    var mapping = mappings[m];
    var targetCol = headerMap[mapping.targetHeader];
    if (!targetCol) {
      continue;
    }
    var value = mapping.value;
    if (value === undefined || value === null) {
      value = '';
    }
    rowValues[targetCol - 1] = value;
  }

  try {
    var nextRow = Math.max(sheet.getLastRow() + 1, PCC_V04_TE_DATA_START_ROW);
    sheet.getRange(nextRow, 1, 1, lastCol).setValues([rowValues]);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      validationResult: PCC_V04_TE_VALIDATION.TARGET_WRITE_ERROR,
      message: String(err && err.message ? err.message : err)
    };
  }
}

function pccV04Te_getMappingsForSheet_(sheetName, rowObject, now) {
  var titleOrRaw = pccV04Te_firstNonBlank_(
    rowObject['Target Object Name / Title'],
    rowObject['Raw Input']
  );
  var relatedDoc = pccV04Te_normalize_(rowObject['Related Document ID']);
  var targetId = pccV04Te_normalize_(rowObject['Target ID Proposed']);

  if (sheetName === PCC_V04_TE_SHEET.TASK) {
    return [
      { targetHeader: 'Task ID', value: targetId },
      { targetHeader: 'Task Name', value: rowObject['Raw Input'] },
      { targetHeader: 'Priority', value: rowObject['Priority'] },
      { targetHeader: 'Status', value: 'Open' },
      { targetHeader: 'Owner', value: rowObject['Owner'] },
      { targetHeader: 'Due Date', value: rowObject['Due Date'] },
      { targetHeader: 'Related Document', value: relatedDoc },
      { targetHeader: 'Source', value: rowObject['Source / Link'] },
      { targetHeader: 'Remark', value: rowObject['Remark'] },
      { targetHeader: 'Last Update', value: now }
    ];
  }

  if (sheetName === PCC_V04_TE_SHEET.DOCUMENT) {
    return [
      { targetHeader: 'Document ID', value: targetId },
      { targetHeader: 'Document Name', value: titleOrRaw },
      { targetHeader: 'Drive Link', value: rowObject['Source / Link'] },
      { targetHeader: 'Document Status', value: 'Need Update' },
      { targetHeader: 'Owner', value: rowObject['Owner'] },
      { targetHeader: 'Related Task ID', value: rowObject['Related Task ID'] },
      { targetHeader: 'Remark', value: rowObject['Remark'] },
      { targetHeader: 'Last Update', value: now }
    ];
  }

  if (sheetName === PCC_V04_TE_SHEET.NOTEBOOKLM) {
    var docId = pccV04Te_firstNonBlank_(relatedDoc, targetId);
    return [
      { targetHeader: 'KB Update ID', value: targetId },
      { targetHeader: 'Document ID', value: docId },
      { targetHeader: 'Source Document ID', value: relatedDoc },
      { targetHeader: 'Source Name', value: titleOrRaw },
      { targetHeader: 'Source Type', value: rowObject['Source Type'] },
      { targetHeader: 'Drive Link', value: rowObject['Source / Link'] },
      { targetHeader: 'NotebookLM Status', value: 'Need Update' },
      { targetHeader: 'Update Type', value: rowObject['Requested Action'] },
      { targetHeader: 'Related Task ID', value: rowObject['Related Task ID'] },
      { targetHeader: 'Related Decision ID', value: rowObject['Related Decision ID'] },
      { targetHeader: 'Remark', value: rowObject['Remark'] },
      { targetHeader: 'Last Update', value: now }
    ];
  }

  if (sheetName === PCC_V04_TE_SHEET.RISK) {
    return [
      { targetHeader: 'Risk ID', value: targetId },
      { targetHeader: 'Risk Title', value: rowObject['Raw Input'] },
      { targetHeader: 'Risk Detail', value: rowObject['Raw Input'] },
      { targetHeader: 'Risk Level', value: rowObject['Risk Level'] },
      { targetHeader: 'Owner', value: rowObject['Owner'] },
      { targetHeader: 'Mitigation Action', value: rowObject['Risk Action'] },
      { targetHeader: 'Related Document', value: relatedDoc },
      { targetHeader: 'Related Task ID', value: rowObject['Related Task ID'] },
      { targetHeader: 'Remark', value: rowObject['Remark'] },
      { targetHeader: 'Last Update', value: now }
    ];
  }

  if (sheetName === PCC_V04_TE_SHEET.IDEA) {
    return [
      { targetHeader: 'Idea ID', value: targetId },
      { targetHeader: 'Idea Title', value: rowObject['Raw Input'] },
      { targetHeader: 'Idea Detail', value: rowObject['Raw Input'] },
      { targetHeader: 'Priority', value: rowObject['Priority'] },
      { targetHeader: 'Owner', value: rowObject['Owner'] },
      { targetHeader: 'Source', value: rowObject['Source / Link'] },
      { targetHeader: 'Related Document', value: relatedDoc },
      { targetHeader: 'Related Task ID', value: rowObject['Related Task ID'] },
      { targetHeader: 'Remark', value: rowObject['Remark'] }
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Target context / duplicate check
// ---------------------------------------------------------------------------

function pccV04Te_buildTargetContext_(ss) {
  var context = {
    headerMaps: {},
    idSets: {}
  };

  var sheetNames = Object.keys(PCC_V04_TE_AUTO_TRANSFER_SHEETS);
  for (var i = 0; i < sheetNames.length; i++) {
    var sheetName = sheetNames[i];
    var sheet = ss.getSheetByName(sheetName);
    context.idSets[sheetName] = {};

    if (!sheet) {
      continue;
    }

    var headerMap = pccV04Te_getHeaderMap_(sheet, PCC_V04_TE_HEADER_ROW);
    context.headerMaps[sheetName] = headerMap;
    if (!headerMap) {
      continue;
    }

    var idHeader = PCC_V04_TE_ID_HEADER_BY_SHEET[sheetName];
    var idCol = headerMap[idHeader];
    if (!idCol) {
      continue;
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < PCC_V04_TE_DATA_START_ROW) {
      continue;
    }

    var idValues = sheet
      .getRange(PCC_V04_TE_DATA_START_ROW, idCol, lastRow - PCC_V04_TE_DATA_START_ROW + 1, 1)
      .getValues();

    for (var r = 0; r < idValues.length; r++) {
      var id = pccV04Te_normalize_(idValues[r][0]);
      if (!pccV04Te_isBlank_(id)) {
        context.idSets[sheetName][id] = true;
      }
    }
  }

  return context;
}

function pccV04Te_idExistsInTarget_(sheetName, targetId, targetContext) {
  if (!targetContext.idSets[sheetName]) {
    return false;
  }
  return !!targetContext.idSets[sheetName][targetId];
}

// ---------------------------------------------------------------------------
// Gateway update / error log
// ---------------------------------------------------------------------------

function pccV04Te_updateGatewayFields_(gatewaySheet, headerMap, rowNumber, updates) {
  var keys = Object.keys(updates);
  for (var i = 0; i < keys.length; i++) {
    var header = keys[i];
    if (!PCC_V04_TE_GATEWAY_WRITABLE[header]) {
      continue;
    }
    var col = headerMap[header];
    if (!col) {
      continue;
    }
    gatewaySheet.getRange(rowNumber, col).setValue(updates[header]);
  }
}

function pccV04Te_logError_(ss, errorCode, message, context) {
  context = context || {};
  var errorSheet = ss.getSheetByName(PCC_V04_TE_SHEET.ERROR_LOG);
  if (!errorSheet) {
    Logger.log('[PCC_V04_TE][' + errorCode + '] ' + message);
    return;
  }

  var headerMap = pccV04Te_getHeaderMap_(errorSheet, PCC_V04_TE_ERROR_LOG_HEADER_ROW);
  if (!headerMap) {
    Logger.log('[PCC_V04_TE][' + errorCode + '] ' + message);
    return;
  }

  var row = [];
  var maxCol = errorSheet.getLastColumn();
  for (var i = 0; i < maxCol; i++) {
    row.push('');
  }

  pccV04Te_setByHeader_(row, headerMap, 'Run Time', new Date());
  pccV04Te_setByHeader_(row, headerMap, 'Sheet Name', context.sheetName || '');
  pccV04Te_setByHeader_(row, headerMap, 'Row Number', context.rowNumber || '');
  pccV04Te_setByHeader_(row, headerMap, 'Field Name', context.fieldName || '');
  pccV04Te_setByHeader_(row, headerMap, 'ID Value', context.idValue || '');
  pccV04Te_setByHeader_(row, headerMap, 'Error Type', errorCode);
  pccV04Te_setByHeader_(row, headerMap, 'Severity', context.severity || 'ERROR');
  pccV04Te_setByHeader_(row, headerMap, 'Message', message || '');
  pccV04Te_setByHeader_(
    row,
    headerMap,
    'Suggested Action',
    context.suggestedAction || ''
  );

  var nextRow = Math.max(errorSheet.getLastRow() + 1, PCC_V04_TE_ERROR_LOG_DATA_START_ROW);
  errorSheet.getRange(nextRow, 1, 1, maxCol).setValues([row]);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pccV04Te_getHeaderMap_(sheet, headerRow) {
  if (!sheet) {
    return null;
  }
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    return null;
  }
  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var name = pccV04Te_normalize_(headers[i]);
    if (!pccV04Te_isBlank_(name)) {
      map[name] = i + 1;
    }
  }
  return Object.keys(map).length > 0 ? map : null;
}

function pccV04Te_mapRowToObject_(rowArray, headerMap) {
  var obj = {};
  var headers = Object.keys(headerMap);
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    obj[h] = rowArray[headerMap[h] - 1];
  }
  return obj;
}

function pccV04Te_setByHeader_(rowArray, headerMap, headerName, value) {
  var col = headerMap[headerName];
  if (!col) {
    return;
  }
  rowArray[col - 1] = value;
}

function pccV04Te_normalize_(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value;
  }
  return String(value).trim();
}

function pccV04Te_isBlank_(value) {
  return pccV04Te_normalize_(value) === '';
}

function pccV04Te_firstNonBlank_(primary, fallback) {
  var a = pccV04Te_normalize_(primary);
  if (!pccV04Te_isBlank_(a)) {
    return a;
  }
  return pccV04Te_normalize_(fallback);
}

function pccV04Te_startsWithBlockedOrSkipped_(value) {
  return (
    pccV04Te_startsWithBlocked_(value) ||
    pccV04Te_startsWithSkipped_(value)
  );
}

function pccV04Te_startsWithBlocked_(value) {
  return String(value).indexOf('BLOCKED:') === 0;
}

function pccV04Te_startsWithSkipped_(value) {
  return String(value).indexOf('SKIPPED:') === 0;
}
