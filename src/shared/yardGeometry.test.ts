import test from "node:test";
import assert from "node:assert/strict";
import {
  centerPointInViewport, getSectorForPoint, isPointInsideYard, percentToSvg,
  projectPercentToViewport, snapPoint, svgToPercent, validateYardMapDocument, zoomAtPoint
} from "./yardGeometry";
import { createEmptyYardMapDocument, type YardMapElement } from "./yardMapConfig";

function polygon(id: string, type: "BOUNDARY" | "SECTOR", points: Array<[number, number]>, code = ""): YardMapElement {
  return {
    id, type, layerId: type === "BOUNDARY" ? "boundaries" : "sectors",
    geometry: { kind: "polygon", points },
    style: { fill: "none", stroke: "#fff", strokeWidth: 2, opacity: 1 },
    properties: { name: code || id, description: "", sector: "", code, status: "", notes: "", icon: "", visible: true, active: true, blocksLocation: false }
  };
}

const document = createEmptyYardMapDocument();
document.elements = [
  polygon("boundary", "BOUNDARY", [[100, 100], [1500, 100], [1500, 1100], [100, 1100]]),
  polygon("north", "SECTOR", [[100, 100], [800, 100], [800, 1100], [100, 1100]], "NORTE"),
  {
    ...polygon("building", "SECTOR", [[0, 0], [1, 0], [1, 1]], ""),
    type: "BUILDING", layerId: "buildings", geometry: { kind: "rect", x: 300, y: 300, width: 200, height: 150 },
    properties: { ...polygon("x", "SECTOR", [[0, 0], [1, 0], [1, 1]]).properties, blocksLocation: true }
  }
];

test("converte coordenadas proporcionais sem depender do tamanho visual", () => {
  assert.deepEqual(percentToSvg({ xPercent: .35, yPercent: .72 }), { x: 560, y: 864 });
  assert.deepEqual(svgToPercent({ x: 560, y: 864 }), { xPercent: .35, yPercent: .72 });
});

test("setores são lidos do documento e aceitam nomes arbitrários", () => {
  assert.equal(getSectorForPoint({ xPercent: .25, yPercent: .5 }, document), "NORTE");
  assert.equal(getSectorForPoint({ xPercent: .75, yPercent: .5 }, document), null);
});

test("limite oficial aceita o pátio e objetos bloqueadores rejeitam posições", () => {
  assert.equal(isPointInsideYard({ xPercent: .05, yPercent: .05 }, document), false);
  assert.equal(isPointInsideYard({ xPercent: .7, yPercent: .8 }, document), true);
  assert.equal(isPointInsideYard({ xPercent: .25, yPercent: .32 }, document), false);
});

test("valida o contrato JSON e rejeita geometrias incompletas", () => {
  assert.equal(validateYardMapDocument(document).schemaVersion, 1);
  assert.throws(() => validateYardMapDocument({ ...document, elements: [{ ...document.elements[0], geometry: { kind: "polygon", points: [[0, 0], [1, 1]] } }] }));
});

test("snap, zoom e centralização preservam coordenadas", () => {
  assert.deepEqual(snapPoint([124, 139], 25, true), [125, 150]);
  const initial = { scale: 1.25, x: -120, y: -40 }; const anchor = { x: 320, y: 240 };
  const before = { x: (anchor.x - initial.x) / initial.scale, y: (anchor.y - initial.y) / initial.scale };
  const zoomed = zoomAtPoint(initial, 2.5, anchor);
  assert.equal((anchor.x - zoomed.x) / zoomed.scale, before.x);
  const centered = centerPointInViewport({ viewportWidth: 390, viewportHeight: 520, contentWidth: 560, contentHeight: 420, point: { xPercent: .62, yPercent: .74 }, scale: 2 });
  assert.equal(centered.x + 560 * .62 * 2, 195);
  assert.equal(centered.y + 420 * .74 * 2, 260);
});

test("pins acompanham zoom, pan e responsividade usando proporções", () => {
  assert.deepEqual(projectPercentToViewport({ xPercent: .35, yPercent: .72 }, { scale: 2, x: -100, y: 30 }, { width: 800, height: 600 }), { x: 460, y: 894 });
});
