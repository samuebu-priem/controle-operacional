import { jsx as _jsx } from "react/jsx-runtime";
import { NavLink } from "react-router-dom";
const items = [
    { label: "Início", to: "/" },
    { label: "Nova inspeção", to: "/nova-inspecao" },
    { label: "Histórico", to: "/historico" },
    { label: "Registro de frotas", to: "/registro-frotas" }
];
export default function BottomNav() {
    return (_jsx("nav", { className: "bottom-nav", "aria-label": "Navega\u00E7\u00E3o principal", children: items.map((item) => (_jsx(NavLink, { to: item.to, end: item.to === "/", children: ({ isActive }) => (_jsx("span", { className: `bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`, children: item.label })) }, item.to))) }));
}
