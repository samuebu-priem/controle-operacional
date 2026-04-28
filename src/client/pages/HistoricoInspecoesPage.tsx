import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { Frota, Inspecao } from "../../shared/types";
import { deleteInspecao, getInspecaoById, listInspecoes } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { openWhatsAppInspectionMessage } from "../utils/whatsapp";

type HistoricoPontoCritico = {
  id: string;
  fotos?: unknown[] | null;
};

type HistoricoInspecao = Inspecao & {
  frota?: Pick<Frota, "numeroFrota" | "placa"> | null;
  pontosCriticos?: HistoricoPontoCritico[] | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function buildSearchText(inspecao: HistoricoInspecao) {
  return normalizeText(
    [
      inspecao.frota?.numeroFrota ?? "",
      inspecao.frota?.placa ?? "",
      formatDate(inspecao.dataInspecao),
      formatTime(inspecao.dataInspecao)
    ].join(" ")
  );
}

function hasCriticalPoint(inspecao: HistoricoInspecao) {
  return (inspecao.pontosCriticos ?? []).length > 0;
}

function hasPhotos(inspecao: HistoricoInspecao) {
  return (inspecao.pontosCriticos ?? []).some((ponto) => {
    const fotos = (ponto as { fotos?: unknown[] | null }).fotos ?? [];
    return fotos.length > 0;
  });
}

export default function HistoricoInspecoesPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCritical, setShowCritical] = useState(false);
  const [showWithoutCritical, setShowWithoutCritical] = useState(false);
  const [showWithPhotos, setShowWithPhotos] = useState(false);
  const [inspecoes, setInspecoes] = useState<HistoricoInspecao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await listInspecoes();
      setInspecoes(response.inspecoes as HistoricoInspecao[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar histórico");
      setInspecoes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredInspecoes = useMemo(() => {
    const query = normalizeText(searchQuery);

    return inspecoes.filter((inspecao) => {
      const textMatches = !query || buildSearchText(inspecao).includes(query);
      const criticalMatches = !showCritical || hasCriticalPoint(inspecao);
      const withoutCriticalMatches = !showWithoutCritical || !hasCriticalPoint(inspecao);
      const photosMatches = !showWithPhotos || hasPhotos(inspecao);

      return textMatches && criticalMatches && withoutCriticalMatches && photosMatches;
    });
  }, [inspecoes, searchQuery, showCritical, showWithoutCritical, showWithPhotos]);

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Excluir inspeção?");
    if (!confirmed) return;

    await deleteInspecao(id);
    setInspecoes((current) => current.filter((item) => item.id !== id));
  }

  async function handleOpenWhatsApp(id: string) {
    const response = await getInspecaoById(id);
    await openWhatsAppInspectionMessage(response.inspecao);
  }

  function handleConfirmSearch() {
    setSearchQuery(searchInput);
  }

  function handleClear() {
    setSearchInput("");
    setSearchQuery("");
    setShowCritical(false);
    setShowWithoutCritical(false);
    setShowWithPhotos(false);
  }

  return (
    <AppLayout>
      <div className="page-frame history-page">
        <AppHeader title="Histórico de inspeções" subtitle="Busque e abra inspeções salvas." showBack />

        <style>{`
          .history-page {
            display: flex;
            flex-direction: column;
            gap: 22px;
          }

          .history-search-panel {
            padding: 22px;
            border-radius: 20px;
            background: linear-gradient(180deg, rgba(17, 24, 39, 0.98), rgba(13, 19, 32, 0.96));
            border: 1px solid rgba(148, 163, 184, 0.12);
            box-shadow: 0 18px 50px rgba(2, 6, 23, 0.42);
            gap: 18px;
          }

          .history-section-label {
            margin: 0 0 8px;
            color: #94a3b8;
            font-size: 0.77rem;
            font-weight: 700;
            letter-spacing: 0.09em;
            text-transform: uppercase;
          }

          .history-filter-title {
            margin: 0;
            color: #f8fafc;
            font-size: 1rem;
            font-weight: 650;
            line-height: 1.2;
          }

          .history-search-input .input-field__label {
            color: #64748b;
            font-size: 0.84rem;
            font-weight: 600;
          }

          .history-search-input .input {
            min-height: 52px;
            padding: 0 16px;
            border-radius: 16px;
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.9));
            border-color: rgba(148, 163, 184, 0.14);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
          }

          .history-search-input .input::placeholder {
            color: #64748b;
          }

          .history-search-input .input:focus {
            box-shadow:
              0 0 0 3px rgba(34, 197, 94, 0.12),
              0 0 0 1px rgba(34, 197, 94, 0.26);
          }

          .history-filter-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .history-filter-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-height: 42px;
            padding: 0 14px;
            border-radius: 999px;
            border: 1px solid rgba(148, 163, 184, 0.16);
            background: rgba(15, 23, 42, 0.72);
            color: #cbd5e1;
            font-size: 0.92rem;
            font-weight: 600;
            cursor: pointer;
            user-select: none;
            transition:
              transform 140ms ease,
              border-color 140ms ease,
              background-color 140ms ease,
              color 140ms ease,
              box-shadow 140ms ease;
          }

          .history-filter-chip:hover {
            transform: translateY(-1px);
            border-color: rgba(148, 163, 184, 0.26);
            background: rgba(30, 41, 59, 0.92);
            color: #f8fafc;
          }

          .history-filter-chip input {
            accent-color: #22c55e;
            margin: 0;
          }

          .history-filter-chip:has(input:checked) {
            border-color: rgba(34, 197, 94, 0.34);
            background: rgba(34, 197, 94, 0.1);
            color: #dcfce7;
            box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.08);
          }

          .history-action-row {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .history-action-row .button {
            min-width: 150px;
          }

          .history-inspection-card {
            padding: 20px;
            border-radius: 18px;
            background: rgba(17, 24, 39, 0.9);
            border: 1px solid rgba(148, 163, 184, 0.12);
            box-shadow: 0 16px 40px rgba(2, 6, 23, 0.22);
            transition:
              transform 140ms ease,
              border-color 140ms ease,
              background-color 140ms ease,
              box-shadow 140ms ease;
          }

          .history-inspection-card:hover {
            transform: translateY(-2px);
            border-color: rgba(148, 163, 184, 0.2);
            background: rgba(17, 24, 39, 0.98);
            box-shadow: 0 20px 46px rgba(2, 6, 23, 0.3);
          }

          .history-inspection-card__meta {
            display: grid;
            gap: 6px;
          }

          .history-inspection-card__title {
            margin: 0;
            font-size: 1.03rem;
            font-weight: 700;
            line-height: 1.28;
            color: #f8fafc;
          }

          .history-inspection-card__subtitle {
            margin: 0;
            color: #94a3b8;
            font-size: 0.92rem;
            line-height: 1.45;
          }

          .history-inspection-card__date {
            margin: 0;
            color: #64748b;
            font-size: 0.92rem;
            line-height: 1.45;
          }

          .history-inspection-card__actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: flex-end;
          }

          .history-list {
            gap: 18px;
          }

          @media (max-width: 768px) {
            .history-search-panel {
              padding: 18px;
              border-radius: 18px;
            }

            .history-action-row .button {
              width: 100%;
              min-width: 0;
            }

            .history-inspection-card__actions {
              justify-content: stretch;
            }

            .history-inspection-card__actions .button {
              width: 100%;
            }
          }
        `}</style>

        <Card className="section-card search-card history-search-panel">
          <div>
            <p className="history-section-label">Busca rápida</p>
            <h2 className="history-filter-title">Busca rápida</h2>
          </div>

          <div className="search-bar">
            <Input
              className="history-search-input"
              label="Busque pela frota, placa ou data"
              value={searchInput}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchInput(event.target.value)}
              placeholder="Busque pela frota, placa ou data"
            />
          </div>

          <div>
            <p className="history-section-label">Filtros</p>
            <div className="history-filter-chips">
              <label className="history-filter-chip">
                <input
                  type="checkbox"
                  checked={showCritical}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setShowCritical(event.target.checked);
                    if (event.target.checked) setShowWithoutCritical(false);
                  }}
                />
                <span>Com ponto crítico</span>
              </label>

              <label className="history-filter-chip">
                <input
                  type="checkbox"
                  checked={showWithoutCritical}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setShowWithoutCritical(event.target.checked);
                    if (event.target.checked) setShowCritical(false);
                  }}
                />
                <span>Sem ponto crítico</span>
              </label>

              <label className="history-filter-chip">
                <input
                  type="checkbox"
                  checked={showWithPhotos}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setShowWithPhotos(event.target.checked)}
                />
                <span>Com fotos</span>
              </label>
            </div>
          </div>

          <div className="history-action-row">
            <Button type="button" onClick={handleConfirmSearch}>
              Confirmar busca
            </Button>
            <Button type="button" variant="secondary" onClick={handleClear}>
              Limpar
            </Button>
          </div>

          {error ? <p className="notice notice--error">{error}</p> : null}
          {loading ? <p className="helper">Carregando...</p> : null}
        </Card>

        <section className="page-stack">
          <div className="history-list">
            {filteredInspecoes.map((inspecao) => (
              <article key={inspecao.id} className="history-item history-inspection-card">
                <div className="history-item__top">
                  <div className="history-inspection-card__meta">
                    <h3 className="history-inspection-card__title">Frota {inspecao.frota?.numeroFrota ?? "Não informada"}</h3>
                    <p className="history-inspection-card__subtitle">Placa: {inspecao.frota?.placa ?? "Não informada"}</p>
                    <p className="history-inspection-card__date">
                      {formatDate(inspecao.dataInspecao)} • {formatTime(inspecao.dataInspecao)}
                    </p>
                  </div>
                  <span className={`status ${inspecao.status === "REPROVADO" ? "status--danger" : "status--success"}`}>
                    {inspecao.pontosCriticos.length} pontos críticos
                  </span>
                </div>

                <div className="history-inspection-card__actions">
                  <Button type="button" variant="secondary" onClick={() => navigate(`/inspecao/${inspecao.id}`)}>
                    Abrir inspeção
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => void handleDelete(inspecao.id)}>
                    Excluir inspeção
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void handleOpenWhatsApp(inspecao.id)}
                    aria-label="Abrir no WhatsApp"
                  >
                    <span aria-hidden="true">🟢</span>
                  </Button>
                </div>
              </article>
            ))}
          </div>

          {!loading && filteredInspecoes.length === 0 ? <p className="helper">Nenhuma inspeção encontrada.</p> : null}
        </section>
      </div>
    </AppLayout>
  );
}
