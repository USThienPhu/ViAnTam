# Quy ước chung của dự án (`convention.md`)

Tài liệu này quy định các tiêu chuẩn kỹ thuật, đặt tên, Git workflow và định dạng dữ liệu thống nhất cho cả **3 thành viên** và **AI Coding Agents** trong suốt 4 ngày phát triển **AIthena**.

---

## 1. Quy ước Git & Tránh xung đột (Git Workflow)
- **Nhánh chính:** `main` (chỉ merge code đã chạy ổn định và pass kiểm tra).
- **Nhánh tính năng:** Đặt tên theo vai trò hoặc mã task trong `task.md`:
  - `feat/tv1-<ten-tinh-nang>` (VD: `feat/tv1-aws-llm`, `feat/tv1-tips-history`)
  - `feat/tv2-<ten-tinh-nang>` (VD: `feat/tv2-auth-chat`, `feat/tv2-vietqr`)
  - `feat/tv3-<ten-tinh-nang>` (VD: `feat/tv3-scam-check`, `feat/tv3-admin`)
- **Commit Message:** Dùng chuẩn Conventional Commits ngắn gọn:
  - `feat: ...` | `fix: ...` | `docs: ...` | `refactor: ...` | `chore: ...`
- **Nguyên tắc ranh giới file:** Tuyệt đối tuân thủ mục *"Quy ước chống xung đột Git"* trong `task.md` (TV2 và TV3 không sửa chéo `ChatWindow.jsx` và `ChatSafetyActions.jsx`).

---

## 2. Quy ước đặt tên (Naming Conventions)

| Đối tượng | Quy ước | Ví dụ đúng |
|---|---|---|
| **MongoDB Collections** | `snake_case`, số nhiều (Mongoose tự map) | `users`, `scam_checks`, `blacklist` |
| **Mongoose Fields & JSON API** | `camelCase` (riêng Contract gửi AWS LLM dùng `snake_case`) | `targetUserId`, `riskLevel`, `isFlagged` |
| **Backend Files (`server/`)** | `camelCase` + hậu tố chức năng | `auth.routes.js`, `qrParser.service.js`, `User.js` |
| **Frontend Components & Pages** | `PascalCase.jsx` | `ChatWindow.jsx`, `ScamResultModal.jsx` |
| **Frontend Hooks / Utils / API** | `camelCase.js` | `axiosInstance.js`, `socket.js` |
| **Python Files (`ai-service/`)** | `snake_case.py` | `app.py`, `prompt_builder.py`, `model_loader.py` |
| **Biến môi trường (`.env`)** | `UPPER_SNAKE_CASE` | `MONGODB_URI`, `AWS_LLM_API_URL` |

---

## 3. Quy ước API Response & Xử lý lỗi (Backend Node.js)
- **Thành công:** Trả về đúng JSON data và HTTP status phù hợp (`200 OK`, `201 Created`).
- **Lỗi (4xx / 5xx):** Bắt buộc trả về cấu trúc thống nhất để Frontend dễ bắt lỗi:
  ```json
  {
    "message": "Thông báo lỗi tiếng Việt rõ ràng cho người dùng.",
    "code": "OPTIONAL_ERROR_CODE"
  }
  ```
- **Try/Catch:** Mọi async route handler trong Express phải bọc `try { ... } catch (err)` hoặc chuyển tiếp qua `next(err)` để không làm crash server Node.js.

---

## 4. Quy ước Frontend (React + TailwindCSS)
- **Ngôn ngữ hiển thị:** 100% văn bản trên UI (nút bấm, nhãn, thông báo lỗi, modal) dùng **tiếng Việt có dấu, trung tính**.
- **Gọi API:** Mọi HTTP request đều đi qua `client/src/api/axiosInstance.js` (không dùng `fetch` rời rạc để tránh thiếu JWT token).
- **Theme & Style:** Chỉ sử dụng màu sắc, font chữ, bo góc đã chốt trong `docs/theme.md`. Không tự chế màu ngoài hệ thống cho các trạng thái rủi ro (`low`/`medium`/`high`).
- **Dùng class token, không viết mã hex:** Dùng các class sinh từ token trong `frontend/src/index.css` (xem `docs/theme.md` mục 5), ví dụ `bg-brand-primary`, `bg-risk-low-bg`. Không viết mã hex trực tiếp như `bg-[#D82D8B]`.
- **Class theo mức rủi ro:** Khi chọn class theo `riskLevel`, khai báo một map chứa tên class đầy đủ, ví dụ `{ low: 'bg-risk-low-bg', medium: 'bg-risk-medium-bg', high: 'bg-risk-high-bg' }`. Không ghép chuỗi động như `` `bg-risk-${level}-bg` ``, vì Tailwind không sinh ra class đó.
- **Xử lý State:** Luôn có đủ `loading`, `error` và `empty` state cho các thao tác gọi API.

---

## 5. Quy ước Bảo mật & Môi trường
- **Không commit `.env`:** Chỉ commit `.env.example`. Tuyệt đối không đưa `MONGODB_URI`, `JWT_SECRET`, `AWS_LLM_API_KEY`, hoặc Google API Key vào code.
- **Privacy-First:** Không gửi tin nhắn sang AWS LLM nếu chưa có hành động bấm nút **"Kiểm tra lừa đảo"** và xác nhận từ người dùng.
- **Untrusted Data:** Mọi dữ liệu tin nhắn từ người dùng đều phải sanitize/bọc `<CONVERSATION_DATA>` trước khi đưa vào LLM.
