import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { loginUser } from "../api";
import { isAuthenticated, saveAuthSession } from "../utils/auth";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    if (isAuthenticated()) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setLoading(true);
        try {
            const response = await loginUser({ email, password });
            saveAuthSession(response.user, response.token);
            navigate("/", { replace: true });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Nao foi possivel entrar.");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("main", { className: "auth-page", children: _jsxs(Card, { className: "auth-card card--elevated", children: [_jsxs("div", { className: "auth-card__header", children: [_jsx("p", { className: "card-label", children: "Controle Operacional" }), _jsx("h1", { className: "app-header__title", children: "Acessar sistema" }), _jsx("p", { className: "app-header__subtitle", children: "Entre para continuar a inspecao de frotas." })] }), _jsxs("form", { className: "form-grid", onSubmit: handleSubmit, children: [_jsx(Input, { label: "E-mail", type: "email", value: email, onChange: (event) => setEmail(event.target.value), required: true }), _jsx(Input, { label: "Senha", type: "password", value: password, onChange: (event) => setPassword(event.target.value), required: true }), error ? _jsx("p", { className: "notice notice--error", children: error }) : null, _jsx(Button, { type: "submit", disabled: loading, children: loading ? "Entrando..." : "Entrar" })] })] }) }));
}
