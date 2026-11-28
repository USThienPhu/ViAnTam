import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';
import failOnConsole from '../test/failOnConsole';

failOnConsole();

let api;
function Probe() {
  api = useToast();
  return null;
}

function setup() {
  render(
    <ToastProvider>
      <Probe />
    </ToastProvider>
  );
}

const show = (...args) => act(() => api.showToast(...args));
const advance = (ms) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastProvider', () => {
  it('lỗi hiện với role alert, tự tắt sau 6 giây', () => {
    setup();
    show('Không thể kết nối tới máy chủ.');
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể kết nối tới máy chủ.');

    advance(5900);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    advance(200);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('thông báo thành công và thông tin dùng role status, tự tắt sau 4 giây', () => {
    setup();
    show('Đã lưu.', { type: 'success' });
    show('Lưu ý nhỏ.', { type: 'info' });
    expect(screen.getAllByRole('status')).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    advance(4100);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('nút Đóng thông báo xóa toast ngay', () => {
    setup();
    show('Lỗi tạm thời.');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cùng một lỗi không bị xếp chồng và được tính lại thời gian', () => {
    setup();
    show('Mất mạng.');
    advance(4000);
    show('Mất mạng.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);

    advance(4000); // 8s từ lần đầu nhưng mới 4s từ lần hiện lại
    expect(screen.getByRole('alert')).toBeInTheDocument();
    advance(2100);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cùng id thì thay thế nội dung và kiểu của toast cũ', () => {
    setup();
    show('Đang ngoại tuyến.', { id: 'net', duration: 0 });
    show('Đã có mạng.', { id: 'net', type: 'success' });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Đã có mạng.');
  });

  it('duration 0 giữ toast cho tới khi đóng', () => {
    setup();
    show('Giữ lại.', { duration: 0 });
    advance(60000);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('dismissToast đóng theo id', () => {
    setup();
    show('Sẽ bị đóng.', { id: 'x', duration: 0 });
    act(() => api.dismissToast('x'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('hiện tối đa 3 toast, toast cũ nhất bị bỏ trước', () => {
    setup();
    ['Lỗi 1', 'Lỗi 2', 'Lỗi 3', 'Lỗi 4'].forEach((message) => show(message));

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(3);
    expect(screen.queryByText('Lỗi 1')).not.toBeInTheDocument();
    expect(screen.getByText('Lỗi 4')).toBeInTheDocument();
  });

  it('bỏ qua thông báo rỗng và kiểu không hợp lệ thì coi là lỗi', () => {
    setup();
    show('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    show('Kiểu lạ.', { type: 'khong-hop-le' });
    expect(screen.getByRole('alert')).toHaveTextContent('Kiểu lạ.');
  });

  it('unmount thì dọn timer, không báo lỗi', () => {
    const { unmount } = render(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );
    show('Sắp unmount.');
    unmount();
    expect(() => vi.advanceTimersByTime(10000)).not.toThrow();
  });
});

describe('useToast', () => {
  it('dùng ngoài ToastProvider thì báo lỗi rõ ràng', () => {
    // React in lỗi ra console khi component ném; chỉ trường hợp này được phép.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useToast phải được dùng bên trong <ToastProvider>.');
    spy.mockRestore();
  });
});
