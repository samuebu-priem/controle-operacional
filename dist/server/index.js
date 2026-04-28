// src/server/index.ts
import express from "express";
import "dotenv/config";
import cors from "cors";
import path2 from "path";
import { fileURLToPath } from "url";

// src/server/modules/auth/auth.routes.ts
import { Router } from "express";
import bcrypt from "bcryptjs";

// src/server/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// src/server/lib/jwt.ts
import jwt from "jsonwebtoken";
var fallbackSecret = "dev-only-secret-change-in-production";
function getSecret() {
  return process.env.JWT_SECRET || fallbackSecret;
}
function signAuthToken(payload) {
  return jwt.sign(payload, getSecret(), {
    expiresIn: "12h"
  });
}

// src/server/lib/jwt.js
import jwt2 from "jsonwebtoken";
var fallbackSecret2 = "dev-only-secret-change-in-production";
function getSecret2() {
  return process.env.JWT_SECRET || fallbackSecret2;
}
function verifyAuthToken(token) {
  const decoded = jwt2.verify(token, getSecret2());
  if (!decoded?.sub || !decoded?.name || !decoded?.email) {
    throw new Error("Invalid token payload");
  }
  return {
    sub: decoded.sub,
    name: decoded.name,
    email: decoded.email
  };
}

// src/server/middleware/auth.ts
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Token de autentica\xE7\xE3o ausente",
      code: "UNAUTHORIZED"
    });
  }
  const token = header.slice(7).trim();
  try {
    const payload = verifyAuthToken(token);
    req.user = {
      id: payload.sub,
      name: payload.name,
      email: payload.email
    };
    return next();
  } catch {
    return res.status(401).json({
      message: "Token inv\xE1lido ou expirado",
      code: "UNAUTHORIZED"
    });
  }
}

// src/server/middleware/errorHandler.ts
var AppError = class extends Error {
  statusCode;
  code;
  details;
  constructor(message, statusCode = 500, code, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
};
function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
      details: err.details
    });
  }
  const message = err instanceof Error ? err.message : "Erro interno inesperado";
  return res.status(500).json({
    message,
    code: "INTERNAL_SERVER_ERROR"
  });
}

// src/server/modules/auth/auth.routes.ts
var authRoutes = Router();
authRoutes.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      throw new AppError("E-mail e senha s\xE3o obrigat\xF3rios", 400, "BAD_REQUEST");
    }
    const user = await prisma.user.findUnique({
      where: { email }
    });
    if (!user) {
      throw new AppError("Credenciais inv\xE1lidas", 401, "UNAUTHORIZED");
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError("Credenciais inv\xE1lidas", 401, "UNAUTHORIZED");
    }
    const token = signAuthToken({
      sub: user.id,
      name: user.name,
      email: user.email
    });
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        fullName: user.fullName,
        jobTitle: user.jobTitle,
        email: user.email
      },
      token
    });
  } catch (error) {
    return next(error);
  }
});
authRoutes.get("/me", requireAuth, async (req, res, next) => {
  try {
    const authReq = req;
    if (!authReq.user) {
      throw new AppError("Usu\xE1rio n\xE3o autenticado", 401, "UNAUTHORIZED");
    }
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.id },
      select: {
        id: true,
        name: true,
        fullName: true,
        jobTitle: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!user) {
      throw new AppError("Usu\xE1rio n\xE3o encontrado", 404, "NOT_FOUND");
    }
    return res.json({
      user
    });
  } catch (error) {
    return next(error);
  }
});
authRoutes.patch("/me/profile", requireAuth, async (req, res, next) => {
  try {
    const authReq = req;
    if (!authReq.user) {
      throw new AppError("Usu\xC3\xA1rio n\xC3\xA3o autenticado", 401, "UNAUTHORIZED");
    }
    const { fullName, jobTitle } = req.body ?? {};
    if (typeof fullName !== "string" || typeof jobTitle !== "string") {
      throw new AppError("Nome completo e fun\xC3\xA7\xC3\xA3o s\xC3\xA3o obrigat\xC3\xB3rios", 400, "BAD_REQUEST");
    }
    const cleanFullName = fullName.trim();
    const cleanJobTitle = jobTitle.trim();
    if (!cleanFullName || !cleanJobTitle) {
      throw new AppError("Nome completo e fun\xC3\xA7\xC3\xA3o s\xC3\xA3o obrigat\xC3\xB3rios", 400, "BAD_REQUEST");
    }
    const user = await prisma.user.update({
      where: { id: authReq.user.id },
      data: {
        fullName: cleanFullName,
        jobTitle: cleanJobTitle
      },
      select: {
        id: true,
        name: true,
        fullName: true,
        jobTitle: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});

// src/server/modules/frotas/frota.routes.ts
import { Router as Router2 } from "express";
var frotaRoutes = Router2();
function normalizeQuery(value) {
  return typeof value === "string" ? value.trim() : "";
}
function validateFrotaPayload(body) {
  const payload = body;
  if (!payload || typeof payload !== "object") {
    throw new AppError("Payload inv\xE1lido", 400, "BAD_REQUEST");
  }
  const numeroFrota = normalizeQuery(payload.numeroFrota);
  const placa = normalizeQuery(payload.placa);
  const tipoEquipamento = normalizeQuery(payload.tipoEquipamento);
  const material = normalizeQuery(payload.material);
  const capacidade = normalizeQuery(payload.capacidade);
  const observacoesFixas = typeof payload.observacoesFixas === "string" ? payload.observacoesFixas.trim() : null;
  if (!numeroFrota || !placa || !tipoEquipamento || !material || !capacidade) {
    throw new AppError("Campos obrigat\xF3rios ausentes", 400, "BAD_REQUEST");
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
      throw new AppError("N\xFAmero da frota inv\xE1lido", 400, "BAD_REQUEST");
    }
    const frota = await prisma.frota.findUnique({
      where: { numeroFrota }
    });
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
    const mapa = /* @__PURE__ */ new Map();
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
        mensagemResumo: itensRecorrentes.length > 0 ? `Aten\xE7\xE3o: esta frota possui recorr\xEAncia de ${itensRecorrentes[0].categoria} na regi\xE3o de ${itensRecorrentes[0].localizacao}.` : "Nenhuma recorr\xEAncia relevante identificada no hist\xF3rico da frota."
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
      throw new AppError("Frota n\xE3o encontrada", 404, "NOT_FOUND");
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
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      throw new AppError("Payload inv\xE1lido", 400, "BAD_REQUEST");
    }
    const data = {};
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
      throw new AppError("Frota n\xE3o encontrada", 404, "NOT_FOUND");
    }
    if (frota.inspecoes.length > 0) {
      throw new AppError("Esta frota possui hist\xF3rico de inspe\xE7\xF5es e n\xE3o pode ser exclu\xEDda.", 400, "BAD_REQUEST");
    }
    await prisma.frota.delete({
      where: { id: req.params.id }
    });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

// src/server/modules/inspecoes/inspecao.routes.ts
import { Router as Router3 } from "express";
var inspecaoRoutes = Router3();
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}
function parsePontosCriticos(value) {
  if (value === void 0 || value === null) return [];
  if (!Array.isArray(value)) {
    throw new AppError("pontosCriticos deve ser um array", 400, "BAD_REQUEST");
  }
  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new AppError(`Ponto cr\xEDtico inv\xE1lido no \xEDndice ${index}`, 400, "BAD_REQUEST");
    }
    const categoria = asTrimmedString(item.categoria);
    const localizacao = asTrimmedString(item.localizacao);
    const descricao = asTrimmedString(item.descricao);
    const severidade = asTrimmedString(item.severidade);
    const procedimentoRecomendado = asTrimmedString(item.procedimentoRecomendado);
    if (!categoria || !localizacao || !descricao || !procedimentoRecomendado) {
      throw new AppError(`Ponto cr\xEDtico inv\xE1lido no \xEDndice ${index}`, 400, "BAD_REQUEST");
    }
    if (!["LEVE", "MEDIA", "GRAVE"].includes(severidade)) {
      throw new AppError(`Ponto cr\xEDtico inv\xE1lido no \xEDndice ${index}`, 400, "BAD_REQUEST");
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
function parseCreateInspecao(body) {
  if (!isRecord(body)) {
    throw new AppError("Payload inv\xE1lido", 400, "BAD_REQUEST");
  }
  const frotaId = asTrimmedString(body.frotaId);
  const numeroFrota = asTrimmedString(body.numeroFrota);
  const placa = asTrimmedString(body.placa);
  const tipoEquipamento = asTrimmedString(body.tipoEquipamento);
  const dataInspecao = asTrimmedString(body.dataInspecao);
  const tipoInspecao = asTrimmedString(body.tipoInspecao);
  const status = asTrimmedString(body.status);
  const observacoesGerais = typeof body.observacoesGerais === "string" ? body.observacoesGerais.trim() : null;
  const nomeInspetor = asTrimmedString(body.nomeInspetor);
  const pontosCriticos = parsePontosCriticos(body.pontosCriticos);
  if (!numeroFrota || !placa || !tipoEquipamento || !dataInspecao || !tipoInspecao || !status) {
    throw new AppError("Campos obrigat\xF3rios ausentes", 400, "BAD_REQUEST");
  }
  if (!["ANTES_LAVAGEM", "APOS_LAVAGEM"].includes(tipoInspecao)) {
    throw new AppError("tipoInspecao inv\xE1lido", 400, "BAD_REQUEST");
  }
  if (!["APROVADO", "REPROVADO", "COM_OBSERVACAO"].includes(status)) {
    throw new AppError("status inv\xE1lido", 400, "BAD_REQUEST");
  }
  const parsedDate = new Date(dataInspecao);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError("dataInspecao inv\xE1lida", 400, "BAD_REQUEST");
  }
  return {
    frotaId: frotaId || void 0,
    numeroFrota,
    placa,
    tipoEquipamento,
    dataInspecao: parsedDate.toISOString(),
    tipoInspecao,
    status,
    observacoesGerais,
    nomeInspetor,
    pontosCriticos
  };
}
function formatInspecao(inspecao) {
  return {
    id: inspecao.id,
    frotaId: inspecao.frotaId,
    frota: inspecao.frota ? {
      id: inspecao.frota.id,
      numeroFrota: inspecao.frota.numeroFrota,
      placa: inspecao.frota.placa,
      tipoEquipamento: inspecao.frota.tipoEquipamento,
      material: inspecao.frota.material,
      capacidade: inspecao.frota.capacidade,
      observacoesFixas: inspecao.frota.observacoesFixas,
      createdAt: inspecao.frota.createdAt.toISOString(),
      updatedAt: inspecao.frota.updatedAt.toISOString()
    } : null,
    dataInspecao: inspecao.dataInspecao.toISOString(),
    tipoInspecao: inspecao.tipoInspecao,
    status: inspecao.status,
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
function buildRecorrencia(inspecoes) {
  const mapa = /* @__PURE__ */ new Map();
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
  const mensagemResumo = itensRecorrentes.length > 0 ? `Aten\xE7\xE3o: esta frota possui recorr\xEAncia de ${itensRecorrentes[0].categoria} na regi\xE3o de ${itensRecorrentes[0].localizacao}.` : "Nenhuma recorr\xEAncia relevante identificada no hist\xF3rico da frota.";
  return {
    itensRecorrentes,
    mensagemResumo
  };
}
inspecaoRoutes.get("/", async (req, res, next) => {
  try {
    const search = asTrimmedString(req.query.search);
    const inspecoes = await prisma.inspecao.findMany({
      where: search ? {
        OR: [
          { frota: { numeroFrota: { contains: search, mode: "insensitive" } } },
          { frota: { placa: { contains: search, mode: "insensitive" } } },
          { dataInspecao: { equals: new Date(search) } }
        ]
      } : void 0,
      orderBy: {
        dataInspecao: "desc"
      },
      include: {
        frota: true,
        pontosCriticos: true
      }
    });
    return res.json({
      inspecoes: inspecoes.map(
        (inspecao) => formatInspecao({
          ...inspecao,
          pontosCriticos: inspecao.pontosCriticos
        })
      )
    });
  } catch (error) {
    return next(error);
  }
});
inspecaoRoutes.post("/", async (req, res, next) => {
  try {
    const payload = parseCreateInspecao(req.body);
    let frota = payload.frotaId ? await prisma.frota.findUnique({
      where: { id: payload.frotaId }
    }) : null;
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
          capacidade: "N\xE3o informado",
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
    const inspecao = await prisma.$transaction(async (tx) => {
      const created = await tx.inspecao.create({
        data: {
          frotaId: frota.id,
          dataInspecao: new Date(payload.dataInspecao),
          tipoInspecao: payload.tipoInspecao,
          status: payload.status,
          observacoesGerais: payload.observacoesGerais,
          nomeInspetor: payload.nomeInspetor
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
      throw new AppError("Falha ao criar inspe\xE7\xE3o", 500, "INTERNAL_SERVER_ERROR");
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
      throw new AppError("Frota n\xE3o encontrada", 404, "NOT_FOUND");
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
      throw new AppError("Frota n\xE3o encontrada", 404, "NOT_FOUND");
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
        pontosCriticos: {
          include: {
            fotos: true
          }
        },
        fotos: true
      }
    });
    if (!inspecao) {
      throw new AppError("Inspe\xE7\xE3o n\xE3o encontrada", 404, "NOT_FOUND");
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
      throw new AppError("Frota n\xE3o encontrada", 404, "NOT_FOUND");
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
      throw new AppError("Inspe\xE7\xE3o n\xE3o encontrada", 404, "NOT_FOUND");
    }
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      throw new AppError("Payload inv\xE1lido", 400, "BAD_REQUEST");
    }
    const data = {};
    if (typeof payload.observacoesGerais === "string") {
      data.observacoesGerais = payload.observacoesGerais.trim();
    } else if (payload.observacoesGerais === null) {
      data.observacoesGerais = null;
    }
    if (typeof payload.dataInspecao === "string" && payload.dataInspecao.trim()) {
      const parsedDate = new Date(payload.dataInspecao);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new AppError("dataInspecao inv\xE1lida", 400, "BAD_REQUEST");
      }
      data.dataInspecao = parsedDate;
    }
    const pontosCriticosInput = payload.pontosCriticos;
    if (pontosCriticosInput !== void 0) {
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
      throw new AppError("Inspe\xE7\xE3o n\xE3o encontrada", 404, "NOT_FOUND");
    }
    await prisma.inspecao.delete({
      where: { id: req.params.id }
    });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

// src/server/modules/fotos/foto.routes.ts
import { Router as Router4 } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
var fotoRoutes = Router4();
var uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
var storage = multer.memoryStorage();
var upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 20
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new AppError("Somente arquivos de imagem s\xE3o permitidos", 400, "BAD_REQUEST"));
      return;
    }
    cb(null, true);
  }
});
function normalizeArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? ""));
  if (value === void 0 || value === null) return [];
  return [String(value)];
}
function buildCompressedFileName(originalName) {
  const parsed = path.parse(originalName);
  const baseName = (parsed.name || "foto").replace(/[^\w.-]+/g, "_");
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}.jpg`;
}
async function compressAndSaveImage(file) {
  const filename = buildCompressedFileName(file.originalname);
  const filePath = path.join(uploadsDir, filename);
  await sharp(file.buffer).rotate().resize({
    width: 1600,
    height: 1600,
    fit: "inside",
    withoutEnlargement: true
  }).jpeg({
    quality: 72,
    mozjpeg: true
  }).toFile(filePath);
  return {
    filename,
    filePath
  };
}
function removeFiles(filePaths) {
  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
fotoRoutes.post(
  "/inspecoes/:id/fotos",
  upload.array("files[]", 20),
  async (req, res, next) => {
    try {
      const inspecao = await prisma.inspecao.findUnique({
        where: { id: req.params.id }
      });
      if (!inspecao) {
        throw new AppError("Inspe\xE7\xE3o n\xE3o encontrada", 404, "NOT_FOUND");
      }
      const files = req.files ?? [];
      if (files.length === 0) {
        throw new AppError("Nenhuma imagem enviada", 400, "BAD_REQUEST");
      }
      const legendas = normalizeArray(req.body.legenda);
      const pontoCriticoIds = normalizeArray(req.body.pontoCriticoId);
      const compressedFiles = [];
      try {
        for (const file of files) {
          compressedFiles.push(await compressAndSaveImage(file));
        }
        const fotos = await prisma.$transaction(async (tx) => {
          const created = [];
          for (let index = 0; index < files.length; index += 1) {
            const file = files[index];
            const compressedFile = compressedFiles[index];
            const legenda = legendas[index] ? legendas[index].trim() : null;
            const pontoCriticoId = pontoCriticoIds[index] ? pontoCriticoIds[index].trim() : null;
            const foto = await tx.fotoInspecao.create({
              data: {
                inspecaoId: req.params.id,
                pontoCriticoId: pontoCriticoId || null,
                imageUrl: `/uploads/${compressedFile.filename}`,
                fileName: file.originalname,
                legenda
              }
            });
            created.push(foto);
          }
          return created;
        });
        return res.status(201).json({
          fotos: fotos.map((foto) => ({
            id: foto.id,
            inspecaoId: foto.inspecaoId,
            pontoCriticoId: foto.pontoCriticoId,
            imageUrl: foto.imageUrl,
            fileName: foto.fileName,
            legenda: foto.legenda,
            createdAt: foto.createdAt.toISOString()
          }))
        });
      } catch (error) {
        removeFiles(compressedFiles.map((file) => file.filePath));
        throw error;
      }
    } catch (error) {
      return next(error);
    }
  }
);
fotoRoutes.delete("/fotos/:fotoId", async (req, res, next) => {
  try {
    const foto = await prisma.fotoInspecao.findUnique({
      where: { id: req.params.fotoId }
    });
    if (!foto) {
      throw new AppError("Foto n\xE3o encontrada", 404, "NOT_FOUND");
    }
    const filePath = path.resolve(process.cwd(), foto.imageUrl.replace(/^\//, ""));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await prisma.fotoInspecao.delete({
      where: { id: req.params.fotoId }
    });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// src/server/index.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path2.resolve(__dirname, "../../uploads")));
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/auth", authRoutes);
app.use("/api/frotas", frotaRoutes);
app.use("/api/inspecoes", inspecaoRoutes);
app.use("/api", fotoRoutes);
app.use(errorHandler);
var port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
export {
  app
};
