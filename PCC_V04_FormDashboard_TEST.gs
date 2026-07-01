/**
 * PCC_V04_FormDashboard_TEST.gs
 * PC_00_PROJECT_CONTROL_CENTER V0.4 – Gói 1 (TEST ONLY)
 *
 * Chuẩn hóa Form UX trong 07_INPUT_GATEWAY và Dashboard công thức trong 00_DASHBOARD.
 * Không chạy transfer, không append dữ liệu sang sheet đích.
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

var PCC_V04_GATEWAY_HEADERS = [
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
  'Remark',
  'Related Document ID',
  'Related Task ID',
  'Related Decision ID',
  'Existing Target ID',
  'Target Object Name / Title',
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

var PCC_V04_ZONE_A_END = 11;
var PCC_V04_ZONE_B_END = 16;
var PCC_V04_TOTAL_COLS = 33;

var PCC_V04_COLORS = {
  ZONE_A: '#FFFFFF',
  ZONE_B: '#FFFEF5',
  ZONE_C: '#F3F3F3',
  HEADER: '#D9D9D9'
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

  pccV04_setupInputGatewayHeaders_(gatewaySheet);
  pccV04_applyInputGatewayZones_(gatewaySheet);
  pccV04_applyInputGatewayDropdowns_(gatewaySheet);
  pccV04_hideTechnicalColumns_(gatewaySheet);
  pccV04_finalizeInputGatewayLayout_(gatewaySheet);
  pccV04_setupDashboardFormulas_(dashboardSheet);

  ui.alert(
    'PCC V0.4 Gói 1 (TEST)',
    'Đã hoàn tất:\n' +
      '• Header + phân vùng A/B/C trên 07_INPUT_GATEWAY\n' +
      '• Dropdown validation\n' +
      '• Ẩn cột kỹ thuật\n' +
      '• 8 chỉ số Dashboard bằng công thức\n\n' +
      'Không có dữ liệu nào bị append sang sheet đích.',
    ui.ButtonSet.OK
  );
}

// ---------------------------------------------------------------------------
// 07_INPUT_GATEWAY – Header & zones
// ---------------------------------------------------------------------------

function pccV04_setupInputGatewayHeaders_(sheet) {
  var headerRange = sheet.getRange(
    PCC_V04_HEADER_ROW,
    1,
    1,
    PCC_V04_TOTAL_COLS
  );
  headerRange.setValues([PCC_V04_GATEWAY_HEADERS]);
  headerRange
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
}

function pccV04_applyInputGatewayZones_(sheet) {
  var dataRows = PCC_V04_VALIDATION_LAST_ROW - PCC_V04_DATA_START_ROW + 1;

  var zoneARange = sheet.getRange(
    PCC_V04_DATA_START_ROW,
    1,
    dataRows,
    PCC_V04_ZONE_A_END
  );
  zoneARange.setBackground(PCC_V04_COLORS.ZONE_A);

  var zoneBRange = sheet.getRange(
    PCC_V04_DATA_START_ROW,
    PCC_V04_ZONE_A_END + 1,
    dataRows,
    PCC_V04_ZONE_B_END - PCC_V04_ZONE_A_END
  );
  zoneBRange.setBackground(PCC_V04_COLORS.ZONE_B);

  var zoneCRange = sheet.getRange(
    PCC_V04_DATA_START_ROW,
    PCC_V04_ZONE_B_END + 1,
    dataRows,
    PCC_V04_TOTAL_COLS - PCC_V04_ZONE_B_END
  );
  zoneCRange.setBackground(PCC_V04_COLORS.ZONE_C);

  sheet
    .getRange(PCC_V04_HEADER_ROW, 1, 1, PCC_V04_ZONE_A_END)
    .setBackground(PCC_V04_COLORS.ZONE_A);
  sheet
    .getRange(
      PCC_V04_HEADER_ROW,
      PCC_V04_ZONE_A_END + 1,
      1,
      PCC_V04_ZONE_B_END - PCC_V04_ZONE_A_END
    )
    .setBackground(PCC_V04_COLORS.ZONE_B);
  sheet
    .getRange(
      PCC_V04_HEADER_ROW,
      PCC_V04_ZONE_B_END + 1,
      1,
      PCC_V04_TOTAL_COLS - PCC_V04_ZONE_B_END
    )
    .setBackground(PCC_V04_COLORS.ZONE_C);
}

function pccV04_applyInputGatewayDropdowns_(sheet) {
  var dataRows = PCC_V04_VALIDATION_LAST_ROW - PCC_V04_DATA_START_ROW + 1;
  var headerMap = pccV04_getHeaderMap_(sheet, PCC_V04_HEADER_ROW);

  pccV04_setDropdownByHeader_(
    sheet,
    headerMap,
    'Input Type',
    PCC_V04_DROPDOWN.INPUT_TYPE,
    dataRows
  );
  pccV04_setDropdownByHeader_(
    sheet,
    headerMap,
    'Requested Action',
    PCC_V04_DROPDOWN.REQUESTED_ACTION,
    dataRows
  );
  pccV04_setDropdownByHeader_(
    sheet,
    headerMap,
    'Source Type',
    PCC_V04_DROPDOWN.SOURCE_TYPE,
    dataRows
  );
  pccV04_setDropdownByHeader_(
    sheet,
    headerMap,
    'Priority',
    PCC_V04_DROPDOWN.PRIORITY,
    dataRows
  );
  pccV04_setDropdownByHeader_(
    sheet,
    headerMap,
    'Review Status',
    PCC_V04_DROPDOWN.REVIEW_STATUS,
    dataRows
  );
  pccV04_setDropdownByHeader_(
    sheet,
    headerMap,
    'Target Sheet Approved',
    PCC_V04_DROPDOWN.TARGET_SHEET_APPROVED,
    dataRows
  );
}

function pccV04_hideTechnicalColumns_(sheet) {
  var headerMap = pccV04_getHeaderMap_(sheet, PCC_V04_HEADER_ROW);

  sheet.showColumns(1, PCC_V04_TOTAL_COLS);

  for (var i = 0; i < PCC_V04_HIDDEN_HEADERS.length; i++) {
    var headerName = PCC_V04_HIDDEN_HEADERS[i];
    var col = headerMap[headerName];
    if (col) {
      sheet.hideColumns(col);
    }
  }
}

function pccV04_finalizeInputGatewayLayout_(sheet) {
  sheet.setFrozenRows(PCC_V04_HEADER_ROW);

  var widths = [
    100, 110, 280, 120, 150, 120, 180, 90, 110, 100, 180,
    140, 120, 140, 140, 200,
    150, 150, 140, 90, 120, 140,
    100, 100, 160, 160, 110, 110, 140, 110, 110, 180, 120
  ];

  for (var c = 0; c < widths.length; c++) {
    sheet.setColumnWidth(c + 1, widths[c]);
  }
}

// ---------------------------------------------------------------------------
// 00_DASHBOARD – 8 chỉ số bằng công thức
// ---------------------------------------------------------------------------

function pccV04_setupDashboardFormulas_(sheet) {
  var gw = "'" + PCC_V04_SHEET.INPUT_GATEWAY + "'";
  var dataStart = PCC_V04_DATA_START_ROW;

  var colRaw = gw + '!C' + dataStart + ':C';
  var colInputType = gw + '!D' + dataStart + ':D';
  var colReview = gw + '!V' + dataStart + ':V';
  var colValidation = gw + '!AF' + dataStart + ':AF';

  var metrics = [
  {
    label: '1. Tổng input',
    formula:
      '=COUNTIF(' + colRaw + ',"<>")',
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
      '=COUNTA(FILTER(' +
      colRaw +
      ',(' +
      colRaw +
      '<>"")*(' +
      '(' +
      colReview +
      '="NEEDS_CLARIFICATION")+(REGEXMATCH(TO_TEXT(' +
      colValidation +
      '),"^BLOCKED"))' +
      ')))',
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
    formula:
      '=COUNTIFS(' + colValidation + ',"BLOCKED*")',
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
  sheet
    .getRange(titleRow, PCC_V04_DASHBOARD_LABEL_COL)
    .setValue('PCC V0.4 – Input Gateway Dashboard (Gói 1)')
    .setFontWeight('bold')
    .setFontSize(12);

  sheet
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
    sheet
      .getRange(row, PCC_V04_DASHBOARD_LABEL_COL)
      .setValue(metrics[i].label);
    sheet
      .getRange(row, PCC_V04_DASHBOARD_VALUE_COL)
      .setFormula(metrics[i].formula);
    sheet.getRange(row, 3).setValue(metrics[i].note);
  }

  sheet.setColumnWidth(PCC_V04_DASHBOARD_LABEL_COL, 260);
  sheet.setColumnWidth(PCC_V04_DASHBOARD_VALUE_COL, 90);
  sheet.setColumnWidth(3, 360);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pccV04_getHeaderMap_(sheet, headerRow) {
  var lastCol = Math.max(sheet.getLastColumn(), PCC_V04_TOTAL_COLS);
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

function pccV04_setDropdownByHeader_(
  sheet,
  headerMap,
  headerName,
  values,
  numRows
) {
  var col = headerMap[headerName];
  if (!col) {
    throw new Error('Thiếu header: ' + headerName);
  }

  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();

  sheet
    .getRange(PCC_V04_DATA_START_ROW, col, numRows, 1)
    .setDataValidation(rule);
}
