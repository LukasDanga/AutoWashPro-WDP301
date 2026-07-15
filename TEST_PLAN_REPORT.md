# AutoWashPro-WDP301 — Test Plan & Bug Report

> **Date:** 2026-07-15
> **Scope:** Backend (Node/Express + Mongoose), Frontend (React/Vite), Mobile (Expo/React Native)

---

## 1. Project Overview

| Layer | Tech | Entry |
|---|---|---|
| Backend | Express 4 + Mongoose 8 + JWT | `BE/server.js` → `BE/src/app.js` |
| Frontend | React 18 + Vite 5 + Tailwind 4 | `FE/src/App.jsx` |
| Mobile | Expo SDK 56 + React Native + TypeScript | `Mobile/app/` |

**Feature set:** Auth (JWT), Booking (single + recurring + slot packs), Payment (Momo/VNPay/cash simulation), Vouchers, Notifications (SSE), Chatbot, Loyalty/Points, Branch/Package management (Admin/Manager), Refund requests, Reports, QR check-in.

**Existing tests:** `BE/__tests__/` directory is **empty**. No FE or Mobile test infrastructure exists.

---

## 2. Bugs Found

### BUG-01: `getDepositRate` ignores user no-show count — always returns 30%

**File:** `BE/src/services/booking.service.js:41`

```js
const getDepositRate = () => DEPOSIT_RATE; // always 0.3
```

The constant `NO_SHOW_STRIKE_THRESHOLD = 3` and `STRIKE_DEPOSIT_RATE = 1` are defined but never used.
The function ignores the `user` parameter entirely.

**Expected:** Users with `noShowCount >= 3` should have `depositRate = 1.0` (100% deposit).
**Impact:** No-show users can still book with only 30% deposit instead of 100%, reducing the deterrent effect.

---

### BUG-02: Frontend register sends only `email` + `password`, but BE requires `name`

**File:** `FE/src/App.jsx:151-158` vs `BE/src/services/auth.service.js:12-21`

FE sends: `{ email, password }`
BE expects: `{ name, email, password, phone? }` — `name` is `required: true` in schema

**Impact:** Customer registration from FE always fails with a 400 ValidationError.

---

### BUG-03: Hardcoded admin/manager credentials in production FE

**File:** `FE/src/components/AuthScreen.jsx:14-15`

```js
const ADMIN_QUICK_LOGIN = { identifier: 'admin@washpro.vn', password: '123456' };
const MANAGER_QUICK_LOGIN = { identifier: 'manager1@washpro.vn', password: '123456' };
```

**Impact:** Anyone can open DevTools → Network to view these, or just click the buttons. Admin credentials are exposed in the client bundle.

---

### BUG-04: CORS `origin: '*'` with JWT tokens — credential theft risk

**File:** `BE/src/app.js:16-20`

```js
cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
```

Combined with JWT Bearer auth, `origin: '*'` means any website can make authenticated requests on behalf of a logged-in user if they can steal the token (e.g., via XSS). While the FE doesn't use `credentials: 'include'` for the JWT, the `Authorization` header can still be exfiltrated via XSS.

**Impact:** CSRF/XSS attack surface.

---

### BUG-05: `refreshToken` endpoint not protected by auth middleware but handles tokens

**File:** `BE/src/routes/authRoutes.js:78`

```js
router.post('/refresh-token', authController.refreshToken);
```

This endpoint accepts a refresh token in the body and returns new access/refresh tokens — but it has **no rate limiting** beyond the global `/api/` limiter (10k req/15min), and no device/IP tracking. An attacker with a stolen refresh token can keep generating new access tokens indefinitely.

**Impact:** Refresh token brute-force / abuse possible.

---

### BUG-06: FE doesn't handle network errors / timeouts on API calls

**File:** `FE/src/components/services/userService.js:3-21`, `FE/src/App.jsx:53-88`

All `fetch` calls assume success. If the API is down or returns 500, `res.json()` will fail (no try/catch in `userService`), and the FE will show a generic "Không thể tải phiên đăng nhập" error without distinguishing between 401, 403, 500, or network failure.

**Impact:** Poor UX, no retry logic, no clear error differentiation.

---

### BUG-07: Mobile `getDepositRate` same issue as BE (if used there)

**File:** `Mobile/src/api/booking.ts` — inherits from BE, same `getDepositRate` bug applies.

---

### BUG-08: `_id` / `id` inconsistency between FE and BE responses

**File:** Multiple across FE

BE returns MongoDB `_id`. FE components sometimes use `p.id`, sometimes `p._id`, sometimes `item.id`. The `map` pattern `{ ...b, id: b._id || b.id }` is repeated in multiple places but not consistently. This can cause:
- Selecting a branch/package that uses `_id` when the FE expects `id`
- Double-mapping when `id` already exists (it shadows `_id`)

**Files affected:** `FE/src/components/BookingFlow.jsx`, `FE/src/components/landing/BookingPage.jsx`, `Mobile/src/api/booking.ts`

---

### BUG-09: Race condition in `confirmBookings` — optimistic update with no retry

**File:** `BE/src/services/booking.service.js:637-714`

`confirmBookings` uses `Promise.allSettled` to update bookings, but the `findOneAndUpdate` filter `{ _id: b._id, status: 'pending' }` can silently skip bookings that were updated by another request between the `find` and the `update`. The function returns `confirmed.length` but the caller doesn't know which ones were skipped vs. genuinely missing.

---

### BUG-10: `bookingCode` uniqueness — `sparse: true` index allows null duplicates

**File:** `BE/src/models/booking.schema.js:6`

```js
bookingCode: { type: String, unique: true, sparse: true },
```

The `sparse: true` index means documents without `bookingCode` won't be indexed, so multiple bookings can have `bookingCode: null` without a unique constraint violation. However, `generateBookingCode()` is always called, so in practice this shouldn't cause issues — but if a booking is ever created without it, the uniqueness guarantee breaks.

---

### BUG-11: FE `BookingFlow` — `selectedVehicle` can become `''` (empty string)

**File:** `FE/src/components/BookingFlow.jsx:52`

```js
const [selectedVehicle, setSelectedVehicle] = useState(
  vehicleList[0]?.id || vehicleList[0]?._id || vehicleList[0]?.licensePlate || ''
);
```

If the user has no vehicles, `selectedVehicle` is `''`. The `confirmBooking` function checks `!vehicle` but the vehicle lookup uses `(item.id || item._id || item.licensePlate) === selectedVehicle`, which will match if `selectedVehicle === ''` and a vehicle's field is also `''`.

**Impact:** Could book with an empty vehicle ID.

---

### BUG-12: `send` to non-existent user IDs in notification service

**File:** `BE/src/services/notification.service.js` (referenced in booking.service.js)

When a booking is created, `notificationService.send(userId, ...)` is called even if the user was just deleted between the booking creation and the notification send. No null check on the user document before sending.

---

### BUG-13: Payment `upsert` may create duplicate Payment records under race conditions

**File:** `BE/src/services/payment.service.js:82-86`

```js
let payment = await Payment.findOneAndUpdate(
  { bookingId, status: { $nin: ['paid', 'refunded'] } },
  { bookingId, userId, amount, method, paymentType, transactionId, status: 'pending' },
  { new: true, upsert: true, runValidators: true }
);
```

The unique partial index on `{ bookingId: 1, status: 1 }` (where status is `pending`) protects against duplicate pending payments, but if two requests come in simultaneously with different `paymentType` values, the second may overwrite the first's `paymentType`. The `amount` is also not validated against the booking's actual `finalPrice`.

---

### BUG-14: Mobile login flow — register doesn't navigate after success

**File:** `Mobile/src/contexts/AuthContext.tsx:114-121`

```ts
const register = useCallback(async (data: RegisterRequest) => {
  // ... registers but does NOT navigate or set user state
  setState((prev) => ({ ...prev, isLoading: false }));
}, []);
```

After registration, the user stays on the register screen with no navigation and `isAuthenticated` remains `false`. They must manually log in.

---

### BUG-15: BE `env.js` warns but doesn't fail on missing required env vars

**File:** `BE/src/config/env.js:3-6`

```js
required.forEach((key) => {
  if (!process.env[key]) console.warn(`Warning: ${key} is not set`);
});
```

Missing `JWT_SECRET` means `jwt.sign` uses `undefined` as the secret, making all tokens trivially forgeable. The app should throw at startup, not warn.

---

## 3. Test Plan

### 3.1 Backend Tests (Jest + Supertest + mongodb-memory-server)

**Test file:** `BE/__tests__/server.test.js` (to be created)

#### Auth Module
| ID | Test | Expected |
|---|---|---|
| BE-AUTH-01 | Register with valid email/password/name | 201, returns user + tokens |
| BE-AUTH-02 | Register with duplicate email | 409, `EMAIL_EXISTS` |
| BE-AUTH-03 | Register without `name` | 400, validation error |
| BE-AUTH-04 | Login with correct credentials | 200, returns access + refresh tokens |
| BE-AUTH-05 | Login with wrong password | 401, `INVALID_CREDENTIALS` |
| BE-AUTH-06 | Login with phone number as identifier | 200 (if phone matches) |
| BE-AUTH-07 | Access protected route without token | 401, `UNAUTHORIZED` |
| BE-AUTH-08 | Access protected route with expired token | 401, `TOKEN_EXPIRED` |
| BE-AUTH-09 | Access protected route with tampered token | 401, `INVALID_TOKEN` |
| BE-AUTH-10 | Refresh token with valid refresh token | 200, new access + refresh tokens |
| BE-AUTH-11 | Refresh token with revoked refresh token | 401, `INVALID_REFRESH_TOKEN` |
| BE-AUTH-12 | Logout invalidates refresh token | 200, subsequent refresh fails |
| BE-AUTH-13 | Change password with wrong current password | 400, `INVALID_PASSWORD` |
| BE-AUTH-14 | Customer accessing admin-only route | 403, `FORBIDDEN` |

#### Booking Module
| ID | Test | Expected |
|---|---|---|
| BE-BOOK-01 | Create booking with valid data | 201, booking created with `pending` status |
| BE-BOOK-02 | Create booking in the past | 400, `INVALID_DATE` |
| BE-BOOK-03 | Create booking < 30min from now | 400, `INVALID_TIME` |
| BE-BOOK-04 | Create booking with full slot | 409, `SLOT_FULL` |
| BE-BOOK-05 | Create booking for inactive package | 400, `PACKAGE_UNAVAILABLE` |
| BE-BOOK-06 | Create booking for inactive branch | 400, `BRANCH_UNAVAILABLE` |
| BE-BOOK-07 | Create booking with another user's vehicle | 403, `FORBIDDEN` |
| BE-BOOK-08 | Create booking with invalid voucher | 400, voucher error |
| BE-BOOK-09 | Get booking by ID (own booking) | 200, returns booking |
| BE-BOOK-10 | Get another user's booking as customer | 403, `FORBIDDEN` |
| BE-BOOK-11 | Cancel booking > 30min before start | 200, status = `cancelled` |
| BE-BOOK-12 | Cancel booking < 30min before start | 400, `CANCEL_WINDOW_PASSED` |
| BE-BOOK-13 | Cancel already completed booking | 400, `INVALID_STATUS` |
| BE-BOOK-14 | Cancel paid booking (must refund first) | 400, `PAYMENT_PAID` |
| BE-BOOK-15 | Update booking status: pending → confirmed (no deposit) | 200, confirmed |
| BE-BOOK-16 | Confirm booking requiring deposit (unpaid) | 400, `DEPOSIT_REQUIRED` |
| BE-BOOK-17 | Invalid status transition (completed → pending) | 400, `INVALID_TRANSITION` |
| BE-BOOK-18 | Get available slots | 200, slots with `available`/`vipOnly` flags |
| BE-BOOK-19 | Recurring booking — valid weekdays + weeks | 201, N bookings created |
| BE-BOOK-20 | Recurring booking — no valid dates | 400, `NO_DATES` |
| BE-BOOK-21 | Rebook completed booking | 201, new booking created |
| BE-BOOK-22 | Rebook in-progress booking | 400 |
| BE-BOOK-23 | Cancel recurring group (pending only) | 200, cancelled count |
| BE-BOOK-24 | Get my bookings (customer) | 200, only own bookings |
| BE-BOOK-25 | Get all bookings (admin) | 200, all bookings with pagination |

#### Payment Module
| ID | Test | Expected |
|---|---|---|
| BE-PAY-01 | Create deposit payment (deposit > 0) | 201, payment created |
| BE-PAY-02 | Create full payment for paid booking | 400, `ALREADY_PAID` |
| BE-PAY-03 | Create payment for cancelled booking | 400, `BOOKING_CANCELLED` |
| BE-PAY-04 | Cash payment auto-confirms | Payment status = `paid` immediately |
| BE-PAY-05 | Confirm payment via callback | 200, payment confirmed |
| BE-PAY-06 | Refund payment (paid booking) | 200, status = `refunded` |
| BE-PAY-07 | Create two pending payments for same booking | Returns existing pending (no duplicate) |
| BE-PAY-08 | Count unviewed payments | 200, correct count |

#### Voucher Module
| ID | Test | Expected |
|---|---|---|
| BE-VOU-01 | Create voucher with valid data | 201 |
| BE-VOU-02 | Create voucher with duplicate code | 409 |
| BE-VOU-03 | Validate voucher (active, in date range) | 200, discount calculated |
| BE-VOU-04 | Validate expired voucher | 400/404 |
| BE-VOU-05 | Validate voucher for wrong branch | rejected |
| BE-VOU-06 | Reserve voucher reduces remaining count | remaining - 1 |
| BE-VOU-07 | Rollback voucher on booking cancel | remaining + 1 |
| BE-VOU-08 | Percentage discount capped at maxDiscount | correct amount |
| BE-VOU-09 | Fixed discount not exceeding order total | correct amount |

#### Voucher CRUD (Admin/Manager)
| ID | Test | Expected |
|---|---|---|
| BE-VOU-CRUD-01 | Create voucher (admin) | 201 |
| BE-VOU-CRUD-02 | Create voucher (customer) | 403 |
| BE-VOU-CRUD-03 | Get all vouchers with filters | 200, filtered results |
| BE-VOU-CRUD-04 | Update voucher (admin) | 200 |
| BE-VOU-CRUD-05 | Delete voucher (admin) | 200, soft-deleted |
| BE-VOU-CRUD-06 | Delete voucher (manager) | 403 |

#### Notification Module
| ID | Test | Expected |
|---|---|---|
| BE-NOTIF-01 | Get notifications (authenticated) | 200, paginated |
| BE-NOTIF-02 | Get notifications (no auth) | 401 |
| BE-NOTIF-03 | Mark notification as read | 200 |
| BE-NOTIF-04 | Mark all as read | 200 |
| BE-NOTIF-05 | Delete notification | 200 |

#### SSE Module
| ID | Test | Expected |
|---|---|---|
| BE-SSE-01 | Connect to SSE (manager) | 200, EventSource connected |
| BE-SSE-02 | Receive booking_new event | Event received in real-time |
| BE-SSE-03 | Connect to SSE (no auth) | 401 |

#### Chatbot Module
| ID | Test | Expected |
|---|---|---|
| BE-CHAT-01 | Send message (authenticated) | 200, response |
| BE-CHAT-02 | Send message (no auth) | 401 |

---

### 3.2 Frontend Tests (Vitest + React Testing Library)

**Test directory:** `FE/tests/` (to be created)

#### Auth Flow
| ID | Test | Expected |
|---|---|---|
| FE-AUTH-01 | Login form submits valid credentials | Token stored, redirect to dashboard |
| FE-AUTH-02 | Login with wrong password | Error message displayed |
| FE-AUTH-03 | Register form submits valid data | Account created, redirect |
| FE-AUTH-04 | Register with duplicate email | Error message displayed |
| FE-AUTH-05 | Logout clears session | Token removed, redirect to landing |
| FE-AUTH-06 | Auth session persists on reload | User profile loaded from token |

#### Booking Flow
| ID | Test | Expected |
|---|---|---|
| FE-BOOK-01 | Select branch → packages load | Packages appear for selected branch |
| FE-BOOK-02 | Select package → slots load for selected date | Available slots shown |
| FE-BOOK-03 | Book with valid selection | Booking created, code shown |
| FE-BOOK-04 | Book without selecting time | Error: "Vui lòng chọn khung giờ" |
| FE-BOOK-05 | Book with no vehicles | Error: no vehicle available |
| FE-BOOK-06 | Deposit payment flow | Payment created, deposit marked |
| FE-BOOK-07 | Recurring booking creation | Recurring bookings created |
| FE-BOOK-08 | Slot pack booking | Booking created with 0 price |
| FE-BOOK-09 | Voucher application | Discount applied to total |

#### Admin Dashboard
| ID | Test | Expected |
|---|---|---|
| FE-ADMIN-01 | Admin login → redirects to /admin | Dashboard loaded |
| FE-ADMIN-02 | Manager login → redirects to /manager | Manager dashboard loaded |
| FE-ADMIN-03 | Customer login → no admin redirect | Stays on landing page |
| FE-ADMIN-04 | User management — list users | Users table rendered |
| FE-ADMIN-05 | Create user (admin) | New user appears in list |
| FE-ADMIN-06 | Confirm bookings (batch) | Statuses updated |

---

### 3.3 Mobile Tests (Jest + React Native Testing Library)

**Test directory:** `Mobile/__tests__/` (to be created)

#### Auth Flow
| ID | Test | Expected |
|---|---|---|
| MO-AUTH-01 | Login with valid credentials | User logged in, tokens stored |
| MO-AUTH-02 | Login with invalid credentials | Error displayed |
| MO-AUTH-03 | Register new account | Account created |
| MO-AUTH-04 | Token auto-refresh on 401 | New token used, request retried |
| MO-AUTH-05 | Logout clears SecureStore | Tokens removed, redirect to login |

#### Booking Flow
| ID | Test | Expected |
|---|---|---|
| MO-BOOK-01 | Navigate to booking tab | Booking options shown |
| MO-BOOK-02 | Select regular booking | Booking form loads |
| MO-BOOK-03 | Select recurring booking | Recurring form loads |
| MO-BOOK-04 | Select slot pack booking | Slot pack options shown |
| MO-BOOK-05 | View booking history | Past bookings displayed |
| MO-BOOK-06 | Submit feedback on completed booking | Feedback saved |

#### API Client
| ID | Test | Expected |
|---|---|---|
| MO-API-01 | Response unwrap `{ success, data }` | Returns `.data` content |
| MO-API-02 | 401 triggers refresh flow | Token refreshed, request retried |
| MO-API-03 | Refresh failure clears tokens | User logged out |
| MO-API-04 | Request includes Bearer token | Authorization header present |

---

## 4. Priority Fixes

| Priority | Bug | Action |
|---|---|---|
| **Critical** | BUG-02: FE register missing `name` field | Add `name` input to FE register form, or make it optional in BE |
| **Critical** | BUG-03: Hardcoded credentials in FE | Remove from client, use seeded dev accounts only in BE seed data |
| **Critical** | BUG-15: Missing JWT_SECRET crashes silently | Add startup check: `if (!JWT_SECRET) throw new Error('JWT_SECRET required')` |
| **High** | BUG-01: `getDepositRate` always returns 30% | Fix to check `user.noShowCount` |
| **High** | BUG-04: CORS `origin: '*'` | Restrict to `APP_URL` and `API_URL` origins |
| **High** | BUG-11: Empty vehicle ID in booking | Add guard: `if (!selectedVehicle) show error` |
| **Medium** | BUG-06: No network error handling in FE | Wrap all fetch calls in try/catch, show user-friendly errors |
| **Medium** | BUG-08: `_id`/`id` inconsistency | Standardize on `_id` → `id` mapping at API layer |
| **Medium** | BUG-14: Mobile register doesn't navigate | Navigate to tabs after successful register |
| **Low** | BUG-05: Refresh endpoint rate limiting | Add stricter rate limit on `/api/auth/refresh-token` |
| **Low** | BUG-09: Race condition in confirmBookings | Add optimistic locking or version field |
| **Low** | BUG-13: Payment upsert race | Use `findOne` first, then create if not exists |

---

## 5. Recommended Test Infrastructure

### Backend
```bash
cd BE
npm install --save-dev jest mongodb-memory-server supertest  # already installed
```

Create `BE/__tests__/setup.js` with mongodb-memory-server setup, then individual test files per module.

### Frontend
```bash
cd FE
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

Create `FE/vitest.config.js` and `FE/tests/setup.js`.

### Mobile
```bash
cd Mobile
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native
```

Create `Mobile/jest.config.js`.

---

## 6. Summary

- **0 test files currently exist** across all three layers.
- **15 bugs identified** (2 critical, 4 high, 4 medium, 5 low).
- **Most urgent fix:** FE register form missing `name` — blocks all customer signups.
- **Most urgent security fix:** Hardcoded admin credentials in FE bundle + `origin: '*'` CORS.
