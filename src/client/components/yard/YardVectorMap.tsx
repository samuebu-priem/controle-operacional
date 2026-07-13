import { geometryPoints, validateYardMapDocument } from "../../../shared/yardGeometry";
import type { MapPoint, YardMapDocument, YardMapElement } from "../../../shared/yardMapConfig";

type Props = {
  document: YardMapDocument;
  svgRef?: any;
  selectedId?: string | null;
  activeSector?: string | null;
  draftPoints?: MapPoint[];
  editor?: boolean;
  onElementSelect?: (element: YardMapElement, event: any) => void;
};

function points(value: readonly MapPoint[]) { return value.map(([x, y]) => `${x},${y}`).join(" "); }

function center(element: YardMapElement): MapPoint {
  const value = geometryPoints(element);
  return [value.reduce((sum, point) => sum + point[0], 0) / value.length, value.reduce((sum, point) => sum + point[1], 0) / value.length];
}

function measurement(element: YardMapElement) {
  if (element.type !== "MEASURE" || element.geometry.kind !== "polyline") return null;
  const pointsValue = element.geometry.points;
  const length = pointsValue.slice(1).reduce((total, point, index) => total + Math.hypot(point[0] - pointsValue[index][0], point[1] - pointsValue[index][1]), 0);
  return `${Math.round(length)} u`;
}

function ElementShape({ element, selected, onSelect }: { element: YardMapElement; selected: boolean; onSelect?: (event: any) => void }) {
  const geometry = element.geometry;
  const style = { fill: element.style.fill, stroke: element.style.stroke, strokeWidth: element.style.strokeWidth, opacity: element.style.opacity };
  const common = { className: `yard-map-object${selected ? " yard-map-object--selected" : ""}`, style, onPointerDown: (event: any) => { event.stopPropagation(); onSelect?.(event); } };
  if (element.type === "TEXT" && geometry.kind === "point") return <text {...common} x={geometry.x} y={geometry.y}>{element.properties.name}</text>;
  if (geometry.kind === "point") return <g {...common} transform={`translate(${geometry.x} ${geometry.y})`}><circle r="13" /><path d="M0 13 L-7 29 L7 29 Z" /></g>;
  if (geometry.kind === "rect") return <rect {...common} x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} rx={element.type === "PARKING" || element.type === "BOX" ? 2 : 8} />;
  if (geometry.kind === "polyline") return <polyline {...common} points={points(geometry.points)} fill="none" strokeWidth={geometry.width || element.style.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
  return <polygon {...common} points={points(geometry.points)} />;
}

export default function YardVectorMap({ document: rawDocument, svgRef, selectedId, activeSector, draftPoints = [], editor = false, onElementSelect }: Props) {
  const document = validateYardMapDocument(rawDocument);
  const layers = new Map(document.layers.map((layer) => [layer.id, layer]));
  const elements = [...document.elements]
    .filter((element) => element.properties.visible && (layers.get(element.layerId)?.visible ?? true))
    .sort((a, b) => (layers.get(a.layerId)?.order ?? 0) - (layers.get(b.layerId)?.order ?? 0));
  const backgroundLayer = layers.get("background");
  const background = document.settings.background;

  return (
    <svg ref={svgRef} className="yard-vector-map" viewBox={`0 0 ${document.viewBox.width} ${document.viewBox.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa editável do pátio">
      <defs>
        <pattern id="yard-editor-grid" width={document.settings.gridSize} height={document.settings.gridSize} patternUnits="userSpaceOnUse">
          <path d={`M ${document.settings.gridSize} 0 L 0 0 0 ${document.settings.gridSize}`} fill="none" stroke="rgba(125,211,252,.16)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={document.viewBox.width} height={document.viewBox.height} fill="#07111d" />
      {background.url && background.visible && backgroundLayer?.visible !== false ? <image href={background.url} width={document.viewBox.width} height={document.viewBox.height} opacity={background.opacity} preserveAspectRatio="xMidYMid meet" /> : null}
      {editor && document.settings.gridVisible ? <rect width={document.viewBox.width} height={document.viewBox.height} fill="url(#yard-editor-grid)" pointerEvents="none" /> : null}
      {editor && document.settings.guidesVisible ? <g className="yard-map-guides" pointerEvents="none"><line x1={document.viewBox.width / 2} y1="0" x2={document.viewBox.width / 2} y2={document.viewBox.height} /><line x1="0" y1={document.viewBox.height / 2} x2={document.viewBox.width} y2={document.viewBox.height / 2} /></g> : null}
      {elements.map((element) => {
        const sectorActive = element.type === "SECTOR" && activeSector && (element.properties.code === activeSector || element.properties.name === activeSector);
        return (
          <g key={element.id} data-element-id={element.id} className={sectorActive ? "yard-map-sector-active" : ""}>
            <ElementShape element={element} selected={element.id === selectedId} onSelect={(event) => onElementSelect?.(element, event)} />
            {element.type === "SECTOR" ? <text className="yard-map-sector-label" x={center(element)[0]} y={center(element)[1]} textAnchor="middle" pointerEvents="none">{element.properties.code || element.properties.name}</text> : null}
            {measurement(element) ? <text className="yard-map-measure-label" x={center(element)[0]} y={center(element)[1]} textAnchor="middle" pointerEvents="none">{measurement(element)}</text> : null}
            {!editor && element.type !== "BOUNDARY" && element.type !== "SECTOR" && element.properties.name && element.geometry.kind !== "point" ? <text className="yard-map-element-label" x={center(element)[0]} y={center(element)[1]} textAnchor="middle" pointerEvents="none">{element.properties.name}</text> : null}
          </g>
        );
      })}
      {draftPoints.length ? <polyline className="yard-map-draft" points={points(draftPoints)} fill="rgba(56,189,248,.12)" stroke="#38bdf8" strokeWidth="4" strokeDasharray="10 8" /> : null}
    </svg>
  );
}
