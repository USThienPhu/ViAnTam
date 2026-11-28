import { useEffect, useState } from 'react';
import { Ban, CheckCircle2, Flag, ShieldCheck, UserCheck, X } from 'lucide-react';
import PrivacyConfirmModal from './PrivacyConfirmModal';
import ScamResultModal from './ScamResultModal';
import ReportModal from './ReportModal';

// Dữ liệu mẫu dùng trong Ngày 1 (W3-1.2) để kiểm tra đủ 3 trạng thái low/medium/high trước khi ghép API Ngày 2.
function createMockScamResult(targetUser, messages) {
  const combinedText = messages.map((m) => m.content || '').join(' ').toLowerCase();
  const hasBlacklistedQr = messages.some((m) => m.qrData?.accountNumber === '123456789');

  if (
    targetUser?.isFlagged ||
    hasBlacklistedQr ||
    /otp|m0mo|xac minh|khoa vinh vien|chuyen ngay/.test(combinedText)
  ) {
    return {
      _id: `mock-high-${Date.now()}`,
      initialScore: 88,
      finalScore: 88,
      riskLevel: 'high',
      scamType: 'Giả danh hỗ trợ ví điện tử / Phishing',
      analysisSource: 'llm',
      suspiciousSigns: [
        {
          quote: 'Truy cập đường dẫn lạ và chuyển tiền xác minh trong 10 phút',
          explanation: 'Tạo áp lực thời gian khẩn cấp kết hợp tên miền giả mạo và yêu cầu chuyển khoản.',
        },
      ],
      advice: [
        'Tuyệt đối không bấm vào đường link lạ, không cung cấp mã OTP hoặc mật khẩu.',
        'Không chuyển tiền xác minh qua mã QR do người lạ gửi.',
        'Nên chặn và báo cáo tài khoản này ngay để bảo vệ cộng đồng.',
      ],
      clarificationQuestions: [],
      userFeedback: null,
    };
  }

  if (/ctv|hoa hong|ung truoc|nap tien|don hang/.test(combinedText)) {
    return {
      _id: `mock-medium-${Date.now()}`,
      initialScore: 52,
      finalScore: 52,
      riskLevel: 'medium',
      scamType: 'Nghi ngờ lừa đảo việc làm online',
      analysisSource: 'llm',
      suspiciousSigns: [
        {
          quote: 'Ứng trước một khoản nhỏ rồi nhận lại cả gốc lẫn hoa hồng',
          explanation: 'Dấu hiệu phổ biến của kịch bản tuyển cộng tác viên xử lý đơn hàng.',
        },
      ],
      advice: [
        'Không nạp tiền hoặc chuyển khoản trước để nhận việc hay rút hoa hồng.',
        'Xác minh thông tin doanh nghiệp qua kênh liên hệ chính thức.',
      ],
      clarificationQuestions: [
        {
          questionCode: 'deposit_for_job',
          questionText: 'Bạn có phải nạp/chuyển tiền trước để được nhận việc hoặc rút tiền công?',
        },
        {
          questionCode: 'secret_or_urgent',
          questionText: 'Họ có yêu cầu bạn giữ bí mật hoặc phải chuyển tiền ngay trong hôm nay?',
        },
        {
          questionCode: 'contact_first',
          questionText: 'Đối phương chủ động liên hệ bạn trước phải không?',
        },
      ],
      userFeedback: null,
    };
  }

  return {
    _id: `mock-low-${Date.now()}`,
    initialScore: 12,
    finalScore: 12,
    riskLevel: 'low',
    scamType: 'Không phát hiện dấu hiệu lừa đảo',
    analysisSource: 'llm',
    suspiciousSigns: [],
    advice: [
      'Nội dung trò chuyện hiện chưa có dấu hiệu bất thường.',
      'Vẫn nên đối chiếu tên người nhận trước khi thực hiện giao dịch chuyển tiền.',
    ],
    clarificationQuestions: [],
    userFeedback: null,
  };
}

export default function ChatSafetyActions({ targetUser, messages = [], onBlockChange }) {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scamResult, setScamResult] = useState(null);
  const [isBlocked, setIsBlocked] = useState(Boolean(targetUser?.isBlockedByMe));
  const [toast, setToast] = useState('');

  useEffect(() => {
    setIsBlocked(Boolean(targetUser?.isBlockedByMe));
    setPrivacyOpen(false);
    setResultOpen(false);
    setReportOpen(false);
    setScamResult(null);
    setToast('');
  }, [targetUser?.id, targetUser?._id, targetUser?.isBlockedByMe]);

  if (!targetUser) return null;

  const hasMessages = messages.length > 0;

  function handleConfirmPrivacy() {
    setAnalyzing(true);
    setPrivacyOpen(false);
    setResultOpen(true);

    // Giả lập kết quả tức thì ở Ngày 1; Ngày 2 (W3-2.1) thay bằng POST /api/scam-check/analyze.
    const mock = createMockScamResult(targetUser, messages);
    setScamResult(mock);
    setAnalyzing(false);
  }

  function handleToggleBlock() {
    const nextBlocked = !isBlocked;
    setIsBlocked(nextBlocked);
    onBlockChange?.(nextBlocked);
    setToast(nextBlocked ? 'Đã chặn người dùng này.' : 'Đã bỏ chặn người dùng này.');
  }

  function handleBlockAndReport() {
    if (!isBlocked) {
      setIsBlocked(true);
      onBlockChange?.(true);
    }
    setResultOpen(false);
    setReportOpen(true);
  }

  function handleFeedback(_checkId, feedback) {
    setScamResult((prev) => (prev ? { ...prev, userFeedback: feedback } : prev));
    setToast('Đã ghi nhận phản hồi của bạn về kết quả AI.');
  }

  function handleSubmitReport() {
    setReportOpen(false);
    setToast('Đã gửi báo cáo tài khoản thành công.');
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPrivacyOpen(true)}
          disabled={!hasMessages}
          title={!hasMessages ? 'Cần ít nhất 1 tin nhắn để kiểm tra' : 'Kiểm tra dấu hiệu lừa đảo bằng AI'}
          className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-brand-primary px-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Kiểm tra lừa đảo
        </button>

        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-slate-100"
        >
          <Flag className="h-4 w-4 text-slate-600" aria-hidden="true" />
          Báo cáo
        </button>

        <button
          type="button"
          onClick={handleToggleBlock}
          className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors duration-200 ${
            isBlocked
              ? 'border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200'
              : 'border-risk-high-border bg-risk-high-bg text-risk-high-text hover:opacity-90'
          }`}
        >
          {isBlocked ? (
            <>
              <UserCheck className="h-4 w-4" aria-hidden="true" />
              Bỏ chặn
            </>
          ) : (
            <>
              <Ban className="h-4 w-4" aria-hidden="true" />
              Chặn
            </>
          )}
        </button>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-risk-low-accent" aria-hidden="true" />
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast('')}
            aria-label="Đóng thông báo"
            className="ml-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <PrivacyConfirmModal
        isOpen={privacyOpen}
        targetUsername={targetUser.username}
        loading={analyzing}
        onConfirm={handleConfirmPrivacy}
        onCancel={() => setPrivacyOpen(false)}
      />

      <ScamResultModal
        isOpen={resultOpen}
        result={scamResult}
        loading={analyzing}
        targetUsername={targetUser.username}
        onClose={() => setResultOpen(false)}
        onBlockAndReport={handleBlockAndReport}
        onContinueAnyway={() => setResultOpen(false)}
        onFeedback={handleFeedback}
      />

      <ReportModal
        isOpen={reportOpen}
        targetUser={targetUser}
        messages={messages}
        onSubmit={handleSubmitReport}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}
