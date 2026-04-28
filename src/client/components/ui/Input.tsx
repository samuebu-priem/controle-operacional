type ChangeEventLike = {
  target: {
    value: string;
  };
};

type InputProps = {
  label?: string;
  helperText?: string;
  errorText?: string;
  className?: string;
  value?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: (event: ChangeEventLike) => void;
};

type TextareaProps = {
  label?: string;
  helperText?: string;
  errorText?: string;
  className?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: (event: ChangeEventLike) => void;
};

export default function Input({ label, helperText, errorText, className = "", ...props }: InputProps) {
  return (
    <label className={`input-field ${className}`.trim()}>
      {label ? <span className="input-field__label">{label}</span> : null}
      <input className={`input ${errorText ? "input--error" : ""}`.trim()} {...props} />
      {helperText ? <small className="input-field__help">{helperText}</small> : null}
      {errorText ? <small className="input-field__error">{errorText}</small> : null}
    </label>
  );
}

export function Textarea({ label, helperText, errorText, className = "", ...props }: TextareaProps) {
  return (
    <label className={`input-field ${className}`.trim()}>
      {label ? <span className="input-field__label">{label}</span> : null}
      <textarea className={`input input--textarea ${errorText ? "input--error" : ""}`.trim()} {...props} />
      {helperText ? <small className="input-field__help">{helperText}</small> : null}
      {errorText ? <small className="input-field__error">{errorText}</small> : null}
    </label>
  );
}
