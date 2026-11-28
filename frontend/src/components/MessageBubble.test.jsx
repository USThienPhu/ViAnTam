import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import MessageBubble from './MessageBubble';

const base = { _id: 'm1', senderId: 'u1', receiverId: 'u2', createdAt: '2026-11-28T07:05:00.000Z' };
const vietQr = (overrides) => ({
  ...base,
  type: 'image',
  imageUrl: '/uploads/1710000000-abc123def456.png',
  qrData: { isVietQR: true, bankBin: '970418', bankName: 'BIDV', accountNumber: '123456789', amount: 500000, ...overrides },
});

describe('MessageBubble: tin text', () => {
  it('tin của mình căn phải, nền hồng nhạt', () => {
    render(<MessageBubble message={{ ...base, type: 'text', content: 'Chào bạn' }} isMine />);
    const bubble = screen.getByTestId('message-bubble');
    expect(bubble).toHaveAttribute('data-mine', 'true');
    expect(bubble).toHaveClass('bg-brand-soft', 'border-brand-border');
    expect(bubble.parentElement).toHaveClass('justify-end');
    expect(screen.getByText('Chào bạn')).toBeInTheDocument();
  });

  it('tin của đối phương căn trái, nền xám nhạt', () => {
    render(<MessageBubble message={{ ...base, type: 'text', content: 'Chào' }} isMine={false} />);
    const bubble = screen.getByTestId('message-bubble');
    expect(bubble).toHaveClass('bg-slate-100');
    expect(bubble.parentElement).toHaveClass('justify-start');
  });

  it('hiển thị giờ gửi', () => {
    render(<MessageBubble message={{ ...base, type: 'text', content: 'x', createdAt: new Date(2026, 10, 28, 9, 30).toISOString() }} isMine />);
    expect(screen.getByText('09:30')).toBeInTheDocument();
  });

  it('nội dung HTML hiển thị dạng chữ, không bị thực thi', () => {
    const evil = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    const { container } = render(<MessageBubble message={{ ...base, type: 'text', content: evil }} isMine={false} />);
    expect(screen.getByText(evil)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('link trong tin nhắn không tự biến thành liên kết bấm được', () => {
    render(<MessageBubble message={{ ...base, type: 'text', content: 'xem https://m0mo-xacminh.xyz' }} isMine={false} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('giữ xuống dòng trong nội dung', () => {
    render(<MessageBubble message={{ ...base, type: 'text', content: 'a\nb' }} isMine />);
    expect(screen.getByText(/a\s*b/)).toHaveClass('whitespace-pre-wrap');
  });
});

describe('MessageBubble: ảnh QR', () => {
  it('hiện ảnh với địa chỉ ghép từ origin của backend', () => {
    render(<MessageBubble message={vietQr()} isMine />);
    const img = screen.getByRole('img', { name: /Ảnh được gửi/ });
    expect(img.getAttribute('src')).toMatch(/^https?:\/\/[^/]+\/uploads\/1710000000-abc123def456\.png$/);
    expect(img.getAttribute('src')).not.toMatch(/^\/uploads/);
  });

  it('ảnh mở trong tab mới và an toàn (noopener)', () => {
    render(<MessageBubble message={vietQr()} isMine />);
    const link = screen.getByRole('link', { name: 'Mở ảnh trong tab mới' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it.each([
    ['BIDV', '970418', '123456789', 500000, '500.000đ'],
    ['MBBank', '970422', '0987654321', 20000, '20.000đ'],
    ['Vietcombank', '970436', '1122334455', 1500000, '1.500.000đ'],
  ])('thẻ tóm tắt %s hiện đúng ngân hàng, STK và số tiền', (bankName, bankBin, accountNumber, amount, expectedAmount) => {
    render(<MessageBubble message={vietQr({ bankName, bankBin, accountNumber, amount })} isMine={false} />);
    const card = screen.getByText('Mã QR chuyển khoản').parentElement.parentElement;
    expect(within(card).getByText('Ngân hàng:').nextSibling).toHaveTextContent(bankName);
    expect(within(card).getByText('STK:').nextSibling).toHaveTextContent(accountNumber);
    expect(within(card).getByText('Số tiền:').nextSibling).toHaveTextContent(expectedAmount);
  });

  it('STK và số tiền dùng font monospace', () => {
    render(<MessageBubble message={vietQr()} isMine />);
    expect(screen.getByText('123456789')).toHaveClass('font-mono');
    expect(screen.getByText('500.000đ')).toHaveClass('font-mono');
  });

  it('hiện nội dung chuyển khoản khi có', () => {
    render(<MessageBubble message={vietQr({ purpose: 'Xac minh' })} isMine />);
    expect(screen.getByText('Xac minh')).toBeInTheDocument();
  });

  it('không có số tiền thì ẩn dòng Số tiền', () => {
    render(<MessageBubble message={vietQr({ amount: undefined })} isMine />);
    expect(screen.queryByText('Số tiền:')).not.toBeInTheDocument();
    expect(screen.getByText('STK:')).toBeInTheDocument();
  });

  it('BIN chưa có tên ngân hàng thì ghi rõ không xác định kèm BIN', () => {
    render(<MessageBubble message={vietQr({ bankName: undefined, bankBin: '999999' })} isMine />);
    expect(screen.getByText('Ngân hàng không xác định (BIN 999999)')).toBeInTheDocument();
  });

  it('ảnh không phải VietQR thì không có thẻ tóm tắt', () => {
    const message = { ...vietQr(), qrData: { isVietQR: false } };
    render(<MessageBubble message={message} isMine />);
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.queryByText('Mã QR chuyển khoản')).not.toBeInTheDocument();
  });

  it('qrData giả isVietQR=true nhưng thiếu STK thì không hiện thẻ', () => {
    const message = vietQr({ accountNumber: undefined });
    render(<MessageBubble message={message} isMine />);
    expect(screen.queryByText('Mã QR chuyển khoản')).not.toBeInTheDocument();
  });

  it('tin text không bao giờ hiện thẻ VietQR dù có qrData', () => {
    render(<MessageBubble message={{ ...base, type: 'text', content: 'x', qrData: vietQr().qrData }} isMine />);
    expect(screen.queryByText('Mã QR chuyển khoản')).not.toBeInTheDocument();
  });

  it('ảnh lỗi tải thì hiện thông báo thay vì ảnh hỏng, vẫn giữ thẻ VietQR', () => {
    render(<MessageBubble message={vietQr()} isMine />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('Không tải được ảnh.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Mã QR chuyển khoản')).toBeInTheDocument();
  });

  it.each(['javascript:alert(1)', 'http://evil.com/a.png', '/etc/passwd', ''])(
    'imageUrl không hợp lệ "%s" không được nhúng vào <img>',
    (imageUrl) => {
      render(<MessageBubble message={{ ...vietQr(), imageUrl }} isMine />);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText('Không tải được ảnh.')).toBeInTheDocument();
    }
  );

  it('tin ảnh kèm chú thích hiện cả ảnh lẫn chữ', () => {
    render(<MessageBubble message={{ ...vietQr(), content: 'Chuyển giúp mình nhé' }} isMine />);
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('Chuyển giúp mình nhé')).toBeInTheDocument();
  });
});
