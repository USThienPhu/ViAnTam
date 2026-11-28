import { describe, expect, it } from 'vitest';
import {
  validateConfirmPassword,
  validateLoginPassword,
  validateLoginUsername,
  validateRegisterPassword,
  validateRegisterUsername,
} from './authValidation';

describe('validateRegisterUsername', () => {
  it.each(['abc', 'nguyen_van_a', 'HoTro_MoMo_247', 'a'.repeat(30)])('chấp nhận "%s"', (value) => {
    expect(validateRegisterUsername(value)).toBe('');
  });

  it('báo lỗi khi để trống', () => {
    expect(validateRegisterUsername('   ')).toBe('Vui lòng nhập tên đăng nhập.');
  });

  it.each(['ab', 'a'.repeat(31), 'có dấu', 'có khoảng trắng', 'ký-tự!'])('từ chối "%s"', (value) => {
    expect(validateRegisterUsername(value)).toMatch(/^Tên đăng nhập gồm 3 đến 30 ký tự/);
  });
});

describe('validateRegisterPassword', () => {
  it('chấp nhận mật khẩu từ 6 ký tự', () => {
    expect(validateRegisterPassword('123456')).toBe('');
  });

  it('báo lỗi khi để trống hoặc quá ngắn', () => {
    expect(validateRegisterPassword('')).toBe('Vui lòng nhập mật khẩu.');
    expect(validateRegisterPassword('12345')).toBe('Mật khẩu phải có ít nhất 6 ký tự.');
  });

  it('giới hạn theo byte (72), không theo số ký tự', () => {
    expect(validateRegisterPassword('a'.repeat(72))).toBe('');
    expect(validateRegisterPassword('a'.repeat(73))).toMatch(/quá dài/);
    // 25 chữ có dấu = 25 ký tự nhưng 75 byte.
    expect(validateRegisterPassword('ệ'.repeat(25))).toMatch(/quá dài/);
  });
});

describe('validateConfirmPassword', () => {
  it('kiểm tra để trống và khớp mật khẩu', () => {
    expect(validateConfirmPassword('abcdef', '')).toBe('Vui lòng nhập lại mật khẩu.');
    expect(validateConfirmPassword('abcdef', 'abcdeg')).toBe('Mật khẩu nhập lại không khớp.');
    expect(validateConfirmPassword('abcdef', 'abcdef')).toBe('');
  });
});

describe('validate đăng nhập', () => {
  it('chỉ yêu cầu không được để trống', () => {
    expect(validateLoginUsername(' ')).toBe('Vui lòng nhập tên đăng nhập.');
    expect(validateLoginUsername('a')).toBe('');
    expect(validateLoginPassword('')).toBe('Vui lòng nhập mật khẩu.');
    expect(validateLoginPassword('1')).toBe('');
  });
});
