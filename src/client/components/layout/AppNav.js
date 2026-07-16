import { createElement as h } from "react";
import { NavLink } from "react-router-dom";
import { isGestor } from "../../utils/auth";

export const navigationItems = [
  { label: "Início", icon: "⌂", to: "/" },
  { label: "Colaboradores", icon: "♙", to: "/colaboradores" },
  { label: "Nova inspeção", icon: "＋", to: "/nova-inspecao" },
  { label: "Histórico", icon: "◷", to: "/historico" },
  { label: "Registro de frotas", icon: "▣", to: "/registro-frotas" },
  { label: "Gestão de Pátio", icon: "⌖", to: "/patio" },
  { label: "Produtos", icon: "⚗", to: "/produtos" },
  { label: "Painel Gerencial", icon: "▥", to: "/painel-gerencial", manager: true }
];

export default function AppNav({ className = "", onNavigate } = {}) {
  const visible = navigationItems.filter((item) => !item.manager || isGestor());
  return h("nav", { className: `app-nav ${className}`.trim(), "aria-label": "Navegação principal" },
    h("div", { className: "app-nav__brand" }, h("span", null, "CO"), h("div", null, h("strong", null, "Controle"), h("small", null, "Operacional"))),
    h("div", { className: "app-nav__items" }, visible.map((item) => h(NavLink, { key: item.to, to: item.to, end: item.to === "/", onClick: onNavigate, className: ({ isActive }) => `nav-item${isActive ? " active" : ""}` }, h("i", { className: "nav-item__icon", "aria-hidden": "true" }, item.icon), h("span", null, item.label))))
  );
}
