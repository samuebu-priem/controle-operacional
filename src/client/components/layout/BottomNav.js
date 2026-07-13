import { jsx as _jsx } from "react/jsx-runtime";
import { NavLink } from "react-router-dom";
import { isGestor } from "../../utils/auth";

const items = [
  { label: "Inicio", to: "/" },
  { label: "Nova", to: "/nova-inspecao" },
  { label: "Historico", to: "/historico" },
  { label: "Frotas", to: "/registro-frotas" },
  { label: "Patio BETA", to: "/patio" },
  { label: "Painel", to: "/painel-gerencial" }
];

export default function BottomNav() {
  const canSeeManagerArea = isGestor();
  const visibleItems = items.filter((item) => item.to !== "/painel-gerencial" || canSeeManagerArea);

  return _jsx("nav", {
    className: "bottom-nav",
    "aria-label": "Navegacao principal",
    children: visibleItems.map((item) =>
      _jsx(
        NavLink,
        {
          to: item.to,
          end: item.to === "/",
          children: ({ isActive }) => _jsx("span", { className: `bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`, children: item.label })
        },
        item.to
      )
    )
  });
}
