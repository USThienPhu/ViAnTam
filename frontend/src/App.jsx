import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminRoute, ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards';
import Navbar from './components/Navbar';
import PlaceholderPage from './components/PlaceholderPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';

/*
 * LƯU Ý CHO AI AGENT CỦA TV1 VÀ TV3 (đọc trước khi sửa file này):
 *
 * Các route /history, /tips và /admin hiện trỏ tới <PlaceholderPage /> vì trang thật chưa có.
 * Khi bạn hoàn thành trang của mình, hãy sửa ĐÚNG dòng tương ứng bên dưới, không sửa gì khác:
 *   - TV1: /history -> HistoryPage, /tips -> TipsPage
 *   - TV3: /admin   -> AdminPage
 * Cách làm: thêm `import XxxPage from './pages/XxxPage';` ở đầu file, rồi đổi
 * element={<PlaceholderPage title="..." />} của route đó thành element={<XxxPage />}.
 * Trang của bạn phải có `export default`. Giữ nguyên route /admin nằm trong <AdminRoute />.
 * Không sửa ProtectedRoute, AdminRoute, Navbar hay AuthContext (thuộc TV2). Cần đổi thì báo TV2.
 * Mỗi người chỉ sửa dòng của mình để tránh xung đột Git.
 */

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

// Tách riêng khỏi <BrowserRouter> để test có thể bọc bằng MemoryRouter.
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ChatPage />} />
          <Route path="/history" element={<PlaceholderPage title="Lịch sử kiểm tra" />} />
          <Route path="/tips" element={<PlaceholderPage title="Mẹo an toàn" />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<PlaceholderPage title="Quản trị" />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
