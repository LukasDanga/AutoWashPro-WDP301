# AutoWashPro-WDP301 — Database Schema

> Hệ thống đặt lịch rửa xe (Car Wash Booking System)
>
> - **Database:** MongoDB (MongoDB Atlas — cluster `wdp301-autowashpro`)
> - **ODM:** Mongoose
> - **Vị trí code:** `BE/src/models/*.schema.js` (auto-load bởi `index.js`)

---

## Tổng quan liên kết (Relationship Overview)

```
User ───────────┬──> Vehicle.userId
                ├──> Booking.userId
                ├──> Payment.userId
                ├──> Notification.userId
                ├──> RefundRequest.userId
                ├──> WalletTransaction.userId
                ├──> PointHistory.userId
                ├──> VoucherUsage.userId
                ├──> SlotPack.userId
                ├──> Voucher.assignedTo
                └──> Voucher.createdBy

Branch ─────────┬──> Package.branchId
                ├──> Booking.branchId
                ├──> SlotPack.branchId
                ├──> Voucher.branchId
                ├──> User.branchId (manager)
                └──> Booking / Package (thông qua branchId)

Package ────────┬──> Booking.packageId
                ├──> SlotPack.packageId
                └──> Voucher.applicablePackages[]

Vehicle ────────┬──> Booking.vehicleId
                └──> SlotPack.vehicleId

Booking ────────┬──> Payment.bookingId
                ├──> VoucherUsage.bookingId
                ├──> Notification.bookingId
                ├──> RefundRequest.bookingId
                ├──> WalletTransaction.bookingId
                ├──> Booking.rebookedFromId (tự tham chiếu)
                └──> PointHistory.referenceId

SlotPack ───────┴──> Payment.slotPackId

Voucher ────────┴──> VoucherUsage.voucherId
```

---

## Danh sách Collections (16)

| # | Collection | Model | Mô tả |
|---|---|---|---|
| 1 | `users` | User | Người dùng (admin / manager / customer) |
| 2 | `vehicles` | Vehicle | Phương tiện của khách |
| 3 | `branches` | Branch | Chi nhánh |
| 4 | `packages` | Package | Gói dịch vụ |
| 5 | `bookings` | Booking | Đặt lịch (phức tạp nhất) |
| 6 | `payments` | Payment | Thanh toán |
| 7 | `vouchers` | Voucher | Mã giảm giá |
| 8 | `voucherusages` | VoucherUsage | Lịch sử dùng voucher |
| 9 | `notifications` | Notification | Thông báo |
| 10 | `loyaltyconfigs` | LoyaltyConfig | Cấu hình loyalty |
| 11 | `pointhistories` | PointHistory | Lịch sử điểm |
| 12 | `wallettransactions` | WalletTransaction | Giao dịch ví |
| 13 | `slotpacks` | SlotPack | Gói slot trả trước |
| 14 | `slotproducts` | SlotProduct | Gói slot bán sẵn |
| 15 | `gifts` | Gift | Vòng quay may mắn |
| 16 | `refundrequests` | RefundRequest | Yêu cầu hoàn tiền |

---

## 1. `users` — Người dùng

**Model:** `User` · **File:** `user.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `name` | String | default: `'Thành viên mới'`, trim | Tên hiển thị |
| `email` | String | **required, unique**, lowercase, trim | Email đăng nhập |
| `password` | String | **required**, minlength 6, bcrypt 12 rounds | Bị ẩn khỏi JSON |
| `phone` | String | trim | SĐT |
| `role` | String | enum: `admin` / `manager` / `customer` | Vai trò |
| `status` | String | enum: `active` / `inactive` / `suspended` | Trạng thái |
| `avatar` | String | default: Unsplash URL | Ảnh đại diện |
| `dateOfBirth` | Date | — | Ngày sinh |
| `refreshToken` | String | `select: false` | JWT refresh |
| `lastLogin` | Date | — | Đăng nhập gần nhất |
| `forgotPasswordToken` | String | `select: false` | Token reset mật khẩu |
| `forgotPasswordExpires` | Date | `select: false` | Hết hạn token |
| `branchId` | ObjectId | ref: `Branch` | Chi nhánh quản lý (manager) |
| `loyaltyPoints` | Number | default: 0 | Điểm hiện tại |
| `lifetimePoints` | Number | default: 0 | Điểm tích lũy |
| `tier` | String | enum: `bronze`/`silver`/`gold`/`diamond`/`VIP`, default `bronze` | Hạng loyalty |
| `pointsExpiresAt` | Date | — | Hạn điểm |
| `noShowCount` | Number | default: 0, min 0 | Số lần không đến |
| `spinCount` | Number | default: 0, min 0 | Lượt quay may mắn |
| `walletBalance` | Number | default: 0, min 0 | Số dư ví (VND) |
| `isDeleted` | Boolean | default: false | Soft delete |
| `deletedAt` | Date | — | Thời điểm xóa mềm |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**Indexes:** `phone`, `branchId`, `forgotPasswordToken`, `email` (unique)

**Quan hệ đi:** `userId` → Vehicle, Booking, Payment, Notification, RefundRequest, WalletTransaction, PointHistory, VoucherUsage, SlotPack · `assignedTo`/`createdBy` → Voucher · `staffId` → Booking

---

## 2. `vehicles` — Phương tiện

**Model:** `Vehicle` · **File:** `vehicle.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `userId` | ObjectId | **required**, ref: `User` | Chủ xe |
| `licensePlate` | String | **required**, uppercase, trim, tự normalize (bỏ space, in hoa) | Biển số |
| `vehicleType` | String | **required**, enum: `sedan`/`suv`/`pickup`/`van` | Loại xe |
| `brand` | String | **required**, trim | Hãng |
| `model` | String | trim | Dòng xe |
| `color` | String | **required**, trim | Màu |
| `year` | Number | — | Năm sản xuất |
| `imageUrl` | String | — | Ảnh |
| `isDefault` | Boolean | default: false | Xe mặc định |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**Indexes:** `userId`, **unique compound** `{userId, licensePlate}`

**Quan hệ đi:** `vehicleId` → Booking, SlotPack

---

## 3. `branches` — Chi nhánh

**Model:** `Branch` · **File:** `branch.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `name` | String | **required**, trim, maxlength 200 | Tên chi nhánh |
| `city` | String | trim, maxlength 50 | Thành phố |
| `address` | String | **required**, trim, maxlength 500 | Địa chỉ |
| `phone` | String | trim, maxlength 20 | SĐT |
| `email` | String | trim, lowercase | Email |
| `openingTime` | String | default: `'07:00'` | Giờ mở cửa |
| `closingTime` | String | default: `'18:00'` | Giờ đóng cửa |
| `status` | String | enum: `active` / `inactive` | Trạng thái |
| `image` | String | — | Ảnh |
| `location` | GeoJSON | `{type: 'Point', coordinates: [0,0]}` | **2dsphere index** |
| `managerId` | ObjectId | ref: `User` | Quản lý |
| `mapCoordinates` | Embedded | `{svgCx, svgCy}` | Tọa độ trên map |
| `isDeleted` | Boolean | default: false | Soft delete |
| `deletedAt` | Date | — | — |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**Indexes:** `name`, `status`, `location` (2dsphere), `managerId`

**Quan hệ đi:** `branchId` → Package, Booking, SlotPack, Voucher, User

---

## 4. `packages` — Gói dịch vụ

**Model:** `Package` · **File:** `package.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `name` | String | **required**, trim, maxlength 200 | Tên gói |
| `description` | String | trim, maxlength 1000 | Mô tả |
| `price` | Number | **required**, min 0 | Giá (VND) |
| `duration` | Number | **required**, min 1 | Thời lượng (phút) |
| `image` | String | — | Ảnh |
| `branchId` | ObjectId | ref: `Branch` | Chi nhánh |
| `status` | String | enum: `active` / `inactive`, default `active` | Trạng thái |
| `category` | String | enum: `external`/`internal`/`full`, default `full` | Loại dịch vụ |
| `vehicleTypes` | [String] | enum: `sedan`/`suv`/`pickup`/`van` | Xe phù hợp |
| `subServices` | [Embedded] | — | Dịch vụ cộng thêm |
| `isDeleted` | Boolean | default: false | Soft delete |
| `deletedAt` | Date | — | — |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**subServices[]:** `name` (required) · `price` (required, min 0) · `duration` (required, min 0) · `isOptional` (default true)

**Indexes:** `status`, `category`, `branchId`

**Quan hệ đi:** `packageId` → Booking, SlotPack · `applicablePackages[]` → Voucher

---

## 5. `bookings` — Đặt lịch (collection phức tạp nhất)

**Model:** `Booking` · **File:** `booking.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `userId` | ObjectId | **required**, ref: `User` | Khách đặt |
| `bookingCode` | String | **unique, sparse** | Mã đặt lịch (VD: `AW-20260731-A3F9B2`) |
| `branchId` | ObjectId | **required**, ref: `Branch` | Chi nhánh |
| `packageId` | ObjectId | **required**, ref: `Package` | Gói dịch vụ |
| `packageName` | String | — | **Snapshot** tên gói |
| `packageDuration` | Number | — | **Snapshot** thời lượng |
| `vehicleId` | ObjectId | **required**, ref: `Vehicle` | Xe |
| `bookingDate` | Date | **required** | Ngày đặt |
| `startTime` | String | **required** | Giờ bắt đầu (HH:mm) |
| `endTime` | String | **required** | Giờ kết thúc (HH:mm) |
| `status` | String | enum: `pending`→`confirmed`→`checked_in`→`in_progress`→`awaiting_payment`→`completed`, `cancelled` | Trạng thái |
| `note` | String | trim, maxlength 500 | Ghi chú |
| `confirmedAt` | Date | — | Thời điểm xác nhận |
| `cancelledAt` | Date | — | Thời điểm hủy |
| `cancelledBy` | String | enum: `customer`/`admin`/`manager`/`system` | Ai hủy |
| `cancellationReason` | String | trim, maxlength 500 | Lý do hủy |
| `cancelOtpToken` | String | — | OTP hủy |
| `cancelOtpExpires` | Date | — | Hết hạn OTP |
| `rescheduleCount` | Number | default: 0 | Số lần đổi lịch |
| `lateWarningSentAt` | Date | — | Cảnh báo auto-cancel |
| `suggestedSlotStartTime` | String | — | Slot gợi ý đổi |
| `graceExtensionMinutes` | Number | default: 0, min 0 | Gia hạn thêm |
| `bookingType` | String | enum: `single`/`recurring`/`slot_pack_usage` | Loại đặt |
| `recurringGroupId` | String | indexed | UUID nhóm định kỳ |
| `isRecurringFirst` | Boolean | default: false | Buổi đầu nhóm |
| `recurringPosition` | Number | min 1 | Vị trí trong nhóm |
| `recurringTotal` | Number | min 1 | Tổng buổi |
| `priority` | Number | default 1, 1–4 | Ưu tiên theo tier |
| `slotPackId` | ObjectId | ref: `SlotPack` | Gói slot dùng |
| `selectedSubServices` | [Embedded] | — | Add-on đã chọn |
| `voucherCode` | String | trim, uppercase | **Snapshot** mã voucher |
| `discountAmount` | Number | default 0, min 0 | **Snapshot** tiền giảm |
| `finalPrice` | Number | min 0 | Giá cuối |
| `depositAmount` | Number | default 0, min 0 | Tiền cọc |
| `depositPaid` | Boolean | default: false | Đã đóng cọc |
| `depositPaidAt` | Date | — | — |
| `paymentStatus` | String | enum: `unpaid`/`pending`/`deposit_paid`/`paid`/`refunded` | Trạng thái thanh toán |
| `refundStatus` | String | enum: `none`/`pending`/`completed` | Trạng thái hoàn tiền |
| `refundAmount` | Number | default: 0 | Tiền hoàn |
| `paymentMethod` | String | enum: `cash`/`momo`/`vnpay`/`bank`/`sepay`/`wallet` | Phương thức |
| `paidAt` | Date | — | — |
| `checkInTime` | Date | — | Check-in |
| `checkOutTime` | Date | — | Check-out |
| `serviceDuration` | Number | — | Thời lượng thực tế |
| `staffId` | ObjectId | ref: `User` | Nhân viên phục vụ |
| `rating` | Number | 1–5 | Đánh giá |
| `feedback` | String | trim, maxlength 1000 | Nhận xét |
| `feedbackAt` | Date | — | — |
| `managerReply` | String | trim, maxlength 1000 | Phản hồi quản lý |
| `managerReplyAt` | Date | — | — |
| `rebookedFromId` | ObjectId | ref: `Booking` | Đặt lại từ booking cũ |
| `isDeleted` | Boolean | default: false, indexed | Soft delete |
| `deletedAt` | Date | — | — |
| `deletedBy` | String | enum: `admin`/`system`/`migration` | Ai xóa |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**selectedSubServices[]:** `name` (required) · `price` (required, min 0) · `duration` (required, min 0) · `isOptional` (default true)

**Indexes:** `userId` · `branchId` · `{branchId, bookingDate, status}` · `paymentStatus` · `voucherCode` · `{branchId, bookingDate, startTime, status}` · `bookingCode` (unique, sparse) · `isDeleted` · `recurringGroupId`

**Quan hệ:** trung tâm của hệ thống — nối tới hầu hết collection khác

---

## 6. `payments` — Thanh toán

**Model:** `Payment` · **File:** `payment.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `bookingId` | ObjectId | ref: `Booking` | Booking liên quan |
| `slotPackId` | ObjectId | ref: `SlotPack` | Gói slot liên quan |
| `packageName` | String | trim | **Snapshot** tên gói |
| `packagePrice` | Number | min 0 | **Snapshot** giá gói |
| `userId` | ObjectId | **required**, ref: `User` | Người trả |
| `amount` | Number | **required**, min 0 | Số tiền |
| `method` | String | **required**, enum: `cash`/`momo`/`vnpay`/`bank`/`wallet` | Phương thức |
| `paymentType` | String | enum: `deposit`/`remaining`/`full`/`topup` | Loại thanh toán |
| `status` | String | enum: `pending`/`paid`/`failed`/`refunded` | Trạng thái |
| `transactionId` | String | — | Mã nội bộ |
| `paymentUrl` | String | — | URL cổng |
| `qrCode` | String | — | QR |
| `paidAt` | Date | — | — |
| `refundedAt` | Date | — | — |
| `gatewayTransactionId` | String | — | Mã cổng ngoài |
| `failureReason` | String | — | Lý do lỗi |
| `retryCount` | Number | default: 0 | Số lần thử lại |
| `client` | String | enum: `web`/`mobile`, default `web` | Nguồn |
| `viewedAt` | Date | default: null | — |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**Indexes:** `bookingId` · `slotPackId` · `userId` · `status` · `gatewayTransactionId` · **partial unique** `{bookingId, status}` khi `status='pending'` && `bookingId` tồn tại (ngăn 1 booking có nhiều payment pending)

---

## 7. `vouchers` — Mã giảm giá

**Model:** `Voucher` · **File:** `voucher.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `code` | String | **required, unique**, uppercase, trim | Mã voucher |
| `name` | String | **required**, trim, maxlength 200 | Tên |
| `description` | String | trim, maxlength 500 | Mô tả |
| `type` | String | **required**, enum: `percentage`/`fixed` | Loại giảm |
| `value` | Number | **required**, min 0 | Giá trị |
| `maxDiscount` | Number | min 0, default 0 | Trần giảm (cho %) |
| `minOrder` | Number | min 0, default 0 | Đơn tối thiểu |
| `quantity` | Number | **required**, min 0 | Tổng số |
| `remaining` | Number | default: 0 | Còn lại |
| `startDate` | Date | **required** | Bắt đầu |
| `endDate` | Date | **required** | Kết thúc |
| `applicablePackages` | [ObjectId] | ref: `Package` | Gói áp dụng |
| `applicableBranches` | [ObjectId] | ref: `Branch` | Chi nhánh áp dụng |
| `applicableToAllPackages` | Boolean | default: false | Tất cả gói |
| `applicableToAllBranches` | Boolean | default: false | Tất cả chi nhánh |
| `status` | String | enum: `active`/`inactive`, default `active` | Trạng thái |
| `branchId` | ObjectId | ref: `Branch` | Chi nhánh sở hữu |
| `createdBy` | ObjectId | ref: `User` | Người tạo |
| `maxUsagePerUser` | Number | default: 1 | Tối đa/người |
| `requiredPoints` | Number | default: 0, min 0 | Điểm đổi |
| `applicableTiers` | [String] | enum: `bronze`/`silver`/`gold`/`diamond` | Hạng dùng được |
| `isBirthdayVoucher` | Boolean | default: false | Voucher sinh nhật |
| `isTemplate` | Boolean | default: false | Mẫu |
| `assignedTo` | ObjectId | ref: `User` | Gán riêng |
| `isDeleted` | Boolean | default: false | Soft delete |
| `deletedAt` | Date | — | — |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**Indexes:** `code` (unique) · `status` · `{startDate, endDate}`

**Quan hệ đi:** `voucherId` → VoucherUsage

---

## 8. `voucherusages` — Lịch sử dùng voucher

**Model:** `VoucherUsage` · **File:** `voucherUsage.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `voucherId` | ObjectId | **required**, ref: `Voucher` | Voucher |
| `userId` | ObjectId | **required**, ref: `User` | Người dùng |
| `bookingId` | ObjectId | ref: `Booking` | Booking áp dụng |
| `discountAmount` | Number | default: 0 | **Snapshot** tiền giảm |
| `usedAt` | Date | default: Date.now | Thời điểm dùng |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**Indexes:** `{voucherId, userId}` · **unique compound** `{voucherId, userId, bookingId}` · `userId`

---

## 9. `notifications` — Thông báo

**Model:** `Notification` · **File:** `notification.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `userId` | ObjectId | **required**, ref: `User` | Người nhận |
| `bookingId` | ObjectId | ref: `Booking` | Booking liên quan |
| `title` | String | **required**, trim, maxlength 200 | Tiêu đề |
| `message` | String | **required**, trim, maxlength 1000 | Nội dung |
| `type` | String | **required**, enum (xem dưới) | Loại |
| `isRead` | Boolean | default: false | Đã đọc |
| `data` | Mixed | — | Metadata tùy ý |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**Enum `type`:** `booking_created`, `booking_confirmed`, `booking_cancelled`, `booking_cancelled_system`, `booking_completed`, `booking_reminder`, `booking_at_risk`, `booking_grace_extended`, `payment_received`, `payment_confirmed`, `refund`, `voucher`, `system`, `profile_updated`, `vehicle_added`, `wallet_transaction`

**Indexes:** `{userId, createdAt: -1}` · `{userId, isRead}`

---

## 10. `loyaltyconfigs` — Cấu hình loyalty

**Model:** `LoyaltyConfig` · **File:** `loyaltyConfig.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `baseEarningRate` | Number | default 5, 0–100 | Điểm/đơn vị tiền |
| `pointExpirationMonths` | Number | default 6, min 1 | Số tháng hết hạn |
| `tiers` | [Embedded] | — | Định nghĩa hạng |
| `isDefault` | Boolean | default: true | Cấu hình mặc định |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**tiers[]** (`_id: false`): `id` (required) · `name` (required) · `minPoints` (required, min 0) · `multiplier` (required, min 0.1) · `color` · `bg` · `border` · `colorTheme` · `icon` (default `Circle`) · `benefits[]`

---

## 11. `pointhistories` — Lịch sử điểm (đã snapshot đầy đủ)

**Model:** `PointHistory` · **File:** `pointHistory.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `userId` | ObjectId | **required**, ref: `User` | Người dùng |
| `points` | Number | **required** | + earned / − redeemed, expired |
| `type` | String | **required**, enum: `earned`/`redeemed`/`expired`/`adjustment` | Loại giao dịch |
| `description` | String | trim, **required** | Mô tả |
| `referenceId` | ObjectId | ref: `Booking` | Booking liên quan |
| `snapshot` | Embedded | — | **Bản chụp ngữ cảnh** |
| `isDeleted` | Boolean | default: false | Soft delete |
| `deletedAt` | Date | — | — |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**snapshot:** `orderAmount` · `baseRate` · `tier` · `tierName` · `multiplier` · `effectiveRate` · `bookingCode` · `bookingType` · `packageName` · `packagePrice` · `subServices[{name, price}]` · `paymentMethod` · `paymentStatus` · `branchId` · `branchName` · `branchAddress` · `cancellationReason`

**Indexes:** `{userId, createdAt: -1}` · `{'snapshot.branchId', createdAt: -1}` · `isDeleted`

---

## 12. `wallettransactions` — Giao dịch ví

**Model:** `WalletTransaction` · **File:** `walletTransaction.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `userId` | ObjectId | **required**, ref: `User` | Chủ ví |
| `amount` | Number | **required**, min 0 | Số tiền |
| `type` | String | **required**, enum: `credit`/`debit` | Vào / ra |
| `reason` | String | **required** | Lý do |
| `bookingId` | ObjectId | ref: `Booking` | Booking liên quan |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**Indexes:** `{userId, createdAt: -1}`

**Hook:** sau khi save/insertMany → tự tạo Notification loại `wallet_transaction`

---

## 13. `slotpacks` — Gói slot trả trước

**Model:** `SlotPack` · **File:** `slotPack.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `userId` | ObjectId | **required**, ref: `User` | Chủ gói |
| `branchId` | ObjectId | ref: `Branch` | Chi nhánh |
| `packageId` | ObjectId | **required**, ref: `Package` | Gói dịch vụ |
| `vehicleId` | ObjectId | ref: `Vehicle` | Xe (tùy chọn) |
| `totalSlots` | Number | **required**, 1–50 | Số slot mua |
| `remainingSlots` | Number | **required**, min 0 | Còn lại |
| `usedSlots` | Number | default: 0, min 0 | Đã dùng |
| `unitPrice` | Number | **required**, min 0 | Giá/slot |
| `discountPercent` | Number | default: 0, 0–100 | **Snapshot** % chiết khấu |
| `discountAmount` | Number | default: 0, min 0 | **Snapshot** tiền giảm |
| `finalPrice` | Number | **required**, min 0 | Tổng sau chiết khấu |
| `voucherCode` | String | trim, uppercase | Voucher thêm |
| `voucherDiscount` | Number | default: 0, min 0 | **Snapshot** tiền voucher |
| `finalPriceAfterVoucher` | Number | min 0 | Tổng sau tất cả |
| `priority` | Number | default 1, 1–4 | Ưu tiên theo tier |
| `packCode` | String | **required, unique**, uppercase | Mã gói (VD: `SP-DUNG-TD1`) |
| `expiresAt` | Date | — | Hạn dùng (null = vô hạn) |
| `status` | String | enum: `active`/`exhausted`/`expired`/`cancelled`, default `active` | Trạng thái |
| `paymentStatus` | String | enum: `unpaid`/`paid`, default `unpaid` | — |
| `refundStatus` | String | enum: `none`/`pending`/`completed`, default `none` | — |
| `refundAmount` | Number | default: 0 | — |
| `paidAt` | Date | — | — |
| `cancelOtpToken` | String | — | OTP hủy |
| `cancelOtpExpires` | Date | — | — |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**Indexes:** `userId` · `branchId` · `status` · `{userId, status}` · `packCode` (unique)

**Static method `getDiscountPercent`:** 1–4: 0% · 5–9: 5% · 10–19: 10% · 20+: 15%

---

## 14. `slotproducts` — Gói slot bán sẵn

**Model:** `SlotProduct` · **File:** `slotProduct.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `name` | String | **required**, trim | Tên sản phẩm |
| `description` | String | trim | Mô tả |
| `slots` | Number | **required**, min 1 | Số slot |
| `price` | Number | **required**, min 0 | Giá |
| `originalPrice` | Number | min 0 | Giá gốc (show tiết kiệm) |
| `features` | [String] | trim | Danh sách tính năng |
| `popular` | Boolean | default: false | Nổi bật |
| `imageUrl` | String | — | Ảnh |
| `status` | String | enum: `active`/`inactive`, default `active` | Trạng thái |
| `sortOrder` | Number | default: 0 | Thứ tự hiển thị |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**Indexes:** `{status, sortOrder}`

---

## 15. `gifts` — Vòng quay may mắn

**Model:** `Gift` · **File:** `gift.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `name` | String | **required**, trim | Tên phần thưởng |
| `description` | String | trim | Mô tả |
| `type` | String | enum: `percentage`/`fixed`/`none`, default `none` | Loại giảm |
| `value` | Number | default 0, min 0 | Giá trị |
| `probability` | Number | **required**, 0–100, default 10 | Xác suất trúng |
| `color` | String | default: `'#10b981'` | Màu segment |
| `status` | String | enum: `active`/`inactive`, default `active` | Trạng thái |
| `sortOrder` | Number | default: 0 | Thứ tự |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**Indexes:** `{status, sortOrder}`

---

## 16. `refundrequests` — Yêu cầu hoàn tiền

**Model:** `RefundRequest` · **File:** `refundRequest.schema.js`

| Field | Type | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | auto | PK |
| `bookingId` | ObjectId | **required**, ref: `Booking` | Booking hoàn tiền |
| `userId` | ObjectId | **required**, ref: `User` | Khách yêu cầu |
| `reason` | String | **required**, trim, maxlength 500 | Lý do |
| `status` | String | enum: `pending`/`approved`/`rejected`, default `pending` | Trạng thái |
| `reviewedBy` | ObjectId | ref: `User` | Admin duyệt |
| `reviewNote` | String | trim, maxlength 500 | Ghi chú duyệt |
| `reviewedAt` | Date | — | — |
| `createdAt` / `updatedAt` | Date | timestamps | — |

**Indexes:** `bookingId` · `userId` · `status` · **partial unique** `{bookingId, status}` khi `status='pending'` (ngăn nhiều yêu cầu pending cho 1 booking)

---

## Ràng buộc UNIQUE

| Collection | Fields | Điều kiện |
|---|---|---|
| `users` | `email` | luôn unique |
| `vehicles` | `{userId, licensePlate}` | compound unique |
| `bookings` | `bookingCode` | sparse unique (chỉ khi có giá trị) |
| `payments` | `{bookingId, status}` | partial unique khi `status='pending'` && `bookingId` tồn tại |
| `vouchers` | `code` | luôn unique |
| `voucherusages` | `{voucherId, userId, bookingId}` | compound unique |
| `slotpacks` | `packCode` | luôn unique |
| `refundrequests` | `{bookingId, status}` | partial unique khi `status='pending'` |

---

## Điểm đáng chú ý (Snapshot hiện có)

Các collection đã snapshot dữ liệu để bảo toàn lịch sử trước khi entity gốc bị sửa/xóa:

| Collection | Snapshot có sẵn |
|---|---|
| `bookings` | `packageName`, `packageDuration`, `selectedSubServices[]`, `voucherCode`, `discountAmount`, `finalPrice` |
| `payments` | `packageName`, `packagePrice`, `amount` |
| `voucherusages` | `discountAmount` |
| `slotpacks` | `unitPrice`, `discountPercent`, `discountAmount`, `finalPrice`, `voucherDiscount` |
| `pointhistories` | `snapshot{}` — đầy đủ nhất (tier, package, branch, subServices, payment...) |
