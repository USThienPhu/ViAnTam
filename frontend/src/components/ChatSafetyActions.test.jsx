import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FlaggedBanner from './FlaggedBanner';
import PrivacyConfirmModal from './PrivacyConfirmModal';
import ScamResultModal from './ScamResultModal';
import ReportModal, { REPORT_REASONS } from './ReportModal';
import ChatSafetyActions from './ChatSafetyActions';

afterEach(() => {
  vi.useRealTimers();
});

describe('FlaggedBanner', () => {
  it('ẩn khi user chưa bị gắn cờ và hiện cảnh báo + số báo cáo khi isFlagged = true', () => {
    const { rerender } = render(<FlaggedBanner user={{ username: 'an_toan', isFlagged: false, reportCount: 1 }} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(<FlaggedBanner user={{ username: 'HoTro_MoMo_247', isFlagged: true, reportCount: 4 }} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Tài khoản này đã bị nhiều người dùng báo cáo. Hãy thận trọng khi giao dịch.');
    expect(alert).toHaveTextContent('4 báo cáo');
  });
});

describe('ScamResultModal', () => {
  const baseResult = {
    _id: 'sc1',
    initialScore: 15,
    finalScore: 15,
    riskLevel: 'low',
    scamType: 'Không phát hiện dấu hiệu lừa đảo',
    suspiciousSigns: [],
    advice: ['Kiểm tra kỹ tên người nhận trước khi chuyển tiền.'],
    clarificationQuestions: [],
    userFeedback: null,
  };

  it('hiển thị đúng mức Thấp, Trung bình, Cao và lưu ý tham khảo AI', () => {
    const { rerender } = render(<ScamResultModal isOpen result={baseResult} onClose={vi.fn()} />);
    expect(screen.getByText('Mức rủi ro: Thấp')).toBeInTheDocument();
    expect(screen.getByText('15/100')).toBeInTheDocument();
    expect(screen.getByText(/Kết quả chỉ mang tính tham khảo của AI/)).toBeInTheDocument();

    rerender(
      <ScamResultModal
        isOpen
        result={{
          ...baseResult,
          initialScore: 52,
          finalScore: 52,
          riskLevel: 'medium',
          analysisSource: 'heuristic',
          clarificationQuestions: [
            { questionCode: 'deposit_for_job', questionText: 'Bạn có phải nạp tiền trước không?' },
          ],
        }}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Mức rủi ro: Trung bình')).toBeInTheDocument();
    expect(screen.getByText(/Hệ thống AI đang bận, đây là đánh giá nhanh từ bộ lọc kỹ thuật/)).toBeInTheDocument();
    expect(screen.getByText(/Bạn có phải nạp tiền trước không/)).toBeInTheDocument();
  });

  it('khóa nút "Tôi đã kiểm tra và vẫn muốn tiếp tục" trong 3 giây khi rủi ro Cao', () => {
    vi.useFakeTimers();
    const onContinueAnyway = vi.fn();

    render(
      <ScamResultModal
        isOpen
        result={{
          ...baseResult,
          initialScore: 88,
          finalScore: 88,
          riskLevel: 'high',
          suspiciousSigns: [{ quote: 'Chuyển 500k xác minh', explanation: 'Đòi chuyển tiền khẩn cấp' }],
        }}
        onClose={vi.fn()}
        onContinueAnyway={onContinueAnyway}
        onBlockAndReport={vi.fn()}
      />
    );

    expect(screen.getByText('Mức rủi ro: Cao')).toBeInTheDocument();
    const continueBtn = screen.getByRole('button', { name: /Tôi đã kiểm tra và vẫn muốn tiếp tục/ });
    expect(continueBtn).toBeDisabled();
    expect(continueBtn).toHaveTextContent('3s...');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(continueBtn).toHaveTextContent('2s...');
    expect(continueBtn).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(continueBtn).toBeEnabled();
    expect(continueBtn).toHaveTextContent('Tôi đã kiểm tra và vẫn muốn tiếp tục');

    fireEvent.click(continueBtn);
    expect(onContinueAnyway).toHaveBeenCalledTimes(1);
  });

  it('gọi onFeedback với đúng giá trị accurate / inaccurate', async () => {
    const onFeedback = vi.fn();
    render(<ScamResultModal isOpen result={baseResult} onClose={vi.fn()} onFeedback={onFeedback} />);

    await userEvent.click(screen.getByRole('button', { name: 'Đúng' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sai' }));

    expect(onFeedback).toHaveBeenNthCalledWith(1, 'sc1', 'accurate');
    expect(onFeedback).toHaveBeenNthCalledWith(2, 'sc1', 'inaccurate');
  });
});

describe('ReportModal', () => {
  const targetUser = { id: 'u-scam', username: 'HoTro_MoMo_247' };
  const sampleMessages = Array.from({ length: 7 }, (_, i) => ({
    _id: `m${i + 1}`,
    content: `Tin nhắn số ${i + 1}`,
  }));

  it('hiển thị đủ 5 lý do, bắt buộc chọn lý do và giới hạn tối đa 5 tin nhắn gần nhất làm bằng chứng', async () => {
    const onSubmit = vi.fn();
    render(
      <ReportModal isOpen targetUser={targetUser} messages={sampleMessages} onSubmit={onSubmit} onClose={vi.fn()} />
    );

    expect(screen.getAllByRole('radio')).toHaveLength(REPORT_REASONS.length);
    // Chỉ hiển thị 5 tin nhắn gần nhất (m3..m7)
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    expect(screen.queryByText('Tin nhắn số 1')).not.toBeInTheDocument();

    // Bấm gửi khi chưa chọn lý do
    await userEvent.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));
    expect(screen.getByText('Vui lòng chọn lý do báo cáo.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    // Chọn lý do, nhập mô tả và chọn 2 tin bằng chứng
    await userEvent.click(screen.getByLabelText(/Gửi link giả mạo/));
    await userEvent.type(screen.getByLabelText(/Mô tả chi tiết/), '  Gửi link lừa đảo  ');
    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);
    await userEvent.click(checkboxes[4]);

    await userEvent.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));

    expect(onSubmit).toHaveBeenCalledWith({
      reportedUserId: 'u-scam',
      reason: 'phishing',
      description: 'Gửi link lừa đảo',
      evidenceMessageIds: ['m3', 'm7'],
    });
  });
});

describe('ChatSafetyActions', () => {
  it('khóa nút Kiểm tra lừa đảo khi chưa có tin nhắn và bắt buộc qua PrivacyConfirmModal khi có tin nhắn', async () => {
    const targetUser = { id: 'u2', username: 'HoTro_MoMo_247', isFlagged: true, isBlockedByMe: false };
    const { rerender } = render(<ChatSafetyActions targetUser={targetUser} messages={[]} />);

    expect(screen.getByRole('button', { name: 'Kiểm tra lừa đảo' })).toBeDisabled();

    const messages = [{ _id: 'm1', content: 'Truy cập http://m0mo-xacminh.xyz và nhập OTP' }];
    rerender(<ChatSafetyActions targetUser={targetUser} messages={messages} />);

    const checkBtn = screen.getByRole('button', { name: 'Kiểm tra lừa đảo' });
    expect(checkBtn).toBeEnabled();
    await userEvent.click(checkBtn);

    // Luôn hiện PrivacyConfirmModal trước
    expect(
      screen.getByRole('heading', { name: 'Xác nhận kiểm tra lừa đảo bằng AI' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Nội dung 20-30 tin nhắn gần nhất sẽ được gửi tới hệ thống AI/)
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    expect(screen.getByRole('heading', { name: 'Kết quả kiểm tra lừa đảo' })).toBeInTheDocument();
    expect(screen.getByText('Mức rủi ro: Cao')).toBeInTheDocument();
  });

  it('nút Chặn / Bỏ chặn gọi onBlockChange và cập nhật trạng thái', async () => {
    const onBlockChange = vi.fn();
    const targetUser = { id: 'u3', username: 'TuyenDung_CTV_Online', isBlockedByMe: false };
    render(<ChatSafetyActions targetUser={targetUser} messages={[]} onBlockChange={onBlockChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Chặn' }));
    expect(onBlockChange).toHaveBeenNthCalledWith(1, true);
    expect(screen.getByRole('button', { name: 'Bỏ chặn' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Bỏ chặn' }));
    expect(onBlockChange).toHaveBeenNthCalledWith(2, false);
    expect(screen.getByRole('button', { name: 'Chặn' })).toBeInTheDocument();
  });

  it('PrivacyConfirmModal cho phép hủy bỏ kiểm tra', async () => {
    const onCancel = vi.fn();
    render(<PrivacyConfirmModal isOpen targetUsername="demo" onConfirm={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
