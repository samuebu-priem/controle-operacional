import { createElement as h, useEffect, useMemo, useRef, useState } from "react";
import { allocateYardFleet, createPatio, createPatioArea, getOperationalYardMap, getYardFleetLocation, getYardHistory, listYardFleets, moveYardFleet, releaseYardFleet, updatePatioArea } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Input, { Textarea } from "../components/ui/Input";
import { isGestor } from "../utils/auth";

const BRANCH = "PAULINIA";
const stateLabel = { FREE: "Livre", WARNING: "Atenção", FULL: "Lotada" };
const elapsed = (value) => { if (!value) return "não registrada"; const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000)); return minutes < 1 ? "agora" : minutes < 60 ? `há ${minutes} min` : minutes < 1440 ? `há ${Math.floor(minutes / 60)} h` : `há ${Math.floor(minutes / 1440)} d`; };
const responsible = (allocation) => allocation?.registeredBy?.fullName || allocation?.registeredBy?.name || "Não informado";
const visualState = (area) => area.occupied >= area.capacidade ? "FULL" : area.available / area.capacidade > .4 ? "FREE" : "WARNING";
function gridPosition(area, areas) {
  const xs = areas.map((item) => item.x), ys = areas.map((item) => item.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const normalizedX = maxX === minX ? .5 : (area.x - minX) / (maxX - minX);
  const normalizedY = maxY === minY ? .5 : (area.y - minY) / (maxY - minY);
  return { "--area-column": Math.round(normalizedX * 3) + 1, "--area-row": Math.round(normalizedY * 2) + 1, order: area.ordem };
}

export default function YardManagementPage() {
  const focusTimerRef = useRef(null);
  const params = new URLSearchParams(window.location.search);
  const [dashboard, setDashboard] = useState(null), [fleets, setFleets] = useState([]), [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(""), [selectedFleet, setSelectedFleet] = useState(null), [selectedAllocation, setSelectedAllocation] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null), [highlightAreaId, setHighlightAreaId] = useState(params.get("areaId"));
  const [modal, setModal] = useState(null), [targetPatioId, setTargetPatioId] = useState(""), [targetAreaId, setTargetAreaId] = useState(""), [note, setNote] = useState("");
  const [history, setHistory] = useState([]), [error, setError] = useState(""), [success, setSuccess] = useState(""), [saving, setSaving] = useState(false);
  const [admin, setAdmin] = useState(null), [adminForm, setAdminForm] = useState({ patioId: "", nome: "", capacidade: 1, ordem: 1, x: .5, y: .5, cor: "#22c55e" });

  async function load() {
    setLoading(true); setError("");
    try {
      const [mapResult, fleetResult] = await Promise.all([getOperationalYardMap(BRANCH), listYardFleets()]);
      setDashboard(mapResult); setFleets(fleetResult.fleets || []);
      const areaId = params.get("areaId");
      if (areaId) { const patio = mapResult.patios.find((item) => item.areas.some((area) => area.id === areaId)); const area = patio?.areas.find((item) => item.id === areaId); if (area) setSelectedArea({ ...area, patio }); }
      const fleetId = params.get("fleetId");
      if (fleetId) { const fleet = (fleetResult.fleets || []).find((item) => item.id === fleetId); if (fleet) await selectFleet(fleet, mapResult); }
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao carregar o mapa operacional."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const allAreas = useMemo(() => dashboard?.patios?.flatMap((patio) => patio.areas.map((area) => ({ ...area, patio }))) || [], [dashboard]);
  const suggestions = useMemo(() => { const value = query.toLocaleLowerCase("pt-BR").trim(); if (!value || selectedFleet?.numeroFrota === query) return []; return fleets.filter((fleet) => [fleet.numeroFrota, fleet.placa, fleet.tipoEquipamento].some((field) => String(field || "").toLocaleLowerCase("pt-BR").includes(value))).slice(0, 8); }, [fleets, query, selectedFleet]);
  const targetAreas = allAreas.filter((area) => area.patioId === targetPatioId && area.state !== "FULL");

  async function selectFleet(fleet, map = dashboard) {
    setSelectedFleet(fleet); setQuery(fleet.numeroFrota); setError("");
    try {
      const result = await getYardFleetLocation(fleet.id); setSelectedAllocation(result.allocation || null);
      if (result.allocation && map) {
        const patio = map.patios.find((item) => item.areas.some((area) => area.id === result.allocation.areaId));
        const area = patio?.areas.find((item) => item.id === result.allocation.areaId);
        if (area) focusArea({ ...area, patio }, true);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao localizar a frota."); }
  }

  function openAllocation(type) {
    const currentPatio = selectedAllocation?.area?.patio?.id || dashboard?.patios?.[0]?.id || "";
    setTargetPatioId(currentPatio); setTargetAreaId(""); setNote(""); setModal(type);
  }

  async function submitAllocation() {
    if (!selectedFleet || !targetAreaId) { setError("Selecione o pátio e a área."); return; }
    setSaving(true); setError("");
    try {
      if (modal === "allocate") await allocateYardFleet({ fleetId: selectedFleet.id, areaId: targetAreaId, note });
      else await moveYardFleet({ fleetId: selectedFleet.id, areaId: targetAreaId, note });
      setModal(null); setSuccess(modal === "allocate" ? "Frota registrada na área." : "Frota movida para a nova área."); await load(); await selectFleet(selectedFleet);
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao salvar a localização."); }
    finally { setSaving(false); }
  }

  async function release() {
    if (!selectedAllocation || !window.confirm("Liberar esta frota da área atual?")) return;
    setSaving(true);
    try { await releaseYardFleet(selectedAllocation.id); setSelectedAllocation(null); setSuccess("Área liberada com sucesso."); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Falha ao liberar a frota."); }
    finally { setSaving(false); }
  }

  async function showHistory() {
    if (!selectedFleet) return;
    try { const result = await getYardHistory(selectedFleet.id, { limit: 30 }); setHistory(result.allocations || []); setModal("history"); }
    catch (err) { setError(err instanceof Error ? err.message : "Falha ao carregar o histórico."); }
  }

  function focusArea(area, persistent = false) {
    if (!area) return;
    setSelectedArea(area); setHighlightAreaId(area.id);
    window.clearTimeout(focusTimerRef.current);
    window.setTimeout(() => document.querySelector(`[data-operational-area="${CSS.escape(area.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }), 40);
    if (!persistent) focusTimerRef.current = window.setTimeout(() => setHighlightAreaId((id) => id === area.id ? null : id), 2400);
  }

  async function saveAdmin() {
    setSaving(true); setError("");
    try {
      if (admin === "patio") await createPatio({ branch: BRANCH, nome: adminForm.nome, ordem: adminForm.ordem });
      else if (admin?.id) await updatePatioArea(admin.id, adminForm);
      else await createPatioArea(adminForm);
      setAdmin(null); setSuccess("Configuração operacional salva."); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao salvar configuração."); }
    finally { setSaving(false); }
  }

  return h(AppLayout, { className: "operational-yard" },
    h("div", { className: "operational-yard__shell" },
      h("div", { className: "operational-yard__header" }, h(AppHeader, { title: "Gestão de Pátio", subtitle: "Mapa operacional · última área conhecida", showBack: true })),
      h("section", { className: "operational-yard__search" },
        h("div", { className: "operational-yard__searchbox" }, h("span", { "aria-hidden": "true" }, "⌕"), h("input", { value: query, placeholder: "Pesquisar frota ou placa", onChange: (event) => { setQuery(event.target.value); setSelectedFleet(null); setSelectedAllocation(null); setHighlightAreaId(null); }, onKeyDown: (event) => { if (event.key === "Enter" && suggestions[0]) void selectFleet(suggestions[0]); } })),
        suggestions.length ? h("div", { className: "operational-yard__suggestions" }, suggestions.map((fleet) => h("button", { key: fleet.id, type: "button", onClick: () => void selectFleet(fleet) }, h("strong", null, `Frota ${fleet.numeroFrota}`), h("span", null, `${fleet.placa} · ${fleet.tipoEquipamento}`)))) : null,
        h("div", { className: "operational-yard__branch" }, h("span", null, "Filial"), h("strong", null, "Paulínia")),
        isGestor() ? h(Button, { variant: "secondary", onClick: () => { setAdmin("area"); setAdminForm({ patioId: dashboard?.patios?.[0]?.id || "", nome: "", capacidade: 1, ordem: 1, x: .5, y: .5, cor: "#22c55e" }); } }, "Administrar áreas") : null
      ),
      error ? h("p", { className: "notice notice--error operational-yard__notice", role: "alert" }, error) : null,
      success ? h("p", { className: "notice notice--success operational-yard__notice", role: "status" }, success) : null,
      h("main", { className: `operational-map${selectedFleet && selectedAllocation && highlightAreaId ? " operational-map--focused" : ""}`, "aria-label": "Mapa ilustrativo dos pátios" },
        h("div", { className: "operational-map__texture" }), h("div", { className: "operational-map__road" }),
        h("div", { className: "operational-map__yards" }, dashboard?.patios?.map((patio) => {
          const patioOccupied = patio.areas.reduce((sum, area) => sum + area.occupied, 0), patioCapacity = patio.areas.reduce((sum, area) => sum + area.capacidade, 0);
          return h("section", { key: patio.id, className: "operational-patio" },
            h("header", { className: "operational-patio__header" }, h("div", null, h("span", null, "REGIÃO OPERACIONAL"), h("h2", null, patio.nome)), h("small", null, `${patioOccupied} / ${patioCapacity}`)),
            h("div", { className: "operational-patio__areas" }, patio.areas.map((area) => h("button", { key: area.id, type: "button", "data-operational-area": area.id, className: `operational-area operational-area--${visualState(area).toLowerCase()}${highlightAreaId === area.id ? " operational-area--highlight" : ""}${selectedArea?.id === area.id ? " operational-area--selected" : ""}`, style: gridPosition(area, patio.areas), onClick: () => { setSelectedFleet(null); setSelectedAllocation(null); focusArea({ ...area, patio }); } },
              h("span", { className: "operational-area__name" }, area.nome), h("strong", null, `${area.occupied} / ${area.capacidade}`), h("small", null, `${area.available} livres`), selectedAllocation?.areaId === area.id ? h("i", { className: "operational-area__pin", title: "Última área conhecida" }, "●") : null
            )))
          );
        })),
        dashboard ? h("div", { className: "operational-map__summary" }, h("div", null, h("strong", null, dashboard.summary.capacity), h("span", null, "posições")), h("div", null, h("strong", null, dashboard.summary.occupied), h("span", null, "ocupadas")), h("div", null, h("strong", null, dashboard.summary.available), h("span", null, "livres"))) : null,
        loading ? h("div", { className: "yard-loading" }, "Carregando mapa operacional...") : null
      ),
      h("aside", { className: `operational-sheet${selectedFleet || selectedArea ? " operational-sheet--open" : ""}` },
        selectedFleet ? h("div", { className: "operational-sheet__content" },
          h("div", { className: "operational-sheet__handle" }), h("p", { className: "card-label" }, "ÚLTIMA LOCALIZAÇÃO CONHECIDA"),
          h("div", { className: "operational-fleet-title" }, h("div", null, h("h2", null, `Frota ${selectedFleet.numeroFrota}`), h("span", null, `${selectedFleet.placa} · ${selectedFleet.tipoEquipamento}`)), h("button", { onClick: () => { setSelectedFleet(null); setSelectedAllocation(null); setHighlightAreaId(null); } }, "×")),
          selectedAllocation ? h("dl", { className: "operational-detail-grid" }, h("div", null, h("dt", null, "Filial"), h("dd", null, "Paulínia")), h("div", null, h("dt", null, "Pátio"), h("dd", null, selectedAllocation.area.patio.nome)), h("div", null, h("dt", null, "Área"), h("dd", null, selectedAllocation.area.nome)), h("div", null, h("dt", null, "Registrada"), h("dd", null, elapsed(selectedAllocation.createdAt))), h("div", null, h("dt", null, "Responsável"), h("dd", null, responsible(selectedAllocation)))) : h("p", { className: "operational-empty" }, "Esta frota não está registrada em nenhuma área do pátio."),
          h("div", { className: "operational-sheet__actions" }, selectedAllocation ? h(Button, { onClick: () => focusArea(allAreas.find((area) => area.id === selectedAllocation.areaId) || selectedAllocation.area, true) }, "Ver no mapa") : null, selectedAllocation ? h(Button, { variant: "secondary", onClick: () => openAllocation("move") }, "Mover") : h(Button, { onClick: () => openAllocation("allocate") }, "Registrar área"), selectedAllocation ? h(Button, { variant: "ghost", disabled: saving, onClick: () => void release() }, "Liberar") : null, h(Button, { variant: "ghost", onClick: () => void showHistory() }, "Histórico"))
        ) : selectedArea ? h("div", { className: "operational-sheet__content" }, h("div", { className: "operational-sheet__handle" }), h("p", { className: "card-label" }, selectedArea.patio?.nome || "ÁREA"), h("div", { className: "operational-fleet-title" }, h("h2", null, selectedArea.nome), h("button", { onClick: () => setSelectedArea(null) }, "×")), h("div", { className: "operational-capacity" }, h("div", null, h("strong", null, selectedArea.capacidade), h("span", null, "Capacidade")), h("div", null, h("strong", null, selectedArea.occupied), h("span", null, "Ocupadas")), h("div", null, h("strong", null, selectedArea.available), h("span", null, "Disponíveis"))), h("span", { className: `operational-state operational-state--${visualState(selectedArea).toLowerCase()}` }, stateLabel[visualState(selectedArea)]), h("div", { className: "operational-area-fleets" }, selectedArea.allocations?.length ? selectedArea.allocations.map((allocation) => h("button", { key: allocation.id, onClick: () => void selectFleet(allocation.fleet) }, h("strong", null, `Frota ${allocation.fleet.numeroFrota}`), h("span", null, `${allocation.fleet.placa} · ${elapsed(allocation.createdAt)}`))) : h("p", null, "Nenhuma frota nesta área.")), isGestor() ? h(Button, { variant: "secondary", onClick: () => { setAdmin(selectedArea); setAdminForm({ patioId: selectedArea.patioId, nome: selectedArea.nome, capacidade: selectedArea.capacidade, ordem: selectedArea.ordem, x: selectedArea.x, y: selectedArea.y, cor: selectedArea.cor }); } }, "Editar área") : null) : h("div", { className: "operational-sheet__welcome" }, h("strong", null, "Selecione uma área"), h("span", null, "Consulte capacidade, ocupação e frotas."))
      )
    ),
    ["allocate", "move"].includes(modal) ? h("div", { className: "modal-overlay", onClick: () => setModal(null) }, h("div", { className: "modal operational-modal", onClick: (event) => event.stopPropagation() }, h("h2", { className: "modal__title" }, modal === "allocate" ? "Registrar frota" : "Mover frota"), h("p", null, `Frota ${selectedFleet?.numeroFrota}`), h("label", { className: "input-field" }, h("span", { className: "input-field__label" }, "Filial"), h("select", { className: "input", disabled: true }, h("option", null, "Paulínia"))), h("label", { className: "input-field" }, h("span", { className: "input-field__label" }, "Pátio"), h("select", { className: "input", value: targetPatioId, onChange: (event) => { setTargetPatioId(event.target.value); setTargetAreaId(""); } }, h("option", { value: "" }, "Selecione"), dashboard?.patios.map((patio) => h("option", { key: patio.id, value: patio.id }, patio.nome)))), h("label", { className: "input-field" }, h("span", { className: "input-field__label" }, "Área"), h("select", { className: "input", value: targetAreaId, onChange: (event) => setTargetAreaId(event.target.value) }, h("option", { value: "" }, "Selecione"), targetAreas.map((area) => h("option", { key: area.id, value: area.id }, `${area.nome} · ${area.available} disponíveis`)))), h(Textarea, { label: "Observação (opcional)", maxLength: 500, value: note, onChange: (event) => setNote(event.target.value) }), h("div", { className: "modal__actions" }, h(Button, { variant: "ghost", onClick: () => setModal(null) }, "Cancelar"), h(Button, { disabled: saving || !targetAreaId, onClick: () => void submitAllocation() }, saving ? "Salvando..." : "Salvar")))) : null,
    modal === "history" ? h("div", { className: "modal-overlay", onClick: () => setModal(null) }, h("div", { className: "modal operational-modal", onClick: (event) => event.stopPropagation() }, h("h2", { className: "modal__title" }, `Histórico · Frota ${selectedFleet?.numeroFrota}`), h("div", { className: "operational-history" }, history.length ? history.map((item) => h("article", { key: item.id }, h("strong", null, `${item.area.patio.nome} · ${item.area.nome}`), h("span", null, `Entrada ${elapsed(item.createdAt)}`), h("small", null, item.releasedAt ? `Liberada ${elapsed(item.releasedAt)}` : "Localização atual"))) : h("p", null, "Nenhum registro.")), h("div", { className: "modal__actions" }, h(Button, { onClick: () => setModal(null) }, "Fechar")))) : null,
    admin ? h("div", { className: "modal-overlay", onClick: () => setAdmin(null) }, h("div", { className: "modal operational-modal", onClick: (event) => event.stopPropagation() }, h("h2", { className: "modal__title" }, admin === "patio" ? "Novo pátio" : admin?.id ? "Editar área" : "Nova área"), admin !== "patio" ? h("label", { className: "input-field" }, h("span", { className: "input-field__label" }, "Pátio"), h("select", { className: "input", value: adminForm.patioId, onChange: (event) => setAdminForm({ ...adminForm, patioId: event.target.value }) }, dashboard?.patios.map((patio) => h("option", { key: patio.id, value: patio.id }, patio.nome)))) : null, h(Input, { label: "Nome", value: adminForm.nome, onChange: (event) => setAdminForm({ ...adminForm, nome: event.target.value }) }), admin !== "patio" ? h("div", { className: "operational-admin-grid" }, h(Input, { label: "Capacidade", type: "number", min: 1, value: adminForm.capacidade, onChange: (event) => setAdminForm({ ...adminForm, capacidade: Number(event.target.value) }) }), h(Input, { label: "Ordem", type: "number", value: adminForm.ordem, onChange: (event) => setAdminForm({ ...adminForm, ordem: Number(event.target.value) }) }), h(Input, { label: "Posição X (0 a 1)", type: "number", min: 0, max: 1, step: .01, value: adminForm.x, onChange: (event) => setAdminForm({ ...adminForm, x: Number(event.target.value) }) }), h(Input, { label: "Posição Y (0 a 1)", type: "number", min: 0, max: 1, step: .01, value: adminForm.y, onChange: (event) => setAdminForm({ ...adminForm, y: Number(event.target.value) }) }), h(Input, { label: "Cor", type: "color", value: adminForm.cor, onChange: (event) => setAdminForm({ ...adminForm, cor: event.target.value }) })) : h(Input, { label: "Ordem", type: "number", value: adminForm.ordem, onChange: (event) => setAdminForm({ ...adminForm, ordem: Number(event.target.value) }) }), h("div", { className: "modal__actions" }, admin === "area" ? h(Button, { variant: "ghost", onClick: () => { setAdmin("patio"); setAdminForm({ ...adminForm, nome: "" }); } }, "Novo pátio") : null, h(Button, { variant: "ghost", onClick: () => setAdmin(null) }, "Cancelar"), h(Button, { disabled: saving, onClick: () => void saveAdmin() }, "Salvar")))) : null
  );
}
