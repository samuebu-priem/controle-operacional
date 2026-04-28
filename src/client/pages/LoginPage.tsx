import { useState, type FormEvent } from "react";
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
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginUser({ email, password });
      saveAuthSession(response.user, response.token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <Card className="auth-card card--elevated">
        <div className="auth-card__header">
          <p className="card-label">Controle Operacional</p>
          <h1 className="app-header__title">Acessar sistema</h1>
          <p className="app-header__subtitle">Entre para continuar a inspecao de frotas.</p>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <Input label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error ? <p className="notice notice--error">{error}</p> : null}

          <Button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
