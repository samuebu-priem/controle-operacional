export type YardBranchCode = "PAULINIA";
export type YardSectorId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
export type MapPoint = readonly [number, number];

export type MapPolygon = {
  id: string;
  name: string;
  points: readonly MapPoint[];
};

export type MapRoad = {
  id: string;
  name: string;
  points: readonly MapPoint[];
  width: number;
  kind: "PUBLIC" | "INTERNAL";
};

export type YardSector = MapPolygon & {
  sector: YardSectorId;
  areaId: "MAIN" | "ANNEX";
  labelPoint: MapPoint;
  camera: { xPercent: number; yPercent: number; zoom: number };
};

export type ParkingRow = {
  id: string;
  start: MapPoint;
  end: MapPoint;
  slots: number;
};

export const YARD_VIEWBOX = { width: 1600, height: 1200 } as const;

const areas: readonly MapPolygon[] = [
  {
    id: "MAIN",
    name: "Área Principal",
    points: [[92, 370], [120, 245], [196, 145], [330, 86], [510, 78], [676, 126], [808, 224], [902, 352], [888, 456], [822, 540], [724, 602], [642, 684], [524, 686], [454, 638], [312, 626], [184, 568], [112, 474]]
  },
  {
    id: "ANNEX",
    name: "Área Anexa",
    points: [[630, 766], [688, 680], [770, 622], [874, 584], [1010, 596], [1134, 652], [1248, 690], [1402, 716], [1516, 802], [1572, 934], [1538, 1054], [1434, 1124], [1264, 1120], [1082, 1070], [924, 1010], [790, 938], [674, 856]]
  }
] as const;

const roads: readonly MapRoad[] = [
  {
    id: "DIVIDER",
    name: "Via entre os terrenos",
    kind: "PUBLIC",
    width: 70,
    points: [[470, 760], [590, 690], [700, 614], [818, 554], [944, 536], [1064, 570]]
  },
  {
    id: "MAIN_AXIS",
    name: "Corredor Principal",
    kind: "INTERNAL",
    width: 34,
    points: [[176, 430], [354, 382], [538, 360], [738, 382], [842, 430]]
  },
  {
    id: "MAIN_CROSS",
    name: "Acesso aos boxes",
    kind: "INTERNAL",
    width: 30,
    points: [[446, 142], [440, 286], [434, 424], [426, 574]]
  },
  {
    id: "ANNEX_AXIS",
    name: "Corredor do Anexo",
    kind: "INTERNAL",
    width: 38,
    points: [[710, 806], [902, 788], [1084, 796], [1260, 838], [1450, 908]]
  },
  {
    id: "ANNEX_CROSS",
    name: "Acesso interno do Anexo",
    kind: "INTERNAL",
    width: 30,
    points: [[1066, 648], [1054, 774], [1072, 916], [1104, 1032]]
  }
] as const;

const buildings: readonly MapPolygon[] = [
  { id: "MAIN_SHED", name: "Galpão Principal", points: [[254, 300], [650, 260], [722, 342], [310, 390]] },
  { id: "WASH", name: "Lavagem", points: [[214, 482], [360, 454], [384, 526], [242, 552]] },
  { id: "INSPECTION", name: "Inspeção", points: [[396, 466], [548, 452], [558, 532], [410, 546]] },
  { id: "MAINTENANCE", name: "Manutenção", points: [[578, 438], [738, 414], [768, 500], [606, 526]] },
  { id: "ADMIN", name: "Administrativo", points: [[594, 560], [690, 536], [728, 596], [634, 630]] },
  { id: "GATE", name: "Portaria", points: [[554, 630], [610, 616], [624, 654], [570, 668]] },
  { id: "ANNEX_SHED", name: "Galpão Anexo", points: [[894, 852], [1160, 870], [1150, 958], [916, 938]] },
  { id: "ANNEX_SUPPORT", name: "Apoio Operacional", points: [[734, 704], [838, 660], [868, 722], [764, 758]] }
] as const;

const parkingRows: readonly ParkingRow[] = [
  { id: "A_ROW_1", start: [188, 270], end: [382, 196], slots: 9 },
  { id: "A_ROW_2", start: [208, 300], end: [400, 244], slots: 8 },
  { id: "B_ROW_1", start: [500, 170], end: [690, 222], slots: 8 },
  { id: "B_ROW_2", start: [492, 218], end: [714, 282], slots: 9 },
  { id: "C_ROW_1", start: [166, 468], end: [192, 544], slots: 5 },
  { id: "D_ROW_1", start: [492, 430], end: [570, 438], slots: 5 },
  { id: "E_ROW_1", start: [846, 650], end: [986, 646], slots: 7 },
  { id: "F_ROW_1", start: [1130, 722], end: [1394, 784], slots: 11 },
  { id: "F_ROW_2", start: [1124, 766], end: [1420, 838], slots: 12 },
  { id: "G_ROW_1", start: [724, 850], end: [870, 832], slots: 7 },
  { id: "H_ROW_1", start: [1204, 890], end: [1452, 964], slots: 10 },
  { id: "H_ROW_2", start: [1190, 948], end: [1430, 1022], slots: 10 }
] as const;

const yardSectors: readonly YardSector[] = [
  { id: "SECTOR_A", sector: "A", name: "Pátio Norte", areaId: "MAIN", points: [[166, 250], [224, 166], [402, 112], [420, 276], [250, 310]], labelPoint: [286, 218], camera: { xPercent: 0.18, yPercent: 0.18, zoom: 2.2 } },
  { id: "SECTOR_B", sector: "B", name: "Pátio Superior", areaId: "MAIN", points: [[466, 112], [628, 146], [776, 246], [704, 318], [470, 276]], labelPoint: [598, 218], camera: { xPercent: 0.38, yPercent: 0.18, zoom: 2.2 } },
  { id: "SECTOR_C", sector: "C", name: "Pátio Oeste", areaId: "MAIN", points: [[146, 454], [278, 414], [404, 410], [396, 586], [286, 582], [188, 536]], labelPoint: [276, 496], camera: { xPercent: 0.17, yPercent: 0.42, zoom: 2.25 } },
  { id: "SECTOR_D", sector: "D", name: "Pátio de Apoio", areaId: "MAIN", points: [[468, 410], [806, 438], [772, 516], [684, 560], [616, 642], [466, 606]], labelPoint: [628, 518], camera: { xPercent: 0.40, yPercent: 0.44, zoom: 2.15 } },
  { id: "SECTOR_E", sector: "E", name: "Anexo Norte", areaId: "ANNEX", points: [[700, 744], [786, 650], [1004, 626], [1028, 758], [884, 766]], labelPoint: [858, 700], camera: { xPercent: 0.54, yPercent: 0.59, zoom: 2.15 } },
  { id: "SECTOR_F", sector: "F", name: "Anexo Leste", areaId: "ANNEX", points: [[1088, 682], [1234, 718], [1384, 748], [1490, 824], [1464, 876], [1248, 812], [1090, 776]], labelPoint: [1282, 766], camera: { xPercent: 0.80, yPercent: 0.65, zoom: 2.05 } },
  { id: "SECTOR_G", sector: "G", name: "Anexo Oeste", areaId: "ANNEX", points: [[694, 838], [876, 818], [1028, 824], [1044, 976], [928, 970], [802, 910]], labelPoint: [864, 884], camera: { xPercent: 0.54, yPercent: 0.75, zoom: 2.15 } },
  { id: "SECTOR_H", sector: "H", name: "Anexo Sul", areaId: "ANNEX", points: [[1102, 840], [1248, 854], [1452, 922], [1510, 984], [1482, 1040], [1408, 1080], [1268, 1076], [1122, 1032]], labelPoint: [1308, 970], camera: { xPercent: 0.82, yPercent: 0.82, zoom: 2.0 } }
] as const;

const labels = [
  { id: "MAIN_TITLE", text: "ÁREA PRINCIPAL", point: [500, 108] as MapPoint, kind: "AREA" },
  { id: "ANNEX_TITLE", text: "ÁREA ANEXA", point: [1280, 1100] as MapPoint, kind: "AREA" },
  ...buildings.map((building) => ({
    id: `${building.id}_LABEL`,
    text: building.name,
    point: [
      building.points.reduce((sum, point) => sum + point[0], 0) / building.points.length,
      building.points.reduce((sum, point) => sum + point[1], 0) / building.points.length
    ] as MapPoint,
    kind: "BUILDING"
  }))
] as const;

export const yardMapConfig = {
  branch: "PAULINIA" as YardBranchCode,
  name: "Cavalinho — Paulínia",
  viewBox: YARD_VIEWBOX,
  areas,
  roads,
  buildings,
  parkingRows,
  labels,
  yardSectors,
  camera: {
    default: { xPercent: 0.5, yPercent: 0.5, zoom: 1 },
    minZoom: 1,
    maxZoom: 4
  },
  colors: {
    background: "#07111d",
    yardFill: "#102a2d",
    boundary: "#39ff88",
    roadPublic: "#374151",
    roadInternal: "#243647",
    building: "#526577",
    buildingRoof: "#6f8395",
    sectorFill: "#12334a",
    sectorHighlight: "#176b85",
    text: "#e5f7ff",
    muted: "#94a3b8"
  }
} as const;

export function getYardMapConfig(branch: YardBranchCode = "PAULINIA") {
  if (branch !== yardMapConfig.branch) return null;
  return yardMapConfig;
}
