import { AlertTriangle } from 'lucide-react';

export default function FlaggedBanner({ user }) {
  if (!user?.isFlagged) return null;

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-risk-high-border bg-risk-high-bg px-4 py-2.5 text-sm text-risk-high-text"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-risk-high-accent" aria-hidden="true" />
        <span className="font-medium">
          Tài khoản này đã bị nhiều người dùng báo cáo. Hãy thận trọng khi giao dịch.
        </span>
      </div>
      {user.reportCount > 0 && (
        <span className="rounded-full border border-risk-high-border bg-white px-2.5 py-0.5 font-mono text-xs font-semibold text-risk-high-text">
          {user.reportCount} báo cáo
        </span>
      )}
    </div>
  );
}
