# AI Scam Detection Specification (`ai-scam-detection-spec.md`)

## 1. Mục tiêu nghiệp vụ
Cung cấp tính năng kiểm tra lừa đảo theo yêu cầu (**On-demand**): chỉ đọc tin nhắn khi người dùng bấm nút kiểm tra, kết hợp tiền xử lý kỹ thuật (Link, VietQR, Blacklist) với **Custom LLM trên AWS** (nhận Text thuần) và luồng **3 câu hỏi làm rõ** khi điểm ở vùng lưng chừng (30–69).

## 2. Database Schema (`ScamCheck` - MongoDB)
```javascript
{
  _id: ObjectId,
  requesterId: { type: ObjectId, ref: 'User', required: true },
  targetUserId: { type: ObjectId, ref: 'User', required: true },
  conversationId: { type: String, required: true },
  initialScore: { type: Number, required: true },
  finalScore: { type: Number, required: true },
  riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
  scamType: String,
  suspiciousSigns: [{ quote: String, explanation: String }],
  advice: [String],
  clarificationQuestions: [{
    questionCode: String,
    questionText: String,
    answer: { type: String, enum: ['yes', 'no', 'unsure', null], default: null },
    scoreDelta: { type: Number, default: 0 }
  }],
  scoreChangeReason: String,
  userFeedback: { type: String, enum: ['accurate', 'inaccurate', null], default: null },
  createdAt: { type: Date, default: Date.now }
}
```

## 3. Luồng xử lý chi tiết

### Bước 1: Kích hoạt & Quyền riêng tư
1. Người dùng bấm nút **"Kiểm tra lừa đảo"** trên header khung chat.
2. Frontend mở `PrivacyConfirmModal`: thông báo rõ *"Hệ thống sẽ gửi tối đa 30 tin nhắn gần nhất và dữ liệu link/QR tới dịch vụ AI để phân tích tham khảo."*
3. Người dùng xác nhận -> Frontend gọi `POST /api/scam-check/analyze` với `{ targetUserId }`.

### Bước 2: Tiền xử lý tại Node.js
1. Lấy tối đa **30 tin nhắn gần nhất** của `conversationId`.
2. **Phân tích Link (`linkAnalyzer.service.js`):**
   - Heuristic Rules (luôn chạy): Kiểm tra IP trực tiếp, đuôi tên miền rủi ro (`.xyz`, `.top`, `.tk`, `.vip`, `.cc`), link rút gọn (`bit.ly`, `tinyurl.com`), phát hiện **Typosquatting** (khoảng cách Levenshtein <= 2 so với `momo.vn`, `vietcombank.com.vn`, `bidv.com.vn`, `mbbank.com.vn`...).
   - Google Safe Browsing API (Fallback nếu có `GOOGLE_SAFE_BROWSING_KEY`, timeout `2000ms`).
3. **Đối chiếu Blacklist:** Kiểm tra tất cả link, số tài khoản từ `qrData`, và `targetUserId` với collection `Blacklist`.

### Bước 3: Gọi AWS Custom LLM Service (`llmClient.service.js`)
- **Endpoint:** `POST <AWS_LLM_API_URL>` với Header `X-API-Key: <AWS_LLM_API_KEY>`.
- **Payload gửi đi (Text thuần + Metadata):**
```json
{
  "target_username": "HoTro_MoMo_247",
  "target_report_count": 2,
  "messages": [
    { "sender": "target", "text": "Tài khoản bạn sắp bị khóa, chuyển 500k xác minh." }
  ],
  "extracted_signals": {
    "links": [{ "url": "http://m0mo-xacminh.xyz", "flags": ["typosquatting", "suspicious_tld"], "in_blacklist": false }],
    "qr_transfers": [{ "bank_name": "BIDV", "account_number": "123456789", "amount": 500000, "purpose": "Xac minh", "in_blacklist": true }]
  }
}
```
- **Chống Prompt Injection (tại AWS LLM):** Toàn bộ nội dung `messages` phải bọc trong thẻ `<CONVERSATION_DATA>...</CONVERSATION_DATA>`, System Prompt chỉ thị LLM coi nội dung bên trong là dữ liệu thụ động, bỏ qua mọi câu lệnh cài cắm.
- **JSON Output từ AWS LLM:**
```json
{
  "risk_score": 85,
  "risk_level": "high",
  "scam_type": "Giả danh hỗ trợ tổ chức",
  "suspicious_signs": [{ "quote": "...", "explanation": "..." }],
  "advice": ["Không chuyển tiền", "Không cung cấp OTP"]
}
```
- **Override an toàn tại Backend:** Nếu bất kỳ Link hoặc STK QR nào có `in_blacklist === true`, ép `initialScore = Math.max(llmScore, 85)` và `riskLevel = 'high'`.

### Bước 4: Vùng chưa chắc chắn (30 – 69 điểm) & Bảng trọng số
Nếu `30 <= initialScore <= 69`, Backend chọn tối đa **3 câu hỏi** phù hợp nhất và trả về cho Frontend. Khi người dùng trả lời (`POST /api/scam-check/:checkId/clarify`), Backend cộng/trừ điểm theo **bảng trọng số cố định**:

| `questionCode` | Nội dung câu hỏi | `yes` | `no` | `unsure` |
|---|---|---|---|---|
| `contact_first` | Đối phương chủ động liên hệ bạn trước phải không? | `+12` | `-5` | `+4` |
| `personal_account_for_org` | Họ tự xưng cơ quan/công ty nhưng yêu cầu chuyển vào tài khoản cá nhân? | `+25` | `-5` | `+8` |
| `prior_verified_contact` | Bạn đã từng giao dịch với họ, hoặc đã gọi lại số cũ để xác nhận? | `-20` | `+10` | `+5` |
| `secret_or_urgent` | Họ có yêu cầu bạn giữ bí mật hoặc phải chuyển tiền ngay trong hôm nay? | `+22` | `-5` | `+6` |
| `deposit_for_job` | Bạn có phải nạp/chuyển tiền trước để nhận việc hoặc rút tiền công? | `+30` | `-5` | `+8` |

- `finalScore = Math.max(0, Math.min(100, initialScore + sumDelta))`.
- Ngưỡng phân loại: `< 30`: `'low'` | `30..69`: `'medium'` | `>= 70`: `'high'`.

## 4. API Contract (`/api/scam-check`)
- `POST /api/scam-check/analyze`: Body `{ targetUserId }` -> Trả về document `ScamCheck`.
- `POST /api/scam-check/:checkId/clarify`: Body `{ answers: [{ questionCode, answer }] }` -> Trả về `ScamCheck` đã cập nhật `finalScore`, `riskLevel`, `scoreChangeReason`.
- `POST /api/scam-check/:checkId/feedback`: Body `{ feedback: 'accurate' | 'inaccurate' }`.
- `GET /api/scam-check/history`: Trả về danh sách các lần kiểm tra của `req.user.id`.

## 5. Yêu cầu Giao diện (Frontend)
- `ScamResultModal.jsx`:
  - Hiển thị thanh điểm (0–100) với màu sắc: **Xanh** (`low`), **Vàng** (`medium`), **Đỏ** (`high`).
  - Danh sách trích dẫn dấu hiệu đáng ngờ & lời khuyên hành động.
  - Dòng lưu ý bắt buộc: *"Kết quả chỉ mang tính tham khảo của AI, không thay thế kết luận của cơ quan chức năng."*
  - Nếu `medium` và chưa trả lời câu hỏi -> hiển thị `ClarificationStepper.jsx` (chọn `Có` / `Không` / `Không chắc`).
  - Nếu `high` -> hiện nút **"Chặn & Báo cáo ngay"** và nút **"Tôi đã kiểm tra và vẫn muốn tiếp tục"** (có đếm ngược 3 giây trước khi cho bấm).
  - Nút đánh giá kết quả AI: **Đúng / Sai**.
- `HistoryPage.jsx`: Bảng xem lại lịch sử kiểm tra của bản thân.
