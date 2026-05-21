import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import type { PrismaClient } from "@prisma/client";

export const frotaRoutes = Router();

function normalizeQuery(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateFrotaPayload(body: unknown) {
  const payload = body as Record<string, unknown> | null;

  if (!payload || typeof payload !== "object") {
    throw new AppError("Payload inválido", 400, "BAD_REQUEST");
  }

  const numeroFrota = normalizeQuery(payload.numeroFrota);
  const placa = normalizeQuery(payload.placa);
  const tipoEquipamento = normalizeQuery(payload.tipoEquipamento);
  const material = normalizeQuery(payload.material);
  const capacidade = normalizeQuery(payload.capacidade);
  const observacoesFixas = typeof payload.observacoesFixas === "string" ? payload.observacoesFixas.trim() : null;

  if (!numeroFrota || !placa || !tipoEquipamento || !material || !capacidade) {
    throw new AppError("Campos obrigatórios ausentes", 400, "BAD_REQUEST");
  }

  return {
    numeroFrota,
    placa,
    tipoEquipamento,
    material,
    capacidade,
    observacoesFixas
  };
}

frotaRoutes.get("/", async (_req, res, next) => {
  try {
    const frotas = await prisma.frota.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.json({ frotas });
  } catch (error) {
    return next(error);
  }
});

frotaRoutes.get("/search", async (req, res, next) => {
  try {
    const query = normalizeQuery(req.query.query);

    if (!query) {
      return res.json({ frotas: [] });
    }

    const frotas = await prisma.frota.findMany({
      where: {
        OR: [
          { numeroFrota: { contains: query, mode: "insensitive" } },
          { placa: { contains: query, mode: "insensitive" } },
          { tipoEquipamento: { contains: query, mode: "insensitive" } }
        ]
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.json({ frotas });
  } catch (error) {
    return next(error);
  }
});

frotaRoutes.get("/numero/:numeroFrota/historico", async (req, res, next) => {
  try {
    const numeroFrota = normalizeQuery(req.params.numeroFrota);

    if (!numeroFrota) {
      throw new AppError("Número da frota inválido", 400, "BAD_REQUEST");
    }

    const frota =
      (await prisma.frota.findUnique({
        where: { numeroFrota }
      })) ??
      (await prisma.frota.findFirst({
        where: {
          numeroFrota: {
            equals: numeroFrota,
            mode: "insensitive"
          }
        }
      })) ??
      (await prisma.frota.findFirst({
        where: {
          numeroFrota: {
            contains: numeroFrota,
            mode: "insensitive"
          }
        },
        orderBy: {
          numeroFrota: "asc"
        }
      }));

    if (!frota) {
      return res.json({
        frota: null,
        ultimaInspecao: null,
        resumoRecorrencia: null
      });
    }

    const inspecoes = await prisma.inspecao.findMany({
      where: {
        frotaId: frota.id
      },
      orderBy: {
        dataInspecao: "desc"
      },
      include: {
        pontosCriticos: true
      }
    });

    const ultimaInspecao = inspecoes[0] ?? null;

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

    return res.json({
      frota,
      ultimaInspecao,
      resumoRecorrencia: {
        itensRecorrentes,
        mensagemResumo:
          itensRecorrentes.length > 0
            ? `Atenção: esta frota possui recorrência de ${itensRecorrentes[0].categoria} na região de ${itensRecorrentes[0].localizacao}.`
            : "Nenhuma recorrência relevante identificada no histórico da frota."
      }
    });
  } catch (error) {
    return next(error);
  }
});

frotaRoutes.get("/:id", async (req, res, next) => {
  try {
    const frota = await prisma.frota.findUnique({
      where: { id: req.params.id }
    });

    if (!frota) {
      throw new AppError("Frota não encontrada", 404, "NOT_FOUND");
    }

    return res.json({ frota });
  } catch (error) {
    return next(error);
  }
});

frotaRoutes.post("/", async (req, res, next) => {
  try {
    const data = validateFrotaPayload(req.body);

    const frota = await prisma.frota.create({
      data
    });

    return res.status(201).json({ frota });
  } catch (error) {
    return next(error);
  }
});

frotaRoutes.patch("/:id", async (req, res, next) => {
  try {
    const payload = req.body as Record<string, unknown> | null;

    if (!payload || typeof payload !== "object") {
      throw new AppError("Payload inválido", 400, "BAD_REQUEST");
    }

    const data: Record<string, string | null> = {};

    if (typeof payload.numeroFrota === "string") data.numeroFrota = payload.numeroFrota.trim();
    if (typeof payload.placa === "string") data.placa = payload.placa.trim();
    if (typeof payload.tipoEquipamento === "string") data.tipoEquipamento = payload.tipoEquipamento.trim();
    if (typeof payload.material === "string") data.material = payload.material.trim();
    if (typeof payload.capacidade === "string") data.capacidade = payload.capacidade.trim();
    if (typeof payload.observacoesFixas === "string") data.observacoesFixas = payload.observacoesFixas.trim();
    if (payload.observacoesFixas === null) data.observacoesFixas = null;

    const frota = await prisma.frota.update({
      where: { id: req.params.id },
      data
    });

    return res.json({ frota });
  } catch (error) {
    return next(error);
  }
});

frotaRoutes.delete("/:id", async (req, res, next) => {
  try {
    const frota = await prisma.frota.findUnique({
      where: { id: req.params.id },
      include: {
        inspecoes: {
          select: { id: true },
          take: 1
        }
      }
    });

    if (!frota) {
      throw new AppError("Frota não encontrada", 404, "NOT_FOUND");
    }

    if (frota.inspecoes.length > 0) {
      throw new AppError("Esta frota possui histórico de inspeções e não pode ser excluída.", 400, "BAD_REQUEST");
    }

    await prisma.frota.delete({
      where: { id: req.params.id }
    });

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});
