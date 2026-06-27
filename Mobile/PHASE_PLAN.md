# AutoWashPro Mobile App - Kế hoạch Phân Giai Đoạn

## Tổng quan kiến trúc

```
Mobile App (React Native + Expo)
├── app/                    # Expo Router - File-based routing
│   ├── (auth)/            # Auth screens
│   ├── (tabs)/            # Tab navigation
│   └── booking/           # Booking stack
├── src/
│   ├── api/               # 11 API service modules
│   ├── components/         # Reusable UI components
│   ├── contexts/           # AuthContext, BookingContext
│   ├── hooks/             # Custom hooks
│   ├── theme/             # Design system
│   ├── types/             # TypeScript definitions
│   └── utils/             # Helpers
└── app.json
```

---

## TOÀN BỘ API ENDPOINTS (69 endpoints)

### Auth APIs (10 endpoints)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | public | Đăng ký tài khoản mới |
| POST | `/auth/login` | public | Đăng nhập (email/phone + password) |
| POST | `/auth/refresh-token` | public | Làm mới access token |
| POST | `/auth/logout` | JWT | Đăng xuất |
| GET | `/auth/profile` | JWT | Lấy thông tin profile |
| PUT | `/auth/profile` | JWT | Cập nhật profile |
| GET | `/auth/customer/profile` | JWT | Lấy profile + vehicles |
| PUT | `/auth/customer/profile` | JWT | Cập nhật profile + vehicles |
| POST | `/auth/change-password` | JWT | Đổi mật khẩu |

### Vehicle APIs (5 endpoints)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/vehicles` | JWT | Danh sách xe của user |
| POST | `/vehicles` | JWT | Thêm xe mới |
| GET | `/vehicles/:id` | JWT | Chi tiết xe |
| PUT | `/vehicles/:id` | JWT | Cập nhật xe |
| DELETE | `/vehicles/:id` | JWT | Xóa xe |

### Branch APIs (3 endpoints - Customer)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/branches/public` | public | Danh sách chi nhánh (public) |
| GET | `/branches` | JWT | Danh sách chi nhánh (full) |
| GET | `/branches/:id` | JWT | Chi tiết chi nhánh |

### Package APIs (2 endpoints - Customer)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/packages` | public | Danh sách gói dịch vụ |
| GET | `/packages/:id` | JWT | Chi tiết gói dịch vụ |

### Booking APIs (16 endpoints)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/bookings` | JWT | Tạo booking mới |
| POST | `/bookings/recurring` | JWT | Tạo booking định kỳ |
| POST | `/bookings/recurring/:groupId/cancel` | JWT | Hủy booking định kỳ |
| GET | `/bookings/my` | JWT | Danh sách booking của tôi |
| GET | `/bookings/slots` | public | Lấy slots trống |
| GET | `/bookings/:id` | JWT | Chi tiết booking |
| POST | `/bookings/:id/cancel` | JWT | Hủy booking |
| PATCH | `/bookings/:id/feedback` | JWT | Đánh giá booking |
| POST | `/bookings/:id/rebook` | JWT | Đặt lại từ booking cũ |
| GET | `/bookings/:id/qr` | JWT | Lấy QR code check-in |

### Payment APIs (6 endpoints)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payments` | JWT | Tạo thanh toán |
| GET | `/payments/my` | JWT | Lịch sử thanh toán của tôi |
| GET | `/payments/booking/:bookingId` | JWT | Chi tiết thanh toán |

### Voucher APIs (11 endpoints)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/vouchers/me` | JWT | Voucher đã sử dụng của tôi |
| GET | `/vouchers/available` | JWT | Voucher khả dụng |
| GET | `/vouchers/:id` | JWT | Chi tiết voucher |
| GET | `/vouchers/code/:code` | JWT | Tìm voucher theo mã |
| POST | `/vouchers/validate` | JWT | Validate voucher code |
| POST | `/vouchers/reserve` | JWT | Reserve voucher |
| POST | `/vouchers/rollback` | JWT | Rollback reservation |
| POST | `/vouchers/redeem-points` | JWT | Đổi điểm lấy voucher |

### Slot Pack APIs (7 endpoints)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/slot-packs/preview` | public | Preview chiết khấu |
| POST | `/slot-packs` | JWT | Mua gói slot |
| GET | `/slot-packs/my` | JWT | Danh sách gói slot của tôi |
| GET | `/slot-packs/:id` | JWT | Chi tiết gói slot |
| POST | `/slot-packs/:id/cancel` | JWT | Hủy gói slot |

### Notification APIs (6 endpoints)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | JWT | Danh sách thông báo |
| GET | `/notifications/unread-count` | JWT | Số thông báo chưa đọc |
| PATCH | `/notifications/read-all` | JWT | Đánh dấu tất cả đã đọc |
| PATCH | `/notifications/:id/read` | JWT | Đánh dấu 1 đã đọc |
| DELETE | `/notifications/:id` | JWT | Xóa 1 thông báo |
| DELETE | `/notifications` | JWT | Xóa tất cả |

### Public APIs (5 endpoints)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/stats/public` | public | Thống kê công khai |
| GET | `/gifts/public` | public | Danh sách quà tặng |
| GET | `/slot-products/public` | public | Sản phẩm slot |
| GET | `/testimonials` | public | Testimonials |
| POST | `/chat/message` | public | Chatbot |

---

## 12 GIAI ĐOẠN TRIỂN KHAI

### Phase 1: Setup Project & Foundation
**Mục tiêu**: Tạo project structure, setup dependencies, theme system

- [ ] Initialize Expo project với TypeScript
- [ ] Install dependencies (expo-router, navigation, axios, etc.)
- [ ] Setup `app.json` và Expo Router
- [ ] Theme system (colors, typography, spacing)
- [ ] Base UI components (Button, Text, Input, Card, Badge, Loading)

### Phase 2: API Layer - Tất cả Service Functions
**Mục tiêu**: Implement 100% API integration, type-safe

- [ ] API Client Core (axios instance, interceptors, error handling)
- [ ] Auth Service (10 functions)
- [ ] Vehicle Service (5 functions)
- [ ] Branch Service (3 functions)
- [ ] Package Service (2 functions)
- [ ] Booking Service (10 functions)
- [ ] Payment Service (3 functions)
- [ ] Voucher Service (8 functions)
- [ ] SlotPack Service (5 functions)
- [ ] Notification Service (6 functions)
- [ ] Public Service (5 functions)
- [ ] TypeScript types cho tất cả models

### Phase 3: Authentication Flow
**Mục tiêu**: Login, Register, Session management

- [ ] AuthContext (AuthProvider, user state, token management)
- [ ] Login Screen (email/phone, password, validation)
- [ ] Register Screen (name, email, phone, password)
- [ ] Auth Layout với logo/header
- [ ] Root Layout với AuthProvider
- [ ] Protected routes redirect

### Phase 4: Home/Dashboard & Public APIs
**Mục tiêu**: Home screen với public data display

- [ ] Tab Navigation (5 tabs)
- [ ] Home Screen (welcome, stats, featured packages)
- [ ] Services/Packages Screen
- [ ] Branches List/Map

### Phase 5: Booking Flow - Core Feature
**Mục tiêu**: Complete booking flow từ đầu đến cuối

- [ ] BookingContext (form state, price calculation)
- [ ] Step 1: Select Branch
- [ ] Step 2: Select Package
- [ ] Step 3: Select Vehicle
- [ ] Step 4: Select Date/Time
- [ ] Step 5: Add-ons & Voucher
- [ ] Step 6: Review & Payment
- [ ] Step 7: Confirmation (booking code + QR)

### Phase 6: Booking Management
**Mục tiêu**: History, Detail, và Actions

- [ ] Booking History Screen (filter by status)
- [ ] Booking Detail Screen
- [ ] Cancel booking
- [ ] Rebook from history
- [ ] Submit feedback (rating + comment)
- [ ] View QR code fullscreen

### Phase 7: Payments Module
**Mục tiêu**: Payment history và details

- [ ] Payment History Screen
- [ ] Payment Detail Screen
- [ ] Payment status display

### Phase 8: Rewards & Vouchers Module
**Mục tiêu**: Loyalty system và voucher management

- [ ] Rewards Screen (points, tier badge)
- [ ] Available Vouchers Tab
- [ ] My Vouchers Tab
- [ ] Voucher Detail Screen
- [ ] Redeem points for voucher
- [ ] Validate voucher

### Phase 9: Vehicle Management
**Mục tiêu**: Full CRUD cho vehicles

- [ ] Vehicle List Screen
- [ ] Add Vehicle Form
- [ ] Edit Vehicle Form
- [ ] Delete Vehicle
- [ ] Set default vehicle

### Phase 10: Profile & Settings
**Mục tiêu**: User profile và settings

- [ ] Profile Screen
- [ ] Edit Profile Screen
- [ ] Change Password Screen
- [ ] Notification Settings

### Phase 11: Notifications Module
**Mục tiêu**: Notification center

- [ ] Notifications List Screen
- [ ] Mark as read
- [ ] Delete notification
- [ ] Tab bar badge với unread count

### Phase 12: Integration Testing & Polish
**Mục tiêu**: Bug fixes, UX polish, testing

- [ ] Full user flow testing
- [ ] Edge cases và error handling
- [ ] Loading states, empty states
- [ ] Performance optimization
- [ ] Final build verification

---

## UI/UX Design System

### Color Palette (Blue-White Theme)
```
Primary:        #1E88E5 (Blue 600) - Main actions
Primary Dark:   #1565C0 (Blue 800) - Pressed states
Primary Light:  #64B5F6 (Blue 300) - Highlights
Secondary:      #0D47A1 (Blue 900) - Dark accents

Background:     #FFFFFF (White)
Surface:        #F5F5F5 (Grey 100)

Text Primary:   #212121 (Grey 900)
Text Secondary: #757575 (Grey 600)

Success:        #4CAF50 (Green)
Warning:        #FF9800 (Orange)
Error:          #F44336 (Red)
```

---

## Testing Checklist per Phase

### Phase 1 - Setup
- [ ] App builds successfully
- [ ] Theme colors apply correctly
- [ ] Basic components render

### Phase 2 - API Layer
- [ ] All API functions exported
- [ ] Types are correct
- [ ] Error handling works

### Phase 3 - Auth
- [ ] Can register new user
- [ ] Can login
- [ ] Token stored securely
- [ ] Logout clears session
- [ ] Protected routes redirect

### Phase 4 - Home
- [ ] Stats load correctly
- [ ] Packages display
- [ ] Pull to refresh works

### Phase 5 - Booking Flow
- [ ] Full flow works
- [ ] QR code generates
- [ ] Voucher validation works

### Phase 6 - Booking Management
- [ ] History loads
- [ ] Can cancel/rebook/feedback

### Phase 7 - Payments
- [ ] Payment history loads

### Phase 8 - Rewards
- [ ] Points display
- [ ] Vouchers list loads

### Phase 9 - Vehicles
- [ ] Full CRUD works

### Phase 10 - Profile
- [ ] Can edit profile
- [ ] Can change password

### Phase 11 - Notifications
- [ ] Notifications load
- [ ] Badge updates

### Phase 12 - Polish
- [ ] All flows work
- [ ] No console errors
