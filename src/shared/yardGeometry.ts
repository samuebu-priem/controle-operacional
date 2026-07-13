import {
  CONTAINER_TYPES, DEFAULT_LAYERS, DEFAULT_VIEWBOX, SLOT_TYPES, categoryForElementType,
  layerForElementType, normalizeYardMapElement,
  type MapPoint, type YardMapDocument, type YardMapElement
} from "./yardMapConfig";

export type PercentPoint = { xPercent: number; yPercent: number };
export type MapTransform = { scale: number; x: number; y: number };
export type PlacementResult = { valid: boolean; message: string | null; suggestedParentId: string | null };

export function percentToSvg(point: PercentPoint, viewBox: { width: number; height: number } = DEFAULT_VIEWBOX) {
  return { x: point.xPercent * viewBox.width, y: point.yPercent * viewBox.height };
}
export function svgToPercent(point: { x: number; y: number }, viewBox: { width: number; height: number } = DEFAULT_VIEWBOX): PercentPoint {
  return { xPercent: point.x / viewBox.width, yPercent: point.y / viewBox.height };
}

function pointOnSegment(point: MapPoint, start: MapPoint, end: MapPoint, tolerance = .001) {
  const cross = (point[1] - start[1]) * (end[0] - start[0]) - (point[0] - start[0]) * (end[1] - start[1]);
  if (Math.abs(cross) > tolerance) return false;
  const dot = (point[0] - start[0]) * (end[0] - start[0]) + (point[1] - start[1]) * (end[1] - start[1]);
  if (dot < 0) return false;
  const lengthSquared = (end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2;
  return dot <= lengthSquared;
}

export function isPointInPolygon(point: MapPoint, polygon: readonly MapPoint[]) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const start = polygon[previous], end = polygon[current];
    if (pointOnSegment(point, start, end)) return true;
    const intersects = end[1] > point[1] !== start[1] > point[1]
      && point[0] < ((start[0] - end[0]) * (point[1] - end[1])) / (start[1] - end[1]) + end[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

function rotatePoint(point: MapPoint, center: MapPoint, degrees: number): MapPoint {
  const radians = degrees * Math.PI / 180, cosine = Math.cos(radians), sine = Math.sin(radians);
  const dx = point[0] - center[0], dy = point[1] - center[1];
  return [center[0] + dx * cosine - dy * sine, center[1] + dx * sine + dy * cosine];
}

export function geometryPoints(element: YardMapElement): MapPoint[] {
  const geometry = element.geometry;
  if (geometry.kind === "polygon" || geometry.kind === "polyline") return geometry.points;
  if (geometry.kind === "rect") {
    const center: MapPoint = [geometry.x + geometry.width / 2, geometry.y + geometry.height / 2];
    const points: MapPoint[] = [[geometry.x, geometry.y], [geometry.x + geometry.width, geometry.y], [geometry.x + geometry.width, geometry.y + geometry.height], [geometry.x, geometry.y + geometry.height]];
    return geometry.rotation ? points.map((point) => rotatePoint(point, center, geometry.rotation || 0)) : points;
  }
  return [[geometry.x, geometry.y]];
}

export function elementBounds(element: YardMapElement) {
  const points = geometryPoints(element);
  const xs = points.map((point) => point[0]), ys = points.map((point) => point[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
}

function distanceToSegment(point: MapPoint, start: MapPoint, end: MapPoint) {
  const dx = end[0] - start[0], dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const ratio = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - (start[0] + ratio * dx), point[1] - (start[1] + ratio * dy));
}

export function elementContainsPoint(element: YardMapElement, point: MapPoint) {
  const geometry = element.geometry;
  if (geometry.kind === "polygon" || geometry.kind === "rect") return isPointInPolygon(point, geometryPoints(element));
  if (geometry.kind === "polyline") return geometry.points.slice(1).some((end, index) => distanceToSegment(point, geometry.points[index], end) <= geometry.width / 2);
  return Math.hypot(point[0] - geometry.x, point[1] - geometry.y) <= 18;
}

function elementCenter(element: YardMapElement): MapPoint {
  const bounds = elementBounds(element); return [bounds.centerX, bounds.centerY];
}

export function isElementInsideParent(element: YardMapElement, parent: YardMapElement) {
  if (parent.category !== "CONTAINER") return false;
  const parentPolygon = geometryPoints(parent);
  if (parentPolygon.length < 3) return false;
  if (element.category === "STRUCTURE" || element.category === "ANNOTATION") return isPointInPolygon(elementCenter(element), parentPolygon);
  const points = geometryPoints(element), closed = element.geometry.kind !== "polyline", samples: MapPoint[] = [...points];
  const segments = closed ? points.length : points.length - 1;
  for (let index = 0; index < segments; index++) {
    const start = points[index], end = points[(index + 1) % points.length];
    for (let step = 1; step < 8; step++) samples.push([start[0] + (end[0] - start[0]) * step / 8, start[1] + (end[1] - start[1]) * step / 8]);
  }
  return samples.every((point) => isPointInPolygon(point, parentPolygon));
}

export function canElementBeChildOf(element: YardMapElement, parent: YardMapElement | null) {
  if (!parent) return element.type === "YARD_BOUNDARY" || element.properties.allowOutsideBoundary;
  if (parent.category !== "CONTAINER" || !parent.properties.allowsChildren || parent.id === element.id) return false;
  if (element.type === "YARD_BOUNDARY") return false;
  if (element.type === "OPERATIONAL_AREA") return parent.type === "YARD_BOUNDARY";
  if (element.type === "SECTOR") return parent.type === "YARD_BOUNDARY" || parent.type === "OPERATIONAL_AREA";
  if (["PARKING_AREA", "BUILDING_AREA", "WASHING_AREA", "INSPECTION_AREA", "MAINTENANCE_AREA"].includes(element.type)) return ["YARD_BOUNDARY", "OPERATIONAL_AREA", "SECTOR"].includes(parent.type);
  if (SLOT_TYPES.includes(element.type)) {
    if (element.type === "WASHING_SLOT") return ["WASHING_AREA", "OPERATIONAL_AREA", "SECTOR"].includes(parent.type);
    if (element.type === "INSPECTION_SLOT") return ["INSPECTION_AREA", "OPERATIONAL_AREA", "SECTOR"].includes(parent.type);
    return ["PARKING_AREA", "OPERATIONAL_AREA", "SECTOR"].includes(parent.type);
  }
  if (element.type === "BOX") return ["OPERATIONAL_AREA", "SECTOR", "PARKING_AREA", "BUILDING_AREA"].includes(parent.type);
  if (element.category === "TRAFFIC") return ["YARD_BOUNDARY", "OPERATIONAL_AREA"].includes(parent.type);
  return true;
}

function elementArea(element: YardMapElement) {
  const points = geometryPoints(element);
  return Math.abs(points.reduce((sum, point, index) => { const next = points[(index + 1) % points.length]; return sum + point[0] * next[1] - next[0] * point[1]; }, 0) / 2);
}

export function findContainingContainer(element: YardMapElement, document: YardMapDocument) {
  return document.elements
    .filter((candidate) => candidate.id !== element.id && candidate.visible && candidate.properties.active && canElementBeChildOf(element, candidate) && isElementInsideParent(element, candidate))
    .sort((a, b) => elementArea(a) - elementArea(b))[0] || null;
}

export function wouldCreateHierarchyCycle(elementId: string, parentId: string | null, elements: YardMapElement[]) {
  let current = parentId;
  const visited = new Set<string>();
  while (current) {
    if (current === elementId || visited.has(current)) return true;
    visited.add(current);
    current = elements.find((element) => element.id === current)?.parentId || null;
  }
  return false;
}

export function validateElementPlacement(element: YardMapElement, document: YardMapDocument): PlacementResult {
  if (element.type === "YARD_BOUNDARY") return { valid: !element.parentId, message: element.parentId ? "O limite da filial não pode possuir pai." : null, suggestedParentId: null };
  if (element.properties.allowOutsideBoundary && !element.parentId) return { valid: true, message: null, suggestedParentId: null };
  const parent = element.parentId ? document.elements.find((item) => item.id === element.parentId) || null : null;
  if (element.parentId && !parent) return { valid: false, message: "O elemento pai não existe.", suggestedParentId: null };
  if (parent && wouldCreateHierarchyCycle(element.id, parent.id, document.elements)) return { valid: false, message: "A hierarquia criaria um ciclo.", suggestedParentId: null };
  if (parent && !canElementBeChildOf(element, parent)) return { valid: false, message: `${element.name} não pode ser filho de ${parent.name}.`, suggestedParentId: null };
  if (parent && !isElementInsideParent(element, parent)) return { valid: false, message: `${element.name} ultrapassa os limites de ${parent.name}.`, suggestedParentId: null };
  const containing = findContainingContainer(element, document);
  if (!parent && containing) return { valid: true, message: null, suggestedParentId: containing.id };
  if (!parent) return { valid: false, message: `${element.name} precisa estar dentro de uma área compatível.`, suggestedParentId: null };
  const boundaries = document.elements.filter((item) => item.type === "YARD_BOUNDARY" && item.visible && item.properties.active);
  if (!boundaries.some((boundary) => isElementInsideParent(element, boundary))) return { valid: false, message: `${element.name} está fora do limite da filial.`, suggestedParentId: null };
  return { valid: true, message: null, suggestedParentId: parent.id };
}

function usableElements(document: YardMapDocument) {
  const visibleLayers = new Map(document.layers.map((layer) => [layer.id, layer.visible]));
  return document.elements.filter((element) => element.properties.active && element.visible && visibleLayers.get(element.layerId) !== false);
}
export function isPointInsideOfficialBoundary(point: PercentPoint, document: YardMapDocument) {
  if (!Number.isFinite(point.xPercent) || !Number.isFinite(point.yPercent)) return false;
  const svg = percentToSvg(point, document.viewBox), tuple: MapPoint = [svg.x, svg.y];
  return usableElements(document).some((element) => element.type === "YARD_BOUNDARY" && elementContainsPoint(element, tuple));
}
export function getSectorForPoint(point: PercentPoint, document: YardMapDocument): string | null {
  if (!isPointInsideOfficialBoundary(point, document)) return null;
  const svg = percentToSvg(point, document.viewBox);
  const sectors = usableElements(document).filter((element) => element.type === "SECTOR" && elementContainsPoint(element, [svg.x, svg.y])).sort((a, b) => b.zIndex - a.zIndex);
  return sectors[0]?.properties.code || sectors[0]?.name || null;
}
export function isPointInsideYard(point: PercentPoint, document: YardMapDocument) {
  if (!isPointInsideOfficialBoundary(point, document)) return false;
  const svg = percentToSvg(point, document.viewBox), tuple: MapPoint = [svg.x, svg.y];
  return !usableElements(document).some((element) => element.type !== "YARD_BOUNDARY" && element.type !== "SECTOR" && element.properties.blocksLocation && elementContainsPoint(element, tuple));
}

export function validateYardMapDocument(input: unknown): YardMapDocument {
  if (!input || typeof input !== "object") throw new Error("Documento do mapa inválido");
  const raw = input as any;
  const viewBox = raw.viewBox || DEFAULT_VIEWBOX;
  if (!Number.isFinite(viewBox.width) || !Number.isFinite(viewBox.height) || viewBox.width <= 0 || viewBox.height <= 0) throw new Error("ViewBox inválido");
  if (!Array.isArray(raw.elements) || raw.elements.length > 10000) throw new Error("Elementos do mapa inválidos");
  const suppliedLayers = Array.isArray(raw.layers) ? raw.layers : [];
  const layers = DEFAULT_LAYERS.map((fallback) => ({ ...fallback, ...(suppliedLayers.find((layer: any) => layer?.id === fallback.id) || {}) }));
  const settings = raw.settings;
  if (!settings || typeof settings.gridVisible !== "boolean" || typeof settings.snapEnabled !== "boolean" || typeof settings.guidesVisible !== "boolean" || !Number.isFinite(settings.gridSize) || settings.gridSize < 1 || settings.gridSize > 500 || !settings.background || typeof settings.background.visible !== "boolean" || typeof settings.background.locked !== "boolean" || !Number.isFinite(settings.background.opacity) || settings.background.opacity < 0 || settings.background.opacity > 1) throw new Error("Configurações do mapa inválidas");
  const backgroundUrl = settings.background.url;
  if (backgroundUrl !== null && backgroundUrl !== undefined && (typeof backgroundUrl !== "string" || !/^\/uploads\/yard-maps\/[a-z0-9_-]+\.jpg$/i.test(backgroundUrl))) throw new Error("Imagem de referência inválida");
  const legacy = raw.schemaVersion !== 2;
  const elements = raw.elements.map((item: any, index: number) => {
    const normalized = normalizeYardMapElement(item, index);
    return { ...normalized, layerId: legacy ? layerForElementType(normalized.type) : normalized.layerId };
  });
  const document: YardMapDocument = { schemaVersion: 2, viewBox: { width: viewBox.width, height: viewBox.height }, elements, layers, settings };
  const ids = new Set<string>();
  for (const element of elements) {
    if (!element.id || element.id.length > 200 || ids.has(element.id) || !element.name.trim() || element.name.length > 200) throw new Error("Elemento de mapa inválido ou duplicado");
    ids.add(element.id);
    if (element.category !== "GENERIC" && element.category !== categoryForElementType(element.type)) throw new Error(`Categoria inválida em ${element.name}`);
    if (!layers.some((layer) => layer.id === element.layerId)) throw new Error(`Camada inválida em ${element.name}`);
    if (!Number.isFinite(element.zIndex) || typeof element.visible !== "boolean" || typeof element.locked !== "boolean") throw new Error(`Estado inválido em ${element.name}`);
    if ((element.parentId && element.parentId.length > 200) || (element.groupId && element.groupId.length > 200) || !Number.isFinite(Date.parse(element.createdAt)) || !Number.isFinite(Date.parse(element.updatedAt))) throw new Error(`Metadados inválidos em ${element.name}`);
    if (!element.geometry) throw new Error(`Geometria ausente em ${element.name}`);
    const points = geometryPoints(element);
    if (!points.length || points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) throw new Error(`Geometria inválida em ${element.name}`);
    if (element.geometry.kind === "polygon" && points.length < 3) throw new Error(`Polígono incompleto em ${element.name}`);
    if (element.geometry.kind === "polyline" && points.length < 2) throw new Error(`Linha incompleta em ${element.name}`);
    if (element.geometry.kind === "rect" && (element.geometry.width <= 0 || element.geometry.height <= 0)) throw new Error(`Retângulo inválido em ${element.name}`);
    if (points.some(([x, y]) => x < 0 || y < 0 || x > viewBox.width || y > viewBox.height)) throw new Error(`Elemento fora da área do mapa em ${element.name}`);
  }
  for (const element of elements) {
    if (element.parentId && !ids.has(element.parentId)) throw new Error(`Pai inválido em ${element.name}`);
    if (wouldCreateHierarchyCycle(element.id, element.parentId, elements)) throw new Error(`Ciclo de hierarquia em ${element.name}`);
  }
  return document;
}

export function validateAllElementPlacements(document: YardMapDocument) {
  return document.elements.map((element) => ({ element, result: validateElementPlacement(element, document) })).filter((item) => !item.result.valid);
}

export function clampZoom(value: number, minimum = .5, maximum = 8) { return Math.max(minimum, Math.min(maximum, value)); }
export function zoomAtPoint(transform: MapTransform, nextScale: number, anchor: { x: number; y: number }): MapTransform { const scale = clampZoom(nextScale); return { scale, x: anchor.x - ((anchor.x - transform.x) / transform.scale) * scale, y: anchor.y - ((anchor.y - transform.y) / transform.scale) * scale }; }
export function centerPointInViewport(args: { viewportWidth: number; viewportHeight: number; contentWidth: number; contentHeight: number; point: PercentPoint; scale: number }): MapTransform { return { scale: args.scale, x: args.viewportWidth / 2 - args.contentWidth * args.point.xPercent * args.scale, y: args.viewportHeight / 2 - args.contentHeight * args.point.yPercent * args.scale }; }
export function projectPercentToViewport(point: PercentPoint, transform: MapTransform, contentSize: { width: number; height: number }) { return { x: transform.x + point.xPercent * contentSize.width * transform.scale, y: transform.y + point.yPercent * contentSize.height * transform.scale }; }
export function snapPoint(point: MapPoint, gridSize: number, enabled: boolean): MapPoint { return enabled ? [Math.round(point[0] / gridSize) * gridSize, Math.round(point[1] / gridSize) * gridSize] : point; }
