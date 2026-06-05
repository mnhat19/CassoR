# Hướng dẫn Deploy CASSOR HRM

Tài liệu này hướng dẫn chi tiết cách deploy CASSOR HRM lên môi trường production:
- **Frontend**: Vercel (free tier)
- **Backend**: Render (free tier)

---

## PHẦN 1: Deploy Backend lên Render

### Bước 1 — Tạo tài khoản Render

Truy cập [https://render.com](https://render.com) và đăng ký tài khoản (có thể dùng GitHub để đăng nhập nhanh).

### Bước 2 — Đẩy code lên GitHub

Đảm bảo toàn bộ code đã được push lên GitHub repository. File `.env` **không được** commit — chỉ commit file `.env.example` nếu có.

### Bước 3 — Tạo Web Service mới

1. Vào Dashboard Render → nhấn **New +** → chọn **Web Service**
2. Kết nối GitHub repo chứa project CASSOR HRM
3. Điền thông tin cấu hình:

| Trường | Giá trị |
|---|---|
| **Name** | `cassor-hrm` (hoặc tên tùy chọn) |
| **Region** | Singapore (gần Việt Nam nhất) |
| **Branch** | `main` (hoặc branch production) |
| **Root Directory** | *(để trống — backend nằm ở root)* |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

### Bước 4 — Cấu hình Environment Variables

Trong tab **Environment** của Web Service, thêm từng biến sau:

| Biến | Ví dụ giá trị | Ghi chú |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:////data/cassor_hrm.db` | Xem lưu ý SQLite bên dưới |
| `PAYMENT_BANK_NAME` | `Vietcombank` | Tên ngân hàng nhận tiền |
| `PAYMENT_BANK_ACCOUNT` | `1234567890` | Số tài khoản ngân hàng |
| `PAYMENT_BANK_ACCOUNT_NAME` | `NGUYEN VAN A` | Tên chủ tài khoản (CHỮ HOA) |
| `PAYMENT_AMOUNT_VND` | `3000` | Số tiền mỗi lượt upload (đồng) |
| `PAYMENT_WEBHOOK_SECRET` | `your-strong-secret-here` | Secret xác thực webhook Casso |
| `PAYMENT_FILE_EXPIRY_SECONDS` | `86400` | Thời gian link file còn hiệu lực (giây) |
| `CORS_ORIGINS` | `https://cassor-hrm.vercel.app` | URL frontend Vercel (điền sau khi deploy frontend) |

> **Lưu ý:** Render tự động inject biến `PORT` — không cần thêm thủ công.

### Bước 5 — Xử lý SQLite trên Render (QUAN TRỌNG)

> **CẢNH BAO:** Render free tier sử dụng **ephemeral filesystem** — mọi file ghi vào disk (bao gồm SQLite database) sẽ **bị xóa mỗi khi service restart hoặc redeploy**. Nếu dùng SQLite mặc định, toàn bộ dữ liệu sẽ mất.

Có 2 giải pháp:

#### Giải pháp A — Render Persistent Disk (có phí, ~$0.25/GB/tháng)

1. Trong settings của Web Service, vào tab **Disks** → nhấn **Add Disk**
2. Cấu hình:
   - **Mount Path**: `/data`
   - **Size**: `1 GB` (đủ dùng cho SQLite)
3. Đặt biến môi trường:
   ```
   DATABASE_URL=sqlite+aiosqlite:////data/cassor_hrm.db
   ```
   > Lưu ý: có **4 dấu slash** — 3 slash là cú pháp SQLite URL, 1 slash là bắt đầu đường dẫn tuyệt đối `/data/...`

#### Giải pháp B — PostgreSQL miễn phí (khuyến nghị cho production)

Dùng PostgreSQL free tier từ **Supabase** hoặc **Railway**:

**Supabase:**
1. Tạo account tại [https://supabase.com](https://supabase.com) → tạo project mới
2. Vào **Settings** → **Database** → copy **Connection string** (URI format)
3. Thêm vào requirements.txt:
   ```
   asyncpg
   ```
4. Đặt biến môi trường trên Render:
   ```
   DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname
   ```

**Railway:**
1. Tạo account tại [https://railway.app](https://railway.app) → tạo **New Project** → chọn **PostgreSQL**
2. Vào tab **Connect** → copy **DATABASE_URL**
3. Thêm `asyncpg` vào requirements.txt (như trên)

> **Lưu ý:** Khi đổi sang PostgreSQL, kiểm tra lại các model SQLAlchemy — một số kiểu dữ liệu SQLite-specific cần điều chỉnh (ví dụ: `JSON` type, `AUTOINCREMENT`).

### Bước 6 — Deploy và lấy URL Backend

1. Nhấn **Create Web Service** — Render sẽ tự động build và deploy
2. Theo dõi logs trong tab **Logs** để đảm bảo không có lỗi
3. Sau khi deploy thành công, URL backend có dạng:
   ```
   https://cassor-hrm.onrender.com
   ```
   *(tên service thay đổi tùy theo tên bạn đặt)*

> **Lưu ý:** Render free tier sẽ **tắt service sau 15 phút không có request**. Request đầu tiên sau khi tắt có thể mất 30-60 giây để khởi động lại (cold start). Để tránh, dùng dịch vụ ping định kỳ như [UptimeRobot](https://uptimerobot.com) (miễn phí).

---

## PHẦN 2: Deploy Frontend lên Vercel

### Bước 1 — Tạo tài khoản Vercel

Truy cập [https://vercel.com](https://vercel.com) và đăng ký (nên dùng GitHub để liên kết repo dễ dàng).

### Bước 2 — Import GitHub Repository

1. Vào Vercel Dashboard → nhấn **Add New...** → **Project**
2. Chọn GitHub repo chứa CASSOR HRM → nhấn **Import**

### Bước 3 — Cấu hình Project Settings

Điền thông tin sau trong màn hình cấu hình:

| Trường | Giá trị |
|---|---|
| **Framework Preset** | `Vite` |
| **Root Directory** | `ui` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Bước 4 — Cấu hình Environment Variables

Trong phần **Environment Variables**, thêm:

| Tên biến | Giá trị |
|---|---|
| `VITE_API_BASE_URL` | `https://cassor-hrm.onrender.com` |

> Thay `cassor-hrm.onrender.com` bằng URL thực của backend Render đã deploy ở Phần 1.

### Bước 5 — Kiểm tra cấu hình API trong Frontend

Vercel inject các biến `VITE_*` lúc build-time. Đảm bảo file cấu hình API trong frontend đọc từ biến môi trường thay vì hardcode localhost.

Kiểm tra file `ui/src/app/api.ts` (hoặc file tương tự):

```typescript
// KHÔNG dùng hardcode như thế này:
const API_BASE_URL = "http://localhost:8000";

// THAY BẰNG:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
```

Nếu cần chỉnh sửa, cập nhật file trước khi deploy.

### Bước 6 — Deploy và lấy URL Frontend

1. Nhấn **Deploy** — Vercel sẽ tự build và deploy
2. Theo dõi build logs để đảm bảo không có lỗi
3. Sau khi thành công, URL frontend có dạng:
   ```
   https://cassor-hrm.vercel.app
   ```
   *(hoặc tên tùy chọn)*

---

## PHẦN 3: Cập nhật CORS trên Backend

Sau khi có URL frontend Vercel, cần cấu hình backend cho phép requests từ domain đó.

### Cập nhật trên Render Dashboard

1. Vào Web Service trên Render → tab **Environment**
2. Tìm biến `CORS_ORIGINS` và cập nhật giá trị:
   ```
   https://cassor-hrm.vercel.app
   ```
   Nếu cần cho phép nhiều origins (ví dụ cả localhost để dev):
   ```
   https://cassor-hrm.vercel.app,http://localhost:5173
   ```
3. Nhấn **Save Changes** — Render sẽ tự động restart service

### Kiểm tra cấu hình CORS trong code

Đảm bảo file backend (thường là `app/main.py`) đọc CORS origins từ biến môi trường:

```python
import os
from fastapi.middleware.cors import CORSMiddleware

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

> **Kiểm tra:** Mở browser, truy cập URL frontend, mở DevTools (F12) → tab Network. Nếu thấy lỗi CORS, kiểm tra lại giá trị `CORS_ORIGINS` trên Render có khớp chính xác với URL Vercel (bao gồm `https://`, không có dấu `/` cuối).

---

## PHẦN 4: Cấu hình Android APK

### Bước 1 — Build APK

1. Mở thư mục `android-app/` bằng **Android Studio**
2. Chờ Gradle sync hoàn tất
3. Vào **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
4. APK output nằm tại:
   ```
   android-app/app/build/outputs/apk/debug/app-debug.apk
   ```

### Bước 2 — Cài APK lên điện thoại merchant

1. Copy file `.apk` sang điện thoại (qua USB, Google Drive, Zalo, v.v.)
2. Trên điện thoại, bật **Cài đặt từ nguồn không xác định** (Settings → Security → Unknown sources)
3. Mở file APK và cài đặt

### Bước 3 — Cấu hình trong App

Sau khi cài xong, mở app và nhập:

- **Backend URL**: URL Render đã deploy
  ```
  https://cassor-hrm.onrender.com
  ```
- **Webhook Secret**: Giá trị của `PAYMENT_WEBHOOK_SECRET` đã đặt trên Render

### Bước 4 — Test kết nối

1. Trong app Android, nhấn **Kiểm tra kết nối** (hoặc tương đương)
2. App sẽ gọi API backend — nếu thành công sẽ hiển thị trạng thái kết nối OK
3. Thử chuyển khoản test nhỏ để kiểm tra luồng webhook hoạt động đúng

> **Lưu ý Casso Webhook:** Đảm bảo đã cấu hình Casso.vn để gửi webhook đến:
> ```
> https://cassor-hrm.onrender.com/api/payment/webhook
> ```
> (hoặc endpoint webhook tương ứng của project)

---

## PHẦN 5: Checklist Trước Khi Go-Live

Xem lại toàn bộ danh sách dưới đây trước khi cho người dùng thật sử dụng:

### Bảo mật

- [ ] **Đổi `PAYMENT_WEBHOOK_SECRET`** thành chuỗi ngẫu nhiên mạnh (tối thiểu 32 ký tự)
  ```bash
  # Tạo secret ngẫu nhiên bằng Python:
  python -c "import secrets; print(secrets.token_hex(32))"
  ```
- [ ] Không commit file `.env` lên GitHub (kiểm tra `.gitignore`)
- [ ] HTTPS đã bật — Render và Vercel **tự động cấp SSL**, không cần cấu hình thêm

### Thanh toán

- [ ] **Điền STK ngân hàng thật** vào `PAYMENT_BANK_ACCOUNT` và `PAYMENT_BANK_ACCOUNT_NAME`
- [ ] Xác nhận `PAYMENT_BANK_NAME` đúng tên ngân hàng
- [ ] Xác nhận `PAYMENT_AMOUNT_VND` đúng mức giá (mặc định 3.000đ/lượt)
- [ ] Webhook Casso đã được cấu hình đúng URL backend production

### Kiểm thử end-to-end

- [ ] Truy cập URL Vercel — frontend load bình thường
- [ ] Đăng nhập / đăng ký tài khoản thành công
- [ ] Thực hiện thanh toán test (chuyển khoản thật nhỏ) → nhận file thành công
- [ ] Android APK kết nối được backend, nhận notification khi có giao dịch
- [ ] Kiểm tra link download file hết hạn sau `PAYMENT_FILE_EXPIRY_SECONDS` giây

### Database & Dữ liệu

- [ ] **Backup định kỳ** nếu dùng Render Persistent Disk:
  ```bash
  # Copy file DB về máy local (chạy từ máy có Render CLI):
  # Hoặc dùng Render Shell để dump dữ liệu
  ```
- [ ] Nếu dùng PostgreSQL: bật tính năng backup tự động trên Supabase/Railway

### Performance

- [ ] Cân nhắc dùng **UptimeRobot** ping backend mỗi 14 phút để tránh cold start:
  - Tạo monitor tại [https://uptimerobot.com](https://uptimerobot.com)
  - Monitor URL: `https://cassor-hrm.onrender.com/health` (hoặc endpoint ping tương ứng)

---

## Tóm tắt URLs sau khi deploy

| Thành phần | URL |
|---|---|
| Frontend (Vercel) | `https://cassor-hrm.vercel.app` |
| Backend API (Render) | `https://cassor-hrm.onrender.com` |
| Backend API Docs | `https://cassor-hrm.onrender.com/docs` |
| Casso Webhook Endpoint | `https://cassor-hrm.onrender.com/api/payment/webhook` |

> Các URL trên là ví dụ — thay bằng URL thực tế sau khi tạo service trên Render/Vercel.
