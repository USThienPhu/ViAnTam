import { useEffect } from 'react';
import { LoaderCircle, LockKeyhole, ShieldCheck, X } from 'lucide-react';

export default function PrivacyConfirmModal({
  isOpen,
  targetUsername = '',
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !loading) {
        onCancel?.();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-confirm-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-primary">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="privacy-confirm-title" className="text-base font-semibold text-slate-900">
                Xác nhận kiểm tra lừa đảo bằng AI
              </h2>
              {targetUsername && (
                <p className="text-xs text-slate-600">
                  Cuộc trò chuyện với <span className="font-semibold text-slate-900">{targetUsername}</span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Đóng hộp thoại"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-900">
          Nội dung 20-30 tin nhắn gần nhất sẽ được gửi tới hệ thống AI để phân tích tham khảo. Bạn có đồng ý?
        </p>

        <ul className="mt-3 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <li>• Chỉ đọc và phân tích khi bạn chủ động bấm kiểm tra.</li>
          <li>• Không gửi mật khẩu, token đăng nhập hoặc các cuộc trò chuyện khác.</li>
          <li>• Kết quả chỉ mang tính tham khảo hỗ trợ nhận biết rủi ro.</li>
        </ul>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                Đang phân tích hội thoại &amp; giải mã QR...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Xác nhận
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
