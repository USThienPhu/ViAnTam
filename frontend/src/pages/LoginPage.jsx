import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import getErrorMessage from '../api/getErrorMessage';
import { validateLoginPassword, validateLoginUsername } from '../utils/authValidation';
import AuthLayout from '../components/AuthLayout';
import TextField from '../components/TextField';
import PasswordField from '../components/PasswordField';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  // Đăng nhập thành công thì AuthContext có user, PublicOnlyRoute tự chuyển về trang đang mở dở hoặc "/".
  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = {
      username: validateLoginUsername(username),
      password: validateLoginPassword(password),
    };
    setErrors(nextErrors);
    setServerError('');
    if (nextErrors.username) return usernameRef.current?.focus();
    if (nextErrors.password) return passwordRef.current?.focus();

    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (error) {
      setServerError(getErrorMessage(error, 'Đăng nhập không thành công. Vui lòng thử lại.'));
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
      title="Đăng nhập"
      subtitle="Đăng nhập để nhắn tin và kiểm tra lừa đảo bằng AI."
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-brand-primary hover:text-brand-hover">
            Đăng ký
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
          id="login-username"
          label="Tên đăng nhập"
          inputRef={usernameRef}
          value={username}
          onChange={handleChange(setUsername, 'username')}
          error={errors.username}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
        />

        <PasswordField
          id="login-password"
          label="Mật khẩu"
          inputRef={passwordRef}
          value={password}
          onChange={handleChange(setPassword, 'password')}
          error={errors.password}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={submitting}
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </AuthLayout>
  );
}
