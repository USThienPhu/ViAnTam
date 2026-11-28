import { describe, expect, it } from 'vitest';
import axiosInstance from './axiosInstance';
import { getMessages, resolveImageUrl, uploadImage } from './chatApi';

// mockApi chỉ đọc được body JSON, còn upload gửi FormData nên dùng adapter riêng ở đây.
function fakeServer(handler) {
  const calls = [];
  axiosInstance.defaults.adapter = async (config) => {
    calls.push(config);
    return { data: handler(config), status: 200, statusText: '', headers: {}, config, request: {} };
  };
  return calls;
}

describe('resolveImageUrl', () => {
  it('ghép đường dẫn /uploads/ với origin của backend', () => {
    expect(resolveImageUrl('/uploads/1710000000-abc.png')).toBe(
      `${new URL(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').origin}/uploads/1710000000-abc.png`
    );
  });

  it.each([
    ['rỗng', ''],
    ['undefined', undefined],
    ['không phải chuỗi', 123],
    ['URL ngoài', 'http://evil.com/a.png'],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:image/png;base64,AAAA'],
    ['đường dẫn khác', '/etc/passwd'],
    ['chứa ..', '/uploads/../.env'],
  ])('trả chuỗi rỗng với %s', (_name, value) => {
    expect(resolveImageUrl(value)).toBe('');
  });
});

describe('getMessages', () => {
  it('gọi GET /messages/:id và trả mảng tin nhắn', async () => {
    const calls = fakeServer(() => [{ _id: 'm1', content: 'xin chào' }]);

    const result = await getMessages('665f0000000000000000abcd');

    expect(calls[0].method).toBe('get');
    expect(calls[0].url).toBe('/messages/665f0000000000000000abcd');
    expect(result).toEqual([{ _id: 'm1', content: 'xin chào' }]);
  });

  it('mã hóa id có ký tự đặc biệt trong đường dẫn', async () => {
    const calls = fakeServer(() => []);
    await getMessages('a/b?c');
    expect(calls[0].url).toBe('/messages/a%2Fb%3Fc');
  });

  it('tự gắn JWT', async () => {
    localStorage.setItem('aegisai_token', 'tok');
    const calls = fakeServer(() => []);
    await getMessages('x');
    expect(calls[0].headers.Authorization).toBe('Bearer tok');
  });
});

describe('uploadImage', () => {
  it('gửi FormData field "image" tới POST /messages/upload và trả dữ liệu server', async () => {
    const payload = { imageUrl: '/uploads/1-a.png', qrData: { isVietQR: false }, extractedLinks: [] };
    const calls = fakeServer(() => payload);
    const file = new File([new Uint8Array([1, 2, 3])], 'qr.png', { type: 'image/png' });

    const result = await uploadImage(file);

    expect(calls[0].method).toBe('post');
    expect(calls[0].url).toBe('/messages/upload');
    expect(calls[0].data).toBeInstanceOf(FormData);
    expect(calls[0].data.get('image').name).toBe('qr.png');
    expect(result).toEqual(payload);
  });

  it('không tự ép Content-Type thủ công (để trình duyệt thêm boundary)', async () => {
    const calls = fakeServer(() => ({}));
    await uploadImage(new File(['x'], 'a.png', { type: 'image/png' }));
    const contentType = calls[0].headers.getContentType?.() ?? calls[0].headers['Content-Type'];
    expect(String(contentType ?? '')).not.toBe('application/json');
  });
});
