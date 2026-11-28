// Ô nhập có nhãn hiển thị cố định, lỗi hiện ngay bên dưới ô (ui-ux-pro-max: forms & feedback).
export default function TextField({
  id,
  label,
  error,
  hint,
  inputRef,
  endAdornment,
  type = 'text',
  ...inputProps
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-900">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type={type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`h-11 w-full rounded-xl border bg-slate-100 px-3 text-base text-slate-900 transition-colors duration-200 placeholder:text-slate-500 focus:bg-white ${
            endAdornment ? 'pr-12' : ''
          } ${error ? 'border-risk-high-accent' : 'border-slate-200'}`}
          {...inputProps}
        />
        {endAdornment}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-slate-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-risk-high-text">
          {error}
        </p>
      )}
    </div>
  );
}
