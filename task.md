# Phân chia công việc dự án ScamGuard Chat (4 Ngày - Nhóm 3 người)

**Cơ cấu nhân sự (Chia theo chức năng dọc - Fullstack):**
- **Thành viên 1 (AI / LLM Engineer):** Phụ trách mô hình Custom LLM chống lừa đảo, chuẩn bị dữ liệu/prompt, dựng API service cho LLM và triển khai lên **AWS**.
- **Thành viên 2 (Fullstack — Hạ tầng DB, Auth, Chat, VietQR, Safety/Admin & Deploy):** Phụ trách khởi tạo MongoDB Atlas, Auth, Chat 1-1 & VietQR, Báo cáo/Chặn/Admin, và **Deploy Backend/Frontend**.
- **Thành viên 3 (Fullstack — Link Analyzer, Scam Check, 3 Câu hỏi, Seed & E2E Test):** Phụ trách Link Analyzer, tích hợp AWS LLM, Luồng Kiểm tra lừa đảo & 3 câu hỏi làm rõ, Lịch sử, **`seedDemo.js`** và **Kiểm thử E2E trên môi trường Deploy**.

---

## Lộ trình nước rút 4 Ngày

| Ngày | Mục tiêu chính | Thành viên 1 (AI / LLM - AWS) | Thành viên 2 (Fullstack: DB, Chat, VietQR, Safety & Deploy) | Thành viên 3 (Fullstack: Link, Scam Check, Seed & Test) |
|---|---|---|---|---|
| **Ngày 1** | **Khởi tạo DB, Hạ tầng & Core** | Tổng hợp kịch bản lừa đảo VN; chốt JSON Input/Output Contract; dựng FastAPI/vLLM wrapper nhận Text thuần. | **Tạo MongoDB Atlas Cluster** (user, network access, `.env`); setup `server/` & `client/`; làm xong **Auth** (API + UI) & khung **Chat 1-1 Socket.IO**. | Tạo Mongoose Schemas (`ScamCheck`, `Blacklist`, `Report`); dựng Layout chính theo `docs/theme.md`; viết **`linkAnalyzer.service.js`** (Heuristic + Safe Browsing fallback). |
| **Ngày 2** | **VietQR, AWS LLM & Scam Check** | **Deploy Custom LLM Service lên AWS** (EC2/ECS, mở endpoint `POST /analyze`, xác thực `X-API-Key`); kiểm tra latency & chuẩn JSON. | Hoàn thiện Chat 1-1 realtime, Upload ảnh + **Parser VietQR/EMVCo** (BIDV, MB, VCB...) và UI hiển thị thẻ tóm tắt QR. | Tích hợp gọi **AWS LLM** (chống Prompt Injection), API `POST /api/scam-check/analyze`, UI nút **"Kiểm tra lừa đảo"**, Privacy Modal & Result Modal. |
| **Ngày 3** | **Làm rõ, Safety, Admin & Seed** | Tinh chỉnh model/prompt cho vùng lưng chừng (30–69đ) & ca an toàn; chạy **Benchmark** 15–20 mẫu đo độ chính xác. | Làm trọn gói **Báo cáo, Chặn** (chặn Socket), tự động cập nhật **Blacklist**, trang **Mẹo phòng chống** & **Admin Dashboard** đơn giản. | Làm trọn gói **3 câu hỏi làm rõ** (API `/clarify` + bảng trọng số + UI Stepper), Feedback Đúng/Sai, **Lịch sử kiểm tra** & viết **`seedDemo.js`**. |
| **Ngày 4** | **Deploy, Seed Prod & E2E Demo** | Cấu hình AWS LLM tự khởi động lại (Docker/systemd/PM2) khi lỗi; chốt số liệu & sơ đồ AI cho slide **MoMo TechDays**. | **Deploy Backend** (AWS EC2 / Render / Railway) & **Deploy Frontend** (Vercel / Netlify); cấu hình CORS, SSL, biến môi trường Production. | Chạy **`seedDemo.js` lên MongoDB Production**; test toàn bộ **6 Test Case E2E (`TC-01`–`TC-06`)** trên URL thật; quay video demo dự phòng. |

---

## Chi tiết đầu việc & Checklist theo Thành viên

### 1. Thành viên 1 — AI / LLM Engineer (AWS)
- [ ] **Dữ liệu & Prompt:** Chuẩn bị mẫu hội thoại lừa đảo tại VN (giả danh MoMo/ngân hàng/công an, tuyển CTV, đầu tư, tình cảm, shipper) + hội thoại an toàn; thiết lập System Prompt bọc `<CONVERSATION_DATA>` chống Prompt Injection.
- [ ] **API Wrapper & Deploy AWS:** Dựng server FastAPI/vLLM trên **AWS**, mở `POST /analyze` có header `X-API-Key`, đảm bảo output luôn là JSON hợp lệ (`repair_json` fallback).
- [ ] **Đánh giá & Ổn định:** Chạy benchmark 15–20 mẫu, đảm bảo Recall `>= 90%`, False Positive `<= 10%`; cấu hình process manager trên AWS để không bị sập khi demo.

### 2. Thành viên 2 — Fullstack (DB, Chat, VietQR, Safety/Admin & Deploy)
- [ ] **Database & Setup (`docs/architecture-spec.md`, `docs/auth-spec.md`):** Khởi tạo **MongoDB Atlas**, lấy `MONGODB_URI`, tạo indexes (`conversationId`, `Blacklist.value`, `Block` unique); hoàn thiện API + UI Đăng ký/Đăng nhập (`bcrypt` + `JWT`).
- [ ] **Chat 1-1 & VietQR (`docs/chat-spec.md`):** Socket.IO chat 1-1, upload ảnh (`multer`), giải mã QR (`jimp` + `jsqr` + EMVCo TLV cho BIDV, MBBank, VCB...), UI khung chat & thẻ tóm tắt QR.
- [ ] **Safety & Admin (`docs/safety-admin-spec.md`):** API + UI Báo cáo, Chặn (chặn gửi tin qua Socket), tự động gắn cờ `isFlagged`, cảnh báo tự động, trang Mẹo & **Admin Dashboard** (xem user bị report nhiều, duyệt Blacklist).
- [ ] **Triển khai Deploy:** Deploy `server/` (cấu hình `PORT`, `MONGODB_URI`, `AWS_LLM_API_URL`, `CLIENT_URL` cho CORS) và `client/` (`VITE_API_URL`, `VITE_SOCKET_URL`). *(Chỉ làm Practice Mode nếu hoàn thành sớm ở cuối Ngày 3).*

### 3. Thành viên 3 — Fullstack (Link Analyzer, Scam Check, Seed & E2E Test)
- [ ] **Link Analyzer (`docs/ai-scam-detection-spec.md`):** Viết bộ kiểm tra Heuristic (typosquatting, TLD lạ, IP trực tiếp, link rút gọn) + Google Safe Browsing API (fallback).
- [ ] **Scam Check & 3 Câu hỏi (`docs/ai-scam-detection-spec.md`):** Thu thập 30 tin nhắn gần nhất, đối chiếu Blacklist, gọi AWS LLM; API `/clarify` (bảng trọng số cố định), `/feedback`, `/history`; UI Privacy Modal, Result Modal, Stepper 3 câu hỏi, nút "Tôi đã kiểm tra và vẫn muốn tiếp tục" (đếm ngược 3s) & trang Lịch sử.
- [ ] **Seed Data & E2E Testing (`docs/testing-seed-spec.md`):** Viết script `seedDemo.js` (tạo tài khoản `admin`, `demo_user` và 3 kịch bản chuẩn); chạy seed lên MongoDB Atlas Production và kiểm thử thông suốt `TC-01` đến `TC-06` trên bản deploy thật.
