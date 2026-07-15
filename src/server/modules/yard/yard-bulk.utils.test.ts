import test from "node:test";
import assert from "node:assert/strict";
import { parseFleetIdentifiers, splitByCapacity } from "./yard-bulk.utils";

test("normaliza separadores e remove frotas duplicadas", () => {
  const result = parseFleetIdentifiers("100, 200\n100;300   200");
  assert.deepEqual(result.identifiers, ["100", "200", "300"]);
  assert.deepEqual(result.duplicates, ["100", "200"]);
});

test("aceita listas e ignora identificadores vazios", () => {
  const result = parseFleetIdentifiers([" ab-1 ", "", "AB-1", "cd-2"]);
  assert.deepEqual(result.identifiers, ["AB-1", "CD-2"]);
  assert.deepEqual(result.duplicates, ["AB-1"]);
});

test("respeita a capacidade sem descartar a lista excedente", () => {
  const result = splitByCapacity(["1", "2", "3", "4"], 2);
  assert.deepEqual(result.accepted, ["1", "2"]);
  assert.deepEqual(result.overflow, ["3", "4"]);
});

test("capacidade negativa ou zero não aceita nenhuma frota", () => {
  assert.deepEqual(splitByCapacity(["1"], -3), { accepted: [], overflow: ["1"] });
});
