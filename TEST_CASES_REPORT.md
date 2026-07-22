# BÁO CÁO KIỂM THỬ VÀ BỘ TEST CASE DỰ ÁN AUTOWASHPRO (WDP-301)

**Dự án:** AutoWashPro - Hệ thống quản lý và đặt lịch rửa xe thông minh  
**Phiên bản tài liệu:** 1.0  
**Tác giả:** Antigravity AI Pair Programmer  
**Ngày lập:** 22/07/2026  
**Phạm vi áp dụng:** Backend API (Node.js/Express), Frontend Web (React/Vite/Tailwind), Mobile App (React Native/Expo)

---

## MỤC LỤC

1. [TỔNG QUAN DỰ ÁN & KIẾN TRÚC THIẾT BỊ](#1-tổng-quan-dự-án--kiến-trúc-thiết-bị)
2. [CHIẾN LƯỢC VÀ PHƯƠNG PHÁP KIỂM THỬ](#2-chiến-lược-và-phương-pháp-kiểm-thử)
3. [MA TRẬN PHÂN QUYỀN VÀ BẢO MẬT (RBAC MATRIX)](#3-ma-trận-phân-quyền-và-bảo-mật-rbac-matrix)
4. [BỘ TEST CASE BỘ PHẬN BACKEND API (BE)](#4-bộ-test-case-bộ-phận-backend-api-be)
5. [BỘ TEST CASE BỘ PHẬN FRONTEND WEB (FE)](#5-bộ-test-case-bộ-phận-frontend-web-fe)
6. [BỘ TEST CASE BỘ PHẬN MOBILE APP (MOBILE)](#6-bộ-test-case-bộ-phận-mobile-app-mobile)
7. [TỔNG HỢP LỖI PHÁT HIỆN QUA AUDIT & ĐỀ XUẤT TỰ ĐỘNG HÓA](#7-tổng-hợp-lỗi-phát-hiện-qua-audit--đề-xuất-tự-động-hóa)

---

## 1. TỔNG QUAN DỰ ÁN & KIẾN TRÚC THIẾT BỊ

### 1.1 Mục tiêu hệ thống
**AutoWashPro** là giải pháp chuyển đổi số toàn diện cho chuỗi trung tâm rửa xe và chăm sóc xe hơi chuyên nghiệp, hỗ trợ đa vai trò (Admin, Manager, Customer) trên 3 nền tảng: Backend API Server, Frontend Web Portal và Mobile Application.

### 1.2 Cấu trúc phân hệ & Công nghệ

| Phân hệ | Công nghệ chủ đạo | Vai trò |
| :--- | :--- | :--- |
| **Backend (BE)** | Node.js (>=18), Express 4.21, MongoDB (Mongoose 8.6), JWT, SSE, Gemini AI, Supertest | Cung cấp RESTful API, xử lý nghiệp vụ, quản lý database, cron jobs, thanh toán gateway, push SSE. |
| **Frontend Web (FE)** | React 18, Vite 5, Tailwind CSS 4, Radix UI, Recharts, MapLibre GL | Giao diện Web Portal dành cho Khách hàng, Quản lý chi nhánh (Manager) và Thượng tầng (Admin). |
| **Mobile App (Mobile)** | React Native 0.85, Expo SDK 56, Expo Router, Axios, SecureStore, QR Code | Ứng dụng di động dành cho Khách hàng (đặt lịch, tích điểm, nhận thông báo) & Nhân viên/Manager (Quét QR Check-in). |

---

## 2. CHIẾN LƯỢC VÀ PHƯƠNG PHÁP KIỂM THỬ

### 2.1 Cấp độ kiểm thử (Testing Levels)
1. **Unit Testing & API Integration Testing (BE)**: Kiểm thử đơn vị các hàm xử lý logic và kiểm thử API endpoint với Jest + Supertest.
2. **Component & System Integration Testing (FE & Mobile)**: Kiểm thử các luồng giao diện người dùng, đồng bộ dữ liệu giữa FE/Mobile với BE API.
3. **End-to-End (E2E) Testing**: Kiểm thử trọn vẹn luồng nghiệp vụ thực tế từ Khách hàng đăng ký -> Mua gói Slot / Đặt lịch -> Thanh toán gateway -> Manager Check-in QR -> Hoàn thành dịch vụ & Tích điểm.

### 2.2 Quy ước Phân loại & Mức độ ưu tiên (Priority Levels)
- **P0 (Critical)**: Các chức năng cốt lõi bắt buộc phải hoạt động đúng (Đăng nhập/Đăng ký, Đặt lịch, Thanh toán, Phân quyền RBAC, Check-in QR).
- **P1 (High)**: Các chức năng chính ảnh hưởng trực tiếp đến trải nghiệm (Tích điểm, Áp dụng Voucher, Gói Slot Pack, Đặt lịch định kỳ, Cron Job nhắc nhở).
- **P2 (Medium)**: Chức năng phụ hỗ trợ (Chatbot AI, Đánh giá/Feedback, Tìm kiếm chi nhánh trên bản đồ, Đổi quà).
- **P3 (Low)**: Giao diện UI/UX, thông báo phụ, hiển thị thống kê nâng cao.

---

## 3. MA TRẬN PHÂN QUYỀN VÀ BẢO MẬT (RBAC MATRIX)

| API / Feature Area | Anonymous / Public | Customer | Manager | Admin |
| :--- | :---: | :---: | :---: | :---: |
| Đăng ký / Đăng nhập / Refresh Token | ✅ | ✅ | ✅ | ✅ |
| Xem danh sách Chi nhánh & Gói dịch vụ | ✅ | ✅ | ✅ | ✅ |
| Quản lý Xe của tôi (`/api/vehicles`) | ❌ | ✅ (Chỉ xe của mình) | ❌ | ✅ (Toàn quyền) |
| Đặt lịch rửa xe (`/api/bookings`) | ❌ | ✅ (Tạo/Hủy lịch mình) | ✅ (Duyệt/Check-in/Done tại chi nhánh) | ✅ (Toàn quyền hệ thống) |
| Mua & Sử dụng Gói Slot (`/api/slot-packs`) | ❌ | ✅ | ✅ (Tra cứu/Xác nhận) | ✅ |
| Thanh toán VNPay / MoMo (`/api/payments`) | ❌ | ✅ | ✅ (Duyệt mặt tiền/Tiền mặt) | ✅ |
| Quản lý Mã giảm giá (`/api/vouchers`) | ❌ (Chỉ validate) | ✅ (Redeem/Sử dụng) | ✅ (Tạo cho chi nhánh) | ✅ (Tạo cho toàn hệ thống) |
| Quản lý Chi nhánh & Nhân sự | ❌ | ❌ | ❌ (Chỉ xem chi nhánh mình) | ✅ (CRUD toàn bộ) |
| Báo cáo doanh thu & Analytics | ❌ | ❌ | ✅ (Chi nhánh mình) | ✅ (Toàn hệ thống) |

---

## 4. BỘ TEST CASE BỘ PHẬN BACKEND API (BE)

### 4.1 Phân hệ Xác thực & Người dùng (Auth & Users)

| Test Case ID | Tên Test Case | Mô tả / Thao tác | Đổi với Preconditions | Kết quả kỳ vọng (Expected Result) | Type / Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-BE-AUTH-001** | Đăng ký tài khoản Customer hợp lệ | POST `/api/auth/register` với email, password, fullName, phone đầy đủ | Email và phone chưa tồn tại trong DB | Trả về `201 Created`, tạo user mới role `customer`, hash password bcrypt, nhận JWT token | Functional / P0 |
| **TC-BE-AUTH-002** | Đăng ký với Email đã tồn tại | POST `/api/auth/register` với email bị trùng | Email đã có trong hệ thống | Trả về `400 Bad Request`, message "Email đã được sử dụng" | Boundary/Edge / P0 |
| **TC-BE-AUTH-003** | Đăng ký sai định dạng Số điện thoại | POST `/api/auth/register` với phone = "abc12345" | Không có | Trả về `400 Bad Request`, báo lỗi validation từ express-validator | Validation / P1 |
| **TC-BE-AUTH-004** | Đăng nhập thành công trả về Access & Refresh Token | POST `/api/auth/login` với email và password chính xác | User đã active | Trả về `200 OK`, token JWT access (hạn 15m), refresh token (hạn 7d), thông tin user | Functional / P0 |
| **TC-BE-AUTH-005** | Đăng nhập sai Mật khẩu | POST `/api/auth/login` với mật khẩu sai | Account tồn tại | Trả về `401 Unauthorized`, không cấp JWT token | Security / P0 |
| **TC-BE-AUTH-006** | Làm mới token với Refresh Token hợp lệ | POST `/api/auth/refresh-token` gửi body `{ refreshToken }` | Refresh Token hợp lệ và chưa hết hạn | Trả về `200 OK` đi kèm Access Token mới | Functional / P1 |
| **TC-BE-AUTH-007** | Đổi mật khẩu tài khoản | PUT `/api/auth/change-password` với `oldPassword` và `newPassword` | Đã Auth JWT Header | Trả về `200 OK`, mật khẩu trong DB được cập nhật hash mới | Functional / P1 |
| **TC-BE-AUTH-008** | Lấy thông tin cá nhân Profile | GET `/api/auth/me` gửi Bearer Token | Token hợp lệ | Trả về `200 OK`, object user thông tin chi tiết: tier, loyaltyPoints, avatar, role | Functional / P1 |
| **TC-BE-AUTH-009** | Admin lấy danh sách User có phân trang | GET `/api/auth/users?page=1&limit=10&role=customer` | Auth Bearer Token Admin | Trả về `200 OK`, array users + pagination metadata | Functional / P1 |
| **TC-BE-AUTH-010** | Customer cố tình gọi API Admin danh sách User | GET `/api/auth/users` | Auth Bearer Token Customer | Trả về `403 Forbidden`, từ chối truy cập | Security / P0 |

---

### 4.2 Phân hệ Quản lý Xe (Vehicles API)

| Test Case ID | Tên Test Case | Mô tả / Thao tác | Preconditions | Kết quả kỳ vọng (Expected Result) | Type / Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-BE-VEH-001** | Thêm mới phương tiện hợp lệ | POST `/api/vehicles` với `{ licensePlate: "59A-123.45", vehicleType: "SUV", brand: "Toyota", model: "Fortuner", color: "Black" }` | Auth Customer Token | Trả về `201 Created`, xe được gắn đúng `userId` của khách hàng | Functional / P0 |
| **TC-BE-VEH-002** | Thêm xe bị trùng Biển số của cùng khách | POST `/api/vehicles` biển số đã tạo trước đó | Customer đã có xe biển "59A-123.45" | Trả về `400 Bad Request` báo biển số xe đã đăng ký | Edge Case / P1 |
| **TC-BE-VEH-003** | Lấy danh sách xe của chính mình | GET `/api/vehicles` | Customer có 2 xe trong DB | Trả về `200 OK`, mảng 2 xe ứng với customer | Functional / P0 |
| **TC-BE-VEH-004** | Cập nhật thông tin xe | PUT `/api/vehicles/:id` thay đổi thông tin `color`, `model` | Xe thuộc sở hữu của Customer | Trả về `200 OK`, dữ liệu xe được cập nhật | Functional / P1 |
| **TC-BE-VEH-005** | Xóa xe thuộc sở hữu người khác | DELETE `/api/vehicles/:id` với `id` của Xe thuộc User B | Access Token của User A | Trả về `403 Forbidden` hoặc `404 Not Found`, không được xóa xe người khác | Security / P0 |

---

### 4.3 Phân hệ Chi nhánh & Gói Dịch vụ (Branches & Packages)

| Test Case ID | Tên Test Case | Mô tả / Thao tác | Preconditions | Kết quả kỳ vọng (Expected Result) | Type / Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-BE-BRANCH-001** | Lấy danh sách Chi nhánh công khai | GET `/api/branches` | Public API | Trả về `200 OK`, danh sách các chi nhánh đang active kèm tọa độ GeoJSON | Functional / P0 |
| **TC-BE-BRANCH-002** | Tìm chi nhánh gần nhất theo vị trí GeoJSON | GET `/api/branches/nearby?lat=10.841&lng=106.809&distance=5000` | Public API | Trả về `200 OK`, danh sách chi nhánh trong bán kính 5km sắp xếp theo khoảng cách | Functional / P1 |
| **TC-BE-BRANCH-003** | Admin tạo mới chi nhánh | POST `/api/branches` | Bearer Token Admin | Trả về `201 Created`, chi nhánh lưu vào DB thành công | Functional / P0 |
| **TC-BE-BRANCH-004** | Manager sửa thông tin chi nhánh không thuộc quản lý | PUT `/api/branches/:id` | Manager thuộc Chi nhánh A cố sửa Chi nhánh B | Trả về `403 Forbidden` | Security / P0 |
| **TC-BE-PKG-001** | Lấy danh sách Gói dịch vụ theo loại xe | GET `/api/packages?vehicleType=SUV` | Public API | Trả về `200 OK`, các gói dịch vụ tương thích với dòng xe SUV và sub-services đi kèm | Functional / P0 |
| **TC-BE-PKG-002** | Admin cập nhật bảng giá gói dịch vụ | PUT `/api/packages/:id` với `price` mới | Token Admin | Trả về `200 OK`, giá gói rửa xe cập nhật chính xác | Functional / P1 |

---

### 4.4 Phân hệ Quản lý Đặt lịch & Luồng Nghiệp vụ (Booking Management)

| Test Case ID | Tên Test Case | Mô tả / Thao tác | Preconditions | Kết quả kỳ vọng (Expected Result) | Type / Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-BE-BOOK-001** | Tạo đặt lịch Đơn (Single Booking) thành công | POST `/api/bookings` với body `{ branchId, packageId, vehicleId, bookingDate, timeSlot, paymentMethod: "cash" }` | Slot thời gian còn trống, Xe hợp lệ | Trả về `201 Created`, booking có status `pending`, mã QR bookingCode ngẫu nhiên duy nhất được tạo | Functional / P0 |
| **TC-BE-BOOK-002** | Đặt lịch trùng khung giờ / trùng cầu rửa (Overbooking Check) | POST `/api/bookings` chọn khung giờ đã hết capacity của Chi nhánh | Khung giờ đã đạt max Parallel Bookings | Trả về `400 Bad Request`, thông báo "Khung giờ đã đầy, vui lòng chọn giờ khác" | Business Rule / P0 |
| **TC-BE-BOOK-003** | Đặt lịch sử dụng Mã Voucher giảm giá | POST `/api/bookings` kèm `voucherCode` hợp lệ | Voucher giảm 20% còn hạn | Giá finalPrice được trừ đúng 20%, tạo booking thành công, lưu thông tin voucher trong booking | Functional / P0 |
| **TC-BE-BOOK-004** | Đặt lịch Định kỳ (Recurring Booking) | POST `/api/bookings/recurring` với `recurringDays: ["Monday", "Thursday"]`, `startDate`, `weeksCount: 4` | Slot các ngày khả dụng | Trả về `201 Created`, tạo mảng các sub-bookings cho 4 tuần tới | Functional / P1 |
| **TC-BE-BOOK-005** | Đặt lịch bằng Gói Slot Prepaid | POST `/api/bookings` với `bookingType: "slot_pack"` và `slotPackId` | Slot pack còn `remainingSlots > 0` | Trả về `201 Created`, `finalPrice = 0`, giảm `remainingSlots` đi 1 | Business Rule / P0 |
| **TC-BE-BOOK-006** | Đặt lịch bằng Slot Pack đã hết số lần rửa | POST `/api/bookings` với `slotPackId` có `remainingSlots = 0` | Slot pack hết lượt | Trả về `400 Bad Request`, báo "Gói slot đã sử dụng hết lượt rửa" | Edge Case / P0 |
| **TC-BE-BOOK-007** | Manager Xác nhận đặt lịch | PATCH `/api/bookings/:id/status` với `{ status: "confirmed" }` | Token Manager chi nhánh đó | Booking chuyển trạng thái `pending` -> `confirmed`, bắn thông báo SSE tới Khách | State Machine / P0 |
| **TC-BE-BOOK-008** | Quét QR Code / Check-in khách hàng tại tiệm | POST `/api/bookings/check-in` với body `{ bookingCode }` | Token Manager, Booking đang `confirmed` | Trạng thái chuyển `checked_in`, ghi nhận thời gian `checkInAt` | State Machine / P0 |
| **TC-BE-BOOK-009** | Bắt đầu làm dịch vụ rửa xe | PATCH `/api/bookings/:id/status` với `{ status: "in_progress" }` | Booking đang `checked_in` | Trạng thái chuyển `in_progress` | State Machine / P1 |
| **TC-BE-BOOK-010** | Hoàn thành dịch vụ rửa xe & Tích điểm Tier | PATCH `/api/bookings/:id/status` với `{ status: "completed" }` | Booking đang `in_progress` | Trạng thái chuyển `completed`, tự động cộng `loyaltyPoints` cho Khách dựa trên `finalPrice` | Business Rule / P0 |
| **TC-BE-BOOK-011** | Khách hàng Hủy lịch trước giờ hẹn | POST `/api/bookings/:id/cancel` kèm `reason` | Hủy trước 2 tiếng theo quy định | Booking đổi thành `cancelled`, cập nhật trạng thái hoàn tiền (nếu có thanh toán trước) | Functional / P0 |
| **TC-BE-BOOK-012** | Khách hàng Hủy lịch trễ (Sát giờ hẹn < 30m) | POST `/api/bookings/:id/cancel` sát giờ | Hủy sát giờ quy định | Trả về `400 Bad Request` hoặc tính phí phạt hủy trễ theo chính sách | Edge Case / P1 |
| **TC-BE-BOOK-013** | Đánh giá & Phản hồi sau khi hoàn thành | POST `/api/bookings/:id/feedback` với `{ rating: 5, comment: "Rất sạch!" }` | Booking đã `completed` | Trả về `201 Created`, lưu Feedback, tính lại avg rating cho Chi nhánh | Functional / P1 |
| **TC-BE-BOOK-014** | Đánh giá lại lần 2 cho cùng 1 booking | POST `/api/bookings/:id/feedback` lần 2 | Booking đã có feedback | Trả về `400 Bad Request` báo đã đánh giá | Edge Case / P2 |

---

### 4.5 Phân hệ Thanh toán & Cổng Thanh toán (Payments & Refund)

| Test Case ID | Tên Test Case | Mô tả / Thao tác | Preconditions | Kết quả kỳ vọng (Expected Result) | Type / Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-BE-PAY-001** | Khởi tạo URL Thanh toán VNPay | POST `/api/payments/create-url` với `{ bookingId, paymentGateway: "vnpay" }` | Booking đang `pending` | Trả về `200 OK` chứa link `paymentUrl` hợp lệ của VNPay sandbox | Integration / P0 |
| **TC-BE-PAY-002** | Xử lý VNPay Return/IPN thành công | GET `/api/payments/vnpay-return` với querystring checksum đúng từ VNPay (`vnp_ResponseCode=00`) | Giao dịch VNPay thành công | Cập nhật Payment `status = "success"`, Booking `status = "confirmed"`, trả về trang thành công | Integration / P0 |
| **TC-BE-PAY-003** | Xử lý VNPay Return thất bại (Khách hủy giao dịch) | GET `/api/payments/vnpay-return` với `vnp_ResponseCode=24` | Khách bấm hủy trên cổng VNPay | Cập nhật Payment `status = "failed"`, Booking giữ nguyên `pending` hoặc `cancelled` | Integration / P0 |
| **TC-BE-PAY-004** | Kiểm tra Checksum VNPay giả mạo | GET `/api/payments/vnpay-return` thay đổi số tiền `vnp_Amount` nhưng giữ checksum cũ | Hack parameter | Trả về `400 Bad Request` "Invalid Checksum", từ chối cập nhật DB | Security / P0 |
| **TC-BE-PAY-005** | Khởi tạo URL Thanh toán MoMo | POST `/api/payments/create-url` với `paymentGateway: "momo"` | Booking hợp lệ | Trả về `200 OK` chứa `payUrl` của MoMo | Integration / P0 |
| **TC-BE-PAY-006** | Khách tạo Yêu cầu Hoàn tiền (Refund Request) | POST `/api/refund-requests` với `{ bookingId, reason: "Đã hủy lịch hợp lệ" }` | Booking hủy hợp lệ đã thanh toán VNPay | Trả về `201 Created`, trạng thái yêu cầu refund `pending_approval` | Functional / P1 |
| **TC-BE-PAY-007** | Admin Duyệt Refund Request | PUT `/api/refund-requests/:id/approve` | Token Admin | Chuyển refund status `approved`, kích hoạt API refund của cổng thanh toán / ghi nhận giao dịch chi | Functional / P1 |

---

### 4.6 Phân hệ Voucher, Đổi điểm & Slot Packs

| Test Case ID | Tên Test Case | Mô tả / Thao tác | Preconditions | Kết quả kỳ vọng (Expected Result) | Type / Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-BE-VOUCH-001** | Kiểm tra Mã Voucher hợp lệ (Validate Voucher) | POST `/api/vouchers/validate` với `{ code: "WASH20", amount: 200000, branchId, packageId }` | Voucher đang active, còn lượt dùng | Trả về `200 OK`, số tiền được giảm `discountAmount` | Functional / P0 |
| **TC-BE-VOUCH-002** | Validate Voucher đã hết hạn | POST `/api/vouchers/validate` với mã có `endDate < today` | Voucher hết hạn | Trả về `400 Bad Request` "Mã giảm giá đã hết hạn sử dụng" | Boundary / P1 |
| **TC-BE-VOUCH-003** | Validate Voucher không đủ Giá trị đơn hàng tối thiểu | POST `/api/vouchers/validate` với `amount < minOrderValue` | Đơn hàng 100k, Voucher yêu cầu đơn >= 200k | Trả về `400 Bad Request` "Đơn hàng chưa đạt giá trị tối thiểu" | Business Rule / P1 |
| **TC-BE-VOUCH-004** | Đổi Điểm Thưởng lấy Voucher (Redeem Points) | POST `/api/vouchers/redeem` gửi `{ giftId: "VOUCHER_50K" }` | Customer có 200 điểm (Gift tốn 100 điểm) | Trừ 100 điểm của Customer, lưu `PointHistory`, tạo Voucher cá nhân cho Khách | Business Rule / P0 |
| **TC-BE-VOUCH-005** | Đổi Điểm Thưởng khi không đủ Điểm | POST `/api/vouchers/redeem` | Customer chỉ có 20 điểm (Gift tốn 100 điểm) | Trả về `400 Bad Request` "Điểm thưởng không đủ để quy đổi" | Edge Case / P1 |
| **TC-BE-SLOT-001** | Mua Gói Slot Prepaid rửa xe thành công | POST `/api/slot-packs/purchase` với `{ slotProductId: "PACK_10_SLOTS", paymentMethod: "vnpay" }` | Customer đã đăng nhập | Trả về URL thanh toán mua gói slot pack | Functional / P0 |
| **TC-BE-SLOT-002** | Giảm giá Gói Slot theo Hạng Thành viên (Tier Discount) | Mua Gói Slot với User hạng `Gold` | Hạng Gold được discount 10% | Giá tiền mua Slot Pack tự động giảm 10% theo tier | Business Rule / P1 |

---

### 4.7 Phân hệ Cron Jobs, Chatbot AI & Thông báo Real-time (SSE)

| Test Case ID | Tên Test Case | Mô tả / Thao tác | Preconditions | Kết quả kỳ vọng (Expected Result) | Type / Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-BE-CRON-001** | Cron Job Nhắc nhở Đặt lịch (Reminder Job) | Trigger job chạy tự động mỗi 5 phút | Có booking diễn ra sau 60 phút nữa | Hệ thống tự động tạo Notification & bắn tin qua SSE nhắc khách hàng | System / P1 |
| **TC-BE-CRON-002** | Cron Job Tự động Hủy Đặt lịch trễ (Auto-Cancel Job) | Trigger job kiểm tra booking | Booking quá 30 phút so với giờ hẹn mà chưa `checked_in` | Booking tự động đổi status thành `cancelled` với lý do "Khách không đến đúng giờ" | System / P1 |
| **TC-BE-CRON-003** | Cron Job Tặng Voucher Sinh nhật (Birthday Job) | Trigger job lúc 8:00 AM hàng ngày | User có ngày sinh trùng với hôm nay | Tự động tạo Voucher 20% sinh nhật gửi vào kho voucher của user | System / P2 |
| **TC-BE-CHAT-001** | Chatbot AI trả lời thắc mắc gói dịch vụ | POST `/api/chat` với câu hỏi "Giá gói rửa xe cao cấp là bao nhiêu?" | Token Gemini AI khả dụng | Chatbot sử dụng dữ liệu DB để trả lời chính xác thông tin gói rửa xe | AI Integration / P2 |
| **TC-BE-SSE-001** | Kết nối Stream Thông báo Real-time SSE | GET `/api/sse/events` kèm Bearer Token | Client duy trì kết nối EventSource | Trả về header `text/event-stream`, nhận message thông báo tức thì khi status booking thay đổi | Real-time / P1 |

---

## 5. BỘ TEST CASE BỘ PHẬN FRONTEND WEB (FE)

### 5.1 Customer Portal (Trang Khách hàng Web)

| Test Case ID | Tên Test Case | Giao diện / Trang | Thao tác Kiểm thử | Kết quả kỳ vọng (Expected Result) | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-FE-CUST-001** | Hiển thị Trang chủ Landing Page | Landing Page (`/`) | Truy cập trang chủ, cuộn xem Hero, Services, Branch Map, Testimonials | Hiển thị mượt mà, đầy đủ hình ảnh banner, bản đồ MapLibre tải đúng vị trí các chi nhánh | P1 |
| **TC-FE-CUST-002** | Mở Modal Đăng nhập / Đăng ký | Header -> Button "Đăng nhập" | Click vào nút "Đăng nhập" trên thanh Navigation | Modal AuthScreen hiển thị, chuyển đổi linh hoạt giữa tab Đăng nhập và Đăng ký | P0 |
| **TC-FE-CUST-003** | Luồng Đặt lịch rửa xe 4 bước (Booking Wizard) | Trang Đặt lịch (`/booking`) | Bước 1: Chọn Xe -> Bước 2: Chọn Chi nhánh & Dịch vụ -> Bước 3: Chọn Ngày/Giờ -> Bước 4: Chọn Voucher & Thanh toán | Giao diện phản hồi chính xác, tính toán tổng tiền realtime, hiển thị voucher áp dụng thành công | P0 |
| **TC-FE-CUST-004** | Đặt lịch khi chưa Thêm xe nào | Step 1 Booking Wizard | Customer mới tạo tài khoản chưa có xe | Hệ thống gợi ý Modal "Thêm xe mới", không cho tiếp tục nếu chưa chọn xe | P0 |
| **TC-FE-CUST-005** | Luồng Mua Gói Slot Prepaid | Trang Slot Packs (`/slot-packs`) | Chọn gói 10 lần rửa -> Chọn phương thức VNPay -> Bấm "Thanh toán" | Chuyển hướng chính xác sang cổng thanh toán VNPay, quay về cập nhật số slot trong kho | P1 |
| **TC-FE-CUST-006** | Xem Lịch sử Đặt lịch & Mã QR Check-in | Trang Lịch sử (`/history`) | Vào tab "Đặt lịch của tôi", bấm xem chi tiết booking `confirmed` | Hiển thị rõ trạng thái, thời gian, và Mã QR Code hiển thị để đem tới tiệm | P0 |
| **TC-FE-CUST-007** | Hủy Đặt lịch từ Giao diện Khách | Trang Lịch sử (`/history`) | Bấm nút "Hủy lịch" trên booking `pending` | Modal xác nhận lý do hủy mở ra, gửi request hủy thành công, UI cập nhật badge `Cancelled` | P1 |
| **TC-FE-CUST-008** | Trang Đổi quà & Điểm tích lũy (Loyalty) | Trang Rewards (`/rewards`) | Xem số điểm hiện có (ví dụ 300 điểm), bấm "Đổi ngay" Voucher 50k | Điểm trừ trực tiếp trên UI, voucher mới xuất hiện trong kho Voucher của tôi | P1 |
| **TC-FE-CUST-009** | Tương tác Widget Chatbot AI | Bottom-right Floating Chat | Click icon Chatbot -> Gửi câu hỏi "Chi nhánh Q9 mở cửa đến mấy giờ?" | Popup chat hiển thị tin nhắn phản hồi từ Gemini AI nhanh chóng | P2 |

---

### 5.2 Manager Portal (Trang Quản lý Chi nhánh Web)

| Test Case ID | Tên Test Case | Giao diện / Trang | Thao tác Kiểm thử | Kết quả kỳ vọng (Expected Result) | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-FE-MGR-001** | Dashboard Tổng quan Chi nhánh | Manager Dashboard (`/manager`) | Đăng nhập tài khoản Manager chi nhánh Q9 | Hiển thị đúng số liệu chi nhánh Q9: Đơn hôm nay, Doanh thu ngày, Số xe đang rửa | P0 |
| **TC-FE-MGR-002** | Xem Lịch trình công việc hàng ngày (Daily Schedule) | Schedule (`/manager/schedule`) | Chuyển giữa các ngày trên Calendar view | Hiển thị khung giờ rửa xe, danh sách xe đã đặt theo từng slot giờ | P1 |
| **TC-FE-MGR-003** | Quản lý & Chuyển trạng thái Đặt lịch | Bookings Board (`/manager/bookings`) | Chuyển trạng thái đơn từ `confirmed` -> `checked_in` -> `in_progress` -> `completed` | UI cập nhật badge màu sắc tương ứng, danh sách tự lọc đúng tab status | P0 |
| **TC-FE-MGR-004** | Quét QR Code Check-in bằng Webcam Web | Quick Check-in (`/manager/qr-scanner`) | Bấm bật Camera Web -> Đưa hình ảnh QR Code của khách vào khung quét | Web scanner đọc đúng `bookingCode`, tự chuyển trạng thái đơn thành `checked_in` kèm âm thanh thông báo | P0 |
| **TC-FE-MGR-005** | Nhập Mã Booking bằng tay khi Scanner hỏng | Quick Check-in (`/manager/quick-checkin`) | Nhập mã `BK-882391` vào ô input -> Bấm "Check-in" | Hệ thống tìm thấy thông tin xe & khách hàng, cho phép bấm Check-in thành công | P1 |
| **TC-FE-MGR-006** | Quản lý Mã giảm giá Chi nhánh | Vouchers (`/manager/vouchers`) | Bấm "Tạo Voucher Mới" cho riêng chi nhánh Q9 | Form tạo thành công, voucher chỉ xuất hiện đối với khách chọn rửa tại Chi nhánh Q9 | P1 |
| **TC-FE-MGR-007** | Xem & Phản hồi Đánh giá từ Khách | Feedbacks (`/manager/feedbacks`) | Xem danh sách đánh giá 1-5 sao của chi nhánh | Manager có thể gửi phản hồi trả lời đánh giá của khách hàng | P2 |

---

### 5.3 Admin Portal (Trang Thượng tầng Quản trị Web)

| Test Case ID | Tên Test Case | Giao diện / Trang | Thao tác Kiểm thử | Kết quả kỳ vọng (Expected Result) | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-FE-ADM-001** | Báo cáo Thống kê Doanh thu Toàn chuỗi | Admin Overview (`/admin`) | Xem biểu đồ Recharts doanh thu theo tháng, theo chi nhánh | Biểu đồ tải mượt, thể hiện chính xác tổng doanh thu và so sánh tăng trưởng | P0 |
| **TC-FE-ADM-002** | Quản lý Danh sách Chi nhánh toàn hệ thống | Branch Management (`/admin/branches`) | Thêm chi nhánh mới (tên, địa chỉ, chọn vị trí trên bản đồ, số cầu rửa) | Chi nhánh mới lưu vào DB và hiển thị ngay trên bản đồ Landing page | P0 |
| **TC-FE-ADM-003** | Quản lý Người dùng & Phân quyền Tài khoản | User Management (`/admin/users`) | Tìm kiếm user theo tên -> Đổi role từ `customer` thành `manager` | Đổi role thành công, user được cấp quyền truy cập Manager Portal | P0 |
| **TC-FE-ADM-004** | Quản lý Gói dịch vụ Rửa xe & Giá cước | Package Management (`/admin/packages`) | Sửa giá gói "Chăm sóc Toàn diện", thêm Sub-service "Xịt gầm nano" | Cập nhật bảng giá thành công, Khách hàng đặt lịch lập tức thấy giá mới | P1 |
| **TC-FE-ADM-005** | Đối soát Giao dịch Thanh toán | Admin Payments (`/admin/payments`) | Lọc danh sách giao dịch theo cổng VNPay / MoMo / Tiền mặt, xuất file excel | Hiển thị mã giao dịch gateway, trạng thái đối soát khớp 100% | P1 |
| **TC-FE-ADM-006** | Duyệt Yêu cầu Hoàn tiền (Refund Approvals) | Admin Payments (`/admin/payments`) | Chọn yêu cầu hoàn tiền `pending` -> Bấm "Duyệt hoàn tiền" | Đổi trạng thái `approved`, gửi thông báo hoàn tiền đến khách hàng | P1 |

---

## 6. BỘ TEST CASE BỘ PHẬN MOBILE APP (MOBILE)

### 6.1 Authentication & Onboarding trên Mobile

| Test Case ID | Tên Test Case | Màn hình Mobile | Thao tác Kiểm thử | Kết quả kỳ vọng (Expected Result) | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-MOB-AUTH-001** | Đăng nhập trên App Mobile | `app/(auth)/login.tsx` | Nhập Email & Mật khẩu -> Bấm "Đăng nhập" | Lưu JWT vào `expo-secure-store`, chuyển hướng tức thì vào màn hình `(tabs)/index.tsx` | P0 |
| **TC-MOB-AUTH-002** | Tự động Đăng nhập khi mở lại App (Auto-Login) | App Launch | Tắt app hoàn toàn và mở lại | App đọc token từ SecureStore, bypass màn login vào thẳng Home Tab | P0 |
| **TC-MOB-AUTH-003** | Đăng xuất tài khoản | Profile Screen | Vào Tab Profile -> Bấm "Đăng xuất" | Xóa token trong SecureStore, quay lại màn hình Login | P1 |

---

### 6.2 Customer Main Flow & Booking trên Mobile

| Test Case ID | Tên Test Case | Màn hình Mobile | Thao tác Kiểm thử | Kết quả kỳ vọng (Expected Result) | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-MOB-BOOK-001** | Trang chủ Khách hàng Mobile | `app/(tabs)/index.tsx` | Hiển thị Banner, Chi nhánh gần bạn, Thẻ thành viên Tier, Nút Quick Book | UI layout phản hồi mượt, các button cảm ứng nhạy trên iOS & Android | P1 |
| **TC-MOB-BOOK-002** | Đặt lịch rửa xe nhanh trên App Mobile | `app/(tabs)/booking.tsx` | Chọn xe -> Chọn chi nhánh -> Chọn slot giờ -> Bấm "Xác nhận đặt lịch" | Tạo đặt lịch thành công, hiển thị màn hình chúc mừng kèm mã QR booking | P0 |
| **TC-MOB-BOOK-003** | Quản lý Phương tiện cá nhân | `app/vehicle/index.tsx` | Thêm xe mới (Nhập biển số 51H-999.99, chọn hãng Audi) | Xe mới xuất hiện trong danh sách xe để chọn khi đặt lịch rửa | P1 |
| **TC-MOB-BOOK-004** | Hiển thị Mã QR Code Check-in trên Mobile | `app/history/index.tsx` | Vào Tab Lịch sử -> Chọn booking đang `confirmed` | Mã QR render nét qua `react-native-qrcode-svg`, tăng độ sáng màn hình tự động | P0 |

---

### 6.3 Payment, Slot Packs & Loyalty trên Mobile

| Test Case ID | Tên Test Case | Màn hình Mobile | Thao tác Kiểm thử | Kết quả kỳ vọng (Expected Result) | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-MOB-PAY-001** | Thanh toán VNPay qua In-App Browser (WebBrowser) | `app/payment/index.tsx` | Chọn thanh toán VNPay -> Bấm "Thanh toán" | Mở `Expo.WebBrowser` chứa cổng VNPay, sau khi thanh toán xong deep link tự quay lại App | P0 |
| **TC-MOB-PAY-002** | Mua & Xem Kho Gói Slot Prepaid | `app/slot-packs.tsx` | Mua gói 5 lần rửa xe -> Xem danh sách gói slot đang sở hữu | Thẻ Gói Slot hiển thị đúng số lượt còn lại (ví dụ 5/5 slot) | P1 |
| **TC-MOB-REW-001** | Xem Điểm Thưởng & Đổi Voucher trên Mobile | `app/(tabs)/rewards.tsx` | Xem vòng tròn tiến trình Hạng thành viên, danh sách quà đổi | Nhấn đổi quà thành công, nhận voucher tức thì | P1 |

---

### 6.4 QR Check-in & System Utilities cho Nhân viên/Manager

| Test Case ID | Tên Test Case | Màn hình Mobile | Thao tác Kiểm thử | Kết quả kỳ vọng (Expected Result) | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-MOB-QR-001** | Scan QR Check-in bằng Camera Điện thoại | `app/checkin/index.tsx` | Đăng nhập tài khoản Manager -> Mở Camera Scan QR | Camera quét QR Code của khách mượt mà, lập tức xác nhận Check-in thành công | P0 |
| **TC-MOB-SYS-001** | Xử lý Mất kết nối Internet (Offline State) | Toàn ứng dụng Mobile | Ngắt Wifi/Mobile Data -> Thao tác đặt lịch | App hiển thị Banner Alert "Không có kết nối Internet", chặn gửi request gây crash | Edge Case / P1 |
| **TC-MOB-SYS-002** | Nhận Push Notification real-time | Background / Foreground | Backend phát sự kiện SSE / Push Notif | App xuất hiện Notif popup trên thanh thông báo điện thoại | P1 |

---

## 7. TỔNG HỢP LỖI PHÁT HIỆN QUA AUDIT & ĐỀ XUẤT TỰ ĐỘNG HÓA

### 7.1 Danh sách Lỗi cần khắc phục ngay (Critical Audit Fixes)

> [!WARNING]  
> **Lỗi API Endpoint Mismatch tại Frontend Web**:
> 1. `LoyaltyGifts.jsx`: Đang gọi nhầm `GET /vouchers` (Endpoint Admin - Yêu cầu role Admin) thay vì `GET /vouchers/available` -> Dẫn đến lỗi `403 Forbidden` khi Khách hàng vào đổi quà.  
> *Khắc phục*: Sửa route fetch trong component `LoyaltyGifts.jsx` thành `/api/vouchers/available`.
> 2. **Thiếu Form Quản lý Thanh toán & Tạo Voucher cho Admin**: Trang Admin hiện chưa có modal GUI để tạo nhanh Voucher toàn hệ thống.

### 7.2 Khuyến nghị Bộ công cụ Kiểm thử Tự động (Automation Suite Roadmap)

1. **Backend Integration Testing**: Viết Jest + Supertest test scripts tự động chạy trong `BE/__tests__/` cho tất cả 69+ Endpoints API để kiểm tra Status Code, JSON Response Schema và Database State.
2. **Frontend E2E Testing**: Cấu hình **Playwright** hoặc **Cypress** giả lập luồng Khách hàng đặt lịch từ Web -> VNPay Sandbox -> Manager Check-in.
3. **Mobile Testing**: Sử dụng **Detox** hoặc **Maestro** cho regression test ứng dụng Expo React Native trên iOS Simulator & Android Emulator.

---
*Tài liệu Báo cáo Kiểm thử AutoWashPro đã hoàn tất và sẵn sàng phục vụ nghiệm thu dự án.*
