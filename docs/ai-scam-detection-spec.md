# AI Scam Detection Specification (`ai-scam-detection-spec.md`)

## 1. Mục tiêu nghiệp vụ
Phân tích hội thoại **On-demand** (chỉ đọc tối đa 30 tin nhắn gần nhất khi người dùng bấm **"Kiểm tra lừa đảo"** và xác nhận thông báo quyền riêng tư), kết hợp Link Analyzer + VietQR + Blacklist + AWS LLM (Amazon Bedrock, xem `aws-llm-service-spec.md`) + 3 câu hỏi làm rõ.

## 2. Database Schema (`ScamCheck` - MongoDB)
File: `backend/src/models/ScamCheck.js`
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
  analysisSource: { type: String, enum: ['llm', 'heuristic'], default: 'llm' }, // 'heuristic' khi AWS LLM lỗi/timeout
  userFeedback: { type: String, enum: ['accurate', 'inaccurate', null], default: null }
}, { timestamps: true });
```
- Khi `analysisSource === 'heuristic'`, `ScamResultModal` hiển thị dòng: *"Hệ thống AI đang bận, đây là đánh giá nhanh từ bộ lọc kỹ thuật."*

## 2.1. Quy đổi điểm → mức rủi ro (dùng chung)
`riskLevelFromScore(score)`: `score >= 70` → `'high'`; `30 <= score <= 69` → `'medium'`; `score < 30` → `'low'`. Backend **luôn** tính `riskLevel` bằng hàm này (sau khi có `initialScore` hoặc `finalScore`), không dùng `risk_level` do LLM trả về. Hàm được export từ `llmClient.service.js`.

## 3. Chi tiết Service Tiền xử lý & Gọi AI

### 3.1. `linkAnalyzer.service.js` *(TV1)*
Service **không tự trích xuất link** từ văn bản; danh sách link lấy từ `Message.extractedLinks` (do `chat.socket.js` / upload QR lưu sẵn, xem `chat-spec.md`).

**Hàm export:**
- `normalizeUrl(url) -> string`: trim, bỏ dấu câu ở cuối (`.,;:!?)\]}'"`), hạ chữ thường phần scheme + host, bỏ `/` ở cuối. Dùng chung cho cả việc so khớp `Blacklist` (route và `safety.routes.js` đều lưu/tra `Blacklist.value` bằng giá trị đã normalize).
- `analyzeLink(url) -> Promise<{ url, flags: string[], safe_browsing_flagged: boolean }>` (`url` đã normalize).
- `analyzeLinks(urls: string[]) -> Promise<Array<...>>`: bỏ trùng sau khi normalize, chạy `analyzeLink` song song.

**Các flag:**
- `has_ip_host`: `/^https?:\/\/\d{1,3}(\.\d{1,3}){3}/i.test(url)`.
- `suspicious_tld`: TLD thuộc `['.xyz', '.top', '.tk', '.ml', '.ga', '.cf', '.vip', '.cc']`.
- `shortened_url`: Host thuộc `['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'bom.so']`.
- `typosquatting` — thuật toán:
  1. `host = new URL(url).hostname`, bỏ tiền tố `www.`.
  2. Danh sách chính chủ `OFFICIAL = ['momo.vn', 'vietcombank.com.vn', 'bidv.com.vn', 'mbbank.com.vn', 'techcombank.com.vn', 'shopee.vn', 'dichvucong.gov.vn']`. Nếu `host` bằng hoặc kết thúc bằng `'.' + official` → hợp lệ, **không** gắn flag.
  3. Tách `host` theo `.` và `-`, bỏ phần TLD cuối → danh sách `tokens`. Chuẩn hóa ký tự dễ nhầm trong từng token: `0→o`, `1→l`, `3→e`, `5→s`.
  4. Brand `BRANDS = ['momo', 'vietcombank', 'bidv', 'mbbank', 'techcombank', 'shopee', 'dichvucong']`. Gắn `'typosquatting'` nếu có token mà:
     - bằng đúng một brand (sau chuẩn hóa), **hoặc**
     - `levenshteinDistance(token, brand)` trong khoảng `1..1` với brand dài `< 6` ký tự, `1..2` với brand dài `>= 6` ký tự, **hoặc**
     - `host` chứa brand và một từ khóa `['xacminh', 'xacthuc', 'login', 'support', 'hotro', 'verify']`.
  - Kiểm thử bắt buộc: `http://m0mo-xacminh.xyz` → `['suspicious_tld', 'typosquatting']`; `https://momo.vn`, `https://www.vietcombank.com.vn/abc` → `[]`.
- `levenshteinDistance` tự viết (không thêm thư viện).
- **Fallback Google Safe Browsing:** Nếu `process.env.GOOGLE_SAFE_BROWSING_KEY` có giá trị, gọi `POST https://safebrowsing.googleapis.com/v4/threatMatches:find` bằng `fetch` có sẵn của Node kèm `signal: AbortSignal.timeout(2000)`. Nếu lỗi/timeout -> bỏ qua, không làm sập luồng.

### 3.2. `llmClient.service.js` *(TV1)*
**Hàm export:**
- `riskLevelFromScore(score)` (mục 2.1).
- `analyzeConversation(input) -> Promise<Result>` với:
  ```javascript
  // input (camelCase, do scamCheck.routes.js dựng)
  {
    targetUsername: 'HoTro_MoMo_247',
    targetReportCount: 4,
    messages: [{ sender: 'user' | 'target', text: '...' }],          // tối đa 30 tin, cũ -> mới
    links: [{ url, flags, safe_browsing_flagged, inBlacklist }],     // từ analyzeLinks + tra Blacklist
    qrTransfers: [{ bankName, accountNumber, amount, purpose, inBlacklist }]
  }
  // Result (camelCase, khớp field ScamCheck)
  {
    riskScore: 92, riskLevel: 'high', scamType: '...',
    suspiciousSigns: [{ quote, explanation }], advice: ['...'],
    analysisSource: 'llm' | 'heuristic'
  }
  ```
- `llmClient` tự đổi `input` sang `AnalyzeRequest` (snake_case, xem `aws-llm-service-spec.md` mục 2) và đổi `AnalyzeResponse` về `Result`.

**Gọi AWS:** `POST ${process.env.AWS_LLM_API_URL}` với Header `X-API-Key: ${process.env.AWS_LLM_API_KEY}`, dùng `fetch` + `AbortSignal.timeout(15000)`.

**Fallback Heuristic** (khi `AWS_LLM_API_URL` trống, timeout, lỗi mạng, HTTP khác `200`, hoặc JSON trả về sai schema) → `analysisSource: 'heuristic'`:
- Mỗi link có ít nhất 1 flag hoặc `safe_browsing_flagged`: `+25đ`.
- Có ít nhất 1 QR chuyển khoản: `+15đ`.
- `targetReportCount >= 3`: `+15đ`.
- **Luật từ khóa:** chỉ xét tin của `sender === 'target'`, chuyển chữ thường và bỏ dấu tiếng Việt (`normalize('NFD')` + bỏ dấu, `đ→d`), so khớp **trọn cụm từ** theo ranh giới từ (`\b...\b`) để tránh khớp nhầm (ví dụ `dau tu` không được khớp trong `dau tuan`). Mỗi nhóm chỉ cộng **1 lần**:

  | Nhóm | Từ khóa (không dấu) | Điểm | `scamType` gợi ý |
  |---|---|---|---|
  | `job_deposit` | `ung truoc`, `nap tien`, `nap truoc`, `hoa hong`, `ctv`, `cong tac vien` | `+40` | Lừa đảo tuyển cộng tác viên |
  | `credential` | `otp`, `ma xac nhan`, `mat khau`, `ma xac thuc` | `+35` | Đánh cắp mã OTP / tài khoản |
  | `impersonation` | `cong an`, `vien kiem sat`, `toa an`, `vneid`, `co quan dieu tra` | `+30` | Giả danh cơ quan chức năng |
  | `investment` | `loi nhuan`, `lai suat cao`, `dau tu`, `x2 tai khoan` | `+30` | Lừa đảo đầu tư |
  | `urgent_threat` | `khoa vinh vien`, `bi khoa`, `trong 10 phut`, `ngay lap tuc`, `giu bi mat` | `+20` | — |

- `riskScore = min(100, tổng)`, `scamType` lấy theo nhóm có điểm cao nhất (không có → `'Chưa xác định'`), `suspiciousSigns` trích câu chứa từ khóa đã khớp, `advice` dùng bộ lời khuyên cố định theo mức rủi ro.
- Kết quả mong đợi với seed: `HoTro_MoMo_247` → `>= 70` (sau override); `TuyenDung_CTV_Online` → `40` (vùng 30–69, trả lời `Có` câu `deposit_for_job` → `70`, đạt TC-03); `ChuTro_AnhMinh` → `< 30`.

**Override an toàn (chỉ đặt ở đây, route không làm lại):** Áp dụng cho cả kết quả LLM lẫn Heuristic. Nếu bất kỳ link hoặc STK QR nào có `inBlacklist === true` → `riskScore = Math.max(riskScore, 85)`. Sau cùng luôn gán `riskLevel = riskLevelFromScore(riskScore)`.

### 3.2.1. Luồng `POST /api/scam-check/analyze` *(TV3 — scamCheck.routes.js)*
1. Lấy tối đa 30 tin gần nhất của `conversationId` (không có tin nào → `400`).
2. Đổi mỗi tin thành `{ sender: msg.senderId == req.user.id ? 'user' : 'target', text }`; tin ảnh có `qrData.isVietQR` dùng `text` = `content` hoặc `"[Ảnh QR chuyển khoản]"`.
3. Gom `extractedLinks` → `linkAnalyzer.analyzeLinks()`; tra `Blacklist` (`type: 'link'`, `value` = `normalizeUrl`) để gắn `inBlacklist`.
4. Gom `qrData` có `isVietQR` → tra `Blacklist` (`type: 'bank_account'`, `value: accountNumber`) để gắn `inBlacklist`.
5. Gọi `llmClient.analyzeConversation(...)` → lưu `ScamCheck` với `initialScore = finalScore = riskScore`, `riskLevel`, `analysisSource`, và `clarificationQuestions` (nếu `riskLevel === 'medium'`).

### 3.3. `clarification.service.js` (Vùng 30 – 69 điểm)
- **Bảng trọng số cố định (`WEIGHTS`):**
  - `contact_first`: `{ text: "Đối phương chủ động liên hệ bạn trước phải không?", yes: 12, no: -5, unsure: 4 }`
  - `personal_account_for_org`: `{ text: "Họ tự xưng cơ quan/công ty nhưng yêu cầu chuyển vào tài khoản cá nhân?", yes: 25, no: -5, unsure: 8 }`
  - `prior_verified_contact`: `{ text: "Bạn đã từng giao dịch với họ, hoặc đã gọi lại số cũ để xác nhận?", yes: -20, no: 10, unsure: 5 }`
  - `secret_or_urgent`: `{ text: "Họ có yêu cầu bạn giữ bí mật hoặc phải chuyển tiền ngay trong hôm nay?", yes: 22, no: -5, unsure: 6 }`
  - `deposit_for_job`: `{ text: "Bạn có phải nạp/chuyển tiền trước để được nhận việc hoặc rút tiền công?", yes: 30, no: -5, unsure: 8 }`
- **Chọn tối đa 3 câu:** Nếu có QR chuyển khoản -> ưu tiên `personal_account_for_org`, `contact_first`, `prior_verified_contact`. Nếu `scamType` liên quan việc làm -> ưu tiên `deposit_for_job`, `secret_or_urgent`, `contact_first`.
- **Tính điểm & Lý do:** `finalScore = Math.max(0, Math.min(100, initialScore + sumDelta))`, `riskLevel = riskLevelFromScore(finalScore)`. Sinh chuỗi `scoreChangeReason`: `"Điểm thay đổi từ ${initialScore} thành ${finalScore} dựa trên các câu trả lời xác minh của bạn."`.

## 4. API Contract (`/api/scam-check`) *(Yêu cầu `authMiddleware` + `rateLimit` 10 req/phút)*
- `POST /api/scam-check/analyze`: Body `{ targetUserId }` -> Nếu chưa có tin nhắn nào -> `400 Bad Request`. Thành công -> `200 OK` trả về `ScamCheck`.
- `POST /api/scam-check/:checkId/clarify`: Body `{ answers: [{ questionCode, answer }] }` -> Kiểm tra `check.requesterId === req.user.id` -> Cập nhật `finalScore`, `riskLevel`, `scoreChangeReason` -> `200 OK`.
- `POST /api/scam-check/:checkId/feedback`: Body `{ feedback: 'accurate' | 'inaccurate' }` -> Kiểm tra `check.requesterId === req.user.id` (sai → `404`) -> `200 OK` trả về `ScamCheck` đã cập nhật.
- `GET /api/scam-check/history`: **Chỉ lấy bản ghi của người đang đăng nhập** (`{ requesterId: req.user.id }`), populate `targetUserId` (`username`), sắp xếp `createdAt: -1`, giới hạn `50` bản ghi -> `200 OK` trả về mảng `ScamCheck`.
