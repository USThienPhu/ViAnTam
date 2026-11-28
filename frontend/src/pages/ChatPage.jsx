import { MessagesSquare } from 'lucide-react';

// TẠM THỜI (Ngày 1): chỉ có empty state. Ngày 2 (W2-2.2) thay bằng Sidebar danh sách user + ChatWindow.
export default function ChatPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 text-center">
      <MessagesSquare className="h-12 w-12 text-slate-600" aria-hidden="true" />
      <h1 className="mt-4 text-base font-semibold text-slate-900">
        Chọn một cuộc trò chuyện để bắt đầu
      </h1>
    </div>
  );
}
