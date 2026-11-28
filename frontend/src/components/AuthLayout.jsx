import { ShieldCheck } from 'lucide-react';

// Khung chung cho trang Đăng nhập và Đăng ký.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <main className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <ShieldCheck className="h-8 w-8 text-brand-primary" aria-hidden="true" />
          <span className="text-2xl font-bold text-brand-primary">AegisAI</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm leading-relaxed text-slate-600">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

        {footer && <p className="mt-4 text-center text-sm text-slate-600">{footer}</p>}
      </main>
    </div>
  );
}
