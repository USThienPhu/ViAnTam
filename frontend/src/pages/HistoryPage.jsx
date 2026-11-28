import { useCallback, useEffect, useState } from 'react';
import { History, Loader2, RotateCcw, ThumbsDown, ThumbsUp } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import getErrorMessage from '../api/getErrorMessage';

const RISK_STYLES = {
  low: { label: 'Thấp', className: 'bg-risk-low-bg text-risk-low-text border-risk-low-border' },
  medium: { label: 'Trung bình', className: 'bg-risk-medium-bg text-risk-medium-text border-risk-medium-border' },
  high: { label: 'Cao', className: 'bg-risk-high-bg text-risk-high-text border-risk-high-border' },
};
const FEEDBACK_LABELS = { accurate: 'Chính xác', inaccurate: 'Chưa chính xác' };

function formatDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export default function HistoryPage() {
  const [checks, setChecks] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState(null);
  const [feedbackError, setFeedbackError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const { data } = await axiosInstance.get('/scam-check/history');
      setChecks(Array.isArray(data) ? data : []);
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được lịch sử kiểm tra.'));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sendFeedback(id, feedback) {
    setPendingId(id);
    setFeedbackError('');
    try {
      const { data } = await axiosInstance.post(`/scam-check/${id}/feedback`, { feedback });
      setChecks((prev) => prev.map((c) => (c._id === id ? { ...c, userFeedback: data?.userFeedback ?? feedback } : c)));
    } catch (err) {
      setFeedbackError(getErrorMessage(err, 'Không gửi được phản hồi. Vui lòng thử lại.'));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-brand-primary" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-900">Lịch sử kiểm tra</h1>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Lưu ý: Kết quả chỉ mang tính tham khảo của AI, không thay thế kết luận của cơ quan chức năng hoặc ngân hàng.
      </p>

      {status === 'loading' && (
        <div role="status" className="mt-8 flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Đang tải lịch sử kiểm tra...
        </div>
      )}

      {status === 'error' && (
        <div className="mt-8 rounded-2xl border border-risk-high-border bg-risk-high-bg p-4">
          <p role="alert" className="text-sm text-risk-high-text">
            {error}
          </p>
          <button
            type="button"
            onClick={load}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Thử lại
          </button>
        </div>
      )}

      {status === 'ready' && checks.length === 0 && (
        <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
          Bạn chưa thực hiện lần kiểm tra nào.
        </p>
      )}

      {status === 'ready' && checks.length > 0 && (
        <>
          {feedbackError && (
            <p role="alert" className="mt-6 text-sm text-risk-high-text">
              {feedbackError}
            </p>
          )}
          <ul className="mt-6 space-y-3">
            {checks.map((check) => {
              const risk = RISK_STYLES[check.riskLevel] ?? RISK_STYLES.medium;
              const name = check.targetUserId?.username ?? 'Người dùng không còn tồn tại';
              const busy = pendingId === check._id;
              return (
                <li key={check._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{name}</p>
                      <p className="text-xs text-slate-600">{formatDate(check.createdAt)}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 font-mono text-xs font-semibold ${risk.className}`}>
                      {`${risk.label} · ${check.finalScore} điểm`}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span>{check.scamType}</span>
                    {check.analysisSource === 'heuristic' && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Đánh giá nhanh</span>
                    )}
                  </div>
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    {check.userFeedback ? (
                      <p className="text-xs text-slate-600">{`Bạn đã đánh giá: ${FEEDBACK_LABELS[check.userFeedback]}`}</p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-600">Kết quả này có chính xác?</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => sendFeedback(check._id, 'accurate')}
                          className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                          Đúng
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => sendFeedback(check._id, 'inaccurate')}
                          className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                          Sai
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
