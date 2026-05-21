import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";

export const postWashRoutes = Router();

const inspectionResults = ["APROVADO", "REPROVADO"] as const;
const failureReasons = [
  "FERRUGEM",
  "MANCHA",
  "AMARELAMENTO",
  "ODOR",
  "PRODUTO_RESIDUAL",
  "VALVULA_CONTAMINADA",
  "OUTRO"
] as const;

type InspectionResult = (typeof inspectionResults)[number];
type FailureReason = (typeof failureReasons)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: unknown) {
  const text = asTrimmedString(value);
  if (!text) return undefined;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("Data invÃ¡lida", 400, "BAD_REQUEST");
  }

  return date;
}

function normalizeOptionalText(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = asTrimmedString(value);
  return text || null;
}

function formatReason(value: string | null) {
  const labels: Record<string, string> = {
    FERRUGEM: "Ferrugem",
    MANCHA: "Mancha",
    AMARELAMENTO: "Amarelamento",
    ODOR: "Odor",
    PRODUTO_RESIDUAL: "Produto residual",
    VALVULA_CONTAMINADA: "VÃ¡lvula contaminada",
    OUTRO: "Outro"
  };

  return value ? labels[value] ?? value : null;
}

function formatInspection(inspection: {
  id: string;
  frota: string;
  colaboradorId: string;
  inspetor: string;
  resultado: InspectionResult;
  motivo: FailureReason | null;
  observacao: string | null;
  foto: string | null;
  createdAt: Date;
  updatedAt: Date;
  colaborador?: {
    id: string;
    nome: string;
    ativo: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}) {
  return {
    id: inspection.id,
    frota: inspection.frota,
    colaboradorId: inspection.colaboradorId,
    colaborador: inspection.colaborador
      ? {
          id: inspection.colaborador.id,
          nome: inspection.colaborador.nome,
          ativo: inspection.colaborador.ativo,
          createdAt: inspection.colaborador.createdAt.toISOString(),
          updatedAt: inspection.colaborador.updatedAt.toISOString()
        }
      : null,
    inspetor: inspection.inspetor,
    resultado: inspection.resultado,
    motivo: inspection.motivo,
    motivoLabel: formatReason(inspection.motivo),
    observacao: inspection.observacao,
    foto: inspection.foto,
    createdAt: inspection.createdAt.toISOString(),
    updatedAt: inspection.updatedAt.toISOString()
  };
}

function parseCreateInspection(body: unknown) {
  if (!isRecord(body)) {
    throw new AppError("Payload invÃ¡lido", 400, "BAD_REQUEST");
  }

  const frota = asTrimmedString(body.frota);
  const colaboradorId = asTrimmedString(body.colaboradorId);
  const inspetor = asTrimmedString(body.inspetor);
  const resultado = asTrimmedString(body.resultado) as InspectionResult;
  const motivoText = asTrimmedString(body.motivo) as FailureReason;
  const motivo = motivoText || null;
  const observacao = normalizeOptionalText(body.observacao);
  const foto = normalizeOptionalText(body.foto);

  if (!frota || !colaboradorId || !inspetor || !resultado) {
    throw new AppError("Campos obrigatÃ³rios ausentes", 400, "BAD_REQUEST");
  }

  if (!inspectionResults.includes(resultado)) {
    throw new AppError("Resultado invÃ¡lido", 400, "BAD_REQUEST");
  }

  if (resultado === "REPROVADO" && !motivo) {
    throw new AppError("Motivo Ã© obrigatÃ³rio para inspeÃ§Ã£o reprovada", 400, "BAD_REQUEST");
  }

  if (motivo && !failureReasons.includes(motivo)) {
    throw new AppError("Motivo invÃ¡lido", 400, "BAD_REQUEST");
  }

  return {
    frota,
    colaboradorId,
    inspetor,
    resultado,
    motivo: resultado === "REPROVADO" ? motivo : null,
    observacao,
    foto
  };
}

function buildInspectionWhere(query: Record<string, unknown>) {
  const where: Record<string, unknown> = {};
  const frota = asTrimmedString(query.frota);
  const colaborador = asTrimmedString(query.colaborador);
  const colaboradorId = asTrimmedString(query.colaboradorId);
  const resultado = asTrimmedString(query.resultado);
  const from = parseDate(query.from);
  const to = parseDate(query.to);

  if (frota) where.frota = { contains: frota, mode: "insensitive" };
  if (colaboradorId) where.colaboradorId = colaboradorId;
  if (colaborador) where.colaborador = { nome: { contains: colaborador, mode: "insensitive" } };
  if (resultado && inspectionResults.includes(resultado as InspectionResult)) where.resultado = resultado;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {})
    };
  }

  return where;
}

function calculateApprovalRate(total: number, approved: number) {
  return total > 0 ? Math.round((approved / total) * 1000) / 10 : 0;
}

function topReason(inspections: Array<{ motivo: FailureReason | null }>) {
  const counts = new Map<string, number>();
  for (const inspection of inspections) {
    if (!inspection.motivo) continue;
    counts.set(inspection.motivo, (counts.get(inspection.motivo) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([motivo, total]) => ({ motivo, motivoLabel: formatReason(motivo), total }))
    .sort((a, b) => b.total - a.total)[0] ?? null;
}

function monthlyKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

postWashRoutes.get("/collaborators", async (req, res, next) => {
  try {
    const search = asTrimmedString(req.query.search);

    const collaborators = await prisma.collaborator.findMany({
      where: search ? { nome: { contains: search, mode: "insensitive" } } : undefined,
      orderBy: [{ ativo: "desc" }, { nome: "asc" }]
    });

    return res.json({
      colaboradores: collaborators.map((collaborator: any) => ({
        ...collaborator,
        createdAt: collaborator.createdAt.toISOString(),
        updatedAt: collaborator.updatedAt.toISOString()
      }))
    });
  } catch (error) {
    return next(error);
  }
});

postWashRoutes.post("/collaborators", async (req, res, next) => {
  try {
    const nome = isRecord(req.body) ? asTrimmedString(req.body.nome) : "";
    if (!nome) {
      throw new AppError("Nome Ã© obrigatÃ³rio", 400, "BAD_REQUEST");
    }

    const collaborator = await prisma.collaborator.create({
      data: {
        nome,
        ativo: isRecord(req.body) && typeof req.body.ativo === "boolean" ? req.body.ativo : true
      }
    });

    return res.status(201).json({
      colaborador: {
        ...collaborator,
        createdAt: collaborator.createdAt.toISOString(),
        updatedAt: collaborator.updatedAt.toISOString()
      }
    });
  } catch (error) {
    return next(error);
  }
});

postWashRoutes.patch("/collaborators/:id", async (req, res, next) => {
  try {
    if (!isRecord(req.body)) {
      throw new AppError("Payload invÃ¡lido", 400, "BAD_REQUEST");
    }

    const data: Record<string, unknown> = {};
    if (typeof req.body.nome === "string") {
      const nome = req.body.nome.trim();
      if (!nome) throw new AppError("Nome Ã© obrigatÃ³rio", 400, "BAD_REQUEST");
      data.nome = nome;
    }
    if (typeof req.body.ativo === "boolean") data.ativo = req.body.ativo;

    const collaborator = await prisma.collaborator.update({
      where: { id: req.params.id },
      data
    });

    return res.json({
      colaborador: {
        ...collaborator,
        createdAt: collaborator.createdAt.toISOString(),
        updatedAt: collaborator.updatedAt.toISOString()
      }
    });
  } catch (error) {
    return next(error);
  }
});

postWashRoutes.get("/inspections", async (req, res, next) => {
  try {
    const inspections = await prisma.postWashInspection.findMany({
      where: buildInspectionWhere(req.query),
      include: { colaborador: true },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ inspecoes: inspections.map(formatInspection) });
  } catch (error) {
    return next(error);
  }
});

postWashRoutes.post("/inspections", async (req, res, next) => {
  try {
    const payload = parseCreateInspection(req.body);
    const collaborator = await prisma.collaborator.findUnique({
      where: { id: payload.colaboradorId }
    });

    if (!collaborator) {
      throw new AppError("Colaborador nÃ£o encontrado", 404, "NOT_FOUND");
    }

    if (!collaborator.ativo) {
      throw new AppError("Colaborador inativo nÃ£o pode receber nova inspeÃ§Ã£o", 400, "BAD_REQUEST");
    }

    const inspection = await prisma.postWashInspection.create({
      data: payload,
      include: { colaborador: true }
    });

    return res.status(201).json({ inspecao: formatInspection(inspection) });
  } catch (error) {
    return next(error);
  }
});

postWashRoutes.get("/inspections/:id", async (req, res, next) => {
  try {
    const inspection = await prisma.postWashInspection.findUnique({
      where: { id: req.params.id },
      include: { colaborador: true }
    });

    if (!inspection) {
      throw new AppError("InspeÃ§Ã£o pÃ³s-lavagem nÃ£o encontrada", 404, "NOT_FOUND");
    }

    return res.json({ inspecao: formatInspection(inspection) });
  } catch (error) {
    return next(error);
  }
});

postWashRoutes.get("/dashboard", async (req, res, next) => {
  try {
    const where = buildInspectionWhere(req.query);
    const inspections = await prisma.postWashInspection.findMany({
      where,
      include: { colaborador: true },
      orderBy: { createdAt: "asc" }
    });

    const total = inspections.length;
    const aprovadas = inspections.filter((item: any) => item.resultado === "APROVADO").length;
    const reprovadas = inspections.filter((item: any) => item.resultado === "REPROVADO").length;
    const reasons = new Map<string, number>();
    const evolution = new Map<string, { periodo: string; total: number; aprovadas: number; reprovadas: number }>();
    const collaboratorMap = new Map<string, any[]>();

    for (const inspection of inspections) {
      if (inspection.motivo) reasons.set(inspection.motivo, (reasons.get(inspection.motivo) ?? 0) + 1);

      const key = monthlyKey(inspection.createdAt);
      const current = evolution.get(key) ?? { periodo: key, total: 0, aprovadas: 0, reprovadas: 0 };
      current.total += 1;
      if (inspection.resultado === "APROVADO") current.aprovadas += 1;
      if (inspection.resultado === "REPROVADO") current.reprovadas += 1;
      evolution.set(key, current);

      const list = collaboratorMap.get(inspection.colaboradorId) ?? [];
      list.push(inspection);
      collaboratorMap.set(inspection.colaboradorId, list);
    }

    const indicadoresPorColaborador = Array.from(collaboratorMap.entries())
      .map(([colaboradorId, items]) => {
        const collaborator = items[0].colaborador;
        const totalColaborador = items.length;
        const aprovacoes = items.filter((item) => item.resultado === "APROVADO").length;
        const reprovaroes = items.filter((item) => item.resultado === "REPROVADO").length;
        const last = [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

        return {
          colaboradorId,
          colaboradorNome: collaborator?.nome ?? "Colaborador nÃ£o informado",
          totalInspecoes: totalColaborador,
          aprovacoes,
          reprovacoes: reprovaroes,
          taxaAprovacao: calculateApprovalRate(totalColaborador, aprovacoes),
          principalMotivoFalha: topReason(items),
          ultimaOcorrencia: last ? formatInspection(last) : null
        };
      })
      .sort((a, b) => a.colaboradorNome.localeCompare(b.colaboradorNome, "pt-BR"));

    return res.json({
      resumo: {
        totalInspecoes: total,
        aprovadas,
        reprovadas,
        taxaAprovacao: calculateApprovalRate(total, aprovadas)
      },
      principaisMotivos: Array.from(reasons.entries())
        .map(([motivo, quantidade]) => ({ motivo, motivoLabel: formatReason(motivo), quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade),
      evolucao: Array.from(evolution.values()),
      indicadoresPorColaborador
    });
  } catch (error) {
    return next(error);
  }
});

postWashRoutes.get("/collaborators/:id/performance", async (req, res, next) => {
  try {
    const collaborator = await prisma.collaborator.findUnique({
      where: { id: req.params.id }
    });

    if (!collaborator) {
      throw new AppError("Colaborador nÃ£o encontrado", 404, "NOT_FOUND");
    }

    const inspections = await prisma.postWashInspection.findMany({
      where: {
        colaboradorId: req.params.id
      },
      include: { colaborador: true },
      orderBy: { createdAt: "desc" }
    });

    const total = inspections.length;
    const aprovadas = inspections.filter((item: any) => item.resultado === "APROVADO").length;
    const reprovadas = inspections.filter((item: any) => item.resultado === "REPROVADO").length;
    const monthly = new Map<string, { periodo: string; total: number; aprovadas: number; reprovadas: number }>();

    for (const inspection of inspections) {
      const key = monthlyKey(inspection.createdAt);
      const current = monthly.get(key) ?? { periodo: key, total: 0, aprovadas: 0, reprovadas: 0 };
      current.total += 1;
      if (inspection.resultado === "APROVADO") current.aprovadas += 1;
      if (inspection.resultado === "REPROVADO") current.reprovadas += 1;
      monthly.set(key, current);
    }

    const evolucaoMensal = Array.from(monthly.values()).sort((a, b) => a.periodo.localeCompare(b.periodo));
    const recentMonths = evolucaoMensal.slice(-2);
    const tendencia =
      recentMonths.length < 2
        ? "Dados insuficientes para tendÃªncia"
        : calculateApprovalRate(recentMonths[1].total, recentMonths[1].aprovadas) >=
            calculateApprovalRate(recentMonths[0].total, recentMonths[0].aprovadas)
          ? "EvoluÃ§Ã£o positiva ou estÃ¡vel"
          : "Ponto de atenÃ§Ã£o para acompanhamento";
    const naoConformidades = new Map<string, number>();

    for (const inspection of inspections) {
      if (inspection.motivo) {
        naoConformidades.set(inspection.motivo, (naoConformidades.get(inspection.motivo) ?? 0) + 1);
      }
    }

    return res.json({
      colaborador: {
        ...collaborator,
        createdAt: collaborator.createdAt.toISOString(),
        updatedAt: collaborator.updatedAt.toISOString()
      },
      resumo: {
        totalInspecoes: total,
        aprovadas,
        reprovadas,
        taxaAprovacao: calculateApprovalRate(total, aprovadas)
      },
      principaisNaoConformidades: Array.from(naoConformidades.entries())
        .map(([motivo, quantidade]) => ({ motivo, motivoLabel: formatReason(motivo), quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade),
      historicoRecente: inspections.slice(0, 12).map(formatInspection),
      evolucaoMensal,
      tendencia
    });
  } catch (error) {
    return next(error);
  }
});
