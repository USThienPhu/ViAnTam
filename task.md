# Phân chia công việc chi tiết — ScamGuard Chat (4 Ngày - Nhóm 3 người)

Tài liệu được thiết kế theo chuẩn **AI-Driven Development**: mỗi task đều gắn **Mã Task**, **File mục tiêu**, **Spec tham chiếu**, và **Tiêu chí hoàn thành (Done Criteria)** để thành viên hoặc AI Agent thực thi chính xác.

**Phân vai:**
- **TV1 (AI / LLM Engineer):** Mô hình Custom LLM, FastAPI wrapper, Deploy AWS, Benchmark.
- **TV2 (Fullstack — Hạ tầng, Auth, Chat, VietQR, Safety/Admin & Deploy):** MongoDB Atlas, Auth, Socket.IO Chat, VietQR Parser, Báo cáo/Chặn/Admin, Deploy Backend & Frontend.
- **TV3 (Fullstack — Link Analyzer, Scam Check, 3 Câu hỏi, Seed & E2E):** Link Heuristic + Safe Browsing, AWS LLM Client, Scam Check + Clarification + History, `seedDemo.js`, E2E Testing.

---

## NGÀY 1: Khởi tạo Database, Hạ tầng, Contract & Core Nền tảng

### Thành viên 1 (AI / LLM)
- **AI-1.1 | Chuẩn bị Dataset & Prompt chống Injection** (`docs/aws-llm-service-spec.md`)
  - Tạo bộ 20 kịch bản mẫu (15 lừa đảo VN: MoMo/ngân hàng/công an/CTV/đầu tư/tình cảm; 5 bình thường).
  - Viết `ai-service/prompt_builder.py` bọc tin nhắn trong `<CONVERSATION_DATA>...</CONVERSATION_DATA>`.
  - *Done:* Prompt test thử không bị jailbreak bởi câu lệnh giả trong tin nhắn.
- **AI-1.2 | Dựng FastAPI Wrapper** (`ai-service/app.py`, `ai-service/model_loader.py`)
  - Tạo endpoint `POST /analyze` nhận Pydantic `AnalyzeRequest`, kiểm tra header `X-API-Key`, trả về `AnalyzeResponse`.
  - Viết hàm `repair_json()` xử lý trường hợp model trả về JSON bọc markdown ` ```json `.
  - *Done:* Chạy local `uvicorn app:app --port 8000` trả JSON hợp lệ 100%.

### Thành viên 2 (Fullstack: DB, Auth, Chat Core)
- **W2-1.1 | Khởi tạo MongoDB Atlas & Project Repo** (`docs/architecture-spec.md`)
  - Tạo Cluster MongoDB Atlas, tạo Database User, mở Network Access (`0.0.0.0/0` cho dev/deploy), lấy `MONGODB_URI`.
  - Khởi tạo `server/package.json` (`express`, `socket.io`, `mongoose`, `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv`, `multer`, `jimp`, `jsqr`, `express-rate-limit`).
  - Khởi tạo `client/package.json` (`react`, `vite`, `tailwindcss`, `axios`, `socket.io-client`, `lucide-react`).
  - *Done:* `server/` kết nối thành công MongoDB Atlas; `client/` chạy `npm run dev` áp dụng `docs/theme.md`.
- **W2-1.2 | Module Auth (Backend + Frontend)** (`docs/auth-spec.md`)
  - BE: `server/src/models/User.js`, `middlewares/auth.js` (`authMiddleware`, `adminOnly`), `routes/auth.routes.js` (`/register`, `/login`, `/me`, `/users`).
  - FE: `client/src/context/AuthContext.jsx`, `api/axiosInstance.js`, `pages/LoginPage.jsx`, `pages/RegisterPage.jsx`.
  - *Done:* Đăng ký, đăng nhập trả về JWT; route `/api/auth/me` hoạt động; UI báo lỗi tiếng Việt khi sai mật khẩu/trùng username.

### Thành viên 3 (Fullstack: Schemas, Layout & Link Analyzer)
- **W3-1.1 | Mongoose Schemas & Layout Chính** (`docs/architecture-spec.md`, `docs/theme.md`)
  - BE: Tạo `server/src/models/Message.js`, `Report.js`, `Block.js`, `Blacklist.js`, `ScamCheck.js` kèm đầy đủ indexes.
  - FE: Cấu hình `client/src/index.css` theo `docs/theme.md`, dựng Navbar điều hướng (`/`, `/history`, `/tips`, `/admin` ẩn nếu không phải admin).
  - *Done:* Toàn bộ Mongoose models không lỗi syntax; Navbar chuyển trang mượt.
- **W3-1.2 | Link Analyzer Service** (`docs/ai-scam-detection-spec.md`)
  - BE: Tạo `server/src/services/linkAnalyzer.service.js` gồm: trích xuất URL bằng regex, kiểm tra `has_ip_host`, `suspicious_tld`, `shortened_url`, thuật toán Levenshtein `typosquatting`, và hàm gọi Google Safe Browsing API (fallback timeout `2000ms`).
  - *Done:* Unit test nhanh với `http://m0mo-xacminh.xyz` trả về `["typosquatting", "suspicious_tld"]`.

---

## NGÀY 2: Chat Realtime, VietQR, Deploy AWS LLM & Luồng Scam Check

### Thành viên 1 (AI / LLM)
- **AI-2.1 | Deploy Custom LLM lên AWS** (`docs/aws-llm-service-spec.md`)
  - Triển khai `ai-service/` lên **AWS** (EC2 GPU / ECS), cấu hình Security Group mở port `8000` (hoặc Nginx HTTPS), thiết lập `AWS_LLM_API_KEY`.
  - *Done:* TV3 gọi `POST http://<aws-ip>:8000/analyze` từ máy local thành công trong `< 3s`.

### Thành viên 2 (Fullstack: Chat 1-1 & VietQR)
- **W2-2.1 | Socket.IO Chat 1-1 & Upload Ảnh** (`docs/chat-spec.md`)
  - BE: `server/src/sockets/chat.socket.js` (xác thực JWT, kiểm tra `Block` trước khi gửi, lưu `Message`, emit `receive_message`); `routes/chat.routes.js` (`GET /messages/:targetUserId`, `POST /messages/upload`).
  - BE: Tạo `server/src/services/chatPartner.interface.js` chừa sẵn abstraction cho Practice Mode.
  - *Done:* 2 trình duyệt chat text realtime mượt; bị chặn thì server emit `message_error`.
- **W2-2.2 | Bộ giải mã VietQR đa ngân hàng & UI Chat** (`docs/chat-spec.md`)
  - BE: Tạo `server/src/config/bankBins.json` và `server/src/services/qrParser.service.js` (`jimp` + `jsqr` + `parseTLV` đọc Tag 38, 54, 62).
  - FE: `pages/ChatPage.jsx`, `components/ChatWindow.jsx`, `components/MessageBubble.jsx` (hiển thị ảnh QR + thẻ tóm tắt Ngân hàng/STK/Số tiền bên dưới).
  - *Done:* Gửi ảnh QR của BIDV/MBBank/VCB giải mã và hiển thị đúng tên ngân hàng + STK trên khung chat.

### Thành viên 3 (Fullstack: AWS LLM Client & Scam Check Core)
- **W3-2.1 | AWS LLM Client & API Analyze** (`docs/ai-scam-detection-spec.md`)
  - BE: Tạo `server/src/services/llmClient.service.js` gọi `AWS_LLM_API_URL` (timeout `15000ms`, có fallback chấm điểm Heuristic nếu AWS lỗi).
  - BE: Tạo `server/src/routes/scamCheck.routes.js` (`POST /api/scam-check/analyze`) + `middlewares/rateLimit.js`.
  - *Done:* Gọi `/analyze` lấy 30 tin nhắn gần nhất, đối chiếu `Blacklist`, ép điểm `>= 85` nếu trúng Blacklist, lưu `ScamCheck`.
- **W3-2.2 | UI Kiểm tra lừa đảo & Privacy Modal** (`docs/ai-scam-detection-spec.md`, `docs/ui-ux-spec.md`)
  - FE: Nút **"Kiểm tra lừa đảo"** trên header `ChatWindow.jsx`, `components/PrivacyConfirmModal.jsx`, `components/ScamResultModal.jsx` (hiển thị điểm 0–100, màu Xanh/Vàng/Đỏ, trích dẫn dấu hiệu, lời khuyên, dòng lưu ý miễn trừ).
  - *Done:* Bấm kiểm tra -> hiện modal xác nhận -> loading -> hiển thị kết quả phân tích trực quan.

---

## NGÀY 3: 3 Câu hỏi làm rõ, Safety/Admin, Lịch sử & Seed Data

### Thành viên 1 (AI / LLM)
- **AI-3.1 | Tinh chỉnh Prompt & Chạy Benchmark** (`docs/aws-llm-service-spec.md`)
  - Tinh chỉnh ngưỡng điểm để các ca mập mờ rơi đúng vào vùng `30–69` (kích hoạt hỏi làm rõ) và ca bình thường `< 30`.
  - Chạy script đánh giá trên 20 mẫu, ghi nhận Recall (`>= 90%`) và False Positive (`<= 10%`).
  - *Done:* Hoàn thành bảng kết quả Benchmark để đưa vào slide.

### Thành viên 2 (Fullstack: Safety, Admin & Mẹo)
- **W2-3.1 | Báo cáo, Chặn & Cảnh báo tự động** (`docs/safety-admin-spec.md`)
  - BE: `server/src/routes/safety.routes.js` (`POST /api/reports` chống spam trùng người báo cáo, tự tăng `reportCount`, `>= 3` bật `isFlagged`, tự upsert Link/STK bằng chứng vào `Blacklist`; `POST/DELETE /api/blocks`).
  - FE: `components/ReportModal.jsx`, nút Chặn/Bỏ chặn, banner cảnh báo đỏ/vàng khi mở chat với user có `isFlagged === true`.
  - *Done:* Báo cáo từ 3 user khác nhau -> user bị báo cáo tự động hiện banner cảnh báo.
- **W2-3.2 | Admin Dashboard & Trang Mẹo** (`docs/safety-admin-spec.md`)
  - BE: `server/src/routes/admin.routes.js` (`GET /api/admin/overview`, `PATCH /api/admin/blacklist/:id` gắn `adminOnly`).
  - FE: `pages/AdminPage.jsx` (2 tab: Tài khoản bị báo cáo nhiều & Danh sách Blacklist), `pages/TipsPage.jsx` (cẩm nang nhận biết lừa đảo VN).
  - *Done:* Đăng nhập `admin` xem được danh sách bị report và bấm Xác nhận/Gỡ Blacklist.

### Thành viên 3 (Fullstack: 3 Câu hỏi làm rõ, Lịch sử & Seed)
- **W3-3.1 | Clarification Engine & Feedback** (`docs/ai-scam-detection-spec.md`)
  - BE: Tạo `server/src/services/clarification.service.js` (chọn tối đa 3 câu hỏi, tính `finalScore` theo bảng trọng số cố định, sinh chuỗi `scoreChangeReason`).
  - BE: Thêm `POST /api/scam-check/:checkId/clarify`, `POST /api/scam-check/:checkId/feedback`, `GET /api/scam-check/history`.
  - FE: `components/ClarificationStepper.jsx`, đếm ngược `3s` cho nút **"Tôi đã kiểm tra và vẫn muốn tiếp tục"**, nút Feedback Đúng/Sai, `pages/HistoryPage.jsx`.
  - *Done:* Ca điểm `30–69` hiện 3 câu hỏi; trả lời xong cập nhật điểm + giải thích lý do thay đổi ngay trên Modal.
- **W3-3.2 | Script Seed Data** (`docs/testing-seed-spec.md`)
  - BE: Viết `server/src/seeds/seedDemo.js` tạo `admin`, `demo_user`, và 3 cuộc hội thoại mẫu (`HoTro_MoMo_247`, `TuyenDung_CTV_Online`, `ChuTro_AnhMinh`).
  - *Done:* Chạy `npm run seed` tạo sạch dữ liệu mẫu không lỗi trùng lặp (idempotent).

---

## NGÀY 4: Deploy Production, Seed Prod, E2E Testing & Demo

### Thành viên 1 (AI / LLM)
- **AI-4.1 | Ổn định Production AWS & Chuẩn bị Slide**
  - Cấu hình `systemd` / `PM2` / Docker `--restart always` cho `ai-service` trên AWS.
  - Chuẩn bị sơ đồ kiến trúc AI + bảng số liệu Benchmark cho bài thuyết trình MoMo TechDays.

### Thành viên 2 (Fullstack: Deploy Backend & Frontend)
- **W2-4.1 | Deploy Backend & Frontend lên Cloud**
  - Deploy `server/` lên Render / Railway / AWS EC2 (cấu hình đủ `.env`: `MONGODB_URI`, `AWS_LLM_API_URL`, `CLIENT_URL`, `JWT_SECRET`).
  - Deploy `client/` lên Vercel / Netlify (cấu hình `VITE_API_URL`, `VITE_SOCKET_URL` trỏ về Backend Production).
  - *Done:* Truy cập URL Frontend Production, đăng nhập và chat realtime ổn định qua HTTPS/WSS.

### Thành viên 3 (Fullstack: Seed Prod & E2E Testing)
- **W3-4.1 | Seed Production & Kiểm thử E2E (`TC-01` đến `TC-06`)** (`docs/testing-seed-spec.md`)
  - Chạy `seedDemo.js` trỏ vào MongoDB Atlas Production.
  - Thực hiện kiểm thử đầy đủ `TC-01` đến `TC-06` trên URL đã deploy.
  - Quay video demo dự phòng toàn bộ luồng và chốt kịch bản trình bày cùng nhóm.
