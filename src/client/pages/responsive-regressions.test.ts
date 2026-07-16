import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const css = readFileSync(fileURLToPath(new URL("../styles/global.css", import.meta.url)), "utf8");
const history = readFileSync(fileURLToPath(new URL("./HistoricoInspecoesPage.js", import.meta.url)), "utf8");
const fleets = readFileSync(fileURLToPath(new URL("./RegistroFrotasPage.js", import.meta.url)), "utf8");
const yard = readFileSync(fileURLToPath(new URL("./YardManagementPage.js", import.meta.url)), "utf8");

test("historico mantem filtros e dados na mesma fonte em todos os breakpoints", () => {
  assert.match(history, /function HistoryTable/);
  assert.match(history, /function HistoryCards/);
  assert.match(history, /items: visible, handlers/);
  assert.match(history, /history-filters-v2/);
  assert.match(css, /\.history-desktop/);
  assert.match(css, /\.history-mobile/);
});

test("registro de frotas alterna orientacao sem duplicar operacoes", () => {
  assert.match(fleets, /function FleetTable/);
  assert.match(fleets, /function FleetCards/);
  assert.match(fleets, /fleets: visible, actions/);
  assert.match(fleets, /allocationOf/);
  assert.match(css, /\.fleet-desktop/);
  assert.match(css, /\.fleet-mobile/);
});

test("patio mobile permanece no fluxo visivel e conserva as acoes", () => {
  assert.match(yard, /operational-map__yards/);
  assert.match(yard, /Adicionar frota/);
  assert.match(yard, /Preencher pátio/);
  assert.match(yard, /Remover do pátio/);
  assert.match(css, /\.app-shell\.operational-yard \.app-shell__main\.page-container/);
  assert.match(css, /\.operational-yard__header \{[\s\S]*display: block/);
  assert.match(css, /\.operational-yard__search \{[\s\S]*position: relative/);
});
