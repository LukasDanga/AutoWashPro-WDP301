# Cải tiến logic auto-cancel & check-in cho booking (2026-07-01)

Bối cảnh: quy tắc cũ chỉ có 1 bước — quá `GRACE_MINUTES` (30 phút) kể từ giờ hẹn mà khách chưa check-in
thì bị hủy thẳng, không cảnh báo trước, không phân biệt khách hay no-show, không có cách nào cứu vãn
ngoài đặt lại từ đầu. Các thay đổi dưới đây thêm 4 lớp logic (ý tưởng 1, 4, 6, 7) xung quanh
`autoCancelNoShows` mà không đổi ngưỡng 30 phút mặc định.

## 1. Cảnh báo trước khi hủy (ý tưởng 1)

- **File:** `BE/src/services/booking.service.js` — `autoCancelNoShows()`
- Hằng số mới: `LATE_WARNING_OFFSET_MINUTES = 10`.
- Cron (`*/5 * * * *`, không đổi) giờ chạy 2 bước cho mỗi booking `pending`/`confirmed`:
  1. Nếu đang trong khoảng `[deadline - 10p, deadline)` và chưa từng cảnh báo → gửi thông báo
     "sắp bị hủy tự động, còn X phút" (type `booking_at_risk`, notification mới), đánh dấu
     `lateWarningSentAt` để không gửi lặp lại.
  2. Nếu đã qua `deadline` → hủy thật như cũ.
- Booking vẫn ở trạng thái `confirmed` trong suốt cửa sổ cảnh báo → QR check-in vẫn hoạt động bình
  thường, khách có cơ hội check-in trước khi bị hủy.

## 2. Strike system cho no-show lặp lại (ý tưởng 4)

- **File:** `BE/src/models/user.schema.js` — field mới `noShowCount` (default 0).
- **File:** `BE/src/services/booking.service.js`:
  - Hằng số `NO_SHOW_STRIKE_THRESHOLD = 3`, `STRIKE_DEPOSIT_RATE = 1` (100%).
  - Helper `getDepositRate(user)`: trả về 100% nếu `noShowCount >= 3`, ngược lại 30% (`DEPOSIT_RATE`)
    như cũ. Áp dụng cho cả `createBooking` và `createRecurringBooking`.
  - `autoCancelNoShows`: mỗi lần hủy thật sự → `User.noShowCount += 1`.
  - `updateBookingStatus`: khi booking chuyển sang `completed` → `noShowCount -= 1` (tối thiểu 0) —
    khách "chuộc" lại 1 strike mỗi lần hoàn thành đúng hẹn, tránh phạt vĩnh viễn.
- Hệ quả: khách no-show ≥ 3 lần phải cọc 100% cho lần đặt tiếp theo thay vì 30%, thay vì bị chặn
  đặt lịch hoàn toàn (ít friction hơn cho demo, vẫn tạo áp lực tài chính rõ ràng).

## 3. Gợi ý đổi giờ thay vì chỉ hủy suông (ý tưởng 6)

- **File:** `BE/src/services/booking.service.js` — helper mới `findNearestAvailableSlot()`.
- Tìm slot trống gần nhất cùng ngày/cùng chi nhánh sau một mốc thời gian cho trước (dùng lại
  `buildSlots` + kiểm tra overlap, không phụ thuộc `getAvailableSlots` để tránh ảnh hưởng logic
  đặt chỗ hiện có).
- Được gọi ở cả 2 bước của `autoCancelNoShows`:
  - Lúc cảnh báo: gợi ý kèm trong thông báo + lưu vào `Booking.suggestedSlotStartTime` (field mới
    trong `booking.schema.js`) để FE có thể hiển thị ngay trên danh sách.
  - Lúc hủy thật: tính lại (fresh) và nhét vào thông báo hủy, vì slot có thể đã bị người khác giữ
    trong lúc chờ.
- Khách vẫn cần tự xác nhận đổi giờ (qua `PATCH /bookings/:id` để dời giờ nếu còn `confirmed`, hoặc
  `POST /bookings/:id/rebook` sau khi đã bị hủy) — hệ thống chỉ gợi ý, không tự động đặt hộ để
  tránh trừ tiền/giữ chỗ ngoài ý muốn khách.

## 4. Đồng bộ với QR check-in — quản lý gia hạn thủ công (ý tưởng 7)

- **File:** `BE/src/models/booking.schema.js` — field mới `graceExtensionMinutes` (default 0).
- **File:** `BE/src/services/booking.service.js` — hàm mới `extendGracePeriod(id, userRole, userBranchId)`:
  - Chỉ manager (đúng chi nhánh) hoặc admin được gọi; chỉ áp dụng cho booking `pending`/`confirmed`.
  - Mỗi lần gọi: `+GRACE_EXTENSION_STEP_MINUTES` (15 phút), tối đa `MAX_GRACE_EXTENSION_MINUTES`
    (30 phút/đơn) để tránh gia hạn vô hạn.
  - Xóa `lateWarningSentAt` để nếu khách vẫn chưa đến sau khi gia hạn, hệ thống cảnh báo lại đúng 1 lần.
  - `autoCancelNoShows` cộng `graceExtensionMinutes` vào `graceMinutes` mặc định khi tính `deadline`.
  - Gửi thông báo `booking_grace_extended` cho khách.
- **API mới:** `PATCH /api/bookings/:id/extend-grace` (role: admin, manager) —
  `BE/src/routes/booking.routes.js` + `BE/src/controllers/booking.controller.js` (`extendGracePeriod`).
- **FE:** `FE/src/components/manager/ManagerBookings.jsx` — component `AtRiskNotice` mới, hiển thị
  badge "Sắp hết hạn" + nút "Gia hạn +15p" + gợi ý giờ đổi ngay trong cột trạng thái của bảng, cho
  phép quản lý chủ động gia hạn (vd: khách gọi báo đang tới) mà không cần khách phải tự thao tác,
  và tránh việc cron âm thầm hủy đơn khi quản lý đang xử lý check-in tại quầy.

## Các file đã thay đổi

| File | Thay đổi |
|---|---|
| `BE/src/models/booking.schema.js` | + `lateWarningSentAt`, `suggestedSlotStartTime`, `graceExtensionMinutes` |
| `BE/src/models/user.schema.js` | + `noShowCount` |
| `BE/src/models/notification.schema.js` | + type `booking_at_risk`, `booking_grace_extended` |
| `BE/src/services/booking.service.js` | + hằng số strike/warning/grace, `getDepositRate()`, `findNearestAvailableSlot()`, viết lại `autoCancelNoShows()` (2 bước: cảnh báo rồi hủy), + `extendGracePeriod()`, deposit theo `getDepositRate()` trong `createBooking`/`createRecurringBooking`, redemption `noShowCount` khi `completed` |
| `BE/src/jobs/autoCancel.job.js` | Cập nhật log/comment cho hành vi 2 bước |
| `BE/src/controllers/booking.controller.js` | + `extendGracePeriod`; `updateBooking` truyền `req.userId` |
| `BE/src/routes/booking.routes.js` | + `PATCH /:id/extend-grace` (manager/admin); `PUT /:id` mở thêm cho customer |
| `FE/src/components/manager/ManagerBookings.jsx` | + component `AtRiskNotice` (badge cảnh báo + nút gia hạn + gợi ý giờ) trong bảng danh sách booking |
| `FE/src/components/customer/BookingsHistory.jsx` | + component `AtRiskBanner` (cảnh báo + nút tự đổi giờ) ở Calendar view, List view, và Detail modal |

## 5. UI phía khách hàng (bổ sung 2026-07-01, phần 2)

- **File:** `BE/src/services/booking.service.js` — `updateBooking(id, updates, userRole, userId)`:
  trước đây `PUT /bookings/:id` chỉ dành cho admin/manager và **không kiểm tra chủ sở hữu**. Đã thêm:
  - Ownership check: customer chỉ sửa được booking của chính mình (403 nếu không phải chủ).
  - Customer bị chặn đổi `branchId`/`packageId` (chỉ đổi `bookingDate`/`startTime`/`note`), tránh
    lạm dụng endpoint dùng chung với manager.
  - Khi reschedule (đổi ngày/giờ), reset `lateWarningSentAt`, `suggestedSlotStartTime`,
    `graceExtensionMinutes` về mặc định — nếu không, đổi giờ xong vẫn giữ cờ "đã cảnh báo" cũ nên
    hệ thống sẽ không bao giờ cảnh báo lại cho khung giờ mới.
- **File:** `BE/src/routes/booking.routes.js` — `PUT /:id` mở thêm cho `ROLES.CUSTOMER`.
- **File:** `BE/src/controllers/booking.controller.js` — `updateBooking` truyền thêm `req.userId`.
- **File:** `FE/src/components/customer/BookingsHistory.jsx` — component mới `AtRiskBanner`:
  hiển thị banner vàng "⏰ Bạn chưa check-in — sắp bị hệ thống tự hủy!" khi booking đang
  `pending`/`confirmed` và có `lateWarningSentAt`; nếu có `suggestedSlotStartTime` thì thêm nút
  "Đổi sang {giờ}" gọi thẳng `PUT /bookings/:id` để tự đổi giờ (không cần gọi hotline). Gắn ở 3 chỗ:
  danh sách ngày được chọn trong Calendar view, từng dòng trong List view, và đầu modal chi tiết.

## Đã kiểm thử thực tế (không chỉ đọc code)

Chạy `BE` (`npm run dev`, cổng 5000) + `FE` (`npm run dev`, cổng 5173) thật với MongoDB local, tạo
tài khoản khách hàng thật (`binhtntse182370@fpt.edu.vn` / mật khẩu `Customer@123`) qua
`POST /api/auth/register`, rồi gọi thẳng API thật (không mock) để xác nhận từng phần:

- Tạo booking → deposit 30% mặc định ✅; sau khi set `noShowCount = 3` thủ công, tạo booking mới →
  deposit tự nhảy lên 100% ✅ (`getDepositRate`).
- Backdate 1 booking vào giữa cửa sổ cảnh báo, gọi `autoCancelNoShows(30)` trực tiếp → đúng 1
  notification `booking_at_risk` được tạo, `lateWarningSentAt` được set, không cảnh báo lặp lại ✅.
- `PATCH /bookings/:id/extend-grace` bằng tài khoản manager đúng chi nhánh → `graceExtensionMinutes`
  +15, xóa cờ cảnh báo cũ ✅.
- `PUT /bookings/:id` bằng khách sở hữu → đổi giờ thành công, `rescheduleCount` +1, các cờ
  cảnh báo/gia hạn được reset ✅. Một khách khác không sở hữu gọi cùng endpoint → 403 `FORBIDDEN` ✅.
  Khách sở hữu cố đổi `branchId` → 400 `FORBIDDEN_FIELD` ✅.
- Backdate booking qua khỏi hạn (30 phút), gọi lại `autoCancelNoShows(30)` → booking chuyển
  `cancelled`/`cancelledBy: system`, `User.noShowCount` +1, thông báo hủy có kèm gợi ý giờ trống
  (`09:30`) vì lần này giờ hẹn giả lập nằm trong khung giờ hoạt động của chi nhánh ✅.
  Đưa booking đó qua trọn vòng đời tới `completed` → `noShowCount` giảm lại 1 (redemption) ✅.
- FE dev server khởi động sạch; cả `ManagerBookings.jsx` và `BookingsHistory.jsx` được Vite
  transform thành công (không lỗi cú pháp JSX).
- **Chưa xác nhận bằng mắt trong trình duyệt thật** — sandbox này không có Playwright/`chromium-cli`
  cài sẵn nên không chụp được screenshot. Để bù lại, đã để sẵn 1 booking "đang ở trạng thái sắp bị
  hủy" (`confirmed`, `lateWarningSentAt` đã set) trong tài khoản test — mở FE
  (`http://localhost:5173`), đăng nhập bằng `binhtntse182370@fpt.edu.vn` / `Customer@123`, vào mục
  lịch sử đặt chỗ sẽ thấy banner vàng ngay. Booking này sẽ tự bị cron hủy thật trong ~10 phút tới vì
  cron vẫn đang chạy nền — đúng luồng thật, không phải giả lập.

## Chưa làm (out of scope lần này)

- Chưa thêm badge "sắp hết hạn" ở CalendarView của manager (chỉ thêm ở bảng Table).
- Chưa có job riêng để "reset" `noShowCount` theo thời gian (vd: hết hạn sau 90 ngày) — hiện chỉ
  giảm khi khách hoàn thành booking thành công.
