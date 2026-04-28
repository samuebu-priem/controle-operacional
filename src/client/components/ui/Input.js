import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Input({ label, helperText, errorText, className = "", ...props }) {
    return (_jsxs("label", { className: `input-field ${className}`.trim(), children: [label ? _jsx("span", { className: "input-field__label", children: label }) : null, _jsx("input", { className: `input ${errorText ? "input--error" : ""}`.trim(), ...props }), helperText ? _jsx("small", { className: "input-field__help", children: helperText }) : null, errorText ? _jsx("small", { className: "input-field__error", children: errorText }) : null] }));
}
export function Textarea({ label, helperText, errorText, className = "", ...props }) {
    return (_jsxs("label", { className: `input-field ${className}`.trim(), children: [label ? _jsx("span", { className: "input-field__label", children: label }) : null, _jsx("textarea", { className: `input input--textarea ${errorText ? "input--error" : ""}`.trim(), ...props }), helperText ? _jsx("small", { className: "input-field__help", children: helperText }) : null, errorText ? _jsx("small", { className: "input-field__error", children: errorText }) : null] }));
}
