import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, MouseEvent as ReactMouseEvent } from "react";
import type { Frota } from "../../shared/types";
import { deleteFrota, listFrotas, updateFrota } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";

type FrotaFormValues = {
  numeroFrota: string;
  placa: string;
  tipoEquipamento: string;
};

const emptyForm: FrotaFormValues = {
  numeroFrota: "",
  placa: "",
  tipoEquipamento: ""
};

function normalizeNumber(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function compareFrotaNumbers(a: string, b: string) {
  return normalizeNumber(a).localeCompare(normalizeNumber(b), "pt-BR", {
    numeric: true,
    sensitivity: "base"
  });
}

function sortFrotas(frotas: Frota[]) {
  return [...frotas].sort((a, b) => compareFrotaNumbers(a.numeroFrota, b.numeroFrota));
}

function matchesQuery(frota: Frota, query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return [frota.numeroFrota, frota.placa, frota.tipoEquipamento].some((field) => field.toLowerCase().includes(value));
}

export default function RegistroFrotasPage() {
  const [search, setSearch] = useState("");
  const [frotas, setFrotas] = useState<Frota[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingFrota, setEditingFrota] = useState<Frota | null>(null);
  const [formValues, setFormValues] = useState<FrotaFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingFrota, setDeletingFrota] = useState<Frota | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await listFrotas();
      setFrotas(sortFrotas(response.frotas));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar frotas");
      setFrotas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredFrotas = useMemo(() => {
    return sortFrotas(frotas.filter((frota) => matchesQuery(frota, search)));
  }, [frotas, search]);

  function openCreateModal() {
    setEditingFrota(null);
    setFormValues(emptyForm);
    setFormOpen(true);
  }

  function openEditModal(frota: Frota) {
    setEditingFrota(frota);
    setFormValues({
      numeroFrota: frota.numeroFrota,
      placa: frota.placa,
      tipoEquipamento: frota.tipoEquipamento
    });
    setFormOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setFormOpen(false);
    setEditingFrota(null);
    setFormValues(emptyForm);
  }

  function openDeleteModal(frota: Frota) {
    setDeletingFrota(frota);
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeletingFrota(null);
  }

  async function saveFrota() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingFrota) {
        const response = await updateFrota(editingFrota.id, formValues);
        setFrotas((current) => sortFrotas(current.map((item) => (item.id === editingFrota.id ? response.frota : item))));
      } else {
        const token = localStorage.getItem("token");
        const response = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/frotas`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            ...formValues,
            material: formValues.tipoEquipamento,
            capacidade: "Não informado",
            observacoesFixas: null
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message ?? "Falha ao criar frota");
        }

        const data = (await response.json()) as { frota: Frota };
        setFrotas((current) => sortFrotas([...current, data.frota]));
      }

      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar frota");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingFrota) return;

    setDeleting(true);
    setError("");

    try {
      await deleteFrota(deletingFrota.id);
      setFrotas((current) => current.filter((item) => item.id !== deletingFrota.id));
      setDeletingFrota(null);
      setSuccess("Frota removida com sucesso");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir frota");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="page-frame">
        <AppHeader title="Registro de Frotas" subtitle="Cadastre e edite frotas disponíveis para inspeção." showBack />

        <Card className="section-card search-card">
          <div className="section-head">
            <div>
              <p className="card-label">Frotas</p>
              <h2 className="section-title">Buscar e organizar cadastro</h2>
            </div>
          </div>

          <div className="search-bar">
            <Input
              label="Buscar por frota, placa ou tipo"
              value={search}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
              placeholder="Ex.: 1234-2, ABC-1234, Tanque Inox"
            />
            <div className="inline-actions">
              <Button type="button" onClick={openCreateModal}>
                Adicionar frota
              </Button>
              <Button variant="secondary" type="button" onClick={() => void load()}>
                Atualizar
              </Button>
            </div>
          </div>

          {error ? <p className="notice notice--error">{error}</p> : null}
          {loading ? <p className="helper">Carregando...</p> : null}
        </Card>

        <section className="page-stack">
          <div className="history-list">
            {filteredFrotas.map((frota) => (
              <div key={frota.id}>
                <Card className="frota-card">
                  <div>
                    <div className="frota-card__top">
                      <div>
                        <p className="frota-card__label">Registro de frota</p>
                        <h3 className="frota-card__title">{frota.numeroFrota}</h3>
                        <p className="frota-card__meta">{frota.tipoEquipamento}</p>
                      </div>
                    </div>

                    <div>
                      <p className="frota-card__line">
                        <strong>Placa:</strong> {frota.placa}
                      </p>
                      <p className="frota-card__line">
                        <strong>Tipo:</strong> {frota.tipoEquipamento}
                      </p>
                    </div>

                    <div className="frota-card__actions">
                      <Button variant="ghost" type="button" onClick={() => openEditModal(frota)}>
                        Editar
                      </Button>
                      <Button variant="danger" type="button" onClick={() => openDeleteModal(frota)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>

          {!loading && filteredFrotas.length === 0 ? <p className="helper">Nenhuma frota encontrada.</p> : null}
        </section>
      </div>

      {success ? <p className="notice notice--success">{success}</p> : null}

      {formOpen ? (
        <div className="modal-overlay" role="presentation" onClick={closeModal}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(event: ReactMouseEvent<HTMLDivElement>) => event.stopPropagation()}>
            <h2 className="modal__title">{editingFrota ? "Editar frota" : "Adicionar frota"}</h2>

            <div className="modal__body">
              <Input
                label="Frota"
                value={formValues.numeroFrota}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setFormValues((current) => ({ ...current, numeroFrota: event.target.value }))}
              />
              <Input
                label="Placa"
                value={formValues.placa}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setFormValues((current) => ({ ...current, placa: event.target.value }))}
              />
              <Input
                label="Tipo"
                value={formValues.tipoEquipamento}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setFormValues((current) => ({ ...current, tipoEquipamento: event.target.value }))}
              />
            </div>

            <div className="modal__actions">
              <Button variant="ghost" type="button" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void saveFrota()} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deletingFrota ? (
        <div className="modal-overlay" role="presentation" onClick={closeDeleteModal}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(event: ReactMouseEvent<HTMLDivElement>) => event.stopPropagation()}>
            <h2 className="modal__title">Excluir frota</h2>
            <p className="helper">Excluir frota <strong>{deletingFrota.numeroFrota}</strong>?</p>
            <p className="helper">Se houver histórico vinculado, o sistema vai impedir a exclusão.</p>

            <div className="modal__actions">
              <Button variant="ghost" type="button" onClick={closeDeleteModal}>
                Cancelar
              </Button>
              <Button variant="danger" type="button" onClick={() => void confirmDelete()} disabled={deleting}>
                {deleting ? "Excluindo..." : "Excluir frota"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
