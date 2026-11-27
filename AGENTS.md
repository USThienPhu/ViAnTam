# Hướng dẫn dành cho AI Agents (`AGENTS.md`)

Tài liệu này là quy tắc bắt buộc mà mọi AI Coding Agent phải đọc **trước khi thực hiện bất kỳ thao tác phân tích, thiết kế hoặc viết code nào** trong dự án **ScamGuard Chat**.

---

## 1. Quy tắc đọc ngữ cảnh theo loại công việc

### A. Công việc liên quan đến Frontend / UI / UX (BẮT BUỘC)
Trước khi tạo hoặc chỉnh sửa bất kỳ component, trang hoặc style nào trong `client/`:
1. **Đọc các Skill chuẩn UI/UX trong thư mục `/skills`** (từ repo `ui-ux-pro-max-skill`):
   - `skills/ui-ux-pro-max/.claude/skills/ui-ux-pro-max/SKILL.md` (Quy chuẩn thiết kế UI/UX tổng thể)
   - `skills/ui-ux-pro-max/.claude/skills/ui-styling/SKILL.md` (Quy chuẩn styling & TailwindCSS)
   - `skills/ui-ux-pro-max/.claude/skills/design-system/SKILL.md` (Quy chuẩn hệ thống thiết kế & tokens)
2. **Đọc Theme chủ đạo của dự án:**
   - `docs/theme.md` (Màu sắc thương hiệu, màu mức độ rủi ro, typography, spacing, Tailwind tokens).
3. **Đọc Spec giao diện & nghiệp vụ tương ứng:**
   - `docs/ui-ux-spec.md` và spec của tính năng đang làm (`docs/chat-spec.md`, `docs/ai-scam-detection-spec.md`, `docs/safety-admin-spec.md`, `docs/auth-spec.md`).

### B. Công việc liên quan đến Backend (`server/`)
1. Đọc `docs/architecture-spec.md` để nắm cấu trúc thư mục, biến môi trường và quy ước chung.
2. Đọc file spec của đúng module phụ trách (`docs/auth-spec.md`, `docs/chat-spec.md`, `docs/ai-scam-detection-spec.md`, `docs/safety-admin-spec.md`).

### C. Công việc liên quan đến AI / LLM (`ai-service/`)
1. Đọc `docs/aws-llm-service-spec.md` và `docs/ai-scam-detection-spec.md` (đặc biệt là JSON Contract và quy tắc chống Prompt Injection).

---

## 2. Nguyên tắc kỹ thuật chung của dự án
- **Single Source of Truth:** Không tự ý thay đổi tên trường MongoDB, tên API endpoint, hoặc JSON contract khi chưa cập nhật file spec tương ứng trong `docs/`.
- **Privacy-First:** Tuyệt đối không gửi nội dung tin nhắn sang AWS LLM nếu người dùng chưa chủ động bấm **"Kiểm tra lừa đảo"** và xác nhận thông báo quyền riêng tư.
- **Ngôn ngữ giao diện:** Toàn bộ văn bản hiển thị cho người dùng (nút bấm, cảnh báo, thông báo lỗi, hướng dẫn) phải sử dụng **tiếng Việt rõ ràng, trung tính**.
- **Tham khảo tiến độ & vai trò:** Đối chiếu với `task.md` và `use_case.md` để đảm bảo đúng phạm vi công việc.
