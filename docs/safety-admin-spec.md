# Safety, Moderation & Admin Specification (`safety-admin-spec.md`)

## 1. Mục tiêu nghiệp vụ
Cung cấp các công cụ tự bảo vệ cho người dùng (Báo cáo, Chặn, Cảnh báo tự động, Mẹo phòng chống lừa đảo) và trang Quản trị (Admin) đơn giản để theo dõi các tài khoản/tài nguyên bị báo cáo nhiều lần.

## 2. Database Schemas (MongoDB)

### 2.1. `Report`
```javascript
{
  _id: ObjectId,
  reporterId: { type: ObjectId, ref: 'User', required: true },
  reportedUserId: { type: ObjectId, ref: 'User', required: true },
  reason: { type: String, enum: ['impersonation', 'investment_scam', 'job_scam', 'phishing', 'other'], required: true },
  description: { type: String, maxlength: 500 },
  evidenceMessageIds: [{ type: ObjectId, ref: 'Message' }],
  status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
  createdAt: { type: Date, default: Date.now }
}
```

### 2.2. `Block`
```javascript
{
  _id: ObjectId,
  blockerId: { type: ObjectId, ref: 'User', required: true },
  blockedId: { type: ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
}
// Compound unique index: { blockerId: 1, blockedId: 1 }
```

### 2.3. `Blacklist`
```javascript
{
  _id: ObjectId,
  type: { type: String, enum: ['bank_account', 'link', 'user'], required: true },
  value: { type: String, required: true, index: true }, // STK, domain/url, hoặc userId
  bankBin: String,
  reportCount: { type: Number, default: 1 },
  status: { type: String, enum: ['pending', 'confirmed'], default: 'pending' },
  reasonSummary: String,
  updatedAt: { type: Date, default: Date.now }
}
```

## 3. Quy tắc nghiệp vụ
1. **Tự động gắn cờ & Blacklist khi Báo cáo:**
   - Khi nhận `POST /api/reports`, kiểm tra tránh 1 người báo cáo trùng lặp cùng 1 tài khoản nhiều lần để spam.
   - Tăng `reportCount` của `reportedUserId` thêm 1. Nếu `reportCount >= 3`, tự động đặt `isFlagged = true` và phát sự kiện Socket `user_flagged`.
   - Nếu các tin nhắn bằng chứng (`evidenceMessageIds`) có chứa `extractedLinks` hoặc `qrData.accountNumber`, tự động upsert vào `Blacklist` (tăng `reportCount` lên 1).
2. **Chặn người dùng:**
   - Khi `A` chặn `B`, cả `A` và `B` không thể gửi tin nhắn mới cho nhau qua Socket.IO.
3. **Cảnh báo tự động:**
   - Khi mở khung chat với user có `isFlagged === true`, hiển thị banner cảnh báo vàng/đỏ phía trên khung chat: *"Tài khoản này đã bị nhiều người dùng báo cáo. Hãy thận trọng khi giao dịch."*

## 4. API Contract (`/api/reports`, `/api/blocks`, `/api/admin`)
- `POST /api/reports`: Body `{ reportedUserId, reason, description, evidenceMessageIds }`.
- `POST /api/blocks`: Body `{ blockedId }`.
- `DELETE /api/blocks/:targetUserId`: Bỏ chặn.
- `GET /api/admin/overview` *(Yêu cầu `adminOnly`)*:
  - Trả về:
    - `flaggedUsers`: Danh sách user có `reportCount > 0` (sắp xếp `reportCount` giảm dần).
    - `reports`: Danh sách các báo cáo gần nhất kèm `reporter`, `reportedUser`, `evidenceMessageIds`.
    - `blacklist`: Danh sách STK / Link / User trong `Blacklist`.
- `PATCH /api/admin/blacklist/:id` *(Yêu cầu `adminOnly`)*:
  - Body `{ status: 'confirmed' | 'dismissed' }` để Admin duyệt hoặc gỡ khỏi danh sách đen.

## 5. Yêu cầu Giao diện (Frontend)
- `ReportModal.jsx`: Form chọn lý do, mô tả ngắn và tick chọn các tin nhắn làm bằng chứng.
- `TipsPage.jsx`: Trang tĩnh trình bày các chiêu trò lừa đảo phổ biến tại Việt Nam (giả danh công an, việc làm online, đầu tư lãi cao, phishing OTP, QR giả mạo) và nguyên tắc phòng tránh.
- `AdminPage.jsx`: Giao diện 2 tab đơn giản: **Tài khoản bị báo cáo nhiều** và **Danh sách Blacklist (STK/Link)**, có nút **Xác nhận Blacklist** / **Gỡ bỏ**.
