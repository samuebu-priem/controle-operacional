import { useNavigate } from "react-router-dom";
import { logout } from "../../utils/auth";
import Button from "../ui/Button";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showLogout?: boolean;
};

export default function AppHeader({ title, subtitle, showBack = false, showLogout = true }: AppHeaderProps) {
  const navigate = useNavigate();

  function handleLogout() {
    const confirmed = window.confirm("Deseja sair do sistema?");
    if (!confirmed) return;

    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="app-header">
      <div className="app-header__content">
        <div className="app-header__text">
          <p className="app-header__eyebrow">Controle Operacional</p>
          <h1 className="app-header__title">{title}</h1>
          {subtitle ? <p className="app-header__subtitle">{subtitle}</p> : null}
        </div>

        <div className="app-header__actions">
          {showBack ? (
            <Button variant="secondary" type="button" className="app-header__back" onClick={() => navigate(-1)}>
              Voltar
            </Button>
          ) : null}
          {showLogout ? (
            <Button variant="danger" type="button" className="app-header__logout" onClick={handleLogout}>
              Deslogar
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
