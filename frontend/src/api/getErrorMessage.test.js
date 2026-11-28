import { describe, expect, it } from 'vitest';
import getErrorMessage from './getErrorMessage';

describe('getErrorMessage', () => {
  it('lấy message tiếng Việt từ response của server', () => {
    const error = { response: { data: { message: 'Tên đăng nhập đã tồn tại.' } } };
    expect(getErrorMessage(error)).toBe('Tên đăng nhập đã tồn tại.');
  });

  it('dùng thông báo mặc định khi server không trả message', () => {
    expect(getErrorMessage({ response: { data: {} } }, 'Lỗi mặc định.')).toBe('Lỗi mặc định.');
  });

  it('báo mất kết nối khi không có response', () => {
    expect(getErrorMessage(new Error('Network Error'))).toBe(
      'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.'
    );
  });
});
