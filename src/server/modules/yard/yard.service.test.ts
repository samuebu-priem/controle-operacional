import test from "node:test";
import assert from "node:assert/strict";
import { areaSummary, occupancyState } from "./yard.service";

test("área fica verde com pelo menos 40% livre", () => {
  assert.equal(occupancyState(10, 0), "FREE");
  assert.equal(occupancyState(10, 6), "FREE");
});

test("área fica amarela abaixo de 40% livre e vermelha quando lotada", () => {
  assert.equal(occupancyState(10, 7), "WARNING");
  assert.equal(occupancyState(10, 10), "FULL");
  assert.equal(occupancyState(10, 11), "FULL");
});

test("resumo nunca informa disponibilidade negativa", () => {
  const result = areaSummary({ id: "a", patioId: "p", nome: "Muro", capacidade: 2, ordem: 1, x: .5, y: .5, cor: "#22c55e", ativo: true, allocations: [{}, {}, {}] });
  assert.equal(result.occupied, 3);
  assert.equal(result.available, 0);
  assert.equal(result.occupancyPercent, 100);
  assert.equal(result.state, "FULL");
});
