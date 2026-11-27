# Testing & Seed Data Specification (`testing-seed-spec.md`)

Tài liệu này mô tả chi tiết script `server/src/seeds/seedDemo.js` và bộ 6 Test Case E2E bắt buộc pass trước khi thuyết trình **MoMo TechDays**.

## 1. Đặc tả Script Seed (`server/src/seeds/seedDemo.js`)
- Chạy bằng lệnh: `npm run seed` (trong `package.json`: `"seed": "node src/seeds/seedDemo.js"`).
- **Tính Idempotent:** Trước khi tạo dữ liệu demo, xóa sạch dữ liệu cũ của các user demo (hoặc dùng `findOneAndUpdate` với `upsert`) để chạy lại nhiều lần không bị lỗi trùng khóa `username`.

### 1.1. Tài khoản tạo sẵn
| Username | Password (raw) | Role | `reportCount` | `isFlagged` | Mục đích |
|---|---|---|---|---|---|
| `admin` | `123456` | `admin` | `0` | `false` | Đăng nhập vào `/admin` duyệt báo cáo & Blacklist |
| `demo_user` | `123456` | `user` | `0` | `false` | Tài khoản chính để BGK đăng nhập test |
| `HoTro_MoMo_247` | `123456` | `user` | `4` | `true` | Ca mẫu 1: Rủi ro cao (`>= 70đ`) + Đã bị gắn cờ |
| `TuyenDung_CTV_Online` | `123456` | `user` | `1` | `false` | Ca mẫu 2: Vùng nghi ngờ (`30–69đ`) |
| `ChuTro_AnhMinh` | `123456` | `user` | `0` | `false` | Ca mẫu 3: An toàn (`< 30đ`) |

### 1.2. Dữ liệu Blacklist tạo sẵn
- `{ type: 'bank_account', value: '123456789', bankBin: '970418', reportCount: 5, status: 'confirmed', reasonSummary: 'Tài khoản giả danh hỗ trợ ví điện tử' }`
- `{ type: 'link', value: 'http://m0mo-xacminh.xyz', reportCount: 4, status: 'confirmed', reasonSummary: 'Tên miền giả mạo MoMo' }`

### 1.3. Tin nhắn mẫu trong 3 cuộc hội thoại với `demo_user`
1. **Hội thoại với `HoTro_MoMo_247`:**
   - `HoTro_MoMo_247`: *"Chào bạn, hệ thống phát hiện ví của bạn có giao dịch bất thường."*
   - `HoTro_MoMo_247`: *"Vui lòng truy cập http://m0mo-xacminh.xyz và chuyển 500.000đ vào QR BIDV STK 123456789 để xác minh trong 10 phút, nếu không tài khoản sẽ bị khóa vĩnh viễn."* (Đính kèm `extractedLinks: ['http://m0mo-xacminh.xyz']` và `qrData: { isVietQR: true, bankBin: '970418', bankName: 'BIDV', accountNumber: '123456789', amount: 500000, purpose: 'Xac minh' }`).
2. **Hội thoại với `TuyenDung_CTV_Online`:**
   - `TuyenDung_CTV_Online`: *"Chào em, bên chị đang tuyển CTV xử lý đơn hàng tại nhà, ngày kiếm 300k-500k, làm lúc rảnh."*
   - `demo_user`: *"Dạ công việc cụ thể là làm gì vậy chị?"*
   - `TuyenDung_CTV_Online`: *"Em chỉ cần xác nhận đơn hàng trên hệ thống bên chị, có thể sẽ cần ứng trước một khoản nhỏ rồi nhận lại cả gốc lẫn hoa hồng ngay nhé."*
3. **Hội thoại với `ChuTro_AnhMinh`:**
   - `ChuTro_AnhMinh`: *"Minh ơi tháng này tiền phòng 3tr5 với điện nước 300k nhé, tổng 3tr8. Rảnh thì chuyển khoản cho anh như mọi tháng nha."*
   - `demo_user`: *"Dạ vâng anh, tối nay đi làm về em chuyển luôn ạ."*

---

## 2. Bộ Test Case E2E bắt buộc Pass (`TC-01` đến `TC-06`)

| Mã TC | Các bước thực hiện | Kết quả mong đợi |
|---|---|---|
| **TC-01** | Đăng nhập `demo_user`, mở chat với `ChuTro_AnhMinh`, gửi 1 tin text và upload 1 ảnh VietQR thật (BIDV/MBBank/VCB). | Tin nhắn hiện realtime; thẻ tóm tắt dưới ảnh giải mã đúng Tên ngân hàng + Số tài khoản. |
| **TC-02** | Mở chat `HoTro_MoMo_247`, thấy banner cảnh báo `isFlagged`. Bấm **"Kiểm tra lừa đảo"** -> Xác nhận Privacy Modal. | Trả về mức **Cao (`>= 70đ`)**, trích dẫn link `m0mo-xacminh.xyz` & STK Blacklist. Nút "Tôi đã kiểm tra..." bị khóa 3 giây đầu. |
| **TC-03** | Mở chat `TuyenDung_CTV_Online`, bấm **"Kiểm tra lừa đảo"**. | Trả về mức **Trung bình (`30–69đ`)** -> Hiện tối đa 3 câu hỏi -> Chọn `Có` cho câu nạp tiền -> Điểm tăng lên **Cao (`>= 70đ`)** kèm lý do thay đổi điểm. |
| **TC-04** | Mở chat `ChuTro_AnhMinh`, bấm **"Kiểm tra lừa đảo"**. | Trả về mức **Thấp (`< 30đ`)**, thẻ màu xanh, không hiện câu hỏi làm rõ. |
| **TC-05** | Bấm **Chặn** `TuyenDung_CTV_Online`, sau đó đăng nhập tài khoản `TuyenDung_CTV_Online` ở tab khác thử gửi tin nhắn. | Ô nhập bị khóa hoặc server emit `message_error`, tin nhắn không gửi được. |
| **TC-06** | Đăng nhập `admin`, vào `/admin`, xem tab Tài khoản bị báo cáo & Blacklist, thử bấm **Xác nhận** một mục `pending`. | Hiển thị đầy đủ danh sách và cập nhật trạng thái thành công. |
