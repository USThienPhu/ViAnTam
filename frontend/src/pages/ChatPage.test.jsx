import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatPage from './ChatPage';
import { mockApi } from '../test/mockApi';

const socketMock = vi.hoisted(() => ({
  handlers: null,
  status: 'connected',
  sendMessage: vi.fn(() => true),
}));

vi.mock('../hooks/useChatSocket', () => ({
  default: (handlers) => {
    socketMock.handlers = handlers;
    return { status: socketMock.status, sendMessage: socketMock.sendMessage };
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', username: 'demo_user', role: 'user' }, token: 'tok', logout: vi.fn() }),
}));

const user = (id, username, extra = {}) => ({
  id,
  username,
  reportCount: 0,
  isFlagged: false,
  isBlockedByMe: false,
  hasBlockedMe: false,
  ...extra,
});

const USERS = [
  user('u2', 'ChuTro_AnhMinh'),
  user('u3', 'HoTro_MoMo_247', { isFlagged: true, reportCount: 4 }),
  user('u4', 'TuyenDung_CTV_Online', { isBlockedByMe: true }),
];

const msg = (id, from, content, minute) => ({
  _id: id,
  senderId: from,
  receiverId: from === 'u1' ? 'u2' : 'u1',
  type: 'text',
  content,
  createdAt: `2026-11-28T07:${String(minute).padStart(2, '0')}:00.000Z`,
});

function setup(routes = {}) {
  const calls = mockApi({
    'GET /users': () => ({ data: USERS }),
    'GET /messages/u2': () => ({ data: [] }),
    'GET /messages/u3': () => ({ data: [] }),
    'GET /messages/u4': () => ({ data: [] }),
    ...routes,
  });
  render(<ChatPage />);
  return calls;
}

const openChat = (name) => userEvent.click(screen.getByRole('button', { name: new RegExp(name) }));
const incoming = (message) => act(() => socketMock.handlers.onMessage(message));
const input = () => screen.getByRole('textbox', { name: 'Nhập tin nhắn' });

beforeEach(() => {
  socketMock.status = 'connected';
  socketMock.sendMessage = vi.fn(() => true);
  socketMock.handlers = null;
});

describe('ChatPage: danh sách người dùng', () => {
  it('hiện trạng thái đang tải rồi danh sách, và empty state khi chưa chọn ai', async () => {
    setup();
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải danh sách...');
    expect(await screen.findByRole('button', { name: /ChuTro_AnhMinh/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chọn một cuộc trò chuyện để bắt đầu' })).toBeInTheDocument();
  });

  it('hiện badge Cảnh báo và Đã chặn đúng người', async () => {
    setup();
    const flagged = await screen.findByRole('button', { name: /HoTro_MoMo_247/ });
    const blocked = screen.getByRole('button', { name: /TuyenDung_CTV_Online/ });
    const normal = screen.getByRole('button', { name: /ChuTro_AnhMinh/ });

    expect(within(flagged).getByText('Cảnh báo')).toBeInTheDocument();
    expect(within(blocked).getByText('Đã chặn')).toBeInTheDocument();
    expect(within(normal).queryByText('Cảnh báo')).not.toBeInTheDocument();
    expect(within(normal).queryByText('Đã chặn')).not.toBeInTheDocument();
  });

  it('không có người dùng nào khác thì hiện thông báo trống', async () => {
    setup({ 'GET /users': () => ({ data: [] }) });
    expect(await screen.findByText('Chưa có người dùng nào khác.')).toBeInTheDocument();
  });

  it('tải danh sách lỗi thì hiện lỗi và Thử lại tải lại được', async () => {
    let attempt = 0;
    const calls = setup({
      'GET /users': () => (++attempt === 1 ? { networkError: true } : { data: USERS }),
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối tới máy chủ.');

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByRole('button', { name: /ChuTro_AnhMinh/ })).toBeInTheDocument();
    expect(calls.filter((c) => c.key === 'GET /users')).toHaveLength(2);
  });

  it('tìm kiếm lọc theo username không phân biệt hoa thường', async () => {
    setup();
    await screen.findByRole('button', { name: /ChuTro_AnhMinh/ });

    await userEvent.type(screen.getByRole('searchbox'), 'momo');

    expect(screen.getByRole('button', { name: /HoTro_MoMo_247/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ChuTro_AnhMinh/ })).not.toBeInTheDocument();
  });

  it('tìm không ra thì hiện thông báo', async () => {
    setup();
    await screen.findByRole('button', { name: /ChuTro_AnhMinh/ });
    await userEvent.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('Không tìm thấy người dùng phù hợp.')).toBeInTheDocument();
  });
});

describe('ChatPage: mở cuộc trò chuyện', () => {
  it('chọn người dùng thì tải lịch sử và hiện tin nhắn đúng bên', async () => {
    const calls = setup({
      'GET /messages/u2': () => ({ data: [msg('m1', 'u1', 'Chào anh', 1), msg('m2', 'u2', 'Chào em', 2)] }),
    });
    await screen.findByRole('button', { name: /ChuTro_AnhMinh/ });
    await openChat('ChuTro_AnhMinh');

    expect(await screen.findByText('Chào em')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ChuTro_AnhMinh', level: 2, hidden: false })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Chọn một cuộc trò chuyện để bắt đầu' })).not.toBeInTheDocument();
    const bubbles = screen.getAllByTestId('message-bubble');
    expect(bubbles.map((b) => b.getAttribute('data-mine'))).toEqual(['true', 'false']);
    expect(calls.some((c) => c.key === 'GET /messages/u2')).toBe(true);
  });

  it('đang tải lịch sử thì hiện trạng thái đang tải tin nhắn', async () => {
    setup({ 'GET /messages/u2': () => new Promise(() => {}) });
    await screen.findByRole('button', { name: /ChuTro_AnhMinh/ });
    await openChat('ChuTro_AnhMinh');
    expect(await screen.findByText('Đang tải tin nhắn...')).toBeInTheDocument();
  });

  it('tải lịch sử lỗi thì hiện Thử lại và tải lại được', async () => {
    let attempt = 0;
    setup({
      'GET /messages/u2': () => (++attempt === 1 ? { status: 500, data: { message: 'Đã xảy ra lỗi hệ thống.' } } : { data: [msg('m1', 'u2', 'Đã có tin', 1)] }),
    });
    await screen.findByRole('button', { name: /ChuTro_AnhMinh/ });
    await openChat('ChuTro_AnhMinh');
    expect(await screen.findByText('Đã xảy ra lỗi hệ thống.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByText('Đã có tin')).toBeInTheDocument();
  });

  it('đổi người chat khi lịch sử người trước chưa về: không hiện nhầm tin của người trước', async () => {
    let releaseU2;
    setup({
      'GET /messages/u2': () => new Promise((resolve) => (releaseU2 = () => resolve({ data: [msg('m1', 'u2', 'TIN CỦA ANH MINH', 1)] }))),
      'GET /messages/u3': () => ({ data: [{ ...msg('m2', 'u3', 'Tin của hỗ trợ', 2), receiverId: 'u1' }] }),
    });
    await screen.findByRole('button', { name: /ChuTro_AnhMinh/ });
    await openChat('ChuTro_AnhMinh');
    await openChat('HoTro_MoMo_247');
    expect(await screen.findByText('Tin của hỗ trợ')).toBeInTheDocument();

    await act(async () => releaseU2());

    expect(screen.queryByText('TIN CỦA ANH MINH')).not.toBeInTheDocument();
    expect(screen.getByText('Tin của hỗ trợ')).toBeInTheDocument();
  });

  it('nút quay lại đưa về trạng thái chưa chọn ai', async () => {
    setup();
    await screen.findByRole('button', { name: /ChuTro_AnhMinh/ });
    await openChat('ChuTro_AnhMinh');
    await userEvent.click(await screen.findByRole('button', { name: 'Quay lại danh sách' }));
    expect(screen.getByRole('heading', { name: 'Chọn một cuộc trò chuyện để bắt đầu' })).toBeInTheDocument();
  });

  it('banner cảnh báo hiện với người bị gắn cờ', async () => {
    setup();
    await screen.findByRole('button', { name: /HoTro_MoMo_247/ });
    await openChat('HoTro_MoMo_247');
    expect(await screen.findByText(/đã bị nhiều người dùng báo cáo/)).toBeInTheDocument();
    expect(screen.getByText('4 báo cáo')).toBeInTheDocument();
  });
});

describe('ChatPage: tin nhắn realtime', () => {
  async function openAnhMinh(routes) {
    setup(routes);
    await screen.findByRole('button', { name: /ChuTro_AnhMinh/ });
    await openChat('ChuTro_AnhMinh');
    await screen.findByText('Chưa có tin nhắn nào. Hãy gửi tin nhắn đầu tiên.');
  }

  it('tin mới của cuộc trò chuyện đang mở được thêm vào khung chat', async () => {
    await openAnhMinh();
    incoming(msg('m1', 'u2', 'Em ơi', 1));
    expect(await screen.findByText('Em ơi')).toBeInTheDocument();
  });

  it('tin mình gửi được server phát lại thì hiện bên phải, không bị trùng khi nhận hai lần', async () => {
    await openAnhMinh();
    incoming(msg('m1', 'u1', 'Mình gửi', 1));
    incoming(msg('m1', 'u1', 'Mình gửi', 1));
    expect(await screen.findAllByText('Mình gửi')).toHaveLength(1);
    expect(screen.getByTestId('message-bubble')).toHaveAttribute('data-mine', 'true');
  });

  it('tin đến trong lúc lịch sử đang tải được giữ lại và gộp, không trùng', async () => {
    let release;
    setup({
      'GET /messages/u2': () => new Promise((resolve) => (release = () => resolve({ data: [msg('m1', 'u2', 'Tin cũ', 1), msg('m2', 'u2', 'Tin vừa đến', 2)] }))),
    });
    await screen.findByRole('button', { name: /ChuTro_AnhMinh/ });
    await openChat('ChuTro_AnhMinh');
    await screen.findByText('Đang tải tin nhắn...');
    await waitFor(() => expect(release).toBeDefined());

    incoming(msg('m2', 'u2', 'Tin vừa đến', 2));
    await act(async () => release());

    expect(await screen.findByText('Tin cũ')).toBeInTheDocument();
    expect(screen.getAllByText('Tin vừa đến')).toHaveLength(1);
  });

  it('tin từ người khác hiện chấm "tin mới" ở Sidebar, mở cuộc trò chuyện đó thì mất', async () => {
    await openAnhMinh();
    incoming({ ...msg('m5', 'u3', 'Alo', 5), receiverId: 'u1' });

    const hoTro = await screen.findByRole('button', { name: /HoTro_MoMo_247/ });
    expect(within(hoTro).getByRole('img', { name: 'Có tin nhắn mới' })).toBeInTheDocument();
    expect(screen.queryByText('Alo')).not.toBeInTheDocument();

    await userEvent.click(hoTro);

    expect(within(screen.getByRole('button', { name: /HoTro_MoMo_247/ })).queryByRole('img', { name: 'Có tin nhắn mới' })).not.toBeInTheDocument();
  });

  it('tin của cuộc trò chuyện đang mở không tạo chấm "tin mới"', async () => {
    await openAnhMinh();
    incoming(msg('m1', 'u2', 'Em ơi', 1));
    await screen.findByText('Em ơi');
    expect(screen.queryByRole('img', { name: 'Có tin nhắn mới' })).not.toBeInTheDocument();
  });

  it('tin do chính mình gửi cho người khác (từ tab khác) không tạo chấm "tin mới"', async () => {
    await openAnhMinh();
    incoming({ ...msg('m6', 'u1', 'Gửi từ tab khác', 6), receiverId: 'u3' });
    expect(screen.queryByRole('img', { name: 'Có tin nhắn mới' })).not.toBeInTheDocument();
  });

  it('gửi tin text dùng sendMessage của socket với đúng người nhận', async () => {
    await openAnhMinh();
    await userEvent.type(input(), 'Xin chào{Enter}');
    expect(socketMock.sendMessage).toHaveBeenCalledWith({ receiverId: 'u2', type: 'text', content: 'Xin chào' });
  });

  it('server báo message_error thì hiện lỗi, đổi cuộc trò chuyện thì lỗi biến mất', async () => {
    await openAnhMinh();
    act(() => socketMock.handlers.onError({ message: 'Không thể gửi tin nhắn vì cuộc trò chuyện đã bị chặn.', code: 'CONVERSATION_BLOCKED' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('đã bị chặn');

    await openChat('HoTro_MoMo_247');

    await waitFor(() => expect(screen.queryByText(/đã bị chặn/)).not.toBeInTheDocument());
  });

  it('socket mất kết nối thì khóa nút gửi và báo trên khung chat', async () => {
    socketMock.status = 'disconnected';
    await openAnhMinh();
    expect(screen.getByText('Mất kết nối, đang thử kết nối lại...')).toBeInTheDocument();
    await userEvent.type(input(), 'chào');
    expect(screen.getByRole('button', { name: /Gửi$/ })).toBeDisabled();
  });
});

describe('ChatPage: chặn', () => {
  it('người đã bị mình chặn: khóa ô nhập và hiện thanh thông báo', async () => {
    setup();
    await screen.findByRole('button', { name: /TuyenDung_CTV_Online/ });
    await openChat('TuyenDung_CTV_Online');
    expect(await screen.findByText('Cuộc trò chuyện này đã bị chặn.')).toBeInTheDocument();
    expect(input()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Gửi ảnh' })).toBeDisabled();
  });

  it('người đã chặn mình: khóa ô nhập', async () => {
    setup({ 'GET /users': () => ({ data: [user('u2', 'ChuTro_AnhMinh', { hasBlockedMe: true })] }) });
    await screen.findByRole('button', { name: /ChuTro_AnhMinh/ });
    await openChat('ChuTro_AnhMinh');
    expect(await screen.findByText('Cuộc trò chuyện này đã bị chặn.')).toBeInTheDocument();
    expect(input()).toBeDisabled();
  });

  it('bấm Chặn: khóa ô nhập, Sidebar hiện "Đã chặn", toast không bị xóa; Bỏ chặn mở lại ô nhập', async () => {
    setup();
    await screen.findByRole('button', { name: /ChuTro_AnhMinh/ });
    await openChat('ChuTro_AnhMinh');
    await screen.findByText('Chưa có tin nhắn nào. Hãy gửi tin nhắn đầu tiên.');

    await userEvent.click(screen.getByRole('button', { name: /^Chặn$/ }));

    expect(input()).toBeDisabled();
    expect(within(screen.getByRole('button', { name: /ChuTro_AnhMinh/ })).getByText('Đã chặn')).toBeInTheDocument();
    expect(screen.getByText('Đã chặn người dùng này.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Bỏ chặn/ }));

    expect(input()).toBeEnabled();
    expect(within(screen.getByRole('button', { name: /ChuTro_AnhMinh/ })).queryByText('Đã chặn')).not.toBeInTheDocument();
  });

  it('trạng thái chặn được giữ khi chuyển sang người khác rồi quay lại', async () => {
    setup();
    await screen.findByRole('button', { name: /ChuTro_AnhMinh/ });
    await openChat('ChuTro_AnhMinh');
    await userEvent.click(await screen.findByRole('button', { name: /^Chặn$/ }));

    await openChat('HoTro_MoMo_247');
    await openChat('ChuTro_AnhMinh');

    expect(await screen.findByText('Cuộc trò chuyện này đã bị chặn.')).toBeInTheDocument();
    expect(input()).toBeDisabled();
  });
});
