# BÁO CÁO DEEP AUDIT — AutoWashPro-WDP301

**Ngày thực hiện:** 30/07/2026
**Phạm vi:** Toàn bộ hệ thống (BE + FE + Mobile + cấu hình)
**Branch hiện tại:** `Mobile/DinhAnh_dev10` (có 8 file thay đổi chưa commit)
**Loại audit:** READ-ONLY (không sửa code, không refactor, không đưa giả định)

---

## 1. TÓM TẮT KIẾN TRÚC & LUỒNG DỮ LIỆU

### 1.1. Kiến trúc tổng thể

```
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  FE (React + Vite)   │    │  Mobile (RN + Expo)  │    │  External Gateway    │
│  • Tokens: LS        │    │  • Tokens: Secure    │    │  • VNPay / MoMo      │
│  • Realtime: SSE     │    │  • Realtime: Socket  │    │  • SePay Webhook     │
└──────────┬───────────┘    └──────────┬───────────┘    └──────────┬───────────┘
           │                           │                           │
           │ HTTPS + JSON              │ HTTPS + Socket.IO         │ HTTPS
           ▼                           ▼                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  BE (Node.js + Express + MongoDB Atlas)                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ Routes  │→ │Services │→ │Models   │  │ Cron    │  │SSE+Socket│         │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘         │
│       │           │           │            │             │               │
│       ▼           ▼           ▼            ▼             ▼               │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │   Mongoose (transactions NO-OP ở cả prod — xem §4.1)           │      │
│  └────────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                          ┌──────────────────────┐
                          │ MongoDB Atlas        │
                          │ (M0 free tier)       │
                          └──────────────────────┘
```

### 1.2. Luồng dữ liệu chính

**Đặt lịch (single):**
1. User chọn gói/chi nhánh/slot → `POST /api/bookings` (BE)
2. `bookingService.createBooking()` (BE/src/services/booking.service.js:116) bắt đầu transaction (no-op)
3. Validate package/branch/vehicle/tier/slot → tạo `Booking` document với `depositAmount = 30% × finalPrice`
4. Nếu có voucher → `voucherService.reserveVoucher()` trừ `remaining`
5. Commit transaction (no-op) → gửi thông báo + SSE/Socket

**Thanh toán (deposit → remaining → full):**
1. `POST /api/payments` → `paymentService.createPayment()` tạo `Payment` record `status: 'pending'`
2. Gateway callback (VNPay return URL / SePay webhook) → `confirmPaymentCallback()`
3. Update `Payment.status: 'paid'` + `Booking.paymentStatus`
4. Nếu là 'full' → `loyaltyService.addPointsFromPayment()` + `spinCount++`

**Auto-cancel no-show:**
- Cron mỗi 1 phút (`autoCancel.job.js`) gọi `bookingService.autoCancelNoShows(GRACE_MINUTES=5)`
- Set `status: 'cancelled', cancelledBy: 'system'` → `User.noShowCount++`

**Realtime:**
- BE → `sseService.sendToUser()` → Cả SSE response lẫn Socket.IO `io.to('user_X').emit()`
- FE dùng `useSSE` hook (line 27-38: tự gọi lại tất cả SYNC_EVENTS khi reconnect)
- Mobile dùng `sse.ts` (file thực chất wrap `socket.io-client`)

---

## 2. CÁC KHU VỰC ĐÃ ĐƯỢC KIỂM TRA

### 2.1. Backend (`BE/`)

| File / Module | Đã đọc | Ghi chú |
|---------------|--------|---------|
| `server.js` | ✅ Toàn bộ | EADDRINUSE auto-kill, cron boot |
| `src/app.js` | ✅ Toàn bộ | CORS mở `*.vercel.app`, `/api/sse` route |
| `src/config/db.js` | ✅ Toàn bộ | **CRITICAL: no-op transactions** |
| `src/config/env.js`, `index.js`, `dns.js`, `constants.js` | ✅ | |
| `src/socket.js` | ✅ Toàn bộ | Auth fallback về guest, multi-room |
| `src/services/sse.service.js` | ✅ Toàn bộ | Dual-channel (SSE + Socket) |
| `src/services/booking.service.js` | ✅ Toàn bộ (2200+ dòng) | |
| `src/services/payment.service.js` | ✅ Diff với branch (modified) | |
| `src/services/refundRequest.service.js` | ✅ Toàn bộ | |
| `src/services/auth.service.js` | ✅ Toàn bộ | Refresh token rotation |
| `src/services/voucher.service.js`, `loyalty.service.js`, `branch.service.js`, `notification.service.js`, `package.service.js`, `chatbot.service.js`, `vehicles.service.js`, `gift.service.js`, `slotPack.service.js`, `slotProduct.service.js`, `stats.service.js`, `report.service.js`, `vnpay.service.js`, `email.service.js` | ✅ Có đọc qua | |
| `src/controllers/*.js` (16 files) | ✅ Từng cái | |
| `src/models/*.js` (14 schemas) | ✅ Từng cái | |
| `src/jobs/*.js` (4 jobs) | ✅ Từng cái | |
| `src/middlewares/*.js` | ✅ | |
| `src/routes/*.js` (15 files) | ✅ | |
| `BE/scripts/*.js` (12 files) | ✅ | |
| `BE/src/scripts/*.js` | ✅ | |
| Root scripts: `fix-refunds.js`, `fix_all_images.js`, `_inspect.js`, `test-agg.js`, `test_agg.js`, `updateGifts.js`, `update_branches_native.js`, `update_branch_emails.js`, `update_branch_images.js`, `update_packages_carwash.js` | ✅ Từng cái | |

### 2.2. Frontend (`FE/`)

| File / Module | Đã đọc | Ghi chú |
|---------------|--------|---------|
| `src/App.jsx` (215+ dòng) | ✅ Toàn bộ | Plaintext password log, native confirm() |
| `src/main.jsx`, `index.css`, `styles.css`, `overrides.css` | ✅ | |
| `src/lib/authStorage.js`, `chatbotService.js`, `toast.js`, `confirm.jsx`, `utils.js` | ✅ | |
| `src/hooks/useSSE.js` | ✅ | **Socket reconnect blast** |
| `src/utils/socketEvents.js` | ✅ | **Orphan — không file nào import** |
| `src/config/adminMenu.js`, `managerMenu.js` | ✅ | |
| `src/components/services/userService.js` | ✅ | |
| Tất cả `src/components/admin/*.jsx` | ✅ | |
| Tất cả `src/components/manager/*.jsx` | ✅ | |
| Tất cả `src/components/customer/*.jsx` | ✅ | **Tất cả đều ORPHAN** |
| Tất cả `src/components/landing/*.jsx` | ✅ | **Active code** |
| Tất cả `src/components/ui/*.jsx` | ✅ | |
| `src/components/BookingFlow.jsx` | ✅ | **ORPHAN 55KB** |
| `src/components/AuthScreen.jsx`, `VoucherPicker.jsx`, `ChatBot.jsx` | ✅ | |
| `src/components/shared/RefundRequests.jsx` | ✅ | |
| `src/components/layout/DashboardSidebar.jsx`, `DashboardShell.jsx` | ✅ | |
| `src/routes/AdminRoutes.jsx`, `ManagerRoutes.jsx` | ✅ | |
| `LoginRegister.jsx` (root) | ✅ | **ORPHAN** |

### 2.3. Mobile (`Mobile/`)

| File / Module | Đã đọc | Ghi chú |
|---------------|--------|---------|
| `app.json`, `metro.config.js`, `tsconfig.json`, `package.json` | ✅ | |
| `src/api/client.ts`, `index.ts`, `auth.ts`, `payment.ts`, `booking.ts` (qua `index.ts`) | ✅ | |
| `src/api/branch.ts`, `package.ts`, `gift.ts`, `chatbot.ts`, `feedback.ts`, `notification.ts`, `public.ts`, `refund.ts`, `slotPack.ts`, `wallet.ts` | ✅ | |
| `src/contexts/AuthContext.tsx` | ✅ | |
| `src/contexts/NotificationContext.tsx`, `ChatContext.tsx` | ✅ | |
| `src/services/sse.ts` | ✅ | Thực tế wrap `socket.io-client` |
| `src/hooks/useSSE.ts` | ✅ | |
| `src/utils/tierHelper.ts`, `voucherStore.ts`, `socketEvents.ts` | ✅ | |
| `src/types/index.ts` | ✅ | |
| `src/theme/colors.ts`, `index.ts`, `gradients.ts`, `spacing.ts`, `typography.ts`, `tokens.ts` | ✅ | |
| Tất cả `src/components/common/*.tsx` | ✅ | |
| Tất cả `src/components/booking/*.tsx` | ✅ | |
| Tất cả `app/**/*.tsx` (auth, booking, branch, checkin, chat, feedback, gifts, help, history, licenses, notifications, payment, privacy, profile, settings, terms, vehicle, voucher, wallet, tabs) | ✅ | |

### 2.4. Infrastructure

| File | Đã đọc |
|------|--------|
| `render.yaml`, `FE/vercel.json`, `FE/deploy/` | ✅ |
| `BE/package.json`, `FE/package.json`, `Mobile/package.json` | ✅ |
| `BE/.env.example`, `FE/.env`, `Mobile/.env`, `.gitignore` (root + 3 sub) | ✅ |
| `PROJECT_SUMMARY.md`, `TEST_CASES_REPORT.md`, `Mobile/AGENTS.md`, `Mobile/CLAUDE.md`, `FE/readme.md`, `skills-lock.json` | ✅ |

### 2.5. Git history

| Lệnh | Kết quả |
|------|---------|
| `git log` (30 commits) | ✅ Đã đọc |
| `git status` | ✅ Có 8 file modified chưa commit |
| `git diff` (8 files) | ✅ Đã đọc toàn bộ |
| `git branch -a` | ✅ Xác nhận ở `Mobile/DinhAnh_dev10` |

---

## 3. CÁC PHÁT HIỆN

### 3.1. CRITICAL — Có khả năng cao gây mất dữ liệu / reset dữ liệu

#### 🔴 C-1: MongoDB transactions bị no-op trên toàn bộ production

**File:** `BE/src/config/db.js` (dòng 9–18)

```js
// Patch startSession to avoid transaction errors on standalone MongoDB
const originalStartSession = mongoose.startSession.bind(mongoose);
mongoose.startSession = async function() {
  const session = await originalStartSession();
  // No-op all transaction methods in dev (standalone MongoDB doesn't support transactions)
  session.startTransaction = () => {};
  session.commitTransaction = async () => {};
  session.abortTransaction = async () => {};
  session.inTransaction = () => false;
  return session;
};
```

**Vấn đề:**
- Comment nói "in dev" nhưng **không có guard `NODE_ENV`**. Patch được apply trong `connectDB()` chạy ở mọi môi trường.
- `render.yaml` dòng 12 set `NODE_ENV=production` → vẫn bị no-op.
- Mọi `session.startTransaction()` / `session.commitTransaction()` / `session.abortTransaction()` đều là no-op → `session.inTransaction()` luôn trả về `false`.

**Ảnh hưởng:**
- Mọi write operation bọc transaction trong `booking.service.js`, `payment.service.js`, `refundRequest.service.js`, `slotPack.service.js` đều KHÔNG có rollback semantics.
- Ví dụ (`booking.service.js:252-262`): `SlotPack.findOneAndUpdate({...}, {$inc: {remainingSlots: -1, usedSlots: 1}})` — nếu tiếp theo `Package.findById()` throw thì slot đã trừ vĩnh viễn.
- Tương tự `cancelBooking()` (line 1225-1230): `$inc: {remainingSlots: 1, usedSlots: -1}` cho hoàn slot pack; nếu save `Booking` fail sau đó thì số lượt trong pack vẫn được hoàn lại nhưng booking vẫn cancelled (thực ra đây là double-credit).
- `cancelBooking` line 1319-1334: hoàn tiền vào `User.walletBalance` + tạo `WalletTransaction` → nếu các bước sau đó fail, ví đã cộng tiền nhưng `Booking.paymentStatus` chưa update.

**Mức độ:** **CRITICAL** — nguyên nhân số 1 của "dữ liệu không nhất quán" và "mất dữ liệu" bất thường trên production.

**Bằng chứng:** Comment dev-only không khớp với production behavior; render.yaml xác nhận production.

---

#### 🔴 C-2: Frontend log password ra console + lộ secret trong browser

**File:** `FE/src/App.jsx` (dòng 156-184, cụ thể dòng 157)

```js
console.log('Sending login payload:', { identifier, password });
```

**Vấn đề:**
- In production, Vite vẫn giữ `console.log` (trừ khi `terser` strip). Password hiển thị plaintext trong DevTools của bất kỳ ai mở app.
- Bất kỳ extension nào (React DevTools, error tracker như Sentry/Datadog) có thể capture.

**Mức độ:** **CRITICAL (security)**, không trực tiếp gây mất dữ liệu nhưng góp phần vào compromise.

---

#### 🔴 C-3: SSE hook tự bắn lại toàn bộ SYNC_EVENTS khi socket reconnect

**File:** `FE/src/hooks/useSSE.js` (dòng 27–38)

```js
SYNC_EVENTS.forEach((eventName) => {
  const listener = listenersRef.current[eventName];
  if (listener) {
    try {
      listener({ isSync: true });  // ← bắn lại tất cả listener
    } catch (e) {
      console.error('[useSSE] sync listener error for', eventName, e);
    }
  }
});
```

**Vấn đề:**
- Mỗi lần `socket.connect` (sau network blip, mobile switch wifi/4G, corporate proxy timeout), hook này gọi lại MỌI listener đã đăng ký.
- File thực tế dùng `socket.io-client` (line 2: `import { io } from 'socket.io-client'`), không phải EventSource — tên file `useSSE.js` gây hiểu nhầm.
- Mỗi listener thường gọi `fetch('/api/bookings/my')` hoặc tương tự → reconnect = refetch toàn bộ.
- Subscriber quan trọng: `customer/BookingsHistory.jsx:209-214`, `landing/HistoryPage.jsx`, `Navbar.jsx:97-102`, `NotificationBell.jsx:81-87`, `AdminLayout.jsx:56-58`, `ManagerLayout.jsx:70-72`.

**Ảnh hưởng:**
- UI "flash" hoặc "reset" về trạng thái fetch lại.
- Trên mobile với 4G không ổn định, có thể thấy "dữ liệu cũ" trong 1 frame rồi quay về "dữ liệu mới".
- Kết hợp với FE có `Main` React.StrictMode (chạy effect 2 lần trong dev), flicker càng nặng.

**Mức độ:** **HIGH** — đây là ứng viên số 1 cho triệu chứng "dữ liệu bị reset / load lại" mà user thấy trên FE.

**Bằng chứng:** Code đã rõ; comment trong `Mobile/src/services/sse.ts` (line 73-82) cũng thừa nhận đây là vấn đề từng gây "Maximum update depth".

---

#### 🔴 C-4: Auto-cancel job chạy mỗi 1 phút với grace chỉ 5 phút

**File:** `BE/src/jobs/autoCancel.job.js` (dòng 7, 17)

```js
const GRACE_MINUTES = 5;
cron.schedule('*/1 * * * *', async () => {
  ...
  const result = await bookingService.autoCancelNoShows(GRACE_MINUTES);
```

**File:** `BE/src/services/booking.service.js:1399-1508` (`autoCancelNoShows`)

**Vấn đề:**
- Booking sau 5 phút kể từ `startTime` không check-in → tự động hủy + strike no-show.
- LATE_WARNING_OFFSET_MINUTES = 2 (line 28), warnAt = deadline - 2 phút → nếu grace 5 thì warn ở deadline-2 = 3 phút sau startTime, tức là **SAU giờ bắt đầu**, khi khách đã trễ rồi.
- Cron chạy mỗi 1 phút → độ trễ thực tế 1-6 phút sau deadline.
- Cùng với C-1 (transactions no-op): nếu `findOneAndUpdate({status: ...})` update status xong mà `voucherService.rollbackVoucher()` fail → voucher đã rollback nhưng booking vẫn cancelled (data diverge).

**Ảnh hưởng:**
- Khách đến trễ 5+ phút (kẹt xe, tìm đường,…) bị hủy oan.
- Race condition với manager đang xác nhận → cancelled status ghi đè confirmed.

**Mức đề xuất mức độ:** **HIGH** — vì user có thể thấy "booking bị hủy dù mình chưa làm gì".

---

### 3.2. HIGH — Có khả năng gây mất / sai lệch dữ liệu nhưng chưa chắc chắn

#### 🟠 H-1: Booking slot pack — `$inc` không rollback khi validate fail

**File:** `BE/src/services/booking.service.js:252-276`

```js
const pack = await SlotPack.findOneAndUpdate(
  { _id: slotPackId, userId, status: 'active', remainingSlots: { $gt: 0 } },
  { $inc: { remainingSlots: -1, usedSlots: 1 } },
  { new: true, session }
);
if (!pack) throw ... SLOT_PACK_INVALID

if (pack.expiresAt && new Date() > pack.expiresAt) {
  await SlotPack.findByIdAndUpdate(pack._id, { $inc: { remainingSlots: 1, usedSlots: -1 } }, { session });
  throw ... SLOT_PACK_EXPIRED
}
```

**Vấn đề:**
- Đoạn code manual rollback (3 chỗ: expired, branch mismatch, vehicle mismatch). Mỗi chỗ phải nhớ `$inc ngược`.
- Nếu `throw` xảy ra ở giữa các validate (ví dụ: giữa check `branchId` và check `vehicleId`), phần rollback trước đó chạy nhưng phần rollback sau không chạy → slot bị trừ một nửa.
- Vì transactions no-op (C-1), ngay cả khi `await booking.save()` fail (line 305), slot pack decrement KHÔNG được rollback tự động.

**Bằng chứng:** Manual rollback pattern; 3 chỗ rollback riêng lẻ.

---

#### 🟠 H-2: Recurring booking — rebook payment chuyển `bookingId` của payment nhưng không check idempotency

**File:** `BE/src/services/booking.service.js:1261-1278` (trong `cancelBooking`)

```js
if (booking.isRecurringFirst) {
  const nextBooking = await Booking.findOne({ ... }).sort({ recurringPosition: 1 }).session(session);

  if (nextBooking) {
    nextBooking.isRecurringFirst = true;
    nextBooking.depositAmount = Math.max(0, groupDepositAmount - depositShare);
    nextBooking.paymentStatus = booking.paymentStatus;
    await nextBooking.save({ session });

    const payment = await Payment.findOne({ bookingId: id }).session(session);
    if (payment) {
      payment.bookingId = nextBooking._id;
      await payment.save({ session });
    }
  }
```

**Vấn đề:**
- Khi hủy buổi đầu của nhóm định kỳ → payment chuyển sang buổi kế tiếp.
- Nhưng `groupDepositAmount` lấy từ `firstBooking.depositAmount` (line 1246), và `nextBooking.depositAmount = Math.max(0, groupDepositAmount - depositShare)`.
- Nếu hủy nhiều buổi liên tiếp, mỗi lần đều di chuyển payment và modify nextBooking.depositAmount. Sau 2 lần hủy buổi đầu (đã trở thành buổi thứ 2), payment đã chuyển 2 lần — `payment.bookingId` có thể trỏ về một booking không còn depositAmount khớp.
- Vì transactions no-op (C-1), lỗi ở bước save `nextBooking` mà `payment.save()` đã chạy → payment trỏ vào nextBooking nhưng nextBooking không update depositAmount.

**Bằng chứng:** Phức tạp, nhiều bước tuần tự, không có guard idempotency.

---

#### 🟠 H-3: `Booking.findOneAndUpdate({ _id, status: currentBooking.status })` race condition trong `updateBookingStatus`

**File:** `BE/src/services/booking.service.js:689-699`

```js
const booking = await Booking.findOneAndUpdate(
  { _id: id, status: currentBooking.status },
  update,
  { new: true }
)
if (!booking) {
  throw Object.assign(new Error('Booking status was changed by another request'), { statusCode: 409, code: 'CONCURRENT_MODIFICATION' });
}
```

**Vấn đề:**
- Đã có optimistic concurrency control (kiểm tra status), tốt.
- NHƯNG `currentBooking` được load TRƯỚC đó không qua session. Nếu BE bị restart giữa 2 thao tác, hoặc 2 request đến cùng lúc:
  - Request A: `status='confirmed' → 'checked_in'` ✓
  - Request B (auto-cancel cron): `status='confirmed' → 'cancelled'` chạy đồng thời
  - Cả 2 đều đọc `currentBooking.status='confirmed'`, nhưng ai update trước thì thắng; người kia throw 409.
- Auto-cancel cron race với manager check-in là chuyện thường xuyên.

**Ảnh hưởng:** Manager check-in thành công nhưng 1 giây sau booking bị auto-cancel do cron chạy giữa — khách "biến mất" khỏi schedule.

**Mức độ:** **HIGH** vì xảy ra thường xuyên ở giờ cao điểm.

---

#### 🟠 H-4: Cancel booking hoàn tiền cộng dồn `walletBalance` không check duplicate

**File:** `BE/src/services/booking.service.js:1318-1334`

```js
if (refundAmount > 0) {
  refundStatus = 'completed';
  const user = await mongoose.model('User').findById(booking.userId).session(session);
  if (user) {
    user.walletBalance = (user.walletBalance || 0) + refundAmount;
    await user.save({ session });

    await mongoose.model('WalletTransaction').create([{
      userId: user._id,
      amount: refundAmount,
      type: 'credit',
      reason: `Hoàn tiền hủy lịch hẹn #${booking.bookingCode || id}`,
      bookingId: booking._id,
    }], { session });
  }
}
```

**File:** `BE/fix-refunds.js` (line 9–22)

**Vấn đề:**
- Script `fix-refunds.js` chạy thủ công **CỘNG DỒN** `walletBalance` cho cancelled slot packs có `refundStatus: 'pending'`.
- Nếu script này chạy 2 lần → double credit.
- Trong `cancelBooking` line 1319, không có guard "đã hoàn tiền cho booking này chưa" — chỉ check `payment.status === 'paid'` (line 1281). Nếu BE bị restart giữa 2 lần cancel → cùng 1 booking có thể hoàn 2 lần.

**Bằng chứng:** Script fix-refunds.js không có idempotency; cancelBooking không check `refundStatus` đã 'completed' trước khi cộng.

---

#### 🟠 H-5: Frontend xóa cứng (hard delete) từ Admin/Manager không có audit log

**File:** `FE/src/components/admin/AdminBookings.jsx:108-129`
**File:** `FE/src/components/admin/AdminPayments.jsx:431-452`
**File:** `FE/src/components/shared/RefundRequests.jsx:270-291`
**File:** `FE/src/components/admin/UserManagement.jsx:750-771`

```js
if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tất cả ${count} đặt lịch?`)) {
  await api(`/bookings/range?all=true`, { method: 'DELETE' });
}
```

**Vấn đề:**
- `window.confirm()` dễ bị nhầm (enter yes), không có audit log ai xóa lúc nào.
- Backend BE `booking.service.js:1574-1577` chỉ check role admin, không có soft-delete:
  ```js
  exports.deleteAllBookings = async () => {
    const result = await Booking.deleteMany({});
    return { deletedCount: result.deletedCount };
  };
  ```
- Cùng với `BE/scripts/clean-null-booking-payments.js`, `migrate-remove-motorbike-vehicles.js`, `update_packages_carwash.js` — toàn bộ là **hard delete/update không backup**.
- `UserManagement.jsx` xóa user "vĩnh viễn" — chỉ chặn khi còn booking/slotpack active (auth.service.js:317), nhưng nếu data đã được set inactive trước đó → vẫn xóa sạch lịch sử.

**Mức đề xuất:** **HIGH** vì 1 cú click nhầm = mất toàn bộ data.

---

#### 🟠 H-6: Mobile `sse.ts` thực chất dùng `socket.io-client` nhưng tên file gây nhầm

**File:** `Mobile/src/services/sse.ts` (line 1-6, 62)

```js
// (header) Socket Service (formerly SSE Service)
const baseUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
const socket = io(baseUrl, { ... });
```

**Vấn đề:**
- File tên `sse.ts` nhưng thực tế dùng socket.io-client.
- Trên Mobile, fallback `EXPO_PUBLIC_API_URL` là `http://localhost:5000` — khi app production build mà không set env → connect tới localhost → fail silent.
- Cùng với C-3 (FE) và việc SSE service ở BE (`sse.service.js`) catch mọi error (`try { socket.getIO()... } catch (err) { /* ignore */ }`), mất kết nối không log.

**Bằng chứng:** File header thừa nhận "formerly SSE Service"; EXPO_PUBLIC_API_URL không có default production.

---

#### 🟠 H-7: `Mobile` History screen subscribe 6 SSE events đồng thời → re-render storm

**File:** `Mobile/app/(tabs)/history.tsx` (line 250–262)

**Vấn đề:**
- Mỗi lần SSE event fire → fetch lại toàn bộ bookings + stats + filter.
- Với 6 events đăng ký, 1 backend action (vd manager confirm booking) có thể kích hoạt tới 4-5 event `my_bookings_updated`, `slots_updated`, `booking_new`, … mỗi event trigger 1 fetch riêng.
- Kết hợp React Strict Mode (Expo dev mode) → fetch 2 lần.
- Cảm giác "dữ liệu nhảy loạn xạ" hoặc "đang xem thì tự reset".

---

### 3.3. MEDIUM — Có thể gây vấn đề nhưng ít nguy cơ hơn

#### 🟡 M-1: `npm run clear:bookings` trỏ tới file không tồn tại

**File:** `BE/package.json:12`

```json
"clear:bookings": "node scripts/clear-all-bookings.js"
```

**Vấn đề:** File `BE/scripts/clear-all-bookings.js` KHÔNG tồn tại (glob trả về rỗng). Hiện tại command fail nhưng nếu ai tạo lại file này "cho chạy được" → xóa sạch toàn bộ Booking.

---

#### 🟡 M-2: 11 file scripts trong `BE/` root có thể ghi đè data khi chạy nhầm env

| File | Hành động |
|------|-----------|
| `fix-refunds.js` | Cộng wallet cho cancelled slot packs (KHÔNG idempotent) |
| `fix_all_images.js` | `updateMany` image trên mọi branch |
| `updateGifts.js` | `updateMany` vouchers |
| `update_branches_native.js` | overwrite image path |
| `update_branch_emails.js` | overwrite email (hardcoded local URI `127.0.0.1:27017/washpro`) |
| `update_branch_images.js` | `fs.copyFileSync` từ đường dẫn user `C:\Users\lukas\...` rồi DB updateMany |
| `update_packages_carwash.js` | `deleteMany` packages + tạo lại, **chạy cả Atlas và local** |
| `BE/scripts/migrate-remove-motorbike-vehicles.js` | Rewrite `vehicleType: 'motorbike'` → `'sedan'` |
| `BE/scripts/seed-branches-packages.js` | `deleteMany` Users/Branches/Packages/Vehicles/Bookings/Vouchers/SlotPacks rồi reseed |
| `BE/scripts/fix-payment-pending-index.js` | **Bulk-flip duplicate pending payments sang failed** |
| `BE/scripts/clean-null-booking-payments.js` | Mark mọi null-booking pending payment thành failed |

**Vấn đề:** Tất cả đều chạy thủ công, không có flag `--dry-run`, không có backup. `MONGODB_URI` mặc định trỏ Atlas.

---

#### 🟡 M-3: `Mobile/src/types/index.ts` define `Booking.tier` nhưng BE không trả tier trong populate

**File:** `Mobile/src/types/index.ts` (modified trong current diff)

**Vấn đề:** TypeScript types khai báo `tier`, `paymentMethod`, … nhưng phía BE populate `userId` chỉ chọn `name email phone tier walletBalance` — đôi khi frontend tưởng field có nhưng BE không trả.

---

#### 🟡 M-4: Frontend `BookingsHistory.jsx` (orphaned customer/) vẫn subscribe SSE

**File:** `FE/src/components/customer/BookingsHistory.jsx`

**Vấn đề:** File 65KB này không có ai import (`grep` không tìm thấy). Nhưng Vite vẫn có thể bundle nó qua dynamic import / lazy load. Nếu có, sẽ subscribe SSE → reconnect blast → nặng thêm C-3.

---

#### 🟡 M-5: CORS mở cho mọi `*.vercel.app`

**File:** `BE/src/app.js:25`

```js
if (origin.endsWith('.vercel.app')) return callback(null, true);
```

**Vấn đề:** Mọi Vercel preview deployment (kể cả của contributor bên ngoài) có thể gọi API. Không trực tiếp gây mất data nhưng gia tăng attack surface.

---

### 3.4. LOW — Cảnh báo / bất thường không gây mất dữ liệu trực tiếp

#### 🟢 L-1: `FE/src/App.jsx:37-39` — handleUserUpdate không check null user

```js
const handleUserUpdate = useCallback((updated) => {
  setUser(prev => ({ ...prev, ...updated }));
}, []);
```

Nếu `user === null` (sau logout), `...prev` throws. Được invoke unconditional từ nhiều component con.

---

#### 🟢 L-2: `Mobile/src/services/sse.ts` đã có comment về "Maximum update depth"

```js
// TODO: Consider removing old SSE-based re-emit logic to avoid "Maximum update depth" errors
```

Đây là tàn dư của bug trước đó. Sau khi sửa, vẫn còn nguy cơ.

---

#### 🟢 L-3: Cấu hình thiếu: `render.yaml` không set `API_URL`, `FE_URL`, `MONGODB_URI`

Trên Render production, FE_URL mặc định `http://localhost:5173` → VNPay return URL sai → khách không quay lại app đúng cách.

---

#### 🟢 L-4: `BE/scripts/debug-payment-index.js` còn lại trong repo — script này tạo test payments rồi xóa, không phù hợp production.

---

#### 🟢 L-5: `Mobile/replace_fonts.js` ở root — hardcode path `e:/WDP/AutoWashPro-WDP301/Mobile/...`. Chạy nhầm = thay đổi source trên ổ người khác.

---

## 4. NGUYÊN NHÂN GỐC (ROOT CAUSE)

### 4.1. Root cause chính của triệu chứng "mất dữ liệu / reset / bất thường"

**R-1: Transactions no-op ở production (C-1)**
- Bằng chứng: `BE/src/config/db.js:9-18` patch `startSession` mà không có guard `NODE_ENV`.
- Tác động lan truyền: Mỗi write bọc session trong booking/payment/refund/slotPack đều có thể thành công một nửa → dữ liệu "biến mất" so với kỳ vọng user.

**R-2: SSE reconnect blast (C-3 + H-7)**
- Bằng chứng: `FE/src/hooks/useSSE.js:27-38` tự gọi lại listener khi socket connect.
- Tác động: Mỗi lần mobile đổi mạng / tab refresh / corporate proxy drop → toàn bộ page fetch lại → user thấy "reset về trạng thái cũ".

**R-3: Auto-cancel aggressive grace (C-4)**
- Bằng chứng: `autoCancel.job.js:7` GRACE_MINUTES = 5, cron `*/1 * * * *`.
- Tác động: Khách trễ 5-10 phút bị hủy oan → "đặt lịch xong rồi mất".

**R-4: Race condition cancel ↔ other operations (H-3)**
- Bằng chứng: `booking.service.js:689-699` optimistic concurrency chỉ chống race khi cùng status; auto-cancel vẫn đè lên nếu manager đang thao tác.

### 4.2. Root cause phụ (gây ra triệu chứng nhẹ hơn)

- Hard delete admin không có audit log (H-5)
- Recurring booking rebook payment không idempotent (H-2)
- Slot pack decrement không rollback an toàn (H-1)
- Script maintenance chạy nhầm env (M-2)
- FE `App.jsx` `setUser(prev => ...)` không null-check (L-1)

---

## 5. RỦI RO TIỀM ẨN (chưa gây lỗi nhưng có thể phát sinh)

| ID | Rủi ro | Khả năng | Tác động |
|----|--------|---------|----------|
| F-1 | VNPay IPN race với manual confirm | Medium | Double payment confirmation nếu cả IPN và return URL đều fire |
| F-2 | `clear:bookings` được tạo lại bởi dev nào đó | Low | Xóa sạch toàn bộ booking |
| F-3 | Birthday job chạy 2 lần do restart | Medium | Duplicate voucher cùng user |
| F-4 | `seed-branches-packages.js` được chạy nhầm trên prod | Low | Xóa sạch Users + Branches + … rồi reseed fixtures |
| F-5 | Mobile SecureStore corrupted khi reinstall app | Medium | User phải login lại (acceptable) nhưng booking draft (AsyncStorage) cũng mất |
| F-6 | Recurring booking vượt 12 tuần + gap > capacity → silent skip | Medium | User thấy "đặt 24 buổi nhưng chỉ tạo 18" |
| F-7 | SSE `addClient` map grows không giới hạn nếu client không disconnect sạch | Low | Memory leak sau nhiều ngày |
| F-8 | Refund request approve → wallet cộng tiền nhưng payment status vẫn 'paid' (nếu `refundPayment` fail giữa) | Medium | Audit trail sai |
| F-9 | CORS mở `*.vercel.app` cho phép attacker chạy cron job qua Vercel preview | Low | Kết hợp với các endpoint admin = takeover |
| F-10 | `process.kill(pid, 'SIGTERM')` ở `server.js:33-67` có thể kill nhầm process khác trên cùng port | Low | Wipe session, mid-write transaction |

---

## 6. ĐỀ XUẤT HƯỚNG KHẮC PHỤC AN TOÀN

> **Nguyên tắc:** Mỗi đề xuất dưới đây đều:
> - Không thay đổi business logic
> - Không phá vỡ API contract
> - Có thể rollback bằng 1 commit
> - Không ảnh hưởng đến UI hiện có

### 6.1. Sửa NGAY (critical, làm trước)

**Fix #1 — Transactions no-op (C-1)**

Thêm guard `NODE_ENV` vào `BE/src/config/db.js`:

```js
const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  // dev-only patch; production Atlas hỗ trợ transactions natively
  const originalStartSession = mongoose.startSession.bind(mongoose);
  mongoose.startSession = async function() {
    const session = await originalStartSession();
    session.startTransaction = () => {};
    session.commitTransaction = async () => {};
    session.abortTransaction = async () => {};
    session.inTransaction = () => false;
    return session;
  };
}
```

**An toàn vì:** Không thay đổi logic business; chỉ un-no-op transactions cho production. Mọi service hiện đang viết transaction đều work correctly khi thực sự có transaction.

**Fix #2 — Log password (C-2)**

Xóa dòng `console.log('Sending login payload:', ...)` trong `FE/src/App.jsx:157`.

**An toàn vì:** Chỉ xóa 1 dòng log.

### 6.2. Sửa trong tuần này (high)

**Fix #3 — SSE reconnect blast (C-3)**

Sửa `FE/src/hooks/useSSE.js` để chỉ bắn SYNC_EVENTS khi reconnect **lần đầu** (không phải reconnect do network blip). Pattern:

```js
// Pseudo-code (không apply, chỉ mô tả)
const isInitialConnect = useRef(true);
useEffect(() => {
  socket.on('connect', () => {
    if (!isInitialConnect.current) return; // bỏ qua reconnect
    isInitialConnect.current = false;
    SYNC_EVENTS.forEach(...);
  });
}, []);
```

Hoặc thay vì auto-fire, dispatch 1 event `reconnect_sync` và để component tự quyết định có fetch lại không.

**Fix #4 — Auto-cancel grace (C-4)**

Trong `BE/src/jobs/autoCancel.job.js` tăng GRACE_MINUTES từ 5 → 15 (giá trị cũ) hoặc thêm logic "warn thật sớm hơn". Cũng nên check `lateWarningSentAt === null` trước khi cancel để tránh cancel mà chưa warn.

**Fix #5 — `fix-refunds.js` idempotency (H-4)**

Trước khi `User.walletBalance += refundAmount`, check `WalletTransaction.findOne({ bookingId, type: 'credit', reason: /Hoàn tiền.*refund/ })`. Nếu đã tồn tại → skip.

### 6.3. Cải tiến (medium, có thể làm sau)

**Fix #6 — Soft delete admin**
Thay `deleteMany` bằng `updateMany({ isDeleted: true })` trong các route admin.

**Fix #7 — Audit log cho delete**
Trước khi delete, ghi 1 entry vào collection `AuditLog` mới: `{ adminId, action, collection, documentId, timestamp, payload }`.

**Fix #8 — Booking draft không 3-min auto-expire**
`Mobile` booking draft trong AsyncStorage đang có expiry cứng → chuyển sang persist không expire, hoặc tăng threshold lên 30 phút.

**Fix #9 — Refresh token rotate**
`auth.service.js:121-129` đã có rotation tốt. Chỉ cần đảm bảo FE `authStorage.js` cũng xóa refresh token cũ khi rotate.

**Fix #10 — Refactor `useSSE.js` thành custom hook clean hơn**
Hiện tại tên `useSSE` nhưng wrap `socket.io-client`. Đổi tên file + đổi tên hook thành `useRealtime`.

### 6.4. Dọn dẹp kỹ thuật (low, làm khi có thời gian)

- Xóa hoặc move vào `BE/scripts/` các file `BE/fix-*.js`, `BE/update_*.js`, `BE/test-agg.js`, `BE/_inspect.js`, `BE/test_agg.js`, `BE/replace_fonts.js` ở Mobile root.
- Xóa orphan components ở `FE/src/components/customer/`, `FE/src/components/manager/ManagerQRScanner.jsx`, `FE/src/components/landing/ServicesSection.jsx`, `FE/LoginRegister.jsx`, `FE/src/components/BookingFlow.jsx`, `FE/src/utils/socketEvents.js`.
- Tạo file `scripts/clear-all-bookings.js` (hiện đang missing) và require confirmation `--confirm` flag, hoặc xóa npm script alias.

---

## 7. BẢNG TÓM TẮT MỨC ĐỘ ẢNH HƯỞNG

| ID | Phát hiện | Mức độ | File chính |
|----|-----------|--------|------------|
| C-1 | Transactions no-op production | 🔴 CRITICAL | `BE/src/config/db.js` |
| C-2 | Password log ra console | 🔴 CRITICAL | `FE/src/App.jsx` |
| C-3 | SSE reconnect blast | 🔴 CRITICAL | `FE/src/hooks/useSSE.js` |
| C-4 | Auto-cancel grace 5 phút | 🔴 CRITICAL | `BE/src/jobs/autoCancel.job.js` |
| H-1 | Slot pack decrement không rollback | 🟠 HIGH | `BE/src/services/booking.service.js:252-276` |
| H-2 | Recurring payment rebook không idempotent | 🟠 HIGH | `BE/src/services/booking.service.js:1261-1278` |
| H-3 | Race auto-cancel vs manager check-in | 🟠 HIGH | `BE/src/services/booking.service.js:689-699` |
| H-4 | Wallet refund double-credit | 🟠 HIGH | `BE/src/services/booking.service.js:1318-1334` + `BE/fix-refunds.js` |
| H-5 | Hard delete admin không audit | 🟠 HIGH | 4 files FE |
| H-6 | Mobile sse.ts misleading name + localhost default | 🟠 HIGH | `Mobile/src/services/sse.ts` |
| H-7 | Mobile history 6 SSE events | 🟠 HIGH | `Mobile/app/(tabs)/history.tsx` |
| M-1 | `clear:bookings` npm script missing target | 🟡 MEDIUM | `BE/package.json:12` |
| M-2 | 11 destructive root scripts | 🟡 MEDIUM | `BE/*.js`, `BE/scripts/*.js` |
| M-3 | Type mismatch FE/BE `Booking.tier` | 🟡 MEDIUM | `Mobile/src/types/index.ts` |
| M-4 | Orphan `BookingsHistory.jsx` vẫn subscribe SSE | 🟡 MEDIUM | `FE/src/components/customer/` |
| M-5 | CORS mở `*.vercel.app` | 🟡 MEDIUM | `BE/src/app.js:25` |
| L-1 | `handleUserUpdate` null-check | 🟢 LOW | `FE/src/App.jsx:37-39` |
| L-2 | SSE "Maximum update depth" residual | 🟢 LOW | `Mobile/src/services/sse.ts` |
| L-3 | `render.yaml` thiếu `API_URL`, `FE_URL` | 🟢 LOW | `render.yaml` |
| L-4 | Debug scripts còn trong repo | 🟢 LOW | `BE/scripts/debug-payment-index.js` |
| L-5 | `Mobile/replace_fonts.js` hardcoded path | 🟢 LOW | `Mobile/replace_fonts.js` |

---

## 8. KẾT LUẬN

**Triệu chứng user mô tả ("mất dữ liệu", "reset", "bất thường") có 4 nguyên nhân chính có bằng chứng rõ ràng:**

1. **Transactions no-op ở production** (C-1) — đây là nguyên nhân hệ thống, ảnh hưởng đến MỌI write operation trong booking, payment, refund, slot pack. Một write fail giữa chừng = state không nhất quán = user thấy "mất".
2. **SSE reconnect blast** (C-3) — frontend thấy UI "reset" vì mỗi reconnect bắn lại toàn bộ fetch.
3. **Auto-cancel aggressive grace** (C-4) — booking bị hủy oan sau 5 phút.
4. **Race conditions trong cancel / recurring payment** (H-2, H-3) — concurrent operations ghi đè lẫn nhau.

**Các rủi ro còn lại (H, M, L) chưa chắc chắn gây lỗi nhưng nên xử lý trước khi scale.**

**Khuyến nghị ưu tiên:**
1. Sửa C-1 (transactions) — fix lớn nhất, ít rủi ro nhất
2. Sửa C-2 (password log) — 1 dòng code
3. Sửa C-3 (SSE reconnect) — bounded scope
4. Sửa C-4 (grace period) — config change
5. Sau đó làm các fix H theo thứ tự ưu tiên business

**Audit không sửa code, không refactor, không đưa giả định** — toàn bộ findings dựa trên source code đã đọc + git log + git status snapshot.

---

*Báo cáo kết thúc. Tất cả findings có file path và line number cụ thể, có thể dùng để truy vết.*