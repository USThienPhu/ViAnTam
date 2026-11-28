# Ghi chú bàn giao: Backend Chat 1-1 (TV2, task W2-2.1)

Tài liệu cho AI agent và thành viên **TV1**, **TV3** đọc **trước khi merge** nhánh `feat/websocket` của TV2.
Mục đích: biết file nào TV2 đã tạo hộ, file nào dễ conflict, và cách xử lý khi trùng với code của mình.

Quy tắc chung (theo `AGENTS.md`): không đổi tên trường MongoDB, tên endpoint hay JSON contract nếu chưa sửa spec trong `docs/`.

---

## 1. File thuộc người khác nhưng TV2 đã viết hộ

### 1.1. `backend/src/models/Message.js` (thuộc TV3, task W3-1.1)
- **Vì sao:** Lúc TV2 làm, file chỉ có dòng TODO nhưng chat bắt buộc cần model này.
- **Nội dung:** đúng schema trong `docs/chat-spec.md` mục 2, không thêm bớt trường.
  Các trường: `conversationId` (String, index), `senderId`, `receiverId` (ObjectId, ref `User`), `type` (`text`|`image`), `content`, `imageUrl`, `extractedLinks[]`, `qrData{raw,isVietQR,bankBin,bankName,accountNumber,amount,purpose}`, `timestamps`.
- **Xuất ra:** `mongoose.models.Message || mongoose.model('Message', schema)`.
- **Nếu conflict:**
  - TV3 giữ bản của mình nếu **tên trường và kiểu dữ liệu giống spec**. Bản của TV3 có thể thay thế hoàn toàn, TV2 không phụ thuộc vào chi tiết nào khác.
  - Nếu TV3 đổi tên trường hay kiểu, phải sửa `docs/chat-spec.md` trước và báo TV2, vì các file sau đọc/ghi trực tiếp các trường này: `services/chatPartner.interface.js`, `routes/chat.routes.js`, `test/*.test.js`.

### 1.2. `backend/src/models/Block.js` (thuộc TV3, task W3-1.1)
- **Vì sao:** `chatPartner.interface.js` cần `Block.exists(...)` để từ chối tin nhắn khi bị chặn.
- **Nội dung:** đúng `docs/safety-admin-spec.md` mục 2.2: `blockerId`, `blockedId` (ObjectId, ref `User`, required), `timestamps`, index unique `{ blockerId: 1, blockedId: 1 }`.
- **Nếu conflict:** giữ bản của TV3 nếu có hai trường `blockerId`, `blockedId` và dùng cho cả hai chiều chặn.
- **Việc TV3 làm tiếp:** `safety.routes.js` chỉ cần tạo/xóa bản ghi `Block`. Server chat **kiểm tra Block trong DB ở mỗi tin nhắn**, nên chặn/bỏ chặn có hiệu lực ngay, không cần emit gì thêm cho socket.

---

## 2. Bộ giải mã VietQR (đã hoàn thành, task W2-2.2)

### 2.1. `backend/src/services/qrParser.service.js` + `backend/src/config/bankBins.json` (thuộc TV2)
- **Trạng thái:** đã làm xong (Jimp + jsQR + `parseTLV`). Không còn là bản tạm.
- **Hợp đồng không được đổi:** `async parseImageBuffer(buffer)` **không bao giờ ném lỗi**, luôn trả `{ qrData, extractedLinks }`. `routes/chat.routes.js` (`POST /api/messages/upload`) dùng đúng hợp đồng này.
- **Các trường `qrData`:**
  - Không có QR, ảnh hỏng, QR lạ, ảnh WEBP: `{ isVietQR: false }`.
  - QR là link `http(s)://`: `{ raw, isVietQR: false }` và link được thêm vào `extractedLinks`.
  - VietQR hợp lệ: `{ raw, isVietQR: true, bankBin, accountNumber }` cộng `bankName` (chỉ khi BIN có trong `bankBins.json`), `amount` (chỉ khi Tag 54 là số dương), `purpose` (chỉ khi có Tag 62 > Tag 08).
- **Cho TV3 (`scamCheck.routes.js`, Blacklist):** các trường `bankName`, `amount`, `purpose` có thể **vắng mặt**, đừng giả định luôn có. `accountNumber` chỉ có khi `isVietQR === true`.
- **Chưa hỗ trợ:**
  - **Ảnh WEBP không được giải mã.** Upload vẫn thành công, nhưng `qrData` luôn là `{ isVietQR: false }`. Jimp 2.2.1 không đọc được WEBP.
  - BIN ngoài 10 ngân hàng trong `bankBins.json` (ví dụ MoMo) chỉ trả `bankBin`, không có `bankName`. Muốn thêm thì sửa `bankBins.json`.
  - Không kiểm tra CRC (Tag 63).
- **Ai sửa file này:** chỉ TV2. TV1 và TV3 **không sửa**.

---

## 3. File mới do TV2 thêm (không thuộc ai, cần biết để tránh trùng)

| File | Mô tả | Lưu ý cho TV1/TV3 |
|---|---|---|
| `backend/src/utils/conversation.js` | `makeConversationId(a, b)` trả `[a,b].sort().join('_')` | **TV3 nên dùng hàm này** khi lấy 30 tin gần nhất trong `POST /api/scam-check/analyze`, để `conversationId` luôn khớp với `Message`. Đừng tự viết lại công thức. |
| `backend/src/services/chatPartner.interface.js` | `ChatPartner`, `HumanPartner`, `ChatError` | Chỉ TV2 dùng. Practice Mode (P2) sẽ thêm `SimulatorBotPartner` ở đây. |
| `backend/src/sockets/chat.socket.js` | `registerChatSocket(io)` và `userRoom(userId)` | Xem mục 4. |
| `backend/src/middlewares/upload.js` | `uploadImage` (multer, 5MB, jpg/png/webp, kiểm tra magic bytes) | Dùng lại nếu cần upload ảnh khác. Không tạo multer thứ hai. |
| `backend/src/routes/chat.routes.js` | `GET /api/messages/:targetUserId`, `POST /api/messages/upload` | Đã mount sẵn trong `app.js`. |

---

## 4. Việc TV3 cần biết khi làm báo cáo/chặn (emit `user_flagged`)

- Mỗi socket sau khi xác thực JWT tự động vào **một room duy nhất**: `user_<userId>` (ví dụ `user_665f...`).
- Để báo cho một user, emit vào room này. Hai cách đều dùng được:
  ```js
  const { userRoom } = require('../sockets/chat.socket');
  req.app.get('io').to(userRoom(targetUserId)).emit('user_flagged', { userId, isFlagged: true, reportCount });
  ```
  hoặc `req.app.get('io').to('user_' + targetUserId).emit(...)`.
- `app.set('io', io)` đã có sẵn trong `app.js`.
- Muốn **mọi người đang online** thấy banner cảnh báo ngay, emit `io.emit('user_flagged', ...)` (broadcast). Room chỉ báo cho đúng một người. Chọn cách nào là quyết định của TV3 và FE (`FlaggedBanner.jsx`), tên sự kiện `user_flagged` giữ như trong `docs/safety-admin-spec.md`.
- Socket event hiện có (không đổi tên):
  - Client -> server: `send_message` với `{ receiverId, type, content, imageUrl, qrData }`.
  - Server -> client: `receive_message` (tin đã lưu), `message_error` (`{ message, code }`).
  - `code` của `message_error`: `INVALID_RECEIVER`, `RECEIVER_NOT_FOUND`, `EMPTY_MESSAGE`, `CONTENT_TOO_LONG`, `INVALID_IMAGE`, `CONVERSATION_BLOCKED`, `INTERNAL_ERROR`.

---

## 5. File dùng chung đã sửa, dễ conflict khi merge

### 5.1. `backend/src/app.js`
TV2 chỉ thêm **2 dòng**:
```js
const { registerChatSocket } = require('./sockets/chat.socket');   // dưới các dòng require routes
...
registerChatSocket(io);                                            // ngay sau app.set('io', io);
```
Khi conflict: giữ cả hai phía, đảm bảo hai dòng trên còn tồn tại. Không xóa `registerChatSocket(io)`, nếu không chat realtime sẽ không kết nối được.

### 5.2. `backend/package.json` và `package-lock.json`
- TV2 thêm devDependency `socket.io-client` (chỉ dùng cho test socket).
- Khi conflict ở `package-lock.json`: **không sửa tay**. Lấy `package.json` đã gộp, giữ cả hai nhóm dependency, rồi chạy `npm install` để sinh lại lock.

### 5.3. `backend/src/routes/auth.routes.js` (TV2, không sửa lần này)
`GET /api/users` đang đọc collection `blocks` bằng `mongoose.connection.collection('blocks')` vì lúc đó `Block.js` chưa có. Giờ `Block.js` đã có, có thể đổi sang `Block.find(...)` sau. Không bắt buộc, không ảnh hưởng chức năng.

---

## 6. Hành vi server cần nhớ (ảnh hưởng FE và TV3)

- `senderId` luôn lấy từ JWT, **không** lấy từ payload client.
- `qrData` do client gửi lên được **làm sạch** (chỉ giữ trường đã biết, đúng kiểu) nhưng **chưa được xác minh bằng ảnh**. Vì vậy chưa nên coi `qrData.accountNumber` là tin cậy tuyệt đối khi đưa vào `Blacklist`. Lỗ hổng này **vẫn còn**: `send_message` chưa tự giải mã lại ảnh từ `uploads/`. Chỉ `POST /api/messages/upload` trả kết quả giải mã đáng tin. Khi cần, sửa `chatPartner.interface.js` để đọc lại ảnh theo `imageUrl` rồi gọi `parseImageBuffer`, bỏ qua `qrData` của client.
- `imageUrl` chỉ nhận dạng `/uploads/<tên-file>` (không có `/` hay `..` phía sau).
- `content` tối đa 2000 ký tự, tin `text` không được rỗng.
- Ảnh upload lưu tại `backend/uploads/` (đã bị `.gitignore` bỏ qua, trừ `.gitkeep`).
- Thông báo lỗi `POST /api/messages/upload` là `400` kèm `{ message, code }`, `code`: `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `NO_FILE`, `INVALID_UPLOAD`.

---

## 7. Kiểm tra sau khi merge

Chạy trong `backend/`:
```bash
npm install
npm test
```
Kỳ vọng: toàn bộ test đạt. Các file test của phần chat: `models.test.js`, `chatPartner.test.js`, `chat.socket.test.js`, `upload.test.js`, `chat.routes.test.js`, `chat.e2e.test.js`, `qrParser.test.js`.
`qrParser.test.js` và `chat.routes.test.js` dùng devDependency `qrcode` để tự sinh ảnh QR. Khi conflict `package-lock.json`, vẫn xử lý bằng `npm install` (mục 5.2).
Nếu test chat lỗi sau khi TV3 thay `Message.js`/`Block.js`, nguyên nhân gần như chắc chắn là khác tên hoặc kiểu trường so với spec (mục 1).

## 8. Thông tin không liên quan đến TV1

Phần này của TV2 không phụ thuộc và không ảnh hưởng `llmClient.service.js`, `linkAnalyzer.service.js` hay `ai-service/`. TV1 không cần thay đổi gì.
