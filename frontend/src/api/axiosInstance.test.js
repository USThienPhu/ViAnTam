import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance, { setUnauthorizedHandler } from './axiosInstance';
import { mockApi } from '../test/mockApi';

describe('axiosInstance', () => {
  const onUnauthorized = vi.fn();

  beforeEach(() => {
    onUnauthorized.mockClear();
    setUnauthorizedHandler(onUnauthorized);
  });

  afterEach(() => {
    setUnauthorizedHandler(null);
  });

  it('tự gắn Authorization: Bearer <token> khi đã đăng nhập', async () => {
    localStorage.setItem('aegisai_token', 'abc123');
    const calls = mockApi({ 'GET /users': () => ({ data: [] }) });

    await axiosInstance.get('/users');

    expect(calls[0].headers.Authorization).toBe('Bearer abc123');
  });

  it('không gắn Authorization khi chưa có token', async () => {
    const calls = mockApi({ 'GET /users': () => ({ data: [] }) });

    await axiosInstance.get('/users');

    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it('gặp 401 ở API thường thì gọi handler đăng xuất và vẫn reject lỗi', async () => {
    mockApi({ 'GET /users': () => ({ status: 401, data: { message: 'Hết hạn' } }) });

    await expect(axiosInstance.get('/users')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it.each(['/auth/login', '/auth/register'])(
    '401 từ %s là lỗi nhập sai thông tin, không đăng xuất',
    async (url) => {
      mockApi({ [`POST ${url}`]: () => ({ status: 401, data: { message: 'Sai' } }) });

      await expect(axiosInstance.post(url, {})).rejects.toBeTruthy();
      expect(onUnauthorized).not.toHaveBeenCalled();
    }
  );

  it('lỗi khác 401 (403, 500) không đăng xuất', async () => {
    mockApi({
      'GET /a': () => ({ status: 403, data: {} }),
      'GET /b': () => ({ status: 500, data: {} }),
    });

    await expect(axiosInstance.get('/a')).rejects.toBeTruthy();
    await expect(axiosInstance.get('/b')).rejects.toBeTruthy();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('mất mạng không đăng xuất', async () => {
    mockApi({ 'GET /users': () => ({ networkError: true }) });

    await expect(axiosInstance.get('/users')).rejects.toBeTruthy();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
