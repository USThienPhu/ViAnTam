# Theme & Visual Tokens (`theme.md`)

Tài liệu này quy định **Theme chủ đạo** cho toàn bộ giao diện **ScamGuard Chat** (tham gia **MoMo TechDays**). Mọi component Frontend (React + TailwindCSS) phải tuân thủ chính xác bảng màu, font chữ và tokens dưới đây.

---

## 1. Định hướng thẩm mỹ
- **Chủ đề:** *Fintech Trust & Security Messaging* — Giao diện sáng (Light Mode) sạch sẽ, độ tương phản cao, kết hợp màu nhấn mang bản sắc **MoMo TechDays** với các màu cảnh báo rủi ro dễ nhận diện tức thì.
- **Nguyên tắc:** Không dùng hiệu ứng rườm rà làm chậm thao tác; ưu tiên phân cấp thị giác rõ ràng cho khung chat và các thẻ cảnh báo an toàn.

---

## 2. Bảng màu chủ đạo (Color Palette)

### 2.1. Màu thương hiệu (Brand Colors — MoMo TechDays Accent)
| Token | Hex | Tailwind Class gợi ý | Mục đích sử dụng |
|---|---|---|---|
| `brand-primary` | `#D82D8B` | `bg-[#D82D8B]` / `text-[#D82D8B]` | Nút hành động chính (Gửi, Đăng nhập, Kiểm tra lừa đảo), active tab |
| `brand-hover` | `#B91C72` | `hover:bg-[#B91C72]` | Trạng thái hover của nút chính |
| `brand-soft` | `#FDF2F8` | `bg-pink-50` | Nền nhấn nhẹ, bong bóng chat của bản thân hoặc thẻ highlight |
| `brand-border` | `#FBCFE8` | `border-pink-200` | Viền thẻ nổi bật thương hiệu |

### 2.2. Màu nền & Trung tính (Neutrals)
| Token | Hex | Tailwind Class gợi ý | Mục đích sử dụng |
|---|---|---|---|
| `bg-app` | `#F8FAFC` | `bg-slate-50` | Nền tổng thể toàn trang |
| `bg-surface` | `#FFFFFF` | `bg-white` | Nền khung chat, Sidebar, Modal, Card |
| `bg-subtle` | `#F1F5F9` | `bg-slate-100` | Nền tin nhắn của đối phương, ô input, hover item |
| `text-primary` | `#0F172A` | `text-slate-900` | Tiêu đề, nội dung tin nhắn chính |
| `text-secondary` | `#475569` | `text-slate-600` | Mô tả phụ, timestamp, label |
| `border-default` | `#E2E8F0` | `border-slate-200` | Đường chia khung chat, viền input & card |

### 2.3. Màu trạng thái rủi ro AI (Semantic Risk Colors — Bắt buộc nhất quán)
| Mức độ | Điểm | Nền (`bg`) | Chữ (`text`) | Viền (`border`) | Màu nhấn (`accent`) |
|---|---|---|---|---|---|
| **An toàn (`low`)** | `< 30` | `#ECFDF5` (`bg-emerald-50`) | `#065F46` (`text-emerald-800`) | `#6EE7B7` (`border-emerald-300`) | `#10B981` (`emerald-500`) |
| **Nghi ngờ (`medium`)** | `30 - 69` | `#FFFBEB` (`bg-amber-50`) | `#92400E` (`text-amber-800`) | `#FCD34D` (`border-amber-300`) | `#F59E0B` (`amber-500`) |
| **Nguy hiểm (`high`)** | `>= 70` / Blacklist | `#FEF2F2` (`bg-red-50`) | `#991B1B` (`text-red-800`) | `#FCA5A5` (`border-red-300`) | `#EF4444` (`red-500`) |

---

## 3. Typography (Chữ viết)
- **Font chính (UI & Tiếng Việt):** `'Plus Jakarta Sans', 'Inter', system-ui, sans-serif` (hỗ trợ chuẩn dấu tiếng Việt).
- **Font Monospace (Số tài khoản, Mã BIN, Điểm số, URL):** `'JetBrains Mono', monospace`.
- **Phân cấp kích thước:**
  - Tiêu đề trang (`h1`): `20px` – `24px`, `font-bold` (`text-xl font-bold`).
  - Tiêu đề Modal / Card (`h2`): `16px` – `18px`, `font-semibold` (`text-base font-semibold`).
  - Nội dung tin nhắn & văn bản chính: `14px` – `15px`, `leading-relaxed` (`text-sm`).
  - Nhãn phụ / Thời gian: `12px` (`text-xs`).

---

## 4. Hình khối, Bo góc & Bóng đổ (Shapes & Elevation)
- **Border Radius:**
  - Card & Modal: `rounded-2xl` (`16px`).
  - Button & Input: `rounded-xl` (`12px`).
  - Bong bóng tin nhắn (`MessageBubble`): `rounded-2xl` (góc phía người gửi thu nhỏ `rounded-br-sm` hoặc `rounded-bl-sm`).
  - Badge cảnh báo / Tag: `rounded-full` (`9999px`).
- **Shadow:**
  - Card thông thường: `shadow-sm border border-slate-200`.
  - Modal kết quả AI / Privacy Confirm: `shadow-2xl`.

---

## 5. CSS Variables mẫu (`client/src/index.css`)
```css
@layer base {
  :root {
    --brand-primary: #D82D8B;
    --brand-hover: #B91C72;
    --brand-soft: #FDF2F8;
    --bg-app: #F8FAFC;
    --bg-surface: #FFFFFF;
    --risk-low: #10B981;
    --risk-medium: #F59E0B;
    --risk-high: #EF4444;
  }

  body {
    background-color: var(--bg-app);
    color: #0F172A;
    font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
  }
}
```
