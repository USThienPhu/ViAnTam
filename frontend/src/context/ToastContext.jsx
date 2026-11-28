import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';

// Toast dùng chung cho thông báo thoáng qua (lỗi mạng, upload sai định dạng, API lỗi...).
// Lỗi gắn với một form hoặc có nút "Thử lại" vẫn hiện ngay tại chỗ, không đi qua đây.

const ToastContext = createContext(null);

const MAX_TOASTS = 3;
const DEFAULT_DURATION = { error: 6000, success: 4000, info: 4000 };

// Khai báo tên class đầy đủ để Tailwind v4 sinh CSS (không ghép chuỗi động).
const TOAST_STYLES = {
  error: {
    role: 'alert',
    box: 'border-risk-high-border bg-risk-high-bg text-risk-high-text',
    icon: 'text-risk-high-accent',
    Icon: CircleAlert,
  },
  success: {
    role: 'status',
    box: 'border-risk-low-border bg-risk-low-bg text-risk-low-text',
    icon: 'text-risk-low-accent',
    Icon: CircleCheck,
  },
  info: {
    role: 'status',
    box: 'border-slate-200 bg-white text-slate-900',
    icon: 'text-slate-600',
    Icon: Info,
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const clearTimer = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback(
    (id) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    },
    [clearTimer]
  );

  /**
   * showToast(message, { type = 'error', duration, id })
   *  - type: 'error' | 'success' | 'info'
   *  - duration: mili giây; 0 là giữ lại cho tới khi người dùng đóng hoặc gọi dismissToast
   *  - id: cùng id thì thay thế toast cũ. Mặc định id = type + nội dung nên cùng một lỗi không bị xếp chồng.
   * Trả về id của toast.
   */
  const showToast = useCallback(
    (message, { type = 'error', duration, id } = {}) => {
      if (!message) return null;
      const toastType = TOAST_STYLES[type] ? type : 'error';
      const toastId = id ?? `${toastType}:${message}`;
      const timeout = duration ?? DEFAULT_DURATION[toastType];

      clearTimer(toastId);
      setToasts((prev) => [...prev.filter((toast) => toast.id !== toastId), { id: toastId, type: toastType, message }].slice(-MAX_TOASTS));
      if (timeout > 0) {
        timers.current.set(
          toastId,
          window.setTimeout(() => dismissToast(toastId), timeout)
        );
      }
      return toastId;
    },
    [clearTimer, dismissToast]
  );

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach((timer) => window.clearTimeout(timer));
      active.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// Đặt giữa phía trên, dưới Navbar (h-14), để không đè lên toast riêng của ChatSafetyActions ở góc phải dưới.
function ToastViewport({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type];
        const { Icon } = style;
        return (
          <div
            key={toast.id}
            role={style.role}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border py-2.5 pr-1.5 pl-4 text-sm font-medium shadow-lg ${style.box}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.icon}`} aria-hidden="true" />
            <span className="min-w-0 flex-1 py-0.5 break-words">{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Đóng thông báo"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors duration-200 hover:bg-black/5"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast phải được dùng bên trong <ToastProvider>.');
  }
  return context;
}
