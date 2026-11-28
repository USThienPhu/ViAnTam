import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Gọi một lần ở đầu file test (ngoài mọi describe): test nào gây ra console.error hoặc console.warn
 * (cảnh báo React như thiếu key, setState ngoài act, prop sai...) sẽ bị fail.
 * Dùng để giữ tiêu chí "không có lỗi console" của task W2-3.1.
 */
export default function failOnConsole() {
  const METHODS = ['error', 'warn'];
  let spies = [];

  beforeEach(() => {
    spies = METHODS.map((method) => vi.spyOn(console, method).mockImplementation(() => {}));
  });

  afterEach(() => {
    const logged = spies.flatMap((spy, index) =>
      spy.mock.calls.map((args) => `console.${METHODS[index]}: ${args.map((arg) => String(arg)).join(' ')}`)
    );
    spies.forEach((spy) => spy.mockRestore());
    spies = [];
    if (logged.length > 0) {
      throw new Error(`Test ghi ra console:\n${logged.join('\n')}`);
    }
  });
}
