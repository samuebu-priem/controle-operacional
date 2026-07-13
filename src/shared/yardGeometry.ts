import { YARD_VIEWBOX, getYardMapConfig, type MapPoint, type YardBranchCode, type YardSectorId } from "./yardMapConfig";

export type PercentPoint = { xPercent: number; yPercent: number };
export type MapTransform = { scale: number; x: number; y: number };

export function percentToSvg(point: PercentPoint): { x: number; y: number } {
  return { x: point.xPercent * YARD_VIEWBOX.width, y: point.yPercent * YARD_VIEWBOX.height };
}

export function svgToPercent(point: { x: number; y: number }): PercentPoint {
  return { xPercent: point.x / YARD_VIEWBOX.width, yPercent: point.y / YARD_VIEWBOX.height };
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

function isPointOnRoad(point: MapPoint, branch: YardBranchCode) {
  const config = getYardMapConfig(branch);
  if (!config) return true;
  return config.roads.some((road) => road.points.slice(1).some((end, index) => distanceToSegment(point, road.points[index], end) <= road.width / 2));
}

export function isPointInsideOfficialBoundary(point: PercentPoint, branch: YardBranchCode = "PAULINIA") {
  const config = getYardMapConfig(branch);
  if (!config || !Number.isFinite(point.xPercent) || !Number.isFinite(point.yPercent)) return false;
  const svgPoint = percentToSvg(point);
  return config.areas.some((area) => isPointInPolygon([svgPoint.x, svgPoint.y], area.points));
}

export function getSectorForPoint(point: PercentPoint, branch: YardBranchCode = "PAULINIA"): YardSectorId | null {
  const config = getYardMapConfig(branch);
  if (!config || !isPointInsideOfficialBoundary(point, branch)) return null;
  const svgPoint = percentToSvg(point);
  const tuple = [svgPoint.x, svgPoint.y] as const;
  if (isPointOnRoad(tuple, branch) || config.buildings.some((building) => isPointInPolygon(tuple, building.points))) return null;
  return config.yardSectors.find((sector) => isPointInPolygon(tuple, sector.points))?.sector ?? null;
}

export function isPointInsideYard(point: PercentPoint, branch: YardBranchCode = "PAULINIA") {
  return getSectorForPoint(point, branch) !== null;
}

export function clampZoom(value: number, minimum = 1, maximum = 4) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function zoomAtPoint(transform: MapTransform, nextScale: number, anchor: { x: number; y: number }): MapTransform {
  const scale = clampZoom(nextScale);
  return {
    scale,
    x: anchor.x - ((anchor.x - transform.x) / transform.scale) * scale,
    y: anchor.y - ((anchor.y - transform.y) / transform.scale) * scale
  };
}

export function centerPointInViewport(args: {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  point: PercentPoint;
  scale: number;
}): MapTransform {
  return {
    scale: args.scale,
    x: args.viewportWidth / 2 - args.contentWidth * args.point.xPercent * args.scale,
    y: args.viewportHeight / 2 - args.contentHeight * args.point.yPercent * args.scale
  };
}

export function projectPercentToViewport(
  point: PercentPoint,
  transform: MapTransform,
  contentSize: { width: number; height: number }
) {
  return {
    x: transform.x + point.xPercent * contentSize.width * transform.scale,
    y: transform.y + point.yPercent * contentSize.height * transform.scale
  };
}
