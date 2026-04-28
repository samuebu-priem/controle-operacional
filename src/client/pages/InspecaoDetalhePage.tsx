import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams } from "react-router-dom";
import type { FotoInspecao, Frota, Inspecao, PontoCritico } from "../../shared/types";
import { deleteFoto, deleteInspecao, getInspecaoById, updateInspecao, uploadFotos } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { openWhatsAppInspectionMessage } from "../utils/whatsapp";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type EditingPonto = {
  id?: string;
  categoria: string;
  localizacao: string;
  descricao: string;
  severidade: PontoCritico["severidade"];
  procedimentoRecomendado: string;
};

type InspecaoDetalhe = Inspecao & {
  frota?: Pick<Frota, "numeroFrota" | "placa"> | null;
};

export default function InspecaoDetalhePage() {
  const { id = "" } = useParams();
  const [inspecao, setInspecao] = useState<InspecaoDetalhe | null>(null);
  const [editing, setEditing] = useState(false);
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [pontosCriticos, setPontosCriticos] = useState<EditingPonto[]>([]);
  const [fotosToRemove, setFotosToRemove] = useState<string[]>([]);
  const [fotosNovas, setFotosNovas] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await getInspecaoById(id);
      const current = response.inspecao;
      setInspecao(current);
      setObservacoesGerais(current.observacoesGerais ?? "");
      setPontosCriticos(
        current.pontosCriticos.map((ponto) => ({
          id: ponto.id,
          categoria: ponto.categoria,
          localizacao: ponto.localizacao,
          descricao: ponto.descricao,
          severidade: ponto.severidade,
          procedimentoRecomendado: ponto.procedimentoRecomendado
        }))
      );
      setFotosToRemove([]);
      setFotosNovas([]);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar inspeção");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  const visibleFotos = useMemo(() => {
    return inspecao?.fotos.filter((foto) => !fotosToRemove.includes(foto.id)) ?? [];
  }, [inspecao, fotosToRemove]);

  function toggleEdit() {
    setEditing((current) => !current);
    setError("");
  }

  function addPonto() {
    setPontosCriticos((current) => [
      ...current,
      {
        categoria: "",
        localizacao: "",
        descricao: "",
        severidade: "LEVE",
        procedimentoRecomendado: ""
      }
    ]);
  }

  function updatePonto(index: number, patch: Partial<EditingPonto>) {
    setPontosCriticos((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removePonto(index: number) {
    setPontosCriticos((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSave() {
    if (!inspecao) return;

    setSaving(true);
    setError("");

    try {
      const filtered = pontosCriticos.filter(
        (ponto) =>
          ponto.categoria.trim() ||
          ponto.localizacao.trim() ||
          ponto.descricao.trim() ||
          ponto.procedimentoRecomendado.trim()
      );

      await updateInspecao(inspecao.id, {
        observacoesGerais,
        pontosCriticos: filtered,
        fotosToRemove
      });

      await Promise.all(fotosToRemove.map((fotoId) => deleteFoto(fotoId)));

      if (fotosNovas.length > 0) {
        const formData = new FormData();
        for (const file of fotosNovas) {
          formData.append("files[]", file);
        }
        await uploadFotos(inspecao.id, formData);
      }

      const refreshed = await getInspecaoById(inspecao.id);
      setInspecao(refreshed.inspecao);
      setEditing(false);
      setFotosNovas([]);
      setFotosToRemove([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar alterações");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!inspecao) return;
    const confirmed = window.confirm(`Excluir inspeção ${formatDate(inspecao.dataInspecao)}?`);
    if (!confirmed) return;
    await deleteInspecao(inspecao.id);
    window.location.href = "/";
  }

  function exportReport() {
    if (!inspecao) return;

    const report = [
      `Frota: ${inspecao.frota?.numeroFrota ?? "N/D"}`,
      `Placa: ${inspecao.frota?.placa ?? "N/D"}`,
      `Data: ${formatDate(inspecao.dataInspecao)}`,
      `Hora: ${formatDateTime(inspecao.dataInspecao)}`,
      `Inspetor: ${inspecao.nomeInspetor}`,
      `Observações: ${inspecao.observacoesGerais ?? "Sem observações"}`,
      "",
      "Pontos críticos:",
      ...inspecao.pontosCriticos.map(
        (ponto) =>
          `- ${ponto.categoria} | ${ponto.localizacao} | ${ponto.descricao} | ${ponto.procedimentoRecomendado}`
      ),
      "",
      inspecao.fotos.length > 0 ? "Evidências anexadas." : "Sem fotos anexadas."
    ].join("\n");

    downloadTextFile(`inspecao-${inspecao.id}.txt`, report);
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="page-frame">
          <AppHeader title="Detalhes da inspeção" subtitle="Informações e evidências." showBack />
          <Card className="section-card">
            <p className="helper">Carregando...</p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!inspecao) {
    return (
      <AppLayout>
        <div className="page-frame">
          <AppHeader title="Detalhes da inspeção" subtitle="Informações e evidências." showBack />
          <Card className="section-card">
            <p className="helper">{error || "Inspeção não encontrada."}</p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-frame">
        <AppHeader title="Detalhes da inspeção" subtitle="Informações e evidências." showBack />

        <Card className="section-card card--elevated">
          <div className="section-head">
            <div>
              <p className="card-label">Resumo</p>
              <h2 className="section-title">{formatDate(inspecao.dataInspecao)}</h2>
            </div>
            <span className={`status ${inspecao.status === "REPROVADO" ? "status--danger" : "status--success"}`}>
              {inspecao.status}
            </span>
          </div>

          <div className="detail-actions">
            <Button type="button" variant="secondary" onClick={toggleEdit}>
              {editing ? "Cancelar edição" : "Editar inspeção"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void openWhatsAppInspectionMessage(inspecao)}>
              Enviar pelo WhatsApp
            </Button>
            <Button type="button" variant="secondary" onClick={exportReport}>
              Exportar relatório
            </Button>
            <Button type="button" variant="danger" onClick={() => void handleDelete()}>
              Excluir inspeção
            </Button>
          </div>

          {!editing ? (
            <div className="summary-list">
              <p className="frota-card__line">
                <strong>Inspetor:</strong> {inspecao.nomeInspetor}
              </p>
              <p className="frota-card__line">
                <strong>Tipo:</strong> {inspecao.tipoInspecao}
              </p>
              <p className="frota-card__line">
                <strong>Observações:</strong> {inspecao.observacoesGerais ?? "Sem observações"}
              </p>
            </div>
          ) : (
            <div className="form-grid">
              <Input
                label="Observações gerais"
                value={observacoesGerais}
                onChange={(event) => setObservacoesGerais(event.target.value)}
              />
            </div>
          )}
        </Card>

        <Card className="section-card">
          <div className="section-head">
            <div>
              <p className="card-label">Pontos críticos</p>
              <h2 className="section-title">{pontosCriticos.length} itens registrados</h2>
            </div>
          </div>

          <div className="critical-list">
            {pontosCriticos.map((ponto, index) =>
              editing ? (
                <article className="critical-item" key={ponto.id ?? index}>
                  <Input
                    label="Categoria"
                    value={ponto.categoria}
                    onChange={(event) => updatePonto(index, { categoria: event.target.value })}
                  />
                  <Input
                    label="Localização"
                    value={ponto.localizacao}
                    onChange={(event) => updatePonto(index, { localizacao: event.target.value })}
                  />
                  <Input
                    label="Descrição"
                    value={ponto.descricao}
                    onChange={(event) => updatePonto(index, { descricao: event.target.value })}
                  />
                  <Input
                    label="Procedimento necessário"
                    value={ponto.procedimentoRecomendado}
                    onChange={(event) => updatePonto(index, { procedimentoRecomendado: event.target.value })}
                  />
                  <Button type="button" variant="danger" onClick={() => removePonto(index)}>
                    Remover ponto crítico
                  </Button>
                </article>
              ) : (
                <article className="critical-item" key={ponto.id ?? index}>
                  <strong>{ponto.categoria}</strong>
                  <p className="helper">{ponto.localizacao}</p>
                  <p>{ponto.descricao}</p>
                  <p className="text-subtle">{ponto.procedimentoRecomendado}</p>
                </article>
              )
            )}
          </div>

          {editing ? (
            <div className="detail-actions">
              <Button type="button" variant="secondary" onClick={addPonto}>
                Adicionar ponto crítico
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          ) : null}
        </Card>

        <Card className="section-card">
          <div className="section-head">
            <div>
              <p className="card-label">Fotos</p>
              <h2 className="section-title">{visibleFotos.length} anexos</h2>
            </div>
          </div>

          {editing ? (
            <div className="search-bar">
                <input
                  className="input"
                  aria-label="Anexar novas fotos"
                  type="file"
                  multiple
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    const files = Array.from(event.target.files ?? []) as File[];
                    setFotosNovas((current) => [...current, ...files]);
                  }}
                />
            </div>
          ) : null}

          <div className="photo-upload__grid">
            {visibleFotos.map((foto: FotoInspecao) => (
              <figure className="photo-upload__item" key={foto.id}>
                <img src={foto.imageUrl} alt={foto.fileName} />
                <figcaption>{foto.fileName}</figcaption>
                {editing ? (
                  <Button type="button" variant="danger" onClick={() => setFotosToRemove((current) => [...current, foto.id])}>
                    Remover foto
                  </Button>
                ) : null}
              </figure>
            ))}
          </div>

          {editing ? (
            <div className="helper">
              Novas fotos selecionadas: {fotosNovas.length}
            </div>
          ) : null}
        </Card>

        {error ? <p className="notice notice--error">{error}</p> : null}
      </div>
    </AppLayout>
  );
}
