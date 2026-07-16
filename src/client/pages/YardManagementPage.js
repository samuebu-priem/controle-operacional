import { createElement as h, useEffect, useMemo, useRef, useState } from "react";
import { allocateYardFleet, bulkAllocateYardArea, createPatio, createPatioArea, getOperationalYardMap, getYardFleetLocation, getYardHistory, listYardFleets, moveYardFleet, previewYardBulkAllocation, releaseYardFleet, updatePatioArea } from "../api";
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
  return { "--area-column": Math.round(normalizedX * 3) + 1, "--area-row": Math.round(normalizedY * 2) + 1, "--occupancy": `${area.occupancyPercent || 0}%`, order: area.ordem };
}

export default function YardManagementPage() {
  const focusTimerRef = useRef(null);
  const params = new URLSearchParams(window.location.search);
  const [dashboard, setDashboard] = useState(null), [fleets, setFleets] = useState([]), [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(""), [selectedFleet, setSelectedFleet] = useState(null), [selectedAllocation, setSelectedAllocation] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null), [highlightAreaId, setHighlightAreaId] = useState(params.get("areaId"));
  const [modal, setModal] = useState(null), [targetPatioId, setTargetPatioId] = useState(""), [targetAreaId, setTargetAreaId] = useState(""), [note, setNote] = useState("");
  const [history, setHistory] = useState([]), [error, setError] = useState(""), [success, setSuccess] = useState(""), [saving, setSaving] = useState(false);
  const [admin, setAdmin] = useState(null), [adminForm, setAdminForm] = useState({ patioId: "", nome: "", capacidade: 1, ordem: 1, x: .5, y: .5, cor: "#22c55e", ativo: true });
  const [sideCollapsed, setSideCollapsed] = useState(false), [areaFleetQuery, setAreaFleetQuery] = useState(""), [areaFleetPage, setAreaFleetPage] = useState(1);
  const [bulk, setBulk] = useState({ step: 1, patioId: "", areaId: "", identifiers: "", origin: "MANUAL_ALLOCATION", preview: null, result: null });
  const [mobileActions, setMobileActions] = useState(false);
  const [activePatioId, setActivePatioId] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [mapResult, fleetResult] = await Promise.all([getOperationalYardMap(BRANCH), listYardFleets()]);
      setDashboard(mapResult); setFleets(fleetResult.fleets || []); setActivePatioId((current) => current || mapResult.patios?.[0]?.id || "");
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
  const filteredAreaAllocations = useMemo(() => { const value = areaFleetQuery.trim().toLocaleLowerCase("pt-BR"); return (selectedArea?.allocations || []).filter((item) => !value || [item.fleet.numeroFrota, item.fleet.placa, item.fleet.tipoEquipamento].some((field) => String(field || "").toLocaleLowerCase("pt-BR").includes(value))); }, [selectedArea, areaFleetQuery]);
  const areaPageSize = 6, areaPages = Math.max(1, Math.ceil(filteredAreaAllocations.length / areaPageSize)), areaAllocations = filteredAreaAllocations.slice((areaFleetPage - 1) * areaPageSize, areaFleetPage * areaPageSize);

  async function refreshDashboard(preferredAreaId = selectedArea?.id) {
    const result = await getOperationalYardMap(BRANCH); setDashboard(result);
    if (preferredAreaId) { const patio = result.patios.find((item) => item.areas.some((area) => area.id === preferredAreaId)); const area = patio?.areas.find((item) => item.id === preferredAreaId); setSelectedArea(area ? { ...area, patio } : null); }
    return result;
  }

  function openBulk(area = selectedArea) {
    const patioId = area?.patioId || dashboard?.patios?.[0]?.id || "";
    setBulk({ step: area ? 3 : 1, patioId, areaId: area?.id || "", identifiers: "", origin: "MANUAL_ALLOCATION", preview: null, result: null }); setModal("bulk"); setError("");
  }

  async function previewBulk() {
    if (!bulk.areaId || !bulk.identifiers.trim()) return;
    setSaving(true); setError("");
    try { const preview = await previewYardBulkAllocation(bulk.areaId, bulk.identifiers); setBulk({ ...bulk, preview, step: 4 }); }
    catch (err) { setError(err instanceof Error ? err.message : "Falha ao validar as frotas."); }
    finally { setSaving(false); }
  }

  async function confirmBulk() {
    const fleetIds = bulk.preview?.accepted?.map((fleet) => fleet.id) || [];
    if (!fleetIds.length) return;
    setSaving(true); setError("");
    try { const result = await bulkAllocateYardArea(bulk.areaId, { fleetIds, origin: bulk.origin }); await refreshDashboard(bulk.areaId); setBulk({ ...bulk, result, step: 5 }); setSuccess(`${result.created} frota(s) registradas sem gerar movimentações automáticas.`); }
    catch (err) { setError(err instanceof Error ? err.message : "Falha ao preencher o pátio."); }
    finally { setSaving(false); }
  }

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

  function openAllocation(type, allocation = selectedAllocation) {
    const currentPatio = allocation?.area?.patio?.id || selectedArea?.patioId || dashboard?.patios?.[0]?.id || "";
    setTargetPatioId(currentPatio); setTargetAreaId(""); setNote(""); setModal(type);
  }

  async function submitAllocation() {
    if (!selectedFleet || !targetAreaId) { setError("Selecione o pátio e a área."); return; }
    setSaving(true); setError("");
    try {
      if (["allocate", "area-add"].includes(modal)) await allocateYardFleet({ fleetId: selectedFleet.id, areaId: targetAreaId, note });
      else await moveYardFleet({ fleetId: selectedFleet.id, areaId: targetAreaId, note });
      const wasAllocation = ["allocate", "area-add"].includes(modal), areaId = targetAreaId; setModal(null); setSuccess(wasAllocation ? "Frota registrada na área." : "Frota movida para a nova área."); const map = await refreshDashboard(areaId); await selectFleet(selectedFleet, map);
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao salvar a localização."); }
    finally { setSaving(false); }
  }

  async function release() {
    if (!selectedAllocation) return;
    setSaving(true);
    try { await releaseYardFleet(selectedAllocation.id, note); const areaId = selectedAllocation.areaId; setSelectedAllocation(null); setModal(null); setNote(""); setSuccess("Área liberada com sucesso; o histórico foi preservado."); await refreshDashboard(areaId); }
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

  function selectAreaAllocation(allocation, action) {
    const locatedAllocation = { ...allocation, area: { ...selectedArea, patio: selectedArea.patio } };
    setSelectedFleet(allocation.fleet); setSelectedAllocation(locatedAllocation); setNote("");
    if (action === "move") openAllocation("move", locatedAllocation); else if (action === "release") setModal("release"); else void selectFleet(allocation.fleet);
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
    h("div", { className: `operational-yard__shell${sideCollapsed ? " operational-yard__shell--panel-collapsed" : ""}` },
      h("div", { className: "operational-yard__header" }, h(AppHeader, { title: "Gestão de Pátio", subtitle: "Mapa operacional · última área conhecida", showBack: true })),
      h("section", { className: "operational-yard__search" },
        h("div", { className: "operational-yard__searchbox" }, h("span", { "aria-hidden": "true" }, "⌕"), h("input", { value: query, placeholder: "Pesquisar frota ou placa", onChange: (event) => { setQuery(event.target.value); setSelectedFleet(null); setSelectedAllocation(null); setHighlightAreaId(null); }, onKeyDown: (event) => { if (event.key === "Enter" && suggestions[0]) void selectFleet(suggestions[0]); } })),
        suggestions.length ? h("div", { className: "operational-yard__suggestions" }, suggestions.map((fleet) => h("button", { key: fleet.id, type: "button", onClick: () => void selectFleet(fleet) }, h("strong", null, `Frota ${fleet.numeroFrota}`), h("span", null, `${fleet.placa} · ${fleet.tipoEquipamento}`)))) : null,
        h("div", { className: "operational-yard__branch" }, h("span", null, "Filial"), h("strong", null, "Paulínia")),
        dashboard ? h("div", { className: "operational-yard__top-summary" }, h("span", null, "Resumo geral"), h("strong", null, `${dashboard.summary.occupied}/${dashboard.summary.capacity}`), h("small", null, `${dashboard.summary.available} livres`)) : null,
        h("div", { className: "operational-yard__actions" }, h(Button, { className: "operational-yard__bulk-action", onClick: () => openBulk() }, "Preencher pátio"), isGestor() ? h(Button, { variant: "secondary", onClick: () => { setAdmin("area"); setAdminForm({ patioId: dashboard?.patios?.[0]?.id || "", nome: "", capacidade: 1, ordem: 1, x: .5, y: .5, cor: "#22c55e", ativo: true }); } }, "Administrar áreas") : null)
      ),
      error ? h("p", { className: "notice notice--error operational-yard__notice", role: "alert" }, error) : null,
      success ? h("p", { className: "notice notice--success operational-yard__notice", role: "status" }, success) : null,
      h("nav", { className: "operational-patio-tabs", "aria-label": "Selecionar pátio" }, dashboard?.patios?.map((patio) => h("button", { key: patio.id, type: "button", className: activePatioId === patio.id ? "is-active" : "", onClick: () => setActivePatioId(patio.id) }, patio.nome))),
      h("main", { className: `operational-map${selectedFleet && selectedAllocation && highlightAreaId ? " operational-map--focused" : ""}`, "aria-label": "Mapa ilustrativo dos pátios" },
        h("div", { className: "operational-map__texture" }), h("div", { className: "operational-map__road" }),
        h("div", { className: "operational-map__yards" }, dashboard?.patios?.filter((patio) => !activePatioId || patio.id === activePatioId).map((patio) => {
          const patioOccupied = patio.areas.reduce((sum, area) => sum + area.occupied, 0), patioCapacity = patio.areas.reduce((sum, area) => sum + area.capacidade, 0);
          return h("section", { key: patio.id, className: "operational-patio" },
            h("header", { className: "operational-patio__header" }, h("div", null, h("span", null, "REGIÃO OPERACIONAL"), h("h2", null, patio.nome)), h("small", null, `${patioOccupied} / ${patioCapacity}`)),
            h("div", { className: "operational-patio__areas" }, patio.areas.map((area) => h("button", { key: area.id, type: "button", title: area.nome, "data-operational-area": area.id, className: `operational-area operational-area--${visualState(area).toLowerCase()}${highlightAreaId === area.id ? " operational-area--highlight" : ""}${selectedArea?.id === area.id ? " operational-area--selected" : ""}`, style: gridPosition(area, patio.areas), onClick: () => { setSelectedFleet(null); setSelectedAllocation(null); focusArea({ ...area, patio }); } },
              h("span", { className: "operational-area__name" }, area.nome), h("strong", null, `${area.occupied} / ${area.capacidade}`), h("small", null, `${area.available} livres`), selectedAllocation?.areaId === area.id ? h("i", { className: "operational-area__pin", title: "Última área conhecida" }, "●") : null
            )))
          );
        })),
        dashboard ? h("div", { className: "operational-map__summary" }, h("div", null, h("strong", null, dashboard.summary.capacity), h("span", null, "posições")), h("div", null, h("strong", null, dashboard.summary.occupied), h("span", null, "ocupadas")), h("div", null, h("strong", null, dashboard.summary.available), h("span", null, "livres"))) : null,
        loading ? h("div", { className: "yard-loading" }, "Carregando mapa operacional...") : null
      ),
      h("aside", { className: `operational-sheet${selectedFleet || selectedArea ? " operational-sheet--open" : ""}${sideCollapsed ? " operational-sheet--collapsed" : ""}` },
        h("button", { type: "button", className: "operational-sheet__collapse", onClick: () => setSideCollapsed(!sideCollapsed), title: sideCollapsed ? "Abrir painel" : "Recolher painel" }, sideCollapsed ? "‹" : "›"),
        selectedFleet ? h("div", { className: "operational-sheet__content" },
          h("div", { className: "operational-sheet__handle" }), h("p", { className: "card-label" }, "ÚLTIMA LOCALIZAÇÃO CONHECIDA"),
          h("div", { className: "operational-fleet-title" }, h("div", null, h("h2", null, `Frota ${selectedFleet.numeroFrota}`), h("span", null, `${selectedFleet.placa} · ${selectedFleet.tipoEquipamento}`)), h("button", { onClick: () => { setSelectedFleet(null); setSelectedAllocation(null); setHighlightAreaId(null); } }, "×")),
          selectedAllocation ? h("dl", { className: "operational-detail-grid" }, h("div", null, h("dt", null, "Filial"), h("dd", null, "Paulínia")), h("div", null, h("dt", null, "Pátio"), h("dd", null, selectedAllocation.area.patio.nome)), h("div", null, h("dt", null, "Área"), h("dd", null, selectedAllocation.area.nome)), h("div", null, h("dt", null, "Registrada"), h("dd", null, elapsed(selectedAllocation.registeredAt || selectedAllocation.createdAt))), h("div", null, h("dt", null, "Responsável"), h("dd", null, responsible(selectedAllocation)))) : h("p", { className: "operational-empty" }, "Esta frota não está registrada em nenhuma área do pátio."),
          selectedAllocation ? h("p", { className: "operational-help" }, "Localização aproximada por área operacional.") : null,
          h("div", { className: "operational-sheet__actions" }, selectedAllocation ? h(Button, { onClick: () => focusArea(allAreas.find((area) => area.id === selectedAllocation.areaId) || selectedAllocation.area, true) }, "Ver no mapa") : null, selectedAllocation ? h(Button, { variant: "secondary", onClick: () => openAllocation("move") }, "Mover") : h(Button, { onClick: () => openAllocation("allocate") }, "Registrar área"), selectedAllocation ? h(Button, { variant: "ghost", disabled: saving, onClick: () => { setNote(""); setModal("release"); } }, "Remover do pátio") : null, h(Button, { variant: "ghost", onClick: () => void showHistory() }, "Histórico")),
          selectedAllocation?.note ? h("p", { className: "operational-note" }, `Observação: ${selectedAllocation.note}`) : null
        ) : selectedArea ? h("div", { className: "operational-sheet__content" },
          h("div", { className: "operational-sheet__handle" }), h("p", { className: "card-label" }, selectedArea.patio?.nome || "ÁREA"),
          h("div", { className: "operational-fleet-title" }, h("h2", null, selectedArea.nome), h("button", { onClick: () => setSelectedArea(null) }, "×")),
          h("div", { className: "operational-capacity" }, h("div", null, h("strong", null, selectedArea.capacidade), h("span", null, "Capacidade")), h("div", null, h("strong", null, selectedArea.occupied), h("span", null, "Ocupadas")), h("div", null, h("strong", null, selectedArea.available), h("span", null, "Disponíveis"))),
          h("span", { className: `operational-state operational-state--${visualState(selectedArea).toLowerCase()}` }, stateLabel[visualState(selectedArea)]),
          h("span", { className: "operational-occupancy-percent" }, `${selectedArea.occupancyPercent ?? Math.round(selectedArea.occupied / selectedArea.capacidade * 100)}% de ocupação`),
          h("div", { className: "operational-area-actions" }, h(Button, { onClick: () => { setSelectedFleet(null); setSelectedAllocation(null); setTargetPatioId(selectedArea.patioId); setTargetAreaId(selectedArea.id); setModal("area-add"); } }, "Adicionar frota"), h(Button, { variant: "secondary", onClick: () => openBulk(selectedArea) }, "Preencher área")),
          h(Input, { label: "Buscar nesta área", value: areaFleetQuery, onChange: (event) => { setAreaFleetQuery(event.target.value); setAreaFleetPage(1); }, placeholder: "Frota, placa ou equipamento" }),
          h("div", { className: "operational-area-fleets" }, areaAllocations.length ? areaAllocations.map((allocation) => h("article", { key: allocation.id, className: "operational-area-fleet" }, h("button", { className: "operational-area-fleet__main", onClick: () => void selectFleet(allocation.fleet) }, h("strong", null, `Frota ${allocation.fleet.numeroFrota}`), h("span", null, `${allocation.fleet.placa} · ${allocation.fleet.tipoEquipamento || "Equipamento"}`), h("small", null, `${responsible(allocation)} · ${elapsed(allocation.registeredAt || allocation.createdAt)}`), allocation.note ? h("small", null, allocation.note.length > 72 ? `${allocation.note.slice(0, 72)}…` : allocation.note) : null), h("div", { className: "operational-area-fleet__actions" }, h("button", { onClick: () => void selectFleet(allocation.fleet) }, "Detalhes"), h("button", { onClick: () => focusArea(selectedArea, true) }, "Mapa"), h("button", { onClick: () => selectAreaAllocation(allocation, "move") }, "Mover"), h("button", { onClick: () => selectAreaAllocation(allocation, "release") }, "Remover")))) : h("p", null, "Nenhuma frota nesta área.")),
          areaPages > 1 ? h("div", { className: "operational-pagination" }, h("button", { disabled: areaFleetPage <= 1, onClick: () => setAreaFleetPage(areaFleetPage - 1) }, "Anterior"), h("span", null, `${areaFleetPage} / ${areaPages}`), h("button", { disabled: areaFleetPage >= areaPages, onClick: () => setAreaFleetPage(areaFleetPage + 1) }, "Próxima")) : null,
          h("div", { className: "operational-recent" }, h("h3", null, "Histórico recente"), ...(dashboard?.recentMovements || []).filter((item) => item.areaId === selectedArea.id).slice(0, 5).map((item) => h("p", { key: item.id }, h("strong", null, `Frota ${item.fleet.numeroFrota}`), h("span", null, item.releasedAt ? `Saída ${elapsed(item.releasedAt)}` : `Entrada ${elapsed(item.registeredAt || item.createdAt)}`)))),
          isGestor() ? h(Button, { variant: "ghost", onClick: () => { setAdmin(selectedArea); setAdminForm({ patioId: selectedArea.patioId, nome: selectedArea.nome, capacidade: selectedArea.capacidade, ordem: selectedArea.ordem, x: selectedArea.x, y: selectedArea.y, cor: selectedArea.cor, ativo: selectedArea.ativo !== false }); } }, "Editar área") : null
        ) : h("div", { className: "operational-sheet__welcome operational-sheet__dashboard" }, h("strong", null, "Resumo do pátio"), dashboard ? h("div", { className: "operational-capacity" }, h("div", null, h("strong", null, dashboard.summary.capacity), h("span", null, "Capacidade")), h("div", null, h("strong", null, dashboard.summary.occupied), h("span", null, "Ocupadas")), h("div", null, h("strong", null, dashboard.summary.available), h("span", null, "Livres"))) : null, dashboard?.patios?.map((patio) => { const occupied = patio.areas.reduce((sum, area) => sum + area.occupied, 0), capacity = patio.areas.reduce((sum, area) => sum + area.capacidade, 0); return h("button", { key: patio.id, className: "operational-patio-summary", onClick: () => patio.areas[0] && focusArea({ ...patio.areas[0], patio }) }, h("span", null, patio.nome), h("strong", null, `${occupied} / ${capacity}`)); }), h("div", { className: "operational-recent" }, h("h3", null, "Movimentações recentes"), ...(dashboard?.recentMovements || []).slice(0, 6).map((item) => h("p", { key: item.id }, h("strong", null, `Frota ${item.fleet.numeroFrota}`), h("span", null, `${item.area.nome} · ${elapsed(item.updatedAt)}`)))))
      ),
      h("div", { className: `operational-mobile-actions${mobileActions ? " operational-mobile-actions--open" : ""}` },
        mobileActions ? h("div", { className: "operational-mobile-actions__menu" }, h("button", { type: "button", onClick: () => { setMobileActions(false); openBulk(); } }, h("strong", null, "Preencher pátio"), h("span", null, "Cadastrar várias frotas por área"))) : null,
        h("button", { type: "button", className: "operational-mobile-actions__trigger", onClick: () => setMobileActions(!mobileActions), "aria-expanded": mobileActions, "aria-label": mobileActions ? "Fechar ações" : "Abrir ações operacionais" }, mobileActions ? "×" : "+"),
        h("span", null, mobileActions ? "Fechar" : "Ações")
      )
    ),
    ["allocate", "move", "area-add"].includes(modal) ? h("div", { className: "modal-overlay", onClick: () => setModal(null) }, h("div", { className: "modal operational-modal", onClick: (event) => event.stopPropagation() }, h("h2", { className: "modal__title" }, modal === "move" ? "Mover frota" : "Registrar frota"), modal === "area-add" ? h("div", { className: "operational-fleet-picker" }, h(Input, { label: "Buscar frota", value: query, onChange: (event) => { setQuery(event.target.value); setSelectedFleet(null); }, placeholder: "Número, placa ou equipamento" }), h("div", null, (suggestions.length ? suggestions : fleets.slice(0, 6)).map((fleet) => h("button", { key: fleet.id, className: selectedFleet?.id === fleet.id ? "is-selected" : "", onClick: () => { setSelectedFleet(fleet); setQuery(fleet.numeroFrota); } }, h("strong", null, `Frota ${fleet.numeroFrota}`), h("span", null, `${fleet.placa} · ${fleet.tipoEquipamento || "Equipamento"}`))))) : h("p", null, `Frota ${selectedFleet?.numeroFrota}`), h("label", { className: "input-field" }, h("span", { className: "input-field__label" }, "Filial"), h("select", { className: "input", disabled: true }, h("option", null, "Paulínia"))), h("label", { className: "input-field" }, h("span", { className: "input-field__label" }, "Pátio"), h("select", { className: "input", value: targetPatioId, disabled: modal === "area-add", onChange: (event) => { setTargetPatioId(event.target.value); setTargetAreaId(""); } }, h("option", { value: "" }, "Selecione"), dashboard?.patios.map((patio) => h("option", { key: patio.id, value: patio.id }, patio.nome)))), h("label", { className: "input-field" }, h("span", { className: "input-field__label" }, "Área"), h("select", { className: "input", value: targetAreaId, disabled: modal === "area-add", onChange: (event) => setTargetAreaId(event.target.value) }, h("option", { value: "" }, "Selecione"), targetAreas.map((area) => h("option", { key: area.id, value: area.id }, `${area.nome} · ${area.available} disponíveis`)))), h(Textarea, { label: "Observação (opcional)", maxLength: 500, value: note, onChange: (event) => setNote(event.target.value) }), h("div", { className: "modal__actions" }, h(Button, { variant: "ghost", onClick: () => setModal(null) }, "Cancelar"), h(Button, { disabled: saving || !targetAreaId || !selectedFleet, onClick: () => void submitAllocation() }, saving ? "Salvando..." : "Salvar")))) : null,
    modal === "release" ? h("div", { className: "modal-overlay", onClick: () => setModal(null) }, h("div", { className: "modal operational-modal", onClick: (event) => event.stopPropagation() }, h("h2", { className: "modal__title" }, "Remover frota da área"), h("p", null, `A Frota ${selectedFleet?.numeroFrota} será liberada de ${selectedAllocation?.area?.nome}. O registro continuará no histórico.`), h(Textarea, { label: "Observação (opcional)", maxLength: 500, value: note, onChange: (event) => setNote(event.target.value) }), h("div", { className: "modal__actions" }, h(Button, { variant: "ghost", onClick: () => setModal(null) }, "Cancelar"), h(Button, { disabled: saving, onClick: () => void release() }, saving ? "Removendo..." : "Confirmar remoção")))) : null,
    modal === "bulk" ? h("div", { className: "modal-overlay", onClick: () => setModal(null) }, h("div", { className: "modal operational-modal operational-bulk", onClick: (event) => event.stopPropagation() },
      h("div", { className: "operational-bulk__header" }, h("div", null, h("p", { className: "card-label" }, `ETAPA ${bulk.step} DE 5`), h("h2", { className: "modal__title" }, "Preencher pátio")), h("button", { onClick: () => setModal(null), "aria-label": "Fechar" }, "×")),
      h("div", { className: "operational-bulk__steps", "aria-hidden": "true" }, [1, 2, 3, 4, 5].map((step) => h("i", { key: step, className: step <= bulk.step ? "is-active" : "" }))),
      bulk.step === 1 ? h("div", { className: "operational-choice-grid" }, dashboard?.patios?.map((patio) => h("button", { key: patio.id, onClick: () => setBulk({ ...bulk, patioId: patio.id, step: 2 }) }, h("strong", null, patio.nome), h("span", null, `${patio.areas.reduce((sum, area) => sum + area.available, 0)} posições disponíveis`)))) : null,
      bulk.step === 2 ? h("div", { className: "operational-choice-grid" }, dashboard?.patios?.find((patio) => patio.id === bulk.patioId)?.areas.map((area) => h("button", { key: area.id, disabled: area.available < 1, onClick: () => setBulk({ ...bulk, areaId: area.id, step: 3 }) }, h("strong", null, area.nome), h("span", null, `${area.occupied} / ${area.capacidade} · ${area.available} livres`)))) : null,
      bulk.step === 3 ? h("div", { className: "operational-bulk__form" }, h(Textarea, { label: "Frotas", rows: 8, value: bulk.identifiers, onChange: (event) => setBulk({ ...bulk, identifiers: event.target.value, preview: null }), placeholder: "Cole números separados por vírgula, espaço, quebra de linha ou ponto e vírgula" }), h("label", { className: "input-field" }, h("span", { className: "input-field__label" }, "Origem do registro"), h("select", { className: "input", value: bulk.origin, onChange: (event) => setBulk({ ...bulk, origin: event.target.value }) }, h("option", { value: "MANUAL_ALLOCATION" }, "Alocação manual"), h("option", { value: "INITIAL_INVENTORY" }, "Inventário inicial"))), h("p", { className: "operational-help" }, "Frotas já alocadas não serão movidas automaticamente.")) : null,
      bulk.step === 4 && bulk.preview ? h("div", { className: "operational-bulk__review" }, h("div", { className: "operational-capacity" }, h("div", null, h("strong", null, bulk.preview.currentOccupancy), h("span", null, "Ocupação atual")), h("div", null, h("strong", null, bulk.preview.accepted.length), h("span", null, "A incluir")), h("div", null, h("strong", null, bulk.preview.finalOccupancy), h("span", null, "Ocupação final"))), h("div", { className: "operational-review-groups" }, h("article", { className: "is-valid" }, h("strong", null, `Válidas (${bulk.preview.accepted.length})`), h("span", null, bulk.preview.accepted.map((item) => item.numeroFrota).join(", ") || "Nenhuma")), h("article", null, h("strong", null, `Inexistentes (${bulk.preview.nonexistent.length})`), h("span", null, bulk.preview.nonexistent.join(", ") || "Nenhuma")), h("article", null, h("strong", null, `Duplicadas (${bulk.preview.duplicates.length})`), h("span", null, bulk.preview.duplicates.join(", ") || "Nenhuma")), h("article", null, h("strong", null, `Já nesta área (${bulk.preview.alreadyHere.length})`), h("span", null, bulk.preview.alreadyHere.map((item) => item.fleet.numeroFrota).join(", ") || "Nenhuma")), h("article", { className: "is-warning" }, h("strong", null, `Em outra área (${bulk.preview.allocatedElsewhere.length})`), h("span", null, bulk.preview.allocatedElsewhere.map((item) => `${item.fleet.numeroFrota} (${item.allocation.area.nome})`).join(", ") || "Nenhuma")), h("article", { className: "is-warning" }, h("strong", null, `Sem vaga (${bulk.preview.overflow.length})`), h("span", null, bulk.preview.overflow.map((item) => item.numeroFrota).join(", ") || "Nenhuma")))) : null,
      bulk.step === 5 ? h("div", { className: "operational-bulk__success" }, h("strong", null, "Preenchimento concluído"), h("span", null, `${bulk.result?.created || 0} frota(s) registradas em ${bulk.result?.area || "área selecionada"}.`), h("small", null, "Nenhuma movimentação automática foi criada.")) : null,
      h("div", { className: "modal__actions" }, bulk.step > 1 && bulk.step < 5 ? h(Button, { variant: "ghost", disabled: saving, onClick: () => setBulk({ ...bulk, step: bulk.step - 1, preview: bulk.step === 4 ? null : bulk.preview }) }, "Voltar") : null, bulk.step === 3 ? h(Button, { disabled: saving || !bulk.identifiers.trim(), onClick: () => void previewBulk() }, saving ? "Validando..." : "Revisar") : null, bulk.step === 4 ? h(Button, { disabled: saving || !bulk.preview?.accepted?.length, onClick: () => void confirmBulk() }, saving ? "Confirmando..." : `Confirmar ${bulk.preview?.accepted?.length || 0} frota(s)`) : null, bulk.step === 5 ? h(Button, { onClick: () => setModal(null) }, "Concluir") : null)
    )) : null,
    modal === "history" ? h("div", { className: "modal-overlay", onClick: () => setModal(null) }, h("div", { className: "modal operational-modal", onClick: (event) => event.stopPropagation() }, h("h2", { className: "modal__title" }, `Histórico · Frota ${selectedFleet?.numeroFrota}`), h("div", { className: "operational-history" }, history.length ? history.map((item) => h("article", { key: item.id }, h("strong", null, `${item.area.patio.nome} · ${item.area.nome}`), h("span", null, `Entrada ${elapsed(item.registeredAt || item.createdAt)}`), h("small", null, item.releasedAt ? `Liberada ${elapsed(item.releasedAt)}` : "Localização atual"))) : h("p", null, "Nenhum registro.")), h("div", { className: "modal__actions" }, h(Button, { onClick: () => setModal(null) }, "Fechar")))) : null,
    admin ? h("div", { className: "modal-overlay", onClick: () => setAdmin(null) }, h("div", { className: "modal operational-modal", onClick: (event) => event.stopPropagation() }, h("h2", { className: "modal__title" }, admin === "patio" ? "Novo pátio" : admin?.id ? "Editar área" : "Nova área"), admin !== "patio" ? h("label", { className: "input-field" }, h("span", { className: "input-field__label" }, "Pátio"), h("select", { className: "input", value: adminForm.patioId, onChange: (event) => setAdminForm({ ...adminForm, patioId: event.target.value }) }, dashboard?.patios.map((patio) => h("option", { key: patio.id, value: patio.id }, patio.nome)))) : null, h(Input, { label: "Nome", value: adminForm.nome, onChange: (event) => setAdminForm({ ...adminForm, nome: event.target.value }) }), admin !== "patio" ? h("div", { className: "operational-admin-grid" }, h(Input, { label: "Capacidade", type: "number", min: 1, value: adminForm.capacidade, onChange: (event) => setAdminForm({ ...adminForm, capacidade: Number(event.target.value) }) }), h(Input, { label: "Ordem", type: "number", value: adminForm.ordem, onChange: (event) => setAdminForm({ ...adminForm, ordem: Number(event.target.value) }) }), h(Input, { label: "Posição X (0 a 1)", type: "number", min: 0, max: 1, step: .01, value: adminForm.x, onChange: (event) => setAdminForm({ ...adminForm, x: Number(event.target.value) }) }), h(Input, { label: "Posição Y (0 a 1)", type: "number", min: 0, max: 1, step: .01, value: adminForm.y, onChange: (event) => setAdminForm({ ...adminForm, y: Number(event.target.value) }) }), h(Input, { label: "Cor", type: "color", value: adminForm.cor, onChange: (event) => setAdminForm({ ...adminForm, cor: event.target.value }) })) : h(Input, { label: "Ordem", type: "number", value: adminForm.ordem, onChange: (event) => setAdminForm({ ...adminForm, ordem: Number(event.target.value) }) }), h("div", { className: "modal__actions" }, admin === "area" ? h(Button, { variant: "ghost", onClick: () => { setAdmin("patio"); setAdminForm({ ...adminForm, nome: "" }); } }, "Novo pátio") : null, h(Button, { variant: "ghost", onClick: () => setAdmin(null) }, "Cancelar"), h(Button, { disabled: saving, onClick: () => void saveAdmin() }, "Salvar")))) : null
  );
}
