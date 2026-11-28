# Plan TV2 Ngày 3: Hoàn thiện UX Chat (Frontend, task W2-3.1)

Dành cho AI agent. Đọc trước: `docs/ui-ux-spec.md` mục 4, `docs/theme.md`, `convention.md` mục 4, `docs/handoff-tv2-chat-be.md` mục 9.

**Tiêu chí hoàn thành:** đủ 4 trạng thái UI, auto-scroll đúng, responsive ở 360/768/1280px, không có lỗi console, toàn bộ test hiện có vẫn pass và `npm run build` thành công.

## 0. Quyết định đã chốt với người dùng
1. **Error Toast:** làm một toast dùng chung (`ToastContext`). Lỗi thoáng qua đi vào toast. Lỗi form Login/Register và lỗi tải có nút "Thử lại" vẫn hiện inline.
2. **File của TV3** (`ChatSafetyActions`, `ScamResultModal`, `PrivacyConfirmModal`, `ReportModal`, `FlaggedBanner`, `ClarificationStepper`): chỉ kiểm tra và ghi lại lỗi vào `docs/handoff-tv2-chat-be.md` mục 10. Không sửa.
3. **Auto-scroll:** chỉ tự cuộn khi đang ở gần đáy (80px) hoặc khi chính mình gửi tin. Ngược lại hiện nút "Tin nhắn mới".

Mặc định đã áp dụng: `CONVERSATION_BLOCKED` khóa ô nhập ngay (`hasBlockedMe = true`); đổi `100vh` sang `100dvh`; test của TV2 fail nếu có `console.error`/`console.warn`.

## 1. Ranh giới file (chống xung đột Git)
- **Được sửa:** `App.jsx` (chỉ `AppLayout`), `Navbar.jsx`, `ChatPage.jsx`, `ChatWindow.jsx`, `MessageBubble.jsx`, `UserSidebar.jsx`, các test của TV2, file mới trong `context/`, `components/`, `test/`.
- **Không sửa:** mọi file của TV3 ở trên và các route `/history`, `/tips`, `/admin` trong `App.jsx`.
- Toast chung đặt ở **giữa phía trên** (`top-16`) vì `ChatSafetyActions` đã có toast riêng ở góc phải dưới.

## 2. Các bước
| # | Việc | File |
|---|---|---|
| 1 | Toast chung: `ToastProvider`, `useToast`, viewport; dedupe theo `id`; tối đa 3; tự tắt (lỗi 6s, còn lại 4s, `duration: 0` là giữ lại) | `context/ToastContext.jsx` |
| 2 | Báo mất mạng / có mạng lại bằng sự kiện `offline`/`online` | `components/NetworkStatusToasts.jsx` |
| 3 | Gắn provider và `NetworkStatusToasts` vào `AppLayout` | `App.jsx` |
| 4 | Dùng toast trong `ChatWindow` (bỏ banner lỗi cũ và prop `errorMessage`/`onDismissError`) và trong `ChatPage` (`onError` của socket) | `ChatWindow.jsx`, `ChatPage.jsx` |
| 5 | Loading khi upload: dòng "Đang tải ảnh lên & giải mã QR..." | `ChatWindow.jsx` |
| 6 | Empty state có minh họa SVG và dòng hướng dẫn | `components/ChatEmptyIllustration.jsx`, `ChatPage.jsx` |
| 7 | Blocked: thanh thông báo kèm dòng gợi ý theo chiều chặn; `CONVERSATION_BLOCKED` đặt `hasBlockedMe` | `ChatWindow.jsx`, `ChatPage.jsx` |
| 8 | Auto-scroll: theo dõi vị trí cuộn, nút "Tin nhắn mới", cuộn lại khi ảnh tải xong | `ChatWindow.jsx`, `MessageBubble.jsx` |
| 9 | Responsive: `100dvh`, header chat xuống dòng riêng ở mobile, Navbar dùng menu hamburger tới `lg`, chữ 16px cho ô nhập ở mobile (tránh iOS tự zoom), nút Gửi chỉ còn icon ở mobile | `ChatPage.jsx`, `ChatWindow.jsx`, `Navbar.jsx`, `UserSidebar.jsx` |
| 10 | Test: helper `failOnConsole`, cập nhật test cũ, thêm test mới cho toast, auto-scroll, blocked, empty state, upload loading | `test/failOnConsole.js`, `*.test.jsx` |
| 11 | Kiểm tra thật bằng trình duyệt ở 360/768/1280px, ghi lỗi của TV3 vào handoff | `docs/handoff-tv2-chat-be.md` |
| 12 | Cập nhật `docs/ui-ux-spec.md` mục 4 (Error Toast) | `docs/ui-ux-spec.md` |

## 3. Kiểm tra cuối
- `npm test` và `npm run build` trong `frontend/`; `npm test` trong `backend/`.
- Chạy app ở 360/768/1280px: không tràn ngang, không có lỗi console.
