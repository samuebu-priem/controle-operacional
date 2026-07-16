import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const css = readFileSync(fileURLToPath(new URL("../styles/global.css", import.meta.url)), "utf8");
const history = readFileSync(fileURLToPath(new URL("./HistoricoInspecoesPage.js", import.meta.url)), "utf8");
const fleets = readFileSync(fileURLToPath(new URL("./RegistroFrotasPage.js", import.meta.url)), "utf8");
const yard = readFileSync(fileURLToPath(new URL("./YardManagementPage.js", import.meta.url)), "utf8");

test("historico mantem filtros e dados na mesma fonte em todos os breakpoints", () => {
  assert.match(history, /filteredInspecoes\.map/);
  assert.match(history, /history-search-panel/);
  assert.match(css, /\.history-page \.history-list[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
});

test("registro de frotas alterna orientacao sem duplicar operacoes", () => {
  assert.match(fleets, /filteredFrotas\.map/);
  assert.match(fleets, /openEditModal\(frota\)/);
  assert.match(fleets, /openDeleteModal\(frota\)/);
  assert.match(css, /\.page-frame:has\(\.frota-card\) \.frota-card > div/);
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
