# Hướng dẫn Setup & Test Nội Bộ — Cassor HRM

> Dành cho chủ sản phẩm. Không chia sẻ ra ngoài.

---

## Mục lục nhanh

- [Phần 1 — Khởi động sản phẩm trên máy tính](#phần-1--khởi-động-sản-phẩm-trên-máy-tính)
- [Phần 2 — Cài app Android lên điện thoại](#phần-2--cài-app-android-lên-điện-thoại)
- [Phần 3 — Setup tài khoản thanh toán](#phần-3--setup-tài-khoản-thanh-toán)
- [Phần 4 — Chạy thử luồng thanh toán end-to-end](#phần-4--chạy-thử-luồng-thanh-toán-end-to-end)
- [Phần 5 — Xử lý sự cố thường gặp](#phần-5--xử-lý-sự-cố-thường-gặp)

---

## Phần 1 — Khởi động sản phẩm trên máy tính

### Bước 1.1 — Cài dependencies (làm 1 lần duy nhất)

Mở PowerShell trong thư mục project, chạy:

```powershell
# Tạo môi trường Python
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Cài thư viện backend
pip install -r requirements.txt

# Cài thư viện frontend
cd ui
npm install
cd ..
```

### Bước 1.2 — Kiểm tra file .env

Mở file `.env` trong thư mục gốc. Đảm bảo có các dòng sau (nếu chưa có, thêm vào):

```env
PAYMENT_BANK_NAME=MB Bank
PAYMENT_BANK_ACCOUNT=0909090909
PAYMENT_BANK_ACCOUNT_NAME=CASSOR HRM
PAYMENT_AMOUNT_VND=3000
PAYMENT_WEBHOOK_SECRET=cassor-webhook-secret-change-me
PAYMENT_FILE_EXPIRY_SECONDS=1800
```

> **Lưu ý:** Giá trị trên là để test nội bộ. Khi deploy thật, đổi `PAYMENT_BANK_ACCOUNT` thành STK thật và `PAYMENT_WEBHOOK_SECRET` thành chuỗi bí mật dài hơn.

### Bước 1.3 — Khởi động

Mở **2 cửa sổ PowerShell riêng biệt**:

**Cửa sổ 1 — Backend:**
```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```
Chờ đến khi thấy dòng `Application startup complete` → backend đang chạy tại `http://localhost:8000`

**Cửa sổ 2 — Frontend:**
```powershell
cd ui
npm run dev
```
Chờ đến khi thấy `Local: http://localhost:5173` → mở trình duyệt, vào địa chỉ đó.

---

## Phần 2 — Cài app Android lên điện thoại

App Android đọc thông báo ngân hàng trên điện thoại của bạn (merchant), tự động xác nhận khi khách chuyển khoản đúng mã.

### Bước 2.1 — Build APK (không cần Android Studio, dùng GitHub Actions)

Vì máy tính RAM hạn chế, build trên cloud miễn phí qua GitHub Actions:

1. **Đẩy code lên GitHub** (tạo private repo nếu chưa có)

2. **Tạo file** `.github/workflows/build-apk.yml` với nội dung:

```yaml
name: Build APK
on:
  push:
    paths:
      - 'android-app/**'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - name: Build debug APK
        working-directory: android-app
        run: ./gradlew assembleDebug
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-debug
          path: android-app/app/build/outputs/apk/debug/app-debug.apk
```

3. **Push file này lên GitHub** → vào tab **Actions** → chờ job chạy xong (~3–5 phút)

4. Click vào job vừa chạy → kéo xuống **Artifacts** → tải `app-debug.zip` → giải nén ra `app-debug.apk`

### Bước 2.2 — Cài APK lên điện thoại

1. Chép file `app-debug.apk` vào điện thoại (qua USB, Google Drive, hoặc email cho chính mình)
2. Trên điện thoại: vào **Cài đặt → Bảo mật → Cài ứng dụng từ nguồn không xác định** → Bật
3. Dùng File Manager mở file APK → nhấn **Cài đặt**
4. Tên app sau khi cài: **"Cassor Payment Listener"**

### Bước 2.3 — Cấu hình app (làm theo đúng thứ tự)

Mở app vừa cài:

**① Nhập URL server backend**

- Nếu test local (điện thoại và máy tính cùng WiFi):
  - Tìm IP máy tính: mở PowerShell → chạy `ipconfig` → tìm `IPv4 Address` (ví dụ `192.168.1.5`)
  - Nhập: `http://192.168.1.5:8000`
- Nếu đã deploy lên Render: nhập URL Render (`https://tên-app.onrender.com`)

**② Nhập Webhook Secret**

Nhập đúng giá trị `PAYMENT_WEBHOOK_SECRET` trong file `.env`.
Khi test: `cassor-webhook-secret-change-me`

**③ Nhấn "Lưu cấu hình"**

**④ Cấp quyền đọc thông báo**

Nhấn nút **"Cấp quyền đọc thông báo"** → trang Notification Access mở ra → tìm **Cassor Payment Listener** → bật ON → quay lại app.

App hiện: `✅ Quyền thông báo: Đã cấp`

**⑤ Cấp quyền đọc SMS** — nhấn Cho phép khi app hỏi

**⑥ Nhấn "Test kết nối"**

- Hiện `✅ Webhook OK` → app đã kết nối được server, sẵn sàng hoạt động
- Hiện `❌ Webhook lỗi` → xem [Phần 5](#phần-5--xử-lý-sự-cố-thường-gặp)

---

## Phần 3 — Setup tài khoản thanh toán

Đây là tài khoản ngân hàng của bạn (merchant) — nơi khách chuyển 3.000đ vào.

### Bước 3.1 — Chọn ngân hàng

App Android hỗ trợ đọc thông báo push từ các ngân hàng sau. **VCB hoàn toàn được hỗ trợ.**

| Ngân hàng | Trạng thái |
|-----------|-----------|
| MB Bank | ✅ Hỗ trợ tốt nhất |
| **Vietcombank (VCB)** | ✅ Hỗ trợ |
| Techcombank, BIDV, Agribank, ACB, Sacombank, VPBank, TPBank | ✅ Hỗ trợ |
| Ngân hàng khác | ✅ Qua SMS (miễn SIM nhận SMS báo giao dịch) |

### Bước 3.2 — Cập nhật thông tin tài khoản vào .env

Mở file `.env`, sửa:

```env
PAYMENT_BANK_NAME=Vietcombank
PAYMENT_BANK_ACCOUNT=<số tài khoản VCB của bạn>
PAYMENT_BANK_ACCOUNT_NAME=<tên chủ tài khoản viết hoa, đúng như trong app ngân hàng>
```

Lưu file → khởi động lại backend (Ctrl+C rồi chạy lại `uvicorn app.main:app --reload`).

### Bước 3.3 — Đảm bảo điện thoại nhận được thông báo

Trên điện thoại cài VCB:
- Vào app VCB → Cài đặt → Bật **Thông báo giao dịch** (push notification)

Khi có tiền vào, điện thoại sẽ hiện thông báo kiểu:
> *"VCB: TK 123456 +3,000 VND. ND: CSRDE8F3171. SD: ..."*

App Cassor đọc thông báo này, trích xuất mã `CSR...`, rồi tự gọi về server để mở khóa.

---

## Phần 4 — Chạy thử luồng thanh toán end-to-end

Bạn đóng vai cả hai phía: khách hàng (trên trình duyệt) và merchant (điện thoại).

### Bước 4.1 — Upload file như khách hàng

1. Mở trình duyệt → `http://localhost:5173`
2. Vào **Talent Radar** → tab **"Phân tích dữ liệu của bạn"**
3. Tải template mẫu (có link ngay trong trang), điền vài dòng nhân viên giả, lưu lại
4. Kéo thả file vào vùng upload → nhấn **"Tải lên và tạo lệnh thanh toán"**

UI hiện ra thông tin chuyển khoản và mã tham chiếu, ví dụ: **`CSRDE8F3171`**

### Bước 4.2 — Thanh toán

**Cách A — Chuyển khoản thật (test hoàn chỉnh nhất):**

Chuyển đúng **3.000đ** vào tài khoản VCB, **nội dung ghi đúng mã** (ví dụ `CSRDE8F3171`).

App Cassor trên điện thoại tự đọc thông báo VCB → tự gọi webhook → backend xác nhận.

**Cách B — Giả lập bằng lệnh (không cần chuyển tiền, để test kỹ thuật):**

Mở PowerShell, thay `CSRxxxxxxxx` bằng mã thực từ Bước 4.1:

```powershell
curl -X POST http://localhost:8000/api/v1/payment/webhook/confirm `
  -H "Content-Type: application/json" `
  -d '{"reference": "CSRxxxxxxxx", "amount_vnd": 3000, "source": "test", "secret": "cassor-webhook-secret-change-me"}'
```

Response thành công: `{"status": "confirmed", "reference": "CSRxxxxxxxx"}`

### Bước 4.3 — Tải báo cáo

Quay lại trình duyệt → nhấn **"Tôi đã chuyển khoản"** (hoặc UI tự cập nhật sau vài giây) → nút **"Tải báo cáo"** xuất hiện → nhấn tải về → mở Excel, kiểm tra 5 sheet phân tích.

> **Quan trọng:** Báo cáo chỉ tải được **1 lần duy nhất**. Đây là thiết kế cố ý để tránh lạm dụng sau khi thanh toán.

---

## Phần 5 — Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|-------------|-------------|------------|
| App Android hiện `❌ Webhook lỗi` | Secret sai hoặc server chưa bật | Kiểm tra secret khớp với `.env`; kiểm tra backend đang chạy |
| App không đọc được thông báo VCB | Chưa cấp quyền Notification Access | Cài đặt → Quyền thông báo đặc biệt → bật Cassor |
| Thông báo VCB đến nhưng không trigger | Nội dung chuyển khoản không có mã CSR | Nhắc khách ghi đúng mã; hoặc dùng Cách B (giả lập) để mở thủ công |
| Frontend báo lỗi API (Network Error) | Backend chưa chạy | Kiểm tra cửa sổ PowerShell backend |
| Upload file bị lỗi 422 | `python-multipart` chưa cài | `.\.venv\Scripts\pip install python-multipart` |
| Báo cáo tải về nhưng ít dữ liệu | Chức danh trong file không khớp chuẩn | Dùng đúng template mẫu; điền chức danh tiếng Anh (ví dụ "Senior Software Engineer") |

### Reset để test lại từ đầu

```powershell
.\.venv\Scripts\python -c "import sqlite3; conn=sqlite3.connect('cassor_hrm.db'); conn.execute('DELETE FROM payment_attempts'); conn.commit(); conn.close(); print('Done')"
```

---

## Tham chiếu nhanh

```
Web (local):      http://localhost:5173
Swagger API:      http://localhost:8000/docs
File cấu hình:    .env
Template mẫu:     static/templates/hr_data_template.xlsx
Secret test:      cassor-webhook-secret-change-me
```
