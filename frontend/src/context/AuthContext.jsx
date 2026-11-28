import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance, { setUnauthorizedHandler } from '../api/axiosInstance';
import { clearSession, readSession, saveSession, saveUser } from '../api/authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readSession());
  // Có token trong localStorage thì phải hỏi server (GET /auth/me) trước khi quyết định đã đăng nhập hay chưa.
  const [loading, setLoading] = useState(() => Boolean(readSession().token));

  // Token hiện tại, để bỏ qua kết quả /auth/me trả về muộn sau khi người dùng đã đăng xuất hoặc đổi tài khoản.
  const tokenRef = useRef(session.token);
  tokenRef.current = session.token;

  const logout = useCallback(() => {
    clearSession();
    setSession({ token: null, user: null });
  }, []);

  const startSession = useCallback((token, user) => {
    saveSession(token, user);
    setSession({ token, user });
  }, []);

  // Khi bất kỳ API nào trả 401, axiosInstance gọi hàm này để đăng xuất.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Kiểm tra lại phiên đăng nhập đã lưu khi tải trang.
  useEffect(() => {
    const { token } = readSession();
    if (!token) return undefined;

    let cancelled = false;
    axiosInstance
      .get('/auth/me')
      .then(({ data }) => {
        if (cancelled || tokenRef.current !== token) return;
        saveUser(data);
        setSession({ token, user: data });
      })
      .catch((error) => {
        if (cancelled || tokenRef.current !== token) return;
        // 401 đã được axiosInstance xử lý bằng logout(). Lỗi khác (mất mạng, server lỗi)
        // thì giữ phiên đã lưu để người dùng không bị đăng xuất oan.
        if (error.response?.status === 401) logout();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [logout]);

  const login = useCallback(
    async (username, password) => {
      const { data } = await axiosInstance.post('/auth/login', { username, password });
      startSession(data.token, data.user);
      return data.user;
    },
    [startSession]
  );

  const register = useCallback(
    async (username, password) => {
      const { data } = await axiosInstance.post('/auth/register', { username, password });
      // Response đăng ký không có isFlagged, tài khoản mới luôn là false.
      startSession(data.token, { isFlagged: false, ...data.user });
      return data.user;
    },
    [startSession]
  );

  const value = useMemo(
    () => ({
      user: session.user,
      token: session.token,
      isAuthenticated: Boolean(session.token && session.user),
      loading,
      login,
      register,
      logout,
    }),
    [session, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được dùng bên trong <AuthProvider>.');
  }
  return context;
}
