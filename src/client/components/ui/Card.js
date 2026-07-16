import { jsx as _jsx } from "react/jsx-runtime";
export default function Card({ children, className = "" }) {
    return _jsx("section", { className: `card section-card-system ${className}`.trim(), children: children });
}
