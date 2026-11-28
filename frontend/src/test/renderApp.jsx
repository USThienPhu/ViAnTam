import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AppRoutes } from '../App';

export const USER = { id: 'u1', username: 'demo_user', role: 'user', isFlagged: false };
export const ADMIN = { id: 'a1', username: 'admin', role: 'admin', isFlagged: false };

// Giả lập trạng thái đã đăng nhập từ lần trước (có sẵn trong localStorage).
export function seedSession(user = USER, token = 'token-da-luu') {
  localStorage.setItem('aegisai_token', token);
  localStorage.setItem('aegisai_user', JSON.stringify(user));
}

export function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  );
}
