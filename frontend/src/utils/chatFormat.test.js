import { describe, expect, it } from 'vitest';
import { formatAmount, formatTime, getInitial, getPeerId, mergeMessages } from './chatFormat';

describe('formatAmount', () => {
  it('định dạng tiền Việt có dấu chấm ngăn cách và đuôi đ', () => {
    expect(formatAmount(500000)).toBe('500.000đ');
    expect(formatAmount(20000)).toBe('20.000đ');
    expect(formatAmount(1500000)).toBe('1.500.000đ');
    expect(formatAmount(1)).toBe('1đ');
  });

  it.each([0, -5, NaN, Infinity, '500000', null, undefined])('trả chuỗi rỗng với %s', (value) => {
    expect(formatAmount(value)).toBe('');
  });
});

describe('formatTime', () => {
  it('trả giờ:phút 24 giờ', () => {
    expect(formatTime(new Date(2026, 10, 28, 14, 5).toISOString())).toBe('14:05');
    expect(formatTime(new Date(2026, 10, 28, 0, 7).toISOString())).toBe('00:07');
  });

  it.each([undefined, null, '', 'khong-phai-ngay'])('trả chuỗi rỗng với %s', (value) => {
    expect(formatTime(value)).toBe('');
  });
});

describe('getInitial', () => {
  it('lấy chữ cái đầu viết hoa', () => {
    expect(getInitial('chutro_anhminh')).toBe('C');
    expect(getInitial('  demo')).toBe('D');
  });

  it('trả ? khi không có tên', () => {
    expect(getInitial('')).toBe('?');
    expect(getInitial(undefined)).toBe('?');
  });
});

describe('getPeerId', () => {
  it('trả id người còn lại', () => {
    const message = { senderId: 'a', receiverId: 'b' };
    expect(getPeerId(message, 'a')).toBe('b');
    expect(getPeerId(message, 'b')).toBe('a');
  });
});

describe('mergeMessages', () => {
  const m = (id, time, extra = {}) => ({ _id: id, createdAt: `2026-01-01T00:00:0${time}Z`, ...extra });

  it('bỏ trùng theo _id và sắp xếp cũ -> mới', () => {
    const result = mergeMessages([m('b', 2), m('a', 1)], [m('b', 2), m('c', 3)]);
    expect(result.map((x) => x._id)).toEqual(['a', 'b', 'c']);
  });

  it('khi trùng _id thì dùng bản mới hơn', () => {
    const result = mergeMessages([m('a', 1, { content: 'cũ' })], [m('a', 1, { content: 'mới' })]);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('mới');
  });

  it('cùng thời điểm thì giữ thứ tự ổn định theo _id', () => {
    const result = mergeMessages([m('b', 1)], [m('a', 1)]);
    expect(result.map((x) => x._id)).toEqual(['a', 'b']);
  });

  it('không làm thay đổi mảng đầu vào', () => {
    const current = [m('b', 2)];
    mergeMessages(current, [m('a', 1)]);
    expect(current).toHaveLength(1);
  });
});
