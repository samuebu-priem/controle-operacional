import test from "node:test";
import assert from "node:assert/strict";
import {
  centerPointInViewport,
  getSectorForPoint,
  isPointInsideYard,
  percentToSvg,
  projectPercentToViewport,
  svgToPercent,
  zoomAtPoint
} from "./yardGeometry";

test("converte coordenadas proporcionais para o viewBox e vice-versa", () => {
  assert.deepEqual(percentToSvg({ xPercent: 0.35, yPercent: 0.72 }), { x: 560, y: 864 });
  assert.deepEqual(svgToPercent({ x: 560, y: 864 }), { xPercent: 0.35, yPercent: 0.72 });
});

test("identifica todos os setores configurados", () => {
  const samples = [
    ["A", 280, 210], ["B", 620, 210], ["C", 180, 510], ["D", 520, 570],
    ["E", 950, 690], ["F", 1300, 760], ["G", 780, 880], ["H", 1320, 1000]
  ] as const;

  for (const [sector, x, y] of samples) {
    assert.equal(getSectorForPoint({ xPercent: x / 1600, yPercent: y / 1200 }), sector);
  }
});

test("rejeita pontos externos, vias e construções", () => {
  assert.equal(isPointInsideYard({ xPercent: 0.02, yPercent: 0.02 }), false);
  assert.equal(isPointInsideYard({ xPercent: 354 / 1600, yPercent: 382 / 1200 }), false);
  assert.equal(isPointInsideYard({ xPercent: 400 / 1600, yPercent: 330 / 1200 }), false);
});

test("zoom preserva a coordenada sob o ponto de ancoragem", () => {
  const initial = { scale: 1.25, x: -120, y: -40 };
  const anchor = { x: 320, y: 240 };
  const contentBefore = { x: (anchor.x - initial.x) / initial.scale, y: (anchor.y - initial.y) / initial.scale };
  const result = zoomAtPoint(initial, 2.5, anchor);
  assert.equal((anchor.x - result.x) / result.scale, contentBefore.x);
  assert.equal((anchor.y - result.y) / result.scale, contentBefore.y);
});

test("centralização se mantém correta após redimensionamento", () => {
  const point = { xPercent: 0.62, yPercent: 0.74 };
  const result = centerPointInViewport({ viewportWidth: 390, viewportHeight: 520, contentWidth: 560, contentHeight: 420, point, scale: 2 });
  assert.equal(result.x + 560 * point.xPercent * result.scale, 195);
  assert.equal(result.y + 420 * point.yPercent * result.scale, 260);
});

test("pins acompanham zoom, pan e redimensionamento sem perder a âncora", () => {
  const point = { xPercent: 0.35, yPercent: 0.72 };
  assert.deepEqual(
    projectPercentToViewport(point, { scale: 2, x: -100, y: 30 }, { width: 800, height: 600 }),
    { x: 460, y: 894 }
  );
});
