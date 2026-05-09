import { jsx as _jsx } from "react/jsx-runtime";
import { NavLink } from "react-router-dom";

const items = [
  { label: "Inicio", to: "/" },
  { label: "Expressa", to: "/inspecao-expressa" },
  { label: "Historico", to: "/historico" },
  { label: "Frotas", to: "/registro-frotas" }
];

export default function BottomNav() {
  return _jsx("nav", {
    className: "bottom-nav",
    "aria-label": "Navegacao principal",
    children: items.map((item) =>
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
