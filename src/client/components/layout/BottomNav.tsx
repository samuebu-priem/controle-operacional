import { NavLink } from "react-router-dom";

const items = [
  { label: "Início", to: "/" },
  { label: "Nova inspeção", to: "/nova-inspecao" },
  { label: "Histórico", to: "/historico" },
  { label: "Registro de frotas", to: "/registro-frotas" }
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === "/"}>
          {({ isActive }: { isActive: boolean }) => (
            <span className={`bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`}>{item.label}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
