import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const auth = { token: 'token-a', logout: vi.fn() };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));

const state = { socket: null };
vi.mock('../api/socket', () => ({
  connectSocket: vi.fn(() => state.socket),
  getSocket: vi.fn(() => state.socket),
  disconnectSocket: vi.fn(),
  isAuthSocketError: (error) => error?.message === 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
}));

import { connectSocket, disconnectSocket } from '../api/socket';
import useChatSocket from './useChatSocket';

function makeFakeSocket(connected = false) {
  const listeners = {};
  return {
    connected,
    emit: vi.fn(),
    on: vi.fn((event, fn) => {
      (listeners[event] ||= new Set()).add(fn);
    }),
    off: vi.fn((event, fn) => listeners[event]?.delete(fn)),
    trigger(event, ...args) {
      [...(listeners[event] || [])].forEach((fn) => fn(...args));
    },
    count: (event) => listeners[event]?.size ?? 0,
  };
}

describe('useChatSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.token = 'token-a';
    state.socket = makeFakeSocket();
  });

  it('kết nối bằng token hiện tại và bắt đầu ở trạng thái connecting', () => {
    const { result } = renderHook(() => useChatSocket());

    expect(connectSocket).toHaveBeenCalledWith('token-a');
    expect(result.current.status).toBe('connecting');
  });

  it('đổi trạng thái theo sự kiện connect / disconnect', () => {
    const { result } = renderHook(() => useChatSocket());

    act(() => state.socket.trigger('connect'));
    expect(result.current.status).toBe('connected');

    act(() => state.socket.trigger('disconnect'));
    expect(result.current.status).toBe('disconnected');
  });

  it('socket đã kết nối sẵn thì status là connected ngay', () => {
    state.socket = makeFakeSocket(true);
    const { result } = renderHook(() => useChatSocket());
    expect(result.current.status).toBe('connected');
  });

  it('chuyển receive_message và message_error cho callback', () => {
    const onMessage = vi.fn();
    const onError = vi.fn();
    renderHook(() => useChatSocket({ onMessage, onError }));

    act(() => state.socket.trigger('receive_message', { _id: 'm1', content: 'hi' }));
    act(() => state.socket.trigger('message_error', { message: 'Đã bị chặn.', code: 'CONVERSATION_BLOCKED' }));

    expect(onMessage).toHaveBeenCalledWith({ _id: 'm1', content: 'hi' });
    expect(onError).toHaveBeenCalledWith({ message: 'Đã bị chặn.', code: 'CONVERSATION_BLOCKED' });
  });

  it('dùng callback mới nhất mà không kết nối lại', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useChatSocket({ onMessage: cb }), {
      initialProps: { cb: first },
    });

    rerender({ cb: second });
    act(() => state.socket.trigger('receive_message', { _id: 'm1' }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(connectSocket).toHaveBeenCalledTimes(1);
  });

  it('không nhận một tin nhắn hai lần dù component mount lại (StrictMode)', () => {
    const onMessage = vi.fn();
    const { unmount } = renderHook(() => useChatSocket({ onMessage }));
    unmount();
    renderHook(() => useChatSocket({ onMessage }));

    act(() => state.socket.trigger('receive_message', { _id: 'm1' }));

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(state.socket.count('receive_message')).toBe(1);
  });

  it('server từ chối token thì đăng xuất', () => {
    renderHook(() => useChatSocket());

    act(() => state.socket.trigger('connect_error', new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.')));

    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it('lỗi mạng không đăng xuất, chỉ báo đang kết nối lại', () => {
    const { result } = renderHook(() => useChatSocket());
    act(() => state.socket.trigger('connect'));

    act(() => state.socket.trigger('connect_error', new Error('websocket error')));

    expect(auth.logout).not.toHaveBeenCalled();
    expect(result.current.status).toBe('connecting');
  });

  it('rời trang thì gỡ listener và ngắt kết nối', () => {
    const { unmount } = renderHook(() => useChatSocket());
    unmount();

    expect(disconnectSocket).toHaveBeenCalledTimes(1);
    for (const event of ['connect', 'disconnect', 'connect_error', 'receive_message', 'message_error']) {
      expect(state.socket.count(event)).toBe(0);
    }
  });

  it('không có token thì không kết nối', () => {
    auth.token = null;
    const { result } = renderHook(() => useChatSocket());

    expect(connectSocket).not.toHaveBeenCalled();
    expect(result.current.status).toBe('disconnected');
  });

  describe('sendMessage', () => {
    it('emit send_message khi đã kết nối và trả true', () => {
      state.socket = makeFakeSocket(true);
      const { result } = renderHook(() => useChatSocket());
      const payload = { receiverId: 'u2', type: 'text', content: 'xin chào' };

      let sent;
      act(() => {
        sent = result.current.sendMessage(payload);
      });

      expect(sent).toBe(true);
      expect(state.socket.emit).toHaveBeenCalledWith('send_message', payload);
    });

    it('chưa kết nối thì không emit và trả false', () => {
      const { result } = renderHook(() => useChatSocket());

      let sent;
      act(() => {
        sent = result.current.sendMessage({ receiverId: 'u2', content: 'x' });
      });

      expect(sent).toBe(false);
      expect(state.socket.emit).not.toHaveBeenCalled();
    });
  });
});
