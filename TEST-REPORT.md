# AutoWashPro — Báo cáo Test & Phân tích lỗi

**Ngày:** 2026-07-04  
**Branch:** FE/Khang-dev1  
**BE Tests:** 45/45 PASSED  
**FE Build:** Cần chạy `npm run build` để xác nhận

---

## Tổng quan

| Hạng mục | Kết quả |
|----------|---------|
| BE API Tests | ✅ 45/45 pass |
| FE Build | ⚠️ Chưa chạy được (cần verify) |
| Lỗi Critical | 2 |
| Lỗi High | 5 |
| Lỗi Medium | 5 |
| Lỗi Low | 5 |

---

## LỖI CRITICAL (Crashapp / Không chạy được)

### C1. `AdminPayments.jsx` — `readErr` chưa define
- **File:** `FE/src/components/admin/AdminPayments.jsx:362`
- **Mô tả:** Gọi `readErr(res)` nhưng function chưa được import hoặc khai báo trong file. React sẽ crash với `ReferenceError: readErr is not defined`.
- **Fix:** Thêm function `readErr` hoặc import từ `@/lib/authStorage`.

### C2. `AdminPayments.jsx` — `Spinner` chưa define
- **File:** `FE/src/components/admin/AdminPayments.jsx:193`
- **Mô tả:** Dùng `<Spinner size={14} className="animate-spin" />` nhưng component `Spinner` chưa import/khai báo. Crash với `ReferenceError: Spinner is not defined`.
- **Fix:** Thêm `function Spinner({ size = 18 }) { ... }` hoặc import.

---

## LỖI HIGH (Logic sai / Dữ liệu sai)

### H1. Public voucher query leak branch-unrestricted vouchers
- **File:** `BE/src/services/voucher.service.js:617`
- **Mô tả:** Query `getPublicVouchersByBranch` có 2 condition bổ sung match voucher không có `branchId` + `applicableBranches` rỗng. Voucher admin tạo mà không chọn branch sẽ hiển thị ở **tất cả** chi nhánh, dù intended là "all branches" nhưng không có branchId cụ thể.
- **Fix:** Bỏ 2 condition cuối hoặc chỉ match khi `applicableToAllBranches: true`.

### H2. Manager auto-branch silent fail
- **File:** `BE/src/controllers/voucher.controller.js:5`
- **Mô tả:** `req.user.branchId` có thể là `undefined` nếu manager chưa được gán branch. Voucher tạo thành công nhưng không có `branchId` → bypass branch restriction.
- **Fix:** Throw 400 nếu manager không có `branchId`.

### H3. `AdminOverview.jsx` — Stale token at module scope
- **File:** `FE/src/components/admin/AdminOverview.jsx:28-30`
- **Mô tả:** `const token = getStoredToken()` và `const headers = {...}` chạy 1 lần khi module load. Nếu token refresh hoặc user login sau, tất cả 7 fetch calls dùng token cũ → 401 errors.
- **Fix:** Tính `token`/`headers` bên trong component hoặc callback `load()`.

### H4. `BranchDetailPage.jsx` — Trailing slash causes empty ID
- **File:** `FE/src/components/landing/BranchDetailPage.jsx:33`
- **Mô tả:** `location.pathname.split('/').pop()` trả `''` nếu URL có trailing slash (`/branch/123/`). API gọi `/branches/public/` → 400/404.
- **Fix:** Dùng `match` hoặc filter empty string: `path.split('/').filter(Boolean).pop()`.

### H5. `ManagerVouchers.jsx` — Manager sees ALL vouchers
- **File:** `FE/src/components/manager/ManagerVouchers.jsx:375`
- **Mô tả:** `fetch_()` gọi `/vouchers?search=...` không gửi `branchId`. BE auto-filter cho manager (`query.branchId = userBranchId`) nhưng nếu `userBranchId` undefined → thấy tất cả voucher.
- **Fix:** Đảm bảo manager luôn có `branchId` hoặc validate ở BE.

---

## LỖI MEDIUM (Anti-pattern / Dễ gây bug)

### M1. `DirectionsMap.jsx` — Map layers accumulate
- **File:** `FE/src/components/landing/DirectionsMap.jsx:82-116`
- **Mô tả:** Mỗi lần `userLoc` đổi, thêm `L.marker` + `L.polyline` mới mà không xóa cái cũ. Hiện chỉ fire 1 lần nhưng nếu retry sẽ bị duplicate markers.
- **Fix:** Dùng ` useRef` để track layers và remove trước khi add.

### M2. `AdminPayments.jsx` — `newIds` lazy init
- **File:** `FE/src/components/admin/AdminPayments.jsx:335`
- **Mô tả:** `useState(new Set())` tạo Set mới mỗi re-render. Nên dùng `useState(() => new Set())`.
- **Fix:** Lazy initializer.

### M3. `App.jsx` — useEffect deps warning
- **File:** `FE/src/App.jsx:113-126`
- **Mô tả:** `useEffect` với `[]` deps nhưng dùng `loadSession` và `navigate`. Exhaustive-deps lint sẽ warn. An toàn vì cả hai đều stable, nhưng nên list ra cho đúng.

### M4. `MapSection.jsx` — `onSelectBranch` dead UI
- **File:** `FE/src/components/landing/MapSection.jsx:284`
- **Mô tả:** Nút "Đặt lịch tại đây" trong floating card gọi `onSelectBranch?.()` nhưng prop này không bao giờ được truyền từ `App.jsx`. Button không làm gì cả.
- **Fix:** Truyền `onSelectBranch` từ App.jsx hoặc bỏ nút này.

### M5. `swagger.js` — Reference to non-existent file
- **File:** `BE/src/config/swagger.js:129`
- **Mô tả:** Swagger config import `checkin.routes.js` nhưng file này không tồn tại. Có thể crash khi load swagger.
- **Fix:** Bỏ reference hoặc tạo file route.

---

## LỖI LOW (Minor / Cosmetic)

### L1. `BranchDetailPage.jsx` — lat/lng used before declaration
- **File:** `FE/src/components/landing/BranchDetailPage.jsx:41-50`
- **Mô tả:** `requestDirections()` và `openGoogleMaps()` dùng `lat`/`lng` nhưng chúng được khai báo sau (line 122-123). Hoạt động nhờ closure nhưng code khó đọc.
- **Fix:** Move functions sau khi khai báo `lat`/`lng`.

### L2. `AdminRewards.jsx` — Array index as key
- **File:** `FE/src/components/admin/AdminRewards.jsx:319`
- **Mô tả:** Dùng `key={i}` (array index) cho voucher rows. Nên dùng `v._id`.
- **Fix:** `{vouchers.map((v) => (<tr key={v._id} ...>))}`.

### L3. `ManagerVouchers.jsx` — Same index-as-key issue
- **File:** `FE/src/components/manager/ManagerVouchers.jsx:271`
- **Mô tả:** Giống L2, dùng index làm key.
- **Fix:** Dùng `v._id`.

### L4. `useSSE.js` — Token in query string
- **File:** `FE/src/hooks/useSSE.js:19`
- **Mô tả:** SSE token truyền qua URL `?token=...`. Có thể bị log trong server access logs hoặc browser history.
- **Fix:** Chấp nhận trade-off hoặc document.

### L5. `voucher.service.js` — Duplicate code race condition
- **File:** `BE/src/services/voucher.service.js:4-9`
- **Mô tả:** `generateCode()` tạo code ngẫu nhiên, check duplicate SAU. Under concurrent requests, 2 voucher có thể cùng code. MongoDB unique index catch được nhưng error message generic.
- **Fix:** Retry loop hoặc rely on unique index + catch error.

---

## Kết luận

### Ưu tiên sửa ngay:
1. **C1 + C2** — `AdminPayments.jsx` thiếu `readErr` và `Spinner` → **crash trang admin payments**
2. **H3** — `AdminOverview.jsx` stale token → **dashboard stats fails after token refresh**
3. **H4** — Trailing slash ID → **branch detail page blank with trailing slash**

### Nên sửa sớm:
4. **H1** — Voucher leak giữa các chi nhánh
5. **H2** — Manager silent fail
6. **H5** — Manager thấy all vouchers

### Có thể sửa sau:
7. Tất cả lỗi Medium và Low

---

*Báo cáo được tạo tự động bởi test suite + static analysis.*
