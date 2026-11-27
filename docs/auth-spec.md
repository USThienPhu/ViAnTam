# Auth & User Specification (`auth-spec.md`)

## 1. Mục tiêu nghiệp vụ
Cung cấp cơ chế đăng ký, đăng nhập đơn giản, an toàn cho ứng dụng chat 1-1 và phân quyền truy cập trang Quản trị (`admin`).

## 2. Database Schema (`User` - MongoDB)
```javascript
{
  _id: ObjectId,
  username: { type: String, unique: true, required: true, trim: true, minlength: 3, maxlength: 30 },
  passwordHash: { type: String, required: true }, // băm bằng bcrypt (saltRounds = 10)
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  reportCount: { type: Number, default: 0 },
  isFlagged: { type: Boolean, default: false },   // true khi reportCount >= 3 hoặc Admin gắn cờ
  isSimulatorBot: { type: Boolean, default: false }, // chừa sẵn cho Practice Mode
  createdAt: { type: Date, default: Date.now }
}
```

## 3. API Contract (`/api/auth` & `/api/users`)

| Method | Endpoint | Mô tả | Request Body / Query | Response (200/201) |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Đăng ký tài khoản mới | `{ username, password }` | `{ token, user: { id, username, role } }` |
| `POST` | `/api/auth/login` | Đăng nhập | `{ username, password }` | `{ token, user: { id, username, role } }` |
| `GET` | `/api/auth/me` | Lấy thông tin user hiện tại (Header `Authorization: Bearer <token>`) | - | `{ id, username, role, isFlagged }` |
| `GET` | `/api/users` | Lấy danh sách người dùng để chat (trừ bản thân) | - | `[{ id, username, reportCount, isFlagged, isBlockedByMe, hasBlockedMe }]` |

## 4. Quy tắc nghiệp vụ & Bảo mật
- **Password:** Luôn băm bằng `bcrypt` trước khi lưu, không bao giờ trả `passwordHash` về Client.
- **JWT Token:** Thời hạn `7d`, payload chứa `{ userId, username, role }`.
- **Middleware:**
  - `authMiddleware`: Kiểm tra JWT hợp lệ, gắn `req.user`.
  - `adminOnly`: Kiểm tra `req.user.role === 'admin'`, trả về `403 Forbidden` nếu không phải Admin.
- **Quyền riêng tư:** Không truyền `passwordHash` hoặc `JWT` vào bất kỳ payload nào gửi sang AWS LLM.

## 5. Yêu cầu Giao diện (Frontend)
- `LoginPage.jsx` & `RegisterPage.jsx`: Form tối giản, validate độ dài `username` (>= 3 ký tự) và `password` (>= 6 ký tự), hiển thị thông báo lỗi rõ ràng bằng tiếng Việt.
- Lưu JWT vào `localStorage`, tự động gắn vào header `Authorization` qua `axiosInstance` và gửi khi khởi tạo kết nối Socket.IO.
