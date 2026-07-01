/**
 * PCC_V04_FormDashboard_TEST.gs
 * PC_00_PROJECT_CONTROL_CENTER V0.4 – Gói 1 (TEST ONLY)
 *
 * Chuẩn hóa Form UX trong 07_INPUT_GATEWAY và Dashboard công thức trong 00_DASHBOARD.
 * Không chạy transfer, không append dữ liệu sang sheet đích.
 *
 * NGUYÊN TẮC AN TOÀN:
 * - Giữ nguyên header/cột V0.3 hiện có (gồm Gateway ID col 1).
 * - Sau setup: 34 header = 29 legacy V0.3 + 5 cột V0.4 append.
 * - Chỉ APPEND các cột V0.4 còn thiếu vào cuối – không ghi đè header cũ.
 * - Không đổi vị trí cột → dữ liệu row 4+ không bị lệch.
 * - Zone màu + dropdown + dashboard lookup theo TÊN header, không hardcode cột.
 *
 * Chạy thủ công: pccV04_setupFormAndDashboard_TEST_ONLY()
 * File TEST: PC_00_PROJECT_CONTROL_CENTER_TEST_V0.4
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

var PCC_V04_HEADER_ROW = 3;
var PCC_V04_DATA_START_ROW = 4;
var PCC_V04_VALIDATION_LAST_ROW = 1000;

var PCC_V04_SHEET = {
  DASHBOARD: '00_DASHBOARD',
  INPUT_GATEWAY: '07_INPUT_GATEWAY'
};

/** Cột legacy V0.3 – KHÔNG ghi đè, chỉ dùng để kiểm tra. */
var PCC_V04_LEGACY_REQUIRED_HEADERS = [
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

/** Cột V0.4 mới – chỉ append nếu chưa có. */
var PCC_V04_NEW_HEADERS_TO_APPEND = [
  'Requested Action',
  'Source Type',
  'Source / Link',
  'Existing Target ID',
  'Target Object Name / Title'
];

var PCC_V04_ZONE_A_HEADERS = [
  'Input Date',
  'Input By',
  'Raw Input',
  'Input Type',
  'Requested Action',
  'Source Type',
  'Source / Link',
  'Priority',
  'Owner',
  'Due Date',
  'Remark'
];

var PCC_V04_ZONE_B_HEADERS = [
  'Related Document ID',
  'Related Task ID',
  'Related Decision ID',
  'Existing Target ID',
  'Target Object Name / Title'
];

var PCC_V04_ZONE_C_HEADERS = [
  'Gateway ID',
  'Target Sheet Proposed',
  'Target Sheet Approved',
  'Target ID Proposed',
  'Risk Level',
  'Risk Action',
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
  'Last Update'
];

var PCC_V04_COLORS = {
  ZONE_A: '#FFFFFF',
  ZONE_B: '#FFFEF5',
  ZONE_C: '#F3F3F3'
};

var PCC_V04_HIDDEN_HEADERS = [
  'Reviewer',
  'Review Date',
  'Clarification Needed',
  'Rejected Reason',
  'Last Update'
];

var PCC_V04_DROPDOWN = {
  INPUT_TYPE: [
    'TASK',
    'DOCUMENT',
    'DECISION',
    'NOTEBOOKLM',
    'RISK',
    'IDEA',
    'UNKNOWN'
  ],
  REQUESTED_ACTION: [
    'CREATE_NEW',
    'UPDATE_EXISTING',
    'REVIEW_ONLY',
    'REGISTER_SOURCE',
    'MANUAL_DECISION_LOG',
    'CLASSIFY_FOR_ME'
  ],
  SOURCE_TYPE: [
    'MANUAL_INPUT',
    'CHATGPT',
    'CLAUDE',
    'CURSOR',
    'GOOGLE_DRIVE',
    'NOTEBOOKLM',
    'GOOGLE_SHEET',
    'GOOGLE_DOC',
    'EMAIL',
    'ZALO',
    'OTHER'
  ],
  PRIORITY: ['Low', 'Medium', 'High', 'Critical'],
  REVIEW_STATUS: [
    'NEW',
    'CLASSIFIED',
    'PENDING_REVIEW',
    'NEEDS_CLARIFICATION',
    'APPROVED_TO_TRANSFER',
    'REJECTED',
    'TRANSFERRED'
  ],
  TARGET_SHEET_APPROVED: [
    '01_TASK',
    '02_DOCUMENT',
    '03_DECISION_LOG',
    '04_NOTEBOOKLM',
    '05_RISK',
    '06_IDEA'
  ]
};

var PCC_V04_DASHBOARD_START_ROW = 4;
var PCC_V04_DASHBOARD_LABEL_COL = 1;
var PCC_V04_DASHBOARD_VALUE_COL = 2;

// ---------------------------------------------------------------------------
// Main entry (TEST ONLY – chạy thủ công)
// ---------------------------------------------------------------------------

/**
 * Setup Form UX 07_INPUT_GATEWAY + công thức Dashboard 00_DASHBOARD.
 * Chỉ dùng cho file TEST. Không tạo trigger.
 */
function pccV04_setupFormAndDashboard_TEST_ONLY() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  var gatewaySheet = ss.getSheetByName(PCC_V04_SHEET.INPUT_GATEWAY);
  if (!gatewaySheet) {
    throw new Error('Thiếu sheet: ' + PCC_V04_SHEET.INPUT_GATEWAY);
  }

  var dashboardSheet = ss.getSheetByName(PCC_V04_SHEET.DASHBOARD);
  if (!dashboardSheet) {
    throw new Error('Thiếu sheet: ' + PCC_V04_SHEET.DASHBOARD);
  }

  var warnings = [];

  var legacyCheck = pccV04_verifyLegacyHeaders_(gatewaySheet);
  if (legacyCheck.missing.length > 0) {
    warnings.push(
      'Thiếu header legacy: ' + legacyCheck.missing.join(', ')
    );
  }

  var appendResult = pccV04_appendMissingHeaders_(gatewaySheet);
  if (appendResult.appended.length > 0) {
    warnings.push(
      'Đã append cột mới: ' + appendResult.appended.join(', ')
    );
  } else {
    warnings.push('Không có cột mới cần append (đã đủ V0.4).');
  }

  var headerMap = appendResult.headerMap;
  pccV04_styleHeaderRow_(gatewaySheet, headerMap);
  pccV04_applyInputGatewayZones_(gatewaySheet, headerMap);
  pccV04_applyInputGatewayDropdowns_(gatewaySheet, headerMap);
  pccV04_hideTechnicalColumns_(gatewaySheet, headerMap);
  pccV04_finalizeInputGatewayLayout_(gatewaySheet, headerMap);
  pccV04_setupDashboardFormulas_(dashboardSheet, gatewaySheet, headerMap);

  var msg =
    'Đã hoàn tất Gói 1 (TEST):\n' +
    '• Giữ nguyên header/cột V0.3 (gồm Gateway ID)\n' +
    '• Tổng 34 header (29 legacy + 5 V0.4 append)\n' +
    '• Chỉ append cột V0.4 còn thiếu\n' +
    '• Phân vùng A/B/C theo tên header\n' +
    '• Dropdown + ẩn cột kỹ thuật\n' +
    '• 8 chỉ số Dashboard bằng công thức\n\n' +
    'Không append dữ liệu sang sheet đích.\n\n';

  if (warnings.length > 0) {
    msg += 'Ghi chú:\n- ' + warnings.join('\n- ');
  }

  ui.alert('PCC V0.4 Gói 1 (TEST)', msg, ui.ButtonSet.OK);
}

// ---------------------------------------------------------------------------
// 07_INPUT_GATEWAY – Header an toàn (append only)
// ---------------------------------------------------------------------------

function pccV04_verifyLegacyHeaders_(sheet) {
  var headerMap = pccV04_getHeaderMap_(sheet, PCC_V04_HEADER_ROW);
  var missing = [];

  for (var i = 0; i < PCC_V04_LEGACY_REQUIRED_HEADERS.length; i++) {
    var name = PCC_V04_LEGACY_REQUIRED_HEADERS[i];
    if (!headerMap[name]) {
      missing.push(name);
    }
  }

  return { headerMap: headerMap, missing: missing };
}

function pccV04_appendMissingHeaders_(sheet) {
  var headerRow = PCC_V04_HEADER_ROW;
  var headerMap = pccV04_getHeaderMap_(sheet, headerRow);
  var lastUsedCol = pccV04_getLastHeaderColumn_(sheet, headerRow);
  var appended = [];

  for (var i = 0; i < PCC_V04_NEW_HEADERS_TO_APPEND.length; i++) {
    var name = PCC_V04_NEW_HEADERS_TO_APPEND[i];
    if (!headerMap[name]) {
      lastUsedCol++;
      sheet.getRange(headerRow, lastUsedCol).setValue(name);
      headerMap[name] = lastUsedCol;
      appended.push(name);
    }
  }

  return {
    headerMap: pccV04_getHeaderMap_(sheet, headerRow),
    appended: appended
  };
}

function pccV04_getLastHeaderColumn_(sheet, headerRow) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  var lastUsed = 0;

  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i] || '').trim()) {
      lastUsed = i + 1;
    }
  }

  return lastUsed;
}

function pccV04_styleHeaderRow_(sheet, headerMap) {
  var cols = pccV04_getSortedColumns_(headerMap);
  if (cols.length === 0) {
    return;
  }

  var minCol = cols[0];
  var maxCol = cols[cols.length - 1];
  sheet
    .getRange(PCC_V04_HEADER_ROW, minCol, 1, maxCol - minCol + 1)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
}

function pccV04_applyInputGatewayZones_(sheet, headerMap) {
  var dataRows = PCC_V04_VALIDATION_LAST_ROW - PCC_V04_DATA_START_ROW + 1;
  var headers = Object.keys(headerMap);

  for (var i = 0; i < headers.length; i++) {
    var headerName = headers[i];
    var col = headerMap[headerName];
    var zone = pccV04_getZoneForHeader_(headerName);
    var color = PCC_V04_COLORS['ZONE_' + zone];

    sheet
      .getRange(PCC_V04_DATA_START_ROW, col, dataRows, 1)
      .setBackground(color);
    sheet.getRange(PCC_V04_HEADER_ROW, col).setBackground(color);
  }
}

function pccV04_getZoneForHeader_(headerName) {
  if (pccV04_arrayContains_(PCC_V04_ZONE_A_HEADERS, headerName)) {
    return 'A';
  }
  if (pccV04_arrayContains_(PCC_V04_ZONE_B_HEADERS, headerName)) {
    return 'B';
  }
  return 'C';
}

function pccV04_applyInputGatewayDropdowns_(sheet, headerMap) {
  var dataRows = PCC_V04_VALIDATION_LAST_ROW - PCC_V04_DATA_START_ROW + 1;

  pccV04_setDropdownIfExists_(
    sheet,
    headerMap,
    'Input Type',
    PCC_V04_DROPDOWN.INPUT_TYPE,
    dataRows
  );
  pccV04_setDropdownIfExists_(
    sheet,
    headerMap,
    'Requested Action',
    PCC_V04_DROPDOWN.REQUESTED_ACTION,
    dataRows
  );
  pccV04_setDropdownIfExists_(
    sheet,
    headerMap,
    'Source Type',
    PCC_V04_DROPDOWN.SOURCE_TYPE,
    dataRows
  );
  pccV04_setDropdownIfExists_(
    sheet,
    headerMap,
    'Priority',
    PCC_V04_DROPDOWN.PRIORITY,
    dataRows
  );
  pccV04_setDropdownIfExists_(
    sheet,
    headerMap,
    'Review Status',
    PCC_V04_DROPDOWN.REVIEW_STATUS,
    dataRows
  );
  pccV04_setDropdownIfExists_(
    sheet,
    headerMap,
    'Target Sheet Approved',
    PCC_V04_DROPDOWN.TARGET_SHEET_APPROVED,
    dataRows
  );
}

function pccV04_hideTechnicalColumns_(sheet, headerMap) {
  var cols = pccV04_getSortedColumns_(headerMap);
  if (cols.length > 0) {
    sheet.showColumns(cols[0], cols[cols.length - 1] - cols[0] + 1);
  }

  for (var i = 0; i < PCC_V04_HIDDEN_HEADERS.length; i++) {
    var headerName = PCC_V04_HIDDEN_HEADERS[i];
    var col = headerMap[headerName];
    if (col) {
      sheet.hideColumns(col);
    }
  }
}

function pccV04_finalizeInputGatewayLayout_(sheet, headerMap) {
  sheet.setFrozenRows(PCC_V04_HEADER_ROW);

  var widthByHeader = {
    'Gateway ID': 90,
    'Input Date': 100,
    'Input By': 110,
    'Raw Input': 280,
    'Input Type': 120,
    'Requested Action': 150,
    'Source Type': 120,
    'Source / Link': 180,
    'Priority': 90,
    'Owner': 110,
    'Due Date': 100,
    'Remark': 180,
    'Related Document ID': 140,
    'Related Task ID': 120,
    'Related Decision ID': 140,
    'Existing Target ID': 140,
    'Target Object Name / Title': 200,
    'Target Sheet Proposed': 150,
    'Target Sheet Approved': 150,
    'Target ID Proposed': 140,
    'Risk Level': 90,
    'Risk Action': 120,
    'Review Status': 140,
    'Validation Result': 180
  };

  var headers = Object.keys(headerMap);
  for (var i = 0; i < headers.length; i++) {
    var name = headers[i];
    if (widthByHeader[name]) {
      sheet.setColumnWidth(headerMap[name], widthByHeader[name]);
    }
  }
}

// ---------------------------------------------------------------------------
// 00_DASHBOARD – 8 chỉ số bằng công thức (lookup theo tên header)
// ---------------------------------------------------------------------------

function pccV04_setupDashboardFormulas_(dashboardSheet, gatewaySheet, headerMap) {
  var gw = "'" + PCC_V04_SHEET.INPUT_GATEWAY + "'";
  var dataStart = PCC_V04_DATA_START_ROW;

  var requiredForDashboard = [
    'Raw Input',
    'Input Type',
    'Review Status',
    'Validation Result'
  ];
  for (var r = 0; r < requiredForDashboard.length; r++) {
    if (!headerMap[requiredForDashboard[r]]) {
      throw new Error(
        'Thiếu header cho Dashboard: ' + requiredForDashboard[r]
      );
    }
  }

  var colRaw = pccV04_colRef_(gw, headerMap['Raw Input'], dataStart);
  var colInputType = pccV04_colRef_(gw, headerMap['Input Type'], dataStart);
  var colReview = pccV04_colRef_(gw, headerMap['Review Status'], dataStart);
  var colValidation = pccV04_colRef_(
    gw,
    headerMap['Validation Result'],
    dataStart
  );

  var metrics = [
    {
      label: '1. Tổng input',
      formula: '=COUNTIF(' + colRaw + ',"<>")',
      note: 'Đếm dòng có Raw Input'
    },
    {
      label: '2. Input mới',
      formula:
        '=COUNTIFS(' +
        colRaw +
        ',"<>",' +
        colReview +
        ',"NEW")+COUNTIFS(' +
        colRaw +
        ',"<>",' +
        colReview +
        ',"CLASSIFIED")',
      note: 'Review Status = NEW hoặc CLASSIFIED'
    },
    {
      label: '3. Đang chờ duyệt',
      formula:
        '=COUNTIFS(' + colRaw + ',"<>",' + colReview + ',"PENDING_REVIEW")',
      note: 'Review Status = PENDING_REVIEW'
    },
    {
      label: '4. Đã chuyển thành công',
      formula:
        '=COUNTIFS(' + colRaw + ',"<>",' + colReview + ',"TRANSFERRED")',
      note: 'Review Status = TRANSFERRED'
    },
    {
      label: '5. Lỗi/cần bổ sung',
      formula:
        '=IFERROR(COUNTA(FILTER(' +
        colRaw +
        ',(' +
        colRaw +
        '<>"")*(' +
        '(' +
        colReview +
        '="NEEDS_CLARIFICATION")+(REGEXMATCH(TO_TEXT(' +
        colValidation +
        '),"^BLOCKED"))' +
        '))),0)',
      note:
        'NEEDS_CLARIFICATION hoặc Validation Result bắt đầu bằng BLOCKED'
    },
    {
      label: '6. Cần Lâm xử lý',
      formula:
        '=COUNTIFS(' +
        colRaw +
        ',"<>",' +
        colReview +
        ',"PENDING_REVIEW")+COUNTIFS(' +
        colRaw +
        ',"<>",' +
        colReview +
        ',"NEEDS_CLARIFICATION")+COUNTIFS(' +
        colRaw +
        ',"<>",' +
        colReview +
        ',"REJECTED")',
      note: 'PENDING_REVIEW, NEEDS_CLARIFICATION hoặc REJECTED'
    },
    {
      label: '7. Bị chặn do validation',
      formula: '=COUNTIFS(' + colValidation + ',"BLOCKED*")',
      note: 'Validation Result bắt đầu bằng BLOCKED'
    },
    {
      label: '8. Decision đang chờ ghi tay',
      formula:
        '=COUNTIFS(' +
        colRaw +
        ',"<>",' +
        colInputType +
        ',"DECISION",' +
        colReview +
        ',"<>TRANSFERRED")',
      note: 'Input Type = DECISION và Review Status khác TRANSFERRED'
    }
  ];

  var titleRow = PCC_V04_DASHBOARD_START_ROW - 1;
  dashboardSheet
    .getRange(titleRow, PCC_V04_DASHBOARD_LABEL_COL)
    .setValue('PCC V0.4 – Input Gateway Dashboard (Gói 1)')
    .setFontWeight('bold')
    .setFontSize(12);

  dashboardSheet
    .getRange(
      PCC_V04_DASHBOARD_START_ROW,
      PCC_V04_DASHBOARD_LABEL_COL,
      1,
      3
    )
    .setValues([['Chỉ số', 'Giá trị', 'Ghi chú']])
    .setFontWeight('bold')
    .setBackground('#E8EEF7');

  for (var i = 0; i < metrics.length; i++) {
    var row = PCC_V04_DASHBOARD_START_ROW + 1 + i;
    dashboardSheet
      .getRange(row, PCC_V04_DASHBOARD_LABEL_COL)
      .setValue(metrics[i].label);
    dashboardSheet
      .getRange(row, PCC_V04_DASHBOARD_VALUE_COL)
      .setFormula(metrics[i].formula);
    dashboardSheet.getRange(row, 3).setValue(metrics[i].note);
  }

  dashboardSheet.setColumnWidth(PCC_V04_DASHBOARD_LABEL_COL, 260);
  dashboardSheet.setColumnWidth(PCC_V04_DASHBOARD_VALUE_COL, 90);
  dashboardSheet.setColumnWidth(3, 360);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pccV04_getHeaderMap_(sheet, headerRow) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  var map = {};

  for (var i = 0; i < headers.length; i++) {
    var name = String(headers[i] || '').trim();
    if (name) {
      map[name] = i + 1;
    }
  }

  return map;
}

function pccV04_getSortedColumns_(headerMap) {
  var cols = [];
  var headers = Object.keys(headerMap);
  for (var i = 0; i < headers.length; i++) {
    cols.push(headerMap[headers[i]]);
  }
  cols.sort(function (a, b) {
    return a - b;
  });
  return cols;
}

function pccV04_colLetter_(column) {
  var letter = '';
  while (column > 0) {
    var mod = (column - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    column = Math.floor((column - 1) / 26);
  }
  return letter;
}

function pccV04_colRef_(sheetName, colIndex, dataStartRow) {
  var letter = pccV04_colLetter_(colIndex);
  return sheetName + '!' + letter + dataStartRow + ':' + letter;
}

function pccV04_setDropdownIfExists_(
  sheet,
  headerMap,
  headerName,
  values,
  numRows
) {
  var col = headerMap[headerName];
  if (!col) {
    return;
  }

  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();

  sheet
    .getRange(PCC_V04_DATA_START_ROW, col, numRows, 1)
    .setDataValidation(rule);
}

function pccV04_arrayContains_(arr, value) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] === value) {
      return true;
    }
  }
  return false;
}
