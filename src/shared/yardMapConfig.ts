export type MapPoint = readonly [number, number];

export type YardElementCategory = "CONTAINER" | "STRUCTURE" | "TRAFFIC" | "SLOT" | "ANNOTATION" | "GENERIC";

export type YardElementType =
  | "YARD_BOUNDARY" | "OPERATIONAL_AREA" | "SECTOR" | "PARKING_AREA" | "BUILDING_AREA"
  | "WASHING_AREA" | "INSPECTION_AREA" | "MAINTENANCE_AREA"
  | "BUILDING" | "BOX" | "GATE" | "PORTARIA" | "SHED" | "WALL" | "FENCE" | "PLATFORM"
  | "ROAD" | "INTERNAL_ROAD" | "ACCESS" | "CORRIDOR" | "PEDESTRIAN_PATH"
  | "PARKING_SLOT" | "TRAILER_SLOT" | "TRUCK_SLOT" | "WASHING_SLOT" | "INSPECTION_SLOT"
  | "TEXT" | "LABEL" | "ICON" | "MEASURE" | "GENERIC";

export const CONTAINER_TYPES: readonly YardElementType[] = [
  "YARD_BOUNDARY", "OPERATIONAL_AREA", "SECTOR", "PARKING_AREA", "BUILDING_AREA",
  "WASHING_AREA", "INSPECTION_AREA", "MAINTENANCE_AREA"
];
export const STRUCTURE_TYPES: readonly YardElementType[] = ["BUILDING", "BOX", "GATE", "PORTARIA", "SHED", "WALL", "FENCE", "PLATFORM"];
export const TRAFFIC_TYPES: readonly YardElementType[] = ["ROAD", "INTERNAL_ROAD", "ACCESS", "CORRIDOR", "PEDESTRIAN_PATH"];
export const SLOT_TYPES: readonly YardElementType[] = ["PARKING_SLOT", "TRAILER_SLOT", "TRUCK_SLOT", "WASHING_SLOT", "INSPECTION_SLOT"];
export const ANNOTATION_TYPES: readonly YardElementType[] = ["TEXT", "LABEL", "ICON", "MEASURE"];

export type YardGeometry =
  | { kind: "polygon"; points: MapPoint[] }
  | { kind: "polyline"; points: MapPoint[]; width: number }
  | { kind: "rect"; x: number; y: number; width: number; height: number; rotation?: number }
  | { kind: "point"; x: number; y: number };

export type YardElementProperties = {
  description: string;
  code: string;
  status: string;
  notes: string;
  icon: string;
  active: boolean;
  allowsChildren: boolean;
  moveChildren: boolean;
  capacity: number | null;
  equipmentType: string;
  purpose: string;
  number: string;
  direction: string;
  accessAllowed: boolean;
  groupSpacing: number | null;
  groupGapY: number | null;
  groupRows: number | null;
  groupColumns: number | null;
  blocksLocation: boolean;
  allowOutsideBoundary: boolean;
};

export type YardMapElement = {
  id: string;
  parentId: string | null;
  groupId: string | null;
  category: YardElementCategory;
  type: YardElementType;
  name: string;
  layerId: string;
  geometry: YardGeometry;
  style: { fill: string; stroke: string; strokeWidth: number; opacity: number };
  properties: YardElementProperties;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type YardMapLayer = { id: string; name: string; visible: boolean; locked: boolean; order: number };

export type YardMapDocument = {
  schemaVersion: 2;
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
  { id: "boundaries", name: "Limite da filial", visible: true, locked: false, order: 10 },
  { id: "areas", name: "Áreas operacionais", visible: true, locked: false, order: 20 },
  { id: "sectors", name: "Setores", visible: true, locked: false, order: 30 },
  { id: "traffic", name: "Ruas e corredores", visible: true, locked: false, order: 40 },
  { id: "slots", name: "Vagas", visible: true, locked: false, order: 50 },
  { id: "structures", name: "Prédios e estruturas", visible: true, locked: false, order: 60 },
  { id: "annotations", name: "Labels e medidas", visible: true, locked: false, order: 70 },
  { id: "pins", name: "Pins das frotas", visible: true, locked: true, order: 80 }
];

export const ELEMENT_TYPE_LABELS: Record<YardElementType, string> = {
  YARD_BOUNDARY: "Limite da filial", OPERATIONAL_AREA: "Área operacional", SECTOR: "Setor", PARKING_AREA: "Área de estacionamento",
  BUILDING_AREA: "Área de edificações", WASHING_AREA: "Área de lavagem", INSPECTION_AREA: "Área de inspeção", MAINTENANCE_AREA: "Área de manutenção",
  BUILDING: "Prédio", BOX: "Box", GATE: "Portão", PORTARIA: "Portaria", SHED: "Galpão", WALL: "Muro", FENCE: "Cerca", PLATFORM: "Plataforma",
  ROAD: "Rua", INTERNAL_ROAD: "Rua interna", ACCESS: "Acesso", CORRIDOR: "Corredor", PEDESTRIAN_PATH: "Caminho de pedestres",
  PARKING_SLOT: "Vaga", TRAILER_SLOT: "Vaga de carreta", TRUCK_SLOT: "Vaga de caminhão", WASHING_SLOT: "Vaga de lavagem", INSPECTION_SLOT: "Vaga de inspeção",
  TEXT: "Texto", LABEL: "Label", ICON: "Ícone", MEASURE: "Medida", GENERIC: "Elemento genérico"
};

export function categoryForElementType(type: YardElementType): YardElementCategory {
  if (CONTAINER_TYPES.includes(type)) return "CONTAINER";
  if (STRUCTURE_TYPES.includes(type)) return "STRUCTURE";
  if (TRAFFIC_TYPES.includes(type)) return "TRAFFIC";
  if (SLOT_TYPES.includes(type)) return "SLOT";
  if (ANNOTATION_TYPES.includes(type)) return "ANNOTATION";
  return "GENERIC";
}

export function layerForElementType(type: YardElementType) {
  if (type === "YARD_BOUNDARY") return "boundaries";
  if (["OPERATIONAL_AREA", "PARKING_AREA", "BUILDING_AREA", "WASHING_AREA", "INSPECTION_AREA", "MAINTENANCE_AREA"].includes(type)) return "areas";
  if (type === "SECTOR") return "sectors";
  if (TRAFFIC_TYPES.includes(type)) return "traffic";
  if (SLOT_TYPES.includes(type)) return "slots";
  if (STRUCTURE_TYPES.includes(type)) return "structures";
  if (ANNOTATION_TYPES.includes(type)) return "annotations";
  return "areas";
}

export function defaultElementProperties(type: YardElementType): YardElementProperties {
  return {
    description: "", code: "", status: "DISPONIVEL", notes: "", icon: "", active: true,
    allowsChildren: CONTAINER_TYPES.includes(type), moveChildren: true, capacity: null, equipmentType: "",
    purpose: "", number: "", direction: "MÃO_DUPLA", accessAllowed: true, groupSpacing: null, groupGapY: null, groupRows: null, groupColumns: null,
    blocksLocation: ["BUILDING", "SHED", "WALL", "FENCE", "WASHING_AREA", "MAINTENANCE_AREA"].includes(type),
    allowOutsideBoundary: false
  };
}

const legacyTypes: Record<string, YardElementType> = {
  BOUNDARY: "YARD_BOUNDARY", POLYGON: "OPERATIONAL_AREA", RECTANGLE: "OPERATIONAL_AREA", AREA: "OPERATIONAL_AREA",
  PIN: "ICON", PARKING: "PARKING_SLOT", WASH: "WASHING_AREA", INSPECTION: "INSPECTION_AREA", MAINTENANCE: "MAINTENANCE_AREA"
};

export function normalizeYardMapElement(input: any, index = 0): YardMapElement {
  const rawType = String(input?.type || "GENERIC");
  const type = legacyTypes[rawType] || (rawType in ELEMENT_TYPE_LABELS ? rawType as YardElementType : "GENERIC");
  const now = new Date().toISOString();
  const legacy = input?.properties || {};
  const defaults = defaultElementProperties(type);
  return {
    id: String(input?.id || globalThis.crypto?.randomUUID?.() || `element-${Date.now()}-${index}`),
    parentId: typeof input?.parentId === "string" && input.parentId ? input.parentId : null,
    groupId: typeof input?.groupId === "string" && input.groupId ? input.groupId : null,
    category: input?.category === "GENERIC" && type !== "YARD_BOUNDARY" ? "GENERIC" : categoryForElementType(type), type,
    name: String(input?.name || legacy.name || ELEMENT_TYPE_LABELS[type]),
    layerId: String(input?.layerId || layerForElementType(type)),
    geometry: input?.geometry,
    style: { fill: String(input?.style?.fill ?? "rgba(56,189,248,.16)"), stroke: String(input?.style?.stroke ?? "#38bdf8"), strokeWidth: Number(input?.style?.strokeWidth ?? 3), opacity: Number(input?.style?.opacity ?? 1) },
    properties: {
      ...defaults,
      description: String(legacy.description ?? ""), code: String(legacy.code ?? ""), status: String(legacy.status ?? "DISPONIVEL"), notes: String(legacy.notes ?? ""), icon: String(legacy.icon ?? ""),
      active: legacy.active !== false, allowsChildren: legacy.allowsChildren ?? defaults.allowsChildren, moveChildren: legacy.moveChildren ?? true,
      capacity: legacy.capacity !== null && legacy.capacity !== undefined && legacy.capacity !== "" && Number.isFinite(Number(legacy.capacity)) ? Number(legacy.capacity) : null, equipmentType: String(legacy.equipmentType ?? ""), purpose: String(legacy.purpose ?? ""),
      number: String(legacy.number ?? ""), direction: String(legacy.direction ?? "MÃO_DUPLA"), accessAllowed: legacy.accessAllowed !== false,
      groupSpacing: legacy.groupSpacing !== null && legacy.groupSpacing !== undefined && legacy.groupSpacing !== "" && Number.isFinite(Number(legacy.groupSpacing)) ? Number(legacy.groupSpacing) : null,
      groupGapY: legacy.groupGapY !== null && legacy.groupGapY !== undefined && legacy.groupGapY !== "" && Number.isFinite(Number(legacy.groupGapY)) ? Number(legacy.groupGapY) : null,
      groupRows: legacy.groupRows !== null && legacy.groupRows !== undefined && legacy.groupRows !== "" && Number.isFinite(Number(legacy.groupRows)) ? Number(legacy.groupRows) : null,
      groupColumns: legacy.groupColumns !== null && legacy.groupColumns !== undefined && legacy.groupColumns !== "" && Number.isFinite(Number(legacy.groupColumns)) ? Number(legacy.groupColumns) : null,
      blocksLocation: legacy.blocksLocation ?? defaults.blocksLocation, allowOutsideBoundary: legacy.allowOutsideBoundary === true
    },
    zIndex: Number.isFinite(Number(input?.zIndex)) ? Number(input.zIndex) : (index + 1) * 10,
    locked: input?.locked === true,
    visible: input?.visible ?? legacy.visible !== false,
    createdAt: String(input?.createdAt || now), updatedAt: String(input?.updatedAt || now)
  };
}

export function createEmptyYardMapDocument(): YardMapDocument {
  return {
    schemaVersion: 2, viewBox: { ...DEFAULT_VIEWBOX }, elements: [], layers: DEFAULT_LAYERS.map((layer) => ({ ...layer })),
    settings: { gridVisible: true, snapEnabled: true, guidesVisible: true, gridSize: 25, background: { url: null, opacity: .45, visible: true, locked: true } }
  };
}
