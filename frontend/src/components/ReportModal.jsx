import { useEffect, useState } from 'react';
import { Flag, LoaderCircle, X } from 'lucide-react';

export const REPORT_REASONS = [
  { value: 'impersonation', label: 'Giả danh tổ chức, ngân hàng, cơ quan chức năng' },
  { value: 'job_scam', label: 'Lừa đảo tuyển CTV / việc làm online' },
  { value: 'investment_scam', label: 'Lừa đảo đầu tư, hứa hẹn lãi suất cao' },
  { value: 'phishing', label: 'Gửi link giả mạo, đánh cắp OTP / mật khẩu' },
  { value: 'other', label: 'Hình thức lừa đảo hoặc hành vi đáng ngờ khác' },
];

const MAX_EVIDENCE = 5;

function formatMessagePreview(msg) {
  if (msg.content && msg.content.trim()) return msg.content;
  if (msg.qrData?.isVietQR) {
    const bank = msg.qrData.bankName || 'Ngân hàng';
    const stk = msg.qrData.accountNumber || '---';
    return `[Ảnh QR ${bank} - STK: ${stk}]`;
  }
  return '[Hình ảnh]';
}

export default function ReportModal({
  isOpen,
  targetUser,
  messages = [],
  submitting = false,
  serverError = '',
  onSubmit,
  onClose,
}) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceMessageIds, setEvidenceMessageIds] = useState([]);
  const [reasonError, setReasonError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setDescription('');
      setEvidenceMessageIds([]);
      setReasonError('');
    }
  }, [isOpen, targetUser?.id, targetUser?._id]);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !submitting) {
        onClose?.();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const recentMessages = messages.slice(-MAX_EVIDENCE);

  function toggleEvidence(id) {
    setEvidenceMessageIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= MAX_EVIDENCE) return prev;
      return [...prev, id];
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    if (!reason) {
      setReasonError('Vui lòng chọn lý do báo cáo.');
      return;
    }

    onSubmit?.({
      reportedUserId: targetUser?.id || targetUser?._id || '',
      reason,
      description: description.trim(),
      evidenceMessageIds,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-risk-high-bg text-risk-high-accent">
              <Flag className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="report-modal-title" className="text-base font-semibold text-slate-900">
                Báo cáo tài khoản
              </h2>
              {targetUser?.username && (
                <p className="text-xs text-slate-600">
                  Tài khoản bị báo cáo: <span className="font-semibold text-slate-900">{targetUser.username}</span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng hộp thoại báo cáo"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            {serverError && (
              <div
                role="alert"
                className="rounded-xl border border-risk-high-border bg-risk-high-bg px-3 py-2 text-sm text-risk-high-text"
              >
                {serverError}
              </div>
            )}

            <fieldset>
              <legend className="text-sm font-medium text-slate-900">Lý do báo cáo</legend>
              <div className="mt-2 space-y-2">
                {REPORT_REASONS.map((item) => (
                  <label
                    key={item.value}
                    className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors duration-200 ${
                      reason === item.value
                        ? 'border-brand-primary bg-brand-soft text-slate-900'
                        : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={item.value}
                      checked={reason === item.value}
                      onChange={() => {
                        setReason(item.value);
                        if (reasonError) setReasonError('');
                      }}
                      className="h-4 w-4 accent-brand-primary"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
              {reasonError && (
                <p role="alert" className="mt-1.5 text-xs text-risk-high-text">
                  {reasonError}
                </p>
              )}
            </fieldset>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="report-description" className="text-sm font-medium text-slate-900">
                  Mô tả chi tiết (không bắt buộc)
                </label>
                <span className="font-mono text-xs text-slate-600">{description.length}/500</span>
              </div>
              <textarea
                id="report-description"
                rows={3}
                maxLength={500}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ví dụ: Đối phương gửi link giả mạo và yêu cầu nhập mã OTP..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-900">
                Đính kèm tin nhắn làm bằng chứng (tối đa {MAX_EVIDENCE} tin gần nhất)
              </p>
              {recentMessages.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {recentMessages.map((msg, index) => {
                    const msgId = String(msg._id || msg.id || index);
                    const checked = evidenceMessageIds.includes(msgId);
                    return (
                      <label
                        key={msgId}
                        className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 hover:bg-slate-100"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEvidence(msgId)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-primary"
                        />
                        <span className="line-clamp-2 leading-relaxed">{formatMessagePreview(msg)}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-slate-600">Chưa có tin nhắn nào trong cuộc trò chuyện này.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-risk-high-accent px-4 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Đang gửi báo cáo...
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4" aria-hidden="true" />
                  Gửi báo cáo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
