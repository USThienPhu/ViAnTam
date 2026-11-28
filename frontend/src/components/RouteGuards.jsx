import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';

// Chỉ cho người đã đăng nhập đi tiếp. Chưa đăng nhập thì chuyển về /login và nhớ trang đang mở dở.
export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

// Chỉ cho admin đi tiếp. Phải đặt bên trong ProtectedRoute.
export function AdminRoute() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <ShieldX className="h-12 w-12 text-risk-high-accent" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Bạn không có quyền truy cập.</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Trang này chỉ dành cho quản trị viên.
        </p>
        <Link
          to="/"
          className="mt-6 flex min-h-11 items-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover"
        >
          Về trang tin nhắn
        </Link>
      </div>
    );
  }
  return <Outlet />;
}

// Dành cho /login và /register: đã đăng nhập thì quay lại trang đang mở dở (hoặc "/").
export function PublicOnlyRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (isAuthenticated) {
    const from = location.state?.from;
    const target = from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/';
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}
