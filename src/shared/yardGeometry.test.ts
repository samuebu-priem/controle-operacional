import test from "node:test";
import assert from "node:assert/strict";
import {
  canElementBeChildOf, centerPointInViewport, findContainingContainer, getSectorForPoint,
  isElementInsideParent, isPointInsideYard, percentToSvg, projectPercentToViewport, snapPoint,
  svgToPercent, validateElementPlacement, validateYardMapDocument, wouldCreateHierarchyCycle, zoomAtPoint
} from "./yardGeometry";
import { categoryForElementType, createEmptyYardMapDocument, defaultElementProperties, layerForElementType, type YardElementType, type YardMapElement } from "./yardMapConfig";

function element(id: string, type: YardElementType, geometry: YardMapElement["geometry"], parentId: string | null = null): YardMapElement {
  const timestamp = "2026-07-14T00:00:00.000Z";
  return { id, parentId, groupId: null, category: categoryForElementType(type), type, name: id, layerId: layerForElementType(type), geometry, style: { fill: "none", stroke: "#fff", strokeWidth: 2, opacity: 1 }, properties: defaultElementProperties(type), zIndex: 10, locked: false, visible: true, createdAt: timestamp, updatedAt: timestamp };
}

const document = createEmptyYardMapDocument();
const boundary = element("boundary", "YARD_BOUNDARY", { kind: "polygon", points: [[50,50],[1550,50],[1550,1150],[50,1150]] });
const operational = element("operational", "OPERATIONAL_AREA", { kind: "polygon", points: [[100,100],[900,100],[900,1000],[100,1000]] }, boundary.id);
const sector = { ...element("sector", "SECTOR", { kind: "polygon", points: [[150,150],[850,150],[850,950],[150,950]] }, operational.id), properties: { ...defaultElementProperties("SECTOR"), code: "NORTE" } };
const parking = element("parking", "PARKING_AREA", { kind: "polygon", points: [[200,200],[700,200],[700,800],[200,800]] }, sector.id);
const slot = { ...element("slot", "PARKING_SLOT", { kind: "rect", x: 250, y: 250, width: 50, height: 100, rotation: 12 }, parking.id), groupId: "row-a" };
const building = element("building", "BUILDING", { kind: "rect", x: 400, y: 400, width: 180, height: 120 }, operational.id);
document.elements = [boundary, operational, sector, parking, slot, building];

test("converte coordenadas proporcionais sem salvar pixels de viewport", () => {
  assert.deepEqual(percentToSvg({ xPercent: .35, yPercent: .72 }), { x: 560, y: 864 });
  assert.deepEqual(svgToPercent({ x: 560, y: 864 }), { xPercent: .35, yPercent: .72 });
});

test("aplica regras semânticas de pai e contenção", () => {
  assert.equal(canElementBeChildOf(slot, parking), true);
  assert.equal(canElementBeChildOf(slot, building), false);
  assert.equal(isElementInsideParent(slot, parking), true);
  assert.equal(validateElementPlacement(slot, document).valid, true);
  assert.equal(findContainingContainer({ ...slot, parentId: null }, document)?.id, parking.id);
});

test("impede ciclos e elementos atravessando o pai", () => {
  assert.equal(wouldCreateHierarchyCycle(boundary.id, sector.id, document.elements), true);
  const outside = { ...slot, id: "outside", geometry: { kind: "rect" as const, x: 680, y: 760, width: 100, height: 100 }, parentId: parking.id };
  assert.equal(validateElementPlacement(outside, { ...document, elements: [...document.elements, outside] }).valid, false);
});

test("setores são ilimitados e derivados da hierarquia desenhada", () => {
  assert.equal(getSectorForPoint({ xPercent: .3, yPercent: .7 }, document), "NORTE");
  assert.equal(getSectorForPoint({ xPercent: .75, yPercent: .7 }, document), null);
});

test("limite aceita o pátio e estrutura bloqueadora rejeita posição", () => {
  assert.equal(isPointInsideYard({ xPercent: .01, yPercent: .01 }, document), false);
  assert.equal(isPointInsideYard({ xPercent: .2, yPercent: .7 }, document), true);
  assert.equal(isPointInsideYard({ xPercent: .3, yPercent: .38 }, document), false);
});

test("faz upgrade do JSON legado sem perder id e geometria", () => {
  const upgraded = validateYardMapDocument({ ...createEmptyYardMapDocument(), schemaVersion: 1, elements: [{ id: "old", type: "BOUNDARY", geometry: boundary.geometry, style: boundary.style, properties: { name: "Limite antigo", visible: true, active: true } }] });
  assert.equal(upgraded.schemaVersion, 2);
  assert.equal(upgraded.elements[0].id, "old");
  assert.equal(upgraded.elements[0].type, "YARD_BOUNDARY");
  assert.equal(upgraded.elements[0].name, "Limite antigo");
});

test("snap, zoom, centralização e pins preservam a âncora", () => {
  assert.deepEqual(snapPoint([124,139], 25, true), [125,150]);
  const initial = { scale: 1.25, x: -120, y: -40 }, anchor = { x: 320, y: 240 }, before = { x: (anchor.x - initial.x) / initial.scale, y: (anchor.y - initial.y) / initial.scale }, zoomed = zoomAtPoint(initial, 2.5, anchor);
  assert.equal((anchor.x - zoomed.x) / zoomed.scale, before.x);
  const centered = centerPointInViewport({ viewportWidth: 390, viewportHeight: 520, contentWidth: 560, contentHeight: 420, point: { xPercent: .62, yPercent: .74 }, scale: 2 });
  assert.equal(centered.x + 560 * .62 * 2, 195);
  assert.deepEqual(projectPercentToViewport({ xPercent: .35, yPercent: .72 }, { scale: 2, x: -100, y: 30 }, { width: 800, height: 600 }), { x: 460, y: 894 });
});
