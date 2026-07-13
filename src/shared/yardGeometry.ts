import { DEFAULT_VIEWBOX, type MapPoint, type YardMapDocument, type YardMapElement } from "./yardMapConfig";

export type PercentPoint = { xPercent: number; yPercent: number };
export type MapTransform = { scale: number; x: number; y: number };

export function percentToSvg(point: PercentPoint, viewBox: { width: number; height: number } = DEFAULT_VIEWBOX) {
  return { x: point.xPercent * viewBox.width, y: point.yPercent * viewBox.height };
}

export function svgToPercent(point: { x: number; y: number }, viewBox: { width: number; height: number } = DEFAULT_VIEWBOX): PercentPoint {
  return { xPercent: point.x / viewBox.width, yPercent: point.y / viewBox.height };
}

function pointOnSegment(point: MapPoint, start: MapPoint, end: MapPoint, tolerance = 0.001) {
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
    const start = polygon[previous];
    const end = polygon[current];
    if (pointOnSegment(point, start, end)) return true;
    const intersects = end[1] > point[1] !== start[1] > point[1]
      && point[0] < ((start[0] - end[0]) * (point[1] - end[1])) / (start[1] - end[1]) + end[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

function distanceToSegment(point: MapPoint, start: MapPoint, end: MapPoint) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const ratio = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - (start[0] + ratio * dx), point[1] - (start[1] + ratio * dy));
}

export function geometryPoints(element: YardMapElement): MapPoint[] {
  const geometry = element.geometry;
  if (geometry.kind === "polygon" || geometry.kind === "polyline") return geometry.points;
  if (geometry.kind === "rect") return [
    [geometry.x, geometry.y], [geometry.x + geometry.width, geometry.y],
    [geometry.x + geometry.width, geometry.y + geometry.height], [geometry.x, geometry.y + geometry.height]
  ];
  return [[geometry.x, geometry.y]];
}

export function elementContainsPoint(element: YardMapElement, point: MapPoint) {
  const geometry = element.geometry;
  if (geometry.kind === "polygon" || geometry.kind === "rect") return isPointInPolygon(point, geometryPoints(element));
  if (geometry.kind === "polyline") {
    return geometry.points.slice(1).some((end, index) => distanceToSegment(point, geometry.points[index], end) <= geometry.width / 2);
  }
  return Math.hypot(point[0] - geometry.x, point[1] - geometry.y) <= 16;
}

function usableElements(document: YardMapDocument) {
  const visibleLayers = new Map(document.layers.map((layer) => [layer.id, layer.visible]));
  return document.elements.filter((element) => element.properties.active && element.properties.visible && visibleLayers.get(element.layerId) !== false);
}

export function isPointInsideOfficialBoundary(point: PercentPoint, document: YardMapDocument) {
  if (!Number.isFinite(point.xPercent) || !Number.isFinite(point.yPercent)) return false;
  const svg = percentToSvg(point, document.viewBox);
  const tuple: MapPoint = [svg.x, svg.y];
  return usableElements(document).some((element) => element.type === "BOUNDARY" && elementContainsPoint(element, tuple));
}

export function getSectorForPoint(point: PercentPoint, document: YardMapDocument): string | null {
  if (!isPointInsideOfficialBoundary(point, document)) return null;
  const svg = percentToSvg(point, document.viewBox);
  const sector = usableElements(document).find((element) => element.type === "SECTOR" && elementContainsPoint(element, [svg.x, svg.y]));
  return sector?.properties.code || sector?.properties.name || null;
}

export function isPointInsideYard(point: PercentPoint, document: YardMapDocument) {
  if (!isPointInsideOfficialBoundary(point, document)) return false;
  const svg = percentToSvg(point, document.viewBox);
  const tuple: MapPoint = [svg.x, svg.y];
  return !usableElements(document).some((element) => element.type !== "BOUNDARY" && element.type !== "SECTOR" && element.properties.blocksLocation && elementContainsPoint(element, tuple));
}

export function validateYardMapDocument(input: unknown): YardMapDocument {
  if (!input || typeof input !== "object") throw new Error("Documento do mapa inválido");
  const document = input as YardMapDocument;
  if (document.schemaVersion !== 1 || !document.viewBox || !Array.isArray(document.elements) || !Array.isArray(document.layers)) throw new Error("Estrutura do mapa inválida");
  if (!Number.isFinite(document.viewBox.width) || !Number.isFinite(document.viewBox.height) || document.viewBox.width <= 0 || document.viewBox.height <= 0) throw new Error("ViewBox inválido");
  if (document.elements.length > 10000) throw new Error("O mapa excede o limite de elementos");
  if (!document.settings || typeof document.settings.gridVisible !== "boolean" || typeof document.settings.snapEnabled !== "boolean" || typeof document.settings.guidesVisible !== "boolean" || !Number.isFinite(document.settings.gridSize) || document.settings.gridSize < 1 || document.settings.gridSize > 500 || !document.settings.background || typeof document.settings.background.visible !== "boolean" || typeof document.settings.background.locked !== "boolean" || !Number.isFinite(document.settings.background.opacity) || document.settings.background.opacity < 0 || document.settings.background.opacity > 1) throw new Error("Configurações do mapa inválidas");
  const backgroundUrl = document.settings.background?.url;
  if (backgroundUrl !== null && backgroundUrl !== undefined && (typeof backgroundUrl !== "string" || !/^\/uploads\/yard-maps\/[a-z0-9_-]+\.jpg$/i.test(backgroundUrl))) throw new Error("Imagem de referência inválida");
  const supportedTypes = new Set(["BOUNDARY", "POLYGON", "RECTANGLE", "AREA", "PIN", "ROAD", "BUILDING", "BOX", "GATE", "PARKING", "TEXT", "MEASURE", "SECTOR", "WASH", "INSPECTION", "MAINTENANCE", "SHED", "CORRIDOR"]);
  const layerIds = new Set<string>();
  for (const layer of document.layers) {
    if (!layer?.id || layerIds.has(layer.id) || typeof layer.name !== "string" || typeof layer.visible !== "boolean" || typeof layer.locked !== "boolean" || !Number.isFinite(layer.order)) throw new Error("Camada inválida ou duplicada");
    layerIds.add(layer.id);
  }
  const ids = new Set<string>();
  for (const element of document.elements) {
    if (!element.id || ids.has(element.id) || !supportedTypes.has(element.type) || !layerIds.has(element.layerId) || !element.geometry || !element.properties || !element.style) throw new Error("Elemento de mapa inválido ou duplicado");
    ids.add(element.id);
    if (typeof element.properties.name !== "string" || typeof element.properties.visible !== "boolean" || typeof element.properties.active !== "boolean" || typeof element.properties.blocksLocation !== "boolean") throw new Error(`Propriedades inválidas em ${element.id}`);
    if (typeof element.style.fill !== "string" || typeof element.style.stroke !== "string" || !Number.isFinite(element.style.strokeWidth) || element.style.strokeWidth < 0 || !Number.isFinite(element.style.opacity) || element.style.opacity < 0 || element.style.opacity > 1) throw new Error(`Estilo inválido em ${element.id}`);
    const points = geometryPoints(element);
    if (points.length === 0 || points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) throw new Error(`Geometria inválida em ${element.id}`);
    if (points.some(([x, y]) => x < 0 || y < 0 || x > document.viewBox.width || y > document.viewBox.height)) throw new Error(`Elemento fora da área do mapa em ${element.id}`);
    if (element.geometry.kind === "polygon" && points.length < 3) throw new Error(`Polígono incompleto em ${element.id}`);
    if (element.geometry.kind === "polyline" && points.length < 2) throw new Error(`Linha incompleta em ${element.id}`);
    if (element.geometry.kind === "rect" && (element.geometry.width <= 0 || element.geometry.height <= 0)) throw new Error(`Retângulo inválido em ${element.id}`);
  }
  return document;
}

export function clampZoom(value: number, minimum = 0.5, maximum = 8) { return Math.max(minimum, Math.min(maximum, value)); }

export function zoomAtPoint(transform: MapTransform, nextScale: number, anchor: { x: number; y: number }): MapTransform {
  const scale = clampZoom(nextScale);
  return { scale, x: anchor.x - ((anchor.x - transform.x) / transform.scale) * scale, y: anchor.y - ((anchor.y - transform.y) / transform.scale) * scale };
}

export function centerPointInViewport(args: { viewportWidth: number; viewportHeight: number; contentWidth: number; contentHeight: number; point: PercentPoint; scale: number }): MapTransform {
  return { scale: args.scale, x: args.viewportWidth / 2 - args.contentWidth * args.point.xPercent * args.scale, y: args.viewportHeight / 2 - args.contentHeight * args.point.yPercent * args.scale };
}

export function projectPercentToViewport(point: PercentPoint, transform: MapTransform, contentSize: { width: number; height: number }) {
  return { x: transform.x + point.xPercent * contentSize.width * transform.scale, y: transform.y + point.yPercent * contentSize.height * transform.scale };
}

export function snapPoint(point: MapPoint, gridSize: number, enabled: boolean): MapPoint {
  if (!enabled) return point;
  return [Math.round(point[0] / gridSize) * gridSize, Math.round(point[1] / gridSize) * gridSize];
}
