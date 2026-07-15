import test from "node:test";
import assert from "node:assert/strict";
import { allocateFleet, areaSummary, bulkAllocate, moveFleet, occupancyState, releaseFleet, yardTransactionRunner } from "./yard.service";

function fakeYard(capacity = 2) {
  const patios = { p1: { id: "p1", nome: "1º Pátio", branch: "PAULINIA", ativo: true }, p2: { id: "p2", nome: "2º Pátio", branch: "PAULINIA", ativo: true } } as any;
  const areas = { a1: { id: "a1", patioId: "p1", nome: "Muro", capacidade: capacity, ativo: true, patio: patios.p1 }, a2: { id: "a2", patioId: "p2", nome: "Lavador", capacidade: 3, ativo: true, patio: patios.p2 } } as any;
  const fleets = { f1: { id: "f1", numeroFrota: "100" }, f2: { id: "f2", numeroFrota: "200" }, f3: { id: "f3", numeroFrota: "300" } } as any;
  const allocations: any[] = [];
  const include = (item: any) => ({ ...item, fleet: fleets[item.fleetId], area: { ...areas[item.areaId], patio: areas[item.areaId].patio }, registeredBy: { id: item.registeredById, name: "Operador", fullName: "Operador" } });
  const matches = (item: any, where: any) => (!where.id || item.id === where.id) && (!where.fleetId || (where.fleetId.in ? where.fleetId.in.includes(item.fleetId) : item.fleetId === where.fleetId)) && (!where.areaId || item.areaId === where.areaId) && (!where.branch || item.branch === where.branch) && (where.releasedAt !== null || item.releasedAt == null);
  const tx: any = {
    $queryRawUnsafe: async () => [],
    patioArea: { findUnique: async ({ where }: any) => areas[where.id] || null },
    frota: { findUnique: async ({ where }: any) => fleets[where.id] || null, findMany: async ({ where }: any) => Object.values(fleets).filter((fleet: any) => where.id.in.includes(fleet.id)) },
    patioAllocation: {
      count: async ({ where }: any) => allocations.filter((item) => matches(item, where)).length,
      findFirst: async ({ where }: any) => { const item = allocations.find((allocation) => matches(allocation, where)); return item ? include(item) : null; },
      findUnique: async ({ where }: any) => allocations.find((item) => item.id === where.id) || null,
      findMany: async ({ where }: any) => allocations.filter((item) => matches(item, where)).map(include),
      create: async ({ data }: any) => { const item = { id: `al-${allocations.length + 1}`, createdAt: new Date(), updatedAt: new Date(), releasedAt: null, ...data }; allocations.push(item); return include(item); },
      createMany: async ({ data }: any) => { for (const row of data) allocations.push({ id: `al-${allocations.length + 1}`, createdAt: new Date(), updatedAt: new Date(), releasedAt: null, ...row }); return { count: data.length }; },
      update: async ({ where, data }: any) => { const item = allocations.find((allocation) => allocation.id === where.id); Object.assign(item, data, { updatedAt: new Date() }); return include(item); }
    }
  };
  return { tx, allocations };
}

function mockTransactions(context: any, tx: any) {
  let queue = Promise.resolve();
  context.mock.method(yardTransactionRunner, "run", (work: any) => {
    const result = queue.then(() => work(tx));
    queue = result.then(() => undefined, () => undefined);
    return result;
  });
}

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

test("adiciona, move e remove preservando todo o histórico", async (context) => {
  const yard = fakeYard(); mockTransactions(context, yard.tx);
  const first = await allocateFleet({ fleetId: "f1", areaId: "a1", userId: "u1", note: "entrada" });
  const moved = await moveFleet({ fleetId: "f1", areaId: "a2", userId: "u2", note: "mudança" });
  await releaseFleet({ allocationId: moved.id, userId: "u2", note: "saída" });
  assert.equal(yard.allocations.length, 2);
  assert.equal(yard.allocations[0].id, first.id);
  assert.equal(yard.allocations[0].releaseOrigin, "MANUAL_MOVE");
  assert.equal(yard.allocations[1].releaseOrigin, "MANUAL_RELEASE");
  assert.equal(yard.allocations.filter((item) => !item.releasedAt).length, 0);
});

test("lote é atômico e registra inventário inicial", async (context) => {
  const yard = fakeYard(3); mockTransactions(context, yard.tx);
  const result = await bulkAllocate({ areaId: "a1", fleetIds: ["f1", "f2", "f3"], origin: "INITIAL_INVENTORY", userId: "u1" });
  assert.equal(result.created, 3);
  assert.equal(yard.allocations.every((item) => item.origin === "INITIAL_INVENTORY"), true);
});

test("lote rejeita frota inexistente sem criar registros parciais", async (context) => {
  const yard = fakeYard(3); mockTransactions(context, yard.tx);
  await assert.rejects(() => bulkAllocate({ areaId: "a1", fleetIds: ["f1", "inexistente"], origin: "MANUAL_ALLOCATION", userId: "u1" }), (error: any) => error.code === "FLEET_NOT_FOUND");
  assert.equal(yard.allocations.length, 0);
});

test("duas operações disputando a última posição não excedem a capacidade", async (context) => {
  const yard = fakeYard(1); mockTransactions(context, yard.tx);
  const results = await Promise.allSettled([allocateFleet({ fleetId: "f1", areaId: "a1", userId: "u1" }), allocateFleet({ fleetId: "f2", areaId: "a1", userId: "u2" })]);
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(results.filter((item) => item.status === "rejected" && (item.reason as any).code === "AREA_FULL").length, 1);
  assert.equal(yard.allocations.filter((item) => !item.releasedAt).length, 1);
});

test("não cria uma segunda localização ativa para a mesma frota", async (context) => {
  const yard = fakeYard(); mockTransactions(context, yard.tx);
  await allocateFleet({ fleetId: "f1", areaId: "a1", userId: "u1" });
  await assert.rejects(() => allocateFleet({ fleetId: "f1", areaId: "a2", userId: "u2" }), (error: any) => error.code === "FLEET_ALREADY_ALLOCATED");
  assert.equal(yard.allocations.length, 1);
});
