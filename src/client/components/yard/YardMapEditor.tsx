import { useRef, useState } from "react";
import {
  canElementBeChildOf, elementBounds, elementContainsPoint, findContainingContainer, geometryPoints,
  isElementInsideParent, snapPoint, validateAllElementPlacements, validateElementPlacement,
  validateYardMapDocument, wouldCreateHierarchyCycle, zoomAtPoint
} from "../../../shared/yardGeometry";
import {
  CONTAINER_TYPES, ELEMENT_TYPE_LABELS, SLOT_TYPES, categoryForElementType, defaultElementProperties,
  layerForElementType, type MapPoint, type YardElementType, type YardMapDocument, type YardMapElement
} from "../../../shared/yardMapConfig";
import YardVectorMap from "./YardVectorMap";

type Props = { mapName: string; initialDocument: YardMapDocument; saving?: boolean; onSave: (document: YardMapDocument) => void; onUploadBackground: (file: File) => Promise<YardMapDocument | void>; onClose: () => void };
type EditorTool = YardElementType | "SELECT" | "MOVE" | "RESIZE" | "ROTATE" | "EDIT_POINTS" | "PAN";
type SlotConfig = { rows: number; columns: number; width: number; height: number; gapX: number; gapY: number; rotation: number; prefix: string; start: number; type: YardElementType };

const toolGroups: Array<{ name: string; tools: Array<{ type: EditorTool; label: string; icon: string }> }> = [
  { name: "Edição", tools: [{ type: "SELECT", label: "Selecionar", icon: "↖" }, { type: "MOVE", label: "Mover", icon: "✥" }, { type: "RESIZE", label: "Redimensionar", icon: "⤢" }, { type: "ROTATE", label: "Rotacionar", icon: "↻" }, { type: "EDIT_POINTS", label: "Editar pontos", icon: "◆" }, { type: "PAN", label: "Navegar", icon: "✋" }] },
  { name: "Áreas", tools: [{ type: "YARD_BOUNDARY", label: "Limite", icon: "⬡" }, { type: "OPERATIONAL_AREA", label: "Área operacional", icon: "⬢" }, { type: "SECTOR", label: "Setor", icon: "S" }, { type: "PARKING_AREA", label: "Estacionamento", icon: "P" }, { type: "BUILDING_AREA", label: "Área edificações", icon: "B" }, { type: "WASHING_AREA", label: "Área lavagem", icon: "W" }, { type: "INSPECTION_AREA", label: "Área inspeção", icon: "I" }, { type: "MAINTENANCE_AREA", label: "Área manutenção", icon: "M" }] },
  { name: "Estruturas", tools: [{ type: "BUILDING", label: "Prédio", icon: "▣" }, { type: "BOX", label: "Box", icon: "▥" }, { type: "PORTARIA", label: "Portaria", icon: "▤" }, { type: "GATE", label: "Portão", icon: "🚪" }, { type: "SHED", label: "Galpão", icon: "G" }, { type: "WALL", label: "Muro", icon: "┃" }, { type: "FENCE", label: "Cerca", icon: "┊" }, { type: "PLATFORM", label: "Plataforma", icon: "▰" }] },
  { name: "Circulação", tools: [{ type: "ROAD", label: "Rua", icon: "━" }, { type: "INTERNAL_ROAD", label: "Rua interna", icon: "═" }, { type: "ACCESS", label: "Acesso", icon: "➜" }, { type: "CORRIDOR", label: "Corredor", icon: "┄" }, { type: "PEDESTRIAN_PATH", label: "Pedestres", icon: "⋯" }] },
  { name: "Vagas", tools: [{ type: "PARKING_SLOT", label: "Vaga", icon: "P" }, { type: "TRAILER_SLOT", label: "Carreta", icon: "C" }, { type: "TRUCK_SLOT", label: "Caminhão", icon: "T" }, { type: "WASHING_SLOT", label: "Lavagem", icon: "W" }, { type: "INSPECTION_SLOT", label: "Inspeção", icon: "I" }] },
  { name: "Anotações", tools: [{ type: "TEXT", label: "Texto", icon: "T" }, { type: "LABEL", label: "Label", icon: "L" }, { type: "ICON", label: "Ícone", icon: "●" }, { type: "MEASURE", label: "Medida", icon: "📏" }] }
];
const semanticTypes = Object.keys(ELEMENT_TYPE_LABELS).filter((type) => type !== "GENERIC") as YardElementType[];

function id(prefix = "element") { return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
function now() { return new Date().toISOString(); }
function styleFor(type: YardElementType) {
  const category = categoryForElementType(type);
  if (type === "YARD_BOUNDARY") return { fill: "rgba(57,255,136,.06)", stroke: "#39ff88", strokeWidth: 5, opacity: 1 };
  if (category === "CONTAINER") return { fill: "rgba(14,116,144,.18)", stroke: "#38bdf8", strokeWidth: 3, opacity: 1 };
  if (category === "TRAFFIC") return { fill: "none", stroke: "#64748b", strokeWidth: 3, opacity: 1 };
  if (category === "SLOT") return { fill: "rgba(255,255,255,.04)", stroke: "#cbd5e1", strokeWidth: 2, opacity: 1 };
  if (category === "STRUCTURE") return { fill: "#526577", stroke: "#b6c8d5", strokeWidth: 3, opacity: 1 };
  return { fill: "#e5f7ff", stroke: "#e5f7ff", strokeWidth: 2, opacity: 1 };
}
function isLine(type: YardElementType) { return ["ROAD", "INTERNAL_ROAD", "ACCESS", "CORRIDOR", "PEDESTRIAN_PATH", "WALL", "FENCE", "MEASURE"].includes(type); }
function isPoint(type: YardElementType) { return ["TEXT", "LABEL", "ICON"].includes(type); }
function isRectangle(type: YardElementType) { return categoryForElementType(type) === "STRUCTURE" || SLOT_TYPES.includes(type); }

function createMapElement(type: YardElementType, points: MapPoint[]): YardMapElement {
  let geometry: YardMapElement["geometry"];
  if (isPoint(type)) geometry = { kind: "point", x: points[0][0], y: points[0][1] };
  else if (isRectangle(type)) { const [start, end] = points; geometry = { kind: "rect", x: Math.min(start[0], end[0]), y: Math.min(start[1], end[1]), width: Math.max(10, Math.abs(end[0] - start[0])), height: Math.max(10, Math.abs(end[1] - start[1])), rotation: 0 }; }
  else if (isLine(type)) geometry = { kind: "polyline", points, width: type === "ROAD" ? 45 : type === "INTERNAL_ROAD" ? 32 : type === "CORRIDOR" ? 24 : 5 };
  else geometry = { kind: "polygon", points };
  const timestamp = now();
  return { id: id(), parentId: null, groupId: null, category: categoryForElementType(type), type, name: ELEMENT_TYPE_LABELS[type], layerId: layerForElementType(type), geometry, style: styleFor(type), properties: defaultElementProperties(type), zIndex: 10, locked: false, visible: true, createdAt: timestamp, updatedAt: timestamp };
}

function translateElement(element: YardMapElement, dx: number, dy: number) {
  const next = clone(element), geometry = next.geometry;
  if (geometry.kind === "point" || geometry.kind === "rect") { geometry.x += dx; geometry.y += dy; }
  else geometry.points = geometry.points.map(([x, y]) => [x + dx, y + dy]);
  next.updatedAt = now(); return next;
}
function scaleElement(element: YardMapElement, factorX: number, factorY = factorX) {
  const next = clone(element), geometry = next.geometry;
  if (geometry.kind === "rect") { geometry.width = Math.max(5, geometry.width * factorX); geometry.height = Math.max(5, geometry.height * factorY); }
  else if (geometry.kind !== "point") { const bounds = elementBounds(next); geometry.points = geometry.points.map(([x, y]) => [bounds.centerX + (x - bounds.centerX) * factorX, bounds.centerY + (y - bounds.centerY) * factorY]); if (geometry.kind === "polyline") geometry.width = Math.max(2, geometry.width * Math.abs(factorX)); }
  next.updatedAt = now(); return next;
}
function rotateElement(element: YardMapElement, degrees: number) {
  const next = clone(element), geometry = next.geometry;
  if (geometry.kind === "rect") geometry.rotation = ((geometry.rotation || 0) + degrees) % 360;
  else if (geometry.kind !== "point") { const bounds = elementBounds(next), radians = degrees * Math.PI / 180, c = Math.cos(radians), s = Math.sin(radians); geometry.points = geometry.points.map(([x, y]) => [bounds.centerX + (x - bounds.centerX) * c - (y - bounds.centerY) * s, bounds.centerY + (x - bounds.centerX) * s + (y - bounds.centerY) * c]); }
  next.updatedAt = now(); return next;
}
function descendants(idValue: string, elements: YardMapElement[]) { const result = new Set<string>(); let changed = true; while (changed) { changed = false; for (const item of elements) if (item.parentId && (item.parentId === idValue || result.has(item.parentId)) && !result.has(item.id)) { result.add(item.id); changed = true; } } return result; }

function TreeNode({ element, elements, selectedIds, expanded, onToggle, onSelect, onRename, onVisibility, onLock, onDrop }: any) {
  const children = elements.filter((item: YardMapElement) => item.parentId === element.id).sort((a: YardMapElement, b: YardMapElement) => a.zIndex - b.zIndex);
  const open = expanded.has(element.id);
  return <li><div className={`yard-tree-node${selectedIds.includes(element.id) ? " selected" : ""}`} draggable onDragStart={(event: any) => event.dataTransfer.setData("text/yard-element", element.id)} onDragOver={(event: any) => event.preventDefault()} onDrop={(event: any) => { event.preventDefault(); onDrop(event.dataTransfer.getData("text/yard-element"), element.id); }}>
    <button className="yard-tree-node__expand" onClick={() => onToggle(element.id)} disabled={!children.length}>{children.length ? (open ? "▾" : "▸") : "·"}</button>
    <button className="yard-tree-node__name" onClick={(event: any) => onSelect(element.id, event.shiftKey)} onDoubleClick={() => onRename(element)}><i>{element.category === "CONTAINER" ? "⬡" : element.category === "SLOT" ? "P" : element.category === "TRAFFIC" ? "━" : element.category === "ANNOTATION" ? "T" : "■"}</i><span>{element.name}</span></button>
    <button title="Mostrar/ocultar" onClick={() => onVisibility(element)}>{element.visible ? "◉" : "○"}</button><button title="Bloquear/desbloquear" onClick={() => onLock(element)}>{element.locked ? "🔒" : "·"}</button>
  </div>{children.length && open ? <ul>{children.map((child: YardMapElement) => <TreeNode key={child.id} {...{ element: child, elements, selectedIds, expanded, onToggle, onSelect, onRename, onVisibility, onLock, onDrop }} />)}</ul> : null}</li>;
}

export default function YardMapEditor({ mapName, initialDocument, saving = false, onSave, onUploadBackground, onClose }: Props) {
  const svgRef = useRef<any>(null), viewportRef = useRef<any>(null), dragRef = useRef<any>(null);
  const [document, setDocument] = useState<YardMapDocument>(validateYardMapDocument(clone(initialDocument)));
  const [past, setPast] = useState<YardMapDocument[]>([]), [future, setFuture] = useState<YardMapDocument[]>([]);
  const [tool, setTool] = useState<EditorTool>("SELECT"), [selectedIds, setSelectedIds] = useState<string[]>([]), [draftPoints, setDraftPoints] = useState<MapPoint[]>([]);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 }), [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [overlapCandidates, setOverlapCandidates] = useState<YardMapElement[]>([]), [placementError, setPlacementError] = useState("");
  const [slotConfig, setSlotConfig] = useState<SlotConfig | null>(null), [slotPreview, setSlotPreview] = useState<YardMapElement[]>([]), [slotPreviewValid, setSlotPreviewValid] = useState(false);
  const [smartGuides, setSmartGuides] = useState<{ x?: number; y?: number }>({});
  const selected = selectedIds.length ? document.elements.find((element) => element.id === selectedIds[selectedIds.length - 1]) || null : null;

  function commit(next: YardMapDocument) { setPast((value) => [...value.slice(-49), clone(document)]); setDocument(validateYardMapDocument(next)); setFuture([]); }
  function patchElements(updater: (elements: YardMapElement[]) => YardMapElement[]) { commit({ ...document, elements: updater(document.elements) }); }
  function isLocked(element: YardMapElement) { return element.locked || Boolean(document.layers.find((layer) => layer.id === element.layerId)?.locked); }
  function pointFromEvent(event: any): MapPoint { const rect = svgRef.current.getBoundingClientRect(); return snapPoint([(event.clientX - rect.left) / rect.width * document.viewBox.width, (event.clientY - rect.top) / rect.height * document.viewBox.height], document.settings.gridSize, document.settings.snapEnabled); }
  function chooseParent(element: YardMapElement) {
    const explicit = selected?.category === "CONTAINER" && canElementBeChildOf(element, selected) && isElementInsideParent(element, selected) ? selected : null;
    return explicit || findContainingContainer(element, { ...document, elements: [...document.elements, element] });
  }
  function nextZIndex(type: YardElementType, offset = 1) { const layerId = layerForElementType(type), base = (document.layers.find((layer) => layer.id === layerId)?.order || 10) * 100, existing = document.elements.filter((item) => item.layerId === layerId).map((item) => item.zIndex); return Math.max(base, ...existing) + offset; }
  function finishDrawing(pointsValue = draftPoints) {
    if (["SELECT", "MOVE", "RESIZE", "ROTATE", "EDIT_POINTS", "PAN"].includes(tool)) return;
    const type = tool as YardElementType, minimum = isPoint(type) ? 1 : isRectangle(type) ? 2 : CONTAINER_TYPES.includes(type) ? 3 : 2;
    if (pointsValue.length < minimum) return;
    let element = createMapElement(type, pointsValue); const parent = chooseParent(element); element = { ...element, parentId: parent?.id || null, zIndex: nextZIndex(type) };
    const nextDocument = { ...document, elements: [...document.elements, element] };
    const placement = validateElementPlacement(element, nextDocument);
    if (!placement.valid) { setPlacementError(placement.message || "Posição inválida."); return; }
    commit(nextDocument); setSelectedIds([element.id]); setDraftPoints([]); setTool("SELECT"); setPlacementError(""); if (parent) setExpanded((value) => new Set([...value, parent.id]));
  }
  function canvasDown(event: any) {
    if (event.button !== 0) return;
    setOverlapCandidates([]);
    if (tool === "PAN") { dragRef.current = { kind: "pan", x: event.clientX, y: event.clientY, transform }; return; }
    if (["SELECT", "MOVE", "RESIZE", "ROTATE", "EDIT_POINTS"].includes(tool)) { if (tool === "SELECT") setSelectedIds([]); return; }
    const point = pointFromEvent(event), type = tool as YardElementType;
    if (isPoint(type)) { finishDrawing([point]); return; }
    const next = [...draftPoints, point]; setDraftPoints(next); if (isRectangle(type) && next.length === 2) finishDrawing(next);
  }
  function selectedMoveIds(element: YardMapElement) {
    const result = new Set(selectedIds.includes(element.id) ? selectedIds : [element.id]);
    for (const selectedId of [...result]) {
      const item = document.elements.find((value) => value.id === selectedId); if (!item) continue;
      if (item.groupId) document.elements.filter((value) => value.groupId === item.groupId).forEach((value) => result.add(value.id));
      if (item.category === "CONTAINER" && item.properties.moveChildren) descendants(item.id, document.elements).forEach((value) => result.add(value));
    }
    return result;
  }
  function elementDown(element: YardMapElement, event: any) {
    if (tool === "PAN") { dragRef.current = { kind: "pan", x: event.clientX, y: event.clientY, transform }; return; }
    if (isLocked(element)) return;
    const point = pointFromEvent(event);
    const candidates = document.elements.filter((item) => item.visible && !isLocked(item) && elementContainsPoint(item, point)).sort((a, b) => b.zIndex - a.zIndex);
    if (candidates.length > 1) setOverlapCandidates(candidates);
    let nextSelection: string[];
    if (event.altKey && candidates.length > 1) { const current = candidates.findIndex((item) => selectedIds.includes(item.id)); const next = candidates[(current + 1) % candidates.length]; nextSelection = [next.id]; element = next; }
    else if (event.shiftKey) nextSelection = selectedIds.includes(element.id) ? selectedIds.filter((value) => value !== element.id) : [...selectedIds, element.id];
    else nextSelection = [element.id];
    setSelectedIds(nextSelection);
    if (tool === "EDIT_POINTS") return;
    if (["MOVE", "RESIZE", "ROTATE"].includes(tool)) dragRef.current = { kind: tool.toLowerCase(), x: event.clientX, y: event.clientY, element, ids: selectedMoveIds(element), before: clone(document) };
  }
  function smartDelta(primary: YardMapElement, dx: number, dy: number, moving: Set<string>) {
    if (!document.settings.snapEnabled) return { dx, dy, guides: {} };
    const movedBounds = elementBounds(translateElement(primary, dx, dy)), tolerance = 8;
    let adjustX = 0, adjustY = 0, guideX: number | undefined, guideY: number | undefined;
    const xPoints = [movedBounds.minX, movedBounds.centerX, movedBounds.maxX], yPoints = [movedBounds.minY, movedBounds.centerY, movedBounds.maxY];
    for (const other of document.elements.filter((item) => !moving.has(item.id))) {
      const bounds = elementBounds(other), otherX = [bounds.minX, bounds.centerX, bounds.maxX], otherY = [bounds.minY, bounds.centerY, bounds.maxY];
      for (const x of xPoints) for (const target of otherX) if (Math.abs(target - x) < tolerance && (!adjustX || Math.abs(target - x) < Math.abs(adjustX))) { adjustX = target - x; guideX = target; }
      for (const y of yPoints) for (const target of otherY) if (Math.abs(target - y) < tolerance && (!adjustY || Math.abs(target - y) < Math.abs(adjustY))) { adjustY = target - y; guideY = target; }
    }
    return { dx: dx + adjustX, dy: dy + adjustY, guides: { x: guideX, y: guideY } };
  }
  function pointerMove(event: any) {
    const drag = dragRef.current; if (!drag) return;
    if (drag.kind === "pan") { setTransform({ ...drag.transform, x: drag.transform.x + event.clientX - drag.x, y: drag.transform.y + event.clientY - drag.y }); return; }
    const rect = svgRef.current.getBoundingClientRect(), rawDx = (event.clientX - drag.x) / rect.width * document.viewBox.width, rawDy = (event.clientY - drag.y) / rect.height * document.viewBox.height;
    if (drag.kind === "move") { const snapped = smartDelta(drag.element, rawDx, rawDy, drag.ids); setSmartGuides(snapped.guides); setDocument((current) => ({ ...current, elements: drag.before.elements.map((item: YardMapElement) => drag.ids.has(item.id) ? translateElement(item, snapped.dx, snapped.dy) : item) })); }
    if (drag.kind === "resize") { const factor = Math.max(.1, 1 + (rawDx + rawDy) / 300); setDocument((current) => ({ ...current, elements: drag.before.elements.map((item: YardMapElement) => drag.ids.has(item.id) ? scaleElement(item, factor) : item) })); }
    if (drag.kind === "rotate") { const degrees = rawDx / 2; setDocument((current) => ({ ...current, elements: drag.before.elements.map((item: YardMapElement) => drag.ids.has(item.id) ? rotateElement(item, degrees) : item) })); }
  }
  function pointerUp() {
    const drag = dragRef.current;
    if (drag && ["move", "resize", "rotate", "vertex"].includes(drag.kind)) { setPast((value) => [...value.slice(-49), drag.before]); setFuture([]); const invalid = validateAllElementPlacements(document).filter((item) => item.element.category !== "GENERIC"); setPlacementError(invalid[0]?.result.message || ""); }
    dragRef.current = null; setSmartGuides({});
  }
  function vertexDown(element: YardMapElement, index: number, event: any) { event.stopPropagation(); if (isLocked(element)) return; dragRef.current = { kind: "vertex", x: event.clientX, y: event.clientY, element, index, before: clone(document) }; }
  function vertexMove(event: any) { const drag = dragRef.current; if (drag?.kind !== "vertex") return false; const point = pointFromEvent(event); setDocument((current) => ({ ...current, elements: current.elements.map((item) => { if (item.id !== drag.element.id || (item.geometry.kind !== "polygon" && item.geometry.kind !== "polyline")) return item; const next = clone(item); (next.geometry as any).points[drag.index] = point; next.updatedAt = now(); return next; }) })); return true; }
  function canvasPointerMove(event: any) { if (!vertexMove(event)) pointerMove(event); }
  function updateSelected(transformer: (element: YardMapElement) => YardMapElement) { if (!selected) return; patchElements((elements) => elements.map((item) => { if (item.id !== selected.id) return item; const transformed = transformer(item); if (isLocked(item) && transformed.locked === item.locked) return item; return { ...transformed, updatedAt: now() }; })); }
  function updateProperty(key: string, value: any) { updateSelected((item) => ({ ...item, properties: { ...item.properties, [key]: value } })); }
  function removeSelected() {
    if (!selectedIds.length) return; if (document.elements.some((item) => selectedIds.includes(item.id) && isLocked(item))) { setPlacementError("Desbloqueie os elementos antes de excluí-los."); return; } const removal = new Set(selectedIds); for (const selectedId of selectedIds) descendants(selectedId, document.elements).forEach((value) => removal.add(value));
    const childCount = removal.size - selectedIds.length; if (childCount && !window.confirm(`A exclusão também removerá ${childCount} elemento(s) filho(s). Continuar?`)) return;
    patchElements((elements) => elements.filter((item) => !removal.has(item.id))); setSelectedIds([]);
  }
  function duplicateSelected() {
    if (!selectedIds.length) return; const sourceIds = new Set(selectedIds);
    for (const selectedId of selectedIds) { const item = document.elements.find((value) => value.id === selectedId); if (item?.groupId) document.elements.filter((value) => value.groupId === item.groupId).forEach((value) => sourceIds.add(value.id)); descendants(selectedId, document.elements).forEach((value) => sourceIds.add(value)); }
    const idMap = new Map<string, string>(), groupMap = new Map<string, string>(); sourceIds.forEach((value) => idMap.set(value, id()));
    const copies = document.elements.filter((item) => sourceIds.has(item.id)).map((item) => { if (item.groupId && !groupMap.has(item.groupId)) groupMap.set(item.groupId, id("group")); const copy = translateElement(clone(item), 30, 30); return { ...copy, id: idMap.get(item.id)!, parentId: item.parentId && idMap.has(item.parentId) ? idMap.get(item.parentId)! : item.parentId, groupId: item.groupId ? groupMap.get(item.groupId)! : null, name: `${item.name} cópia`, zIndex: item.zIndex + 1, createdAt: now(), updatedAt: now() }; });
    commit({ ...document, elements: [...document.elements, ...copies] }); setSelectedIds(copies.filter((item) => selectedIds.some((value) => idMap.get(value) === item.id)).map((item) => item.id));
  }
  function reparent(elementId: string, parentId: string | null) {
    const element = document.elements.find((item) => item.id === elementId), parent = parentId ? document.elements.find((item) => item.id === parentId) || null : null; if (!element) return;
    if (isLocked(element)) { setPlacementError("Desbloqueie o elemento antes de alterar seu pai."); return; }
    if (wouldCreateHierarchyCycle(element.id, parentId, document.elements)) { setPlacementError("Não é possível criar um ciclo na hierarquia."); return; }
    if (!canElementBeChildOf(element, parent) || (parent && !isElementInsideParent(element, parent))) { setPlacementError(parent ? `${element.name} não cabe ou não pode ser filho de ${parent.name}.` : "Este elemento precisa de um container pai."); return; }
    updateSelectedById(elementId, (item) => ({ ...item, parentId, category: item.category === "GENERIC" ? categoryForElementType(item.type) : item.category, updatedAt: now() })); setPlacementError(""); if (parentId) setExpanded((value) => new Set([...value, parentId]));
  }
  function updateSelectedById(elementId: string, transformer: (item: YardMapElement) => YardMapElement) { patchElements((elements) => elements.map((item) => item.id === elementId ? transformer(item) : item)); }
  function groupSelected() { if (selectedIds.length < 2) return; const selectedElements = document.elements.filter((item) => selectedIds.includes(item.id)); if (new Set(selectedElements.map((item) => item.parentId)).size > 1) { setPlacementError("Para agrupar, selecione elementos do mesmo pai."); return; } const groupId = id("group"); patchElements((elements) => elements.map((item) => selectedIds.includes(item.id) ? { ...item, groupId, updatedAt: now() } : item)); }
  function ungroupSelected() { if (!selected) return; const groups = new Set(document.elements.filter((item) => selectedIds.includes(item.id)).map((item) => item.groupId).filter(Boolean)); patchElements((elements) => elements.map((item) => item.groupId && groups.has(item.groupId) ? { ...item, groupId: null, updatedAt: now() } : item)); }
  function changeZ(action: "front" | "back" | "up" | "down") { if (!selectedIds.length) return; const values = document.elements.map((item) => item.zIndex), max = Math.max(0, ...values), min = Math.min(0, ...values); patchElements((elements) => elements.map((item) => selectedIds.includes(item.id) ? { ...item, zIndex: action === "front" ? max + 10 : action === "back" ? min - 10 : item.zIndex + (action === "up" ? 1 : -1), updatedAt: now() } : item)); }
  function align(axis: "horizontal" | "vertical") { if (selectedIds.length < 2 || !selected) return; const target = elementBounds(selected); patchElements((elements) => elements.map((item) => { if (!selectedIds.includes(item.id)) return item; const bounds = elementBounds(item); return translateElement(item, axis === "vertical" ? target.centerX - bounds.centerX : 0, axis === "horizontal" ? target.centerY - bounds.centerY : 0); })); }
  function distribute(axis: "x" | "y") { if (selectedIds.length < 3) return; const items = document.elements.filter((item) => selectedIds.includes(item.id)).sort((a, b) => axis === "x" ? elementBounds(a).centerX - elementBounds(b).centerX : elementBounds(a).centerY - elementBounds(b).centerY); const first = elementBounds(items[0]), last = elementBounds(items[items.length - 1]), step = ((axis === "x" ? last.centerX - first.centerX : last.centerY - first.centerY) / (items.length - 1)); patchElements((elements) => elements.map((item) => { const index = items.findIndex((value) => value.id === item.id); if (index < 0) return item; const bounds = elementBounds(item), target = (axis === "x" ? first.centerX : first.centerY) + step * index; return translateElement(item, axis === "x" ? target - bounds.centerX : 0, axis === "y" ? target - bounds.centerY : 0); })); }
  function copySizeAndRotation() { if (selectedIds.length < 2 || !selected || selected.geometry.kind !== "rect") return; patchElements((elements) => elements.map((item) => selectedIds.includes(item.id) && item.id !== selected.id && item.geometry.kind === "rect" ? { ...item, geometry: { ...item.geometry, width: selected.geometry.kind === "rect" ? selected.geometry.width : item.geometry.width, height: selected.geometry.kind === "rect" ? selected.geometry.height : item.geometry.height, rotation: selected.geometry.kind === "rect" ? selected.geometry.rotation : item.geometry.rotation }, updatedAt: now() } : item)); }
  function renumberGroup() { if (!selected?.groupId) return; const prefix = window.prompt("Prefixo das vagas", selected.properties.code.replace(/\d+$/, "") || "A"); if (prefix === null) return; const start = Number(window.prompt("Número inicial", "1")); if (!Number.isInteger(start)) return; const group = document.elements.filter((item) => item.groupId === selected.groupId).sort((a, b) => a.zIndex - b.zIndex); const digits = Math.max(2, String(start + group.length - 1).length); patchElements((elements) => elements.map((item) => { const index = group.findIndex((value) => value.id === item.id); return index < 0 ? item : { ...item, name: `${prefix}${String(start + index).padStart(digits, "0")}`, properties: { ...item.properties, code: `${prefix}${String(start + index).padStart(digits, "0")}` }, updatedAt: now() }; })); }
  function updateGroupSpacing(gapX: number, gapY: number) { if (!selected?.groupId) return; const group = document.elements.filter((item) => item.groupId === selected.groupId).sort((a, b) => a.zIndex - b.zIndex), columns = selected.properties.groupColumns || group.length, originX = Math.min(...group.map((item) => elementBounds(item).minX)), originY = Math.min(...group.map((item) => elementBounds(item).minY)); patchElements((elements) => elements.map((item) => { const index = group.findIndex((value) => value.id === item.id); if (index < 0) return item; const bounds = elementBounds(item), column = index % columns, row = Math.floor(index / columns), targetX = originX + column * (bounds.width + gapX), targetY = originY + row * (bounds.height + gapY), moved = translateElement(item, targetX - bounds.minX, targetY - bounds.minY); return { ...moved, properties: { ...moved.properties, groupSpacing: gapX, groupGapY: gapY } }; })); }
  function undo() { if (!past.length) return; const previous = past[past.length - 1]; setFuture((value) => [clone(document), ...value]); setDocument(previous); setPast((value) => value.slice(0, -1)); }
  function redo() { if (!future.length) return; const next = future[0]; setPast((value) => [...value, clone(document)]); setDocument(next); setFuture((value) => value.slice(1)); }
  function exportJson() { const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), anchor = window.document.createElement("a"); anchor.href = url; anchor.download = `${mapName.toLowerCase().replace(/\W+/g, "-")}.json`; anchor.click(); URL.revokeObjectURL(url); }
  function importJson(file?: File) { if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const imported = validateYardMapDocument(JSON.parse(String(reader.result))); const idMap = new Map(imported.elements.map((item) => [item.id, id()])); const groupMap = new Map<string, string>(); imported.elements.forEach((item) => { if (item.groupId && !groupMap.has(item.groupId)) groupMap.set(item.groupId, id("group")); }); imported.elements = imported.elements.map((item) => ({ ...item, id: idMap.get(item.id)!, parentId: item.parentId ? idMap.get(item.parentId) || null : null, groupId: item.groupId ? groupMap.get(item.groupId)! : null })); commit(imported); setSelectedIds([]); } catch (error) { window.alert(error instanceof Error ? error.message : "JSON inválido"); } }; reader.readAsText(file); }
  function toggleLayer(idValue: string, key: "visible" | "locked") { commit({ ...document, layers: document.layers.map((layer) => layer.id === idValue ? { ...layer, [key]: !layer[key] } : layer) }); }
  async function uploadBackground(file?: File) { if (!file) return; const uploaded = await onUploadBackground(file); if (uploaded) commit(validateYardMapDocument(uploaded)); }
  function save() { const invalid = validateAllElementPlacements(document).filter((item) => item.element.category !== "GENERIC"); if (invalid.length) { setPlacementError(`${invalid[0].element.name}: ${invalid[0].result.message}`); window.alert(`O mapa possui ${invalid.length} elemento(s) inválido(s). Corrija a hierarquia ou a posição antes de salvar.`); return; } onSave(document); }

  function openSlotGenerator() { if (!selected || !["PARKING_AREA", "SECTOR", "OPERATIONAL_AREA"].includes(selected.type)) { setPlacementError("Selecione uma área de estacionamento, setor ou área operacional para gerar vagas."); return; } setSlotConfig({ rows: 2, columns: 10, width: 45, height: 90, gapX: 10, gapY: 10, rotation: 0, prefix: "A", start: 1, type: "PARKING_SLOT" }); setSlotPreview([]); }
  function buildSlotPreview(config = slotConfig) {
    if (!config || !selected) return; const count = config.rows * config.columns; if (!Number.isInteger(config.rows) || !Number.isInteger(config.columns) || config.rows < 1 || config.columns < 1 || count > 1000 || config.width < 5 || config.height < 5 || config.gapX < 0 || config.gapY < 0) { setSlotPreview([]); setSlotPreviewValid(false); setPlacementError("Informe uma grade válida de até 1.000 vagas, com dimensões positivas."); return; } const bounds = elementBounds(selected), groupId = id("slot-group"), result: YardMapElement[] = [], digits = Math.max(2, String(config.start + count - 1).length);
    const totalWidth = config.columns * config.width + (config.columns - 1) * config.gapX, totalHeight = config.rows * config.height + (config.rows - 1) * config.gapY, originX = bounds.centerX - totalWidth / 2, originY = bounds.centerY - totalHeight / 2;
    for (let row = 0; row < config.rows; row++) for (let column = 0; column < config.columns; column++) { const index = row * config.columns + column, code = `${config.prefix}${String(config.start + index).padStart(digits, "0")}`, element = createMapElement(config.type, [[originX + column * (config.width + config.gapX), originY + row * (config.height + config.gapY)], [originX + column * (config.width + config.gapX) + config.width, originY + row * (config.height + config.gapY) + config.height]]); if (element.geometry.kind === "rect") element.geometry.rotation = config.rotation; result.push({ ...element, parentId: selected.id, groupId, name: code, zIndex: nextZIndex(config.type, index + 1), properties: { ...element.properties, code, groupSpacing: config.gapX, groupGapY: config.gapY, groupRows: config.rows, groupColumns: config.columns } }); }
    const previewDocument = { ...document, elements: [...document.elements, ...result] }, invalid = result.filter((item) => !validateElementPlacement(item, previewDocument).valid); setSlotPreview(result); setSlotPreviewValid(!invalid.length); setPlacementError(invalid.length ? `${invalid.length} vaga(s) ultrapassam os limites de ${selected.name}. Ajuste a grade.` : "");
  }
  function confirmSlots() { if (!slotPreviewValid || !slotPreview.length) return; commit({ ...document, elements: [...document.elements, ...slotPreview] }); setSelectedIds(slotPreview.map((item) => item.id)); setExpanded((value) => new Set([...value, selected!.id])); setSlotConfig(null); setSlotPreview([]); setPlacementError(""); }

  const roots = document.elements.filter((element) => !element.parentId).sort((a, b) => a.zIndex - b.zIndex), parentOptions = document.elements.filter((item) => item.category === "CONTAINER" && selected && item.id !== selected.id && !wouldCreateHierarchyCycle(selected.id, item.id, document.elements) && canElementBeChildOf(selected, item));

  return <div className="yard-editor">
    <header className="yard-editor__topbar"><div><strong>Editor territorial</strong><span>{mapName}</span></div><div className="yard-editor__actions">
      <button onClick={undo} disabled={!past.length}>Desfazer</button><button onClick={redo} disabled={!future.length}>Refazer</button>
      <button onClick={() => changeZ("front")} disabled={!selected}>Frente</button><button onClick={() => changeZ("back")} disabled={!selected}>Fundo</button><button onClick={() => changeZ("up")} disabled={!selected}>Subir</button><button onClick={() => changeZ("down")} disabled={!selected}>Descer</button>
      <button onClick={() => align("horizontal")} disabled={selectedIds.length < 2}>Alinhar H</button><button onClick={() => align("vertical")} disabled={selectedIds.length < 2}>Alinhar V</button><button onClick={() => distribute("x")} disabled={selectedIds.length < 3}>Distribuir X</button><button onClick={() => distribute("y")} disabled={selectedIds.length < 3}>Distribuir Y</button><button onClick={copySizeAndRotation} disabled={selectedIds.length < 2}>Copiar tamanho/rotação</button>
      <button onClick={groupSelected} disabled={selectedIds.length < 2}>Agrupar</button><button onClick={ungroupSelected} disabled={!selected?.groupId}>Desagrupar</button><button onClick={duplicateSelected} disabled={!selected}>Duplicar</button><button onClick={removeSelected} disabled={!selected}>Excluir</button>
      <button onClick={exportJson}>Exportar</button><label>Importar<input type="file" accept="application/json" onChange={(event: any) => importJson(event.target.files?.[0])} /></label><button className="primary" onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar mapa"}</button><button onClick={onClose}>Fechar</button>
    </div></header>
    <aside className="yard-editor__tools">{toolGroups.map((group) => <div className="yard-editor__tool-group" key={group.name}><h3>{group.name}</h3>{group.tools.map((item) => <button key={item.type} className={tool === item.type ? "active" : ""} onClick={() => { setTool(item.type); setDraftPoints([]); }}><i>{item.icon}</i><span>{item.label}</span></button>)}</div>)}<div className="yard-editor__tool-actions"><button onClick={openSlotGenerator}>Gerar vagas</button><button onClick={renumberGroup} disabled={!selected?.groupId}>Renumerar grupo</button></div></aside>
    <main className={`yard-editor__canvas yard-editor__canvas--${tool.toLowerCase()}`} ref={viewportRef} onPointerMove={canvasPointerMove} onPointerUp={pointerUp} onPointerLeave={pointerUp} onWheel={(event: any) => { event.preventDefault(); const rect = viewportRef.current.getBoundingClientRect(); setTransform((current) => zoomAtPoint(current, current.scale + (event.deltaY < 0 ? .2 : -.2), { x: event.clientX - rect.left, y: event.clientY - rect.top })); }}>
      <div className="yard-editor__transform" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }} onPointerDown={canvasDown} onDoubleClick={() => finishDrawing()}>
        <YardVectorMap document={document} svgRef={svgRef} editor selectedIds={selectedIds} draftPoints={draftPoints} previewElements={slotPreview} onElementSelect={elementDown} />
        {tool === "EDIT_POINTS" && selected && (selected.geometry.kind === "polygon" || selected.geometry.kind === "polyline") ? <svg className="yard-editor-vertices" viewBox={`0 0 ${document.viewBox.width} ${document.viewBox.height}`}>{geometryPoints(selected).map((point, index) => <circle key={index} cx={point[0]} cy={point[1]} r="9" onPointerDown={(event: any) => vertexDown(selected, index, event)} />)}</svg> : null}
        {smartGuides.x !== undefined || smartGuides.y !== undefined ? <svg className="yard-editor-smart-guides" viewBox={`0 0 ${document.viewBox.width} ${document.viewBox.height}`}>{smartGuides.x !== undefined ? <line x1={smartGuides.x} y1="0" x2={smartGuides.x} y2={document.viewBox.height} /> : null}{smartGuides.y !== undefined ? <line x1="0" y1={smartGuides.y} x2={document.viewBox.width} y2={smartGuides.y} /> : null}</svg> : null}
      </div>
      {draftPoints.length ? <div className="yard-editor__hint">Duplo clique para finalizar · {draftPoints.length} ponto(s)</div> : null}
      {placementError ? <div className="yard-editor__validation" role="alert">⚠ {placementError}</div> : null}
      {overlapCandidates.length > 1 ? <div className="yard-editor-overlap"><strong>Selecionar sob o cursor</strong>{overlapCandidates.map((item) => <button key={item.id} onClick={() => { setSelectedIds([item.id]); setOverlapCandidates([]); }}>{item.name}<small>z {item.zIndex}</small></button>)}<small>Alt+clique alterna entre objetos.</small></div> : null}
      <div className="yard-editor__zoom"><button onClick={() => setTransform((current) => ({ ...current, scale: Math.max(.5, current.scale - .2) }))}>−</button><span>{Math.round(transform.scale * 100)}%</span><button onClick={() => setTransform((current) => ({ ...current, scale: Math.min(8, current.scale + .2) }))}>+</button><button onClick={() => setTransform({ scale: 1, x: 0, y: 0 })}>Reset</button></div>
    </main>
    <aside className="yard-editor__properties">
      <section className="yard-editor__tree"><h3>Estrutura do mapa</h3><p className="helper">Arraste um item sobre um container para reatribuir o pai.</p><ul>{roots.map((root) => <TreeNode key={root.id} element={root} elements={document.elements} selectedIds={selectedIds} expanded={expanded} onToggle={(value: string) => setExpanded((current) => { const next = new Set(current); next.has(value) ? next.delete(value) : next.add(value); return next; })} onSelect={(value: string, multiple: boolean) => setSelectedIds((current) => multiple ? (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) : [value])} onRename={(element: YardMapElement) => { const name = window.prompt("Novo nome", element.name); if (name?.trim()) updateSelectedById(element.id, (item) => ({ ...item, name: name.trim(), updatedAt: now() })); }} onVisibility={(element: YardMapElement) => updateSelectedById(element.id, (item) => ({ ...item, visible: !item.visible }))} onLock={(element: YardMapElement) => updateSelectedById(element.id, (item) => ({ ...item, locked: !item.locked }))} onDrop={reparent} />)}</ul></section>
      <section><h3>Camadas</h3>{[...document.layers].sort((a,b) => b.order-a.order).map((layer) => <div className="yard-editor-layer" key={layer.id}><span>{layer.name}</span><button onClick={() => toggleLayer(layer.id, "visible")}>{layer.visible ? "👁" : "—"}</button><button onClick={() => toggleLayer(layer.id, "locked")}>{layer.locked ? "🔒" : "🔓"}</button></div>)}</section>
      <section><h3>Mapa e referência</h3><label><input type="checkbox" checked={document.settings.gridVisible} onChange={() => commit({ ...document, settings: { ...document.settings, gridVisible: !document.settings.gridVisible } })} /> Grid</label><label><input type="checkbox" checked={document.settings.snapEnabled} onChange={() => commit({ ...document, settings: { ...document.settings, snapEnabled: !document.settings.snapEnabled } })} /> Snap inteligente</label><label><input type="checkbox" checked={document.settings.guidesVisible} onChange={() => commit({ ...document, settings: { ...document.settings, guidesVisible: !document.settings.guidesVisible } })} /> Guias</label><label>Grid<input type="number" min="5" max="200" value={document.settings.gridSize} onChange={(event: any) => commit({ ...document, settings: { ...document.settings, gridSize: Number(event.target.value) || 25 } })} /></label><label className="yard-editor__upload">Importar imagem<input type="file" accept="image/*" onChange={(event: any) => void uploadBackground(event.target.files?.[0])} /></label><label>Opacidade<input type="range" min="0" max="1" step=".05" value={document.settings.background.opacity} onChange={(event: any) => commit({ ...document, settings: { ...document.settings, background: { ...document.settings.background, opacity: Number(event.target.value) } } })} /></label><label><input type="checkbox" checked={document.settings.background.visible} onChange={() => commit({ ...document, settings: { ...document.settings, background: { ...document.settings.background, visible: !document.settings.background.visible } } })} /> Mostrar imagem</label></section>
      {selected ? <section className="yard-editor__selected"><h3>{selected.category} · {ELEMENT_TYPE_LABELS[selected.type]}</h3><label>Nome<input value={selected.name} onChange={(event: any) => updateSelected((item) => ({ ...item, name: event.target.value }))} /></label><label>Tipo<select value={selected.type} onChange={(event: any) => { const type = event.target.value as YardElementType; updateSelected((item) => ({ ...item, type, category: categoryForElementType(type), layerId: layerForElementType(type), properties: { ...defaultElementProperties(type), ...item.properties } })); }}>{semanticTypes.map((type) => <option key={type} value={type}>{ELEMENT_TYPE_LABELS[type]}</option>)}</select></label><label>Pai<select value={selected.parentId || ""} onChange={(event: any) => reparent(selected.id, event.target.value || null)}><option value="">Sem pai</option>{parentOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Preenchimento<input type="color" value={selected.style.fill.startsWith("#") ? selected.style.fill : "#38bdf8"} onChange={(event: any) => updateSelected((item) => ({ ...item, style: { ...item.style, fill: event.target.value } }))} /></label><label>Contorno<input type="color" value={selected.style.stroke.startsWith("#") ? selected.style.stroke : "#38bdf8"} onChange={(event: any) => updateSelected((item) => ({ ...item, style: { ...item.style, stroke: event.target.value } }))} /></label><label>Descrição<textarea value={selected.properties.description} onChange={(event: any) => updateProperty("description", event.target.value)} /></label><label><input type="checkbox" checked={selected.visible} onChange={() => updateSelected((item) => ({ ...item, visible: !item.visible }))} /> Visível</label><label><input type="checkbox" checked={selected.locked} onChange={() => updateSelected((item) => ({ ...item, locked: !item.locked }))} /> Bloqueado</label><label><input type="checkbox" checked={selected.properties.active} onChange={() => updateProperty("active", !selected.properties.active)} /> Ativo</label><label><input type="checkbox" checked={selected.properties.allowOutsideBoundary} onChange={() => updateProperty("allowOutsideBoundary", !selected.properties.allowOutsideBoundary)} /> Permitir fora do limite</label>
        {selected.category === "CONTAINER" ? <><label><input type="checkbox" checked={selected.properties.allowsChildren} onChange={() => updateProperty("allowsChildren", !selected.properties.allowsChildren)} /> Permite filhos</label><label><input type="checkbox" checked={selected.properties.moveChildren} onChange={() => updateProperty("moveChildren", !selected.properties.moveChildren)} /> Mover filhos junto</label><label>Capacidade estimada<input type="number" value={selected.properties.capacity ?? ""} onChange={(event: any) => updateProperty("capacity", event.target.value === "" ? null : Number(event.target.value))} /></label></> : null}
        {selected.type === "SECTOR" ? <label>Código/letra<input value={selected.properties.code} onChange={(event: any) => updateProperty("code", event.target.value)} /></label> : null}
        {selected.category === "SLOT" ? <><label>Código<input value={selected.properties.code} onChange={(event: any) => updateProperty("code", event.target.value)} /></label><label>Equipamento<input value={selected.properties.equipmentType} onChange={(event: any) => updateProperty("equipmentType", event.target.value)} /></label><label>Status<select value={selected.properties.status} onChange={(event: any) => updateProperty("status", event.target.value)}><option>DISPONIVEL</option><option>OCUPADA</option><option>BLOQUEADA</option><option>MANUTENCAO</option></select></label></> : null}
        {selected.type === "BOX" ? <><label>Número<input value={selected.properties.number} onChange={(event: any) => updateProperty("number", event.target.value)} /></label><label>Capacidade<input type="number" value={selected.properties.capacity ?? ""} onChange={(event: any) => updateProperty("capacity", event.target.value === "" ? null : Number(event.target.value))} /></label></> : null}
        {selected.type === "BUILDING" ? <label>Finalidade<input value={selected.properties.purpose} onChange={(event: any) => updateProperty("purpose", event.target.value)} /></label> : null}
        {selected.category === "TRAFFIC" ? <><label>Largura<input type="number" value={selected.geometry.kind === "polyline" ? selected.geometry.width : 0} onChange={(event: any) => updateSelected((item) => item.geometry.kind === "polyline" ? { ...item, geometry: { ...item.geometry, width: Number(event.target.value) || 2 } } : item)} /></label><label>Direção<select value={selected.properties.direction} onChange={(event: any) => updateProperty("direction", event.target.value)}><option value="MÃO_DUPLA">Mão dupla</option><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option></select></label><label><input type="checkbox" checked={selected.properties.accessAllowed} onChange={() => updateProperty("accessAllowed", !selected.properties.accessAllowed)} /> Acesso permitido</label></> : null}
        {selected.geometry.kind === "rect" ? <><label>Largura<input type="number" value={Math.round(selected.geometry.width)} onChange={(event: any) => updateSelected((item) => item.geometry.kind === "rect" ? { ...item, geometry: { ...item.geometry, width: Math.max(5, Number(event.target.value)) } } : item)} /></label><label>Altura<input type="number" value={Math.round(selected.geometry.height)} onChange={(event: any) => updateSelected((item) => item.geometry.kind === "rect" ? { ...item, geometry: { ...item.geometry, height: Math.max(5, Number(event.target.value)) } } : item)} /></label><label>Rotação<input type="number" value={Math.round(selected.geometry.rotation || 0)} onChange={(event: any) => updateSelected((item) => item.geometry.kind === "rect" ? { ...item, geometry: { ...item.geometry, rotation: Number(event.target.value) || 0 } } : item)} /></label></> : null}
        {selected.groupId && selected.category === "SLOT" ? <><label>Espaçamento horizontal<input type="number" value={selected.properties.groupSpacing ?? 0} onChange={(event: any) => updateGroupSpacing(Number(event.target.value), selected.properties.groupGapY ?? 0)} /></label><label>Espaçamento vertical<input type="number" value={selected.properties.groupGapY ?? 0} onChange={(event: any) => updateGroupSpacing(selected.properties.groupSpacing ?? 0, Number(event.target.value))} /></label></> : null}<label>Observações<textarea value={selected.properties.notes} onChange={(event: any) => updateProperty("notes", event.target.value)} /></label>{selected.groupId ? <p className="yard-editor-group-id">Grupo: {selected.groupId.slice(0, 12)}</p> : null}
      </section> : <p className="helper">Selecione um objeto para editar.</p>}
    </aside>
    {slotConfig ? <div className="yard-slot-dialog"><div><h2>Gerar vagas em lote</h2><p>As vagas serão criadas dentro de <strong>{selected?.name}</strong> como elementos individuais agrupados.</p><div className="yard-slot-grid">{([['Linhas','rows'],['Colunas','columns'],['Largura','width'],['Altura','height'],['Espaço H','gapX'],['Espaço V','gapY'],['Rotação','rotation'],['Número inicial','start']] as const).map(([label,key]) => <label key={key}>{label}<input type="number" value={slotConfig[key]} min={key === "rows" || key === "columns" ? 1 : undefined} onChange={(event: any) => { setSlotConfig({ ...slotConfig, [key]: Number(event.target.value) }); setSlotPreview([]); }} /></label>)}<label>Prefixo<input value={slotConfig.prefix} onChange={(event: any) => { setSlotConfig({ ...slotConfig, prefix: event.target.value }); setSlotPreview([]); }} /></label><label>Tipo<select value={slotConfig.type} onChange={(event: any) => { setSlotConfig({ ...slotConfig, type: event.target.value }); setSlotPreview([]); }}>{SLOT_TYPES.map((type) => <option key={type} value={type}>{ELEMENT_TYPE_LABELS[type]}</option>)}</select></label></div><div className="yard-slot-dialog__actions"><button onClick={() => { setSlotConfig(null); setSlotPreview([]); }}>Cancelar</button><button onClick={() => buildSlotPreview()}>Visualizar prévia</button><button className="primary" disabled={!slotPreviewValid} onClick={confirmSlots}>Confirmar {slotPreview.length || ""}</button></div></div></div> : null}
  </div>;
}
