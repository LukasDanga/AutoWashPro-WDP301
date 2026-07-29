# Hướng Dẫn Chatbox Cho Khách Hàng (Customer)

## Giới Thiệu
Chatbox AI có thể hỗ trợ bạn trong việc tra cứu thông tin và đặt lịch rửa xe. Dưới đây là chi tiết những gì bạn có thể làm với chatbox.

---

## 1. Xem Danh Sách Chi Nhánh

Bạn có thể hỏi:
- "Cho tôi xem danh sách chi nhánh"
- "Có những chi nhánh nào đang hoạt động?"
- "Chi nhánh gần đây nhất?"

**Chatbox sẽ trả về:** danh sách các chi nhánh kèm tên, địa chỉ, số điện thoại, giờ mở cửa/đóng cửa.

---

## 2. Xem Gói Dịch Vụ & Giá

Sau khi chọn chi nhánh, bạn có thể hỏi:
- "Chi nhánh Quận 1 có những gói nào?"
- "Giá rửa xe tại chi nhánh Bình Thạnh?"
- "Gói rửa cao cấp giá bao nhiêu?"

**Chatbox sẽ trả về:** danh sách gói dịch vụ gồm tên gói, giá tiền (VNĐ), thời gian thực hiện, mô tả.

---

## 3. Kiểm Tra Khung Giờ Trống

Bạn có thể hỏi:
- "Ngày mai còn giờ trống không?"
- "Khung giờ 14h ngày 30/07 có rảnh không?"
- "Check giờ trống chi nhánh Quận 1 gói rửa thường"

**Chatbox sẽ trả về:** các khung giờ còn trống trong ngày (giờ bắt đầu → giờ kết thúc).

---

## 4. Xem Danh Sách Xe Của Bạn

Sau khi đăng nhập, bạn có thể hỏi:
- "Xe của tôi có những gì?"
- "Danh sách xe"
- "Tôi có xe gì?"

**Chatbox sẽ trả về:** danh sách xe gồm biển số, loại xe, hãng, màu sắc.

> **Lưu ý:** Nếu chưa có xe nào, chatbox sẽ yêu cầu bạn thêm xe trong hồ sơ trước khi đặt lịch.

---

## 5. Đặt Lịch Rửa Xe

Chatbox sẽ hướng dẫn bạn qua các bước:

1. Chọn **CHI NHÁNH**
2. Chọn **GÓI DỊCH VỤ**
3. Chọn **NGÀY**
4. Chọn **GIỜ**
5. Chọn **XE**
6. **XÁC NHẬN** đầy đủ thông tin

Sau khi đặt thành công, chatbox sẽ báo:
- Mã booking
- Chi nhánh
- Thời gian (ngày + giờ)
- Tổng tiền

> **Lưu ý:** Cần đăng nhập để đặt lịch. Nếu chưa đăng nhập, chatbox chỉ có thể tư vấn.

---

## 6. Xem Gói Lượt (Slot Pack) Của Bạn

Sau khi đăng nhập, bạn có thể hỏi:
- "Tôi còn gói lượt nào không?"
- "Gói lượt của tôi"
- "Còn bao nhiêu lượt rửa?"

**Chatbox sẽ trả về:** danh sách gói lượt gồm mã gói, chi nhánh, gói dịch vụ, tổng lượt, lượt còn lại, lượt đã dùng, hạn sử dụng.

Kèm link xem chi tiết trên web và mobile.

> Nếu muốn mua gói lượt mới, chatbox sẽ tư vấn chiết khấu theo số lượng và hướng dẫn vào mục "Gói lượt" trong app.

---

## 7. Xem Lịch Đặt Sắp Tới

Sau khi đăng nhập, bạn có thể hỏi:
- "Lịch sắp tới của tôi?"
- "Booking sắp tới"
- "Đơn đang chờ xác nhận"

**Chatbox sẽ trả về:** danh sách booking sắp tới (pending/confirmed) gồm chi nhánh, gói dịch vụ, biển số xe, ngày, giờ, trạng thái, tổng tiền + link xem chi tiết.

---

## 8. Hỗ Trợ Khác

Bạn có thể hỏi về:
- **Chính sách hủy:** "Hủy lịch có mất phí không?"
- **Hạng thành viên:** "Tôi đang ở hạng nào?", "Cách lên hạng Kim cương?"
- **Tích điểm:** "Tích điểm thế nào?", "Điểm dùng để làm gì?"
- **Mã sinh nhật:** "Có ưu đãi sinh nhật không?"
- **Thanh toán:** "Có những cách thanh toán nào?"
- **Gói lượt:** "Mua gói lượt có lợi ích gì?"

---

## Những Điều Chatbox KHÔNG Thể Làm

- ❌ Không thể đặt lịch nếu chưa đăng nhập
- ❌ Không thể đặt lịch định kỳ (recurring) — cần vào app
- ❌ Không thể mua gói lượt (slot pack) mới — cần vào app
- ❌ Không thể xem lịch sử booking cũ (đã completed/cancelled)
- ❌ Không thể hủy booking — cần vào app
- ❌ Không thể thêm/xóa xe — cần vào app
- ❌ Không trả lời các câu hỏi ngoài lĩnh vực rửa xe

---

## Ví Dụ Câu Hỏi Mẫu

| Câu hỏi | Hành động |
|---|---|
| "Có chi nhánh nào ở Quận 1?" | Gọi `get_branches()` |
| "Gói rửa thường giá bao nhiêu?" | Gọi `get_packages(branchId)` |
| "Ngày mai còn giờ không?" | Gọi `check_availability(branchId, packageId, date)` |
| "Xe của tôi" | Gọi `get_user_vehicles()` |
| "Còn gói lượt không?" | Gọi `get_my_slot_packs()` |
| "Đơn sắp tới" | Gọi `get_my_upcoming_bookings()` |
| "Đặt lịch rửa xe" | Hỏi tuần tự → gọi `create_booking()` |
