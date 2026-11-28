import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';

// Khai báo tên class đầy đủ để Tailwind v4 sinh CSS cho từng mức rủi ro.
const RISK_STYLES = {
  low: {
    label: 'Thấp',
    heading: 'Chưa phát hiện dấu hiệu lừa đảo',
    card: 'border-risk-low-border bg-risk-low-bg text-risk-low-text',
    badge: 'border-risk-low-border bg-white text-risk-low-text',
    bar: 'bg-risk-low-accent',
    iconColor: 'text-risk-low-accent',
    Icon: ShieldCheck,
  },
  medium: {
    label: 'Trung bình',
    heading: 'Cần xác minh thêm dấu hiệu nghi ngờ',
    card: 'border-risk-medium-border bg-risk-medium-bg text-risk-medium-text',
    badge: 'border-risk-medium-border bg-white text-risk-medium-text',
    bar: 'bg-risk-medium-accent',
    iconColor: 'text-risk-medium-accent',
    Icon: AlertTriangle,
  },
  high: {
    label: 'Cao',
    heading: 'Cảnh báo rủi ro lừa đảo cao',
    card: 'border-risk-high-border bg-risk-high-bg text-risk-high-text',
    badge: 'border-risk-high-border bg-white text-risk-high-text',
    bar: 'bg-risk-high-accent',
    iconColor: 'text-risk-high-accent',
    Icon: ShieldAlert,
  },
};

export default function ScamResultModal({
  isOpen,
  result,
  loading = false,
  error = '',
  targetUsername = '',
  onClose,
  onBlockAndReport,
  onContinueAnyway,
  onFeedback,
  feedbackSubmitting = false,
  clarifySlot = null,
}) {
  const [countdown, setCountdown] = useState(0);

  const isHighRisk = Boolean(isOpen && !loading && !error && result?.riskLevel === 'high');

  useEffect(() => {
    if (!isHighRisk) {
      setCountdown(0);
      return undefined;
    }

    setCountdown(3);
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isHighRisk, result?._id, result?.finalScore]);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !loading) {
        onClose?.();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const score = Math.max(0, Math.min(100, Number(result?.finalScore ?? result?.initialScore ?? 0)));
  const riskStyle = RISK_STYLES[result?.riskLevel] || RISK_STYLES.medium;
  const RiskIcon = riskStyle.Icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scam-result-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="scam-result-title" className="text-base font-semibold text-slate-900">
              Kết quả kiểm tra lừa đảo
            </h2>
            {targetUsername && (
              <p className="text-xs text-slate-600">
                Đối tượng kiểm tra: <span className="font-semibold text-slate-900">{targetUsername}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng kết quả kiểm tra"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
              <LoaderCircle className="h-8 w-8 animate-spin text-brand-primary" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-slate-900">
                Đang phân tích hội thoại &amp; giải mã QR...
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Hệ thống đang đối chiếu link, mã QR và phân tích ngữ cảnh tin nhắn.
              </p>
            </div>
          )}

          {!loading && error && (
            <div
              role="alert"
              className="rounded-2xl border border-risk-high-border bg-risk-high-bg p-4 text-sm text-risk-high-text"
            >
              <p className="font-semibold">Không thể hoàn tất kiểm tra</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && result && (
            <>
              <div className={`rounded-2xl border p-4 ${riskStyle.card}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <RiskIcon className={`h-6 w-6 shrink-0 ${riskStyle.iconColor}`} aria-hidden="true" />
                    <div>
                      <p className="text-base font-semibold">{riskStyle.heading}</p>
                      <p className="text-xs opacity-90">
                        Loại nghi ngờ: <span className="font-semibold">{result.scamType || 'Chưa xác định'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskStyle.badge}`}>
                      Mức rủi ro: {riskStyle.label}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 font-mono text-sm font-bold text-slate-900">
                      {score}/100
                    </span>
                  </div>
                </div>

                <div
                  className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/80"
                  role="progressbar"
                  aria-valuenow={score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Điểm rủi ro"
                >
                  <div className={`h-full rounded-full ${riskStyle.bar}`} style={{ width: `${score}%` }} />
                </div>
              </div>

              {result.analysisSource === 'heuristic' && (
                <div className="flex items-start gap-2 rounded-xl border border-risk-medium-border bg-risk-medium-bg px-3.5 py-2.5 text-xs text-risk-medium-text">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-risk-medium-accent" aria-hidden="true" />
                  <span>Hệ thống AI đang bận, đây là đánh giá nhanh từ bộ lọc kỹ thuật.</span>
                </div>
              )}

              {result.scoreChangeReason && (
                <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
                  <span>{result.scoreChangeReason}</span>
                </div>
              )}

              <section aria-labelledby="suspicious-signs-heading">
                <h3 id="suspicious-signs-heading" className="text-sm font-semibold text-slate-900">
                  Dấu hiệu đáng ngờ
                </h3>
                {result.suspiciousSigns?.length > 0 ? (
                  <ul className="mt-2 space-y-2.5">
                    {result.suspiciousSigns.map((sign, index) => (
                      <li key={index} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                        {sign.quote && (
                          <blockquote className="rounded-lg border-l-2 border-slate-300 bg-slate-100 px-3 py-1.5 text-xs italic text-slate-900">
                            &ldquo;{sign.quote}&rdquo;
                          </blockquote>
                        )}
                        <p className="mt-1.5 leading-relaxed text-slate-600">{sign.explanation}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
                    Chưa ghi nhận trích dẫn dấu hiệu đáng ngờ nổi bật trong đoạn hội thoại gần nhất.
                  </p>
                )}
              </section>

              <section aria-labelledby="advice-heading">
                <h3 id="advice-heading" className="text-sm font-semibold text-slate-900">
                  Lời khuyên hành động
                </h3>
                {result.advice?.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-900">
                    {result.advice.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 leading-relaxed">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">
                    Luôn kiểm tra kỹ thông tin người nhận trước khi chuyển tiền hoặc chia sẻ mã OTP.
                  </p>
                )}
              </section>

              {clarifySlot}

              {!clarifySlot &&
                result.riskLevel === 'medium' &&
                result.clarificationQuestions?.length > 0 && (
                  <section
                    aria-labelledby="clarify-preview-heading"
                    className="rounded-2xl border border-risk-medium-border bg-risk-medium-bg p-4"
                  >
                    <h3 id="clarify-preview-heading" className="text-sm font-semibold text-risk-medium-text">
                      Câu hỏi làm rõ (vùng nghi ngờ 30 – 69 điểm)
                    </h3>
                    <p className="mt-1 text-xs text-risk-medium-text">
                      Trả lời tối đa 3 câu hỏi xác minh để cập nhật mức rủi ro chính xác hơn.
                    </p>
                    <ol className="mt-2.5 space-y-2 text-sm text-slate-900">
                      {result.clarificationQuestions.slice(0, 3).map((q, idx) => (
                        <li key={q.questionCode || idx} className="rounded-xl bg-white px-3 py-2 text-xs font-medium">
                          {idx + 1}. {q.questionText}
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
            </>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          {!loading && !error && result && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600">Kết quả này có chính xác?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={feedbackSubmitting}
                    onClick={() => onFeedback?.(result._id, 'accurate')}
                    className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors duration-200 ${
                      result.userFeedback === 'accurate'
                        ? 'border-risk-low-border bg-risk-low-bg text-risk-low-text'
                        : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                    Đúng
                  </button>
                  <button
                    type="button"
                    disabled={feedbackSubmitting}
                    onClick={() => onFeedback?.(result._id, 'inaccurate')}
                    className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors duration-200 ${
                      result.userFeedback === 'inaccurate'
                        ? 'border-risk-high-border bg-risk-high-bg text-risk-high-text'
                        : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                    Sai
                  </button>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-600">
                Lưu ý: Kết quả chỉ mang tính tham khảo của AI, không thay thế kết luận của cơ quan chức năng hoặc ngân hàng.
              </p>
            </>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {isHighRisk ? (
              <>
                <button
                  type="button"
                  disabled={countdown > 0}
                  onClick={() => (onContinueAnyway ? onContinueAnyway() : onClose?.())}
                  className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {countdown > 0
                    ? `Tôi đã kiểm tra và vẫn muốn tiếp tục (${countdown}s...)`
                    : 'Tôi đã kiểm tra và vẫn muốn tiếp tục'}
                </button>
                <button
                  type="button"
                  onClick={() => onBlockAndReport?.()}
                  className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-risk-high-accent px-4 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90"
                >
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  Chặn &amp; Báo cáo ngay
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
