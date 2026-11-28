// Lưu phiên đăng nhập trong localStorage. Dùng chung cho axiosInstance và AuthContext.

const TOKEN_KEY = 'aegisai_token';
const USER_KEY = 'aegisai_user';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function readSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    if (token && user && typeof user === 'object') {
      return { token, user };
    }
  } catch {
    // Dữ liệu hỏng: bỏ qua và xóa bên dưới.
  }
  clearSession();
  return { token: null, user: null };
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // localStorage không khả dụng (chế độ riêng tư chặn truy cập): không có gì để xóa.
  }
}
