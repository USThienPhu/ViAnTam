import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import TextField from './TextField';

// Ô mật khẩu có nút hiện/ẩn.
export default function PasswordField({ id, label, ...props }) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';
  const Icon = visible ? EyeOff : Eye;

  return (
    <TextField
      id={id}
      label={label}
      type={visible ? 'text' : 'password'}
      endAdornment={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={`${toggleLabel} (${label})`}
          aria-pressed={visible}
          className="absolute right-0 top-0 flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition-colors duration-200 hover:text-slate-900"
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </button>
      }
      {...props}
    />
  );
}
