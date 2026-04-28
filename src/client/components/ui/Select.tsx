import type { ReactNode } from "react";

type SelectProps = {
  label?: string;
  helperText?: string;
  errorText?: string;
  className?: string;
  value?: string;
  disabled?: boolean;
  children: ReactNode;
  onChange?: (event: { target: { value: string } }) => void;
};

export default function Select({
  label,
  helperText,
  errorText,
  className = "",
  children,
  ...props
}: SelectProps) {
  return (
    <label className={`input-field ${className}`.trim()}>
      {label ? <span className="input-field__label">{label}</span> : null}
      <select className={`select ${errorText ? "input--error" : ""}`.trim()} {...props}>
        {children}
      </select>
      {helperText ? <small className="input-field__help">{helperText}</small> : null}
      {errorText ? <small className="input-field__error">{errorText}</small> : null}
    </label>
  );
}
