import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatWindow from './ChatWindow';
import { ToastProvider } from '../context/ToastContext';
import failOnConsole from '../test/failOnConsole';

failOnConsole();

vi.mock('../api/chatApi', async () => {
  const actual = await vi.importActual('../api/chatApi');
  return { ...actual, uploadImage: vi.fn() };
});
import { uploadImage } from '../api/chatApi';

const ME = 'u1';
const PEER = { id: 'u2', username: 'ChuTro_AnhMinh', isFlagged: false, reportCount: 0, isBlockedByMe: false, hasBlockedMe: false };

const textMessage = (id, from, content, minute = 1) => ({
  _id: id,
  senderId: from,
  receiverId: from === ME ? 'u2' : ME,
  type: 'text',
  content,
  createdAt: `2026-11-28T07:0${minute}:00.000Z`,
});

function renderWindow(props = {}) {
  const sendMessage = props.sendMessage ?? vi.fn(() => true);
  const utils = render(
    <ChatWindow
      selectedUser={PEER}
      currentUserId={ME}
      messages={[]}
      connectionStatus="connected"
      sendMessage={sendMessage}
      {...props}
    />,
    { wrapper: ToastProvider }
  );
  return { ...utils, sendMessage };
}

const input = () => screen.getByRole('textbox', { name: 'Nhập tin nhắn' });
const sendButton = () => screen.getByRole('button', { name: /Gửi$/ });
const pngFile = (name = 'qr.png', type = 'image/png') => new File([new Uint8Array([1, 2, 3])], name, { type });

beforeEach(() => {
  uploadImage.mockReset();
});

describe('ChatWindow: giao diện', () => {
  it('hiện tên đối phương, trạng thái kết nối và 3 nút an toàn của TV3', () => {
    renderWindow();
    expect(screen.getByRole('heading', { name: 'ChuTro_AnhMinh' })).toBeInTheDocument();
    expect(screen.getByText('Đã kết nối')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kiểm tra lừa đảo/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Báo cáo/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chặn/ })).toBeInTheDocument();
  });

  it('hiện FlaggedBanner khi đối phương bị gắn cờ, ẩn khi không', () => {
    const { rerender } = renderWindow();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(
      <ChatWindow
        selectedUser={{ ...PEER, isFlagged: true, reportCount: 4 }}
        currentUserId={ME}
        messages={[]}
        connectionStatus="connected"
        sendMessage={vi.fn()}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Tài khoản này đã bị nhiều người dùng báo cáo.');
    expect(screen.getByText('4 báo cáo')).toBeInTheDocument();
  });

  it('phân biệt tin của mình và của đối phương', () => {
    renderWindow({ messages: [textMessage('m1', ME, 'tin của mình'), textMessage('m2', 'u2', 'tin đối phương', 2)] });
    const bubbles = screen.getAllByTestId('message-bubble');
    expect(bubbles[0]).toHaveAttribute('data-mine', 'true');
    expect(bubbles[1]).toHaveAttribute('data-mine', 'false');
  });

  it('chưa có tin nhắn thì hiện lời mời gửi tin đầu tiên', () => {
    renderWindow();
    expect(screen.getByText('Chưa có tin nhắn nào. Hãy gửi tin nhắn đầu tiên.')).toBeInTheDocument();
  });

  it('đang tải lịch sử thì hiện trạng thái đang tải', () => {
    renderWindow({ loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải tin nhắn...');
  });

  it('tải lịch sử lỗi thì hiện thông báo và nút Thử lại', async () => {
    const onRetry = vi.fn();
    renderWindow({ loadError: 'Không thể tải tin nhắn.', onRetry });
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể tải tin nhắn.');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('nút quay lại gọi onBack', async () => {
    const onBack = vi.fn();
    renderWindow({ onBack });
    await userEvent.click(screen.getByRole('button', { name: 'Quay lại danh sách' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('nút Kiểm tra lừa đảo bị khóa khi chưa có tin nhắn, mở khi đã có', () => {
    const { rerender } = renderWindow();
    expect(screen.getByRole('button', { name: /Kiểm tra lừa đảo/ })).toBeDisabled();
    rerender(
      <ChatWindow selectedUser={PEER} currentUserId={ME} messages={[textMessage('m1', 'u2', 'hi')]} connectionStatus="connected" sendMessage={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /Kiểm tra lừa đảo/ })).toBeEnabled();
  });
});

describe('ChatWindow: gửi tin text', () => {
  it('bấm Gửi phát đúng payload và xóa ô nhập', async () => {
    const { sendMessage } = renderWindow();
    await userEvent.type(input(), '  xin chào  ');
    await userEvent.click(sendButton());

    expect(sendMessage).toHaveBeenCalledWith({ receiverId: 'u2', type: 'text', content: 'xin chào' });
    expect(input()).toHaveValue('');
  });

  it('Enter gửi tin', async () => {
    const { sendMessage } = renderWindow();
    await userEvent.type(input(), 'chào{Enter}');
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(input()).toHaveValue('');
  });

  it('Shift+Enter xuống dòng, không gửi', async () => {
    const { sendMessage } = renderWindow();
    await userEvent.type(input(), 'dòng 1{Shift>}{Enter}{/Shift}dòng 2');
    expect(sendMessage).not.toHaveBeenCalled();
    expect(input()).toHaveValue('dòng 1\ndòng 2');
  });

  it('Enter khi đang gõ tiếng Việt (IME) không gửi nhầm', () => {
    const { sendMessage } = renderWindow();
    fireEvent.change(input(), { target: { value: 'xin chao' } });
    fireEvent.keyDown(input(), { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input(), { key: 'Enter', keyCode: 229 });
    expect(sendMessage).not.toHaveBeenCalled();
    expect(input()).toHaveValue('xin chao');
  });

  it('nút Gửi bị khóa khi ô nhập trống hoặc chỉ có khoảng trắng', async () => {
    const { sendMessage } = renderWindow();
    expect(sendButton()).toBeDisabled();
    await userEvent.type(input(), '   ');
    expect(sendButton()).toBeDisabled();
    await userEvent.type(input(), '{Enter}');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('giới hạn 2000 ký tự và hiện bộ đếm khi gần chạm giới hạn', () => {
    renderWindow();
    expect(input()).toHaveAttribute('maxlength', '2000');
    fireEvent.change(input(), { target: { value: 'a'.repeat(1850) } });
    expect(screen.getByText('1850/2000')).toBeInTheDocument();
  });

  it('socket báo chưa gửi được thì giữ nội dung và hiện lỗi', async () => {
    const { sendMessage } = renderWindow({ sendMessage: vi.fn(() => false) });
    await userEvent.type(input(), 'chào');
    await userEvent.click(sendButton());

    expect(sendMessage).toHaveBeenCalled();
    expect(input()).toHaveValue('chào');
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa kết nối tới máy chủ.');
  });

  it('lỗi hiện dạng toast và đóng được bằng nút Đóng thông báo', async () => {
    renderWindow({ sendMessage: vi.fn(() => false) });
    await userEvent.type(input(), 'chào');
    await userEvent.click(sendButton());
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa kết nối tới máy chủ.');

    await userEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('ChatWindow: kết nối và chặn', () => {
  it.each([
    ['connecting', 'Đang kết nối...'],
    ['disconnected', 'Mất kết nối, đang thử kết nối lại...'],
  ])('trạng thái %s hiện thanh báo và khóa nút gửi', async (status, text) => {
    renderWindow({ connectionStatus: status });
    expect(screen.getByRole('status')).toHaveTextContent(text);
    await userEvent.type(input(), 'chào');
    expect(sendButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Gửi ảnh' })).toBeDisabled();
  });

  it.each([
    ['mình chặn họ', { isBlockedByMe: true }, 'Bạn đã chặn người này.'],
    ['họ chặn mình', { hasBlockedMe: true }, 'Người này đã chặn bạn'],
  ])('%s: khóa ô nhập, nút gửi, nút gửi ảnh và hiện thanh thông báo kèm gợi ý đúng chiều chặn', (_name, flags, hint) => {
    renderWindow({ selectedUser: { ...PEER, ...flags } });
    expect(screen.getByText('Cuộc trò chuyện này đã bị chặn.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(hint);
    expect(input()).toBeDisabled();
    expect(sendButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Gửi ảnh' })).toBeDisabled();
  });

  it('bấm Chặn báo onBlockChange(true)', async () => {
    const onBlockChange = vi.fn();
    renderWindow({ onBlockChange });
    await userEvent.click(screen.getByRole('button', { name: /Chặn/ }));
    expect(onBlockChange).toHaveBeenCalledWith(true);
  });

  it('chặn xong: ô nhập khóa mà toast "Đã chặn" của ChatSafetyActions không bị xóa', async () => {
    function Harness() {
      const [user, setUser] = useState(PEER);
      return (
        <ChatWindow
          selectedUser={user}
          currentUserId={ME}
          messages={[]}
          connectionStatus="connected"
          sendMessage={vi.fn()}
          onBlockChange={(blocked) => setUser((prev) => ({ ...prev, isBlockedByMe: blocked }))}
        />
      );
    }
    render(<Harness />, { wrapper: ToastProvider });

    await userEvent.click(screen.getByRole('button', { name: /^Chặn$/ }));

    expect(input()).toBeDisabled();
    expect(screen.getByText('Cuộc trò chuyện này đã bị chặn.')).toBeInTheDocument();
    expect(screen.getByText('Đã chặn người dùng này.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Bỏ chặn/ }));
    expect(input()).toBeEnabled();
  });
});

describe('ChatWindow: gửi ảnh', () => {
  const choose = (file) => fireEvent.change(screen.getByLabelText('Chọn ảnh để gửi'), { target: { files: [file] } });

  it('ô chọn file chỉ nhận JPG, PNG, WEBP', () => {
    renderWindow();
    expect(screen.getByLabelText('Chọn ảnh để gửi')).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
  });

  it('upload thành công rồi gửi tin ảnh kèm imageUrl và qrData từ server', async () => {
    const qrData = { isVietQR: true, bankBin: '970418', bankName: 'BIDV', accountNumber: '123456789', amount: 500000 };
    uploadImage.mockResolvedValue({ imageUrl: '/uploads/1-abc.png', qrData, extractedLinks: [] });
    const { sendMessage } = renderWindow();

    choose(pngFile());

    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith({ receiverId: 'u2', type: 'image', imageUrl: '/uploads/1-abc.png', qrData })
    );
    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(uploadImage.mock.calls[0][0].name).toBe('qr.png');
  });

  it('trong lúc upload khóa nút gửi ảnh và nút Gửi', async () => {
    let resolveUpload;
    uploadImage.mockReturnValue(new Promise((resolve) => (resolveUpload = resolve)));
    renderWindow();

    choose(pngFile());

    await waitFor(() => expect(screen.getByRole('button', { name: 'Gửi ảnh' })).toBeDisabled());
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải ảnh lên & giải mã QR...');
    resolveUpload({ imageUrl: '/uploads/1-a.png', qrData: { isVietQR: false }, extractedLinks: [] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gửi ảnh' })).toBeEnabled());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('từ chối file sai định dạng ngay trên trình duyệt, không gọi upload', () => {
    renderWindow();
    choose(new File(['abc'], 'a.pdf', { type: 'application/pdf' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('từ chối ảnh quá 5MB ngay trên trình duyệt, không gọi upload', () => {
    renderWindow();
    const big = pngFile();
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
    choose(big);
    expect(screen.getByRole('alert')).toHaveTextContent('Ảnh quá lớn. Dung lượng tối đa là 5MB.');
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('ảnh đúng 5MB vẫn được gửi', async () => {
    uploadImage.mockResolvedValue({ imageUrl: '/uploads/1-a.png', qrData: { isVietQR: false }, extractedLinks: [] });
    const { sendMessage } = renderWindow();
    const exact = pngFile();
    Object.defineProperty(exact, 'size', { value: 5 * 1024 * 1024 });
    choose(exact);
    await waitFor(() => expect(sendMessage).toHaveBeenCalled());
  });

  it('server từ chối upload thì hiện đúng thông báo của server và không gửi tin', async () => {
    uploadImage.mockRejectedValue({ response: { status: 400, data: { message: 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.' } } });
    const { sendMessage } = renderWindow();

    choose(pngFile());

    expect(await screen.findByRole('alert')).toHaveTextContent('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('mất mạng khi upload thì hiện thông báo mất kết nối máy chủ', async () => {
    uploadImage.mockRejectedValue(new Error('Network Error'));
    renderWindow();
    choose(pngFile());
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối tới máy chủ.');
  });

  it('upload xong nhưng socket đã mất kết nối thì báo lỗi', async () => {
    uploadImage.mockResolvedValue({ imageUrl: '/uploads/1-a.png', qrData: { isVietQR: false }, extractedLinks: [] });
    renderWindow({ sendMessage: vi.fn(() => false) });
    choose(pngFile());
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa kết nối tới máy chủ.');
  });

  it('bị chặn thì không upload dù có file được chọn', () => {
    renderWindow({ selectedUser: { ...PEER, isBlockedByMe: true } });
    choose(pngFile());
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('hiện thẻ VietQR trong khung chat khi nhận tin ảnh có qrData', () => {
    renderWindow({
      messages: [
        {
          _id: 'm9',
          senderId: ME,
          receiverId: 'u2',
          type: 'image',
          imageUrl: '/uploads/1-abc.png',
          qrData: { isVietQR: true, bankBin: '970436', bankName: 'Vietcombank', accountNumber: '1122334455', amount: 100000 },
          createdAt: '2026-11-28T07:00:00.000Z',
        },
      ],
    });
    const log = screen.getByRole('log', { name: 'Tin nhắn' });
    expect(within(log).getByText('Vietcombank')).toBeInTheDocument();
    expect(within(log).getByText('1122334455')).toBeInTheDocument();
    expect(within(log).getByText('100.000đ')).toBeInTheDocument();
  });
});

describe('ChatWindow: tự cuộn', () => {
  // jsdom không có layout, nên giả lập số đo cuộn của khung tin nhắn.
  const SCROLL_HEIGHT = 1000;
  const CLIENT_HEIGHT = 400;

  function mockScroll(list) {
    let top = 0;
    Object.defineProperty(list, 'scrollHeight', { configurable: true, get: () => SCROLL_HEIGHT });
    Object.defineProperty(list, 'clientHeight', { configurable: true, get: () => CLIENT_HEIGHT });
    Object.defineProperty(list, 'scrollTop', {
      configurable: true,
      get: () => top,
      set: (value) => {
        top = value;
      },
    });
    return {
      get top() {
        return top;
      },
      scrollTo(value) {
        top = value;
        fireEvent.scroll(list);
      },
    };
  }

  const windowFor = (messages) => (
    <ChatWindow selectedUser={PEER} currentUserId={ME} messages={messages} connectionStatus="connected" sendMessage={vi.fn()} />
  );
  const log = () => screen.getByRole('log', { name: 'Tin nhắn' });

  function setupScroll(initial = [textMessage('m1', 'u2', 'tin 1')]) {
    const utils = render(windowFor(initial), { wrapper: ToastProvider });
    const scroll = mockScroll(log());
    return { ...utils, scroll };
  }

  it('đang ở gần đáy: tin mới của đối phương kéo khung xuống đáy, không hiện nút', () => {
    const { rerender, scroll } = setupScroll();
    scroll.scrollTo(SCROLL_HEIGHT - CLIENT_HEIGHT - 40);

    rerender(windowFor([textMessage('m1', 'u2', 'tin 1'), textMessage('m2', 'u2', 'tin 2', 2)]));

    expect(scroll.top).toBe(SCROLL_HEIGHT);
    expect(screen.queryByRole('button', { name: 'Tin nhắn mới' })).not.toBeInTheDocument();
  });

  it('đang đọc tin cũ: tin mới của đối phương không kéo xuống, hiện nút Tin nhắn mới', () => {
    const { rerender, scroll } = setupScroll();
    scroll.scrollTo(100);

    rerender(windowFor([textMessage('m1', 'u2', 'tin 1'), textMessage('m2', 'u2', 'tin 2', 2)]));

    expect(scroll.top).toBe(100);
    expect(screen.getByRole('button', { name: 'Tin nhắn mới' })).toBeInTheDocument();
  });

  it('bấm Tin nhắn mới thì cuộn xuống đáy và ẩn nút', async () => {
    const { rerender, scroll } = setupScroll();
    scroll.scrollTo(100);
    rerender(windowFor([textMessage('m1', 'u2', 'tin 1'), textMessage('m2', 'u2', 'tin 2', 2)]));

    await userEvent.click(screen.getByRole('button', { name: 'Tin nhắn mới' }));

    expect(scroll.top).toBe(SCROLL_HEIGHT);
    expect(screen.queryByRole('button', { name: 'Tin nhắn mới' })).not.toBeInTheDocument();
  });

  it('tự cuộn xuống đáy bằng tay thì nút Tin nhắn mới biến mất', () => {
    const { rerender, scroll } = setupScroll();
    scroll.scrollTo(100);
    rerender(windowFor([textMessage('m1', 'u2', 'tin 1'), textMessage('m2', 'u2', 'tin 2', 2)]));
    expect(screen.getByRole('button', { name: 'Tin nhắn mới' })).toBeInTheDocument();

    scroll.scrollTo(SCROLL_HEIGHT - CLIENT_HEIGHT - 10);

    expect(screen.queryByRole('button', { name: 'Tin nhắn mới' })).not.toBeInTheDocument();
  });

  it('tin do chính mình gửi luôn kéo xuống đáy dù đang đọc tin cũ', () => {
    const { rerender, scroll } = setupScroll();
    scroll.scrollTo(100);

    rerender(windowFor([textMessage('m1', 'u2', 'tin 1'), textMessage('m2', ME, 'mình gửi', 2)]));

    expect(scroll.top).toBe(SCROLL_HEIGHT);
    expect(screen.queryByRole('button', { name: 'Tin nhắn mới' })).not.toBeInTheDocument();
  });

  it('lịch sử tải xong thì cuộn xuống tin mới nhất', () => {
    const { rerender, scroll } = setupScroll([]);

    rerender(windowFor([textMessage('m1', 'u2', 'tin 1'), textMessage('m2', 'u2', 'tin 2', 2)]));

    expect(scroll.top).toBe(SCROLL_HEIGHT);
  });

  describe('ảnh tải xong làm bong bóng cao lên', () => {
    const imageMessage = {
      _id: 'img1',
      senderId: 'u2',
      receiverId: ME,
      type: 'image',
      imageUrl: '/uploads/1-abc.png',
      qrData: { isVietQR: false },
      createdAt: '2026-11-28T07:03:00.000Z',
    };

    it('đang ở đáy thì cuộn lại xuống đáy', () => {
      const { scroll } = setupScroll([imageMessage]);
      scroll.scrollTo(SCROLL_HEIGHT - CLIENT_HEIGHT);

      fireEvent.load(screen.getByAltText('Ảnh được gửi trong cuộc trò chuyện'));

      expect(scroll.top).toBe(SCROLL_HEIGHT);
    });

    it('đang đọc tin cũ thì giữ nguyên vị trí cuộn', () => {
      const { scroll } = setupScroll([imageMessage]);
      scroll.scrollTo(100);

      fireEvent.load(screen.getByAltText('Ảnh được gửi trong cuộc trò chuyện'));

      expect(scroll.top).toBe(100);
    });

    it('ảnh lỗi thì hiện thông báo không tải được ảnh và không gây lỗi', () => {
      setupScroll([imageMessage]);
      fireEvent.error(screen.getByAltText('Ảnh được gửi trong cuộc trò chuyện'));
      expect(screen.getByText('Không tải được ảnh.')).toBeInTheDocument();
    });
  });
});
