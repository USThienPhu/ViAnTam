# UI/UX & Design System Specification (`ui-ux-spec.md`)

Tài liệu này quy định giao diện thống nhất cho **Frontend (React + Vite + TailwindCSS)** để các màn hình đồng bộ và thân thiện khi demo.

## 1. Theme chủ đạo & Hệ thống màu sắc
- **Theme chủ đạo toàn dự án được quy định tại:** [`docs/theme.md`](theme.md).
- Khi triển khai giao diện, AI Agent và Frontend Developer phải đọc [`docs/theme.md`](theme.md) kết hợp với bộ UI/UX Skills trong `/skills/ui-ux-pro-max/.claude/skills/` để đảm bảo đúng bảng màu thương hiệu (`#D82D8B`), màu trạng thái rủi ro (`low` / `medium` / `high`), font chữ và bo góc chuẩn.

## 2. Cấu trúc Layout & Điều hướng
- **Thanh điều hướng (Navbar / Sidebar trái):**
  - Logo **ScamGuard Chat**
  - Menu: **Tin nhắn** (`/`) | **Lịch sử kiểm tra** (`/history`) | **Mẹo phòng chống** (`/tips`) | **Quản trị** (`/admin` — chỉ hiện nếu `user.role === 'admin'`).
  - Thông tin user đang đăng nhập + nút **Đăng xuất**.

## 3. Các trạng thái UI bắt buộc xử lý trên mọi màn hình
1. **Loading State:** Hiển thị Spinner / Skeleton kèm text rõ ràng (VD: *"Đang phân tích hội thoại & giải mã QR..."* khi gọi AI).
2. **Empty State:** Khi chưa chọn cuộc trò chuyện, chưa có lịch sử kiểm tra, hoặc chưa có báo cáo nào.
3. **Blocked State:** Nếu cuộc hội thoại bị chặn, vô hiệu hóa ô nhập tin nhắn và nút gửi ảnh, hiển thị thanh thông báo: *"Cuộc trò chuyện này đã bị chặn."*
4. **Flagged Banner:** Nếu đối phương có `isFlagged === true`, hiển thị banner cảnh báo cố định ngay dưới Header khung chat.

## 4. Câu chữ tiếng Việt chuẩn cho các nút & thông báo
- Nút kích hoạt AI: **"Kiểm tra lừa đảo"**
- Dòng miễn trừ trách nhiệm trong Modal kết quả: *"Lưu ý: Kết quả chỉ mang tính tham khảo của AI, không thay thế kết luận của cơ quan chức năng hoặc ngân hàng."*
- Nút vượt qua cảnh báo đỏ: **"Tôi đã kiểm tra và vẫn muốn tiếp tục"** (disable trong 3 giây đầu tiên kèm đếm ngược `3s... 2s... 1s...`).
