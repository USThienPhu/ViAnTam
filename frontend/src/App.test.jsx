import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App (trang xem trước theme)', () => {
  it('hiển thị tên dự án và nút chính bằng tiếng Việt', () => {
    render(<App />);
    expect(screen.getByText('AegisAI')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kiểm tra lừa đảo' })).toBeInTheDocument();
  });

  it('hiển thị đủ 3 mức độ rủi ro', () => {
    render(<App />);
    expect(screen.getByTestId('risk-low')).toBeInTheDocument();
    expect(screen.getByTestId('risk-medium')).toBeInTheDocument();
    expect(screen.getByTestId('risk-high')).toBeInTheDocument();
  });
});
