# Phân chia công việc chi tiết — AegisAI (4 Ngày - Nhóm 3 người)

Tài liệu được kiểm tra và tối ưu theo 3 tiêu chí: **đầy đủ 100% đầu việc để web chạy trơn tru**, **hạn chế tối đa xung đột Git (merge conflict)**, và **rõ ràng kết quả đầu ra (Done Criteria)** cho từng thành viên.

**Phân vai tổng thể (Cân bằng ~33% mỗi người):**
- **TV1 (AI / LLM + Cầu nối AI + Trang Mẹo & Lịch sử):** `ai-service/` (AWS) + `linkAnalyzer.service.js` & `llmClient.service.js` (`backend/`) + `TipsPage.jsx` & `HistoryPage.jsx` (`frontend/`).
- **TV2 (Hạ tầng DB, Auth, Chat 1-1, VietQR & Deploy):** MongoDB Atlas + Server Core (`app.js`, Socket.IO, Upload) + Auth (BE/FE) + Chat 1-1 & VietQR (BE/FE) + Frontend Shell (`App.jsx`, `Navbar`, `socket.js`) + Deploy Production.
- **TV3 (Scam Check, 3 Câu hỏi, Safety/Admin & Seed/E2E):** API & UI Luồng Kiểm tra lừa đảo + 3 Câu hỏi làm rõ + Báo cáo/Chặn/Admin (BE/FE) + `seedDemo.js` + E2E Testing.

---

## Quy ước chống xung đột Git (Bắt buộc tuân thủ)
1. **Ranh giới Frontend tại `ChatWindow.jsx`:**
   - **TV2** sở hữu `ChatWindow.jsx` (hiển thị tin nhắn, ô nhập, gửi ảnh) và chỉ chừa 2 chỗ gắn component của TV3: `<FlaggedBanner user={selectedUser} />` và `<ChatSafetyActions targetUser={selectedUser} messages={messages} onBlockChange={...} />`.
   - **TV3** sở hữu toàn bộ logic bên trong `ChatSafetyActions.jsx` (3 nút Kiểm tra/Báo cáo/Chặn + các Modal). Hai người **không sửa chéo** file của nhau.
2. **Ranh giới Backend tại `backend/src/app.js`:**
   - **TV2** tạo sẵn `app.js` với CORS, `express.json()`, static `/uploads`, `GET /api/health` và mount sẵn cả 5 nhóm routes (`/api/auth`, `/api/messages`, `/api/scam-check`, `/api/reports` & `/api/blocks`, `/api/admin`).
3. **Ranh giới API & UI Shared:**
   - Dùng chung `frontend/src/api/axiosInstance.js` (do TV2 tạo ở Ngày 1) và bảng màu trong `docs/theme.md`.

---

## Bảng phân chia chi tiết phần FRONTEND (`frontend/src/`)

| Thành viên | Pages phụ trách | Components & Core Files phụ trách |
|---|---|---|
| **TV1** | `TipsPage.jsx`, `HistoryPage.jsx` | Thẻ kiến thức 5 chiêu trò lừa đảo VN, Bảng lịch sử `ScamCheck` + Nút Feedback Đúng/Sai |
| **TV2** | `LoginPage.jsx`, `RegisterPage.jsx`, `ChatPage.jsx` | `App.jsx` (Router, `ProtectedRoute`, `AdminRoute`), `AuthContext.jsx`, `axiosInstance.js`, `socket.js`, `Navbar.jsx`, `ChatWindow.jsx`, `MessageBubble.jsx`, Sidebar danh sách user |
| **TV3** | `AdminPage.jsx` | `ChatSafetyActions.jsx`, `FlaggedBanner.jsx`, `PrivacyConfirmModal.jsx`, `ScamResultModal.jsx`, `ClarificationStepper.jsx`, `ReportModal.jsx` |

---

## Lộ trình chi tiết 4 Ngày (Kèm Cổng kiểm tra tích hợp)

### NGÀY 1: Khởi tạo Database, Hạ tầng, Contract & Core Nền tảng

#### Thành viên 1 (AI / LLM + Cầu nối AI)
- **AI-1.0 | Chuẩn bị AWS Bedrock (làm đầu tiên)** (`docs/aws-llm-service-spec.md` mục 1)
  - Bật *Model access* trong Bedrock Console cho model chính + dự phòng (cùng region); kiểm tra credit có áp dụng cho model đã chọn; đặt AWS Budget cảnh báo `$5`; tạo IAM Role `bedrock:InvokeModel` cho EC2.
  - *Kết quả:* Gọi thử `converse` từ máy local bằng `boto3` nhận được câu trả lời.
- **AI-1.1 | Dataset & Prompt chống Injection** (`docs/aws-llm-service-spec.md` mục 5, 7)
  - Thu thập dữ liệu (Kaggle/HF tiếng Việt + tự viết theo cảnh báo chính thức), ghi license vào `ai-service/data/SOURCES.md`, tách `dev.jsonl` (~10–15 mẫu) và `test.jsonl` (`>= 20` lừa đảo + `>= 10` an toàn).
  - Viết `ai-service/prompt_builder.py`: làm sạch thẻ `<CONVERSATION_DATA>`/`<EXTRACTED_SIGNALS>` trong nội dung, bọc tin nhắn, few-shot lấy từ tập dev.
  - *Kết quả:* Prompt không bị jailbreak bởi câu lệnh giả hoặc thẻ đóng giả trong tin nhắn.
- **AI-1.2 | FastAPI Wrapper gọi Bedrock** (`ai-service/app.py`, `ai-service/model_loader.py`)
  - Tạo `POST /analyze` nhận `AnalyzeRequest`, kiểm tra `X-API-Key`, gọi Bedrock bằng `boto3` (`converse`), `repair_json()` + retry 1 lần; lỗi hẳn thì trả `502 LLM_UNAVAILABLE` (không trả điểm giả).
  - *Kết quả:* `uvicorn app:app --port 8000` chạy local trả JSON hợp lệ hoặc `502` rõ ràng.
- **AI-1.3 | Link Analyzer Service** (`backend/src/services/linkAnalyzer.service.js`, `docs/ai-scam-detection-spec.md` mục 3.1)
  - Export `normalizeUrl`, `analyzeLink`, `analyzeLinks` (link lấy từ `Message.extractedLinks`, không tự trích xuất); kiểm tra `has_ip_host`, `suspicious_tld`, `shortened_url`, `typosquatting` (tách token + chuẩn hóa `0→o`, `1→l`…), Google Safe Browsing fallback (`timeout: 2000ms`). Viết test `node --test`.
  - *Kết quả:* `http://m0mo-xacminh.xyz` trả về `["suspicious_tld", "typosquatting"]`; `https://momo.vn` trả về `[]`.

#### Thành viên 2 (Fullstack: DB, Server Shell, Auth & Router)
- **W2-1.1 | MongoDB Atlas & Khởi tạo Repo** (`docs/architecture-spec.md`, `docs/theme.md`)
  - Tạo Cluster MongoDB Atlas, Database User, Network Access (`0.0.0.0/0`), lấy `MONGODB_URI`.
  - Init `backend/` (`express`, `socket.io`, `mongoose`, `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv`, `multer`, `jimp`, `jsqr`, `express-rate-limit`). Tạo `app.js` (CORS, `/uploads` static, `GET /api/health`).
  - Init `frontend/` (`react`, `vite`, `tailwindcss`, `react-router-dom`, `axios`, `socket.io-client`, `lucide-react`). Cấu hình `index.css` theo `docs/theme.md`.
  - *Kết quả:* `GET /api/health` trả `200 OK`; `frontend/` chạy `npm run dev` đúng theme.
- **W2-1.2 | Module Auth, Router & Navbar (BE + FE)** (`docs/auth-spec.md`, `docs/ui-ux-spec.md`)
  - BE: `models/User.js`, `middlewares/auth.js` (`authMiddleware`, `adminOnly`), `routes/auth.routes.js` (`/register`, `/login`, `/me`, `/users`).
  - FE: `AuthContext.jsx`, `axiosInstance.js`, `App.jsx` (Routing + `ProtectedRoute` + `AdminRoute`), `Navbar.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`.
  - *Kết quả:* Đăng ký, đăng nhập nhận JWT; chuyển trang `/`, `/history`, `/tips`, `/admin` hoạt động đúng phân quyền.

#### Thành viên 3 (Fullstack: Schemas & Modal UI)
- **W3-1.1 | Toàn bộ Mongoose Schemas còn lại** (`docs/chat-spec.md`, `docs/ai-scam-detection-spec.md`, `docs/safety-admin-spec.md`)
  - BE: Tạo `models/Message.js`, `Report.js`, `Block.js`, `Blacklist.js`, `ScamCheck.js` kèm đầy đủ indexes (`conversationId`, `Blacklist.value`, `Block` unique).
  - *Kết quả:* Import tất cả models vào `backend` không lỗi.
- **W3-1.2 | Khung UI Modals & `ChatSafetyActions`** (`docs/ui-ux-spec.md`)
  - FE: Dựng `ChatSafetyActions.jsx`, `FlaggedBanner.jsx`, `PrivacyConfirmModal.jsx`, `ScamResultModal.jsx`, `ReportModal.jsx` với mock data tạm.
  - *Kết quả:* Các modal mở/đóng mượt, đúng màu `low`/`medium`/`high` theo `docs/theme.md`.

> **Checkpoint cuối Ngày 1:** Cả nhóm push code lên Git. Backend kết nối MongoDB Atlas, Auth + Router + Navbar chạy thông suốt trên local.

---

### NGÀY 2: Chat Realtime, VietQR, Deploy AWS LLM & Luồng Scam Check

#### Thành viên 1 (AI / LLM + Cầu nối Node.js)
- **AI-2.1 | Deploy `ai-service` lên AWS EC2** (`docs/aws-llm-service-spec.md` mục 6)
  - EC2 `t3.micro`/`t3.small` (không cần GPU) gắn IAM Role Bedrock; cấu hình `AWS_LLM_API_KEY`, `AWS_REGION`, `BEDROCK_MODEL_ID`; Security Group chỉ mở `8000` cho IP backend (hoặc Nginx HTTPS `443`).
  - *Kết quả:* Gọi `POST http://<aws-ip>:8000/analyze` từ bên ngoài thành công trong `< 3s`.
- **AI-2.2 | Viết `llmClient.service.js` tại Backend** (`backend/src/services/llmClient.service.js`, `docs/ai-scam-detection-spec.md` mục 2.1, 3.2)
  - Export `analyzeConversation(input)` và `riskLevelFromScore(score)`; đổi camelCase ↔ snake_case; gọi `AWS_LLM_API_URL` (`timeout: 15000ms`); fallback Heuristic có luật từ khóa; override Blacklist `>= 85`; tự tính `riskLevel` từ điểm; trả `analysisSource`. Viết test `node --test` cho heuristic với 3 hội thoại seed.
  - *Kết quả:* Node.js gọi sang AWS LLM nhận đúng JSON chuẩn; tắt AWS thì heuristic vẫn cho ra đúng 3 mức của 3 hội thoại seed.
- **W1-2.3 | Trang Mẹo (FE)** (`docs/safety-admin-spec.md` mục 4)
  - FE: `pages/TipsPage.jsx` (5 thẻ chiêu trò lừa đảo phổ biến VN, trang tĩnh) + sửa dòng route `/tips` trong `App.jsx`.
  - *Kết quả:* Vào `/tips` thấy đủ 5 thẻ, đúng theme.

#### Thành viên 2 (Fullstack: Chat 1-1 & VietQR)
- **W2-2.1 | Socket.IO Chat 1-1, Upload Ảnh & `ChatPartner`** (`docs/chat-spec.md`)
  - BE: `sockets/chat.socket.js` (JWT handshake, check `Block`, emit `receive_message` / `message_error`), `middlewares/upload.js` (`multer` giới hạn 5MB), `routes/chat.routes.js`, `services/chatPartner.interface.js`.
  - FE: `frontend/src/api/socket.js` (singleton kết nối Socket.IO với JWT).
  - *Kết quả:* 2 trình duyệt gửi/nhận tin nhắn text realtime; upload ảnh trả về `imageUrl` truy cập được qua trình duyệt.
- **W2-2.2 | Bộ giải mã VietQR & Giao diện Chat** (`docs/chat-spec.md`)
  - BE: `config/bankBins.json` + `services/qrParser.service.js` (`jimp` + `jsqr` + `parseTLV` Tag 38/54/62).
  - FE: `ChatPage.jsx`, `ChatWindow.jsx` (nhúng `<FlaggedBanner />` và `<ChatSafetyActions />`), `MessageBubble.jsx` (ảnh QR + thẻ tóm tắt Ngân hàng/STK/Số tiền).
  - *Kết quả:* Gửi ảnh QR BIDV/MBBank/VCB giải mã và hiển thị đúng thông tin trên khung chat.

#### Thành viên 3 (Fullstack: Scam Check Core & Báo cáo/Chặn)
- **W3-2.1 | API `POST /api/scam-check/analyze` & Rate Limit** (`docs/ai-scam-detection-spec.md`)
  - BE: `middlewares/rateLimit.js` (10 req/phút), `routes/scamCheck.routes.js` theo luồng `docs/ai-scam-detection-spec.md` mục 3.2.1 (lấy 30 tin gần nhất, gọi `linkAnalyzer.analyzeLinks`, đối chiếu `Blacklist` để gắn `inBlacklist`, gọi `llmClient.analyzeConversation`, lưu `ScamCheck` kèm `analysisSource`). Việc ép điểm `>= 85` khi trúng Blacklist do `llmClient` làm, route không làm lại.
  - FE: Gắn nút **"Kiểm tra lừa đảo"** trong `ChatSafetyActions.jsx` -> `PrivacyConfirmModal` -> Loading -> `ScamResultModal`.
  - *Kết quả:* Bấm kiểm tra trên cuộc trò chuyện trả về kết quả từ AWS LLM và lưu MongoDB.
- **W3-2.2 | API & UI Báo cáo, Chặn** (`docs/safety-admin-spec.md`)
  - BE: `routes/safety.routes.js` (`POST /api/reports` chống spam trùng `409`, tự tăng `reportCount`, `>= 3` bật `isFlagged` + emit `user_flagged`, upsert Link/STK vào `Blacklist`; `POST/DELETE /api/blocks`).
  - FE: Kết nối `ReportModal.jsx`, nút Chặn/Bỏ chặn, `FlaggedBanner.jsx`.
  - *Kết quả:* Chặn user -> ô chat bị khóa và server từ chối gửi tin; báo cáo từ 3 user -> hiện banner cảnh báo.

> **Checkpoint cuối Ngày 2:** Ghép nhánh `ChatWindow` + `ChatSafetyActions`. Toàn bộ luồng Chat 1-1, gửi ảnh QR, bấm Kiểm tra lừa đảo gọi AWS LLM, Chặn/Báo cáo phải chạy được end-to-end trên local.

---

### NGÀY 3: Trang Mẹo/Lịch sử, 3 Câu hỏi làm rõ, Admin & Seed Data

#### Thành viên 1 (AI Benchmark + Frontend `HistoryPage`)
- **AI-3.1 | Tinh chỉnh Prompt & Chạy Benchmark** (`docs/aws-llm-service-spec.md` mục 7)
  - Tinh chỉnh prompt trên tập `dev`; chạy `evaluate.py` trên tập `test` (lừa đảo khi `risk_score >= 70`): Recall `>= 90%`, FPR `<= 10%`, latency trung bình `< 3s`; xuất bảng số liệu cho slide.
- **W1-3.2 | Trang Lịch sử Kiểm tra (FE)** (`docs/ai-scam-detection-spec.md` mục 4)
  - FE: `pages/HistoryPage.jsx` (gọi `GET /api/scam-check/history`, hiển thị badge điểm theo `riskLevel`, nhãn "Đánh giá nhanh" khi `analysisSource === 'heuristic'`, nút Feedback **Đúng / Sai** gọi `POST /:checkId/feedback`) + sửa dòng route `/history` trong `App.jsx`.
  - Dựng trước với `mockApi` (`frontend/src/test/mockApi.js`) vì API `/history` và `/feedback` của TV3 cũng xong trong Ngày 3; ghép API thật khi TV3 merge. Merge `App.jsx` lần lượt với TV3 (dòng route `/admin` nằm sát).
  - *Kết quả:* Xem được lịch sử kiểm tra **của chính mình** và gửi Feedback Đúng/Sai lưu xuống DB.

#### Thành viên 2 (Fullstack: Polish UX & Chuẩn bị Deploy)
- **W2-3.1 | Hoàn thiện UX Chat, Error Toast & Responsive** (`docs/ui-ux-spec.md`)
  - FE: Đảm bảo đủ 4 states (Loading/Empty/Blocked/Error Toast), auto-scroll khi có tin nhắn mới, kiểm tra responsive mobile/desktop.
  - BE: Rà soát bảo mật `multer`, CORS, `.env`, chuẩn bị cấu hình Deploy.
  - *Kết quả:* Giao diện mượt mà, không có lỗi console hay vỡ layout.

#### Thành viên 3 (Fullstack: 3 Câu hỏi làm rõ, Admin & Seed Data)
- **W3-3.1 | Clarification Engine & Feedback API** (`docs/ai-scam-detection-spec.md`)
  - BE: `services/clarification.service.js` (bảng trọng số cố định, chọn tối đa 3 câu, sinh `scoreChangeReason`), API `/clarify`, `/feedback` (kiểm tra chủ sở hữu), `/history` (chỉ lấy `requesterId` của người đang đăng nhập, giới hạn 50).
  - FE: `ClarificationStepper.jsx` (`Có`/`Không`/`Không chắc`), nút **"Tôi đã kiểm tra và vẫn muốn tiếp tục"** (đếm ngược 3s).
  - *Kết quả:* Ca điểm `30–69` hiện 3 câu hỏi, trả lời xong cập nhật điểm & lý do ngay trên Modal.
- **W3-3.2 | Admin Dashboard & Script `seedDemo.js`** (`docs/safety-admin-spec.md`, `docs/testing-seed-spec.md`)
  - BE + FE: `routes/admin.routes.js` (`GET /api/admin/overview`, `PATCH /api/admin/blacklist/:id`) + `pages/AdminPage.jsx` (2 tab: Tài khoản bị báo cáo & Blacklist).
  - BE: Viết `backend/src/seeds/seedDemo.js` tạo `admin`, `demo_user`, và 3 cuộc hội thoại mẫu.
  - *Kết quả:* `npm run seed` chạy thành công; Admin xem và duyệt được Blacklist.

> **Checkpoint cuối Ngày 3:** 100% tính năng MVP hoàn thành trên local. Chạy thử toàn bộ `TC-01` đến `TC-06` trên máy local.

---

### NGÀY 4: Deploy Production, Seed Prod, E2E Testing & Demo

#### Thành viên 1 (AI / LLM)
- **AI-4.1 | Ổn định AWS LLM & Slide Thuyết trình**
  - Cấu hình `systemd` / `PM2` / Docker `--restart always` cho `ai-service` trên AWS; kiểm tra chi phí Bedrock trong Billing trước buổi demo.
  - Tổng hợp sơ đồ kiến trúc AI + bảng số liệu Benchmark cho slide MoMo TechDays.

#### Thành viên 2 (Fullstack: Deploy Backend & Frontend)
- **W2-4.1 | Deploy Production**
  - Deploy `backend/` lên Render / Railway / AWS EC2 (cấu hình đủ `.env` Production: `MONGODB_URI`, `AWS_LLM_API_URL`, `CLIENT_URL`, `JWT_SECRET`).
  - Deploy `frontend/` lên Vercel / Netlify (cấu hình `VITE_API_URL`, `VITE_SOCKET_URL` trỏ về Backend Production).
  - *Kết quả:* Truy cập URL Frontend Production, đăng nhập và chat realtime ổn định qua HTTPS/WSS.

#### Thành viên 3 (Fullstack: Seed Prod & E2E Testing)
- **W3-4.1 | Seed Production & Kiểm thử E2E (`TC-01` đến `TC-06`)** (`docs/testing-seed-spec.md`)
  - Chạy `seedDemo.js` trỏ vào MongoDB Atlas Production.
  - Kiểm thử toàn bộ `TC-01` đến `TC-06` trên URL Production thật; quay video demo dự phòng và chốt kịch bản trình bày.
