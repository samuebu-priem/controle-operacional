import { jsx as _jsx } from "react/jsx-runtime";
export default function AppLayout({ children, className = "" }) {
    return (_jsx("div", { className: `app-shell app-layout ${className}`.trim(), children: _jsx("div", { className: "app-shell__frame", children: _jsx("main", { className: "app-shell__main", children: children }) }) }));
}
