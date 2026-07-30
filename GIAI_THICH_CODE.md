# Giải thích Code — AutoWashPro

## 1. Kiến trúc Backend (Controller → Service → Model)

```
Route → Middleware (auth, validation) → Controller → Service → Model (Mongoose) → MongoDB
```

**Controller** rất mỏng — chỉ nhận request, gọi service, trả response.
**Service** chứa toàn bộ logic nghiệp vụ (business logic).
**Model** là Mongoose schema, định nghĩa cấu trúc document trong MongoDB.

Mọi controller đều được wrap bằng `catchAsync` helper để tự động bắt lỗi async mà không cần try/catch thủ công.

Ví dụ trong `controllers/auth.controller.js`:
```js
const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  res.json(success(result));
});
```

Response format chuẩn: `{ success: true/false, data: {...}, message: "..." }`

---

## 2. Middleware Chain

Mỗi route được khai báo theo pattern chained middleware:

```js
router.post('/', authenticate, authorize(ROLES.ADMIN), validators.create, validate, controller.create);
```

- `authenticate`: verify JWT, gắn `req.user`
- `authorize()`: kiểm tra role có quyền truy cập không (dùng file `permissions.js` — RBAC matrix)
- `validators`: định nghĩa rules bằng express-validator
- `validate`: chạy validation, nếu lỗi trả về 400 ngay

---

## 3. Xử lý lỗi tập trung (`error.middleware.js`)

- **Mongoose CastError** (ObjectId sai) → 400
- **MongoDB duplicate key** (code 11000) → 409
- **ValidationError** → 400 kèm field-level errors
- **JWT errors** → 401
- **AppError** custom (do service throw) → theo statusCode
- **Catch-all** → 500

Services throw `new AppError('message', statusCode, 'ERROR_CODE')`.

---

## 4. Soft Delete

Không xóa document thật — dùng flag `isDeleted: Boolean` và `deletedAt: Date`.
Các query mặc định filter `isDeleted: { $ne: true }`.

---

## 5. Authentication Flow (JWT)

```
Register → hash password (bcrypt, cost 12) → tạo User → generate accessToken (7d) + refreshToken (30d) → lưu refreshToken trong DB
Login → verify password → generate token pair
Google OAuth → verify idToken (google-auth-library) → findOrCreate user → generate tokens
```

- **Access token**: gửi qua `Authorization: Bearer <token>` header
- **Refresh token**: gọi `POST /api/auth/refresh-token` khi access token hết hạn
- Web: lưu localStorage (keys: `aw_accessToken`, `aw_refreshToken`)
- Mobile: lưu expo-secure-store, Axios interceptor tự động refresh khi gặp 401

---

## 6. Real-time: SSE + Socket.IO (dual channel)

**Đây là điểm dễ gây nhầm lẫn.** Project dùng cả 2:

### Thực tế code:
| Thành phần | Giao thức thật | Tên file |
|---|---|---|
| `BE/src/routes/sse.routes.js` | **SSE** (HTTP `text/event-stream`) | SSE |
| `BE/src/services/sse.service.js` | **SSE + Socket.IO** (gửi qua cả 2) | SSE |
| `BE/src/socket.js` | **Socket.IO** | Socket |
| `FE/src/hooks/useSSE.js` | **Socket.IO** (`socket.io-client`) | SSE (gây nhầm lẫn) |
| `Mobile/src/services/sse.ts` | **Socket.IO** (`socket.io-client`) | SSE (ghi chú: "formerly SSE") |

### Luồng hoạt động:
1. **Backend**: `server.js` init cả Express HTTP server và Socket.IO (`socket.init(server)`)
2. **`sse.service.js`**: khi có sự kiện, broadcast qua **cả 2 kênh**:
   - SSE: ghi vào HTTP response object (dành cho web dùng native EventSource)
   - Socket.IO: `socket.getIO().to(room).emit(event, data)` (dành cho mobile và web)
3. **Web frontend**: dùng `useSSE.js` nhưng thực chất là Socket.IO client
4. **Mobile**: dùng `sse.ts` nhưng thực chất là Socket.IO client

### Tại sao file lại đặt tên là SSE?
- File `useSSE.js` và `sse.service.js` được đặt tên như vậy từ giai đoạn đầu khi project chỉ dùng SSE
- Sau đó nâng cấp lên Socket.IO nhưng giữ nguyên tên cũ — dẫn đến confusion

---

## 7. Chatbot AI (tool-calling architecture)

1. User gửi message → `POST /api/chat/send`
2. Backend gọi Google Gemini với **system prompt** khác nhau tùy role (customer/manager/admin)
3. AI quyết định gọi **tool** (function) nào — vd: `lookupBranches`, `checkAvailability`, `createBooking`
4. Backend thực thi tool (query DB, thao tác), trả kết quả về AI
5. AI tổng hợp câu trả lời tự nhiên từ kết quả tool
6. Provider fallback: nếu Gemini lỗi → chuyển sang Groq

---

## 8. Cron Jobs (node-cron)

| Job | Cron expression | Chức năng |
|-----|----------------|-----------|
| `reminder.job.js` | Mỗi 5 phút | Gửi nhắc booking sắp đến (60-65 phút) |
| `birthday.job.js` | 8:00 AM hằng ngày | Tạo voucher sinh nhật 20% |
| `autoCancel.job.js` | Mỗi 5 phút | Hủy booking không check-in sau 30 phút |
| `slotPackExpire.job.js` | - | Xử lý gói slot hết hạn |

---

## 9. Mobile: API Client với Auto Token Refresh

File `Mobile/src/api/client.ts` — Axios interceptor pattern:

```
Request → attach Bearer token
Response → nếu 401 → queue request → isRefreshing flag → refresh token → retry all queued → resolve
```

Xử lý concurrent requests: nhiều request cùng bị 401, chỉ refresh 1 lần, retry tất cả sau đó.

---

## 10. React Patterns

- **Web**: không dùng state management library (Redux/Zustand). State được quản lý bằng `useState` + `useEffect` ở component cha (App.jsx), truyền xuống component con qua props (prop drilling).
- **Mobile**: dùng **React Context** (AuthContext, BookingContext, ChatContext, NotificationContext) thay vì prop drilling.
- **Real-time**: custom hook `useSSE(token, eventName, callback)` — subscribe Socket.IO event, tự động connect/disconnect khi có/mất listener.

---

## 11. Dev Session Patch (MongoDB Transactions)

File: `BE/src/config/db.js` — Khi `ENABLE_DEV_SESSION_PATCH=1`, MongoDB transactions bị vô hiệu hóa (no-op) vì Atlas M0 free tier không support multi-document transactions.

---

## 12. File/repo structure highlight

```
BE/src/
├── app.js              # Express setup (middleware, routes, CORS, security)
├── server.js           # Entry point (connect DB, start HTTP, init Socket.IO, cron jobs)
├── config/             # env, db, constants, permissions (RBAC matrix), swagger
├── models/             # 16 Mongoose schemas
├── routes/             # 20 route files
├── controllers/        # 17 controllers (mỏng)
├── services/           # 21 services (logic dày)
├── middlewares/        # auth (JWT), error handler
├── jobs/               # 4 cron jobs
├── utils/              # helpers (catchAsync, response), validators
└── socket.js           # Socket.IO setup (auth middleware + room management)
```

---

## 13. Trả lời giáo viên: "Tại sao dùng SSE thay vì WebSocket?"

**Câu trả lời ngắn gọn (nếu file đặt tên SSE):**
"Thực tế project dùng cả SSE lẫn Socket.IO. SSE dùng cho web để dễ triển khai và không cần thư viện phía client (EventSource có sẵn trong browser), tự động reconnect khi mất mạng. Socket.IO dùng cho mobile để có độ ổn định cao hơn, hỗ trợ fallback transport và room-based broadcasting. File đặt tên 'SSE' nhưng bên trong code là Socket.IO."

**Giải thích chi tiết khi thầy hỏi về quyết định kỹ thuật:**
- SSE là HTTP thuần — không cần thư viện phía client, dễ deploy, tự reconnect
- Socket.IO mạnh hơn: phòng (room), broadcast, fallback (polling → WebSocket), giảm tải server hơn SSE
- Dùng dual channel để tận dụng ưu điểm cả 2

**Nếu thầy thắc mắc: "Sao file tên SSE mà lại dùng socket.io?":**
"Đó là legacy naming — hồi đầu em làm SSE trước, sau chuyển qua Socket.IO nhưng chưa đổi tên file ạ."
