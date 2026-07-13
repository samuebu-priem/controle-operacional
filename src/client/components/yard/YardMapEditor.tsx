import { useRef, useState } from "react";
import { snapPoint, validateYardMapDocument, zoomAtPoint } from "../../../shared/yardGeometry";
import { layerForElementType, type MapPoint, type YardElementType, type YardMapDocument, type YardMapElement } from "../../../shared/yardMapConfig";
import YardVectorMap from "./YardVectorMap";

type Props = {
  mapName: string;
  initialDocument: YardMapDocument;
  saving?: boolean;
  onSave: (document: YardMapDocument) => void;
  onUploadBackground: (file: File) => Promise<YardMapDocument | void>;
  onClose: () => void;
};

const tools: Array<{ type: YardElementType | "SELECT" | "MOVE" | "PAN"; label: string; icon: string }> = [
  { type: "SELECT", label: "Editar", icon: "↖" }, { type: "MOVE", label: "Mover", icon: "✥" }, { type: "PAN", label: "Navegar", icon: "✋" },
  { type: "POLYGON", label: "Polígono", icon: "⬢" }, { type: "RECTANGLE", label: "Retângulo", icon: "▰" }, { type: "AREA", label: "Área", icon: "▱" },
  { type: "PIN", label: "Pin", icon: "📍" }, { type: "ROAD", label: "Rua", icon: "━" }, { type: "BUILDING", label: "Prédio", icon: "▣" },
  { type: "BOX", label: "Box", icon: "▥" }, { type: "GATE", label: "Portaria", icon: "🚪" }, { type: "PARKING", label: "Vaga", icon: "P" },
  { type: "TEXT", label: "Texto", icon: "T" }, { type: "MEASURE", label: "Medida", icon: "📏" }, { type: "SECTOR", label: "Setor", icon: "S" },
  { type: "BOUNDARY", label: "Limite", icon: "⬡" }, { type: "WASH", label: "Lavagem", icon: "W" }, { type: "INSPECTION", label: "Inspeção", icon: "I" },
  { type: "MAINTENANCE", label: "Manutenção", icon: "M" }, { type: "SHED", label: "Galpão", icon: "G" }, { type: "CORRIDOR", label: "Corredor", icon: "═" }
];

function id() { return globalThis.crypto?.randomUUID?.() ?? `map-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

function styleFor(type: YardElementType) {
  const colors: Partial<Record<YardElementType, [string, string]>> = {
    BOUNDARY: ["rgba(57,255,136,.10)", "#39ff88"], SECTOR: ["rgba(14,116,144,.28)", "#38bdf8"], ROAD: ["none", "#475569"], CORRIDOR: ["none", "#334155"],
    BUILDING: ["#526577", "#94a3b8"], BOX: ["rgba(56,189,248,.15)", "#7dd3fc"], PARKING: ["rgba(255,255,255,.03)", "#cbd5e1"], TEXT: ["#e5f7ff", "#e5f7ff"]
  };
  const [fill, stroke] = colors[type] ?? ["rgba(56,189,248,.15)", "#38bdf8"];
  return { fill, stroke, strokeWidth: type === "BOUNDARY" ? 5 : 3, opacity: 1 };
}

function defaultProperties(type: YardElementType) {
  return { name: tools.find((tool) => tool.type === type)?.label ?? type, description: "", sector: "", code: "", status: "DISPONIVEL", notes: "", icon: "", visible: true, active: true, blocksLocation: ["BUILDING", "SHED", "WASH", "MAINTENANCE"].includes(type) };
}

function createElement(type: YardElementType, points: MapPoint[]): YardMapElement {
  const isLine = type === "ROAD" || type === "CORRIDOR" || type === "MEASURE";
  const isPoint = type === "PIN" || type === "TEXT";
  const isRect = ["RECTANGLE", "BUILDING", "BOX", "GATE", "PARKING", "WASH", "INSPECTION", "MAINTENANCE", "SHED"].includes(type);
  let geometry: YardMapElement["geometry"];
  if (isPoint) geometry = { kind: "point", x: points[0][0], y: points[0][1] };
  else if (isRect) {
    const start = points[0], end = points[1];
    geometry = { kind: "rect", x: Math.min(start[0], end[0]), y: Math.min(start[1], end[1]), width: Math.max(10, Math.abs(end[0] - start[0])), height: Math.max(10, Math.abs(end[1] - start[1])) };
  } else if (isLine) geometry = { kind: "polyline", points, width: type === "ROAD" ? 45 : type === "CORRIDOR" ? 28 : 3 };
  else geometry = { kind: "polygon", points };
  return { id: id(), type, layerId: layerForElementType(type), geometry, style: styleFor(type), properties: defaultProperties(type) };
}

function translateElement(element: YardMapElement, dx: number, dy: number) {
  const next = clone(element); const geometry = next.geometry;
  if (geometry.kind === "point" || geometry.kind === "rect") { geometry.x += dx; geometry.y += dy; }
  else geometry.points = geometry.points.map(([x, y]) => [x + dx, y + dy]);
  return next;
}

function scaleElement(element: YardMapElement, factor: number) {
  const next = clone(element); const geometry = next.geometry;
  if (geometry.kind === "rect") { geometry.width = Math.max(10, geometry.width * factor); geometry.height = Math.max(10, geometry.height * factor); return next; }
  if (geometry.kind === "point") return next;
  const cx = geometry.points.reduce((sum, point) => sum + point[0], 0) / geometry.points.length;
  const cy = geometry.points.reduce((sum, point) => sum + point[1], 0) / geometry.points.length;
  geometry.points = geometry.points.map(([x, y]) => [cx + (x - cx) * factor, cy + (y - cy) * factor]);
  if (geometry.kind === "polyline") geometry.width = Math.max(2, geometry.width * factor);
  return next;
}

export default function YardMapEditor({ mapName, initialDocument, saving = false, onSave, onUploadBackground, onClose }: Props) {
  const svgRef = useRef<any>(null);
  const viewportRef = useRef<any>(null);
  const dragRef = useRef<any>(null);
  const [document, setDocument] = useState<YardMapDocument>(clone(initialDocument));
  const [past, setPast] = useState<YardMapDocument[]>([]);
  const [future, setFuture] = useState<YardMapDocument[]>([]);
  const [tool, setTool] = useState<YardElementType | "SELECT" | "MOVE" | "PAN">("SELECT");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftPoints, setDraftPoints] = useState<MapPoint[]>([]);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const selected = document.elements.find((element) => element.id === selectedId) ?? null;
  function isLocked(element: YardMapElement) { return Boolean(document.layers.find((layer) => layer.id === element.layerId)?.locked); }

  function commit(next: YardMapDocument) { setPast((value) => [...value.slice(-49), document]); setDocument(next); setFuture([]); }
  function replaceElement(element: YardMapElement) { if (isLocked(element)) return; commit({ ...document, elements: document.elements.map((item) => item.id === element.id ? element : item) }); }
  function pointFromEvent(event: any): MapPoint {
    const rect = svgRef.current.getBoundingClientRect();
    const raw: MapPoint = [(event.clientX - rect.left) / rect.width * document.viewBox.width, (event.clientY - rect.top) / rect.height * document.viewBox.height];
    return snapPoint(raw, document.settings.gridSize, document.settings.snapEnabled);
  }
  function finishDrawing(pointsValue = draftPoints) {
    if (tool === "SELECT" || tool === "MOVE" || tool === "PAN") return;
    const minimum = ["PIN", "TEXT"].includes(tool) ? 1 : ["POLYGON", "AREA", "SECTOR", "BOUNDARY"].includes(tool) ? 3 : 2;
    if (pointsValue.length < minimum) return;
    const element = createElement(tool, pointsValue);
    commit({ ...document, elements: [...document.elements, element] }); setSelectedId(element.id); setDraftPoints([]); setTool("SELECT");
  }
  function canvasDown(event: any) {
    if (event.button !== 0) return;
    if (tool === "PAN") { dragRef.current = { kind: "pan", x: event.clientX, y: event.clientY, transform }; return; }
    if (["SELECT", "MOVE"].includes(tool)) { setSelectedId(null); return; }
    const point = pointFromEvent(event);
    if (["PIN", "TEXT"].includes(tool)) { finishDrawing([point]); return; }
    const next = [...draftPoints, point]; setDraftPoints(next);
    if (["RECTANGLE", "BUILDING", "BOX", "GATE", "PARKING", "WASH", "INSPECTION", "MAINTENANCE", "SHED"].includes(tool) && next.length === 2) finishDrawing(next);
  }
  function elementDown(element: YardMapElement, event: any) {
    if (tool === "PAN") { dragRef.current = { kind: "pan", x: event.clientX, y: event.clientY, transform }; return; }
    if (isLocked(element)) return;
    setSelectedId(element.id);
    if (tool === "MOVE") dragRef.current = { kind: "element", x: event.clientX, y: event.clientY, element: clone(element), before: clone(document) };
  }
  function pointerMove(event: any) {
    const drag = dragRef.current; if (!drag) return;
    if (drag.kind === "pan") { setTransform({ ...drag.transform, x: drag.transform.x + event.clientX - drag.x, y: drag.transform.y + event.clientY - drag.y }); return; }
    const rect = svgRef.current.getBoundingClientRect();
    const dx = (event.clientX - drag.x) / rect.width * document.viewBox.width;
    const dy = (event.clientY - drag.y) / rect.height * document.viewBox.height;
    const moved = translateElement(drag.element, dx, dy);
    setDocument((current) => ({ ...current, elements: current.elements.map((item) => item.id === moved.id ? moved : item) }));
  }
  function pointerUp() { const drag = dragRef.current; if (drag?.kind === "element") { setPast((value) => [...value.slice(-49), drag.before]); setFuture([]); } dragRef.current = null; }
  function updateProperty(key: string, value: any) { if (!selected) return; replaceElement({ ...selected, properties: { ...selected.properties, [key]: value } }); }
  function removeSelected() { if (!selected || isLocked(selected)) return; commit({ ...document, elements: document.elements.filter((item) => item.id !== selected.id) }); setSelectedId(null); }
  function duplicateSelected() { if (!selected || isLocked(selected)) return; const copy = translateElement({ ...clone(selected), id: id(), properties: { ...selected.properties, name: `${selected.properties.name} cópia` } }, 30, 30); commit({ ...document, elements: [...document.elements, copy] }); setSelectedId(copy.id); }
  function undo() { if (!past.length) return; const previous = past[past.length - 1]; setFuture((value) => [document, ...value]); setDocument(previous); setPast((value) => value.slice(0, -1)); }
  function redo() { if (!future.length) return; const next = future[0]; setPast((value) => [...value, document]); setDocument(next); setFuture((value) => value.slice(1)); }
  function exportJson() { const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = window.document.createElement("a"); anchor.href = url; anchor.download = `${mapName.toLowerCase().replace(/\W+/g, "-")}.json`; anchor.click(); URL.revokeObjectURL(url); }
  function importJson(file?: File) { if (!file) return; const reader = new FileReader(); reader.onload = () => { try { commit(validateYardMapDocument(JSON.parse(String(reader.result)))); } catch (error) { window.alert(error instanceof Error ? error.message : "JSON inválido"); } }; reader.readAsText(file); }
  function toggleLayer(idValue: string, key: "visible" | "locked") { commit({ ...document, layers: document.layers.map((layer) => layer.id === idValue ? { ...layer, [key]: !layer[key] } : layer) }); }
  async function uploadBackground(file?: File) {
    if (!file) return;
    const uploaded = await onUploadBackground(file);
    if (uploaded) commit(clone(uploaded));
  }

  return <div className="yard-editor">
    <header className="yard-editor__topbar"><div><strong>Editor de Mapas</strong><span>{mapName}</span></div><div className="yard-editor__actions"><button onClick={undo} disabled={!past.length}>Desfazer</button><button onClick={redo} disabled={!future.length}>Refazer</button><button onClick={exportJson}>Exportar JSON</button><label>Importar JSON<input type="file" accept="application/json" onChange={(event: any) => importJson(event.target.files?.[0])} /></label><button className="primary" onClick={() => onSave(document)} disabled={saving}>{saving ? "Salvando..." : "Salvar mapa"}</button><button onClick={onClose}>Fechar</button></div></header>
    <aside className="yard-editor__tools"><h3>Ferramentas</h3>{tools.map((item) => <button key={item.type} className={tool === item.type ? "active" : ""} onClick={() => { setTool(item.type); setDraftPoints([]); }}><i>{item.icon}</i><span>{item.label}</span></button>)}<div className="yard-editor__tool-actions"><button onClick={duplicateSelected} disabled={!selected}>Duplicar</button><button onClick={removeSelected} disabled={!selected}>Excluir</button><button onClick={() => selected && replaceElement(scaleElement(selected, .9))} disabled={!selected}>Reduzir</button><button onClick={() => selected && replaceElement(scaleElement(selected, 1.1))} disabled={!selected}>Ampliar</button></div></aside>
    <main className={`yard-editor__canvas yard-editor__canvas--${tool.toLowerCase()}`} ref={viewportRef} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerLeave={pointerUp} onWheel={(event: any) => { event.preventDefault(); const rect = viewportRef.current.getBoundingClientRect(); setTransform((current) => zoomAtPoint(current, current.scale + (event.deltaY < 0 ? .2 : -.2), { x: event.clientX - rect.left, y: event.clientY - rect.top })); }}>
      <div className="yard-editor__transform" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }} onPointerDown={canvasDown} onDoubleClick={() => finishDrawing()}>
        <YardVectorMap document={document} svgRef={svgRef} editor selectedId={selectedId} draftPoints={draftPoints} onElementSelect={elementDown} />
      </div>
      {draftPoints.length ? <div className="yard-editor__hint">Duplo clique para finalizar · {draftPoints.length} ponto(s)</div> : null}
      <div className="yard-editor__zoom"><button onClick={() => setTransform((current) => ({ ...current, scale: Math.max(.5, current.scale - .2) }))}>−</button><span>{Math.round(transform.scale * 100)}%</span><button onClick={() => setTransform((current) => ({ ...current, scale: Math.min(8, current.scale + .2) }))}>+</button><button onClick={() => setTransform({ scale: 1, x: 0, y: 0 })}>Reset</button></div>
    </main>
    <aside className="yard-editor__properties">
      <section><h3>Mapa</h3><label><input type="checkbox" checked={document.settings.gridVisible} onChange={() => commit({ ...document, settings: { ...document.settings, gridVisible: !document.settings.gridVisible } })} /> Grid</label><label><input type="checkbox" checked={document.settings.snapEnabled} onChange={() => commit({ ...document, settings: { ...document.settings, snapEnabled: !document.settings.snapEnabled } })} /> Snap</label><label><input type="checkbox" checked={document.settings.guidesVisible} onChange={() => commit({ ...document, settings: { ...document.settings, guidesVisible: !document.settings.guidesVisible } })} /> Guias</label><label>Grid <input type="number" min="5" max="200" value={document.settings.gridSize} onChange={(event: any) => commit({ ...document, settings: { ...document.settings, gridSize: Number(event.target.value) || 25 } })} /></label></section>
      <section><h3>Imagem de referência</h3><label className="yard-editor__upload">Importar imagem<input type="file" accept="image/*" onChange={(event: any) => void uploadBackground(event.target.files?.[0])} /></label><label>Opacidade <input type="range" min="0" max="1" step=".05" value={document.settings.background.opacity} onChange={(event: any) => commit({ ...document, settings: { ...document.settings, background: { ...document.settings.background, opacity: Number(event.target.value) } } })} /></label><label><input type="checkbox" checked={document.settings.background.visible} onChange={() => commit({ ...document, settings: { ...document.settings, background: { ...document.settings.background, visible: !document.settings.background.visible } } })} /> Mostrar</label><label><input type="checkbox" checked={document.settings.background.locked} onChange={() => commit({ ...document, settings: { ...document.settings, background: { ...document.settings.background, locked: !document.settings.background.locked } } })} /> Bloquear</label></section>
      <section><h3>Camadas</h3>{[...document.layers].sort((a,b) => b.order-a.order).map((layer) => <div className="yard-editor-layer" key={layer.id}><span>{layer.name}</span><button onClick={() => toggleLayer(layer.id, "visible")}>{layer.visible ? "👁" : "—"}</button><button onClick={() => toggleLayer(layer.id, "locked")}>{layer.locked ? "🔒" : "🔓"}</button></div>)}</section>
      {selected ? <section className="yard-editor__selected"><h3>Propriedades</h3><label>Nome<input value={selected.properties.name} onChange={(event: any) => updateProperty("name", event.target.value)} /></label><label>Tipo<select value={selected.type} onChange={(event: any) => { const type = event.target.value as YardElementType; replaceElement({ ...selected, type, layerId: layerForElementType(type) }); }}>{tools.filter((item) => !["SELECT", "MOVE", "PAN"].includes(item.type)).map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select></label><label>Cor<input type="color" value={selected.style.fill.startsWith("#") ? selected.style.fill : "#38bdf8"} onChange={(event: any) => replaceElement({ ...selected, style: { ...selected.style, fill: event.target.value } })} /></label><label>Descrição<textarea value={selected.properties.description} onChange={(event: any) => updateProperty("description", event.target.value)} /></label><label>Setor<input value={selected.properties.sector} onChange={(event: any) => updateProperty("sector", event.target.value)} /></label><label>Código/letra<input value={selected.properties.code} onChange={(event: any) => updateProperty("code", event.target.value)} /></label><label>Status<input value={selected.properties.status} onChange={(event: any) => updateProperty("status", event.target.value)} /></label><label>Ícone<input value={selected.properties.icon} onChange={(event: any) => updateProperty("icon", event.target.value)} /></label><label>Observações<textarea value={selected.properties.notes} onChange={(event: any) => updateProperty("notes", event.target.value)} /></label><label><input type="checkbox" checked={selected.properties.visible} onChange={() => updateProperty("visible", !selected.properties.visible)} /> Visível</label><label><input type="checkbox" checked={selected.properties.active} onChange={() => updateProperty("active", !selected.properties.active)} /> Ativo</label><label><input type="checkbox" checked={selected.properties.blocksLocation} onChange={() => updateProperty("blocksLocation", !selected.properties.blocksLocation)} /> Bloquear localização</label></section> : <p className="helper">Selecione um objeto para editar.</p>}
    </aside>
  </div>;
}
