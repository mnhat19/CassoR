# CASSOR HRM

> **Career Intelligence Platform** — Hệ thống quản trị lộ trình nghề nghiệp thông minh cho doanh nghiệp Việt Nam.

[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)](https://vitejs.dev)
[![Database](https://img.shields.io/badge/Database-SQLite%20%2F%20PostgreSQL-003B57?logo=sqlite)](https://www.sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Tính năng

| Module | Mô tả |
|--------|-------|
| **Khám phá** | Duyệt 19 nhóm chuyên môn, xem lộ trình thăng tiến 3 track (Professional / Management / Leadership) |
| **Nghề nghiệp của tôi** | Nhập chức danh → hệ thống tự định vị + vẽ lộ trình cá nhân, xem tiền lệ thăng chức |
| **Talent Radar** | Phân tích kim tự tháp nhân sự, cảnh báo chững lại, rủi ro phụ thuộc — hỗ trợ upload dữ liệu HR riêng (có phí 3.000đ/lần) |
| **Xác nhận thanh toán** | App Android đọc thông báo ngân hàng → tự động mở khóa báo cáo cho khách |

---

## Kiến trúc

```
┌─────────────────────┐     HTTPS      ┌─────────────────────┐
│   React + Vite      │ ◄────────────► │   FastAPI + SQLite  │
│   (Vercel)          │                │   (Render)          │
└─────────────────────┘                └──────────┬──────────┘
                                                  │ webhook
                                       ┌──────────▼──────────┐
                                       │  Android APK        │
                                       │  (Merchant phone)   │
                                       └─────────────────────┘
```

**Backend:** FastAPI · AsyncSQLAlchemy · Pydantic v2 · SQLite (dev) / PostgreSQL (prod)  
**Frontend:** React 18 · TypeScript · Vite · Tailwind CSS · Radix UI · Recharts  
**Android:** Kotlin · NotificationListenerService · SMS BroadcastReceiver  

---

## Bắt đầu nhanh (Local)

### Yêu cầu

- Python 3.11+
- Node.js 18+

### 1. Clone & cài dependencies

```bash
git clone https://github.com/mnhat19/CassoR.git
cd CassoR

# Backend
python -m venv .venv
source .venv/bin/activate          # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Frontend
cd ui && npm install && cd ..
```

### 2. Cấu hình môi trường

```bash
cp .env.example .env
# Mở .env và điền thông tin ngân hàng + đổi PAYMENT_WEBHOOK_SECRET
```

### 3. Khởi tạo dữ liệu

```bash
# Seed expertise & title data (chạy 1 lần)
python -m app.seed.load_expertise
python -m app.seed.load_titles
python -m app.seed.load_employees
python -m app.seed.load_users
```

### 4. Chạy

```bash
# Terminal 1 — Backend
uvicorn app.main:app --reload
# → http://localhost:8000  |  Swagger: http://localhost:8000/docs

# Terminal 2 — Frontend
cd ui && npm run dev
# → http://localhost:5173
```

### Tài khoản demo

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | HR / Leadership |
| `employee` | `emp123` | Employee |

---

## Deploy lên Vercel + Render

Xem hướng dẫn chi tiết: **[DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)**

### Render (Backend)

1. Tạo **Web Service** từ repo này
2. **Root Directory:** để trống (backend ở root)
3. **Build Command:** `pip install -r requirements.txt`
4. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Thêm **Environment Variables** (copy từ `.env.example`)

> **SQLite trên Render:** Gắn **Persistent Disk** vào `/data` và đặt `DATABASE_URL=sqlite+aiosqlite:////data/cassor_hrm.db`. Hoặc dùng PostgreSQL miễn phí từ [Supabase](https://supabase.com) / [Railway](https://railway.app).

### Vercel (Frontend)

1. Import repo → **Framework:** Vite
2. **Root Directory:** `ui`
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. **Environment Variable:** `VITE_API_BASE_URL=https://your-backend.onrender.com`

### CORS

Sau khi có URL Vercel, thêm vào Render env:

```
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```

---

## Android APK (Merchant Payment Listener)

Ứng dụng chạy nền trên điện thoại merchant, tự động đọc thông báo ngân hàng và xác nhận thanh toán.

### Build (không cần cài Android Studio)

Dùng **GitHub Actions** — mỗi khi push code vào `android-app/`, CI tự build và đính kèm file APK vào artifact.

Hoặc build thủ công:

```bash
cd android-app
./gradlew assembleDebug
# APK: android-app/app/build/outputs/apk/debug/app-debug.apk
```

### Cấu hình sau khi cài APK

1. Nhập **URL backend** (Render URL hoặc IP local)
2. Nhập **Webhook Secret** (phải khớp `PAYMENT_WEBHOOK_SECRET` trong `.env`)
3. Cấp quyền **Notification Access** và **SMS**
4. Nhấn **"Test kết nối"** để kiểm tra

### Ngân hàng hỗ trợ

MB Bank · Vietcombank · Techcombank · BIDV · Agribank · ACB · Sacombank · VPBank · TPBank + mọi ngân hàng gửi SMS giao dịch.

---

## Luồng thanh toán Talent Radar

```
Khách upload file HR (.xlsx/.csv)
  → Nhận mã tham chiếu CSRxxxxxxxx + thông tin chuyển khoản
    → Chuyển 3.000đ, nội dung = mã CSR
      → App Android đọc thông báo ngân hàng
        → POST /api/v1/payment/webhook/confirm
          → Backend xác nhận → Khách tải báo cáo Excel (1 lần)
```

---

## Cấu trúc dự án

```
CassoR/
├── app/                    # FastAPI backend
│   ├── api/                # Route handlers
│   ├── models/             # SQLAlchemy ORM models
│   ├── schemas/            # Pydantic schemas
│   ├── services/           # Business logic
│   └── seed/               # Data seeding scripts
├── ui/                     # React + Vite frontend
│   ├── src/app/
│   │   ├── components/     # Page & UI components
│   │   ├── api.ts          # API client
│   │   └── types.ts        # TypeScript types
│   └── public/templates/   # HR data templates (xlsx, csv)
├── android-app/            # Kotlin Android app
├── tests/                  # pytest test suite
├── static/templates/       # HR data upload templates
├── .env.example            # Environment variable template
├── DEPLOY_GUIDE.md         # Hướng dẫn deploy chi tiết
└── INTERNAL_SETUP_GUIDE.md # Hướng dẫn setup nội bộ
```

---

## API Reference

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/api/v1/auth/login` | Đăng nhập, nhận token |
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản |
| `GET`  | `/api/v1/explore/expertises` | Danh sách chuyên môn |
| `GET`  | `/api/v1/explore/career-path/{code}` | Lộ trình theo chuyên môn |
| `GET`  | `/api/v1/me/path` | Lộ trình cá nhân |
| `POST` | `/api/v1/me/resolve-title` | Định vị chức danh |
| `GET`  | `/api/v1/radar/pyramid` | Kim tự tháp nhân sự |
| `GET`  | `/api/v1/radar/alerts/stagnation` | Cảnh báo chững lại |
| `POST` | `/api/v1/payment/initiate` | Tạo lệnh thanh toán (upload file) |
| `GET`  | `/api/v1/payment/status/{ref}` | Kiểm tra trạng thái thanh toán |
| `POST` | `/api/v1/payment/webhook/confirm` | Xác nhận từ app Android |
| `POST` | `/api/v1/payment/analyze/{ref}` | Tải báo cáo phân tích |

Xem đầy đủ tại: **`http://localhost:8000/docs`** (khi chạy local)

---

## Kiểm thử

```bash
# Chạy toàn bộ test suite
pytest tests/ -v

# Chạy theo nhóm
pytest tests/test_auth.py -v
pytest tests/test_payment.py -v
```

---

## Đóng góp

Pull requests luôn được chào đón. Với thay đổi lớn, vui lòng mở Issue thảo luận trước.

---

## License

[MIT](LICENSE)

---

<div align="center">
  <sub>Built with ❤️ for Vietnamese enterprises · <a href="https://github.com/mnhat19/CassoR">github.com/mnhat19/CassoR</a></sub>
</div>
