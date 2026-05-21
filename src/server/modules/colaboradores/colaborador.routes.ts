import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";

export const colaboradorRoutes = Router();

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatColaborador(colaborador: {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...colaborador,
    createdAt: colaborador.createdAt.toISOString(),
    updatedAt: colaborador.updatedAt.toISOString()
  };
}

colaboradorRoutes.get("/", async (req, res, next) => {
  try {
    const search = asTrimmedString(req.query.search);
    const colaboradores = await prisma.collaborator.findMany({
      where: search ? { nome: { contains: search, mode: "insensitive" } } : undefined,
      orderBy: [{ ativo: "desc" }, { nome: "asc" }]
    });

    return res.json({ colaboradores: colaboradores.map(formatColaborador) });
  } catch (error) {
    return next(error);
  }
});

colaboradorRoutes.post("/", async (req, res, next) => {
  try {
    const nome = asTrimmedString(req.body?.nome);
    if (!nome) throw new AppError("Nome é obrigatório", 400, "BAD_REQUEST");

    const colaborador = await prisma.collaborator.create({
      data: {
        nome,
        ativo: typeof req.body?.ativo === "boolean" ? req.body.ativo : true
      }
    });

    return res.status(201).json({ colaborador: formatColaborador(colaborador) });
  } catch (error) {
    return next(error);
  }
});

colaboradorRoutes.patch("/:id", async (req, res, next) => {
  try {
    const data: Record<string, unknown> = {};
    if (typeof req.body?.nome === "string") {
      const nome = req.body.nome.trim();
      if (!nome) throw new AppError("Nome é obrigatório", 400, "BAD_REQUEST");
      data.nome = nome;
    }
    if (typeof req.body?.ativo === "boolean") data.ativo = req.body.ativo;

    const colaborador = await prisma.collaborator.update({
      where: { id: req.params.id },
      data
    });

    return res.json({ colaborador: formatColaborador(colaborador) });
  } catch (error) {
    return next(error);
  }
});
