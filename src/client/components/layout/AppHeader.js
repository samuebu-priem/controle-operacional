import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { logout } from "../../utils/auth";
import Button from "../ui/Button";
export default function AppHeader({ title, subtitle, showBack = false, showLogout = true }) {
    const navigate = useNavigate();
    function handleLogout() {
        const confirmed = window.confirm("Deseja sair do sistema?");
        if (!confirmed)
            return;
        logout();
        navigate("/login", { replace: true });
    }
    return (_jsx("header", { className: "app-header", children: _jsxs("div", { className: "app-header__content", children: [_jsxs("div", { className: "app-header__text", children: [_jsx("p", { className: "app-header__eyebrow", children: "Controle Operacional" }), _jsx("h1", { className: "app-header__title", children: title }), subtitle ? _jsx("p", { className: "app-header__subtitle", children: subtitle }) : null] }), _jsxs("div", { className: "app-header__actions", children: [showBack ? (_jsx(Button, { variant: "secondary", type: "button", className: "app-header__back", onClick: () => navigate(-1), children: "Voltar" })) : null, showLogout ? (_jsx(Button, { variant: "danger", type: "button", className: "app-header__logout", onClick: handleLogout, children: "Deslogar" })) : null] })] }) }));
}
