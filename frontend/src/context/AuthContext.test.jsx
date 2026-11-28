import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import axiosInstance from '../api/axiosInstance';
import { mockApi } from '../test/mockApi';
import { ADMIN, USER, seedSession } from '../test/renderApp';

function Probe() {
  const { user, token, loading, isAuthenticated, login, register, logout } = useAuth();
  const run = (fn) => () => fn().catch(() => {});
  return (
    <div>
      <p data-testid="loading">{String(loading)}</p>
      <p data-testid="auth">{String(isAuthenticated)}</p>
      <p data-testid="user">{user ? `${user.username}|${user.role}|${user.isFlagged}` : 'none'}</p>
      <p data-testid="token">{token ?? 'none'}</p>
      <button onClick={run(() => login('demo_user', 'password123'))}>login</button>
      <button onClick={run(() => register('moi_dung', 'password123'))}>register</button>
      <button onClick={() => logout()}>logout</button>
      <button onClick={run(() => axiosInstance.get('/users'))}>call-api</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

const stored = () => ({
  token: localStorage.getItem('aegisai_token'),
  user: JSON.parse(localStorage.getItem('aegisai_user') || 'null'),
});

describe('AuthContext', () => {
  it('chưa có phiên lưu: không loading, chưa đăng nhập, không gọi server', async () => {
    const calls = mockApi({});
    renderProbe();

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('auth')).toHaveTextContent('false');
    expect(calls).toHaveLength(0);
  });

  it('có phiên lưu: loading rồi xác thực lại bằng GET /auth/me và cập nhật user mới nhất', async () => {
    seedSession(USER, 'tok-1');
    const calls = mockApi({
      'GET /auth/me': () => ({ data: { ...USER, role: 'admin', isFlagged: true } }),
    });
    renderProbe();

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    expect(screen.getByTestId('user')).toHaveTextContent('demo_user|admin|true');
    expect(stored().user.role).toBe('admin');
    expect(calls[0].headers.Authorization).toBe('Bearer tok-1');
  });

  it('GET /auth/me trả 401 (token hết hạn): xóa phiên', async () => {
    seedSession(USER, 'tok-het-han');
    mockApi({ 'GET /auth/me': () => ({ status: 401, data: { message: 'Hết hạn' } }) });
    renderProbe();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('auth')).toHaveTextContent('false');
    expect(stored()).toEqual({ token: null, user: null });
  });

  it('mất mạng khi xác thực lại: giữ phiên đã lưu, không đăng xuất oan', async () => {
    seedSession(USER, 'tok-1');
    mockApi({ 'GET /auth/me': () => ({ networkError: true }) });
    renderProbe();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('auth')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('demo_user|user|false');
  });

  it('dữ liệu user trong localStorage bị hỏng: coi như chưa đăng nhập', () => {
    localStorage.setItem('aegisai_token', 'tok');
    localStorage.setItem('aegisai_user', '{khong-phai-json');
    mockApi({});
    renderProbe();

    expect(screen.getByTestId('auth')).toHaveTextContent('false');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(stored()).toEqual({ token: null, user: null });
  });

  it('login thành công: lưu token và user vào state và localStorage', async () => {
    mockApi({
      'POST /auth/login': () => ({ data: { token: 'jwt-moi', user: ADMIN } }),
    });
    renderProbe();

    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('true'));
    expect(screen.getByTestId('token')).toHaveTextContent('jwt-moi');
    expect(screen.getByTestId('user')).toHaveTextContent('admin|admin|false');
    expect(stored()).toEqual({ token: 'jwt-moi', user: ADMIN });
  });

  it('login thất bại: không lưu gì và lỗi được ném ra để form hiển thị', async () => {
    mockApi({
      'POST /auth/login': () => ({ status: 401, data: { message: 'Sai tên đăng nhập hoặc mật khẩu.' } }),
    });
    renderProbe();

    await userEvent.click(screen.getByText('login'));

    expect(screen.getByTestId('auth')).toHaveTextContent('false');
    expect(stored()).toEqual({ token: null, user: null });
  });

  it('register thành công: đăng nhập luôn và isFlagged mặc định false', async () => {
    mockApi({
      'POST /auth/register': () => ({
        status: 201,
        data: { token: 'jwt-dang-ky', user: { id: 'u9', username: 'moi_dung', role: 'user' } },
      }),
    });
    renderProbe();

    await userEvent.click(screen.getByText('register'));

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('true'));
    expect(screen.getByTestId('user')).toHaveTextContent('moi_dung|user|false');
    expect(stored().token).toBe('jwt-dang-ky');
  });

  it('logout xóa state và localStorage', async () => {
    seedSession(USER, 'tok-1');
    mockApi({ 'GET /auth/me': () => ({ data: USER }) });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('true'));

    await userEvent.click(screen.getByText('logout'));

    expect(screen.getByTestId('auth')).toHaveTextContent('false');
    expect(stored()).toEqual({ token: null, user: null });
  });

  it('API bất kỳ trả 401 thì tự đăng xuất', async () => {
    seedSession(USER, 'tok-1');
    mockApi({
      'GET /auth/me': () => ({ data: USER }),
      'GET /users': () => ({ status: 401, data: { message: 'Hết hạn' } }),
    });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('true'));

    await userEvent.click(screen.getByText('call-api'));

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('false'));
    expect(stored()).toEqual({ token: null, user: null });
  });

  it('useAuth ngoài AuthProvider báo lỗi rõ ràng', () => {
    const spy = console.error;
    console.error = () => {};
    expect(() => render(<Probe />)).toThrow('useAuth phải được dùng bên trong <AuthProvider>.');
    console.error = spy;
  });
});
