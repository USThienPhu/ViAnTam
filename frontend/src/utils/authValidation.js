// Luật kiểm tra khớp với backend (docs/auth-spec.md mục 3.1). Backend vẫn kiểm tra lại, đây chỉ để báo lỗi sớm.

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/;
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_BYTES = 72;

export function validateLoginUsername(username) {
  if (!username.trim()) return 'Vui lòng nhập tên đăng nhập.';
  return '';
}

export function validateLoginPassword(password) {
  if (!password) return 'Vui lòng nhập mật khẩu.';
  return '';
}

export function validateRegisterUsername(username) {
  const value = username.trim();
  if (!value) return 'Vui lòng nhập tên đăng nhập.';
  if (!USERNAME_PATTERN.test(value)) {
    return 'Tên đăng nhập gồm 3 đến 30 ký tự: chữ không dấu, số hoặc dấu gạch dưới (_).';
  }
  return '';
}

export function validateRegisterPassword(password) {
  if (!password) return 'Vui lòng nhập mật khẩu.';
  if (password.length < PASSWORD_MIN_LENGTH) return 'Mật khẩu phải có ít nhất 6 ký tự.';
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return 'Mật khẩu quá dài, vui lòng rút gọn (tối đa 72 byte).';
  }
  return '';
}

export function validateConfirmPassword(password, confirm) {
  if (!confirm) return 'Vui lòng nhập lại mật khẩu.';
  if (password !== confirm) return 'Mật khẩu nhập lại không khớp.';
  return '';
}
