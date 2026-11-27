# Chat 1-1 & VietQR Specification (`chat-spec.md`)

## 1. Mục tiêu nghiệp vụ
Nhắn tin 1-1 realtime (văn bản và ảnh), tự động giải mã mã QR chuyển khoản (**chuẩn EMVCo / VietQR** cho mọi ngân hàng Việt Nam như BIDV, MBBank, Vietcombank, Techcombank, ACB, MoMo...) ngay khi gửi ảnh.

## 2. Database Schema (`Message` - MongoDB)
File: `server/src/models/Message.js`
```javascript
const messageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, index: true }, // [senderId, receiverId].sort().join('_')
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'image'], default: 'text' },
  content: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  extractedLinks: [{ type: String }],
  qrData: {
    raw: String,
    isVietQR: { type: Boolean, default: false },
    bankBin: String,
    bankName: String,
    accountNumber: String,
    amount: Number,
    purpose: String
  }
}, { timestamps: true });
```

## 3. API & Socket.IO Contract

### 3.1. REST Endpoints
- **`GET /api/messages/:targetUserId`** *(Auth)*
  - Tính `conversationId = [req.user.id, targetUserId].sort().join('_')`.
  - Trả về mảng tin nhắn sắp xếp `createdAt: 1` (giới hạn 100 tin gần nhất).
- **`POST /api/messages/upload`** *(Auth + Multer)*
  - Giới hạn file: `image/jpeg`, `image/png`, `image/webp`, tối đa `5MB`. Sai định dạng -> `400 Bad Request`.
  - Gọi `qrParserService.parseImageBuffer(req.file.buffer)` -> trả về:
    ```json
    {
      "imageUrl": "/uploads/1710000000-qr.png",
      "qrData": { "isVietQR": true, "bankBin": "970418", "bankName": "BIDV", "accountNumber": "123456789", "amount": 500000, "purpose": "Xac minh" },
      "extractedLinks": []
    }
    ```

### 3.2. Socket.IO (`server/src/sockets/chat.socket.js`)
- **Auth Handshake:** `io.use(...)` đọc `socket.handshake.auth.token`, verify JWT, gắn `socket.userId`. Cho socket join room `user_${socket.userId}`.
- **Event `send_message`** (Client -> Server):
  - Payload: `{ receiverId, type, content, imageUrl, qrData }`
  - Logic xử lý:
    1. Kiểm tra `Block.exists({ $or: [{ blockerId: senderId, blockedId: receiverId }, { blockerId: receiverId, blockedId: senderId }] })`. Nếu có -> `socket.emit('message_error', { message: 'Không thể gửi tin nhắn vì cuộc trò chuyện đã bị chặn.' })` và dừng.
    2. Trích xuất link từ `content` bằng regex `/https?:\/\/[^\s]+/gi` (gộp với link từ `qrData.raw` nếu QR là URL).
    3. Tạo `Message` trong MongoDB.
    4. `io.to('user_' + senderId).to('user_' + receiverId).emit('receive_message', savedMessage)`.

## 4. Thuật toán Giải mã VietQR (`server/src/services/qrParser.service.js`)
1. Dùng `Jimp.read(buffer)` lấy `bitmap.data`, `width`, `height` -> truyền vào `jsQR(data, width, height)`.
2. Nếu không có QR -> trả `{ isVietQR: false }`.
3. Nếu chuỗi `raw` bắt đầu bằng `http://` hoặc `https://` -> trả `{ raw, isVietQR: false }` và thêm `raw` vào `extractedLinks`.
4. Nếu chuỗi `raw` bắt đầu bằng `000201` (chuẩn EMVCo):
   - Hàm `parseTLV(str)`: lặp `i = 0` đến `str.length`: `tag = str.slice(i, i+2)`, `len = parseInt(str.slice(i+2, i+4), 10)`, `val = str.slice(i+4, i+4+len)`, `i += 4 + len`.
   - Đọc **Tag `38`** -> `parseTLV` -> lấy **Tag `01`** -> `parseTLV` -> **Tag `00`** là `bankBin` (6 số), **Tag `01`** là `accountNumber`.
   - Tra `bankBin` trong `server/src/config/bankBins.json` (`970418`: BIDV, `970422`: MBBank, `970436`: Vietcombank, `970407`: Techcombank, `970416`: ACB, `970432`: VPBank, `970415`: VietinBank, `970403`: Sacombank, `970423`: TPBank, `970405`: Agribank).
   - **Tag `54`**: `amount = Number(val)`.
   - **Tag `62`**: `parseTLV` -> **Tag `08`** là `purpose`.

## 5. Interface mở rộng Practice Mode (`server/src/services/chatPartner.interface.js`)
```javascript
class ChatPartner {
  async sendMessage(senderId, receiverId, payload) { throw new Error('Not implemented'); }
}
// HumanPartner: Gửi qua Socket.IO như mục 3.2
// SimulatorBotPartner (P2): Gọi SimulatorService.reply(...) khi receiver.isSimulatorBot === true
```

## 6. Yêu cầu Frontend (`client/`)
- `ChatPage.jsx`: Layout 2 cột (Sidebar danh sách user `w-80` + Khung chat `flex-1`). Tự động cuộn xuống tin nhắn mới nhất.
- `MessageBubble.jsx`: Tin nhắn của mình căn phải (`bg-pink-50 border-pink-200`), đối phương căn trái (`bg-slate-100`). Nếu có `qrData.isVietQR === true`, render thẻ tóm tắt: `[Icon QR] Ngân hàng: BIDV | STK: 123456789 | Số tiền: 500.000đ`.
