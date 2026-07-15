import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { parseFleetIdentifiers, splitByCapacity } from "./yard-bulk.utils";

export type AreaOccupancy = "FREE" | "WARNING" | "FULL";
export type AllocationOrigin = "INITIAL_INVENTORY" | "MANUAL_ALLOCATION" | "MANUAL_MOVE" | "MANUAL_RELEASE";
export function occupancyState(capacity: number, occupied: number): AreaOccupancy { if (occupied >= capacity) return "FULL"; return (capacity - occupied) / capacity < .4 ? "WARNING" : "FREE"; }
export function areaSummary(area: any) { const allocations = area.allocations || [], occupied = allocations.length; return { id: area.id, patioId: area.patioId, nome: area.nome, capacidade: area.capacidade, ordem: area.ordem, x: area.x, y: area.y, cor: area.cor, ativo: area.ativo, occupied, available: Math.max(0, area.capacidade - occupied), occupancyPercent: area.capacidade > 0 ? Math.min(100, Math.round(occupied / area.capacidade * 100)) : 100, state: occupancyState(area.capacidade, occupied), allocations }; }
const personSelect = { id: true, name: true, fullName: true } as const;
const activeAllocationInclude = { fleet: true, registeredBy: { select: personSelect } } as const;
export const yardTransactionRunner = { run<T>(work: (tx: any) => Promise<T>) { return prisma.$transaction(work, { isolationLevel: "Serializable" as any }); } };

export async function getOperationalMap(branch: string) {
  const [patios, recentMovements] = await Promise.all([
    prisma.patio.findMany({ where: { branch, ativo: true }, orderBy: { ordem: "asc" }, include: { areas: { where: { ativo: true }, orderBy: { ordem: "asc" }, include: { allocations: { where: { releasedAt: null }, orderBy: { registeredAt: "desc" }, include: activeAllocationInclude } } } } }),
    prisma.patioAllocation.findMany({ where: { branch }, orderBy: { updatedAt: "desc" }, take: 12, include: { fleet: true, area: { include: { patio: true } }, registeredBy: { select: personSelect }, releasedBy: { select: personSelect } } })
  ]);
  const result = patios.map((patio: any) => ({ ...patio, areas: patio.areas.map(areaSummary) })), areas = result.flatMap((patio: any) => patio.areas);
  return { branch, patios: result, recentMovements, summary: { capacity: areas.reduce((sum: number, area: any) => sum + area.capacidade, 0), occupied: areas.reduce((sum: number, area: any) => sum + area.occupied, 0), available: areas.reduce((sum: number, area: any) => sum + area.available, 0), areas: areas.length } };
}

async function serialTransaction<T>(work: (tx: any) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await yardTransactionRunner.run(work); }
    catch (error: any) { if (error?.code === "P2002") throw new AppError("Esta frota já possui uma localização ativa nesta filial.", 409, "FLEET_ALREADY_ALLOCATED"); if (error?.code !== "P2034" || attempt === 2) throw error; }
  }
  throw new AppError("Conflito ao atualizar a ocupação. Tente novamente.", 409, "ALLOCATION_CONFLICT");
}

async function lockArea(tx: any, areaId: string) {
  await tx.$queryRawUnsafe('SELECT "id" FROM "PatioArea" WHERE "id" = $1 FOR UPDATE', areaId);
  const area = await tx.patioArea.findUnique({ where: { id: areaId }, include: { patio: true } });
  if (!area || !area.ativo || !area.patio.ativo) throw new AppError("Área operacional não encontrada ou inativa.", 404, "AREA_NOT_FOUND");
  const occupied = await tx.patioAllocation.count({ where: { areaId, releasedAt: null } });
  return { area, occupied, available: Math.max(0, area.capacidade - occupied) };
}

export async function allocateFleet(input: { fleetId: string; areaId: string; note?: string | null; userId: string; origin?: AllocationOrigin }) {
  return serialTransaction(async (tx) => {
    const { area, available } = await lockArea(tx, input.areaId); if (available < 1) throw new AppError("Esta área atingiu sua capacidade máxima.", 409, "AREA_FULL");
    const fleet = await tx.frota.findUnique({ where: { id: input.fleetId }, select: { id: true } }); if (!fleet) throw new AppError("Frota não encontrada.", 404, "FLEET_NOT_FOUND");
    const current = await tx.patioAllocation.findFirst({ where: { fleetId: input.fleetId, branch: area.patio.branch, releasedAt: null } }); if (current) throw new AppError("A frota já está registrada em uma área. Use Mover.", 409, "FLEET_ALREADY_ALLOCATED");
    return tx.patioAllocation.create({ data: { fleetId: input.fleetId, areaId: area.id, branch: area.patio.branch, origin: input.origin || "MANUAL_ALLOCATION", registeredById: input.userId, registeredAt: new Date(), note: input.note || null }, include: { ...activeAllocationInclude, area: { include: { patio: true } } } });
  });
}

export async function moveFleet(input: { fleetId: string; areaId: string; note?: string | null; userId: string }) {
  return serialTransaction(async (tx) => {
    const { area: target, available } = await lockArea(tx, input.areaId); if (available < 1) throw new AppError("A área de destino está lotada.", 409, "AREA_FULL");
    const current = await tx.patioAllocation.findFirst({ where: { fleetId: input.fleetId, branch: target.patio.branch, releasedAt: null }, include: { area: true } }); if (!current) throw new AppError("A frota não possui localização ativa nesta filial.", 409, "FLEET_NOT_ALLOCATED"); if (current.areaId === target.id) throw new AppError("A frota já está nesta área.", 400, "SAME_AREA");
    const now = new Date(); await tx.patioAllocation.update({ where: { id: current.id }, data: { releasedAt: now, releasedById: input.userId, releaseOrigin: "MANUAL_MOVE", releaseNote: input.note || `Movida de ${current.area.nome}` } });
    return tx.patioAllocation.create({ data: { fleetId: input.fleetId, areaId: target.id, branch: target.patio.branch, origin: "MANUAL_MOVE", registeredById: input.userId, registeredAt: now, note: input.note || null }, include: { ...activeAllocationInclude, area: { include: { patio: true } } } });
  });
}

export async function releaseFleet(input: { allocationId: string; note?: string | null; userId: string }) {
  return serialTransaction(async (tx) => { const current = await tx.patioAllocation.findUnique({ where: { id: input.allocationId } }); if (!current || current.releasedAt) throw new AppError("Esta localização já foi liberada.", 409, "ALLOCATION_RELEASED"); return tx.patioAllocation.update({ where: { id: current.id }, data: { releasedAt: new Date(), releasedById: input.userId, releaseOrigin: "MANUAL_RELEASE", releaseNote: input.note || null } }); });
}

export async function previewBulkAllocation(input: { areaId: string; identifiers: unknown }) {
  const parsed = parseFleetIdentifiers(input.identifiers), area = await prisma.patioArea.findUnique({ where: { id: input.areaId }, include: { patio: true, allocations: { where: { releasedAt: null }, select: { id: true } } } });
  if (!area || !area.ativo || !area.patio.ativo) throw new AppError("Área operacional não encontrada ou inativa.", 404, "AREA_NOT_FOUND");
  const fleets = parsed.identifiers.length ? await prisma.frota.findMany({ where: { OR: [{ id: { in: parsed.identifiers } }, { numeroFrota: { in: parsed.identifiers } }] } }) : [];
  const byIdentifier = new Map<string, any>(); for (const fleet of fleets) { byIdentifier.set(fleet.id.toUpperCase(), fleet); byIdentifier.set(fleet.numeroFrota.toUpperCase(), fleet); }
  const resolved: any[] = [], nonexistent: string[] = []; for (const identifier of parsed.identifiers) { const fleet = byIdentifier.get(identifier); if (fleet && !resolved.some((item) => item.id === fleet.id)) resolved.push(fleet); else if (!fleet) nonexistent.push(identifier); }
  const currents = resolved.length ? await prisma.patioAllocation.findMany({ where: { fleetId: { in: resolved.map((fleet) => fleet.id) }, branch: area.patio.branch, releasedAt: null }, include: { area: { include: { patio: true } } } }) : [];
  const currentByFleet = new Map(currents.map((allocation: any) => [allocation.fleetId, allocation])), alreadyHere: any[] = [], allocatedElsewhere: any[] = [], candidates: any[] = [];
  for (const fleet of resolved) { const current: any = currentByFleet.get(fleet.id); if (!current) candidates.push(fleet); else if (current.areaId === area.id) alreadyHere.push({ fleet, allocation: current }); else allocatedElsewhere.push({ fleet, allocation: current }); }
  const available = Math.max(0, area.capacidade - area.allocations.length), capacity = splitByCapacity(candidates, available);
  return { area: { id: area.id, nome: area.nome, capacidade: area.capacidade, patio: area.patio }, currentOccupancy: area.allocations.length, available, duplicates: parsed.duplicates, nonexistent, alreadyHere, allocatedElsewhere, valid: candidates, accepted: capacity.accepted, overflow: capacity.overflow, finalOccupancy: area.allocations.length + capacity.accepted.length };
}

export async function bulkAllocate(input: { areaId: string; fleetIds: string[]; note?: string | null; origin: AllocationOrigin; userId: string }) {
  if (!input.fleetIds.length) throw new AppError("Selecione ao menos uma frota válida.", 400, "EMPTY_BULK");
  if (!(["INITIAL_INVENTORY", "MANUAL_ALLOCATION"] as string[]).includes(input.origin)) throw new AppError("Origem do preenchimento inválida.", 400, "INVALID_ORIGIN");
  return serialTransaction(async (tx) => {
    const { area, available } = await lockArea(tx, input.areaId), fleetIds = [...new Set(input.fleetIds)];
    if (fleetIds.length > available) throw new AppError(`Esta área possui somente ${available} posições disponíveis.`, 409, "INSUFFICIENT_CAPACITY", { available });
    const fleets = await tx.frota.findMany({ where: { id: { in: fleetIds } }, select: { id: true } }); if (fleets.length !== fleetIds.length) throw new AppError("Uma ou mais frotas não existem.", 400, "FLEET_NOT_FOUND");
    const conflicts = await tx.patioAllocation.findMany({ where: { fleetId: { in: fleetIds }, branch: area.patio.branch, releasedAt: null }, include: { area: true } }); if (conflicts.length) throw new AppError("Uma ou mais frotas já estão alocadas. Revise antes de confirmar.", 409, "BULK_ALLOCATION_CONFLICT", conflicts.map((item: any) => ({ fleetId: item.fleetId, area: item.area.nome })));
    const now = new Date(); await tx.patioAllocation.createMany({ data: fleetIds.map((fleetId) => ({ fleetId, areaId: area.id, branch: area.patio.branch, origin: input.origin, registeredById: input.userId, registeredAt: now, note: input.note || null })) });
    const allocations = await tx.patioAllocation.findMany({ where: { fleetId: { in: fleetIds }, areaId: area.id, releasedAt: null }, include: activeAllocationInclude }); return { allocations, created: allocations.length, area: area.nome };
  });
}

export async function getFleetLocation(fleetId: string, branch?: string) { const fleet = await prisma.frota.findUnique({ where: { id: fleetId } }); if (!fleet) throw new AppError("Frota não encontrada.", 404, "FLEET_NOT_FOUND"); const allocation = await prisma.patioAllocation.findFirst({ where: { fleetId, releasedAt: null, ...(branch ? { branch } : {}) }, include: { area: { include: { patio: true } }, registeredBy: { select: personSelect } } }); return { fleet, allocation }; }
export async function getFleetHistory(fleetId: string, page: number, limit: number) { const where = { fleetId }; const [allocations, total] = await prisma.$transaction([prisma.patioAllocation.findMany({ where, orderBy: { registeredAt: "desc" }, skip: (page - 1) * limit, take: limit, include: { area: { include: { patio: true } }, registeredBy: { select: personSelect }, releasedBy: { select: personSelect } } }), prisma.patioAllocation.count({ where })]); return { allocations, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }; }
export async function getAreaDetails(areaId: string, search: string, page: number, limit: number) { const area = await prisma.patioArea.findUnique({ where: { id: areaId }, include: { patio: true } }); if (!area) throw new AppError("Área não encontrada.", 404, "AREA_NOT_FOUND"); const where: any = { areaId, releasedAt: null, ...(search ? { fleet: { OR: [{ numeroFrota: { contains: search, mode: "insensitive" } }, { placa: { contains: search, mode: "insensitive" } }, { tipoEquipamento: { contains: search, mode: "insensitive" } }] } } : {}) }; const [allocations, total, recentHistory, occupied] = await prisma.$transaction([prisma.patioAllocation.findMany({ where, orderBy: { registeredAt: "desc" }, skip: (page - 1) * limit, take: limit, include: activeAllocationInclude }), prisma.patioAllocation.count({ where }), prisma.patioAllocation.findMany({ where: { areaId }, orderBy: { updatedAt: "desc" }, take: 10, include: { fleet: true, registeredBy: { select: personSelect }, releasedBy: { select: personSelect } } }), prisma.patioAllocation.count({ where: { areaId, releasedAt: null } })]); return { area: { ...area, occupied, available: Math.max(0, area.capacidade - occupied), occupancyPercent: area.capacidade > 0 ? Math.min(100, Math.round(occupied / area.capacidade * 100)) : 100, state: occupancyState(area.capacidade, occupied) }, allocations, recentHistory, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }; }
