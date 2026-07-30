# 📘 HƯỚNG DẪN TỔNG QUAN HỆ THỐNG & CÁCH TRẢ LỜI BẢO VỆ ĐỒ ÁN (AUTOWASHPRO)

> Document này tóm tắt gọn gàng, dễ nhớ về kiến trúc, các luồng hoạt động chính và bộ câu hỏi thường gặp khi giáo viên phản biện đồ án **AutoWashPro (WDP-301)**.

---

## 1. 🎯 Tổng Quan Dự Án (Project Overview)

* **Tên dự án:** AutoWashPro - Hệ thống quản lý và đặt lịch rửa/chăm sóc xe thông minh.
* **Bài toán thực tế giải quyết:**
  * Giúp khách hàng đặt lịch rửa xe trước, tránh xếp hàng chờ đợi, sử dụng mã QR để check-in nhanh.
  * Giúp chủ cửa hàng / quản lý chi nhánh tối ưu công suất rửa xe, quản lý lịch trình, tránh tình trạng quá tải (overbooking).
  * Tăng tính trung thành của khách hàng qua hệ thống tích điểm (Loyalty), hạng thành viên (Tier) và gói rửa trả trước (Slot Pack).

---

## 2. 🏗️ Kiến Trúc Hệ Thống (Tech Stack & Architecture)

Hệ thống được xây dựng theo mô hình **Client - Server (RESTful API)** tách biệt hoàn toàn:

```
[ Frontend Web (React + Vite) ]  \
                                   ===>  [ Backend API (Node.js + Express) ]  ===>  [ Database (MongoDB + Mongoose) ]
[ Mobile App (React Native Expo) ] /                   ||
                                          [ Services: VNPay, MoMo, Gemini AI, SSE ]
```

* **Backend (`BE/`):** Node.js + Express.js + MongoDB (Mongoose ORM).
* **Frontend Web (`FE/`):** React 18 + Vite + Tailwind CSS + Radix UI / shadcn.
* **Mobile App (`Mobile/`):** React Native + Expo + TypeScript.
* **Cơ chế xác thực (Auth):** **JWT (JSON Web Token)**.
  * Access Token (ngắn hạn) dùng để gọi API.
  * Refresh Token (dài hạn) lưu trữ an toàn (`SecureStore` trên Mobile, `LocalStorage`/`Cookie` trên Web) để xin cấp lại Access Token mới.

---

## 3. 👥 Các Vai Trò Trong Hệ Thống (Roles & Permissions)

1. **Khách hàng (Customer):**
   * Đặt lịch rửa xe (lẻ, định kỳ, gói slot), quản lý thông tin xe.
   * Thanh toán qua VNPay/MoMo hoặc tiền mặt.
   * Tích điểm, lên hạng (Bronze $\rightarrow$ Silver $\rightarrow$ Gold $\rightarrow$ Diamond), đổi voucher/quà tặng.
   * Chatbot AI hỗ trợ tư vấn dịch vụ.
2. **Quản lý chi nhánh (Manager):**
   * Quản lý đặt lịch theo chi nhánh được phân công.
   * Quét mã QR check-in / check-out khi xe vào/ra xưởng.
   * Xem báo cáo doanh thu và đánh giá của chi nhánh.
3. **Quản trị viên (Admin):**
   * Quản lý toàn bộ hệ thống: chi nhánh, tài khoản người dùng, gói dịch vụ, mã giảm giá (Voucher), gói slot.
   * Xem báo cáo tổng thể toàn hệ thống.

---

## 4. 🔄 Các Luồng Hoạt Động Chính (Main Workflows)

### 🔴 Luồng 1: Đặt lịch rửa xe & Check-in (Core Booking Flow)
1. **Khách đặt lịch:** Khách chọn Chi nhánh $\rightarrow$ Gói dịch vụ $\rightarrow$ Xe của mình $\rightarrow$ Khung giờ (Slot).
2. **Hệ thống Kiểm tra (Validation):** 
   * Kiểm tra trùng giờ/khung giờ đó chi nhánh còn slot trống hay không.
   * Áp dụng Voucher giảm giá hoặc trừ lượt rửa trong Gói Slot Prepaid.
3. **Thanh toán & Trạng thái `pending` $\rightarrow$ `confirmed`:**
   * Chọn thanh toán VNPay/MoMo (chờ Callback/IPN để đổi trạng thái sang `confirmed`).
   * Chọn Tiền mặt (trực tiếp chuyển `confirmed`).
4. **Khách đến rửa xe (Check-in bằng QR):**
   * Mở App/Web hiển thị **Mã QR Booking**.
   * Manager dùng App quét mã QR $\rightarrow$ Trạng thái chuyển: `confirmed` $\rightarrow$ `checked_in` $\rightarrow$ `in_progress` (đang rửa) $\rightarrow$ `completed` (hoàn thành).
5. **Hoàn tất & Tích điểm:**
   * Sau khi `completed`, hệ thống tự động cộng điểm thưởng (Loyalty Points) dựa trên giá trị hóa đơn $\rightarrow$ Cập nhật thăng hạng (Tier).

---

### 💳 Luồng 2: Thanh Toán Online (VNPay / MoMo)
1. Backend sinh URL thanh toán chứa chữ ký mã hóa (Checksum - HMAC SHA512 cho VNPay / SHA256 cho MoMo).
2. Khách chuyển sang cổng thanh toán quét mã QR / nhập thẻ.
3. Cổng thanh toán gửi kết quả về qua **IPN (Instant Payment Notification)** hoặc **Return URL**.
4. Backend verify chữ ký bảo mật $\rightarrow$ Nếu thành công thì cập nhật trạng thái `Payment` thành `paid` và `Booking` thành `confirmed`.

---

### 🎁 Luồng 3: Gói Rửa Xe Trả Trước (Slot Pack Prepaid)
* **Khái niệm:** Khách mua sỉ lượt rửa xe (ví dụ: gói 5 slot giảm 5%, 10 slot giảm 10%).
* **Cách hoạt động:** 
  * Mua gói $\rightarrow$ Hệ thống sinh record `SlotPack` có mã code riêng và số lượt khả dụng.
  * Khi đặt lịch rửa xe, khách chọn hình thức "Thanh toán bằng Slot Pack" $\rightarrow$ Khung giờ được giữ và số slot trong gói tự động trừ đi 1.

---

### ⚙️ Luồng 4: Tiến Trình Chạy Ngầm Tự Động (Cron Jobs)
Hệ thống có 4 Cron Job chạy ngầm trong Backend:
1. **Nhắc lịch (`reminder.job.js`):** Chạy mỗi 5 phút, tự động gửi thông báo nhắc khách trước giờ hẹn 60 phút.
2. **Tự động hủy (`autoCancel.job.js`):** Chạy mỗi 5 phút, nếu quá giờ hẹn 30 phút mà khách chưa check-in $\rightarrow$ Tự chuyển trạng thái booking thành `cancelled`.
3. **Tặng Voucher Sinh Nhật (`birthday.job.js`):** Chạy lúc 8:00 AM mỗi ngày $\rightarrow$ Tự tạo Voucher giảm 20% cho khách có sinh nhật trong ngày.
4. **Hết hạn Gói Slot (`slotPackExpire.job.js`):** Tự động chuyển các gói slot hết hạn thành trạng thái `expired`.

---

### 🤖 Luồng 5: Thông Báo Real-time & Chatbot AI
* **Thông báo Real-time (SSE - Server-Sent Events):** Khi trạng thái booking thay đổi hoặc có voucher mới, server đẩy sự kiện trực tiếp xuống giao diện khách hàng mà không cần load lại trang.
* **Chatbot AI (Google Gemini):** Khách hàng chat với Bot để hỏi về giá dịch vụ, địa chỉ chi nhánh gần nhất, kiểm tra slot trống hoặc nhờ tư vấn gói dịch vụ phù hợp.

---

## 5. 💡 Bộ Câu Hỏi Giáo Viên Thường Hỏi & Cách Trả Lời "Ăn Điểm"

### ❓ Q1: "Hệ thống của em giải quyết vấn đề gì thực tế và điểm nổi bật là gì?"
👉 **Trả lời:**
> "Dạ thưa thầy/cô, dự án giúp **tối ưu hóa quy trình vận hành chuỗi rửa xe**. Khác với việc đến nơi mới xếp hàng chờ đợi, khách hàng có thể chủ động đặt slot trước, mua gói rửa trả trước (Slot Pack) để tiết kiệm chi phí, và check-in nhanh bằng mã QR. Về phía cửa hàng, hệ thống giúp kiểm soát năng suất rửa của từng chi nhánh, tránh quá tải và tự động hóa việc chăm sóc khách hàng qua Cron Jobs và Chatbot AI."

---

### ❓ Q2: "Em xử lý bài toán trùng lịch (Overbooking) như thế nào?"
👉 **Trả lời:**
> "Dạ thưa thầy/cô, mỗi Chi nhánh có một số lượng khung nâng / slot rửa tối đa trong 1 khung giờ. Khi khách hàng nhấn đặt lịch, hệ thống sẽ thực hiện **Transaction/Validation trên Backend**: đếm số lượng booking đã được xác nhận (`confirmed`/`checked_in`/`in_progress`) trong khoảng thời gian đó. Nếu số lượng $\ge$ sức chứa tối đa của chi nhánh, hệ thống sẽ báo lỗi và yêu cầu khách chọn khung giờ khác."

---

### ❓ Q3: "Cơ chế bảo mật thanh toán VNPay / MoMo của em hoạt động ra sao? Làm sao chống việc gian lận sửa kết quả?"
👉 **Trả lời:**
> "Dạ thưa thầy/cô, khi tạo giao dịch, Backend tính toán chữ ký số (**Checksum/Signature**) bằng thuật toán `HMAC-SHA512` (VNPay) hoặc `SHA256` (MoMo) kết hợp với `Secret Key` lưu trong môi trường bảo mật `.env`. Khi cổng thanh toán phản hồi qua webhook/IPN, Backend sẽ **re-hash các tham số nhận được và so sánh với chữ ký gửi về**. Nếu khớp mới cập nhật cơ sở dữ liệu. Nhờ vậy, người dùng không thể can thiệp hay giả mạo kết quả thanh toán trên Frontend."

---

### ❓ Q4: "Tại sao em lại dùng Server-Sent Events (SSE) cho thông báo mà không dùng WebSocket?"
👉 **Trả lời:**
> "Dạ thưa thầy/cô, tính năng thông báo trong bài toán này chủ yếu là **truyền dữ liệu 1 chiều từ Server xuống Client** (như thông báo thay đổi trạng thái đơn, nhắc lịch, tặng voucher). SSE sử dụng giao thức HTTP đơn giản, tiêu tốn ít tài nguyên máy chủ hơn, tự động kết nối lại (auto-reconnect) tốt hơn WebSocket và không cần phức tạp hóa hạ tầng."

---

### ❓ Q5: "Cơ sở dữ liệu MongoDB được thiết kế ra sao? Có đánh index gì đặc biệt không?"
👉 **Trả lời:**
> "Dạ hệ thống gồm 14 collections chính. Trong đó:
> 1. Đánh **Compound Index** trên `Booking` `(branchId, bookingDate, timeSlot)` để tăng tốc độ truy vấn kiểm tra trùng lịch.
> 2. Collection `Branches` sử dụng kiểu dữ liệu **GeoJSON Point** và đánh index **`2dsphere`** trên tọa độ địa lý, giúp truy vấn tìm kiếm chi nhánh gần nhất theo vị trí GPS của khách hàng bằng toán tử `$near` của MongoDB."

---

### 🎯 Tóm Tóm Tắt Ngắn Gọn Để Ghi Nhớ Nhanh (Cheat-sheet):
* **Tech stack:** Node.js (Express) + MongoDB + React Vite (Web) + React Native Expo (Mobile).
* **Auth:** JWT (Access + Refresh token).
* **Booking State:** `pending` $\rightarrow$ `confirmed` $\rightarrow$ `checked_in` (quét QR) $\rightarrow$ `in_progress` $\rightarrow$ `completed` $\rightarrow$ Cộng điểm Loyalty.
* **Cron Jobs:** Nhắc lịch (5m), Hủy trễ giờ (5m), Tặng quà sinh nhật (8h AM).
* **Tích hợp:** VNPay, MoMo, Google Gemini AI, SSE Real-time.
