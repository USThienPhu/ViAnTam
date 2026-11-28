import { useMemo, useState } from 'react';
import { LoaderCircle, Search } from 'lucide-react';
import { getInitial } from '../utils/chatFormat';

/**
 * Danh sách người dùng bên trái ChatPage (docs/ui-ux-spec.md mục 3.2).
 * Props: users, loading, error, onRetry, selectedId, unreadIds (Set id có tin mới), onSelect(id).
 */
export default function UserSidebar({ users, loading, error, onRetry, selectedId, unreadIds, onSelect }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return keyword ? users.filter((user) => user.username.toLowerCase().includes(keyword)) : users;
  }, [users, query]);

  function renderList() {
    if (loading) {
      return (
        <p role="status" className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-600">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          Đang tải danh sách...
        </p>
      );
    }
    if (error) {
      return (
        <div role="alert" className="px-4 py-8 text-center text-sm text-slate-900">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 min-h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 font-medium transition-colors duration-200 hover:bg-slate-100"
          >
            Thử lại
          </button>
        </div>
      );
    }
    if (users.length === 0) {
      return <p className="px-4 py-8 text-center text-sm text-slate-600">Chưa có người dùng nào khác.</p>;
    }
    if (filtered.length === 0) {
      return <p className="px-4 py-8 text-center text-sm text-slate-600">Không tìm thấy người dùng phù hợp.</p>;
    }

    return (
      <ul>
        {filtered.map((user) => {
          const isSelected = user.id === selectedId;
          const hasUnread = unreadIds.has(user.id);
          return (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => onSelect(user.id)}
                aria-current={isSelected ? 'true' : undefined}
                className={`flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors duration-200 hover:bg-slate-100 ${
                  isSelected ? 'bg-brand-soft' : ''
                }`}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-primary"
                  aria-hidden="true"
                >
                  {getInitial(user.username)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">{user.username}</span>
                  {(user.isFlagged || user.isBlockedByMe) && (
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      {user.isFlagged && (
                        <span className="rounded-full border border-risk-high-border bg-risk-high-bg px-2 py-0.5 text-xs font-medium text-risk-high-text">
                          Cảnh báo
                        </span>
                      )}
                      {user.isBlockedByMe && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Đã chặn
                        </span>
                      )}
                    </span>
                  )}
                </span>
                {hasUnread && (
                  <span
                    role="img"
                    aria-label="Có tin nhắn mới"
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-primary"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      <div className="border-b border-slate-200 p-3">
        <h2 className="px-1 pb-2 text-base font-semibold text-slate-900">Tin nhắn</h2>
        <label className="relative block">
          <span className="sr-only">Tìm người dùng</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-600"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm người dùng..."
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-100 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-600"
          />
        </label>
      </div>
      <div className="flex-1 overflow-y-auto">{renderList()}</div>
    </>
  );
}
