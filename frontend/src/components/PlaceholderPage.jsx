import { Construction } from 'lucide-react';

// TẠM THỜI: trang giữ chỗ cho các tính năng chưa có (xem ghi chú trong App.jsx).
export default function PlaceholderPage({ title }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <Construction className="h-12 w-12 text-slate-600" aria-hidden="true" />
      <h1 className="mt-4 text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Tính năng này đang được phát triển.
      </p>
    </div>
  );
}
