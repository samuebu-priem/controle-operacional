import { elementBounds, geometryPoints, validateYardMapDocument } from "../../../shared/yardGeometry";
import type { MapPoint, YardMapDocument, YardMapElement } from "../../../shared/yardMapConfig";

type Props = {
  document: YardMapDocument;
  svgRef?: any;
  selectedId?: string | null;
  selectedIds?: string[];
  activeSector?: string | null;
  draftPoints?: MapPoint[];
  previewElements?: YardMapElement[];
  editor?: boolean;
  onElementSelect?: (element: YardMapElement, event: any) => void;
};

function points(value: readonly MapPoint[]) { return value.map(([x, y]) => `${x},${y}`).join(" "); }
function center(element: YardMapElement): MapPoint { const bounds = elementBounds(element); return [bounds.centerX, bounds.centerY]; }
function measurement(element: YardMapElement) {
  if (element.type !== "MEASURE" || element.geometry.kind !== "polyline") return null;
  const values = element.geometry.points;
  return `${Math.round(values.slice(1).reduce((total, point, index) => total + Math.hypot(point[0] - values[index][0], point[1] - values[index][1]), 0))} u`;
}

function ElementShape({ element, selected, descendant, preview, onSelect }: { element: YardMapElement; selected: boolean; descendant: boolean; preview?: boolean; onSelect?: (event: any) => void }) {
  const geometry = element.geometry;
  const style = { fill: element.style.fill, stroke: element.style.stroke, strokeWidth: element.style.strokeWidth, opacity: preview ? .48 : element.style.opacity };
  const common = {
    className: `yard-map-object yard-map-object--${element.category.toLowerCase()} yard-map-object--type-${element.type.toLowerCase()}${selected ? " yard-map-object--selected" : ""}${descendant ? " yard-map-object--descendant" : ""}${preview ? " yard-map-object--preview" : ""}`,
    style, onPointerDown: (event: any) => { event.stopPropagation(); onSelect?.(event); }
  };
  if ((element.type === "TEXT" || element.type === "LABEL") && geometry.kind === "point") return <text {...common} x={geometry.x} y={geometry.y}>{element.name}</text>;
  if (geometry.kind === "point") return <g {...common} transform={`translate(${geometry.x} ${geometry.y})`}><circle r="13" /><path d="M0 13 L-7 29 L7 29 Z" /></g>;
  if (geometry.kind === "rect") {
    const cx = geometry.x + geometry.width / 2, cy = geometry.y + geometry.height / 2;
    return <rect {...common} x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} rx={element.category === "SLOT" ? 2 : 7} transform={geometry.rotation ? `rotate(${geometry.rotation} ${cx} ${cy})` : undefined} />;
  }
  if (geometry.kind === "polyline") return <polyline {...common} points={points(geometry.points)} fill="none" strokeWidth={geometry.width || element.style.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
  return <polygon {...common} points={points(geometry.points)} />;
}

function descendantsOf(selected: Set<string>, elements: YardMapElement[]) {
  const descendants = new Set<string>(); let changed = true;
  while (changed) { changed = false; for (const element of elements) if (element.parentId && (selected.has(element.parentId) || descendants.has(element.parentId)) && !descendants.has(element.id)) { descendants.add(element.id); changed = true; } }
  return descendants;
}

export default function YardVectorMap({ document: rawDocument, svgRef, selectedId, selectedIds = [], activeSector, draftPoints = [], previewElements = [], editor = false, onElementSelect }: Props) {
  const document = validateYardMapDocument(rawDocument);
  const layers = new Map(document.layers.map((layer) => [layer.id, layer]));
  const selected = new Set([...selectedIds, ...(selectedId ? [selectedId] : [])]);
  const descendants = descendantsOf(selected, document.elements);
  const elements = [...document.elements]
    .filter((element) => element.visible && element.properties.active && (layers.get(element.layerId)?.visible ?? true))
    .sort((a, b) => a.zIndex - b.zIndex || (layers.get(a.layerId)?.order ?? 0) - (layers.get(b.layerId)?.order ?? 0));
  const ordered = [...elements.filter((element) => !selected.has(element.id)), ...elements.filter((element) => selected.has(element.id))];
  const backgroundLayer = layers.get("background"), background = document.settings.background;

  return <svg ref={svgRef} className="yard-vector-map" viewBox={`0 0 ${document.viewBox.width} ${document.viewBox.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa hierárquico do pátio">
    <defs><pattern id="yard-editor-grid" width={document.settings.gridSize} height={document.settings.gridSize} patternUnits="userSpaceOnUse"><path d={`M ${document.settings.gridSize} 0 L 0 0 0 ${document.settings.gridSize}`} fill="none" stroke="rgba(125,211,252,.16)" strokeWidth="1" /></pattern></defs>
    <rect width={document.viewBox.width} height={document.viewBox.height} fill="#07111d" />
    {background.url && background.visible && backgroundLayer?.visible !== false ? <image href={background.url} width={document.viewBox.width} height={document.viewBox.height} opacity={background.opacity} preserveAspectRatio="xMidYMid meet" /> : null}
    {editor && document.settings.gridVisible ? <rect width={document.viewBox.width} height={document.viewBox.height} fill="url(#yard-editor-grid)" pointerEvents="none" /> : null}
    {editor && document.settings.guidesVisible ? <g className="yard-map-guides" pointerEvents="none"><line x1={document.viewBox.width / 2} y1="0" x2={document.viewBox.width / 2} y2={document.viewBox.height} /><line x1="0" y1={document.viewBox.height / 2} x2={document.viewBox.width} y2={document.viewBox.height / 2} /></g> : null}
    {ordered.map((element) => {
      const sectorActive = element.type === "SECTOR" && activeSector && (element.properties.code === activeSector || element.name === activeSector);
      return <g key={element.id} data-element-id={element.id} className={sectorActive ? "yard-map-sector-active" : ""}>
        <ElementShape element={element} selected={selected.has(element.id)} descendant={descendants.has(element.id)} onSelect={(event) => onElementSelect?.(element, event)} />
        {element.type === "SECTOR" ? <text className="yard-map-sector-label" x={center(element)[0]} y={center(element)[1]} textAnchor="middle" pointerEvents="none">{element.properties.code || element.name}</text> : null}
        {element.category === "SLOT" ? <text className="yard-map-slot-label" x={center(element)[0]} y={center(element)[1]} textAnchor="middle" dominantBaseline="middle" pointerEvents="none">{element.properties.code || element.name}</text> : null}
        {measurement(element) ? <text className="yard-map-measure-label" x={center(element)[0]} y={center(element)[1]} textAnchor="middle" pointerEvents="none">{measurement(element)}</text> : null}
        {!editor && !["YARD_BOUNDARY", "SECTOR"].includes(element.type) && element.name && element.category !== "SLOT" && element.geometry.kind !== "point" ? <text className="yard-map-element-label" x={center(element)[0]} y={center(element)[1]} textAnchor="middle" pointerEvents="none">{element.name}</text> : null}
      </g>;
    })}
    {previewElements.map((element) => <g key={element.id}><ElementShape element={element} selected={false} descendant={false} preview /></g>)}
    {draftPoints.length ? <polyline className="yard-map-draft" points={points(draftPoints)} fill="rgba(56,189,248,.12)" stroke="#38bdf8" strokeWidth="4" strokeDasharray="10 8" /> : null}
  </svg>;
}
