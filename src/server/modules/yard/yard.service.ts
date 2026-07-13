import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { getSectorForPoint } from "../../../shared/yardGeometry";
import type { YardSectorId } from "../../../shared/yardMapConfig";

type YardBranch = "PAULINIA";
type YardLocationAccuracy = "EXACT" | "APPROXIMATE";
type YardLocationSource = "MANUAL" | "OCR";

export type UpdateYardLocationInput = {
  fleetId: string;
  branch: YardBranch;
  xPercent: number;
  yPercent: number;
  note: string | null;
  accuracy: YardLocationAccuracy;
  source: YardLocationSource;
  sector?: YardSectorId | null;
  updatedById: string;
};

const MAX_NOTE_LENGTH = 500;

function validateServiceInput(input: UpdateYardLocationInput) {
  if (!input.fleetId || !input.updatedById) {
    throw new AppError("Frota e usuário responsável são obrigatórios.", 400, "BAD_REQUEST");
  }
  if (input.branch !== "PAULINIA") {
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

  const sector = getSectorForPoint({ xPercent: input.xPercent, yPercent: input.yPercent }, input.branch);
  if (!sector) {
    throw new AppError("O ponto deve estar dentro de um setor válido do pátio e fora das vias e construções.", 400, "OUTSIDE_YARD");
  }
  if (input.sector && input.sector !== sector) {
    throw new AppError("O setor informado não corresponde às coordenadas selecionadas.", 400, "INVALID_SECTOR");
  }

  const note = input.note?.replace(/[\u0000-\u001F\u007F]/g, " ").trim() || null;
  if (note && note.length > MAX_NOTE_LENGTH) {
    throw new AppError(`A observação deve ter no máximo ${MAX_NOTE_LENGTH} caracteres.`, 400, "BAD_REQUEST");
  }

  return { ...input, note, sector };
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
    const [fleet, user] = await Promise.all([
      tx.frota.findUnique({ where: { id: validated.fleetId }, select: { id: true } }),
      tx.user.findUnique({ where: { id: validated.updatedById }, select: { id: true } })
    ]);

    if (!fleet) {
      throw new AppError("Frota não encontrada.", 404, "NOT_FOUND");
    }
    if (!user) {
      throw new AppError("Usuário autenticado não encontrado.", 401, "UNAUTHORIZED");
    }

    const data = {
      xPercent: validated.xPercent,
      yPercent: validated.yPercent,
      note: validated.note,
      sector: validated.sector,
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
