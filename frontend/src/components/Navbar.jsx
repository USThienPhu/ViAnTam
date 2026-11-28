import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { History, Lightbulb, LogOut, Menu, MessageCircle, ShieldCheck, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Tin nhắn', Icon: MessageCircle, end: true },
  { to: '/history', label: 'Lịch sử', Icon: History },
  { to: '/tips', label: 'Mẹo an toàn', Icon: Lightbulb },
  { to: '/admin', label: 'Quản trị', Icon: ShieldCheck, adminOnly: true },
];

function linkClass({ isActive }) {
  return `flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors duration-200 ${
    isActive
      ? 'bg-brand-soft text-brand-primary'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin');

  function handleLogout() {
    setMenuOpen(false);
    // Điều hướng thẳng về /login để không bị gắn "trang đang mở dở" cho lần đăng nhập sau.
    navigate('/login', { replace: true });
    logout();
  }

  function renderLinks() {
    return items.map(({ to, label, Icon, end }) => (
      <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setMenuOpen(false)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </NavLink>
    ));
  }

  return (
    <header
      className="sticky top-0 z-30 border-b border-slate-200 bg-white"
      onKeyDown={(event) => event.key === 'Escape' && setMenuOpen(false)}
    >
      <div className="flex h-14 items-center gap-4 px-4">
        <NavLink to="/" className="flex items-center gap-2" aria-label="AegisAI - về trang tin nhắn">
          <ShieldCheck className="h-6 w-6 text-brand-primary" aria-hidden="true" />
          <span className="text-base font-bold text-brand-primary">AegisAI</span>
        </NavLink>

        <nav aria-label="Điều hướng chính" className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {renderLinks()}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <span className="flex max-w-48 items-center gap-1.5 text-sm font-medium text-slate-600" title={user?.username}>
            <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{user?.username}</span>
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Đăng xuất
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          className="ml-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-900 transition-colors duration-200 hover:bg-slate-100 md:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="space-y-1 border-t border-slate-200 bg-white p-3 md:hidden">
          <nav aria-label="Điều hướng chính (di động)" className="space-y-1">
            {renderLinks()}
          </nav>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-600">
              <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{user?.username}</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
