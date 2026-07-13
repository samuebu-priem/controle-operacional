import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission } from "./permissions";

test("permissões de pátio falham fechadas sem role válida", () => {
  assert.equal(hasPermission(undefined, "yard:view"), false);
  assert.equal(hasPermission("DESCONHECIDO", "yard:view"), false);
});

test("INSPETOR não acessa painel de localizações antigas", () => {
  assert.equal(hasPermission("INSPETOR", "yard:view"), true);
  assert.equal(hasPermission("INSPETOR", "yard:update"), true);
  assert.equal(hasPermission("INSPETOR", "yard:history"), true);
  assert.equal(hasPermission("INSPETOR", "yard:stale"), false);
  assert.equal(hasPermission("INSPETOR", "yard:map-edit"), false);
});

test("GESTOR possui todas as capacidades do pátio", () => {
  assert.equal(hasPermission("GESTOR", "yard:view"), true);
  assert.equal(hasPermission("GESTOR", "yard:search"), true);
  assert.equal(hasPermission("GESTOR", "yard:update"), true);
  assert.equal(hasPermission("GESTOR", "yard:history"), true);
  assert.equal(hasPermission("GESTOR", "yard:stale"), true);
  assert.equal(hasPermission("GESTOR", "yard:map-edit"), true);
});
