import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const page=readFileSync(new URL("./NovaInspecaoPage.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../styles/global.css",import.meta.url),"utf8");
test("nova inspeção possui quatro etapas e renderização condicional",()=>{assert.match(page,/Dados iniciais/);assert.match(page,/Checklist/);assert.match(page,/Evid\\xEAncias/);assert.match(page,/Revis\\xE3o e envio/);assert.match(page,/step === 0/);assert.match(page,/step === 3/)});
test("mantém rascunho recuperável e não serializa arquivos",()=>{assert.match(page,/nova-inspecao:draft:v2/);assert.match(page,/localStorage\.setItem/);assert.match(page,/pontos\.map\(\(\{ files, \.\.\.p \}\)/)});
test("define contratos para celular estreito, tablet e desktop",()=>{assert.match(css,/@media\(max-width:380px\)/);assert.match(css,/@media\(max-width:767px\)/);assert.match(css,/@media\(max-width:900px\)/);assert.match(css,/grid-template-columns:minmax\(0,1fr\) 260px/)});
test("produto técnico abre sob demanda em drawer responsivo",()=>{assert.match(page,/Ver detalhes/);assert.match(page,/inspection-product-drawer/);assert.match(css,/max-height:88vh/)});
