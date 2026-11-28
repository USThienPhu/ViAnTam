import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TipsPage from './TipsPage';

describe('TipsPage', () => {
  it('hiển thị tiêu đề và đủ 5 thẻ chiêu trò lừa đảo theo spec', () => {
    render(<TipsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Mẹo an toàn' })).toBeInTheDocument();
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual([
      'Giả danh Công an / VNeID',
      'Giả danh MoMo / Ngân hàng đòi OTP',
      'Tuyển CTV online, nạp tiền nhận việc',
      'Đầu tư lãi khủng',
      'Mã QR giả mạo',
    ]);
  });

  it('mỗi thẻ có phần dấu hiệu nhận biết và cách xử lý', () => {
    render(<TipsPage />);
    expect(screen.getAllByRole('heading', { level: 3, name: 'Dấu hiệu nhận biết' })).toHaveLength(5);
    expect(screen.getAllByRole('heading', { level: 3, name: 'Cách xử lý' })).toHaveLength(5);
  });
});
