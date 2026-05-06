import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import AppNav from "./AppNav";
import BottomNav from "./BottomNav";
export default function AppLayout({ children, className = "" }) {
    return (_jsxs("div", { className: `app-shell app-layout ${className}`.trim(), children: [_jsx(AppNav, {}), _jsx("div", { className: "app-shell__frame", children: _jsx("main", { className: "app-shell__main", children: children }) }), _jsx(BottomNav, {})] }));
}
