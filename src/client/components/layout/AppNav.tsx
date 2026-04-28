import { NavLink } from "react-router-dom";
import type { NavLinkRenderProps } from "react-router-dom";

const items = [
  { label: "Início", to: "/" },
  { label: "Nova inspeção", to: "/nova-inspecao" },
  { label: "Histórico", to: "/historico" },
  { label: "Registro de frotas", to: "/registro-frotas" }
];

export default function AppNav() {
  return (
    <nav className="app-nav" aria-label="Navegação principal">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }: NavLinkRenderProps) => `nav-item${isActive ? " active" : ""}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
