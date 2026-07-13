import { createElement as h, useEffect, useMemo, useRef, useState } from "react";
import { createYardMap, deleteYardMap, getYardFleetLocation, getYardHistory, getYardMap, listStaleYardLocations, listYardFleets, listYardLocations, listYardMaps, saveYardMap, updateYardFleetLocation, uploadYardMapReference } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input, { Textarea } from "../components/ui/Input";
import YardVectorMap from "../components/yard/YardVectorMap";
import YardMapEditor from "../components/yard/YardMapEditor";
import { isGestor } from "../utils/auth";
import { formatElapsed, getYardFreshness } from "../utils/yardFreshness";
import { centerPointInViewport, geometryPoints, getSectorForPoint, isPointInsideYard, projectPercentToViewport, zoomAtPoint } from "../../shared/yardGeometry";
import { createEmptyYardMapDocument } from "../../shared/yardMapConfig";

const BRANCH = "PAULINIA";

function normalizeSearch(value) {
    return value.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]/g, "");
}

function userName(location) {
    return location?.updatedBy?.fullName || location?.updatedBy?.name || "Usuário não identificado";
}

function dateTime(value) {
    return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Não registrada";
}

function accuracyLabel(value) {
    return value === "EXACT" ? "Exata" : "Aproximada";
}

function locationSector(location, document) {
    if (!location) return null;
    return location.sector || (document ? getSectorForPoint({ xPercent: location.xPercent, yPercent: location.yPercent }, document) : null);
}

export default function YardManagementPage() {
    const viewportRef = useRef(null);
    const mapRef = useRef(null);
    const dragRef = useRef(null);
    const pointersRef = useRef(new Map());
    const pinchRef = useRef(null);
    const [frotas, setFrotas] = useState([]);
    const [locations, setLocations] = useState([]);
    const [selectedFleet, setSelectedFleet] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [marking, setMarking] = useState(false);
    const [draft, setDraft] = useState(null);
    const [accuracy, setAccuracy] = useState("EXACT");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPages, setHistoryPages] = useState(1);
    const [historicalPin, setHistoricalPin] = useState(null);
    const [staleHours, setStaleHours] = useState(2);
    const [staleLocations, setStaleLocations] = useState([]);
    const [sectorFilter, setSectorFilter] = useState("ALL");
    const [legendOpen, setLegendOpen] = useState(true);
    const [locatedFleetId, setLocatedFleetId] = useState(null);
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
    const [branch, setBranch] = useState(BRANCH);
    const [maps, setMaps] = useState([]);
    const [activeMap, setActiveMap] = useState(null);
    const [mapDocument, setMapDocument] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [mapSaving, setMapSaving] = useState(false);

    async function loadMap() {
        setLoading(true);
        setError("");
        try {
            const [fleetResult, mapsResult] = await Promise.all([listYardFleets(), listYardMaps()]);
            setFrotas(fleetResult.fleets || []);
            const availableMaps = mapsResult.maps || [];
            setMaps(availableMaps);
            const summary = availableMaps.find((item) => item.branch === branch) || availableMaps[0];
            const selectedBranch = summary?.branch || branch;
            setBranch(selectedBranch);
            const [locationResult, mapResult] = await Promise.all([
                listYardLocations({ branch: selectedBranch, limit: 500 }),
                summary ? getYardMap(selectedBranch) : Promise.resolve({ map: null })
            ]);
            setLocations(locationResult.locations || []);
            setActiveMap(mapResult.map);
            setMapDocument(mapResult.map?.document || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao carregar o pátio.");
        } finally {
            setLoading(false);
        }
    }

    async function loadStale(hours = staleHours) {
        if (!isGestor()) return;
        try {
            const result = await listStaleYardLocations(hours, branch);
            setStaleLocations(result.locations || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao carregar localizações antigas.");
        }
    }

    useEffect(() => { void loadMap(); }, []);
    useEffect(() => { void loadStale(staleHours); }, [staleHours, branch]);
    useEffect(() => {
        const handleResize = () => resetMap();
        const timer = setTimeout(handleResize, 0);
        window.addEventListener("resize", handleResize);
        return () => { clearTimeout(timer); window.removeEventListener("resize", handleResize); };
    }, []);
    useEffect(() => {
        setMapSize({ width: 0, height: 0 });
        const timer = setTimeout(resetMap, 0);
        return () => clearTimeout(timer);
    }, [mapDocument]);

    const suggestions = useMemo(() => {
        const normalized = normalizeSearch(query);
        if (!normalized || selectedFleet?.numeroFrota === query) return [];
        return frotas.filter((fleet) => [fleet.numeroFrota, fleet.placa, fleet.tipoEquipamento].some((field) => normalizeSearch(field || "").includes(normalized))).slice(0, 8);
    }, [frotas, query, selectedFleet]);

    const sectorOptions = useMemo(() => {
        if (!mapDocument) return ["ALL"];
        const values = mapDocument.elements.filter((element) => element.type === "SECTOR" && element.properties.active).map((element) => element.properties.code || element.name).filter(Boolean);
        return ["ALL", ...Array.from(new Set(values))];
    }, [mapDocument]);

    async function selectBranch(nextBranch) {
        setLoading(true); setError("");
        try {
            const [mapResult, locationResult] = await Promise.all([getYardMap(nextBranch), listYardLocations({ branch: nextBranch, limit: 500 })]);
            setBranch(nextBranch); setActiveMap(mapResult.map); setMapDocument(mapResult.map.document); setLocations(locationResult.locations || []); setSectorFilter("ALL"); setSelectedFleet(null); setSelectedLocation(null);
            setTimeout(resetMap, 0);
        } catch (err) { setError(err instanceof Error ? err.message : "Falha ao carregar mapa."); }
        finally { setLoading(false); }
    }

    async function createMapForBranch() {
        const rawBranch = window.prompt("Código da filial (ex.: CUBATAO)", "");
        if (!rawBranch) return;
        const name = window.prompt("Nome do mapa", rawBranch);
        if (!name) return;
        try {
            const result = await createYardMap({ branch: rawBranch, name, document: createEmptyYardMapDocument() });
            setMaps((current) => [...current, result.map]); setActiveMap(result.map); setMapDocument(result.map.document); setBranch(result.map.branch); setLocations([]); setEditMode(true);
        } catch (err) { setError(err instanceof Error ? err.message : "Falha ao criar mapa."); }
    }

    async function persistMap(document) {
        if (!activeMap) return;
        setMapSaving(true);
        try {
            const result = await saveYardMap(activeMap.id, { name: activeMap.name, revision: activeMap.revision, document });
            setActiveMap(result.map); setMapDocument(result.map.document); setMaps((current) => current.map((item) => item.id === result.map.id ? { ...item, revision: result.map.revision, updatedAt: result.map.updatedAt } : item)); setSuccess("Mapa salvo com sucesso.");
        } catch (err) { setError(err instanceof Error ? err.message : "Falha ao salvar mapa."); }
        finally { setMapSaving(false); }
    }

    async function removeCurrentMap() {
        if (!activeMap) return;
        const confirmed = window.confirm(`Excluir definitivamente o mapa “${activeMap.name}”?\n\nAs localizações e o histórico das frotas serão preservados.`);
        if (!confirmed) return;
        setLoading(true); setError(""); setSuccess("");
        try {
            await deleteYardMap(activeMap.id);
            const remaining = maps.filter((item) => item.id !== activeMap.id);
            setMaps(remaining); setEditMode(false); setSelectedFleet(null); setSelectedLocation(null); setDraft(null); setSectorFilter("ALL");
            if (remaining.length) {
                await selectBranch(remaining[0].branch);
            } else {
                setActiveMap(null); setMapDocument(null); setLocations([]);
            }
            setSuccess("Mapa excluído. As localizações e o histórico foram preservados.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao excluir mapa.");
        } finally {
            setLoading(false);
        }
    }

    async function uploadReference(file) {
        if (!activeMap) return;
        try { const result = await uploadYardMapReference(activeMap.id, file); setActiveMap(result.map); setMapDocument(result.map.document); setSuccess("Imagem de referência importada."); return result.map.document; }
        catch (err) { setError(err instanceof Error ? err.message : "Falha ao importar imagem."); }
    }

    function focusCoordinate(xPercent, yPercent, scale = 1.8) {
        const viewport = viewportRef.current;
        const map = mapRef.current;
        if (!viewport || !map) return;
        setTransform(centerPointInViewport({
            viewportWidth: viewport.clientWidth,
            viewportHeight: viewport.clientHeight,
            contentWidth: map.clientWidth,
            contentHeight: map.clientHeight,
            point: { xPercent, yPercent },
            scale
        }));
    }

    function resetMap() {
        const viewport = viewportRef.current;
        const map = mapRef.current;
        if (!viewport || !map) return;
        setMapSize({ width: map.clientWidth, height: map.clientHeight });
        setTransform({
            scale: 1,
            x: Math.min(0, (viewport.clientWidth - map.clientWidth) / 2),
            y: Math.min(0, (viewport.clientHeight - map.clientHeight) / 2)
        });
    }

    function focusSector(value) {
        setSectorFilter(value);
        if (value === "ALL") {
            resetMap();
            return;
        }
        const sector = mapDocument?.elements.find((item) => item.type === "SECTOR" && (item.properties.code === value || item.name === value));
        if (sector) {
            const points = geometryPoints(sector);
            const x = points.reduce((sum, point) => sum + point[0], 0) / points.length;
            const y = points.reduce((sum, point) => sum + point[1], 0) / points.length;
            focusCoordinate(x / mapDocument.viewBox.width, y / mapDocument.viewBox.height, 2.2);
        }
    }

    async function selectFleet(fleet, locationOverride) {
        setSelectedFleet(fleet);
        setQuery(fleet.numeroFrota);
        setError("");
        setSuccess("");
        setHistoricalPin(null);
        const known = locationOverride || locations.find((item) => item.fleetId === fleet.id) || null;
        setSelectedLocation(known);
        if (known) {
            const sector = locationSector(known, mapDocument);
            if (sector) setSectorFilter(sector);
            setLocatedFleetId(fleet.id);
            focusCoordinate(known.xPercent, known.yPercent, 2.25);
            setTimeout(() => setLocatedFleetId((current) => current === fleet.id ? null : current), 1800);
        }
        try {
            const detail = await getYardFleetLocation(fleet.id, branch);
            setSelectedLocation(detail.location);
            if (detail.location) {
                const sector = locationSector(detail.location, mapDocument);
                if (sector) setSectorFilter(sector);
                setLocatedFleetId(fleet.id);
                focusCoordinate(detail.location.xPercent, detail.location.yPercent, 2.25);
                setTimeout(() => setLocatedFleetId((current) => current === fleet.id ? null : current), 1800);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao consultar a frota.");
        }
    }

    function searchFleet() {
        const normalized = normalizeSearch(query);
        const fleet = frotas.find((item) => normalizeSearch(item.numeroFrota) === normalized || normalizeSearch(item.placa) === normalized) || suggestions[0];
        if (!fleet) {
            setError("Frota não encontrada no cadastro.");
            return;
        }
        void selectFleet(fleet);
    }

    function startMarking(fleet = selectedFleet, locationOverride) {
        if (!fleet) return;
        if (!mapDocument) { setError("Crie ou selecione um mapa antes de registrar localizações."); return; }
        if (fleet.id !== selectedFleet?.id) void selectFleet(fleet, locationOverride);
        setDraft(null);
        setMarking(true);
        setAccuracy("EXACT");
        setNote("");
        setSuccess("");
    }

    function mapPointerDown(event) {
        if (event.button !== undefined && event.button !== 0) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
        if (pointersRef.current.size === 1) {
            dragRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, startX: transform.x, startY: transform.y, moved: false };
            return;
        }
        if (pointersRef.current.size === 2) {
            const [first, second] = Array.from(pointersRef.current.values());
            const viewportRect = viewportRef.current?.getBoundingClientRect();
            if (!viewportRect) return;
            pinchRef.current = {
                distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
                scale: transform.scale,
                contentX: ((first.clientX + second.clientX) / 2 - viewportRect.left - transform.x) / transform.scale,
                contentY: ((first.clientY + second.clientY) / 2 - viewportRect.top - transform.y) / transform.scale
            };
            if (dragRef.current) dragRef.current.moved = true;
        }
    }

    function mapPointerMove(event) {
        if (pointersRef.current.has(event.pointerId)) {
            pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
        }
        if (pointersRef.current.size === 2 && pinchRef.current) {
            const [first, second] = Array.from(pointersRef.current.values());
            const viewportRect = viewportRef.current?.getBoundingClientRect();
            if (!viewportRect) return;
            const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
            const scale = Math.max(1, Math.min(4, pinchRef.current.scale * distance / Math.max(1, pinchRef.current.distance)));
            const midpointX = (first.clientX + second.clientX) / 2 - viewportRect.left;
            const midpointY = (first.clientY + second.clientY) / 2 - viewportRect.top;
            setTransform({
                scale,
                x: midpointX - pinchRef.current.contentX * scale,
                y: midpointY - pinchRef.current.contentY * scale
            });
            return;
        }
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.clientX;
        const dy = event.clientY - drag.clientY;
        if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
        if (drag.moved) setTransform((current) => ({ ...current, x: drag.startX + dx, y: drag.startY + dy }));
    }

    function mapPointerUp(event) {
        const drag = dragRef.current;
        const wasPinching = Boolean(pinchRef.current) || pointersRef.current.size > 1;
        pointersRef.current.delete(event.pointerId);
        dragRef.current = null;
        if (wasPinching) {
            pinchRef.current = null;
            return;
        }
        if (!drag || drag.moved || !marking || !selectedFleet) return;
        const rect = mapRef.current?.getBoundingClientRect();
        if (!rect) return;
        const xPercent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const yPercent = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
        if (!mapDocument) return;
        if (!isPointInsideYard({ xPercent, yPercent }, mapDocument)) {
            setError("Selecione um ponto dentro dos limites desenhados no mapa.");
            return;
        }
        const sector = getSectorForPoint({ xPercent, yPercent }, mapDocument);
        setError("");
        setDraft({ xPercent, yPercent, sector: sector || undefined });
        setMarking(false);
    }

    function zoom(delta, clientX, clientY) {
        const viewportRect = viewportRef.current?.getBoundingClientRect();
        setTransform((current) => {
            const scale = Math.max(1, Math.min(4, current.scale + delta));
            if (!viewportRect || scale === current.scale) return { ...current, scale };
            const anchorX = clientX === undefined ? viewportRect.width / 2 : clientX - viewportRect.left;
            const anchorY = clientY === undefined ? viewportRect.height / 2 : clientY - viewportRect.top;
            return zoomAtPoint(current, scale, { x: anchorX, y: anchorY });
        });
    }

    async function saveLocation() {
        if (!selectedFleet || !draft) return;
        setSaving(true);
        setError("");
        try {
            const result = await updateYardFleetLocation(selectedFleet.id, { branch, ...draft, accuracy, note });
            setLocations((current) => [result.location, ...current.filter((item) => item.fleetId !== selectedFleet.id)]);
            setSelectedLocation(result.location);
            setSectorFilter(result.location.sector || draft.sector || "ALL");
            setDraft(null);
            setSuccess("Localização registrada com sucesso.");
            focusCoordinate(result.location.xPercent, result.location.yPercent);
            await loadStale(staleHours);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao salvar a localização.");
        } finally {
            setSaving(false);
        }
    }

    async function openHistory(page = 1) {
        if (!selectedFleet) return;
        setHistoryOpen(true);
        try {
            const result = await getYardHistory(selectedFleet.id, { branch, page, limit: 10 });
            setHistory(result.history || []);
            setHistoryPage(result.pagination?.page || 1);
            setHistoryPages(result.pagination?.pages || 1);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao carregar o histórico.");
        }
    }

    function showHistorical(item) {
        setHistoricalPin(item);
        setHistoryOpen(false);
        const sector = locationSector(item, mapDocument);
        if (sector) setSectorFilter(sector);
        focusCoordinate(item.xPercent, item.yPercent);
    }

    const pinsWithHistory = historicalPin ? [...locations, { ...historicalPin, id: `history-${historicalPin.id}`, fleet: selectedFleet, historical: true }] : locations;
    const activePins = pinsWithHistory.filter((location) => sectorFilter === "ALL" || locationSector(location, mapDocument) === sectorFilter);
    const freshness = getYardFreshness(selectedLocation?.updatedAt);

    if (editMode && activeMap && mapDocument) {
        return h(YardMapEditor, { mapName: activeMap.name, initialDocument: mapDocument, saving: mapSaving, onSave: persistMap, onUploadBackground: uploadReference, onClose: () => setEditMode(false) });
    }

    return h(AppLayout, { className: "yard-page" },
        h("div", { className: "page-frame yard-page__frame" },
            h(AppHeader, { title: "Gestão de Pátio", subtitle: "Mapa da última localização registrada", showBack: true }),
            h(Card, { className: "yard-toolbar" },
                h("label", { className: "input-field yard-toolbar__map-select" },
                    h("span", { className: "input-field__label" }, "Filial / mapa"),
                    h("select", { className: "input", value: activeMap?.branch || "", disabled: !maps.length, onChange: (event) => void selectBranch(event.target.value) },
                        maps.length ? maps.map((item) => h("option", { key: item.id, value: item.branch }, item.name)) : h("option", { value: "" }, "Nenhum mapa")
                    )
                ),
                h("div", { className: "yard-search" },
                    h(Input, { label: "Pesquisar frota", value: query, onChange: (event) => { setQuery(event.target.value); setSelectedFleet(null); }, onKeyDown: (event) => { if (event.key === "Enter") searchFleet(); }, placeholder: "Número da frota ou placa", autoComplete: "off" }),
                    suggestions.length ? h("div", { className: "yard-suggestions", role: "listbox" }, suggestions.map((fleet) => h("button", { type: "button", key: fleet.id, onClick: () => void selectFleet(fleet) }, h("strong", null, `Frota ${fleet.numeroFrota}`), h("span", null, `${fleet.placa} · ${fleet.tipoEquipamento}`)))) : null,
                    h(Button, { onClick: searchFleet }, "Pesquisar")
                ),
                h("label", { className: "input-field yard-sector-filter" },
                    h("span", { className: "input-field__label" }, "Setor"),
                    h("select", { className: "input", value: sectorFilter, onChange: (event) => focusSector(event.target.value) },
                        sectorOptions.map((sector) => h("option", { key: sector, value: sector }, sector === "ALL" ? "Todos" : sector))
                    )
                ),
                isGestor() ? h("div", { className: "yard-map-admin-actions" },
                    h(Button, { variant: "secondary", onClick: () => void createMapForBranch() }, "Novo mapa"),
                    h(Button, { disabled: !activeMap, onClick: () => setEditMode(true) }, "Editar mapa"),
                    h(Button, { variant: "ghost", disabled: !activeMap, onClick: () => void removeCurrentMap() }, "Excluir mapa")
                ) : null
            ),
            error ? h("p", { className: "notice notice--error", role: "alert" }, error) : null,
            success ? h("p", { className: "notice notice--success", role: "status" }, success) : null,
            historicalPin ? h("div", { className: "yard-history-banner" }, h("strong", null, "Registro histórico no mapa"), h("span", null, `${dateTime(historicalPin.createdAt)} — este ponto não representa a localização atual.`), h(Button, { variant: "ghost", onClick: () => setHistoricalPin(null) }, "Fechar")) : null,
            h("div", { className: "yard-layout" },
                h("section", { className: `yard-map-card${marking ? " yard-map-card--marking" : ""}${transform.scale >= 1.5 ? " yard-map-card--zoomed" : ""}` },
                    h("div", { className: "yard-map-head" },
                        h("div", null, h("p", { className: "card-label" }, activeMap?.branch || "SEM MAPA"), h("h2", { className: "section-title" }, activeMap?.name || "Cadastre o mapa desta filial")),
                        h("div", { className: "yard-zoom" }, h("button", { type: "button", onClick: () => zoom(-0.35), "aria-label": "Diminuir zoom" }, "−"), h("button", { type: "button", onClick: resetMap }, "Centralizar"), h("button", { type: "button", onClick: () => zoom(0.35), "aria-label": "Aumentar zoom" }, "+"))
                    ),
                    marking ? h("p", { className: "yard-marking-instruction" }, "Toque no ponto aproximado onde a frota foi deixada. Arraste para navegar.") : null,
                    h("div", { ref: viewportRef, className: "yard-map-viewport", onPointerDown: mapPointerDown, onPointerMove: mapPointerMove, onPointerUp: mapPointerUp, onPointerCancel: (event) => { pointersRef.current.delete(event.pointerId); dragRef.current = null; pinchRef.current = null; }, onWheel: (event) => { event.preventDefault(); zoom(event.deltaY < 0 ? .25 : -.25, event.clientX, event.clientY); } },
                        h("div", { className: "yard-map-transform", style: { transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` } },
                            mapDocument ? h(YardVectorMap, { document: mapDocument, svgRef: mapRef, activeSector: sectorFilter === "ALL" ? null : sectorFilter }) : h("div", { className: "yard-map-empty" }, isGestor() ? "Use ‘Novo mapa’ para começar o desenho do pátio." : "Nenhum mapa configurado para esta filial.")
                        ),
                        mapDocument && mapSize.width > 0 ? h("div", { className: "yard-pin-layer" },
                            activePins.map((location) => {
                                const itemFreshness = getYardFreshness(location.updatedAt || location.createdAt);
                                const selected = location.fleetId === selectedFleet?.id && !location.historical;
                                const located = location.fleetId === locatedFleetId && !location.historical;
                                const projected = projectPercentToViewport(location, transform, mapSize);
                                return h("button", { type: "button", key: location.id, className: `yard-pin yard-pin--${location.historical ? "history" : itemFreshness.color}${selected ? " yard-pin--selected" : ""}${located ? " yard-pin--located" : ""}`, style: { left: `${projected.x}px`, top: `${projected.y}px` }, title: `Frota ${location.fleet?.numeroFrota || ""} · Setor ${locationSector(location, mapDocument) || "não definido"} · ${formatElapsed(location.updatedAt || location.createdAt)}`, onPointerDown: (event) => event.stopPropagation(), onClick: () => location.fleet && void selectFleet(location.fleet, location) }, h("span", { className: "yard-pin__dot" }), h("span", { className: "yard-pin__label" }, location.fleet?.numeroFrota || "Frota"));
                            }),
                            draft ? (() => { const projected = projectPercentToViewport(draft, transform, mapSize); return h("span", { className: "yard-pin yard-pin--draft", style: { left: `${projected.x}px`, top: `${projected.y}px` } }, h("span", { className: "yard-pin__dot" }), h("span", { className: "yard-pin__label" }, selectedFleet?.numeroFrota)); })() : null
                        ) : null
                    ),
                    h("div", { className: `yard-legend${legendOpen ? " yard-legend--open" : ""}` },
                        h("button", { type: "button", className: "yard-legend__toggle", onClick: () => setLegendOpen((current) => !current), "aria-expanded": legendOpen }, legendOpen ? "Ocultar legenda" : "Mostrar legenda"),
                        legendOpen ? h("div", { className: "yard-legend__content" },
                            h("span", null, h("i", { className: "yard-legend__boundary" }), "Limite da filial"),
                            [["green", "Localização recente"], ["yellow", "Localização antiga"], ["red", "Localização muito antiga"], ["gray", "Sem localização"]]
                                .map(([color, label]) => h("span", { key: color }, h("i", { className: `yard-legend__dot yard-legend__dot--${color}` }), label)),
                            h("small", null, "A cor indica somente a idade do último registro; não garante que a frota permaneça no local.")
                        ) : null
                    )
                ),
                h("aside", { className: `yard-details${selectedFleet ? " yard-details--open" : ""}` },
                    !selectedFleet ? h(Card, null, h("p", { className: "card-label" }, "DETALHES"), h("h2", { className: "section-title" }, "Selecione uma frota"), h("p", { className: "helper" }, "Pesquise ou toque em um pin para consultar e atualizar sua localização.")) :
                    h(Card, { className: "yard-detail-card" },
                        h("div", { className: "yard-detail-card__head" }, h("div", null, h("p", { className: "card-label" }, "FROTA"), h("h2", { className: "section-title" }, selectedFleet.numeroFrota)), h("div", { className: "yard-detail-card__badges" }, h("span", { className: `yard-freshness yard-freshness--${freshness.color}` }, freshness.label), h("button", { type: "button", className: "yard-detail-close", onClick: () => { setSelectedFleet(null); setSelectedLocation(null); } }, "×"))),
                        h("dl", { className: "yard-detail-list" },
                            h("div", null, h("dt", null, "Placa"), h("dd", null, selectedFleet.placa || "Não informada")),
                            h("div", null, h("dt", null, "Equipamento"), h("dd", null, selectedFleet.tipoEquipamento || "Não informado")),
                            h("div", null, h("dt", null, "Filial"), h("dd", null, activeMap?.name || branch)),
                            selectedLocation ? h("div", null, h("dt", null, "Setor"), h("dd", null, locationSector(selectedLocation, mapDocument) || "Sem setor definido")) : null,
                            selectedLocation ? h("div", null, h("dt", null, "Última localização registrada"), h("dd", null, `${dateTime(selectedLocation.updatedAt)} (${formatElapsed(selectedLocation.updatedAt)})`)) : null,
                            selectedLocation ? h("div", null, h("dt", null, "Precisão"), h("dd", null, accuracyLabel(selectedLocation.accuracy))) : null,
                            selectedLocation ? h("div", null, h("dt", null, "Atualizado por"), h("dd", null, userName(selectedLocation))) : null,
                            selectedLocation ? h("div", null, h("dt", null, "Observação"), h("dd", null, selectedLocation.note || "Sem observação")) : null
                        ),
                        !selectedLocation ? h("p", { className: "yard-empty" }, "Esta frota ainda não possui localização registrada no pátio.") : null,
                        h("div", { className: "yard-detail-actions" }, h(Button, { onClick: () => startMarking() }, selectedLocation ? "Atualizar localização" : "Registrar localização"), selectedLocation ? h(Button, { variant: "secondary", onClick: () => void openHistory(1) }, "Visualizar histórico") : null)
                    )
                )
            ),
            isGestor() ? h(Card, { className: "yard-stale" },
                h("div", { className: "yard-stale__head" }, h("div", null, h("p", { className: "card-label" }, "APOIO OPERACIONAL"), h("h2", { className: "section-title" }, "Localizações que precisam de confirmação")), h("label", null, h("span", null, "Mais de"), h("select", { className: "input", value: staleHours, onChange: (event) => setStaleHours(Number(event.target.value)) }, [2, 6, 12, 24].map((hours) => h("option", { key: hours, value: hours }, `${hours} horas`))))),
                staleLocations.length ? h("div", { className: "yard-stale-list" },
                    staleLocations.map((location) => h("article", { key: location.id },
                        h("div", null,
                            h("strong", null, `Frota ${location.fleet.numeroFrota}`),
                            h("span", null, `${formatElapsed(location.updatedAt)} · Setor ${locationSector(location, mapDocument) || "não definido"} · ${userName(location)}`),
                            h("small", null, location.note || "Sem observação")
                        ),
                        h("div", null,
                            h(Button, { variant: "ghost", onClick: () => void selectFleet(location.fleet, location) }, "Localizar"),
                            h(Button, { variant: "secondary", onClick: () => startMarking(location.fleet, location) }, "Atualizar")
                        )
                    ))
                ) : h("p", { className: "helper" }, "Nenhuma localização nesse intervalo.")
            ) : null
        ),
        draft ? h("div", { className: "modal-overlay", role: "presentation", onClick: () => setDraft(null) }, h("div", { className: "modal yard-confirm-modal", role: "dialog", "aria-modal": "true", onClick: (event) => event.stopPropagation() },
            h("h2", { className: "modal__title" }, "Confirmar localização"),
            h("p", { className: "yard-warning" }, "Registre o ponto aproximado onde a frota foi deixada. Esta informação representa a última localização conhecida, não uma localização em tempo real."),
            h("div", { className: "yard-readonly-grid" }, h("p", null, h("span", null, "Frota"), h("strong", null, selectedFleet?.numeroFrota)), h("p", null, h("span", null, "Filial"), h("strong", null, activeMap?.name || branch)), h("p", null, h("span", null, "Setor"), h("strong", null, draft.sector || "Sem setor"))),
            h("label", { className: "input-field" }, h("span", { className: "input-field__label" }, "Precisão"), h("select", { className: "input", value: accuracy, onChange: (event) => setAccuracy(event.target.value) }, h("option", { value: "EXACT" }, "Exata"), h("option", { value: "APPROXIMATE" }, "Aproximada"))),
            h(Textarea, { label: "Observação (opcional)", maxLength: 500, value: note, onChange: (event) => setNote(event.target.value), placeholder: "Ex.: próximo ao prédio administrativo" }),
            h("div", { className: "modal__actions" }, h(Button, { variant: "ghost", disabled: saving, onClick: () => setDraft(null) }, "Cancelar"), h(Button, { disabled: saving, onClick: () => void saveLocation() }, saving ? "Salvando..." : "Salvar localização"))
        )) : null,
        historyOpen ? h("div", { className: "modal-overlay", role: "presentation", onClick: () => setHistoryOpen(false) }, h("div", { className: "modal yard-history-modal", role: "dialog", "aria-modal": "true", onClick: (event) => event.stopPropagation() },
            h("div", { className: "yard-history-modal__head" }, h("div", null, h("p", { className: "card-label" }, `FROTA ${selectedFleet?.numeroFrota}`), h("h2", { className: "modal__title" }, "Histórico de localizações")), h(Button, { variant: "ghost", onClick: () => setHistoryOpen(false) }, "Fechar")),
            history.length ? h("div", { className: "yard-history-list" },
                history.map((item) => h("article", { key: item.id },
                    h("div", null,
                        h("strong", null, dateTime(item.createdAt)),
                        h("span", null, `${userName(item)} · ${accuracyLabel(item.accuracy)} · Setor ${locationSector(item, mapDocument) || "não definido"} · ${activeMap?.name || branch}`),
                        h("small", null, item.note || "Sem observação")
                    ),
                    h(Button, { variant: "secondary", onClick: () => showHistorical(item) }, "Ver no mapa")
                ))
            ) : h("p", { className: "helper" }, "Nenhum registro encontrado."),
            h("div", { className: "yard-pagination" }, h(Button, { variant: "ghost", disabled: historyPage <= 1, onClick: () => void openHistory(historyPage - 1) }, "Anterior"), h("span", null, `Página ${historyPage} de ${Math.max(1, historyPages)}`), h(Button, { variant: "ghost", disabled: historyPage >= historyPages, onClick: () => void openHistory(historyPage + 1) }, "Próxima"))
        )) : null,
        loading ? h("div", { className: "yard-loading", role: "status" }, "Carregando mapa do pátio...") : null
    );
}
