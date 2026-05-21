import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";
import type { Severidade, StatusInspecao, TipoInspecao } from "../../../shared/types";

export const inspecaoRoutes = Router();

type PontoCriticoInput = {
  categoria: string;
  localizacao: string;
  descricao: string;
  severidade: Severidade;
  procedimentoRecomendado: string;
};

type CreateInspecaoInput = {
  frotaId?: string;
  numeroFrota: string;
  placa: string;
  tipoEquipamento: string;
  dataInspecao: string;
  tipoInspecao: TipoInspecao;
  status: StatusInspecao;
  colaboradorId?: string | null;
  resultadoPosLavagem?: "APROVADO" | "REPROVADO" | null;
  motivoNaoConformidade?: string | null;
  observacoesGerais?: string | null;
  pontosCriticos?: PontoCriticoInput[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePontosCriticos(value: unknown): PontoCriticoInput[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new AppError("pontosCriticos deve ser um array", 400, "BAD_REQUEST");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new AppError(`Ponto crítico inválido no índice ${index}`, 400, "BAD_REQUEST");
    }

    const categoria = asTrimmedString(item.categoria);
    const localizacao = asTrimmedString(item.localizacao);
    const descricao = asTrimmedString(item.descricao);
    const severidade = asTrimmedString(item.severidade) as Severidade;
    const procedimentoRecomendado = asTrimmedString(item.procedimentoRecomendado);

    if (!categoria || !localizacao || !descricao || !procedimentoRecomendado) {
      throw new AppError(`Ponto crítico inválido no índice ${index}`, 400, "BAD_REQUEST");
    }

    if (!["LEVE", "MEDIA", "GRAVE"].includes(severidade)) {
      throw new AppError(`Ponto crítico inválido no índice ${index}`, 400, "BAD_REQUEST");
    }

    return {
      categoria,
      localizacao,
      descricao,
      severidade,
      procedimentoRecomendado
    };
  });
}

function parseCreateInspecao(body: unknown): CreateInspecaoInput {
  if (!isRecord(body)) {
    throw new AppError("Payload inválido", 400, "BAD_REQUEST");
  }

  const frotaId = asTrimmedString(body.frotaId);
  const numeroFrota = asTrimmedString(body.numeroFrota);
  const placa = asTrimmedString(body.placa);
  const tipoEquipamento = asTrimmedString(body.tipoEquipamento);
  const dataInspecao = asTrimmedString(body.dataInspecao);
  const tipoInspecao = asTrimmedString(body.tipoInspecao) as TipoInspecao;
  const status = asTrimmedString(body.status) as StatusInspecao;
  const colaboradorId = asTrimmedString(body.colaboradorId);
  const resultadoPosLavagem = asTrimmedString(body.resultadoPosLavagem) as "APROVADO" | "REPROVADO" | "";
  const motivoNaoConformidade = asTrimmedString(body.motivoNaoConformidade);
  const observacoesGerais = typeof body.observacoesGerais === "string" ? body.observacoesGerais.trim() : null;
  const pontosCriticos = parsePontosCriticos(body.pontosCriticos);

  if (!numeroFrota || !placa || !tipoEquipamento || !dataInspecao || !tipoInspecao || !status) {
    throw new AppError("Campos obrigatórios ausentes", 400, "BAD_REQUEST");
  }

  if (!["ANTES_LAVAGEM", "APOS_LAVAGEM"].includes(tipoInspecao)) {
    throw new AppError("tipoInspecao inválido", 400, "BAD_REQUEST");
  }

  if (!["APROVADO", "REPROVADO", "COM_OBSERVACAO"].includes(status)) {
    throw new AppError("status inválido", 400, "BAD_REQUEST");
  }

  if (tipoInspecao === "APOS_LAVAGEM") {
    if (!colaboradorId || !resultadoPosLavagem) {
      throw new AppError("Colaborador e resultado são obrigatórios para inspeção pós-lavagem", 400, "BAD_REQUEST");
    }

    if (!["APROVADO", "REPROVADO"].includes(resultadoPosLavagem)) {
      throw new AppError("resultadoPosLavagem inválido", 400, "BAD_REQUEST");
    }

    if (resultadoPosLavagem === "REPROVADO" && !motivoNaoConformidade) {
      throw new AppError("Motivo da não conformidade é obrigatório para reprovação", 400, "BAD_REQUEST");
    }
  }

  const parsedDate = new Date(dataInspecao);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError("dataInspecao inválida", 400, "BAD_REQUEST");
  }

  return {
    frotaId: frotaId || undefined,
    numeroFrota,
    placa,
    tipoEquipamento,
    dataInspecao: parsedDate.toISOString(),
    tipoInspecao,
    status,
    colaboradorId: tipoInspecao === "APOS_LAVAGEM" ? colaboradorId : null,
    resultadoPosLavagem: tipoInspecao === "APOS_LAVAGEM" && resultadoPosLavagem ? resultadoPosLavagem : null,
    motivoNaoConformidade: tipoInspecao === "APOS_LAVAGEM" && resultadoPosLavagem === "REPROVADO" ? motivoNaoConformidade : null,
    observacoesGerais,
    pontosCriticos
  };
}

function formatInspecao(inspecao: {
  id: string;
  frotaId: string;
  dataInspecao: Date;
  tipoInspecao: TipoInspecao;
  status: StatusInspecao;
  colaboradorId?: string | null;
  resultadoPosLavagem?: "APROVADO" | "REPROVADO" | null;
  motivoNaoConformidade?: string | null;
  observacoesGerais: string | null;
  nomeInspetor: string;
  createdAt: Date;
  updatedAt: Date;
  frota?: {
    id: string;
    numeroFrota: string;
    placa: string;
    tipoEquipamento: string;
    material: string;
    capacidade: string;
    observacoesFixas: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  colaborador?: {
    id: string;
    nome: string;
    ativo: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  pontosCriticos: Array<{
    id: string;
    inspecaoId: string;
    categoria: string;
    localizacao: string;
    descricao: string;
    severidade: Severidade;
    procedimentoRecomendado: string;
    createdAt: Date;
    fotos?: Array<{
      id: string;
      inspecaoId: string;
      pontoCriticoId: string | null;
      imageUrl: string;
      fileName: string;
      legenda: string | null;
      createdAt: Date;
    }>;
  }>;
  fotos?: Array<{
    id: string;
    inspecaoId: string;
    pontoCriticoId: string | null;
    imageUrl: string;
    fileName: string;
    legenda: string | null;
    createdAt: Date;
  }>;
}) {
  return {
    id: inspecao.id,
    frotaId: inspecao.frotaId,
    frota: inspecao.frota
      ? {
          id: inspecao.frota.id,
          numeroFrota: inspecao.frota.numeroFrota,
          placa: inspecao.frota.placa,
          tipoEquipamento: inspecao.frota.tipoEquipamento,
          material: inspecao.frota.material,
          capacidade: inspecao.frota.capacidade,
          observacoesFixas: inspecao.frota.observacoesFixas,
          createdAt: inspecao.frota.createdAt.toISOString(),
          updatedAt: inspecao.frota.updatedAt.toISOString()
        }
      : null,
    dataInspecao: inspecao.dataInspecao.toISOString(),
    tipoInspecao: inspecao.tipoInspecao,
    status: inspecao.status,
    colaboradorId: inspecao.colaboradorId ?? null,
    colaborador: inspecao.colaborador
      ? {
          id: inspecao.colaborador.id,
          nome: inspecao.colaborador.nome,
          ativo: inspecao.colaborador.ativo,
          createdAt: inspecao.colaborador.createdAt.toISOString(),
          updatedAt: inspecao.colaborador.updatedAt.toISOString()
        }
      : null,
    resultadoPosLavagem: inspecao.resultadoPosLavagem ?? null,
    motivoNaoConformidade: inspecao.motivoNaoConformidade ?? null,
    observacoesGerais: inspecao.observacoesGerais,
    nomeInspetor: inspecao.nomeInspetor,
    createdAt: inspecao.createdAt.toISOString(),
    updatedAt: inspecao.updatedAt.toISOString(),
    pontosCriticos: inspecao.pontosCriticos.map((ponto) => ({
      id: ponto.id,
      inspecaoId: ponto.inspecaoId,
      categoria: ponto.categoria,
      localizacao: ponto.localizacao,
      descricao: ponto.descricao,
      severidade: ponto.severidade,
      procedimentoRecomendado: ponto.procedimentoRecomendado,
      createdAt: ponto.createdAt.toISOString(),
      fotos: (ponto.fotos ?? []).map((foto) => ({
        id: foto.id,
        inspecaoId: foto.inspecaoId,
        pontoCriticoId: foto.pontoCriticoId,
        imageUrl: foto.imageUrl,
        fileName: foto.fileName,
        legenda: foto.legenda,
        createdAt: foto.createdAt.toISOString()
      }))
    })),
    fotos: (inspecao.fotos ?? []).map((foto) => ({
      id: foto.id,
      inspecaoId: foto.inspecaoId,
      pontoCriticoId: foto.pontoCriticoId,
      imageUrl: foto.imageUrl,
      fileName: foto.fileName,
      legenda: foto.legenda,
      createdAt: foto.createdAt.toISOString()
    }))
  };
}

function buildRecorrencia(inspecoes: Array<{
  pontosCriticos: Array<{
    categoria: string;
    localizacao: string;
    descricao: string;
  }>;
}>) {
  const mapa = new Map<string, { categoria: string; localizacao: string; ocorrencias: number }>();

  for (const inspecao of inspecoes) {
    for (const ponto of inspecao.pontosCriticos) {
      const key = `${ponto.categoria.toLowerCase()}::${ponto.localizacao.toLowerCase()}`;
      const current = mapa.get(key);

      if (current) {
        current.ocorrencias += 1;
      } else {
        mapa.set(key, {
          categoria: ponto.categoria,
          localizacao: ponto.localizacao,
          ocorrencias: 1
        });
      }
    }
  }

  const itensRecorrentes = Array.from(mapa.values()).filter((item) => item.ocorrencias > 1);

  const mensagemResumo =
    itensRecorrentes.length > 0
      ? `Atenção: esta frota possui recorrência de ${itensRecorrentes[0].categoria} na região de ${itensRecorrentes[0].localizacao}.`
      : "Nenhuma recorrência relevante identificada no histórico da frota.";

  return {
    itensRecorrentes,
    mensagemResumo
  };
}

inspecaoRoutes.get("/", async (req, res, next) => {
  try {
    const search = asTrimmedString(req.query.search);

    const inspecoes = await prisma.inspecao.findMany({
      where: search
        ? {
            OR: [
              { frota: { numeroFrota: { contains: search, mode: "insensitive" } } },
              { frota: { placa: { contains: search, mode: "insensitive" } } },
              { dataInspecao: { equals: new Date(search) } }
            ]
          }
        : undefined,
      orderBy: {
        dataInspecao: "desc"
      },
      include: {
        frota: true,
        colaborador: true,
        pontosCriticos: {
          include: {
            fotos: true
          }
        },
        fotos: true
      }
    });

    return res.json({
      inspecoes: inspecoes.map((inspecao: Parameters<typeof formatInspecao>[0]) =>
        formatInspecao({
          ...inspecao,
          pontosCriticos: inspecao.pontosCriticos,
          fotos: inspecao.fotos
        })
      )
    });
  } catch (error) {
    return next(error);
  }
});

inspecaoRoutes.post("/", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      throw new AppError("Usuário não autenticado", 401, "UNAUTHORIZED");
    }

    const payload = parseCreateInspecao(req.body);
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.id },
      select: { id: true, name: true, fullName: true }
    });
    const nomeInspetor = user?.fullName?.trim() || user?.name?.trim() || authReq.user.name;

    if (payload.colaboradorId) {
      const colaborador = await prisma.collaborator.findUnique({
        where: { id: payload.colaboradorId }
      });
      if (!colaborador || !colaborador.ativo) {
        throw new AppError("Colaborador inválido ou inativo", 400, "BAD_REQUEST");
      }
    }

    let frota = payload.frotaId
      ? await prisma.frota.findUnique({
          where: { id: payload.frotaId }
        })
      : null;

    if (!frota) {
      frota = await prisma.frota.findUnique({
        where: { numeroFrota: payload.numeroFrota }
      });
    }

    if (!frota) {
      frota = await prisma.frota.create({
        data: {
          numeroFrota: payload.numeroFrota,
          placa: payload.placa,
          tipoEquipamento: payload.tipoEquipamento,
          material: payload.tipoEquipamento,
          capacidade: "Não informado",
          observacoesFixas: null
        }
      });
    } else {
      frota = await prisma.frota.update({
        where: { id: frota.id },
        data: {
          placa: payload.placa,
          tipoEquipamento: payload.tipoEquipamento
        }
      });
    }

    const inspecao = await prisma.$transaction(async (tx: typeof prisma) => {
      const created = await tx.inspecao.create({
        data: {
          frotaId: frota.id,
          dataInspecao: new Date(payload.dataInspecao),
          tipoInspecao: payload.tipoInspecao,
          status: payload.status,
          colaboradorId: payload.colaboradorId,
          resultadoPosLavagem: payload.resultadoPosLavagem,
          motivoNaoConformidade: payload.motivoNaoConformidade,
          observacoesGerais: payload.observacoesGerais,
          nomeInspetor,
          userId: user?.id ?? authReq.user!.id
        }
      });

      if (payload.pontosCriticos && payload.pontosCriticos.length > 0) {
        await tx.pontoCritico.createMany({
          data: payload.pontosCriticos.map((ponto) => ({
            inspecaoId: created.id,
            categoria: ponto.categoria,
            localizacao: ponto.localizacao,
            descricao: ponto.descricao,
            severidade: ponto.severidade,
            procedimentoRecomendado: ponto.procedimentoRecomendado
          }))
        });
      }

      return tx.inspecao.findUnique({
        where: { id: created.id },
        include: {
          frota: true,
          colaborador: true,
          pontosCriticos: {
            include: {
              fotos: true
            }
          },
          fotos: true
        }
      });
    });

    if (!inspecao) {
      throw new AppError("Falha ao criar inspeção", 500, "INTERNAL_SERVER_ERROR");
    }

    return res.status(201).json({
      inspecao: formatInspecao(inspecao)
    });
  } catch (error) {
    return next(error);
  }
});

inspecaoRoutes.get("/frotas/:frotaId/inspecoes", async (req, res, next) => {
  try {
    const frota = await prisma.frota.findUnique({
      where: { id: req.params.frotaId }
    });

    if (!frota) {
      throw new AppError("Frota não encontrada", 404, "NOT_FOUND");
    }

    const inspecoes = await prisma.inspecao.findMany({
      where: {
        frotaId: req.params.frotaId
      },
      orderBy: {
        dataInspecao: "desc"
      },
      include: {
        frota: true,
        colaborador: true,
        pontosCriticos: {
          include: {
            fotos: true
          }
        },
        fotos: true
      }
    });

    return res.json({
      frota,
      inspecoes: inspecoes.map(formatInspecao)
    });
  } catch (error) {
    return next(error);
  }
});

inspecaoRoutes.get("/frotas/:frotaId/historico", async (req, res, next) => {
  try {
    const frota = await prisma.frota.findUnique({
      where: { id: req.params.frotaId }
    });

    if (!frota) {
      throw new AppError("Frota não encontrada", 404, "NOT_FOUND");
    }

    const inspecoes = await prisma.inspecao.findMany({
      where: {
        frotaId: req.params.frotaId
      },
      orderBy: {
        dataInspecao: "desc"
      },
      include: {
        frota: true,
        colaborador: true,
        pontosCriticos: {
          include: {
            fotos: true
          }
        },
        fotos: true
      }
    });

    const ultimaInspecao = inspecoes[0] ? formatInspecao(inspecoes[0]) : null;
    const resumo = buildRecorrencia(inspecoes);

    return res.json({
      frota,
      ultimaInspecao,
      inspecoes: inspecoes.map(formatInspecao),
      resumoRecorrencia: resumo
    });
  } catch (error) {
    return next(error);
  }
});

inspecaoRoutes.get("/:id", async (req, res, next) => {
  try {
    const inspecao = await prisma.inspecao.findUnique({
      where: { id: req.params.id },
      include: {
        frota: true,
        colaborador: true,
        pontosCriticos: {
          include: {
            fotos: true
          }
        },
        fotos: true
      }
    });

    if (!inspecao) {
      throw new AppError("Inspeção não encontrada", 404, "NOT_FOUND");
    }

    return res.json({
      inspecao: formatInspecao(inspecao)
    });
  } catch (error) {
    return next(error);
  }
});

inspecaoRoutes.get("/frotas/:frotaId/resumo-recorrencia", async (req, res, next) => {
  try {
    const frota = await prisma.frota.findUnique({
      where: { id: req.params.frotaId }
    });

    if (!frota) {
      throw new AppError("Frota não encontrada", 404, "NOT_FOUND");
    }

    const inspecoes = await prisma.inspecao.findMany({
      where: {
        frotaId: req.params.frotaId
      },
      orderBy: {
        dataInspecao: "desc"
      },
      include: {
        pontosCriticos: true
      }
    });

    const resumo = buildRecorrencia(inspecoes);

    return res.json({
      frotaId: req.params.frotaId,
      ...resumo
    });
  } catch (error) {
    return next(error);
  }
});

inspecaoRoutes.patch("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.inspecao.findUnique({
      where: { id: req.params.id },
      include: {
        pontosCriticos: true
      }
    });

    if (!existing) {
      throw new AppError("Inspeção não encontrada", 404, "NOT_FOUND");
    }

    const payload = req.body as Record<string, unknown> | null;
    if (!payload || typeof payload !== "object") {
      throw new AppError("Payload inválido", 400, "BAD_REQUEST");
    }

    const data: Record<string, unknown> = {};

    if (typeof payload.observacoesGerais === "string") {
      data.observacoesGerais = payload.observacoesGerais.trim();
    } else if (payload.observacoesGerais === null) {
      data.observacoesGerais = null;
    }

    if (typeof payload.dataInspecao === "string" && payload.dataInspecao.trim()) {
      const parsedDate = new Date(payload.dataInspecao);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new AppError("dataInspecao inválida", 400, "BAD_REQUEST");
      }
      data.dataInspecao = parsedDate;
    }

    const pontosCriticosInput = payload.pontosCriticos;
    if (pontosCriticosInput !== undefined) {
      const pontosCriticos = parsePontosCriticos(pontosCriticosInput);

      await prisma.pontoCritico.deleteMany({
        where: { inspecaoId: existing.id }
      });

      if (pontosCriticos.length > 0) {
        await prisma.pontoCritico.createMany({
          data: pontosCriticos.map((ponto) => ({
            inspecaoId: existing.id,
            categoria: ponto.categoria,
            localizacao: ponto.localizacao,
            descricao: ponto.descricao,
            severidade: ponto.severidade,
            procedimentoRecomendado: ponto.procedimentoRecomendado
          }))
        });
      }
    }

    const updated = await prisma.inspecao.update({
      where: { id: existing.id },
      data,
      include: {
        frota: true,
        colaborador: true,
        pontosCriticos: {
          include: {
            fotos: true
          }
        },
        fotos: true
      }
    });

    return res.json({ inspecao: formatInspecao(updated) });
  } catch (error) {
    return next(error);
  }
});

inspecaoRoutes.delete("/:id", async (req, res, next) => {
  try {
    const inspecao = await prisma.inspecao.findUnique({
      where: { id: req.params.id }
    });

    if (!inspecao) {
      throw new AppError("Inspeção não encontrada", 404, "NOT_FOUND");
    }

    await prisma.inspecao.delete({
      where: { id: req.params.id }
    });

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});
