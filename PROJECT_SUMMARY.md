# AutoWashPro - Project Summary

## Tổng quan

**AutoWashPro** là hệ thống quản lý đặt lịch rửa xe toàn diện, được phát triển làm đồ án tốt nghiệp (WDP-301 - FPT University). Nền tảng hỗ trợ đa vai trò (Admin, Manager, Customer), thanh toán trực tuyến (VNPay, MoMo), hệ thống tích điểm trung thành, gói slot prepaid, chatbot AI, và thông báo real-time.

---

## Cấu trúc dự án

```
AutoWashPro-WDP301/
├── BE/                 # Backend (Node.js + Express + MongoDB)
├── FE/                 # Frontend Web (React + Vite + Tailwind CSS)
├── Mobile/             # Mobile App (React Native + Expo)
├── docs/               # Tài liệu UI spec
├── API_AUDIT.md        # Báo cáo kiểm tra API (23 issues)
└── README.md
```

---

## Tech Stack

### Backend (`BE/`)

| Layer | Công nghệ |
|-------|-----------|
| Runtime | Node.js >= 18 |
| Framework | Express 4.21 |
| Database | MongoDB (Mongoose 8.6) |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Validation | express-validator |
| Payment | VNPay, MoMo |
| Real-time | Server-Sent Events (SSE) |
| AI Chatbot | Google Gemini (gemini-2.0-flash) |
| API Docs | Swagger |
| Security | Helmet, CORS, express-rate-limit |
| Testing | Jest + Supertest |

### Frontend Web (`FE/`)

| Layer | Công nghệ |
|-------|-----------|
| Framework | React 18 (Vite 5) |
| Routing | react-router-dom 6.30 |
| Styling | Tailwind CSS 4 |
| UI | Radix UI, shadcn pattern |
| Animation | Framer Motion |
| Charts | Recharts |
| Maps | MapLibre GL |
| QR | html5-qrcode, react-qr-code |

### Mobile App (`Mobile/`)

| Layer | Công nghệ |
|-------|-----------|
| Framework | React Native 0.85 + Expo SDK 56 |
| Routing | Expo Router (file-based) |
| Language | TypeScript |
| HTTP | Axios |
| Storage | expo-secure-store |
| QR | react-native-qrcode-svg |

---

## Vai trò người dùng

| Vai trò | Quyền hạn |
|---------|-----------|
| **Admin** | Quản lý toàn bộ hệ thống: chi nhánh, người dùng, đặt lịch, thanh toán, voucher, gói slot, báo cáo |
| **Manager** | Quản lý theo chi nhánh: đặt lịch, lịch trình, voucher, doanh thu, khách hàng, feedback, gói slot |
| **Customer** | Đặt lịch, quản lý xe, sử dụng voucher, xem lịch sử, tích điểm, đánh giá |

---

## Database Schema (14 Collections)

| Collection | Mô tả |
|------------|-------|
| **Users** | Thông tin người dùng, phân quyền, tích điểm, tier (bronze/silver/gold/diamond) |
| **Branches** | Chi nhánh, địa chỉ, tọa độ địa lý (GeoJSON 2dsphere), giờ mở cửa |
| **Packages** | Gói dịch vụ rửa xe, sub-services tùy chọn, áp dụng theo loại xe |
| **Vehicles** | Xe của khách hàng: biển số, loại xe, hãng, mẫu, màu |
| **Bookings** | Đặt lịch: trạng thái, thời gian, loại (single/recurring/slot_pack), giá, thanh toán |
| **Payments** | Giao dịch thanh toán: VNPay/MoMo/cash, trạng thái, hoàn tiền |
| **Vouchers** | Mã giảm giá: phần trăm/cố định, giới hạn sử dụng, áp dụng theo tier/package |
| **VoucherUsage** | Lịch sử sử dụng voucher |
| **Notifications** | Thông báo real-time: đặt lịch, thanh toán, nhắc nhở, hệ thống |
| **SlotPacks** | Gói slot prepaid: số slot, giảm giá theo tier, mã gói |
| **SlotProducts** | Sản phẩm slot có sẵn để mua |
| **Gifts** | Quà tặng trong cửa hàng |
| **PointHistory** | Lịch sử điểm: tích lũy, đổi, hết hạn |
| **Testimonials** | Đánh giá từ khách hàng |

---

## Tính năng chính

### Đặt lịch
- Đặt lịch đơn, đặt lịch định kỳ (hàng tuần), sử dụng slot pack
- Quản lý trạng thái: pending → confirmed → checked_in → in_progress → completed
- Priority theo tier (bronze=1, silver=2, gold=3, diamond=4)
- Mã QR cho check-in/check-out

### Thanh toán
- Tích hợp VNPay và MoMo
- Đặt cọc / thanh toán đầy đủ / hoàn tiền
- Theo dõi trạng thái giao dịch

### Voucher & Giảm giá
- Voucher phần trăm / cố định
- Áp dụng theo chi nhánh, gói dịch vụ, tier
- Voucher sinh nhật tự động (20% giảm giá)
- Đổi điểm lấy voucher

### Gói Slot Prepaid
- Mua số lượng rửa xe trước, nhận giảm giá
- Tier giảm giá: 5 slot → 5%, 10 slot → 10%, 20+ slot → 15%
- Mã gói unique để check-in

### Hệ thống tích điểm & Tier
- Tích điểm khi hoàn thành đặt lịch
- 4 tier: Bronze → Silver → Gold → Diamond
- Quy đổi điểm lấy voucher / quà

### Thông báo real-time
- Server-Sent Events (SSE) cho push notification
- Trung tâm thông báo trong ứng dụng

### Chatbot AI
- Google Gemini powered
- Hỗ trợ tra cứu chi nhánh, gói dịch vụ, kiểm tra-slot trống, tạo đặt lịch

### Công việc nền (Cron Jobs)
- **Reminder Job**: Mỗi 5 phút, gửi nhắc nhở cho đặt lịch sắp bắt đầu (60-65 phút nữa)
- **Birthday Job**: Hàng ngày 8:00 AM, tạo voucher sinh nhật 20% cho khách hàng
- **Auto-Cancel Job**: Mỗi 5 phút, tự động hủy đặt lịch không đến (30 phút sau giờ bắt đầu)

---

## API Endpoints (69+ endpoints)

Tất cả routes_mounted dưới `/api/`. Swagger UI: `http://localhost:5000/api-docs`

| Module | Số endpoints | Mô tả |
|--------|-------------|-------|
| Auth | 10 | Đăng ký, đăng nhập, refresh token, quản lý người dùng |
| Vehicles | 5 | CRUD xe |
| Branches | 6 | CRUD chi nhánh, query địa lý |
| Packages | 5 | CRUD gói dịch vụ |
| Bookings | 17 | Đặt lịch, xác nhận, check-in, feedback, rebook |
| Payments | 7 | Thanh toán, xác nhận, hoàn tiền, callback gateway |
| Vouchers | 14 | CRUD voucher, validate, redeem points, reserve/rollback |
| Slot Packs | 7 | Mua, sử dụng, hủy gói slot |
| Notifications | 6 | Đọc, đánh dấu đã đọc, xóa thông báo |
| Reports | 1 | Báo cáo doanh thu |
| Chat | 2 | Chatbot AI |
| SSE | 1 | Real-time notifications |
| Other | 6 | Stats, gifts, slot-products, testimonials, health |

---

## Frontend Routes

### Customer (`/*`)
- Trang chủ Landing Page (Hero, How It Works, Testimonials, Map, CTA)
- Đặt lịch, chọn gói, chọn chi nhánh
- Lịch sử đặt lịch, thông tin cá nhân
- Tích điểm, cửa hàng quà, voucher

### Admin (`/admin/*`)
- Dashboard tổng quan
- Quản lý chi nhánh, người dùng, đặt lịch, thanh toán
- Quản lý voucher, gói slot, đánh giá
- Phân tích hoạt động, hồ sơ

### Manager (`/manager/*`)
- Dashboard chi nhánh
- Quản lý đặt lịch, lịch trình hàng ngày
- Quản lý voucher, khách hàng, feedback
- QR Scanner, Check-in nhanh
- Quản lý gói dịch vụ, gói slot

---

## Mobile App Routes

```
app/
├── (auth)/          # Đăng nhập, đăng ký, quên mật khẩu
├── (tabs)/          # Home, Booking, History, Rewards, Profile
├── booking/         # Chi tiết đặt lịch
├── vehicle/         # Quản lý xe
├── voucher/         # Voucher
├── payment/         # Thanh toán
├── notifications/   # Thông báo
├── profile/         # Hồ sơ
├── chat/            # Chatbot
├── checkin/         # QR Check-in
├── feedback/        # Phản hồi
└── slot-packs.tsx   # Gói slot
```

---

## Known Issues (từ API_AUDIT.md)

### Critical Bugs
1. `BookingsHistory.jsx:66` gọi `GET /bookings` thay vì `GET /bookings/my` → lỗi 403 (đã fix)
2. `LoyaltyGifts.jsx:16` gọi `GET /vouchers` thay vì `GET /vouchers/available` → lỗi 403 (chưa fix)

### Missing UI Features
- **Admin**: Chưa có form tạo voucher, trang quản lý thanh toán, batch confirm, customer analytics, slot pack lookup, chỉnh sửa đặt lịch
- **Customer**: Chưa có nút cancel/rebook/QR-view trong lịch sử, trang lịch sử thanh toán, hủy slot pack, UI hủy đặt lịch định kỳ

---

## Scripts

| File | Mô tả |
|------|-------|
| `scripts/seed-full.js` | Seed toàn bộ dữ liệu |
| `scripts/seed-users.js` | Seed người dùng |
| `scripts/seed-landing.js` | Seed dữ liệu landing page |
| `scripts/seed-test-bookings.js` | Seed dữ liệu đặt lịch test |

---

## ENV Variables (xem `BE/.env.example`)

Các biến môi trường quan trọng:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` - Secret keys cho JWT
- `VNPAY_*` - VNPay gateway config
- `MOMO_*` - MoMo gateway config
- `GOOGLE_AI_KEY` - Google Gemini API key
- `PORT` - Server port (default: 5000)
