import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi as baseMockApi } from './test/mockApi';
import { ADMIN, USER, renderApp, seedSession } from './test/renderApp';

// ChatPage mở socket thật khi hiển thị; test điều hướng không cần kết nối mạng nên dùng bản giả.
vi.mock('./hooks/useChatSocket', () => ({
  default: () => ({ status: 'connected', sendMessage: () => true }),
}));

// ChatPage luôn gọi GET /users khi hiển thị, nên mọi test đều có sẵn route này (danh sách rỗng).
const mockApi = (routes) => baseMockApi({ 'GET /users': () => ({ data: [] }), ...routes });

const ERR_LOGIN = { message: 'Sai tên đăng nhập hoặc mật khẩu.' };

async function fillLogin(username, password) {
  await userEvent.type(screen.getByLabelText('Tên đăng nhập'), username);
  await userEvent.type(screen.getByLabelText('Mật khẩu'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
}

describe('Điều hướng và phân quyền', () => {
  it('chưa đăng nhập vào "/" thì chuyển về trang đăng nhập', async () => {
    mockApi({});
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
  });

  it('đã đăng nhập vào "/" thấy empty state và Navbar có tên người dùng', async () => {
    seedSession(USER);
    mockApi({ 'GET /auth/me': () => ({ data: USER }) });
    renderApp('/');

    expect(
      await screen.findByRole('heading', { name: 'Chọn một cuộc trò chuyện để bắt đầu' })
    ).toBeInTheDocument();
    const nav = screen.getByRole('banner');
    expect(within(nav).getByText('demo_user')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /Đăng xuất/ })).toBeInTheDocument();
  });

  it('trong lúc xác thực phiên đã lưu hiện trạng thái đang tải, chưa bị đá về /login', async () => {
    seedSession(USER);
    mockApi({ 'GET /auth/me': () => new Promise((resolve) => setTimeout(() => resolve({ data: USER }), 50)) });
    renderApp('/history');

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải...');
    expect(await screen.findByRole('heading', { name: 'Lịch sử kiểm tra' })).toBeInTheDocument();
  });

  it('user thường không thấy link Quản trị trên Navbar', async () => {
    seedSession(USER);
    mockApi({ 'GET /auth/me': () => ({ data: USER }) });
    renderApp('/');
    await screen.findByRole('banner');

    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    expect(within(nav).getByRole('link', { name: 'Tin nhắn' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Lịch sử' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Mẹo an toàn' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Quản trị' })).not.toBeInTheDocument();
  });

  it('user thường vào /admin bị báo không có quyền', async () => {
    seedSession(USER);
    mockApi({ 'GET /auth/me': () => ({ data: USER }) });
    renderApp('/admin');

    expect(
      await screen.findByRole('heading', { name: 'Bạn không có quyền truy cập.' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về trang tin nhắn' })).toHaveAttribute('href', '/');
  });

  it('admin thấy link Quản trị và vào được /admin', async () => {
    seedSession(ADMIN);
    mockApi({ 'GET /auth/me': () => ({ data: ADMIN }) });
    renderApp('/admin');

    expect(await screen.findByRole('heading', { name: 'Quản trị' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    expect(within(nav).getByRole('link', { name: 'Quản trị' })).toBeInTheDocument();
  });

  it.each([
    ['/history', 'Lịch sử kiểm tra'],
    ['/tips', 'Mẹo an toàn'],
  ])('route %s hiển thị trang tạm "%s"', async (path, title) => {
    seedSession(USER);
    mockApi({ 'GET /auth/me': () => ({ data: USER }) });
    renderApp(path);
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText('Tính năng này đang được phát triển.')).toBeInTheDocument();
  });

  it('đã đăng nhập mà vào /login thì chuyển về "/"', async () => {
    seedSession(USER);
    mockApi({ 'GET /auth/me': () => ({ data: USER }) });
    renderApp('/login');
    expect(
      await screen.findByRole('heading', { name: 'Chọn một cuộc trò chuyện để bắt đầu' })
    ).toBeInTheDocument();
  });

  it('đường dẫn không tồn tại chuyển về "/"', async () => {
    seedSession(USER);
    mockApi({ 'GET /auth/me': () => ({ data: USER }) });
    renderApp('/khong-co-trang-nay');
    expect(
      await screen.findByRole('heading', { name: 'Chọn một cuộc trò chuyện để bắt đầu' })
    ).toBeInTheDocument();
  });

  it('token hết hạn khi mở lại trang: bị chuyển về đăng nhập', async () => {
    seedSession(USER, 'tok-het-han');
    mockApi({ 'GET /auth/me': () => ({ status: 401, data: { message: 'Hết hạn' } }) });
    renderApp('/history');
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(localStorage.getItem('aegisai_token')).toBeNull();
  });

  it('đăng xuất đưa về trang đăng nhập và xóa phiên', async () => {
    seedSession(USER);
    mockApi({ 'GET /auth/me': () => ({ data: USER }) });
    renderApp('/');
    await screen.findByRole('banner');

    await userEvent.click(within(screen.getByRole('banner')).getAllByRole('button', { name: /Đăng xuất/ })[0]);

    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(localStorage.getItem('aegisai_token')).toBeNull();
  });

  it('menu di động mở/đóng bằng nút và có aria-expanded', async () => {
    seedSession(USER);
    mockApi({ 'GET /auth/me': () => ({ data: USER }) });
    renderApp('/');
    const toggle = await screen.findByRole('button', { name: 'Mở menu' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Đóng menu' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính (di động)' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: 'Điều hướng chính (di động)' })).not.toBeInTheDocument();
  });
});

describe('Trang đăng nhập', () => {
  it('đăng nhập đúng: gửi đúng body, lưu JWT và vào trang chat', async () => {
    const calls = mockApi({
      'POST /auth/login': () => ({ data: { token: 'jwt-123', user: USER } }),
    });
    renderApp('/login');

    await fillLogin('  demo_user ', 'password123');

    expect(
      await screen.findByRole('heading', { name: 'Chọn một cuộc trò chuyện để bắt đầu' })
    ).toBeInTheDocument();
    expect(calls[0].body).toEqual({ username: 'demo_user', password: 'password123' });
    expect(localStorage.getItem('aegisai_token')).toBe('jwt-123');
  });

  it('đăng nhập khi đang mở dở /history thì quay lại /history', async () => {
    mockApi({ 'POST /auth/login': () => ({ data: { token: 'jwt-123', user: USER } }) });
    renderApp('/history');
    await screen.findByRole('heading', { name: 'Đăng nhập' });

    await fillLogin('demo_user', 'password123');

    expect(await screen.findByRole('heading', { name: 'Lịch sử kiểm tra' })).toBeInTheDocument();
  });

  it('admin đăng nhập xong vào được /admin', async () => {
    mockApi({ 'POST /auth/login': () => ({ data: { token: 'jwt-admin', user: ADMIN } }) });
    renderApp('/admin');
    await screen.findByRole('heading', { name: 'Đăng nhập' });

    await fillLogin('admin', '123456');

    expect(await screen.findByRole('heading', { name: 'Quản trị' })).toBeInTheDocument();
  });

  it('sai thông tin: hiện thông báo của server, ở lại trang, không lưu token', async () => {
    mockApi({ 'POST /auth/login': () => ({ status: 401, data: ERR_LOGIN }) });
    renderApp('/login');

    await fillLogin('demo_user', 'sai_mat_khau');

    expect(await screen.findByRole('alert')).toHaveTextContent('Sai tên đăng nhập hoặc mật khẩu.');
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(localStorage.getItem('aegisai_token')).toBeNull();
    // Nút đăng nhập dùng lại được sau khi lỗi.
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
  });

  it('mất mạng: báo lỗi kết nối bằng tiếng Việt', async () => {
    mockApi({ 'POST /auth/login': () => ({ networkError: true }) });
    renderApp('/login');

    await fillLogin('demo_user', 'password123');

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối tới máy chủ.');
  });

  it('để trống: báo lỗi từng ô và không gọi server', async () => {
    const calls = mockApi({});
    renderApp('/login');

    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(screen.getByText('Vui lòng nhập tên đăng nhập.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    expect(screen.getByLabelText('Tên đăng nhập')).toHaveFocus();
    expect(screen.getByLabelText('Tên đăng nhập')).toHaveAttribute('aria-invalid', 'true');

    await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'abc');
    expect(screen.queryByText('Vui lòng nhập tên đăng nhập.')).not.toBeInTheDocument();
  });

  it('nút hiện/ẩn mật khẩu đổi kiểu ô nhập', async () => {
    mockApi({});
    renderApp('/login');
    const input = screen.getByLabelText('Mật khẩu');
    expect(input).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu (Mật khẩu)' }));
    expect(input).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: 'Ẩn mật khẩu (Mật khẩu)' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('có link sang trang đăng ký', async () => {
    mockApi({});
    renderApp('/login');
    await userEvent.click(screen.getByRole('link', { name: 'Đăng ký' }));
    expect(await screen.findByRole('heading', { name: 'Tạo tài khoản' })).toBeInTheDocument();
  });
});

describe('Trang đăng ký', () => {
  async function fillRegister({ username = 'nguyen_van_a', password = 'password123', confirm = password } = {}) {
    if (username) await userEvent.type(screen.getByLabelText('Tên đăng nhập'), username);
    if (password) await userEvent.type(screen.getByLabelText('Mật khẩu'), password);
    if (confirm) await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu'), confirm);
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));
  }

  it('đăng ký đúng: chỉ gửi username và password (không gửi ô nhập lại), rồi vào trang chat', async () => {
    const calls = mockApi({
      'POST /auth/register': () => ({
        status: 201,
        data: { token: 'jwt-moi', user: { id: 'u2', username: 'nguyen_van_a', role: 'user' } },
      }),
    });
    renderApp('/register');

    await fillRegister();

    expect(
      await screen.findByRole('heading', { name: 'Chọn một cuộc trò chuyện để bắt đầu' })
    ).toBeInTheDocument();
    expect(calls[0].body).toEqual({ username: 'nguyen_van_a', password: 'password123' });
    expect(localStorage.getItem('aegisai_token')).toBe('jwt-moi');
  });

  it('báo lỗi validation bằng tiếng Việt và không gọi server', async () => {
    const calls = mockApi({});
    renderApp('/register');

    await fillRegister({ username: 'ab', password: '123', confirm: '123' });

    expect(screen.getByText(/^Tên đăng nhập gồm 3 đến 30 ký tự/)).toBeInTheDocument();
    expect(screen.getByLabelText('Tên đăng nhập')).toHaveFocus();
    expect(calls).toHaveLength(0);
  });

  it('báo lỗi mật khẩu quá ngắn', async () => {
    mockApi({});
    renderApp('/register');
    await fillRegister({ username: 'nguyen_van_a', password: '12345', confirm: '12345' });
    expect(screen.getByText('Mật khẩu phải có ít nhất 6 ký tự.')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toHaveFocus();
  });

  it('báo lỗi khi nhập lại mật khẩu không khớp', async () => {
    const calls = mockApi({});
    renderApp('/register');
    await fillRegister({ password: 'password123', confirm: 'password124' });
    expect(screen.getByText('Mật khẩu nhập lại không khớp.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('tên đăng nhập đã tồn tại (409): hiện lỗi ngay dưới ô tên đăng nhập', async () => {
    mockApi({
      'POST /auth/register': () => ({ status: 409, data: { message: 'Tên đăng nhập đã tồn tại.' } }),
    });
    renderApp('/register');

    await fillRegister();

    expect(await screen.findByText('Tên đăng nhập đã tồn tại.')).toBeInTheDocument();
    expect(screen.getByLabelText('Tên đăng nhập')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Tên đăng nhập')).toHaveFocus();
    expect(localStorage.getItem('aegisai_token')).toBeNull();
  });

  it('lỗi server khác hiện ở khung thông báo chung', async () => {
    mockApi({
      'POST /auth/register': () => ({ status: 500, data: { message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' } }),
    });
    renderApp('/register');

    await fillRegister();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.')
    );
  });

  it('có link sang trang đăng nhập', async () => {
    mockApi({});
    renderApp('/register');
    await userEvent.click(screen.getByRole('link', { name: 'Đăng nhập' }));
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
  });
});
