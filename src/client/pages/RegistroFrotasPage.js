import { createElement as h, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteFrota, listFrotas, updateFrota } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

const tankTypes = ["Tanque inox", "Tanque carbono", "Carreta tanque", "Bitrem tanque", "Isotank", "Outro"];
const emptyForm = { numeroFrota: "", placa: "", tipoEquipamento: "" };
const allocationOf = (fleet) => fleet.patioAllocations?.[0] || null;
const locationOf = (fleet) => { const current = allocationOf(fleet); return current ? `${current.area?.patio?.nome || "Pátio"} · ${current.area?.nome || "Setor"}` : "Fora do pátio"; };
const updated = (fleet) => new Date(allocationOf(fleet)?.updatedAt || fleet.updatedAt || fleet.createdAt).toLocaleDateString("pt-BR");
const sorted = (items) => [...items].sort((a, b) => String(a.numeroFrota).localeCompare(String(b.numeroFrota), "pt-BR", { numeric: true }));

function FleetActions({ fleet, navigate, edit, remove }) {
  return h("div", { className: "fleet-actions" },
    h(Button, { variant: "secondary", onClick: () => navigate(`/frotas/${fleet.id}/historico`) }, "Histórico"),
    h(Button, { variant: "ghost", onClick: () => navigate(`/patio?fleetId=${fleet.id}`) }, allocationOf(fleet) ? "Localização" : "Registrar no pátio"),
    h(Button, { variant: "ghost", onClick: () => edit(fleet) }, "Editar"),
    h(Button, { variant: "danger", onClick: () => remove(fleet) }, "Excluir")
  );
}

function FleetTable({ fleets, actions }) {
  return h("div", { className: "fleet-desktop data-table-system" }, h("table", null,
    h("thead", null, h("tr", null, ...["Frota", "Placa", "Tipo", "Pátio / localização", "Status", "Atualização", "Ações"].map((label) => h("th", { key: label }, label)))),
    h("tbody", null, fleets.map((fleet) => h("tr", { key: fleet.id },
      h("td", null, h("strong", null, fleet.numeroFrota)), h("td", null, fleet.placa), h("td", null, fleet.tipoEquipamento),
      h("td", { className: "fleet-location" }, locationOf(fleet)),
      h("td", null, h("span", { className: allocationOf(fleet) ? "status status--success" : "status status--neutral" }, allocationOf(fleet) ? "No pátio" : "Fora")),
      h("td", null, updated(fleet)), h("td", null, h(FleetActions, { fleet, ...actions }))
    )))
  ));
}

function FleetCards({ fleets, actions }) {
  return h("div", { className: "fleet-mobile" }, fleets.map((fleet) => h("article", { className: "fleet-mobile-card", key: fleet.id },
    h("header", null, h("strong", null, `FROTA ${fleet.numeroFrota}`), h("span", { className: allocationOf(fleet) ? "status status--success" : "status status--neutral" }, allocationOf(fleet) ? "NO PÁTIO" : "FORA")),
    h("dl", null,
      h("div", null, h("dt", null, "Placa"), h("dd", null, fleet.placa)), h("div", null, h("dt", null, "Tipo"), h("dd", null, fleet.tipoEquipamento)),
      h("div", { className: "wide" }, h("dt", null, "Localização"), h("dd", null, locationOf(fleet))), h("div", { className: "wide" }, h("dt", null, "Atualizado em"), h("dd", null, updated(fleet)))
    ), h(FleetActions, { fleet, ...actions })
  )));
}

export default function RegistroFrotasPage() {
  const navigate = useNavigate();
  const [fleets, setFleets] = useState([]), [search, setSearch] = useState(""), [status, setStatus] = useState("TODOS"), [patio, setPatio] = useState("TODOS");
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false), [editing, setEditing] = useState(null), [form, setForm] = useState(emptyForm), [saving, setSaving] = useState(false), [deleting, setDeleting] = useState(null);
  async function load() { setLoading(true); setError(""); try { const response = await listFrotas(); setFleets(sorted(response.frotas || [])); } catch (err) { setError(err instanceof Error ? err.message : "Falha ao carregar frotas"); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const patios = useMemo(() => [...new Set(fleets.map((fleet) => allocationOf(fleet)?.area?.patio?.nome).filter(Boolean))], [fleets]);
  const visible = useMemo(() => sorted(fleets.filter((fleet) => { const text = `${fleet.numeroFrota} ${fleet.placa} ${fleet.tipoEquipamento}`.toLowerCase(); const located = Boolean(allocationOf(fleet)); return text.includes(search.toLowerCase().trim()) && (status === "TODOS" || (status === "PATIO") === located) && (patio === "TODOS" || allocationOf(fleet)?.area?.patio?.nome === patio); })), [fleets, search, status, patio]);
  function openCreate() { setEditing(null); setForm(emptyForm); setFormOpen(true); }
  function openEdit(fleet) { setEditing(fleet); setForm({ numeroFrota: fleet.numeroFrota, placa: fleet.placa, tipoEquipamento: fleet.tipoEquipamento }); setFormOpen(true); }
  async function save() { setSaving(true); setError(""); try { if (editing) { const response = await updateFrota(editing.id, form); setFleets((current) => sorted(current.map((item) => item.id === editing.id ? { ...response.frota, patioAllocations: item.patioAllocations } : item))); } else { const token = localStorage.getItem("token"); const response = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/frotas`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ ...form, material: form.tipoEquipamento, capacidade: "Não informado", observacoesFixas: null }) }); const data = await response.json().catch(() => null); if (!response.ok) throw new Error(data?.message || "Falha ao criar frota"); setFleets((current) => sorted([...current, data.frota])); } setFormOpen(false); setSuccess("Frota salva com sucesso."); } catch (err) { setError(err instanceof Error ? err.message : "Falha ao salvar frota"); } finally { setSaving(false); } }
  async function confirmDelete() { if (!deleting) return; setSaving(true); try { await deleteFrota(deleting.id); setFleets((current) => current.filter((item) => item.id !== deleting.id)); setDeleting(null); setSuccess("Frota removida com sucesso."); } catch (err) { setError(err instanceof Error ? err.message : "Falha ao excluir frota"); } finally { setSaving(false); } }
  const actions = { navigate, edit: openEdit, remove: setDeleting };
  return h(AppLayout, null, h("div", { className: "page-frame fleet-registry-v2" },
    h(AppHeader, { title: "Registro de Frotas", subtitle: "Cadastro e localização operacional das frotas.", showBack: true, actions: h(Button, { onClick: openCreate }, "Nova frota") }),
    h("section", { className: "fleet-filters-v2" }, h(Input, { label: "Pesquisar", value: search, onChange: (event) => setSearch(event.target.value), placeholder: "Frota, placa ou tipo" }), h("label", { className: "input-field" }, h("span", { className: "input-field__label" }, "Status"), h("select", { className: "input", value: status, onChange: (event) => setStatus(event.target.value) }, h("option", { value: "TODOS" }, "Todos"), h("option", { value: "PATIO" }, "No pátio"), h("option", { value: "FORA" }, "Fora do pátio"))), h("label", { className: "input-field" }, h("span", { className: "input-field__label" }, "Pátio"), h("select", { className: "input", value: patio, onChange: (event) => setPatio(event.target.value) }, h("option", { value: "TODOS" }, "Todos"), patios.map((name) => h("option", { key: name, value: name }, name)))), h(Button, { variant: "secondary", onClick: () => void load() }, "Atualizar")),
    error ? h("p", { className: "notice notice--error" }, error) : null, success ? h("p", { className: "notice notice--success" }, success) : null,
    loading ? h("div", { className: "loading-state-system" }, h("i"), "Carregando frotas...") : visible.length ? h("div", null, h(FleetTable, { fleets: visible, actions }), h(FleetCards, { fleets: visible, actions })) : h("div", { className: "empty-state-system" }, h("strong", null, "Nenhuma frota encontrada")),
    formOpen ? h("div", { className: "modal-overlay modal-overlay--center", onClick: () => !saving && setFormOpen(false) }, h("div", { className: "modal fleet-form-v2", role: "dialog", "aria-modal": "true", onClick: (event) => event.stopPropagation() }, h("h2", null, editing ? "Editar frota" : "Nova frota"), h("div", { className: "fleet-form-grid" }, h(Input, { label: "Frota", value: form.numeroFrota, onChange: (event) => setForm({ ...form, numeroFrota: event.target.value }) }), h(Input, { label: "Placa", value: form.placa, onChange: (event) => setForm({ ...form, placa: event.target.value.toUpperCase() }) }), h("label", { className: "input-field wide" }, h("span", { className: "input-field__label" }, "Tipo de tanque"), h("select", { className: "input", value: form.tipoEquipamento, onChange: (event) => setForm({ ...form, tipoEquipamento: event.target.value }) }, h("option", { value: "" }, "Selecione"), tankTypes.map((type) => h("option", { key: type, value: type }, type))))), h("div", { className: "modal__actions" }, h(Button, { variant: "ghost", onClick: () => setFormOpen(false) }, "Cancelar"), h(Button, { disabled: saving, onClick: () => void save() }, saving ? "Salvando..." : "Salvar"))) ) : null,
    deleting ? h("div", { className: "modal-overlay", onClick: () => setDeleting(null) }, h("div", { className: "modal", onClick: (event) => event.stopPropagation() }, h("h2", null, "Excluir frota"), h("p", null, `Excluir a frota ${deleting.numeroFrota}?`), h("div", { className: "modal__actions" }, h(Button, { variant: "ghost", onClick: () => setDeleting(null) }, "Cancelar"), h(Button, { variant: "danger", disabled: saving, onClick: () => void confirmDelete() }, "Excluir")))) : null
  ));
}
