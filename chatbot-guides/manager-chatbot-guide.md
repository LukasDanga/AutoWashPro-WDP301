# Hướng Dẫn Chatbox Cho Quản Lý Chi Nhánh (Manager)

## Giới Thiệu
Chatbox AI hỗ trợ quản lý chi nhánh trong việc quản lý đặt lịch, theo dõi hoạt động và tìm kiếm thông tin. Tất cả dữ liệu được giới hạn trong chi nhánh bạn được phân công.

---

## 1. Xem Thông Tin Chi Nhánh

Bạn có thể hỏi:
- "Chi nhánh của tôi?"
- "Thông tin chi nhánh"
- "Giờ mở cửa của chi nhánh?"

**Chatbox sẽ trả về:** tên chi nhánh, địa chỉ, số điện thoại, giờ mở cửa/đóng cửa, trạng thái.

---

## 2. Xem Danh Sách Gói Dịch Vụ

Bạn có thể hỏi:
- "Chi nhánh có những gói dịch vụ nào?"
- "Xem danh sách gói rửa xe"
- "Giá các gói dịch vụ?"

**Chatbox sẽ trả về:** danh sách gói dịch vụ tại chi nhánh gồm tên gói, giá tiền, thời gian, mô tả.

---

## 3. Xem Danh Sách Đặt Lịch

Bạn có thể hỏi:
- "Booking hôm nay?"
- "Danh sách đơn đặt lịch ngày mai"
- "Có booking nào đang chờ không?"
- "Đơn đã hoàn thành hôm nay"

**Chatbox sẽ trả về:** danh sách booking kèm tên khách, số điện thoại, biển số xe, gói dịch vụ, giờ hẹn, trạng thái, số tiền.

**Các trạng thái booking:**
| Trạng thái | Ý nghĩa |
|---|---|
| `pending` | Chờ xác nhận |
| `confirmed` | Đã xác nhận |
| `checked_in` | Khách đã đến |
| `in_progress` | Đang thực hiện |
| `completed` | Hoàn thành |
| `cancelled` | Đã hủy |

> Mặc định lấy ngày hôm nay nếu bạn không nói ngày cụ thể.

---

## 4. Xem Thống Kê Hôm Nay

Bạn có thể hỏi:
- "Thống kê hôm nay?"
- "Doanh thu hôm nay thế nào?"
- "Hôm nay có bao nhiêu đơn?"
- "Tình hình chi nhánh hôm nay"

**Chatbox sẽ trả về:**
- Tổng số đơn hôm nay
- Số đã check-in
- Số đang thực hiện
- Số đã hoàn thành
- Số đơn đang chờ
- **Tổng doanh thu** (chỉ tính booking đã hoàn thành)

---

## 5. Check-in / Cập Nhật Trạng Thái Booking

Bạn có thể nói:
- **"Có khách đến"** → Chatbox sẽ hỏi thông tin → gọi `update_booking_status(bookingId, 'checked_in')`
- **"Số 3 xong xe"** → `update_booking_status(bookingId, 'completed')`
- **"Hủy đơn số..."** → `update_booking_status(bookingId, 'cancelled')` (hỏi lý do trước)
- **"Đang rửa xe số..."** → `update_booking_status(bookingId, 'in_progress')`

**Chatbox sẽ:** xác nhận trước khi thực hiện, sau đó báo kết quả thành công.

---

## 6. Tìm Kiếm Khách Hàng

Bạn có thể hỏi:
- "Tìm khách tên Nguyễn Văn A"
- "Tra cứu số điện thoại 090xxxxxxx"
- "Khách hàng có biển số 51F-xxxxx"

**Chatbox sẽ trả về:** tên, email, số điện thoại, hạng thành viên, điểm tích lũy.

---

## 7. Xem Gói Lượt (Slot Pack) Tại Chi Nhánh

Bạn có thể hỏi:
- "Có slot pack nào đang hoạt động?"
- "Gói lượt của khách tại chi nhánh"
- "Danh sách slot pack"

**Chatbox sẽ trả về:** tên khách mua, số điện thoại, tổng lượt, lượt còn lại, trạng thái, ngày hết hạn, mã gói.

---

## 8. Hỗ Trợ Khác

Bạn có thể hỏi về:
- **Quy trình check-in:** "Check-in khách như thế nào?"
- **Hủy đơn:** "Chính sách hủy lịch?"
- **No-show:** "Khách không đến thì sao?"

---

## Những Điều Chatbox KHÔNG Thể Làm

- ❌ Không thể xem thông tin chi nhánh khác
- ❌ Không thể tạo/sửa/xóa chi nhánh (cần admin)
- ❌ Không thể tạo/sửa/xóa gói dịch vụ (cần admin)
- ❌ Không thể quản lý người dùng (khóa/kích hoạt — cần admin)
- ❌ Không thể xem doanh thu chi nhánh khác
- ❌ Không thể tạo booking cho khách
- ❌ Không thể thay đổi thông tin chi nhánh

---

## Ví Dụ Câu Hỏi Mẫu

| Câu hỏi | Hành động |
|---|---|
| "Chi nhánh tôi" | Gọi `get_branches()` |
| "Booking hôm nay" | Gọi `get_branch_bookings(branchId)` |
| "Doanh thu hôm nay" | Gọi `get_dashboard_stats(branchId)` |
| "Khách tên Tuấn" | Gọi `search_customer("Tuấn")` |
| "Có khách đến" | Gọi `get_branch_bookings()` → `update_booking_status()` |
| "Xong xe" | Gọi `update_booking_status(bookingId, 'completed')` |
| "Slot pack" | Gọi `get_branch_slot_packs(branchId)` |
| "Gói dịch vụ" | Gọi `get_packages(branchId)` |
