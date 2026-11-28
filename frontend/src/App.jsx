import { ShieldCheck, ShieldAlert, ShieldX, Sparkles } from 'lucide-react';

// TẠM THỜI (W2-1.1): trang xem trước theme để kiểm tra token trong index.css.
// W2-1.2 sẽ thay file này bằng React Router + ProtectedRoute + AdminRoute.

const RISK_LEVELS = [
  {
    key: 'low',
    label: 'Thấp',
    score: 12,
    title: 'Chưa phát hiện dấu hiệu lừa đảo',
    Icon: ShieldCheck,
    card: 'bg-risk-low-bg border-risk-low-border text-risk-low-text',
    bar: 'bg-risk-low-accent',
  },
  {
    key: 'medium',
    label: 'Trung bình',
    score: 52,
    title: 'Có dấu hiệu đáng ngờ, cần xác minh thêm',
    Icon: ShieldAlert,
    card: 'bg-risk-medium-bg border-risk-medium-border text-risk-medium-text',
    bar: 'bg-risk-medium-accent',
  },
  {
    key: 'high',
    label: 'Cao',
    score: 91,
    title: 'Nguy cơ lừa đảo cao, không nên chuyển tiền',
    Icon: ShieldX,
    card: 'bg-risk-high-bg border-risk-high-border text-risk-high-text',
    bar: 'bg-risk-high-accent',
  },
];

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex h-14 items-center border-b border-slate-200 bg-white px-4">
        <ShieldCheck className="mr-2 h-6 w-6 text-brand-primary" aria-hidden="true" />
        <span className="text-base font-bold text-brand-primary">AegisAI</span>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <section>
          <h1 className="text-xl font-bold text-slate-900">Xem trước theme AegisAI</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Trang tạm thời để kiểm tra màu sắc và font chữ theo docs/theme.md.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Nút hành động</h2>
          <button
            type="button"
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Kiểm tra lừa đảo
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Bong bóng tin nhắn</h2>
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex justify-start">
              <p className="max-w-[80%] rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm leading-relaxed text-slate-900">
                Vui lòng chuyển 500.000đ vào STK{' '}
                <span className="font-mono">123456789</span> để xác minh.
              </p>
            </div>
            <div className="flex justify-end">
              <p className="max-w-[80%] rounded-2xl rounded-br-sm border border-brand-border bg-brand-soft px-3 py-2 text-sm leading-relaxed text-slate-900">
                Dạ cho em xin thêm thông tin ạ.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Mức độ rủi ro</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {RISK_LEVELS.map(({ key, label, score, title, Icon, card, bar }) => (
              <article
                key={key}
                data-testid={`risk-${key}`}
                className={`rounded-2xl border p-4 shadow-sm ${card}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="ml-auto font-mono text-sm font-semibold">{score}/100</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
                  <div className={`h-full ${bar}`} style={{ width: `${score}%` }} />
                </div>
                <p className="mt-3 text-sm leading-relaxed">{title}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
