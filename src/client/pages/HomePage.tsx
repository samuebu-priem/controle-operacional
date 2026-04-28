import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Inspecao } from "../../shared/types";
import { listInspecoes } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import QualityIndicatorsCard from "../components/quality/QualityIndicatorsCard";

export default function HomePage() {
  const navigate = useNavigate();
  const [inspecoes, setInspecoes] = useState<Inspecao[]>([]);

  useEffect(() => {
    let active = true;

    async function loadInspecoes() {
      try {
        const response = await listInspecoes();
        if (active) setInspecoes(response.inspecoes);
      } catch {
        if (active) setInspecoes([]);
      }
    }

    void loadInspecoes();

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppLayout>
      <div className="page-frame home-page">
        <AppHeader title="Controle Operacional" subtitle="Inspe\u00e7\u00e3o de frotas e hist\u00f3rico." />

        <div className="home-actions">
          <Button type="button" onClick={() => navigate("/nova-inspecao")}>
            {"Nova inspe\u00e7\u00e3o"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/historico")}>
            {"Hist\u00f3rico de inspe\u00e7\u00f5es"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/registro-frotas")}>
            Registro de frotas
          </Button>
        </div>

        <QualityIndicatorsCard inspecoes={inspecoes} />
      </div>
    </AppLayout>
  );
}
