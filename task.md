# Phân chia công việc dự án ScamGuard Chat (7 Ngày - Nhóm 3 người)

**Cơ cấu nhân sự (Chia theo chức năng dọc - Fullstack):**
- **Thành viên 1 (AI / LLM Engineer):** Phụ trách toàn bộ mô hình Custom LLM chống lừa đảo, chuẩn bị dữ liệu/prompt, dựng API service cho LLM và triển khai lên **AWS**.
- **Thành viên 2 (Fullstack — Auth, Chat Realtime, VietQR & Safety/Admin):** Phụ trách trọn gói Backend + Frontend cho các chức năng: Đăng nhập/Đăng ký, Chat 1-1 & giải mã VietQR, Báo cáo/Chặn, Blacklist, Trang Mẹo & Admin Dashboard.
- **Thành viên 3 (Fullstack — AI Scam Detection, Link Analyzer & Seed/Test):** Phụ trách trọn gói Backend + Frontend cho các chức năng: Tiền xử lý Link, Kết nối AWS LLM, Luồng Kiểm tra lừa đảo & 3 câu hỏi làm rõ, Lịch sử kiểm tra, Phản hồi AI & Seed Data/E2E Test.

---

## Tổng quan phân công theo Giai đoạn (7 Ngày)

| Ngày | Mục tiêu chính | Thành viên 1 (AI / LLM) | Thành viên 2 (Fullstack: Chat, VietQR & Safety) | Thành viên 3 (Fullstack: Scam Check & Link) |
|---|---|---|---|---|
| **Ngày 1** | Khởi tạo & Chốt Contract | Chuẩn bị dataset kịch bản lừa đảo VN; chốt JSON Input/Output Contract với team Web. | Setup repo `server/` (Express + Socket.IO + MongoDB) & `client/` (React + Vite + Tailwind); làm xong **Auth** (API + UI Đăng nhập/Đăng ký). | Setup các Mongoose Schemas còn lại (`ScamCheck`, `Blacklist`, `Report`); dựng UI khung Layout chính & Navbar. |
| **Ngày 2** | Chat Realtime & VietQR | Xây dựng pipeline Custom LLM (Fine-tune/LoRA hoặc System Prompt + RAG); viết wrapper FastAPI/vLLM nhận Text thuần. | Làm trọn gói **Chat 1-1 Realtime** (Socket.IO + UI khung chat) và Upload ảnh + **Parser VietQR/EMVCo** (BIDV, MB, VCB...). | Viết module **Phân tích Link (Heuristic + Safe Browsing fallback)** và dựng UI nút **"Kiểm tra lừa đảo"** + Modal quyền riêng tư. |
| **Ngày 3** | Kết nối AWS LLM & Scam Check | Deploy Custom LLM Service lên **AWS** (EC2/ECS); mở endpoint `POST /analyze`; test tốc độ & chuẩn JSON output. | Hoàn thiện UI hiển thị ảnh QR (kèm thẻ tóm tắt ngân hàng) và xử lý trạng thái chặn gửi tin qua Socket.IO. | Viết service gọi **AWS LLM** (chống Prompt Injection) + API `POST /api/scam-check/analyze` + UI Loading & Result Modal cơ bản. |
| **Ngày 4** | 3 câu hỏi làm rõ & Trọng số | Tinh chỉnh model/prompt cho các ca vùng lưng chừng (30–69 điểm) và ca bình thường để giảm báo nhầm. | Làm trọn gói **Báo cáo (`reports`) & Chặn (`blocks`)** (API + UI Modal báo cáo, nút Chặn, tự động tăng `reportCount` & gắn cờ). | Làm trọn gói **Luồng 3 câu hỏi làm rõ** (API `/clarify` + bảng trọng số cố định + UI Stepper Có/Không/Không chắc & nút Feedback Đúng/Sai). |
| **Ngày 5** | Admin, Lịch sử & Benchmark | Tạo bộ **Test Benchmark** (15–20 kịch bản lừa đảo, lưng chừng, an toàn) để đo độ chính xác và điều chỉnh ngưỡng điểm. | Làm trọn gói **Admin Dashboard** (API + UI xem tài khoản/STK bị báo cáo nhiều, xác nhận Blacklist) & trang **Mẹo phòng chống**. | Làm trọn gói **Lịch sử kiểm tra** (API `/history` + UI `HistoryPage`) & nút **"Tôi đã kiểm tra và vẫn muốn tiếp tục"** (đếm ngược 3s). |
| **Ngày 6** | Seed Data & Tích hợp E2E | Stress test AWS LLM endpoint; xử lý edge case (tin nhắn dài, prompt injection, trả về thiếu field JSON). | Rà soát UI/UX toàn bộ luồng Chat, cảnh báo tự động (`isFlagged`); *(Chừa sẵn interface `ChatPartner` cho Practice Mode)*. | Viết script **`seedDemo.js`** (3 kịch bản mẫu chuẩn + tài khoản Admin) và chạy kiểm thử 6 Test Case E2E (`TC-01` đến `TC-06`). |
| **Ngày 7** | Hoàn thiện & Demo | Chốt số liệu đánh giá model, vẽ sơ đồ luồng AI cho slide thuyết trình MoMo TechDays. | Deploy/ổn định Backend & Frontend lên môi trường demo; kiểm tra `.env`, CORS, rate limit. | E2E Testing cuối cùng cùng cả nhóm; quay video dự phòng & hoàn thiện kịch bản demo trực tiếp. |

---

## Chi tiết đầu việc theo từng Thành viên (Checklist)

### 1. Thành viên 1 — AI / LLM Engineer (AWS)
- [ ] **Dữ liệu & Kịch bản:** Tổng hợp mẫu hội thoại lừa đảo đặc trưng ở Việt Nam (giả danh công an/VNeID, giả danh hỗ trợ MoMo/ngân hàng lấy OTP, tuyển CTV online nạp tiền, đầu tư lãi cao, tình cảm vay tiền, shipper giao hàng) + hội thoại an toàn.
- [ ] **Xây dựng Custom LLM:** Huấn luyện/tinh chỉnh mô hình nhận đầu vào là **Text thuần** (gồm tin nhắn + metadata Link/VietQR/Blacklist).
- [ ] **Chống Prompt Injection:** Cô lập dữ liệu hội thoại trong thẻ `<CONVERSATION_DATA>`, đảm bảo đầu ra luôn là JSON hợp lệ.
- [ ] **API Wrapper & Deploy AWS:** Dựng server FastAPI/vLLM trên AWS, mở endpoint `POST /analyze` có xác thực `X-API-Key`.
- [ ] **Đánh giá:** Chạy kiểm thử trên tập 20 mẫu hội thoại, đo Recall & False Positive Rate trước ngày demo.

### 2. Thành viên 2 — Fullstack (Auth, Chat Realtime, VietQR & Safety/Admin)
- [ ] **Setup & Auth (`docs/auth-spec.md`):** Khởi tạo `server/` và `client/`, kết nối MongoDB Atlas; hoàn thiện API + UI Đăng ký, Đăng nhập (`bcrypt` + `JWT`).
- [ ] **Chat 1-1 & VietQR (`docs/chat-spec.md`):** Socket.IO chat 1-1, upload ảnh (`multer`), giải mã QR (`jimp` + `jsqr` + EMVCo TLV cho BIDV, MBBank, VCB...), UI khung chat & thẻ tóm tắt QR.
- [ ] **Safety & Admin (`docs/safety-admin-spec.md`):** API + UI Báo cáo, Chặn (chặn gửi tin qua Socket), tự động gắn cờ `isFlagged`, nhãn cảnh báo tự động, trang Mẹo phòng chống & trang Admin Dashboard.

### 3. Thành viên 3 — Fullstack (AI Scam Detection, Link Analyzer & Seed/Test)
- [ ] **Link Analyzer (`docs/ai-scam-detection-spec.md`):** Viết bộ kiểm tra Heuristic (typosquatting, TLD lạ, IP trực tiếp, link rút gọn) + Google Safe Browsing API (fallback).
- [ ] **Scam Check & AWS LLM (`docs/ai-scam-detection-spec.md`):** Thu thập 30 tin nhắn gần nhất, đối chiếu Blacklist, gọi AWS LLM (chống Prompt Injection), UI nút "Kiểm tra lừa đảo" + Privacy Modal + Result Modal.
- [ ] **3 câu hỏi làm rõ & Lịch sử:** API `/clarify` với bảng trọng số cố định, API `/feedback`, `/history` + UI Stepper, đếm ngược 3s cho nút "Tôi đã kiểm tra và vẫn muốn tiếp tục", trang Lịch sử.
- [ ] **Seed & Test (`docs/testing-seed-spec.md`):** Viết `seedDemo.js` (3 ca mẫu chuẩn + tài khoản Admin) và chạy bộ 6 Test Case E2E.
