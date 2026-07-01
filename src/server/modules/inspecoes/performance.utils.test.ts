import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCriterion, buildInspectorPerformance } from "./performance.utils";

test("normalizeCriterion agrupa palavras-chave de forma simples", () => {
  assert.equal(normalizeCriterion("Ferrugem na estrutura"), "Ferrugem");
  assert.equal(normalizeCriterion("Manchas na pintura"), "Mancha");
  assert.equal(normalizeCriterion("Odor forte"), "Odor");
  assert.equal(normalizeCriterion("Produto residual"), "Resíduo");
  assert.equal(normalizeCriterion("Descrição livre qualquer"), "Outros");
});

test("buildInspectorPerformance calcula produtividade e critérios principais", () => {
  const rows = [
    {
      inspector: "Samuel",
      totalInspecoes: 10,
      periodInspecoes: 7,
      todayInspecoes: 2,
      weekInspecoes: 4,
      monthInspecoes: 7,
      nonConformities: 4,
      criteria: ["Ferrugem", "Mancha", "Ferrugem"]
    },
    {
      inspector: "João",
      totalInspecoes: 8,
      periodInspecoes: 4,
      todayInspecoes: 1,
      weekInspecoes: 3,
      monthInspecoes: 4,
      nonConformities: 2,
      criteria: ["Odor", "Outros"]
    }
  ];

  const summary = buildInspectorPerformance(rows);

  assert.equal(summary[0].name, "Samuel");
  assert.equal(summary[0].productivity, 100);
  assert.equal(summary[1].productivity, 57);
  assert.deepEqual(summary[0].topCriteria[0], { label: "Ferrugem", count: 2 });
});
