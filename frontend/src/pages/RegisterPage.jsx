import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import getErrorMessage from '../api/getErrorMessage';
import {
  validateConfirmPassword,
  validateRegisterPassword,
  validateRegisterUsername,
} from '../utils/authValidation';
import AuthLayout from '../components/AuthLayout';
import TextField from '../components/TextField';
import PasswordField from '../components/PasswordField';

export default function RegisterPage() {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = {
      username: validateRegisterUsername(username),
      password: validateRegisterPassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };
    setErrors(nextErrors);
    setServerError('');
    if (nextErrors.username) return usernameRef.current?.focus();
    if (nextErrors.password) return passwordRef.current?.focus();
    if (nextErrors.confirm) return confirmRef.current?.focus();

    setSubmitting(true);
    try {
      // Ô nhập lại mật khẩu chỉ kiểm tra ở client, không gửi lên server.
      await register(username.trim(), password);
    } catch (error) {
      const message = getErrorMessage(error, 'Đăng ký không thành công. Vui lòng thử lại.');
      if (error.response?.status === 409) {
        setErrors({ username: message });
        usernameRef.current?.focus();
      } else {
        setServerError(message);
      }
      setSubmitting(false);
    }
  }

  function handleChange(setter, field) {
    return (event) => {
      setter(event.target.value);
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
      if (serverError) setServerError('');
    };
  }

  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle="Đăng ký miễn phí để bắt đầu trò chuyện an toàn hơn."
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-brand-primary hover:text-brand-hover">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {serverError && (
          <div
            role="alert"
            className="rounded-xl border border-risk-high-border bg-risk-high-bg px-3 py-2 text-sm text-risk-high-text"
          >
            {serverError}
          </div>
        )}

        <TextField
          id="register-username"
          label="Tên đăng nhập"
          hint="3 đến 30 ký tự: chữ không dấu, số hoặc dấu gạch dưới (_)."
          inputRef={usernameRef}
          value={username}
          onChange={handleChange(setUsername, 'username')}
          error={errors.username}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
        />

        <PasswordField
          id="register-password"
          label="Mật khẩu"
          hint="Ít nhất 6 ký tự."
          inputRef={passwordRef}
          value={password}
          onChange={handleChange(setPassword, 'password')}
          error={errors.password}
          autoComplete="new-password"
        />

        <PasswordField
          id="register-confirm"
          label="Nhập lại mật khẩu"
          inputRef={confirmRef}
          value={confirm}
          onChange={handleChange(setConfirm, 'confirm')}
          error={errors.confirm}
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={submitting}
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </button>
      </form>
    </AuthLayout>
  );
}
