# Auth & User Specification (`auth-spec.md`)

## 1. Mục tiêu nghiệp vụ
Cung cấp cơ chế đăng ký, đăng nhập bằng `username` + `password` cho ứng dụng chat 1-1 và phân quyền truy cập trang Quản trị (`admin`).

## 2. Database Schema (`User` - MongoDB)
File: `server/src/models/User.js`
```javascript
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true, minlength: 3, maxlength: 30 },
  usernameLower: { type: String, unique: true, required: true, select: false }, // tự sinh = username.toLowerCase(), chống trùng tên chỉ khác hoa/thường
  passwordHash: { type: String, required: true, select: false }, // mặc định ẩn khi query
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  reportCount: { type: Number, default: 0 },
  isFlagged: { type: Boolean, default: false },      // true khi reportCount >= 3 hoặc Admin gắn cờ
  isSimulatorBot: { type: Boolean, default: false }, // chừa sẵn cho Practice Mode
}, { timestamps: true });
```

## 3. API Contract (`/api/auth` & `/api/users`)

### 3.1. `POST /api/auth/register`
- **Request Body:** `{ "username": "nguyen_van_a", "password": "password123" }`
- **Validation:** `username` 3–30 ký tự (chỉ chữ không dấu, số, `_`), `password` từ 6 ký tự đến tối đa 72 byte (giới hạn của bcrypt). Cả hai phải là chuỗi.
- **Username không phân biệt hoa/thường khi kiểm tra trùng** (`Admin` và `admin` là cùng một tên). Cách viết hoa/thường gốc vẫn được giữ khi hiển thị.
- **Role mặc định:** luôn là `user`, bỏ qua mọi `role` hoặc `isFlagged` client gửi lên.
- **Responses:**
  - `201 Created`: `{ "token": "<jwt>", "user": { "id": "...", "username": "...", "role": "user" } }`
  - `400 Bad Request`: `{ "message": "Tên đăng nhập hoặc mật khẩu không hợp lệ." }`
  - `409 Conflict`: `{ "message": "Tên đăng nhập đã tồn tại." }`

### 3.2. `POST /api/auth/login`
- **Request Body:** `{ "username": "nguyen_van_a", "password": "password123" }`
- **Quy tắc:** username không phân biệt hoa/thường, mật khẩu có phân biệt. Sai username hoặc sai mật khẩu đều trả cùng một thông báo `401`.
- **JWT:** ký HS256 bằng `JWT_SECRET`, payload `{ id, username, role }`, hết hạn sau **7 ngày**.
- **Responses:**
  - `200 OK`: `{ "token": "<jwt>", "user": { "id": "...", "username": "...", "role": "user", "isFlagged": false } }`
  - `401 Unauthorized`: `{ "message": "Sai tên đăng nhập hoặc mật khẩu." }`

### 3.3. `GET /api/auth/me` *(Yêu cầu `authMiddleware`)*
- **Responses:** `200 OK`: `{ "id": "...", "username": "...", "role": "...", "isFlagged": false }` | `401 Unauthorized`

### 3.4. `GET /api/users` *(Yêu cầu `authMiddleware`)*
- **Logic:** Lấy tất cả user khác `req.user.id` (không lấy `isSimulatorBot: true` trừ khi bật Practice Mode), sắp xếp theo `username`. Đối chiếu bảng `Block` để gắn thêm 2 cờ trạng thái chặn: `isBlockedByMe` (mình chặn họ) và `hasBlockedMe` (họ chặn mình).
- **Responses:** `200 OK`:
```json
[
  {
    "id": "65f...",
    "username": "HoTro_MoMo_247",
    "reportCount": 3,
    "isFlagged": true,
    "isBlockedByMe": false,
    "hasBlockedMe": false
  }
]
```

## 4. Middlewares (`server/src/middlewares/auth.js`)
- **`authMiddleware(req, res, next)`:** Đọc `Authorization: Bearer <token>`, verify bằng `process.env.JWT_SECRET`. Gắn `req.user = { id, username, role }`. Lỗi -> `401`.
- **Mount route:** `auth.routes.js` được mount tại `/api` và tự khai báo đường dẫn đầy đủ (`/auth/register`, `/auth/login`, `/auth/me`, `/users`).
- **Kiểm thử:** `npm test` trong `backend/` chạy test bằng MongoDB trong bộ nhớ, không dùng database Atlas.
- **`adminOnly(req, res, next)`:** Kiểm tra `req.user?.role === 'admin'`. Nếu không -> `403 Forbidden: { message: "Bạn không có quyền truy cập." }`.

## 5. Yêu cầu Frontend (`client/`)
- `AuthContext.jsx`: Lưu `user` và `token` vào `localStorage`, cung cấp `login()`, `register()`, `logout()`, `loading`.
- `axiosInstance.js`: Tự động đính kèm `Authorization: Bearer <token>`. Nếu gặp `401`, tự động `logout()` và điều hướng về `/login`.
- `LoginPage.jsx` & `RegisterPage.jsx`: Tuân thủ `docs/theme.md`, hiển thị lỗi validation tiếng Việt rõ ràng.
