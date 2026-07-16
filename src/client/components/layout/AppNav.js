import { jsx as _jsx } from "react/jsx-runtime";
import { NavLink } from "react-router-dom";
import { isGestor } from "../../utils/auth";

const items = [
  { label: "Inicio", to: "/" },
  { label: "Colaboradores", to: "/colaboradores" },
  { label: "Nova inspecao", to: "/nova-inspecao" },
  { label: "Historico", to: "/historico" },
  { label: "Registro de frotas", to: "/registro-frotas" },
  { label: "Gestao de Patio", to: "/patio" },
  { label: "⚗ Produtos", to: "/produtos" },
  { label: "Painel Gerencial", to: "/painel-gerencial" }
];

export default function AppNav() {
  const canSeeManagerArea = isGestor();
  const visibleItems = items.filter((item) => item.to !== "/painel-gerencial" || canSeeManagerArea);

  return _jsx("nav", {
    className: "app-nav",
    "aria-label": "Navegacao principal",
    children: visibleItems.map((item) => _jsx(NavLink, { to: item.to, end: item.to === "/", className: ({ isActive }) => `nav-item${isActive ? " active" : ""}`, children: item.label }, item.to))
  });
}
