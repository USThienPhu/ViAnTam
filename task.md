# Phân chia công việc dự án ScamGuard Chat (7 Ngày - Nhóm 3 người)

**Cơ cấu nhân sự:**
- **Thành viên 1 (AI / LLM Engineer):** Phụ trách toàn bộ mô hình Custom LLM chống lừa đảo, chuẩn bị dữ liệu/prompt, dựng API service cho LLM và triển khai lên **AWS**.
- **Thành viên 2 (Backend Developer):** Phụ trách **Node.js (Express + Socket.IO)**, MongoDB (Mongoose), Auth, giải mã VietQR đa ngân hàng, kiểm tra Link, tích hợp gọi AWS LLM, bảng trọng số câu hỏi làm rõ và API Admin.
- **Thành viên 3 (Frontend Developer):** Phụ trách **React + Vite + TailwindCSS**, giao diện Chat 1-1 realtime, luồng Kiểm tra lừa đảo & 3 câu hỏi làm rõ, Báo cáo/Chặn, Lịch sử, trang Mẹo và trang Admin đơn giản.

---

## Tổng quan phân công theo Giai đoạn

| Ngày | Mục tiêu chính | Thành viên 1 (AI / LLM) | Thành viên 2 (Backend) | Thành viên 3 (Frontend) |
|---|---|---|---|---|
| **Ngày 1** | Khởi tạo & Chốt Contract | Chuẩn bị dataset kịch bản lừa đảo VN; chốt JSON Input/Output Contract với BE. | Setup Node.js + Express + Socket.IO + MongoDB Atlas; viết toàn bộ Mongoose Schemas & Auth API (`/register`, `/login`). | Setup React + Vite + TailwindCSS; dựng Layout chính, màn hình Đăng nhập/Đăng ký & khung Chat 1-1 cơ bản. |
| **Ngày 2** | Chat Realtime & VietQR | Xây dựng pipeline Custom LLM (Fine-tune/LoRA hoặc System Prompt + RAG); viết wrapper FastAPI/vLLM nhận Text thuần. | Hoàn thiện Socket.IO chat 1-1; API upload ảnh + tích hợp `jimp`/`jsqr` + **Bộ giải mã VietQR/EMVCo** (hỗ trợ BIDV, MB, VCB...). | Kết nối Socket.IO gửi/nhận tin nhắn realtime; hiển thị tin nhắn text, ảnh và preview dữ liệu QR đính kèm. |
| **Ngày 3** | Tiền xử lý & Kết nối AWS LLM | Deploy Custom LLM Service lên **AWS** (EC2/ECS); mở endpoint `POST /analyze`; test tốc độ & chuẩn JSON output. | Viết module **Phân tích Link (Heuristic + Google Safe Browsing fallback)**; viết service gọi AWS LLM kèm chống Prompt Injection. | Dựng nút **"Kiểm tra lừa đảo"**, Modal xác nhận quyền riêng tư trước khi gửi và trạng thái Loading phân tích. |
| **Ngày 4** | Luồng kết quả & 3 câu hỏi làm rõ | Tinh chỉnh model/prompt cho các ca vùng lưng chừng (30–69 điểm) và ca bình thường để giảm báo nhầm. | Hoàn thiện `POST /api/scam-check/analyze` và `POST /api/scam-check/:id/clarify` với bảng trọng số cố định; lưu `scam_checks`. | Xây dựng Modal/Drawer hiển thị kết quả (Thấp/TB/Cao), trích dẫn bằng chứng, **luồng 3 câu hỏi làm rõ** & nút Feedback Đúng/Sai. |
| **Ngày 5** | Tính năng An toàn & Admin | Tạo bộ **Test Benchmark** (15–20 kịch bản lừa đảo, lưng chừng, an toàn) để đo độ chính xác và điều chỉnh ngưỡng điểm. | API Báo cáo (`reports`), Chặn (`blocks` - chặn Socket), tự động cập nhật `blacklist`, API **Admin** xem tài khoản bị báo cáo nhiều. | UI Báo cáo (chọn lý do + tin nhắn bằng chứng), Chặn người dùng, nhãn cảnh báo tự động, trang Lịch sử, Mẹo & **Admin Dashboard**. |
| **Ngày 6** | Seed Data & Tích hợp E2E | Stress test AWS LLM endpoint; xử lý edge case (tin nhắn dài, prompt injection, trả về thiếu field JSON). | Tạo script Seed Data (3 kịch bản demo chuẩn cho BGK + tài khoản Admin); chừa sẵn interface `ChatPartner` cho Practice Mode. | Kiểm thử toàn luồng giao diện, responsive, thông báo lỗi/loading mượt mà; *(Làm UI Practice Mode nếu còn dư thời gian)*. |
| **Ngày 7** | Hoàn thiện & Demo | Chốt số liệu đánh giá model, vẽ sơ đồ luồng AI cho slide thuyết trình MoMo TechDays. | Deploy/ổn định Backend & MongoDB Atlas; kiểm tra bảo mật (`.env`, rate limit, CORS). | E2E Testing cùng BE & AI; quay video dự phòng & hoàn thiện kịch bản demo trực tiếp. |

---

## Chi tiết đầu việc theo từng Thành viên (Checklist)

### 1. Thành viên 1 — AI / LLM Engineer (AWS)
- [ ] **Dữ liệu & Kịch bản:** Tổng hợp mẫu hội thoại lừa đảo đặc trưng ở Việt Nam (giả danh công an/VNeID, giả danh hỗ trợ MoMo/ngân hàng lấy OTP, tuyển CTV online nạp tiền, đầu tư lãi cao, tình cảm vay tiền, shipper giao hàng) + hội thoại an toàn (chuyển tiền trả trọ, mua bán bình thường).
- [ ] **Xây dựng Custom LLM:** Huấn luyện/tinh chỉnh mô hình (hoặc xây dựng pipeline chuyên biệt cho domain chống lừa đảo) nhận đầu vào là **Text thuần** (gồm tin nhắn + metadata Link/VietQR/Blacklist).
- [ ] **Chống Prompt Injection:** Thiết lập System Prompt cô lập dữ liệu hội thoại trong thẻ `<CONVERSATION_DATA>`, đảm bảo mô hình luôn trả về đúng định dạng JSON hợp lệ.
- [ ] **API Wrapper & Deploy AWS:** Dựng server FastAPI (hoặc vLLM/Ollama) trên AWS, mở endpoint `POST /analyze` có xác thực bằng `X-API-Key` nội bộ.
- [ ] **Đánh giá (Evaluation):** Chạy kiểm thử trên tập 20 mẫu hội thoại, đo tỷ lệ phát hiện đúng và tỷ lệ báo nhầm trước ngày demo.

### 2. Thành viên 2 — Backend Developer (Node.js + MongoDB)
- [ ] **Core & Auth:** Setup Express, Socket.IO, kết nối MongoDB Atlas qua Mongoose; viết API Đăng ký/Đăng nhập (`bcrypt` + `JWT`) và middleware phân quyền `user`/`admin`.
- [ ] **Chat & Upload:** Xử lý phòng chat 1-1 qua Socket.IO (kiểm tra bảng `blocks` trước khi cho phép gửi tin); API upload ảnh (`multer`), kiểm tra dung lượng/định dạng.
- [ ] **VietQR Parser:** Dùng `jimp` + `jsqr` đọc mã QR từ ảnh upload -> viết bộ giải mã chuẩn EMVCo TLV (Tag 38, Tag 54, Tag 62) + bảng tra cứu mã BIN ngân hàng VN (`970418` BIDV, `970422` MBBank, `970436` Vietcombank...).
- [ ] **Link Analyzer:** Viết hàm kiểm tra Heuristic (typosquatting, TLD lạ, IP trực tiếp, link rút gọn) + tích hợp Google Safe Browsing API (fallback).
- [ ] **Scam Check Orchestrator:** Thu thập 20–30 tin nhắn gần nhất, đối chiếu `blacklist`, gọi AWS LLM API, xử lý lỗi/timeout, áp dụng bảng trọng số cố định cho 3 câu hỏi làm rõ.
- [ ] **Safety & Admin:** API Report (tự động tăng `reportCount` và gắn cờ nếu `>= 3`), API Block, API Admin lấy danh sách user/STK/link bị report nhiều và xác nhận `blacklist`.
- [ ] **Seed Data:** Tạo sẵn ít nhất 3 cuộc hội thoại mẫu (1 Rủi ro cao, 1 Vùng nghi ngờ 30–69đ, 1 An toàn) và 1 tài khoản Admin.

### 3. Thành viên 3 — Frontend Developer (React + Vite + TailwindCSS)
- [ ] **Auth & Layout:** Trang Đăng nhập / Đăng ký, Sidebar danh sách người dùng (hiển thị badge cảnh báo nếu user `isFlagged`), thanh điều hướng (Chat, Lịch sử, Mẹo phòng chống, Admin).
- [ ] **Chat 1-1 Realtime:** Khung chat hiển thị tin nhắn văn bản, ảnh QR (kèm thẻ tóm tắt thông tin ngân hàng giải mã được nếu có), trạng thái bị chặn không thể nhắn tin.
- [ ] **Luồng Kiểm tra lừa đảo:**
  - Nút **"Kiểm tra lừa đảo"** trên header khung chat.
  - Modal xác nhận quyền riêng tư trước khi gửi hội thoại sang AI.
  - Drawer/Modal hiển thị kết quả: Điểm rủi ro (0–100), thanh mức độ (Xanh/Vàng/Đỏ), trích dẫn tin nhắn vi phạm, lời khuyên.
- [ ] **Luồng 3 câu hỏi làm rõ:** Hiển thị khi điểm từ 30–69, cho phép bấm nhanh `Có` / `Không` / `Không chắc`, cập nhật điểm và lý do thay đổi theo thời gian thực.
- [ ] **Hành động sau kiểm tra:** Nút **Chặn & Báo cáo**, nút **Tôi đã kiểm tra và vẫn muốn tiếp tục** (kèm đếm ngược ngắn 3–5 giây), nút đánh giá AI **Đúng / Sai**.
- [ ] **Trang phụ & Admin:** Trang Lịch sử kiểm tra, trang Mẹo phòng chống lừa đảo, và trang **Admin Dashboard** (bảng danh sách tài khoản/STK/link bị báo cáo nhiều kèm nút xác nhận Blacklist).
