import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission } from "./permissions";

test("permissões de pátio falham fechadas sem role válida", () => {
  assert.equal(hasPermission(undefined, "yard:view"), false);
  assert.equal(hasPermission("DESCONHECIDO", "yard:view"), false);
});

test("INSPETOR opera frotas, mas não administra áreas", () => {
  assert.equal(hasPermission("INSPETOR", "yard:view"), true);
  assert.equal(hasPermission("INSPETOR", "yard:update"), true);
  assert.equal(hasPermission("INSPETOR", "yard:history"), true);
  assert.equal(hasPermission("INSPETOR", "yard:areas-manage"), false);
});

test("GESTOR possui todas as capacidades do pátio", () => {
  assert.equal(hasPermission("GESTOR", "yard:view"), true);
  assert.equal(hasPermission("GESTOR", "yard:search"), true);
  assert.equal(hasPermission("GESTOR", "yard:update"), true);
  assert.equal(hasPermission("GESTOR", "yard:history"), true);
  assert.equal(hasPermission("GESTOR", "yard:areas-manage"), true);
});
