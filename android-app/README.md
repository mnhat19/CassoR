# Cassor Payment Listener — Android APK

Ứng dụng Android đơn giản chạy nền, tự động đọc thông báo từ ứng dụng ngân hàng trên điện thoại của merchant (người bán), trích xuất mã tham chiếu CASSOR, và gửi xác nhận thanh toán về backend.

## Yêu cầu

- Android 8.0+ (API 26+)
- Android Studio Hedgehog (2023.1.1) trở lên, hoặc Android SDK
- Điện thoại cài ứng dụng ngân hàng (MB Bank, VCB, Techcombank, BIDV, Agribank, ACB, ...)

## Build APK

```bash
# Mở Android Studio → Open → chọn thư mục android-app/
# Build → Generate Signed Bundle/APK → APK → debug

# Hoặc dùng Gradle CLI (cần Android SDK):
cd android-app
./gradlew assembleDebug
# APK output: app/build/outputs/apk/debug/app-debug.apk
```

## Cài đặt và cấu hình

1. Cài APK lên điện thoại merchant (điện thoại nhận thông báo ngân hàng)
2. Mở app → nhập URL server backend (ví dụ: `http://192.168.1.100:8000` hoặc public URL)
3. Nhập `PAYMENT_WEBHOOK_SECRET` (phải khớp với giá trị trong file `.env` của server)
4. Nhấn **"Cấp quyền đọc thông báo"** → Bật Cassor Payment trong danh sách
5. Cấp quyền đọc SMS khi app yêu cầu
6. Nhấn **"Test kết nối"** để kiểm tra

## Luồng hoạt động

```
Khách upload file HR → Nhận mã CSRxxxxxxxx
  → Chuyển khoản 3.000đ với nội dung CSRxxxxxxxx
    → Ngân hàng gửi thông báo đến điện thoại merchant
      → App đọc thông báo → trích xuất mã CSR + số tiền
        → POST /api/v1/payment/webhook/confirm
          → Backend xác nhận → Khách tải được báo cáo
```

## Ngân hàng hỗ trợ (thông báo push)

| Ngân hàng | Package |
|-----------|---------|
| MB Bank | com.mbmobile |
| Vietcombank | com.VCB |
| Techcombank | vn.com.techcombank.bb.app |
| BIDV | com.bidv.smartbanking |
| Agribank | com.vnpay.agribank |
| ACB | com.acb.mobile |
| Sacombank | com.sacombank.mb |
| VPBank | com.vpbank.vpbankneo |
| TPBank | vn.tpbank.ebank |

SMS từ mọi ngân hàng cũng được hỗ trợ (yêu cầu quyền READ_SMS).

## Lưu ý bảo mật

- `PAYMENT_WEBHOOK_SECRET` cần được thay bằng chuỗi random mạnh (≥ 32 ký tự) trước khi deploy production
- Nên dùng HTTPS cho server URL khi deploy
- APK chỉ gửi thông báo khi tìm thấy đúng mã `CSR[A-F0-9]{8}` trong text — không gửi dữ liệu khác
