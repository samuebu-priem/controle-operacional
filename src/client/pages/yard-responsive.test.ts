import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const page = readFileSync(fileURLToPath(new URL("./YardManagementPage.js", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../styles/global.css", import.meta.url)), "utf8");

test("oferece Preencher pátio no mobile sem depender da toolbar desktop", () => {
  assert.match(page, /operational-mobile-actions/);
  assert.match(page, /Cadastrar várias frotas por área/);
  assert.match(page, /openBulk\(\)/);
  assert.match(css, /@media \(max-width:767px\)[\s\S]*\.operational-mobile-actions/);
});

test("mantém o preenchimento mobile nas cinco etapas", () => {
  assert.match(page, /ETAPA \$\{bulk\.step\} DE 5/);
  assert.match(page, /previewYardBulkAllocation/);
  assert.match(page, /bulkAllocateYardArea/);
  assert.match(page, /Preenchimento concluído/);
});

test("ações equivalentes de área e frota continuam disponíveis", () => {
  for (const action of ["Adicionar frota", "Preencher pátio", "Mover", "Remover", "Histórico"]) assert.match(page, new RegExp(action));
  assert.match(page, /modal === "area-add"/);
  assert.match(page, /modal === "release"/);
});

test("desktop usa estrutura única e neutraliza coordenadas livres dos cards", () => {
  assert.match(css, /@media \(min-width:1024px\)/);
  assert.match(css, /grid-template-areas:"header header" "toolbar toolbar" "map panel"/);
  assert.match(css, /grid-template-columns:minmax\(0,3fr\) minmax\(320px,1fr\)/);
  assert.match(css, /\.operational-area \{ grid-column:auto!important; grid-row:auto!important/);
});

test("define contratos distintos para mobile, tablet e desktop", () => {
  assert.match(css, /@media \(max-width:767px\)/);
  assert.match(css, /@media \(min-width:768px\) and \(max-width:1023px\)/);
  assert.match(css, /@media \(min-width:1024px\)/);
  assert.match(css, /\.operational-sheet--open~\.operational-mobile-actions \{ display:none \}/);
});
