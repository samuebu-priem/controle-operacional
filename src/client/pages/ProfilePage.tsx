import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { updateMyProfile } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { getAuthUser, isAuthenticated, saveAuthUser } from "../utils/auth";

export default function ProfilePage() {
  const navigate = useNavigate();
  const currentUser = getAuthUser();
  const [fullName, setFullName] = useState(currentUser?.fullName ?? currentUser?.name ?? "");
  const [jobTitle, setJobTitle] = useState(currentUser?.jobTitle ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const response = await updateMyProfile({ fullName, jobTitle });
      saveAuthUser(response.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="page-frame">
        <AppHeader title="Perfil do usuario" subtitle="Complete seus dados para iniciar inspecoes." showLogout />

        <Card className="section-card card--elevated">
          <form className="form-grid" onSubmit={handleSubmit}>
            <Input label="Nome completo" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            <Input label="Funcao" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} required />

            {error ? <p className="notice notice--error">{error}</p> : null}

            <div className="detail-actions">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar perfil"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
