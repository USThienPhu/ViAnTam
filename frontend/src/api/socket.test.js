import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const created = [];
vi.mock('socket.io-client', () => ({
  io: vi.fn((url, options) => {
    const fake = {
      url,
      options,
      connected: false,
      active: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
    };
    created.push(fake);
    return fake;
  }),
}));

import { connectSocket, disconnectSocket, getSocket, isAuthSocketError } from './socket';

describe('socket singleton', () => {
  beforeEach(() => {
    created.length = 0;
  });

  afterEach(() => {
    disconnectSocket();
  });

  it('chưa kết nối thì getSocket trả null', () => {
    expect(getSocket()).toBeNull();
  });

  it('kết nối tới VITE_SOCKET_URL kèm token trong auth', async () => {
    const socket = connectSocket('token-a');
    const sent = await new Promise((resolve) => socket.options.auth(resolve));

    expect(socket.url).toMatch(/^https?:\/\//);
    expect(sent).toEqual({ token: 'token-a' });
    expect(getSocket()).toBe(socket);
  });

  it('gọi lại với cùng token thì dùng lại đúng một kết nối', () => {
    const first = connectSocket('token-a');
    const second = connectSocket('token-a');

    expect(second).toBe(first);
    expect(created).toHaveLength(1);
  });

  it('cùng token nhưng kết nối đã dừng hẳn thì kết nối lại', () => {
    const socket = connectSocket('token-a');
    socket.active = false;

    connectSocket('token-a');

    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it('đang tự kết nối lại (active) thì không gọi connect thêm', () => {
    const socket = connectSocket('token-a');
    connectSocket('token-a');
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it('đổi token thì đóng kết nối cũ và tạo kết nối mới', () => {
    const first = connectSocket('token-a');
    const second = connectSocket('token-b');

    expect(second).not.toBe(first);
    expect(first.removeAllListeners).toHaveBeenCalled();
    expect(first.disconnect).toHaveBeenCalled();
    expect(getSocket()).toBe(second);
  });

  it('disconnectSocket đóng kết nối và xóa singleton', () => {
    const socket = connectSocket('token-a');

    disconnectSocket();

    expect(socket.disconnect).toHaveBeenCalled();
    expect(getSocket()).toBeNull();
    disconnectSocket(); // gọi thêm lần nữa không lỗi
  });

  it.each([undefined, null, '', 123])('từ chối token không hợp lệ: %s', (token) => {
    expect(() => connectSocket(token)).toThrow();
    expect(created).toHaveLength(0);
  });
});

describe('isAuthSocketError', () => {
  it('nhận ra lỗi token của backend', () => {
    expect(isAuthSocketError(new Error('Bạn cần đăng nhập để tiếp tục.'))).toBe(true);
    expect(isAuthSocketError(new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'))).toBe(true);
  });

  it('lỗi mạng không bị coi là lỗi đăng nhập', () => {
    expect(isAuthSocketError(new Error('websocket error'))).toBe(false);
    expect(isAuthSocketError(new Error('xhr poll error'))).toBe(false);
    expect(isAuthSocketError(undefined)).toBe(false);
  });
});
