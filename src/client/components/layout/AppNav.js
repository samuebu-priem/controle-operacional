import { jsx as _jsx } from "react/jsx-runtime";
import { NavLink } from "react-router-dom";

const items = [
  { label: "Inicio", to: "/" },
  { label: "Expressa", to: "/inspecao-expressa" },
  { label: "Colaboradores", to: "/colaboradores" },
  { label: "Nova inspecao", to: "/nova-inspecao" },
  { label: "Historico", to: "/historico" },
  { label: "Registro de frotas", to: "/registro-frotas" }
];

export default function AppNav() {
  return _jsx("nav", {
    className: "app-nav",
    "aria-label": "Navegacao principal",
    children: items.map((item) => _jsx(NavLink, { to: item.to, end: item.to === "/", className: ({ isActive }) => `nav-item${isActive ? " active" : ""}`, children: item.label }, item.to))
  });
}
