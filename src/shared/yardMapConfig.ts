export type MapPoint = readonly [number, number];
export type YardElementType =
  | "BOUNDARY" | "POLYGON" | "RECTANGLE" | "AREA" | "PIN" | "ROAD" | "BUILDING"
  | "BOX" | "GATE" | "PARKING" | "TEXT" | "MEASURE" | "SECTOR" | "WASH"
  | "INSPECTION" | "MAINTENANCE" | "SHED" | "CORRIDOR";

export type YardGeometry =
  | { kind: "polygon"; points: MapPoint[] }
  | { kind: "polyline"; points: MapPoint[]; width: number }
  | { kind: "rect"; x: number; y: number; width: number; height: number }
  | { kind: "point"; x: number; y: number };

export type YardMapElement = {
  id: string;
  type: YardElementType;
  layerId: string;
  geometry: YardGeometry;
  style: { fill: string; stroke: string; strokeWidth: number; opacity: number };
  properties: {
    name: string;
    description: string;
    sector: string;
    code: string;
    status: string;
    notes: string;
    icon: string;
    visible: boolean;
    active: boolean;
    blocksLocation: boolean;
  };
};

export type YardMapLayer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
};

export type YardMapDocument = {
  schemaVersion: 1;
  viewBox: { width: number; height: number };
  elements: YardMapElement[];
  layers: YardMapLayer[];
  settings: {
    gridVisible: boolean;
    snapEnabled: boolean;
    guidesVisible: boolean;
    gridSize: number;
    background: { url: string | null; opacity: number; visible: boolean; locked: boolean };
  };
};

export const DEFAULT_VIEWBOX = { width: 1600, height: 1200 } as const;

export const DEFAULT_LAYERS: YardMapLayer[] = [
  { id: "background", name: "Imagem", visible: true, locked: true, order: 0 },
  { id: "boundaries", name: "Limites", visible: true, locked: false, order: 10 },
  { id: "sectors", name: "Setores", visible: true, locked: false, order: 20 },
  { id: "roads", name: "Ruas e corredores", visible: true, locked: false, order: 30 },
  { id: "buildings", name: "Prédios", visible: true, locked: false, order: 40 },
  { id: "boxes", name: "Boxes", visible: true, locked: false, order: 50 },
  { id: "parking", name: "Vagas", visible: true, locked: false, order: 60 },
  { id: "texts", name: "Textos", visible: true, locked: false, order: 70 },
  { id: "pins", name: "Pins", visible: true, locked: true, order: 80 }
];

export function createEmptyYardMapDocument(): YardMapDocument {
  return {
    schemaVersion: 1,
    viewBox: { ...DEFAULT_VIEWBOX },
    elements: [],
    layers: DEFAULT_LAYERS.map((layer) => ({ ...layer })),
    settings: {
      gridVisible: true,
      snapEnabled: true,
      guidesVisible: true,
      gridSize: 25,
      background: { url: null, opacity: 0.45, visible: true, locked: true }
    }
  };
}

export function layerForElementType(type: YardElementType) {
  if (type === "BOUNDARY") return "boundaries";
  if (type === "SECTOR") return "sectors";
  if (type === "ROAD" || type === "CORRIDOR") return "roads";
  if (["BUILDING", "GATE", "WASH", "INSPECTION", "MAINTENANCE", "SHED"].includes(type)) return "buildings";
  if (type === "BOX") return "boxes";
  if (type === "PARKING") return "parking";
  if (type === "TEXT" || type === "MEASURE") return "texts";
  if (type === "PIN") return "pins";
  return "sectors";
}
