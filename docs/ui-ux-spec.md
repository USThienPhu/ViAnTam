# UI/UX & Frontend Architecture Specification (`ui-ux-spec.md`)

Tài liệu này mô tả chi tiết cấu trúc **Frontend (React + Vite + TailwindCSS)** để các thành viên triển khai đồng bộ mà không xung đột giao diện.

## 1. Theme chủ đạo & Hệ thống màu sắc
- **Theme chủ đạo toàn dự án được quy định tại:** [`docs/theme.md`](theme.md).
- AI Agent và Frontend Developer bắt buộc đọc [`docs/theme.md`](theme.md) kết hợp với bộ UI/UX Skills trong `/skills/ui-ux-pro-max/.claude/skills/` trước khi tạo hoặc sửa component.

## 2. Cấu trúc Routing (`client/src/App.jsx`)

| Route | Page Component | Quyền truy cập | Mô tả |
|---|---|---|---|
| `/login` | `LoginPage.jsx` | Public (Redirect `/` nếu đã login) | Form đăng nhập |
| `/register` | `RegisterPage.jsx` | Public (Redirect `/` nếu đã login) | Form đăng ký |
| `/` | `ChatPage.jsx` | `ProtectedRoute` (Đã đăng nhập) | Giao diện Chat 1-1 chính + Kiểm tra lừa đảo |
| `/history` | `HistoryPage.jsx` | `ProtectedRoute` | Lịch sử các lần kiểm tra AI & Feedback |
| `/tips` | `TipsPage.jsx` | `ProtectedRoute` | Trang mẹo phòng chống lừa đảo tại VN |
| `/admin` | `AdminPage.jsx` | `AdminRoute` (`user.role === 'admin'`) | Xem tài khoản bị report nhiều & duyệt Blacklist |

## 3. Cây Component & Trách nhiệm chi tiết

### 3.1. `Navbar.jsx` (Dùng chung cho các trang đã đăng nhập)
- Chiều cao cố định `h-14`, nền `bg-white border-b border-slate-200`.
- Trái: Logo **AegisAI** (màu `#D82D8B`) + icon khiên bảo vệ.
- Giữa: 3–4 link điều hướng (**Tin nhắn**, **Lịch sử**, **Mẹo an toàn**, và **Quản trị** chỉ hiện khi `user.role === 'admin'`).
- Phải: Tên `user.username` + nút **Đăng xuất**.

### 3.2. `ChatPage.jsx` & `ChatWindow.jsx`
- **Sidebar trái (`w-80` trên desktop, ẩn/hiện toggle trên mobile):**
  - Ô tìm kiếm nhanh theo `username`.
  - Danh sách user: hiển thị Avatar chữ cái đầu, `username`, badge đỏ **"Cảnh báo"** nếu `isFlagged === true`, badge xám **"Đã chặn"** nếu `isBlockedByMe === true`.
- **Header `ChatWindow`:**
  - Tên đối phương + trạng thái.
  - 3 nút hành động bên phải:
    1. **"Kiểm tra lừa đảo"** (nút chính màu `#D82D8B`, icon Sparkles/Shield).
    2. **"Báo cáo"** (nút viền xám, icon Flag).
    3. **"Chặn"** / **"Bỏ chặn"** (nút đỏ nhạt nếu chưa chặn).
- **Flagged Banner:** Nếu đối phương có `isFlagged === true`, hiển thị thanh cảnh báo cố định ngay dưới Header: *"Tài khoản này đã bị nhiều người dùng báo cáo. Hãy thận trọng khi giao dịch."*

### 3.3. `ScamResultModal.jsx` & `ClarificationStepper.jsx`
- **Header Modal:** Thanh điểm rủi ro `0 - 100` + Badge mức độ (`Thấp` Xanh / `Trung bình` Vàng / `Cao` Đỏ) + `scamType`.
- **Thân Modal:**
  - Danh sách `suspiciousSigns`: mỗi mục hiển thị trích dẫn tin nhắn (`quote`) in nghiêng trong khung xám + giải thích (`explanation`).
  - Danh sách `advice`: các gạch đầu dòng hành động cụ thể.
  - Nếu `riskLevel === 'medium'` và chưa trả lời câu hỏi -> nhúng `ClarificationStepper.jsx` (hiển thị tối đa 3 câu, mỗi câu 3 nút bấm: `Có` | `Không` | `Không chắc`). Sau khi bấm Gửi -> hiển thị `scoreChangeReason` và cập nhật điểm/màu ngay tại chỗ.
- **Footer Modal:**
  - Dòng lưu ý bắt buộc (`text-xs text-slate-500`): *"Lưu ý: Kết quả chỉ mang tính tham khảo của AI, không thay thế kết luận của cơ quan chức năng hoặc ngân hàng."*
  - Nếu `riskLevel === 'high'`: Hiện nút **"Chặn & Báo cáo ngay"** và nút **"Tôi đã kiểm tra và vẫn muốn tiếp tục"** (bị `disabled` trong 3 giây đầu kèm đếm ngược `3s... 2s... 1s...`).
  - Nút đánh giá AI: **"Kết quả này có chính xác?"** (`Đúng` / `Sai`).

## 4. Các trạng thái UI bắt buộc (States)
1. **Loading State:** Spinner + text *"Đang phân tích hội thoại & giải mã QR..."* khi chờ AWS LLM.
2. **Empty State:** Minh họa + text *"Chọn một cuộc trò chuyện để bắt đầu"* khi chưa chọn ai ở `ChatPage`.
3. **Blocked State:** Khóa ô nhập tin nhắn và nút gửi ảnh, hiển thị thanh thông báo: *"Cuộc trò chuyện này đã bị chặn."*
4. **Error Toast:** Hiển thị thông báo lỗi tiếng Việt rõ ràng khi mất mạng, upload ảnh sai định dạng, hoặc gọi API thất bại.
