import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import NetworkStatusToasts from './NetworkStatusToasts';
import { ToastProvider } from '../context/ToastContext';
import failOnConsole from '../test/failOnConsole';

failOnConsole();

function setup() {
  return render(
    <ToastProvider>
      <NetworkStatusToasts />
    </ToastProvider>
  );
}

const fire = (name) => act(() => window.dispatchEvent(new Event(name)));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NetworkStatusToasts', () => {
  it('mất mạng thì hiện toast lỗi và giữ lại cho tới khi có mạng', () => {
    setup();
    fire('offline');
    expect(screen.getByRole('alert')).toHaveTextContent('Mất kết nối mạng.');
  });

  it('có mạng lại thì thay toast lỗi bằng toast thành công', () => {
    setup();
    fire('offline');
    fire('online');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Đã kết nối mạng trở lại.');
  });

  it('mở trang khi đã ngoại tuyến thì báo ngay', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    setup();
    expect(screen.getByRole('alert')).toHaveTextContent('Mất kết nối mạng.');
  });

  it('đang online lúc mở trang thì không hiện gì', () => {
    setup();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('unmount thì ngừng lắng nghe sự kiện mạng', () => {
    const { unmount } = setup();
    unmount();
    expect(() => fire('offline')).not.toThrow();
  });
});
