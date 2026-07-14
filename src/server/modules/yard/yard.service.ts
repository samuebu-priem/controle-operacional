import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";

export type AreaOccupancy = "FREE" | "WARNING" | "FULL";

export function occupancyState(capacity: number, occupied: number): AreaOccupancy {
  if (occupied >= capacity) return "FULL";
  return (capacity - occupied) / capacity < .4 ? "WARNING" : "FREE";
}

export function areaSummary(area: any) {
  const allocations = area.allocations || [];
  const occupied = allocations.length;
  return {
    id: area.id, patioId: area.patioId, nome: area.nome, capacidade: area.capacidade, ordem: area.ordem,
    x: area.x, y: area.y, cor: area.cor, ativo: area.ativo, occupied, available: Math.max(0, area.capacidade - occupied),
    occupancyPercent: area.capacidade > 0 ? Math.min(100, Math.round(occupied / area.capacidade * 100)) : 100,
    state: occupancyState(area.capacidade, occupied), allocations
  };
}

const activeAllocationInclude = {
  fleet: true,
  registeredBy: { select: { id: true, name: true, fullName: true } }
} as const;

export async function getOperationalMap(branch: string) {
  const patios = await prisma.patio.findMany({
    where: { branch, ativo: true }, orderBy: { ordem: "asc" },
    include: { areas: { where: { ativo: true }, orderBy: { ordem: "asc" }, include: { allocations: { where: { releasedAt: null }, orderBy: { createdAt: "desc" }, include: activeAllocationInclude } } } }
  });
  const result = patios.map((patio: any) => ({ ...patio, areas: patio.areas.map(areaSummary) }));
  const areas = result.flatMap((patio: any) => patio.areas);
  return {
    branch, patios: result,
    summary: { capacity: areas.reduce((sum: number, area: any) => sum + area.capacidade, 0), occupied: areas.reduce((sum: number, area: any) => sum + area.occupied, 0), available: areas.reduce((sum: number, area: any) => sum + area.available, 0), areas: areas.length }
  };
}

async function serialTransaction<T>(work: (tx: any) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: "Serializable" as any }); }
    catch (error: any) {
      if (error?.code === "P2002") throw new AppError("Esta frota já possui uma localização ativa.", 409, "FLEET_ALREADY_ALLOCATED");
      if (error?.code !== "P2034" || attempt === 2) throw error;
    }
  }
  throw new AppError("Conflito ao atualizar a ocupação. Tente novamente.", 409, "ALLOCATION_CONFLICT");
}

async function lockAndValidateArea(tx: any, areaId: string) {
  await tx.$queryRawUnsafe('SELECT "id" FROM "PatioArea" WHERE "id" = $1 FOR UPDATE', areaId);
  const area = await tx.patioArea.findUnique({ where: { id: areaId }, include: { patio: true } });
  if (!area || !area.ativo || !area.patio.ativo) throw new AppError("Área operacional não encontrada ou inativa.", 404, "AREA_NOT_FOUND");
  const occupied = await tx.patioAllocation.count({ where: { areaId, releasedAt: null } });
  if (occupied >= area.capacidade) throw new AppError("Esta área atingiu sua capacidade máxima.", 409, "AREA_FULL");
  return area;
}

export async function allocateFleet(input: { fleetId: string; areaId: string; note?: string | null; userId: string }) {
  return serialTransaction(async (tx) => {
    const area = await lockAndValidateArea(tx, input.areaId);
    const fleet = await tx.frota.findUnique({ where: { id: input.fleetId }, select: { id: true } });
    if (!fleet) throw new AppError("Frota não encontrada.", 404, "FLEET_NOT_FOUND");
    const current = await tx.patioAllocation.findFirst({ where: { fleetId: input.fleetId, releasedAt: null } });
    if (current) throw new AppError("A frota já está registrada em uma área. Use Mover.", 409, "FLEET_ALREADY_ALLOCATED");
    return tx.patioAllocation.create({ data: { fleetId: input.fleetId, areaId: area.id, registeredById: input.userId, note: input.note || null }, include: { ...activeAllocationInclude, area: { include: { patio: true } } } });
  });
}

export async function moveFleet(input: { fleetId: string; areaId: string; note?: string | null; userId: string }) {
  return serialTransaction(async (tx) => {
    const target = await lockAndValidateArea(tx, input.areaId);
    const current = await tx.patioAllocation.findFirst({ where: { fleetId: input.fleetId, releasedAt: null } });
    if (!current) throw new AppError("A frota não possui localização ativa.", 409, "FLEET_NOT_ALLOCATED");
    if (current.areaId === target.id) throw new AppError("A frota já está nesta área.", 400, "SAME_AREA");
    const now = new Date();
    await tx.patioAllocation.update({ where: { id: current.id }, data: { releasedAt: now, releasedById: input.userId, releaseNote: input.note || "Movimentação entre áreas" } });
    return tx.patioAllocation.create({ data: { fleetId: input.fleetId, areaId: target.id, registeredById: input.userId, note: input.note || null }, include: { ...activeAllocationInclude, area: { include: { patio: true } } } });
  });
}

export async function releaseFleet(input: { allocationId: string; note?: string | null; userId: string }) {
  return serialTransaction(async (tx) => {
    const current = await tx.patioAllocation.findUnique({ where: { id: input.allocationId } });
    if (!current || current.releasedAt) throw new AppError("Esta localização já foi liberada.", 409, "ALLOCATION_RELEASED");
    return tx.patioAllocation.update({ where: { id: current.id }, data: { releasedAt: new Date(), releasedById: input.userId, releaseNote: input.note || null } });
  });
}

export async function getFleetLocation(fleetId: string) {
  const fleet = await prisma.frota.findUnique({ where: { id: fleetId } });
  if (!fleet) throw new AppError("Frota não encontrada.", 404, "FLEET_NOT_FOUND");
  const allocation = await prisma.patioAllocation.findFirst({ where: { fleetId, releasedAt: null }, include: { area: { include: { patio: true } }, registeredBy: { select: { id: true, name: true, fullName: true } } } });
  return { fleet, allocation };
}

export async function getFleetHistory(fleetId: string, page: number, limit: number) {
  const where = { fleetId };
  const [allocations, total] = await prisma.$transaction([
    prisma.patioAllocation.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, include: { area: { include: { patio: true } }, registeredBy: { select: { id: true, name: true, fullName: true } }, releasedBy: { select: { id: true, name: true, fullName: true } } } }),
    prisma.patioAllocation.count({ where })
  ]);
  return { allocations, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}
