import { useEffect } from 'react';
import { useToast } from '../context/ToastContext';

const NETWORK_TOAST_ID = 'network-status';

// Không hiển thị gì, chỉ báo toast khi trình duyệt mất mạng và khi có mạng lại.
// Toast mất mạng được giữ lại cho tới khi có mạng, rồi được thay bằng toast "đã kết nối lại".
export default function NetworkStatusToasts() {
  const { showToast } = useToast();

  useEffect(() => {
    function handleOffline() {
      showToast('Mất kết nối mạng. Vui lòng kiểm tra Internet của bạn.', {
        type: 'error',
        id: NETWORK_TOAST_ID,
        duration: 0,
      });
    }
    function handleOnline() {
      showToast('Đã kết nối mạng trở lại.', { type: 'success', id: NETWORK_TOAST_ID });
    }

    if (navigator.onLine === false) handleOffline();
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [showToast]);

  return null;
}
