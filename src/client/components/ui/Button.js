import { jsx as _jsx } from "react/jsx-runtime";
export default function Button({ variant = "primary", className = "", children, type = "button", disabled = false, onClick }) {
    return (_jsx("button", { className: `button button-system button--${variant} ${className}`.trim(), type: type, disabled: disabled, onClick: onClick, children: children }));
}
