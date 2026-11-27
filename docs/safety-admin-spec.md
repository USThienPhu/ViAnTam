# Safety, Moderation & Admin Specification (`safety-admin-spec.md`)

## 1. Mục tiêu nghiệp vụ
Cung cấp các công cụ tự bảo vệ (Báo cáo, Chặn, Cảnh báo tự động, Mẹo phòng chống) và trang Admin đơn giản để xem tài khoản/STK/link bị báo cáo nhiều lần.

## 2. Database Schemas (`Report`, `Block`, `Blacklist`)

### 2.1. `Report` (`server/src/models/Report.js`)
```javascript
const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, enum: ['impersonation', 'investment_scam', 'job_scam', 'phishing', 'other'], required: true },
  description: { type: String, maxlength: 500, default: '' },
  evidenceMessageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' }
}, { timestamps: true });
```

### 2.2. `Block` (`server/src/models/Block.js`)
```javascript
const blockSchema = new mongoose.Schema({
  blockerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blockedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
```

### 2.3. `Blacklist` (`server/src/models/Blacklist.js`)
```javascript
const blacklistSchema = new mongoose.Schema({
  type: { type: String, enum: ['bank_account', 'link', 'user'], required: true },
  value: { type: String, required: true, index: true },
  bankBin: { type: String, default: '' },
  reportCount: { type: Number, default: 1 },
  status: { type: String, enum: ['pending', 'confirmed', 'dismissed'], default: 'pending' },
  reasonSummary: { type: String, default: '' }
}, { timestamps: true });
```

## 3. API Contract & Quy tắc nghiệp vụ

### 3.1. `POST /api/reports` *(Auth)*
- **Body:** `{ reportedUserId, reason, description, evidenceMessageIds }`
- **Chống spam:** Kiểm tra `Report.exists({ reporterId: req.user.id, reportedUserId })`. Nếu đã từng báo cáo -> `409 Conflict: { message: "Bạn đã báo cáo tài khoản này trước đó." }`.
- **Tự động cập nhật:**
  1. Lưu `Report`.
  2. `User.findByIdAndUpdate(reportedUserId, { $inc: { reportCount: 1 } }, { new: true })`. Nếu `user.reportCount >= 3` -> cập nhật `isFlagged = true` và `io.emit('user_flagged', { userId: reportedUserId })`.
  3. Lấy các `Message` trong `evidenceMessageIds`: với mỗi `extractedLinks` và `qrData.accountNumber`, thực hiện `Blacklist.findOneAndUpdate({ type, value }, { $inc: { reportCount: 1 }, $setOnInsert: { status: 'pending' } }, { upsert: true })`.

### 3.2. `POST /api/blocks` & `DELETE /api/blocks/:targetUserId` *(Auth)*
- `POST`: Body `{ blockedId }` -> Upsert vào `Block` -> `200 OK`.
- `DELETE`: Xóa bản ghi `{ blockerId: req.user.id, blockedId: targetUserId }` -> `200 OK`.

### 3.3. Admin Endpoints (`authMiddleware` + `adminOnly`)
- **`GET /api/admin/overview`:**
  - Trả về `{ flaggedUsers, recentReports, blacklist }`:
    - `flaggedUsers`: Top 50 user có `reportCount > 0`, sort `reportCount: -1`.
    - `recentReports`: 50 report mới nhất, populate `reporterId` (`username`), `reportedUserId` (`username`), `evidenceMessageIds`.
    - `blacklist`: Toàn bộ bản ghi `Blacklist` sort `reportCount: -1`.
- **`PATCH /api/admin/blacklist/:id`:**
  - Body `{ status: 'confirmed' | 'dismissed' }`. Nếu `type === 'user'` và `status === 'confirmed'`, bật `User.isFlagged = true` (hoặc `false` nếu `'dismissed'`).

## 4. Yêu cầu Frontend (`client/`)
- `ReportModal.jsx`: Cho phép chọn lý do (5 mục tiếng Việt), nhập mô tả, và tick chọn tối đa 5 tin nhắn gần nhất làm bằng chứng.
- `AdminPage.jsx`: 2 tab rõ ràng: **Tài khoản bị báo cáo nhiều** (hiện số lần report, trạng thái `isFlagged`) và **Danh sách Blacklist** (STK/Link + nút **Xác nhận** / **Gỡ bỏ**).
- `TipsPage.jsx`: Trình bày 5 thẻ kiến thức phòng chống lừa đảo tại VN (Giả danh Công an/VNeID, Giả danh MoMo/Ngân hàng đòi OTP, Tuyển CTV nạp tiền, Đầu tư lãi khủng, Mã QR giả mạo).
