# PC_00_PROJECT_CONTROL_CENTER V0.4 – Gói 1 (TEST)

Chuẩn hóa Form UX `07_INPUT_GATEWAY` và Dashboard công thức `00_DASHBOARD` cho file TEST.

**File TEST:** [PC_00_PROJECT_CONTROL_CENTER_TEST_V0.4](https://docs.google.com/spreadsheets/d/1KwRZCHma9-TqVBSh0zkB6e8v84CSBwybiHMHT9fIYgw/edit)

## Files

| File | Mô tả |
|------|-------|
| `PCC_V04_FormDashboard_TEST.gs` | Gói 1 – setup Form UX + Dashboard (mới) |
| `PCC_InputGateway_Phase1_TEST.gs` | V0.3 Phase 1 validation (không sửa trong Gói 1) |

## Deploy lên file TEST

1. Mở file TEST → **Extensions → Apps Script**
2. Tạo file mới tên `PCC_V04_FormDashboard_TEST.gs`, dán nội dung từ repo
3. (Nếu chưa có) giữ nguyên `PCC_InputGateway_Phase1_TEST.gs` – **không sửa Transfer Engine**
4. Chọn hàm `pccV04_setupFormAndDashboard_TEST_ONLY` → **Run**
5. Authorize lần đầu nếu được hỏi

## Test nhanh (TC_01 – TC_10)

Sau khi chạy setup:

- **TC_01–04:** Kiểm tra `07_INPUT_GATEWAY` – 33 header, vùng A trắng, vùng C xám, cột kỹ thuật ẩn
- **TC_05–08:** Thử dropdown Input Type (7), Requested Action (6), Review Status (7), Target Sheet Approved (không có `00_DASHBOARD`)
- **TC_09:** `00_DASHBOARD` hiển thị 8 chỉ số với công thức
- **TC_10:** Không chạy transfer/append – chỉ nhập thử trên gateway, xác nhận sheet đích không đổi
