import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { getSectorForPoint, isPointInsideYard, validateYardMapDocument } from "../../../shared/yardGeometry";

function hydrateMap(map: any) {
  return validateYardMapDocument({
    ...map.document,
    schemaVersion: 2,
    elements: (map.elements || []).map((element: any) => ({
      id: element.id, parentId: element.parentId, groupId: element.groupId, category: element.category,
      type: element.elementType, name: element.name, layerId: element.layerId, geometry: element.geometry,
      style: element.style, properties: element.properties, zIndex: element.zIndex, locked: element.locked,
      visible: element.visible, createdAt: element.createdAt.toISOString(), updatedAt: element.updatedAt.toISOString()
    }))
  });
}

type YardLocationAccuracy = "EXACT" | "APPROXIMATE";
type YardLocationSource = "MANUAL" | "OCR";

export type UpdateYardLocationInput = {
  fleetId: string;
  branch: string;
  xPercent: number;
  yPercent: number;
  note: string | null;
  accuracy: YardLocationAccuracy;
  source: YardLocationSource;
  sector?: string | null;
  updatedById: string;
};

const MAX_NOTE_LENGTH = 500;

function validateServiceInput(input: UpdateYardLocationInput) {
  if (!input.fleetId || !input.updatedById) {
    throw new AppError("Frota e usuário responsável são obrigatórios.", 400, "BAD_REQUEST");
  }
  if (!/^[A-Z0-9_-]{2,40}$/.test(input.branch)) {
    throw new AppError("Filial inválida.", 400, "BAD_REQUEST");
  }
  if (!Number.isFinite(input.xPercent) || input.xPercent < 0 || input.xPercent > 1) {
    throw new AppError("xPercent deve ser um número entre 0 e 1.", 400, "BAD_REQUEST");
  }
  if (!Number.isFinite(input.yPercent) || input.yPercent < 0 || input.yPercent > 1) {
    throw new AppError("yPercent deve ser um número entre 0 e 1.", 400, "BAD_REQUEST");
  }
  if (!(["EXACT", "APPROXIMATE"] as const).includes(input.accuracy)) {
    throw new AppError("Precisão inválida.", 400, "BAD_REQUEST");
  }
  if (!(["MANUAL", "OCR"] as const).includes(input.source)) {
    throw new AppError("Origem da localização inválida.", 400, "BAD_REQUEST");
  }

  const note = input.note?.replace(/[\u0000-\u001F\u007F]/g, " ").trim() || null;
  if (note && note.length > MAX_NOTE_LENGTH) {
    throw new AppError(`A observação deve ter no máximo ${MAX_NOTE_LENGTH} caracteres.`, 400, "BAD_REQUEST");
  }

  return { ...input, note };
}

const yardLocationInclude = {
  fleet: true,
  updatedBy: {
    select: { id: true, name: true, fullName: true }
  }
} as const;

/** Shared write path for manual updates now and OCR integrations in the future. */
export async function updateYardLocation(input: UpdateYardLocationInput) {
  const validated = validateServiceInput(input);

  return prisma.$transaction(async (tx: typeof prisma) => {
    const [fleet, user, yardMap] = await Promise.all([
      tx.frota.findUnique({ where: { id: validated.fleetId }, select: { id: true } }),
      tx.user.findUnique({ where: { id: validated.updatedById }, select: { id: true } }),
      tx.yardMap.findUnique({ where: { branch: validated.branch }, include: { elements: { orderBy: { zIndex: "asc" } } } })
    ]);

    if (!fleet) {
      throw new AppError("Frota não encontrada.", 404, "NOT_FOUND");
    }
    if (!user) {
      throw new AppError("Usuário autenticado não encontrado.", 401, "UNAUTHORIZED");
    }
    if (!yardMap) {
      throw new AppError("A filial ainda não possui um mapa configurado.", 400, "YARD_MAP_NOT_FOUND");
    }
    const document = hydrateMap(yardMap);
    const point = { xPercent: validated.xPercent, yPercent: validated.yPercent };
    if (!isPointInsideYard(point, document)) {
      throw new AppError("O ponto deve estar dentro dos limites permitidos do mapa.", 400, "OUTSIDE_YARD");
    }
    const sector = getSectorForPoint(point, document);
    if (validated.sector && validated.sector !== sector) {
      throw new AppError("O setor informado não corresponde às coordenadas selecionadas.", 400, "INVALID_SECTOR");
    }

    const data = {
      xPercent: validated.xPercent,
      yPercent: validated.yPercent,
      note: validated.note,
      sector,
      accuracy: validated.accuracy,
      source: validated.source,
      updatedById: validated.updatedById
    };

    const location = await tx.yardLocation.upsert({
      where: {
        fleetId_branch: { fleetId: validated.fleetId, branch: validated.branch }
      },
      create: {
        fleetId: validated.fleetId,
        branch: validated.branch,
        ...data
      },
      update: data,
      include: yardLocationInclude
    });

    const history = await tx.yardLocationHistory.create({
      data: {
        fleetId: validated.fleetId,
        branch: validated.branch,
        ...data
      },
      include: yardLocationInclude
    });

    return { location, history };
  });
}

export { yardLocationInclude };
