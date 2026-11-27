# Auth & User Specification (`auth-spec.md`)

## 1. Mục tiêu nghiệp vụ
Cung cấp cơ chế đăng ký, đăng nhập bằng `username` + `password` cho ứng dụng chat 1-1 và phân quyền truy cập trang Quản trị (`admin`).

## 2. Database Schema (`User` - MongoDB)
File: `server/src/models/User.js`
```javascript
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true, minlength: 3, maxlength: 30 },
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
- **Validation:** `username` 3–30 ký tự (chỉ chữ, số, `_`), `password` >= 6 ký tự.
- **Responses:**
  - `201 Created`: `{ "token": "<jwt>", "user": { "id": "...", "username": "...", "role": "user" } }`
  - `400 Bad Request`: `{ "message": "Tên đăng nhập hoặc mật khẩu không hợp lệ." }`
  - `409 Conflict`: `{ "message": "Tên đăng nhập đã tồn tại." }`

### 3.2. `POST /api/auth/login`
- **Request Body:** `{ "username": "nguyen_van_a", "password": "password123" }`
- **Responses:**
  - `200 OK`: `{ "token": "<jwt>", "user": { "id": "...", "username": "...", "role": "user", "isFlagged": false } }`
  - `401 Unauthorized`: `{ "message": "Sai tên đăng nhập hoặc mật khẩu." }`

### 3.3. `GET /api/auth/me` *(Yêu cầu `authMiddleware`)*
- **Responses:** `200 OK`: `{ "id": "...", "username": "...", "role": "...", "isFlagged": false }` | `401 Unauthorized`

### 3.4. `GET /api/users` *(Yêu cầu `authMiddleware`)*
- **Logic:** Lấy tất cả user khác `req.user.id` (không lấy `isSimulatorBot: true` trừ khi bật Practice Mode). Đối chiếu bảng `Block` để gắn thêm 2 cờ trạng thái chặn.
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
- **`adminOnly(req, res, next)`:** Kiểm tra `req.user?.role === 'admin'`. Nếu không -> `403 Forbidden: { message: "Bạn không có quyền truy cập." }`.

## 5. Yêu cầu Frontend (`client/`)
- `AuthContext.jsx`: Lưu `user` và `token` vào `localStorage`, cung cấp `login()`, `register()`, `logout()`, `loading`.
- `axiosInstance.js`: Tự động đính kèm `Authorization: Bearer <token>`. Nếu gặp `401`, tự động `logout()` và điều hướng về `/login`.
- `LoginPage.jsx` & `RegisterPage.jsx`: Tuân thủ `docs/theme.md`, hiển thị lỗi validation tiếng Việt rõ ràng.
