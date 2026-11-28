import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi } from '../test/mockApi';
import HistoryPage from './HistoryPage';

const CHECKS = [
  {
    _id: 'c1',
    targetUserId: { _id: 't1', username: 'HoTro_MoMo_247' },
    finalScore: 90,
    riskLevel: 'high',
    scamType: 'Giả danh ngân hàng / ví điện tử',
    analysisSource: 'llm',
    userFeedback: null,
    createdAt: '2026-11-28T08:00:00.000Z',
  },
  {
    _id: 'c2',
    targetUserId: { _id: 't2', username: 'TuyenDung_CTV_Online' },
    finalScore: 40,
    riskLevel: 'medium',
    scamType: 'Lừa đảo tuyển cộng tác viên / việc làm',
    analysisSource: 'heuristic',
    userFeedback: 'accurate',
    createdAt: '2026-11-27T08:00:00.000Z',
  },
  {
    _id: 'c3',
    targetUserId: null,
    finalScore: 10,
    riskLevel: 'low',
    scamType: 'Chưa xác định',
    analysisSource: 'llm',
    userFeedback: null,
    createdAt: '2026-11-26T08:00:00.000Z',
  },
];

const item = (text) => screen.getByText(text).closest('li');

describe('HistoryPage', () => {
  it('hiện trạng thái đang tải rồi danh sách có badge điểm và nhãn đánh giá nhanh', async () => {
    mockApi({ 'GET /scam-check/history': () => ({ data: CHECKS }) });
    render(<HistoryPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Lịch sử kiểm tra' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải lịch sử kiểm tra...');

    await screen.findByText('HoTro_MoMo_247');
    expect(within(item('HoTro_MoMo_247')).getByText('Cao · 90 điểm')).toBeInTheDocument();
    expect(within(item('HoTro_MoMo_247')).queryByText('Đánh giá nhanh')).not.toBeInTheDocument();
    expect(within(item('TuyenDung_CTV_Online')).getByText('Trung bình · 40 điểm')).toBeInTheDocument();
    expect(within(item('TuyenDung_CTV_Online')).getByText('Đánh giá nhanh')).toBeInTheDocument();
  });

  it('đối phương đã bị xóa vẫn hiển thị với tên thay thế', async () => {
    mockApi({ 'GET /scam-check/history': () => ({ data: CHECKS }) });
    render(<HistoryPage />);
    await screen.findByText('Người dùng không còn tồn tại');
    expect(within(item('Người dùng không còn tồn tại')).getByText('Thấp · 10 điểm')).toBeInTheDocument();
  });

  it('chưa có lần kiểm tra nào thì hiện trạng thái trống', async () => {
    mockApi({ 'GET /scam-check/history': () => ({ data: [] }) });
    render(<HistoryPage />);
    expect(await screen.findByText('Bạn chưa thực hiện lần kiểm tra nào.')).toBeInTheDocument();
  });

  it('lỗi tải thì hiện thông báo và nút Thử lại tải lại được', async () => {
    let attempt = 0;
    mockApi({
      'GET /scam-check/history': () => {
        attempt += 1;
        return attempt === 1 ? { status: 500, data: { message: 'Máy chủ đang bận.' } } : { data: [] };
      },
    });
    render(<HistoryPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Bạn chưa thực hiện lần kiểm tra nào.')).toBeInTheDocument();
  });

  it('bấm Đúng gửi feedback accurate và cập nhật ngay', async () => {
    const calls = mockApi({
      'GET /scam-check/history': () => ({ data: CHECKS }),
      'POST /scam-check/c1/feedback': () => ({ data: { ...CHECKS[0], userFeedback: 'accurate' } }),
    });
    render(<HistoryPage />);
    await screen.findByText('HoTro_MoMo_247');
    await userEvent.click(within(item('HoTro_MoMo_247')).getByRole('button', { name: 'Đúng' }));

    expect(await within(item('HoTro_MoMo_247')).findByText('Bạn đã đánh giá: Chính xác')).toBeInTheDocument();
    expect(within(item('HoTro_MoMo_247')).queryByRole('button', { name: 'Đúng' })).not.toBeInTheDocument();
    const post = calls.find((c) => c.key === 'POST /scam-check/c1/feedback');
    expect(post.body).toEqual({ feedback: 'accurate' });
  });

  it('bấm Sai gửi feedback inaccurate', async () => {
    const calls = mockApi({
      'GET /scam-check/history': () => ({ data: CHECKS }),
      'POST /scam-check/c3/feedback': () => ({ data: { ...CHECKS[2], userFeedback: 'inaccurate' } }),
    });
    render(<HistoryPage />);
    await screen.findByText('Người dùng không còn tồn tại');
    await userEvent.click(within(item('Người dùng không còn tồn tại')).getByRole('button', { name: 'Sai' }));
    expect(await screen.findByText('Bạn đã đánh giá: Chưa chính xác')).toBeInTheDocument();
    expect(calls.find((c) => c.key === 'POST /scam-check/c3/feedback').body).toEqual({ feedback: 'inaccurate' });
  });

  it('gửi feedback lỗi thì báo lỗi và giữ nguyên nút', async () => {
    mockApi({
      'GET /scam-check/history': () => ({ data: CHECKS }),
      'POST /scam-check/c1/feedback': () => ({ status: 404, data: { message: 'Không tìm thấy lần kiểm tra.' } }),
    });
    render(<HistoryPage />);
    await screen.findByText('HoTro_MoMo_247');
    await userEvent.click(within(item('HoTro_MoMo_247')).getByRole('button', { name: 'Đúng' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy lần kiểm tra.');
    expect(within(item('HoTro_MoMo_247')).getByRole('button', { name: 'Đúng' })).toBeInTheDocument();
  });

  it('bản ghi đã có feedback thì hiện kết quả, không hiện nút', async () => {
    mockApi({ 'GET /scam-check/history': () => ({ data: CHECKS }) });
    render(<HistoryPage />);
    await screen.findByText('TuyenDung_CTV_Online');
    const row = item('TuyenDung_CTV_Online');
    expect(within(row).getByText('Bạn đã đánh giá: Chính xác')).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Đúng' })).not.toBeInTheDocument();
  });
});
