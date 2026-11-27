# Practice Mode Specification (`practice-mode-spec.md`) — Mở rộng

> [!NOTE]
> Đây là tính năng **mở rộng (P2)**, chỉ triển khai nếu nhóm hoàn thành sớm các tính năng cốt lõi trong 5–6 ngày đầu. Tuy nhiên, cấu trúc dữ liệu (`User.isSimulatorBot`) và interface `ChatPartner` trong `chat-spec.md` đã được thiết kế sẵn để cắm tính năng này vào mà không làm thay đổi code chat chính.

## 1. Mục tiêu nghiệp vụ
Cho phép người dùng luyện tập nhận biết lừa đảo trong môi trường mô phỏng an toàn bằng cách nhắn tin với Chatbot đóng vai kẻ lừa đảo (hoặc người bình thường để tránh đoán máy móc).

## 2. Database Schema (`PracticeSession` - MongoDB)
```javascript
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', required: true },
  scenarioId: { type: String, required: true },
  userGuess: { type: String, enum: ['scam', 'safe'], required: true },
  actualLabel: { type: String, enum: ['scam', 'safe'], required: true },
  turnsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}
```

## 3. Luồng hoạt động
1. Người dùng chọn một kịch bản từ danh sách (hoặc chọn ngẫu nhiên):
   - Kịch bản lừa đảo: Giả danh công an, Tuyển CTV online, Đầu tư lãi cao, Shipper/Ngân hàng đòi OTP.
   - Kịch bản bình thường: Bạn bè rủ đi ăn, Chủ trọ nhắc đóng tiền nhà.
2. Giao diện chat hiển thị nhãn rõ ràng: **"CHẾ ĐỘ MÔ PHỎNG — Dữ liệu giả lập"**.
3. Chatbot phản hồi theo từng lượt thông qua `SimulatorBotPartner` (gọi AWS LLM với prompt đóng vai theo kịch bản, tuyệt đối không sinh STK hay link thật).
4. Trong lúc chat, người dùng có 2 nút hành động:
   - **"Khả năng lừa đảo"**
   - **"Khả năng không lừa đảo"**
5. Ngay khi người dùng bấm chọn, hệ thống lưu `PracticeSession`, công bố đáp án thật (`actualLabel`) và chỉ ra từng dấu hiệu lừa đảo đã xuất hiện ở mỗi lượt chat.
