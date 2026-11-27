# ScamGuard Chat: Web nhắn tin tích hợp AI phát hiện lừa đảo

## 1. Giới thiệu

ScamGuard Chat là một nền tảng web nhắn tin demo tích hợp AI phòng chống lừa đảo trực tuyến (dự án tham gia **MoMo TechDays**). Phần nhắn tin được giữ ở mức gọn nhẹ để tập trung vào trọng tâm của dự án: **xây dựng mô hình AI (Custom LLM) nhận diện lừa đảo** và các công cụ bảo vệ người dùng đi kèm (giải mã VietQR đa ngân hàng, phân tích link, hỏi làm rõ, cảnh báo, chặn và báo cáo tài khoản).

Khi nghi ngờ một cuộc trò chuyện, người dùng chủ động bấm **"Kiểm tra lừa đảo"**. Hệ thống chỉ đọc tin nhắn tại thời điểm người dùng yêu cầu, tiền xử lý các tín hiệu kỹ thuật (Link, mã VietQR, Blacklist) và gửi sang mô hình LLM để trả về mức độ rủi ro, dấu hiệu đáng ngờ và lời khuyên hành động. Kết quả chỉ mang tính tham khảo, không khẳng định chắc chắn một người là kẻ lừa đảo.

## 2. Mục tiêu

- Xây dựng **Custom LLM riêng** chuyên sâu về domain chống lừa đảo tại Việt Nam, triển khai trên **AWS**.
- Kết hợp đa tín hiệu (văn bản hội thoại, đường link, tên người dùng, mã QR chuyển khoản VietQR) thay vì chỉ đọc văn bản đơn thuần.
- Cung cấp công cụ tự bảo vệ đầy đủ: hỏi làm rõ khi nghi ngờ, cảnh báo tự động, báo cáo, chặn, và trang quản trị theo dõi tài khoản bị báo cáo nhiều lần.
- Thiết kế kiến trúc chuẩn để thực hiện **AI-Driven Development**, có sẵn bộ tài liệu đặc tả (`docs/spec.md`), bảng Use Case (`use_case.md`) và phân chia công việc 7 ngày (`task.md`) cho nhóm 3 người.

## 3. Phạm vi

**Làm (MVP hoàn chỉnh trong 7 ngày)**
- Đăng ký, đăng nhập (JWT + bcrypt).
- Chat 1-1 realtime (văn bản và ảnh chứa mã QR).
- Module AI phát hiện lừa đảo (Mục 4) và các tính năng an toàn (Mục 5).
- Trang Quản trị (Admin) đơn giản để xem danh sách tài khoản/số tài khoản/link bị báo cáo nhiều lần và quản lý Blacklist.

**Không làm**
- Chat nhóm, gọi thoại/video, mã hóa đầu cuối, ứng dụng di động native.

**Mở rộng (làm nếu còn dư thời gian, thiết kế sẵn interface)**
- Chế độ luyện tập nhận biết lừa đảo với chatbot mô phỏng (Mục 12).

## 4. Tính năng AI phát hiện lừa đảo

Người dùng chọn một cuộc hội thoại và bấm **"Kiểm tra lừa đảo"**. Hệ thống thực hiện phân tích các yếu tố sau:

| Yếu tố | Nội dung phân tích |
|---|---|
| Nội dung hội thoại | Kịch bản lừa đảo phổ biến tại VN: tạo áp lực thời gian, hứa lãi suất cao, giả danh ngân hàng/ví điện tử/công an/shipper, yêu cầu OTP, mời đầu tư, tuyển CTV online, tình cảm rồi vay tiền. |
| Đường link | **Heuristic nội bộ + Fallback Google Safe Browsing API**: phát hiện tên miền giả mạo (typosquatting như `m0mo.vn`), link rút gọn (`bit.ly`, `tinyurl`), tên miền mới/đuôi rủi ro (`.xyz`, `.top`, `.tk`), link IP trực tiếp. |
| Tên người dùng | Giả danh tổ chức/nhân viên hỗ trợ, ký tự lạ, tài khoản có lịch sử bị báo cáo nhiều lần. |
| Mã QR chuyển tiền | Giải mã chuẩn **EMVCo / VietQR** (hỗ trợ tất cả ngân hàng VN như **BIDV, MBBank, Vietcombank, Techcombank, ACB, MoMo...** thông qua mã BIN). Trích xuất ngân hàng, số tài khoản, số tiền, nội dung chuyển khoản và đối chiếu `blacklist`. |

**Kết quả trả về**
- Mức rủi ro: **Thấp** (< 30) / **Trung bình** (30 – 69) / **Cao** (>= 70 hoặc trúng Blacklist).
- Điểm rủi ro (0 đến 100).
- Danh sách dấu hiệu đáng ngờ, kèm trích dẫn đoạn tin nhắn liên quan.
- Loại lừa đảo nghi ngờ (đầu tư, giả danh, việc làm online, tình cảm, phishing...).
- Lời khuyên hành động cụ thể + Nút hành động nhanh (**Chặn người dùng**, **Báo cáo**, hoặc **Tôi đã kiểm tra và vẫn muốn tiếp tục**).
- Dòng lưu ý: đây là đánh giá tham khảo của AI.

### 4.1. Câu hỏi làm rõ khi chưa chắc chắn (Điểm 30 – 69)

Khi điểm rủi ro nằm ở vùng lưng chừng (30 đến 69), AI không kết luận ngay mà gợi ý tối đa **3 câu hỏi trắc nghiệm** (`Có` / `Không` / `Không chắc`) để thu thập thêm dữ kiện và giảm báo nhầm người tốt.

- Chỉ hỏi ở vùng chưa chắc chắn (30–69). Điểm >= 70 hoặc trúng Blacklist sẽ cảnh báo đỏ ngay; điểm < 30 kết luận an toàn.
- Hỏi về sự kiện kiểm chứng được (ví dụ: *"Họ có tự xưng cơ quan/công ty nhưng yêu cầu chuyển vào tài khoản cá nhân?"*, *"Bạn có phải nạp tiền trước để nhận việc?"*).
- Mỗi câu trả lời cộng/trừ một lượng điểm cố định theo **bảng trọng số tại Backend** (không để LLM tự quyết định) và hiển thị lý do thay đổi điểm minh bạch.

## 5. Tính năng an toàn & Quản trị

- **Báo cáo tài khoản (`reports`):** chọn lý do, mô tả, đính kèm tin nhắn làm bằng chứng.
- **Chặn người dùng (`blocks`):** người bị chặn không thể gửi tin nhắn mới qua Socket.IO.
- **Cảnh báo tự động:** hiển thị nhãn cảnh báo trên tài khoản bị báo cáo nhiều lần (`reportCount >= 3`), hoặc khi tin nhắn chứa link/QR nằm trong `blacklist`.
- **Trang Admin đơn giản:** xem danh sách các tài khoản/link/STK bị báo cáo nhiều lần, chi tiết bằng chứng và xác nhận đưa vào `blacklist` chính thức.
- **Lịch sử kiểm tra & Phản hồi AI:** xem lại các lần kiểm tra và bấm **Đúng / Sai** để thu thập dữ liệu cải thiện Custom LLM.
- **Mẹo phòng chống lừa đảo:** trang hướng dẫn nhận biết các hình thức lừa đảo phổ biến.

## 6. Luồng hoạt động của AI

```text
Người dùng bấm "Kiểm tra lừa đảo" (xác nhận thông báo quyền riêng tư)
        |
        v
Backend Node.js thu thập: 20-30 tin nhắn gần nhất, link, thông tin đối phương, ảnh QR
        |
        v
Tiền xử lý tại Node.js
  - Trích xuất link & chạy Heuristic + Google Safe Browsing (fallback)
  - Giải mã ảnh QR (jimp + jsqr) -> Parse chuẩn VietQR/EMVCo (BIDV, MB, VCB...)
  - Đối chiếu MongoDB blacklist & số lần bị báo cáo
        |
        v
Gửi Text Payload chuẩn hóa sang AWS Custom LLM Service (FastAPI / vLLM)
        |
        v
AWS LLM trả về JSON: risk_score, risk_level, suspicious_signs, scam_type, advice
        |
        v
Điểm ở vùng chưa chắc chắn (30 đến 69)?
  - Có: Trả về tối đa 3 câu hỏi làm rõ -> User trả lời -> Cộng/trừ trọng số cố định
  - Không: Hiển thị kết luận ngay (An toàn hoặc Cảnh báo đỏ + Chặn/Báo cáo)
        |
        v
Lưu lịch sử vào MongoDB (scam_checks)
```

## 7. Kiến trúc & Công nghệ chính

| Thành phần | Công nghệ đã chốt |
|---|---|
| **Frontend** | React + Vite + TailwindCSS (`socket.io-client`, `axios`, `lucide-react`) |
| **Backend** | Node.js + Express + Socket.IO |
| **Cơ sở dữ liệu** | **MongoDB** (Mongoose + MongoDB Atlas) |
| **AI / LLM** | **Custom LLM** domain chống lừa đảo, nhận đầu vào Text thuần, triển khai trên **AWS** (FastAPI / vLLM) |
| **Đọc mã QR** | `jimp` + `jsqr` + Bộ parser EMVCo/VietQR (hỗ trợ mọi ngân hàng VN) |
| **Kiểm tra link** | Bộ luật Heuristic nội bộ + Fallback Google Safe Browsing API |

## 8. Cấu trúc dữ liệu chính (MongoDB Collections)

- `users`: `_id`, `username`, `passwordHash`, `role` (`user`/`admin`), `reportCount`, `isFlagged`, `isSimulatorBot`, `createdAt`.
- `messages`: `_id`, `conversationId`, `senderId`, `receiverId`, `type` (`text`/`image`), `content`, `imageUrl`, `extractedLinks`, `qrData` (object VietQR), `createdAt`.
- `reports`: `_id`, `reporterId`, `reportedUserId`, `reason`, `description`, `evidenceMessageIds`, `status`, `createdAt`.
- `blocks`: `_id`, `blockerId`, `blockedId`, `createdAt`.
- `blacklist`: `_id`, `type` (`bank_account`/`link`/`user`), `value`, `bankBin`, `reportCount`, `status`, `reasonSummary`, `updatedAt`.
- `scam_checks`: `_id`, `requesterId`, `targetUserId`, `conversationId`, `initialScore`, `finalScore`, `riskLevel`, `scamType`, `suspiciousSigns`, `advice`, `clarificationQuestions`, `userFeedback`, `createdAt`.
- `practice_sessions` *(mở rộng)*: `_id`, `userId`, `scenarioId`, `userGuess`, `actualLabel`, `turnsCount`, `createdAt`.

## 9. Quyền riêng tư và bảo mật

- **Chỉ đọc khi được bấm:** Tuyệt đối không quét ngầm tin nhắn. Chỉ phân tích khi người dùng chủ động bấm "Kiểm tra lừa đảo".
- Hiện thông báo xác nhận trước khi gửi dữ liệu hội thoại tới AWS LLM.
- Chỉ gửi tối đa 20–30 tin nhắn gần nhất, không gửi mật khẩu hay token.
- Mật khẩu băm bằng `bcrypt`, xác thực bằng `JWT`, API key và DB URI lưu trong `.env`.
- Kiểm tra loại và dung lượng ảnh tải lên; giới hạn tần suất (rate limit) gọi AI.
- **Chống Prompt Injection:** Tin nhắn chat được bọc trong thẻ phân cách dữ liệu (`<CONVERSATION_DATA>`) để LLM không thực thi các câu lệnh giả mạo do kẻ lừa đảo chèn vào tin nhắn.

## 10. Tài liệu dự án & Tổ chức nhóm (3 người - 7 ngày)

Dự án được tổ chức theo hướng **AI-Driven Development** với các tài liệu đi kèm:
- [`docs/spec.md`](docs/spec.md): Đặc tả kỹ thuật toàn diện (Architecture, Schemas, API & LLM Contract, Logic VietQR/Link/Scoring, UI Tree) để sinh code và đồng bộ giữa các thành viên.
- [`use_case.md`](use_case.md): Toàn bộ bảng Use Case và đặc tả chi tiết luồng nghiệp vụ.
- [`task.md`](task.md): Bảng phân chia công việc chi tiết theo 7 ngày cho 3 thành viên (1 AI/LLM + 2 Web/Backend).

## 11. Tính năng mở rộng (làm khi còn thời gian)

Chừa sẵn interface `ChatPartner` và bảng `practice_sessions` trong thiết kế để bổ sung chế độ **Luyện tập nhận biết lừa đảo**:
- Người dùng chọn kịch bản (giả danh công an, đầu tư, việc làm online, bình thường...) và chat thử với chatbot mô phỏng.
- Giao diện có nút **"Khả năng lừa đảo"** / **"Khả năng không lừa đảo"** để người dùng đoán và xem giải thích chi tiết sau khi kết thúc.
