import { LoaderCircle } from 'lucide-react';

export default function LoadingScreen({ message = 'Đang tải...' }) {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center gap-2 bg-slate-50 text-sm text-slate-600"
    >
      <LoaderCircle className="h-5 w-5 animate-spin text-brand-primary" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
