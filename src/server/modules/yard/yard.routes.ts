import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";
import { requirePermission } from "../../middleware/permissions";
import { updateYardLocation, yardLocationInclude } from "./yard.service";

export const yardRoutes = Router();

const ACCURACIES = ["EXACT", "APPROXIMATE"] as const;
const MAX_NOTE_LENGTH = 500;
type YardLocationAccuracy = "EXACT" | "APPROXIMATE";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pageValue(value: unknown, fallback: number, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function branchValue(value: unknown) {
  const branch = (text(value) || "PAULINIA").toUpperCase();
  if (!/^[A-Z0-9_-]{2,40}$/.test(branch)) {
    throw new AppError("Filial inválida.", 400, "BAD_REQUEST");
  }
  return branch;
}

function parseUpdateBody(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new AppError("Payload inválido.", 400, "BAD_REQUEST");
  }

  const payload = body as Record<string, unknown>;
  const branch = branchValue(payload.branch);
  const accuracy = text(payload.accuracy).toUpperCase();
  const xPercent = Number(payload.xPercent);
  const yPercent = Number(payload.yPercent);
  const requestedSector = text(payload.sector).toUpperCase();

  if (!Number.isFinite(xPercent) || xPercent < 0 || xPercent > 1) {
    throw new AppError("xPercent deve ser um número entre 0 e 1.", 400, "BAD_REQUEST");
  }
  if (!Number.isFinite(yPercent) || yPercent < 0 || yPercent > 1) {
    throw new AppError("yPercent deve ser um número entre 0 e 1.", 400, "BAD_REQUEST");
  }
  if (!ACCURACIES.includes(accuracy as (typeof ACCURACIES)[number])) {
    throw new AppError("Precisão inválida. Use EXACT ou APPROXIMATE.", 400, "BAD_REQUEST");
  }
  if (payload.note !== undefined && payload.note !== null && typeof payload.note !== "string") {
    throw new AppError("A observação deve ser um texto.", 400, "BAD_REQUEST");
  }

  const note = typeof payload.note === "string" ? payload.note.replace(/[\u0000-\u001F\u007F]/g, " ").trim() : "";
  if (note.length > MAX_NOTE_LENGTH) {
    throw new AppError(`A observação deve ter no máximo ${MAX_NOTE_LENGTH} caracteres.`, 400, "BAD_REQUEST");
  }

  return { branch, xPercent, yPercent, sector: requestedSector || null, accuracy: accuracy as YardLocationAccuracy, note: note || null };
}

yardRoutes.use(requireAuth);

yardRoutes.get("/fleets", requirePermission("yard:search"), async (req, res, next) => {
  try {
    const search = text(req.query.search);
    const rawLimit = text(req.query.limit);
    const limit = rawLimit ? pageValue(rawLimit, 500, 5000) : undefined;
    const fleets = await prisma.frota.findMany({
      where: search
        ? {
            OR: [
              { numeroFrota: { contains: search, mode: "insensitive" } },
              { placa: { contains: search, mode: "insensitive" } },
              { tipoEquipamento: { contains: search, mode: "insensitive" } }
            ]
          }
        : undefined,
      orderBy: { numeroFrota: "asc" },
      take: limit
    });
    return res.json({ fleets });
  } catch (error) {
    return next(error);
  }
});

yardRoutes.get("/stale", requirePermission("yard:stale"), async (req, res, next) => {
  try {
    const branch = branchValue(req.query.branch);
    const hours = pageValue(req.query.hours, 2, 24 * 365);
    const page = pageValue(req.query.page, 1);
    const limit = pageValue(req.query.limit, 20, 100);
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const where = { branch, updatedAt: { lt: cutoff } };
    const [locations, total] = await prisma.$transaction([
      prisma.yardLocation.findMany({
        where,
        include: yardLocationInclude,
        orderBy: { updatedAt: "asc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.yardLocation.count({ where })
    ]);
    return res.json({ locations, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, staleAfterHours: hours });
  } catch (error) {
    return next(error);
  }
});

yardRoutes.get("/locations", requirePermission("yard:view"), async (req, res, next) => {
  try {
    const branch = branchValue(req.query.branch);
    const search = text(req.query.search);
    const staleHours = text(req.query.stale) ? pageValue(req.query.stale, 2, 24 * 365) : null;
    const page = pageValue(req.query.page, 1);
    const limit = pageValue(req.query.limit, 100, 500);
    const where = {
      branch,
      ...(search
        ? {
            fleet: {
              OR: [
                { numeroFrota: { contains: search, mode: "insensitive" as const } },
                { placa: { contains: search, mode: "insensitive" as const } },
                { tipoEquipamento: { contains: search, mode: "insensitive" as const } }
              ]
            }
          }
        : {}),
      ...(staleHours ? { updatedAt: { lt: new Date(Date.now() - staleHours * 60 * 60 * 1000) } } : {})
    };
    const [locations, total] = await prisma.$transaction([
      prisma.yardLocation.findMany({
        where,
        include: yardLocationInclude,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.yardLocation.count({ where })
    ]);
    return res.json({ locations, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
});

yardRoutes.get("/locations/:fleetId/history", requirePermission("yard:history"), async (req, res, next) => {
  try {
    const branch = branchValue(req.query.branch);
    const page = pageValue(req.query.page, 1);
    const limit = pageValue(req.query.limit, 20, 100);
    const fleet = await prisma.frota.findUnique({ where: { id: text(req.params.fleetId) }, select: { id: true } });
    if (!fleet) throw new AppError("Frota não encontrada.", 404, "NOT_FOUND");
    const where = { fleetId: fleet.id, branch };
    const [history, total] = await prisma.$transaction([
      prisma.yardLocationHistory.findMany({ where, include: yardLocationInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.yardLocationHistory.count({ where })
    ]);
    return res.json({ history, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
});

yardRoutes.get("/locations/:fleetId", requirePermission("yard:view"), async (req, res, next) => {
  try {
    const branch = branchValue(req.query.branch);
    const fleet = await prisma.frota.findUnique({ where: { id: text(req.params.fleetId) } });
    if (!fleet) throw new AppError("Frota não encontrada.", 404, "NOT_FOUND");
    const [location, history] = await Promise.all([
      prisma.yardLocation.findUnique({ where: { fleetId_branch: { fleetId: fleet.id, branch } }, include: yardLocationInclude }),
      prisma.yardLocationHistory.findMany({ where: { fleetId: fleet.id, branch }, include: yardLocationInclude, orderBy: { createdAt: "desc" }, take: 10 })
    ]);
    return res.json({ fleet, location, history });
  } catch (error) {
    return next(error);
  }
});

yardRoutes.put("/locations/:fleetId", requirePermission("yard:update"), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) throw new AppError("Usuário não autenticado.", 401, "UNAUTHORIZED");
    const input = parseUpdateBody(req.body);
    const result = await updateYardLocation({
      fleetId: text(req.params.fleetId),
      ...input,
      source: "MANUAL",
      updatedById: authReq.user.id
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});
