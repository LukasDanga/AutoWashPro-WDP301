# Tổng quan hệ thống AutoWashPro

## 1. Giới thiệu
AutoWashPro là hệ thống đặt lịch rửa xe online với 3 vai trò: **Customer**, **Manager**, **Admin**. Gồm 3 phần: Web (React), Mobile (React Native), Backend (Node.js + MongoDB).

---

## 2. Kiến trúc tổng thể (3-layer)

```
[Web Frontend] ──┐
[Mobile App] ────┤─── HTTP/REST ──▶ [Backend API] ────▶ [MongoDB]
                 │                    (Express)
              [Socket.IO] ◀────────── (real-time)
```

- **Frontend Web**: React + Vite, chạy trên Vercel
- **Mobile App**: React Native + Expo, chạy trên thiết bị di động
- **Backend API**: Node.js + Express, chạy trên Render.com
- **Database**: MongoDB Atlas (cloud)
- **Real-time**: Socket.IO cho thông báo và cập nhật live

---

## 3. Luồng xác thực (Authentication)

1. User đăng nhập bằng email/password hoặc Google OAuth
2. Backend trả về **access token** (hết hạn sau 7 ngày) + **refresh token** (30 ngày)
3. Token được lưu ở localStorage (web) hoặc expo-secure-store (mobile)
4. Mỗi request API đều gửi kèm access token trong header `Authorization: Bearer <token>`
5. Khi token hết hạn → gọi endpoint `/api/auth/refresh-token` để lấy cặp token mới
6. Backend có middleware kiểm tra JWT + phân quyền theo role (Admin/Manager/Customer)

---

## 4. Luồng đặt lịch (Booking)

```
Chọn gói dịch vụ → Chọn chi nhánh → Chọn khung giờ → Xác nhận → Thanh toán → Hoàn tất
```

1. Customer chọn **gói rửa xe** (Package) và **chi nhánh** (Branch)
2. Hệ thống kiểm tra **slot trống** dựa trên giờ mở cửa và công suất chi nhánh
3. Customer chọn **khung giờ**, có thể đặt lịch đơn (single) hoặc định kỳ hàng tuần (recurring)
4. Hệ thống tạo booking với trạng thái `pending`
5. Customer thanh toán qua VNPay hoặc MoMo (đặt cọc hoặc toàn bộ)
6. Booking chuyển sang `confirmed`
7. Khi đến chi nhánh: Manager **check-in** (qua QR code) → `checked_in` → `in_progress` → `completed`
8. Nếu không đến sau 30 phút → **auto-cancel** (cron job chạy mỗi 5 phút)

**Các loại đặt lịch:**
- **Single**: đặt 1 lần
- **Recurring**: lặp lại hàng tuần
- **Slot Pack**: dùng gói rửa đã mua trước (prepaid)

---

## 5. Luồng thanh toán (Payment)

1. Tạo booking → gọi API tạo thanh toán → nhận link VNPay/MoMo
2. Redirect user sang cổng thanh toán
3. Sau khi thanh toán xong, user được redirect về web kèm tham số kết quả
4. Backend nhận callback từ VNPay/MoMo → xác nhận giao dịch → cập nhật trạng thái booking

Hỗ trợ: thanh toán đặt cọc, thanh toán toàn bộ, hoàn tiền qua ví nội bộ (wallet).

---

## 6. Luồng chatbot AI

1. User nhắn tin qua giao diện chatbot (web hoặc mobile)
2. Frontend gửi request đến backend endpoint `/api/chat/send`
3. Backend gọi **Google Gemini** với system prompt phù hợp theo vai trò (customer/manager/admin)
4. AI có thể gọi **tools** (hàm backend) để tra cứu dữ liệu thực: danh sách chi nhánh, slot trống, xe của user, tạo booking
5. Kết quả tool được trả về AI → AI tổng hợp câu trả lời tự nhiên
6. Hỗ trợ fallback provider: nếu Gemini lỗi thì chuyển sang Groq

---

## 7. Luồng thông báo real-time (Socket.IO)

1. Khi frontend kết nối, backend xác thực JWT và cho user join các **room**:
   - `user_{userId}`: thông báo cá nhân
   - `branch_{branchId}`: thông báo theo chi nhánh (manager)
   - `admin`: thông báo toàn hệ thống (admin)
2. Khi có sự kiện (đặt lịch mới, cập nhật trạng thái, voucher mới), backend emit event vào room tương ứng
3. Frontend lắng nghe sự kiện và cập nhật giao diện real-time (không cần reload)

---

## 8. Cron Jobs (tác vụ nền)

| Job | Chu kỳ | Việc làm |
|-----|--------|----------|
| **Reminder** | 5 phút | Gửi thông báo nhắc lịch hẹn sắp tới (60-65 phút) |
| **Birthday** | 8:00 AM hằng ngày | Tự động tạo voucher sinh nhật 20% |
| **Auto-cancel** | 5 phút | Hủy booking không check-in sau 30 phút |
| **Slot pack expiry** | - | Xử lý gói slot hết hạn |

---

## 9. Luồng dữ liệu backend (Controller → Service → Model)

```
Request → Route → Middleware (auth, validation) → Controller → Service → Model (Mongoose)
```

- **Controller**: nhận request, gọi service, trả response (lớp rất mỏng)
- **Service**: chứa toàn bộ logic nghiệp vụ
- **Model**: định nghĩa schema Mongoose, tương tác MongoDB

Response format chuẩn: `{ success: true/false, data: {...}, message: "..." }`

---

## 10. Tính năng chính

- Đặt lịch rửa xe (single, recurring, slot pack)
- Thanh toán online (VNPay, MoMo)
- Quản lý xe nhiều loại
- Voucher giảm giá (phần trăm / cố định, áp dụng theo tier/branch/package)
- Gói slot prepaid (mua 5/10/20+ lần rửa với giảm giá)
- Hệ thống tích điểm & loyalty tier (Bronze → Silver → Gold → Diamond)
- Cửa hàng quà tặng (đổi điểm lấy quà)
- Check-in bằng QR code
- Chatbot AI hỗ trợ đặt lịch, tra cứu
- Thông báo real-time (Socket.IO)
- 3 role: Admin (toàn hệ thống), Manager (theo chi nhánh), Customer
- Dashboard thống kê, báo cáo doanh thu
- Soft delete (đánh dấu xóa thay vì xóa thật)
