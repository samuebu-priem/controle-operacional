import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Select({ label, helperText, errorText, className = "", children, ...props }) {
    return (_jsxs("label", { className: `input-field ${className}`.trim(), children: [label ? _jsx("span", { className: "input-field__label", children: label }) : null, _jsx("select", { className: `select ${errorText ? "input--error" : ""}`.trim(), ...props, children: children }), helperText ? _jsx("small", { className: "input-field__help", children: helperText }) : null, errorText ? _jsx("small", { className: "input-field__error", children: errorText }) : null] }));
}
