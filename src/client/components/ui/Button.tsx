import type { ReactNode } from "react";

type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  children: ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
};

export default function Button({
  variant = "primary",
  className = "",
  children,
  type = "button",
  disabled = false,
  onClick
}: ButtonProps) {
  return (
    <button className={`button button--${variant} ${className}`.trim()} type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
