# AI Scam Detection Specification (`ai-scam-detection-spec.md`)

## 1. Mục tiêu nghiệp vụ
Phân tích hội thoại **On-demand** (chỉ đọc tối đa 30 tin nhắn gần nhất khi người dùng bấm **"Kiểm tra lừa đảo"** và xác nhận thông báo quyền riêng tư), kết hợp Link Analyzer + VietQR + Blacklist + AWS Custom LLM + 3 câu hỏi làm rõ.

## 2. Database Schema (`ScamCheck` - MongoDB)
File: `server/src/models/ScamCheck.js`
```javascript
const scamCheckSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  conversationId: { type: String, required: true, index: true },
  initialScore: { type: Number, required: true, min: 0, max: 100 },
  finalScore: { type: Number, required: true, min: 0, max: 100 },
  riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
  scamType: { type: String, default: 'Chưa xác định' },
  suspiciousSigns: [{ quote: String, explanation: String }],
  advice: [{ type: String }],
  clarificationQuestions: [{
    questionCode: String,
    questionText: String,
    answer: { type: String, enum: ['yes', 'no', 'unsure', null], default: null },
    scoreDelta: { type: Number, default: 0 }
  }],
  scoreChangeReason: { type: String, default: '' },
  userFeedback: { type: String, enum: ['accurate', 'inaccurate', null], default: null }
}, { timestamps: true });
```

## 3. Chi tiết Service Tiền xử lý & Gọi AI

### 3.1. `linkAnalyzer.service.js`
- **`analyzeLink(url)`** trả về `{ url, flags: [], safe_browsing_flagged: false }`:
  - `has_ip_host`: `/^https?:\/\/\d{1,3}(\.\d{1,3}){3}/i.test(url)`.
  - `suspicious_tld`: TLD thuộc `['.xyz', '.top', '.tk', '.ml', '.ga', '.cf', '.vip', '.cc']`.
  - `shortened_url`: Host thuộc `['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'bom.so']`.
  - `typosquatting`: Tách domain chính, tính `levenshteinDistance` với `['momo.vn', 'vietcombank.com.vn', 'bidv.com.vn', 'mbbank.com.vn', 'techcombank.com.vn', 'shopee.vn', 'dichvucong.gov.vn']`. Nếu `1 <= distance <= 2` hoặc chứa brand + từ khóa (`-xacminh`, `-login`, `-support`) -> push `'typosquatting'`.
- **Fallback Google Safe Browsing:** Nếu `process.env.GOOGLE_SAFE_BROWSING_KEY` có giá trị, gọi `POST https://safebrowsing.googleapis.com/v4/threatMatches:find` với `timeout: 2000`. Nếu lỗi/timeout -> bỏ qua, không làm sập luồng.

### 3.2. `llmClient.service.js`
- Gọi `POST ${process.env.AWS_LLM_API_URL}` với Header `X-API-Key: ${process.env.AWS_LLM_API_KEY}`, `timeout: 15000`.
- **Fallback khi AWS LLM lỗi / timeout:** Tự động tính điểm sơ bộ bằng Heuristic (mỗi link có flag `+25đ`, có QR chuyển tiền `+15đ`, trùng Blacklist `+85đ`) và trả về kèm cảnh báo `"Hệ thống AI đang bận, đây là đánh giá nhanh từ bộ lọc kỹ thuật."`.
- **Override an toàn:** Nếu bất kỳ link hoặc STK QR nào có `in_blacklist === true`, ép `initialScore = Math.max(llmScore, 85)` và `riskLevel = 'high'`.

### 3.3. `clarification.service.js` (Vùng 30 – 69 điểm)
- **Bảng trọng số cố định (`WEIGHTS`):**
  - `contact_first`: `{ text: "Đối phương chủ động liên hệ bạn trước phải không?", yes: 12, no: -5, unsure: 4 }`
  - `personal_account_for_org`: `{ text: "Họ tự xưng cơ quan/công ty nhưng yêu cầu chuyển vào tài khoản cá nhân?", yes: 25, no: -5, unsure: 8 }`
  - `prior_verified_contact`: `{ text: "Bạn đã từng giao dịch với họ, hoặc đã gọi lại số cũ để xác nhận?", yes: -20, no: 10, unsure: 5 }`
  - `secret_or_urgent`: `{ text: "Họ có yêu cầu bạn giữ bí mật hoặc phải chuyển tiền ngay trong hôm nay?", yes: 22, no: -5, unsure: 6 }`
  - `deposit_for_job`: `{ text: "Bạn có phải nạp/chuyển tiền trước để được nhận việc hoặc rút tiền công?", yes: 30, no: -5, unsure: 8 }`
- **Chọn tối đa 3 câu:** Nếu có QR chuyển khoản -> ưu tiên `personal_account_for_org`, `contact_first`, `prior_verified_contact`. Nếu `scamType` liên quan việc làm -> ưu tiên `deposit_for_job`, `secret_or_urgent`, `contact_first`.
- **Tính điểm & Lý do:** `finalScore = Math.max(0, Math.min(100, initialScore + sumDelta))`. Sinh chuỗi `scoreChangeReason`: `"Điểm thay đổi từ ${initialScore} thành ${finalScore} dựa trên các câu trả lời xác minh của bạn."`.

## 4. API Contract (`/api/scam-check`) *(Yêu cầu `authMiddleware` + `rateLimit` 10 req/phút)*
- `POST /api/scam-check/analyze`: Body `{ targetUserId }` -> Nếu chưa có tin nhắn nào -> `400 Bad Request`. Thành công -> `200 OK` trả về `ScamCheck`.
- `POST /api/scam-check/:checkId/clarify`: Body `{ answers: [{ questionCode, answer }] }` -> Kiểm tra `check.requesterId === req.user.id` -> Cập nhật `finalScore`, `riskLevel`, `scoreChangeReason` -> `200 OK`.
- `POST /api/scam-check/:checkId/feedback`: Body `{ feedback: 'accurate' | 'inaccurate' }` -> `200 OK`.
- `GET /api/scam-check/history`: Populate `targetUserId` (`username`), sắp xếp `createdAt: -1` -> `200 OK`.
