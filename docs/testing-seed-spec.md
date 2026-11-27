# Testing & Seed Data Specification (`testing-seed-spec.md`)

Tài liệu này mô tả dữ liệu mẫu (`seedDemo.js`) và bộ kịch bản kiểm thử bắt buộc trước khi Demo tại MoMo TechDays.

## 1. Dữ liệu Seed bắt buộc (`server/src/seeds/seedDemo.js`)
Chạy lệnh `npm run seed` phải tạo được:
- **Tài khoản:**
  - `admin` / `123456` (`role: 'admin'`)
  - `demo_user` / `123456` (`role: 'user'`)
- **3 cuộc hội thoại mẫu với `demo_user`:**
  1. **`HoTro_MoMo_247` (Ca Rủi ro cao >= 70đ):**
     - Tin nhắn: *"Chào bạn, hệ thống phát hiện ví của bạn có giao dịch bất thường. Vui lòng truy cập http://m0mo-xacminh.xyz và chuyển 500.000đ vào QR dưới đây để xác minh trong 10 phút, nếu không tài khoản sẽ bị khóa."*
     - Kèm dữ liệu `qrData` giả lập STK `123456789` (BIDV) đã nằm sẵn trong `Blacklist`.
  2. **`TuyenDung_CTV_Online` (Ca Vùng nghi ngờ 30–69đ):**
     - Tin nhắn: *"Chào em, bên chị đang tuyển CTV xử lý đơn hàng tại nhà, ngày kiếm 300k-500k. Em có muốn làm không chị gửi hướng dẫn?"* -> Phù hợp để demo luồng **3 câu hỏi làm rõ**.
  3. **`ChuTro_AnhMinh` (Ca An toàn < 30đ):**
     - Tin nhắn: *"Minh ơi tháng này tiền phòng 3tr5 với điện nước 300k nhé, rảnh thì chuyển khoản cho anh."* -> Phải trả về mức **Thấp (< 30đ)**.

## 2. Danh sách Test Case E2E bắt buộc Pass (Ngày 6–7)
| Mã TC | Kịch bản kiểm thử | Kết quả mong đợi |
|---|---|---|
| **TC-01** | Đăng nhập `demo_user`, gửi tin nhắn text & ảnh QR BIDV/MBBank cho user khác. | Tin nhắn hiển thị realtime; ảnh QR giải mã đúng Tên ngân hàng + STK. |
| **TC-02** | Bấm "Kiểm tra lừa đảo" trên hội thoại `HoTro_MoMo_247`. | Hiện Modal xác nhận quyền riêng tư -> Trả về mức **Cao (>= 70đ)**, trích dẫn đúng link giả & STK Blacklist. |
| **TC-03** | Bấm "Kiểm tra lừa đảo" trên hội thoại `TuyenDung_CTV_Online`. | Trả về mức **Trung bình (30–69đ)** -> Hiện tối đa 3 câu hỏi -> Chọn `Có` cho câu nạp tiền -> Điểm tăng lên **Cao (>= 70đ)**. |
| **TC-04** | Bấm "Kiểm tra lừa đảo" trên hội thoại `ChuTro_AnhMinh`. | Trả về mức **Thấp (< 30đ)**, không hiện câu hỏi làm rõ. |
| **TC-05** | Bấm **Chặn** một user, sau đó thử gửi tin nhắn từ phía user bị chặn. | Server từ chối gửi tin nhắn qua Socket.IO. |
| **TC-06** | Đăng nhập `admin`, vào `/admin`. | Xem được danh sách tài khoản bị report nhiều và danh sách Blacklist. |
