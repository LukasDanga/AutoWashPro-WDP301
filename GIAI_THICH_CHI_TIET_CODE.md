# 💻 GIẢI THÍCH CHI TIẾT MÃ NGUỒN VÀ CẤU TRÚC KỸ THUẬT (AUTOWASHPRO)

> Tài liệu này tập trung giải thích **chi tiết kỹ thuật (Code Level)**, mô hình kiến trúc, các Design Patterns, cơ chế hoạt động của Middleware, Controller-Service Layer, Database Indexing và cách tổ chức mã nguồn trong dự án **AutoWashPro**.

---

## 1. 📂 Cấu Trúc Mã Nguồn (Directory Structure & Architecture)

Dự án áp dụng mô hình **Layered Architecture (Kiến trúc phân tầng)** tách biệt rõ ràng giữa Backend API, Web Frontend và Mobile App:

```
AutoWashPro-WDP301/
├── BE/                           # BACKEND (Node.js + Express.js + MongoDB)
│   ├── src/
│   │   ├── app.js                # Khởi tạo Express App, CORS, Rate Limit, Middlewares, Routes
│   │   ├── server.js             # Entry Point: Kết nối DB và lắng nghe PORT (HTTP Server)
│   │   ├── config/               # Biến môi trường (env.js), Swagger UI, Permissions
│   │   ├── middlewares/          # JWT Auth, Role Authorization, Error Handler
│   │   ├── models/               # Mongoose Schemas (User, Booking, Branch, Payment, ...)
│   │   ├── routes/               # Định tuyến API (/api/bookings, /api/auth, ...)
│   │   ├── controllers/          # Nhận Request, Validate đầu vào, gọi Service, trả Response
│   │   ├── services/             # Xử lý Logic Nghiệp vụ chính (Business Logic) & Query Database
│   │   └── jobs/                 # Tiến trình chạy ngầm (Cron Jobs bằng node-cron)
│   └── tests/                    # Unit Tests & Integration Tests (Jest + Supertest)
│
├── FE/                           # FRONTEND WEB (React 18 + Vite 5 + Tailwind CSS)
│   ├── src/
│   │   ├── main.jsx              # App Mounting Root
│   │   ├── App.jsx               # Cấu hình React Router (Public & Protected Routes)
│   │   ├── components/           # Components dùng chung (Button, Dialog, Modal, QR Scanner)
│   │   ├── routes/               # Trang hiển thị theo Role (Customer, Manager, Admin)
│   │   └── utils/ / hooks/       # Axios Interceptor, Custom Hooks (useAuth, useSSE)
│
└── Mobile/                       # MOBILE APP (React Native + Expo SDK 56 + TypeScript)
    ├── app/                      # File-based Routing (Expo Router: (auth), (tabs), booking, ...)
    └── src/                      # Mobile Components, Axios Config, SecureStore Utils
```

---

## 2. 🛡️ Cơ Chế Xác Thực & Phân Quyền (JWT Auth & Role-based Middleware)

Mã nguồn tại: [auth.middleware.js](file:///d:/FPT_MAXLO/8/WDP-301/AutoWashPro-WDP301/BE/src/middlewares/auth.middleware.js)

### 📌 1. Xác Thực Token (`authenticate`)
```javascript
const authenticate = async (req, res, next) => {
  // 1. Trích xuất Token từ header Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
  
  // 2. Decode và xác minh chữ ký bí mật bí mật (JWT_SECRET)
  const decoded = jwt.verify(token, config.JWT_SECRET);
  
  // 3. Tìm User trong Database & gán vào req.user
  const user = await User.findById(decoded.id);
  req.user = user;
  next(); // Cho phép đi tiếp vào Controller
};
```

### 📌 2. Phân Quyền Người Dùng (`authorize`)
Sử dụng **Closure Pattern** để truyền danh sách Role được phép truy cập route:
```javascript
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện' });
  }
  next();
};

// Sử dụng trong route:
router.post('/create', authenticate, authorize('admin', 'manager'), branchController.create);
```

---

## 3. ⚙️ Mô Hình Controller - Service Layer (Separation of Concerns)

Backend tuân thủ nguyên tắc **Single Responsibility**:
* **Controller:** Chỉ chịu trách nhiệm lấy dữ liệu từ `req.body`, `req.params`, `req.user`, trả về HTTP Status (`200`, `400`, `500`) và JSON. Không viết logic tính toán dài trong Controller.
* **Service:** Chứa toàn bộ thuật toán nghiệp vụ, gọi Mongoose Model để đọc/ghi database, xử lý tính toán tiền bạc, trừ điểm, gửi email.

### 🔄 Sơ đồ luồng xử lý 1 Request:
`Client Request` $\rightarrow$ `Router` $\rightarrow$ `authMiddleware` $\rightarrow$ `Controller` $\rightarrow$ `Service` $\rightarrow$ `Mongoose Model (DB)` $\rightarrow$ `Response`

---

## 4. 🔒 Thuật Toán Xử Lý Thanh Toán & Mã Hóa Chữ Ký (Checksum Security)

Mã nguồn tại: [payment.service.js](file:///d:/FPT_MAXLO/8/WDP-301/AutoWashPro-WDP301/BE/src/services/payment.service.js) & [vnpay.service.js](file:///d:/FPT_MAXLO/8/WDP-301/AutoWashPro-WDP301/BE/src/services/vnpay.service.js)

### 📌 1. Tạo Chữ Ký Ký Số VNPay (HMAC-SHA512)
Để chống can thiệp tham số trên đường truyền:
```javascript
const crypto = require('crypto');

// Sort tất cả tham số gửi sang VNPay theo bảng chữ cái ABC
const sortedParams = sortObject(vnp_Params);
const signData = querystring.stringify(sortedParams, { encode: false });

// Mã hóa tạo chữ ký Checksum
const hmac = crypto.createHmac("sha512", secretKey);
const vnp_SecureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
vnp_Params['vnp_SecureHash'] = vnp_SecureHash;
```

### 📌 2. Kiểm tra IPN Callback từ VNPay
Khi VNPay bắn kết quả về server, Backend lấy chữ ký gửi từ VNPay ra so sánh:
```javascript
const secureHash = vnp_Params['vnp_SecureHash'];
delete vnp_Params['vnp_SecureHash'];
delete vnp_Params['vnp_SecureHashType'];

const sortedParams = sortObject(vnp_Params);
const checkSign = crypto.createHmac("sha512", secretKey).update(Buffer.from(signData, 'utf-8')).digest("hex");

if (secureHash === checkSign) {
    // Chữ ký hợp lệ -> Tiến hành cập nhật trạng thái đơn hàng trong DB
}
```

---

## 5. 📡 Xử Lý Thông Báo Real-time Bằng Server-Sent Events (SSE)

Mã nguồn tại: [sse.service.js](file:///d:/FPT_MAXLO/8/WDP-301/AutoWashPro-WDP301/BE/src/services/sse.service.js)

Dự án giữ kết quả HTTP Connection mở liên tục để đẩy thông báo từ Server xuống Client:

```javascript
// Khởi tạo kết nối SSE với Header đặc biệt
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
});

// Lưu connection của user vào Memory Map
clients.set(userId, res);

// Đẩy dữ liệu xuống Client khi có sự kiện (Event Push)
function sendEventToUser(userId, data) {
  const clientRes = clients.get(userId);
  if (clientRes) {
    clientRes.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
```

---

## 6. 🤖 Tích Hợp Chatbot AI (Google Gemini API)

Mã nguồn tại: [chatbot.service.js](file:///d:/FPT_MAXLO/8/WDP-301/AutoWashPro-WDP301/BE/src/services/chatbot.service.js)

Sử dụng thư viện `@google/generative-ai`:
1. **Dynamic Prompt Injection:** Truy vấn danh sách Gói dịch vụ (`Packages`) và Chi nhánh (`Branches`) đang hoạt động trong DB.
2. Nạp dữ liệu này vào phần **System Instruction / Context Prompt** truyền cho mô hình `gemini-2.0-flash`.
3. Nhờ đó, AI trả lời chính xác thông tin thực tế của hệ thống mà không bị chém gió (hallucination).

---

## 7. 🗄️ Thiết Kế Cơ Sở Dữ Liệu & Đánh Index (Database Optimization)

Mã nguồn tại: `BE/src/models/*.schema.js`

### 📌 1. Geospatial Index (`2dsphere`) cho Chi Nhánh
Giúp tìm các chi nhánh gần vị trí người dùng nhất dựa trên tọa độ GPS (Kinh độ/Vĩ độ):
```javascript
// Branch Schema
const branchSchema = new mongoose.Schema({
  name: String,
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [Kinh độ (Longitude), Vĩ độ (Latitude)]
  }
});
branchSchema.index({ location: '2dsphere' });

// Query trong Service: tìm chi nhánh trong bán kính R
Branch.find({
  location: {
    $near: {
      $geometry: { type: 'Point', coordinates: [userLng, userLat] },
      $maxDistance: 10000 // 10 km
    }
  }
});
```

### 📌 2. Compound Index trên `Booking`
Tối ưu hóa tốc độ truy vấn kiểm tra trùng lịch rửa xe (Overbooking Check):
```javascript
bookingSchema.index({ branchId: 1, bookingDate: 1, timeSlot: 1 });
```

---

## 8. ⏱️ Các Tiến Trình Chạy Ngầm (Cron Jobs Implementation)

Mã nguồn tại: `BE/src/jobs/*.job.js`

Sử dụng thư viện `node-cron`:
```javascript
const cron = require('node-cron');

// Chạy mỗi 5 phút một lần: '*/5 * * * *'
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);

  // Tìm và tự động Hủy các đơn confirmed nhưng không đến check-in sau 30 phút
  await Booking.updateMany(
    { status: 'confirmed', bookingDate: { $lte: thirtyMinsAgo } },
    { $set: { status: 'cancelled', cancelReason: 'Tự động hủy do quá giờ hẹn' } }
  );
});
```

---

## 9. 🌐 Client Side Interceptor (Axios Setup)

Tại Frontend (Web/Mobile), toàn bộ request API được xử lý tập trung qua **Axios Interceptor**:
* **Request Interceptor:** Tự động lấy Access Token từ Storage và chèn vào Header `Authorization: Bearer <token>`.
* **Response Interceptor:** Khi nhận mã lỗi `401 TOKEN_EXPIRED`, tự động gọi API `/api/auth/refresh-token` để đổi token mới mà không làm gián đoạn trải nghiệm người dùng.

---

## 💡 CÁC CÂU HỎI KỸ THUẬT GIÁO VIÊN HAY HỎI VỀ CODE (Q&A)

### ❓ Q1: "Mã nguồn của em tổ chức theo mô hình nào? Điểm mạnh của nó là gì?"
👉 **Trả lời:** "Dạ thưa thầy/cô, mã nguồn Backend tổ chức theo mô hình **Layered Architecture (Router - Middleware - Controller - Service - Model)**.
* **Controller** chịu trách nhiệm xử lý giao tiếp HTTP (input validation, response formatting).
* **Service** chịu trách nhiệm chứa toàn bộ logic nghiệp vụ (business logic) và thao tác với DB.
* Điểm mạnh là giúp mã nguồn tách biệt trách nhiệm (Separation of Concerns), dễ viết Unit Test độc lập cho Service và dễ bảo trì khi dự án phát triển."

---

### ❓ Q2: "Token JWT được lưu ở đâu? Làm sao để refresh token khi hết hạn mà không bắt người dùng đăng nhập lại?"
👉 **Trả lời:** 
* Trên Web, Access Token lưu trong bộ nhớ tạm/State, Refresh Token lưu trong Secure Cookie hoặc LocalStorage. Trên Mobile Expo, Refresh Token được lưu an toàn bằng **`expo-secure-store`** (mã hóa theo Keystore/Keychain của HĐH).
* Tại Axios Client, em cài đặt **Response Interceptor**. Khi nhận lỗi 401 do token hết hạn, Interceptor sẽ hoãn request hiện tại, gửi Refresh Token lên API `/auth/refresh-token` để lấy Access Token mới, sau đó tự động thực hiện lại request ban đầu."

---

### ❓ Q3: "Em xử lý lỗi (Error Handling) trong Backend như thế nào để ứng dụng không bị sập (crash) khi gặp ngoại lệ?"
👉 **Trả lời:** "Dạ em sử dụng **Centralized Error Handling Middleware** ([error.middleware.js](file:///d:/FPT_MAXLO/8/WDP-301/AutoWashPro-WDP301/BE/src/middlewares/error.middleware.js)). Tất cả các Async Controller đều được bao bọc hoặc chuyển lỗi về hàm `next(error)`. Middleware xử lý lỗi cuối cùng sẽ bắt lấy ngoại lệ, ghi log chi tiết phía server và trả về cho client một JSON chuẩn gồm `{ success: false, message: '...', code: '...' }` với HTTP Status Code phù hợp (400, 401, 403, 404, 500) giúp server luôn chạy ổn định."
