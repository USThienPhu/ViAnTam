// Minh họa cho empty state của ChatPage: hai bong bóng chat và huy hiệu khiên bảo vệ (màu theo docs/theme.md).
export default function ChatEmptyIllustration({ className = '' }) {
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label="Minh họa cuộc trò chuyện được bảo vệ"
      className={className}
      fill="none"
    >
      <rect x="16" y="20" width="132" height="58" rx="16" className="fill-brand-soft stroke-brand-border" strokeWidth="2" />
      <rect x="32" y="36" width="84" height="8" rx="4" className="fill-brand-border" />
      <rect x="32" y="54" width="56" height="8" rx="4" className="fill-brand-border" />

      <rect x="92" y="92" width="132" height="48" rx="16" className="fill-slate-100 stroke-slate-200" strokeWidth="2" />
      <rect x="108" y="106" width="84" height="8" rx="4" className="fill-slate-200" />
      <rect x="108" y="122" width="48" height="8" rx="4" className="fill-slate-200" />

      <circle cx="196" cy="42" r="26" className="fill-brand-primary" />
      <path d="M196 27 L210 32 V42 C210 51 204 57 196 61 C188 57 182 51 182 42 V32 Z" className="fill-white" />
      <path
        d="M189.5 42 L194.5 47 L203 37"
        className="stroke-brand-primary"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
