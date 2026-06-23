# API Audit Report — AutoWashPro

> Ngày kiểm tra: 2026-06-23  
> Phương pháp: đọc toàn bộ route files backend + đọc/grep từng file frontend (admin, manager, customer, landing, components chung), cross-reference thủ công từng endpoint.

---

## Tổng quan nhanh

| Role | Bug sai endpoint (lỗi 403) | Thiếu UI / chức năng |
|---|---|---|
| **Admin** | 0 | 14 |
| **User / Customer** | 2 | 9 |

---

## Toàn bộ endpoint backend hiện có

| Nhóm | Method | Endpoint | Quyền |
|---|---|---|---|
| **Auth** | POST | /auth/register | public |
| | POST | /auth/login | public |
| | POST | /auth/refresh-token | public |
| | POST | /auth/logout | authenticated |
| | GET | /auth/profile | authenticated |
| | PUT | /auth/profile | authenticated |
| | GET | /auth/customer/profile | authenticated |
| | PUT | /auth/customer/profile | authenticated |
| | POST | /auth/change-password | authenticated |
| | GET | /auth/users | admin only |
| | POST | /auth/users | admin only |
| | GET | /auth/users/:id | admin only |
| | PUT | /auth/users/:id | admin only |
| | DELETE | /auth/users/:id | admin only |
| **Vehicles** | GET | /vehicles | authenticated |
| | POST | /vehicles | authenticated |
| | GET | /vehicles/:id | authenticated |
| | PUT | /vehicles/:id | authenticated |
| | DELETE | /vehicles/:id | authenticated |
| **Branches** | GET | /branches/public | public |
| | GET | /branches | authenticated |
| | POST | /branches | admin only |
| | GET | /branches/:id | authenticated |
| | PUT | /branches/:id | admin + manager |
| | DELETE | /branches/:id | admin only |
| | PATCH | /branches/:id/status | admin + manager |
| **Packages** | GET | /packages | public |
| | GET | /packages/:id | authenticated |
| | POST | /packages | admin + manager |
| | PUT | /packages/:id | admin + manager |
| | DELETE | /packages/:id | admin + manager |
| **Bookings** | POST | /bookings | customer + admin + manager |
| | POST | /bookings/recurring | customer + admin + manager |
| | POST | /bookings/recurring/:groupId/cancel | customer + admin + manager |
| | GET | /bookings | admin + manager |
| | POST | /bookings/confirm | admin + manager |
| | GET | /bookings/feedbacks | admin + manager |
| | GET | /bookings/customers | admin + manager |
| | GET | /bookings/my | authenticated |
| | GET | /bookings/slots | public |
| | GET | /bookings/:id | authenticated |
| | PUT | /bookings/:id | admin + manager |
| | PATCH | /bookings/:id/status | admin + manager |
| | POST | /bookings/:id/cancel | customer + admin + manager |
| | PATCH | /bookings/:id/feedback | customer only |
| | PATCH | /bookings/:id/feedback/reply | admin + manager |
| | POST | /bookings/:id/rebook | customer only |
| | GET | /bookings/:id/qr | authenticated |
| | DELETE | /bookings/:id | admin only |
| **Payments** | POST | /payments | customer + admin + manager |
| | GET | /payments | admin + manager |
| | GET | /payments/my | authenticated |
| | GET | /payments/booking/:bookingId | customer + admin + manager |
| | POST | /payments/confirm | admin + manager |
| | POST | /payments/refund | admin + manager |
| | POST | /payments/callback | public (payment gateway) |
| **Vouchers** | POST | /vouchers | admin + manager |
| | GET | /vouchers | admin + manager |
| | GET | /vouchers/me | authenticated |
| | GET | /vouchers/available | authenticated |
| | GET | /vouchers/code/:code | authenticated |
| | GET | /vouchers/usage-report | admin + manager |
| | GET | /vouchers/usage/:id | admin + manager |
| | GET | /vouchers/:id | authenticated |
| | PUT | /vouchers/:id | admin + manager |
| | DELETE | /vouchers/:id | admin only |
| | POST | /vouchers/validate | authenticated |
| | POST | /vouchers/redeem-points | authenticated |
| | POST | /vouchers/reserve | authenticated |
| | POST | /vouchers/rollback | authenticated |
| **SlotPacks** | GET | /slot-packs/preview | public |
| | POST | /slot-packs | customer + admin + manager |
| | GET | /slot-packs/my | authenticated |
| | GET | /slot-packs | admin + manager |
| | GET | /slot-packs/code/:code | admin + manager |
| | GET | /slot-packs/:id | authenticated |
| | POST | /slot-packs/:id/use | admin + manager |
| | POST | /slot-packs/:id/cancel | authenticated |
| **Reports** | GET | /reports/revenue | admin + manager |
| **Notifications** | GET | /notifications | authenticated |
| | GET | /notifications/unread-count | authenticated |
| | PATCH | /notifications/read-all | authenticated |
| | PATCH | /notifications/:id/read | authenticated |
| | DELETE | /notifications/:id | authenticated |
| | DELETE | /notifications | authenticated |
| **Chatbot** | POST | /chat/message | public (optional auth) |
| | POST | /chat/clear | public (optional auth) |
| **SSE** | GET | /sse?token=... | authenticated via query param |
| **Public** | GET | /stats/public | public |
| | GET | /gifts/public | public |
| | GET | /slot-products/public | public |
| | GET | /testimonials | public |

---

## ADMIN

### ❌ Gọi sai endpoint (bug sẽ trả lỗi): 0

Không có bug.

---

### ⚠️ Thiếu UI — endpoint có ở backend nhưng admin chưa dùng: 14

| # | Method | Endpoint | Tính năng còn thiếu |
|---|---|---|---|
| 1 | `POST` | `/vouchers` | AdminRewards không có form **Tạo voucher** (chỉ có sửa/xóa) |
| 2 | `GET` | `/payments` | Không có trang **Quản lý thanh toán** |
| 3 | `POST` | `/payments/confirm` | Không có nút xác nhận thanh toán thủ công |
| 4 | `POST` | `/payments/refund` | Không có nút hoàn tiền |
| 5 | `GET` | `/payments/booking/:bookingId` | Không có màn hình chi tiết / hóa đơn thanh toán |
| 6 | `GET` | `/vouchers/usage-report` | Không có màn hình báo cáo tổng hợp voucher |
| 7 | `DELETE` | `/bookings/:id` | AdminBookings chỉ có **Hủy**, không có **Xóa cứng** |
| 8 | `PATCH` | `/bookings/:id/status` | Không có nút đổi trạng thái đơn (checked_in / in_progress / completed…) |
| 9 | `POST` | `/bookings/confirm` | Không có nút **Xác nhận hàng loạt** — chức năng này chỉ có ở manager |
| 10 | `GET` | `/bookings/customers` | Không có trang phân tích khách hàng |
| 11 | `GET` | `/slot-packs/code/:code` | Không có UI tra cứu gói slot bằng mã (chỉ manager QR scanner có) |
| 12 | `POST` | `/slot-packs/:id/use` | Không có UI check-in / dùng slot |
| 13 | `GET` | `/auth/users/:id` | UserManagement không có màn hình **Chi tiết người dùng** |
| 14 | `PUT` | `/bookings/:id` | Không có UI **Chỉnh sửa** nội dung đơn đặt |

### ⚠️ Realtime — SSE có nhưng chưa tận dụng hết

Backend push sự kiện `booking_new` cho admin qua SSE khi có đơn mới, nhưng frontend chỉ tăng badge số thông báo. **Bảng danh sách đơn hàng (AdminBookings, AdminActivity) không tự refresh** — admin phải bấm tải lại thủ công.

---

## USER / CUSTOMER

### ❌ Gọi sai endpoint (bug sẽ trả 403 ngay lập tức): 2

| # | File | Dòng | Đang gọi **(SAI)** | Phải gọi **(ĐÚNG)** | Hậu quả | Trạng thái |
|---|---|---|---|---|---|---|
| 1 | `FE/src/components/customer/BookingsHistory.jsx` | 66 | `GET /bookings` | `GET /bookings/my` | Customer nhận **403** — tab Lịch sử trong BookingFlow trắng hoàn toàn | ✅ Đã sửa |
| 2 | `FE/src/components/customer/LoyaltyGifts.jsx` | 16 | `GET /vouchers` | `GET /vouchers/available` | Customer nhận **403** — tab Phần thưởng không hiện voucher nào | ❌ Chưa sửa |

---

### ⚠️ Thiếu UI — endpoint có ở backend nhưng user chưa dùng: 9

| # | Method | Endpoint | Tính năng còn thiếu |
|---|---|---|---|
| 1 | `POST` | `/bookings/:id/cancel` | **Không có nút Hủy đơn** trong HistoryPage hoặc BookingsHistory — user không thể tự hủy booking |
| 2 | `POST` | `/bookings/:id/rebook` | Không có nút **Đặt lại** từ đơn cũ trong lịch sử |
| 3 | `GET` | `/bookings/:id/qr` | Không có nút **Xem mã QR check-in** trong lịch sử đặt lịch |
| 4 | `POST` | `/bookings/recurring/:groupId/cancel` | Không có UI hủy cả **loạt lịch định kỳ** |
| 5 | `POST` | `/slot-packs/:id/cancel` | SlotPackFlow / lịch sử không có nút **Hủy gói slot** đang active |
| 6 | `GET` | `/slot-packs/preview` | Không có công cụ **tính trước chiết khấu** theo số lượng slot — SlotPackFlow tính client-side |
| 7 | `GET` | `/payments/my` | Không có trang **Lịch sử thanh toán** của tôi |
| 8 | `GET` | `/payments/booking/:bookingId` | Không có màn hình **Chi tiết / hóa đơn** sau khi thanh toán |
| 9 | `PATCH` | `/notifications/:id/read` (từng thông báo) | NotificationBell chỉ mark-as-read khi click, không có trang quản lý thông báo đầy đủ |

### ⚠️ Realtime — SSE có nhưng chưa tận dụng hết

SSE push sự kiện `notification` khi booking được xác nhận / hủy / hoàn thành, nhưng **HistoryPage và BookingsHistory không tự refresh** danh sách — user phải vào lại trang hoặc reload để thấy trạng thái mới.

---

## Thứ tự ưu tiên sửa

### 🔴 Sửa ngay (bug cứng)
1. `BookingsHistory.jsx:66` → đổi `GET /bookings` → `GET /bookings/my`
2. `LoyaltyGifts.jsx:16` → đổi `GET /vouchers` → `GET /vouchers/available`

### 🟠 Quan trọng (tính năng cốt lõi chưa có)
3. **User** — Nút Hủy đơn (`POST /bookings/:id/cancel`) trong lịch sử
4. **User** — Xem mã QR check-in (`GET /bookings/:id/qr`)
5. **Admin** — Trang Quản lý thanh toán (`GET /payments`, `POST /payments/confirm`, `POST /payments/refund`)
6. **Admin** — Nút Tạo voucher (`POST /vouchers`) trong AdminRewards

### 🟡 Nên làm (hoàn thiện UX)
7. **User** — Nút Đặt lại từ đơn cũ (`POST /bookings/:id/rebook`)
8. **User** — Trang Lịch sử thanh toán (`GET /payments/my`)
9. **User** — Hủy gói slot (`POST /slot-packs/:id/cancel`)
10. **Admin** — Báo cáo voucher (`GET /vouchers/usage-report`)
11. **Admin/User** — SSE trigger auto-refresh danh sách khi có sự kiện mới

### 🔵 Có thể để sau
12. **User** — Hủy định kỳ (`POST /bookings/recurring/:groupId/cancel`)
13. **Admin** — Xóa cứng booking (`DELETE /bookings/:id`)
14. **Admin** — Chi tiết người dùng (`GET /auth/users/:id`)
15. **Admin** — Check-in slot (`GET /slot-packs/code/:code` + `POST /slot-packs/:id/use`)
