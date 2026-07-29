# Hướng Dẫn Chatbox Cho Quản Trị Viên (Admin)

## Giới Thiệu
Chatbox AI hỗ trợ quản trị viên quản lý toàn bộ hệ thống AutoWashPro: xem thống kê tổng quan, quản lý chi nhánh, người dùng, booking và tìm kiếm thông tin trên toàn hệ thống.

---

## 1. Xem Thống Kê Tổng Quan Hệ Thống

Bạn có thể hỏi:
- "Tổng quan hệ thống?"
- "Dashboard"
- "Thống kê hôm nay"
- "Tình hình hệ thống thế nào?"

**Chatbox sẽ trả về:**
| Chỉ số | Mô tả |
|---|---|
| Tổng chi nhánh | Số chi nhánh đang hoạt động |
| Tổng người dùng | Phân loại: customer, manager, admin |
| Booking hôm nay | Tổng booking trong ngày |
| Doanh thu hôm nay | Tổng doanh thu từ booking `completed` |
| Tổng booking | Tổng số booking từ trước đến nay |
| Ngày | Ngày thống kê |

---

## 2. Quản Lý Chi Nhánh

### Xem danh sách chi nhánh:
- "Danh sách chi nhánh"
- "Chi nhánh nào đang hoạt động?"
- "Tìm chi nhánh tên Quận 1"
- "Chi nhánh nào bị inactive?"

**Chatbox sẽ trả về:** tên, địa chỉ, quản lý, trạng thái, giờ hoạt động.

### Xem chi tiết chi nhánh:
- "Xem chi tiết chi nhánh [ID]"
- "Thông tin chi nhánh Quận 1"
- "Chi nhánh Bình Thạnh có bao nhiêu gói dịch vụ?"

**Chatbox sẽ trả về:** tên, địa chỉ, SĐT, giờ mở cửa, quản lý, số gói dịch vụ, số booking hôm nay.

### Xem gói dịch vụ của chi nhánh:
- "Gói dịch vụ tại chi nhánh [ID]"
- "Chi nhánh Quận 1 có gì?"

---

## 3. Quản Lý Booking

### Xem tất cả booking:
- "Tất cả booking hôm nay?"
- "Booking đang chờ xử lý"
- "Đơn đã hủy hôm nay"
- "Booking tại chi nhánh Quận 1"

**Chatbox sẽ trả về:** khách hàng, chi nhánh, gói dịch vụ, biển số xe, giờ, trạng thái, số tiền, loại booking.

> Có thể lọc theo: ngày (`date`), chi nhánh (`branchId`), trạng thái (`status`).

### Xem booking của một chi nhánh cụ thể:
- "Xem booking chi nhánh [ID]"
- "Chi nhánh Quận 1 hôm nay có đông không?"

---

## 4. Quản Lý Người Dùng

### Tìm kiếm người dùng:
- "Tìm user Nguyễn Văn A"
- "Tra cứu email abc@gmail.com"
- "Tìm số điện thoại 090xxxxxxx"
- "Danh sách manager?"

**Chatbox sẽ trả về:** tên, email, số điện thoại, vai trò, trạng thái, hạng, điểm tích lũy.

### Kích hoạt / Vô hiệu hóa / Khóa tài khoản:
- **Kích hoạt:** "Kích hoạt tài khoản ID..."
- **Vô hiệu hóa:** "Vô hiệu hóa user..."
- **Khóa:** "Khóa tài khoản ABC"
- "Chặn user ID..."

**Chatbox sẽ:** xác nhận trước khi thực hiện, sau đó báo kết quả.

> Các trạng thái: `active` (hoạt động), `inactive` (vô hiệu hóa), `suspended` (bị khóa).

### Tìm kiếm khách hàng:
- "Tìm khách tên..."
- "Tra cứu số điện thoại..."

---

## 5. Xem Thống Kê Chi Nhánh

Bạn có thể hỏi:
- "Doanh thu hôm nay của chi nhánh [ID]?"
- "Chi nhánh Quận 1 hôm nay thế nào?"
- "Booking chi nhánh Bình Thạnh hôm nay?"

**Chatbox sẽ trả về:**
- Tổng số đơn
- Số đã check-in
- Số đang thực hiện
- Số đã hoàn thành
- Số đơn chờ
- Tổng doanh thu

---

## 6. Doanh Thu

Bạn có thể hỏi:
- "Doanh thu hôm nay?"
- "Tổng doanh thu hệ thống?"
- "Doanh thu chi nhánh Quận 1"
- "Tháng này thu được bao nhiêu?" *(hướng dẫn xem web — chưa có tool)*

**Chatbox sẽ:**
- Hỏi tổng quan → `get_system_stats()` (doanh thu completed toàn hệ thống)
- Hỏi chi nhánh → `get_dashboard_stats(branchId)` (doanh thu completed chi nhánh)

---

## 7. Cập Nhật Trạng Thái Booking

Bạn có thể nói:
- "Check-in booking [ID]"
- "Hoàn thành booking [ID]"
- "Hủy booking [ID]"
- "Đánh dấu đang thực hiện booking [ID]"

---

## Những Điều Chatbox KHÔNG Thể Làm

- ❌ Không thể xóa người dùng (cần vào trang quản lý người dùng trên web)
- ❌ Không thể tạo/sửa chi nhánh mới (cần vào web)
- ❌ Không thể tạo/sửa gói dịch vụ (cần vào web)
- ❌ Không thể thay đổi mật khẩu người dùng
- ❌ Không thể tạo tài khoản mới
- ❌ Không thể xóa booking
- ❌ Không thể xem báo cáo chi tiết theo tháng (chỉ hôm nay)

---

## Ví Dụ Câu Hỏi Mẫu

| Câu hỏi | Hành động |
|---|---|
| "Tổng quan" | Gọi `get_system_stats()` |
| "Chi nhánh active" | Gọi `get_branches({ status: 'active' })` |
| "Chi tiết chi nhánh [ID]" | Gọi `get_branch_details(branchId)` |
| "Booking hôm nay" | Gọi `get_all_bookings({ date: 'YYYY-MM-DD' })` |
| "Booking chi nhánh [ID] hôm nay" | Gọi `get_branch_bookings(branchId)` |
| "Doanh thu hệ thống" | Gọi `get_system_stats()` |
| "Doanh thu chi nhánh [ID]" | Gọi `get_dashboard_stats(branchId)` |
| "Tìm user Nguyễn Văn A" | Gọi `search_users("Nguyễn Văn A")` |
| "Khóa user [ID]" | Xác nhận → `manage_user_status(userId, 'suspended')` |
| "Kích hoạt user [ID]" | Xác nhận → `manage_user_status(userId, 'active')` |
| "Tìm khách 090xxxxxxx" | Gọi `search_customer("090xxxxxxx")` |
| "Gói dịch vụ chi nhánh [ID]" | Gọi `get_packages(branchId)` |
| "Check-in booking [ID]" | Gọi `update_booking_status(bookingId, 'checked_in')` |
