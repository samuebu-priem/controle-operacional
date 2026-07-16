import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const header = readFileSync(fileURLToPath(new URL("./AppHeader.js", import.meta.url)), "utf8");
const nav = readFileSync(fileURLToPath(new URL("./AppNav.js", import.meta.url)), "utf8");
const metadata = readFileSync(fileURLToPath(new URL("./pageMetadata.js", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../styles/global.css", import.meta.url)), "utf8");

test("cabecalho usa metadados de rota e dados reais da sessao", () => {
  assert.match(header, /metadataFor\(location\.pathname\)/);
  assert.match(header, /getAuthUser/);
  assert.match(header, /getAuthRole/);
  assert.match(metadata, /Gestão de Pátio/);
  assert.match(metadata, /Histórico de Inspeções/);
});

test("menus fecham por Escape e drawer bloqueia rolagem", () => {
  assert.match(header, /event\.key === "Escape"/);
  assert.match(header, /navigation-drawer-open/);
  assert.match(header, /aria-modal/);
  assert.match(css, /\.navigation-drawer-open\{overflow:hidden\}/);
});

test("sidebar e drawer reutilizam a mesma navegacao autorizada", () => {
  assert.match(nav, /!item\.manager \|\| isGestor\(\)/);
  assert.match(header, /h\(AppNav/);
  assert.match(header, /sidebar-collapsed/);
  assert.match(css, /app-shell--sidebar-collapsed/);
});
