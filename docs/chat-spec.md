# Chat 1-1 & VietQR Specification (`chat-spec.md`)

## 1. Mục tiêu nghiệp vụ
Xây dựng tính năng nhắn tin 1-1 theo thời gian thực (văn bản và ảnh), tự động giải mã mã QR chuyển khoản (chuẩn VietQR/EMVCo cho tất cả các ngân hàng tại Việt Nam) ngay khi gửi ảnh để phục vụ hiển thị và làm dữ kiện cho AI kiểm tra lừa đảo.

## 2. Database Schema (`Message` - MongoDB)
```javascript
{
  _id: ObjectId,
  conversationId: { type: String, required: true, index: true }, // format: [id1, id2].sort().join('_')
  senderId: { type: ObjectId, ref: 'User', required: true },
  receiverId: { type: ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'image'], default: 'text' },
  content: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  extractedLinks: [{ type: String }], // Tự động trích xuất bằng regex URL khi lưu tin nhắn
  qrData: {
    raw: String,
    isVietQR: Boolean,
    bankBin: String,
    bankName: String,
    accountNumber: String,
    amount: Number,
    purpose: String
  },
  createdAt: { type: Date, default: Date.now }
}
```

## 3. API & Socket.IO Contract

### 3.1. REST Endpoints
- `GET /api/messages/:targetUserId`: Lấy toàn bộ lịch sử tin nhắn giữa `req.user.id` và `targetUserId` (sắp xếp theo `createdAt` tăng dần).
- `POST /api/messages/upload`:
  - Nhận `multipart/form-data` (field `image`). Giới hạn định dạng `jpg/jpeg/png/webp`, dung lượng tối đa `5MB`.
  - Backend chạy `qrParser.service.js` ngay trên file vừa upload.
  - Trả về: `{ imageUrl, qrData, extractedLinks }`.

### 3.2. Socket.IO Events
- **Kết nối & Xác thực:** Client gửi `token` qua `socket.handshake.auth.token`. Server verify JWT và cho socket join room `user_<userId>`.
- **`send_message` (Client -> Server):**
  - Payload: `{ receiverId, type, content, imageUrl, qrData }`
  - Logic Server:
    1. Kiểm tra bảng `Block` (nếu 1 trong 2 bên đã chặn nhau -> emit `message_error` `{ message: "Không thể gửi tin nhắn do cuộc trò chuyện đã bị chặn." }` và dừng).
    2. Trích xuất URL từ `content` (và từ `qrData.raw` nếu QR là link web).
    3. Lưu `Message` vào MongoDB.
    4. Emit `receive_message` tới room `user_<senderId>` và `user_<receiverId>`.

## 4. Giải mã VietQR đa ngân hàng (`qrParser.service.js`)
- Dùng `jimp` đọc ảnh và `jsqr` để lấy chuỗi ký tự QR raw.
- Nếu chuỗi bắt đầu bằng `http://` hoặc `https://` -> lưu vào `extractedLinks` (QR chứa link web).
- Nếu chuỗi bắt đầu bằng `000201` (chuẩn **EMVCo / NAPAS VietQR** dùng chung cho BIDV, MBBank, Vietcombank, Techcombank, ACB, MoMo...):
  - Parse theo cấu trúc TLV (`Tag 2 ký tự + Length 2 ký tự + Value`).
  - **Tag `38`:** Parse tiếp TLV con -> Tag `01` -> Tag `00` lấy **Mã BIN ngân hàng** (6 chữ số), Tag `01` lấy **Số tài khoản người nhận**.
  - Tra cứu `bankBin` trong `server/src/config/bankBins.json` (VD: `970418` = BIDV, `970422` = MBBank, `970436` = Vietcombank, `970407` = Techcombank, `970416` = ACB...).
  - **Tag `54`:** Lấy số tiền (nếu có).
  - **Tag `62`:** Parse TLV con -> Tag `08` lấy nội dung chuyển khoản.

## 5. Điểm mở rộng cho Practice Mode (`chatPartner.interface.js`)
- Tách logic gửi/nhận của đối phương qua interface `ChatPartner`:
  - `HumanPartner`: Giao tiếp qua Socket.IO bình thường.
  - `SimulatorBotPartner` *(mở rộng)*: Khi `receiver.isSimulatorBot === true`, `send_message` sẽ chuyển qua `SimulatorService` để sinh câu trả lời tự động thay vì chờ người thật.

## 6. Yêu cầu Giao diện (Frontend)
- `ChatPage.jsx`: Sidebar danh sách user bên trái (kèm badge cảnh báo đỏ nếu `isFlagged === true` hoặc nhãn `Đã chặn`), khung chat bên phải.
- `ChatWindow.jsx`: Header hiển thị tên đối phương, nút **"Kiểm tra lừa đảo"**, nút **Báo cáo**, nút **Chặn/Bỏ chặn**.
- `MessageBubble.jsx`: Nếu tin nhắn là ảnh có `qrData.isVietQR === true`, hiển thị thêm thẻ tóm tắt nhỏ bên dưới ảnh: *Ngân hàng - Số tài khoản - Số tiền*.
- Nếu cuộc hội thoại đang bị chặn, ẩn/khóa ô nhập tin nhắn và hiện thông báo trạng thái chặn.
