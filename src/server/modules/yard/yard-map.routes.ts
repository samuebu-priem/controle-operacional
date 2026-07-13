import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { prisma } from "../../lib/prisma";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";
import { requirePermission } from "../../middleware/permissions";
import { createEmptyYardMapDocument } from "../../../shared/yardMapConfig";
import { validateYardMapDocument } from "../../../shared/yardGeometry";

export const yardMapRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => file.mimetype.startsWith("image/") ? callback(null, true) : callback(new AppError("O arquivo deve ser uma imagem.", 400, "INVALID_IMAGE"))
});

function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof AppError) return next(error);
    const message = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE" ? "A imagem deve ter no máximo 12 MB." : "Não foi possível processar a imagem.";
    return next(new AppError(message, 400, "INVALID_IMAGE"));
  });
}

function cleanText(value: unknown, maximum = 100) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maximum) : "";
}

function branchValue(value: unknown) {
  const branch = cleanText(value, 40).toUpperCase().replace(/\s+/g, "_");
  if (!/^[A-Z0-9_-]{2,40}$/.test(branch)) throw new AppError("Código da filial inválido.", 400, "BAD_REQUEST");
  return branch;
}

yardMapRoutes.use(requireAuth);

yardMapRoutes.get("/", requirePermission("yard:view"), async (_req, res, next) => {
  try {
    const maps = await prisma.yardMap.findMany({
      select: { id: true, branch: true, name: true, revision: true, createdAt: true, updatedAt: true },
      orderBy: { name: "asc" }
    });
    return res.json({ maps });
  } catch (error) {
    return next(error);
  }
});

yardMapRoutes.get("/:branch", requirePermission("yard:view"), async (req, res, next) => {
  try {
    const branch = branchValue(req.params.branch);
    const map = await prisma.yardMap.findUnique({
      where: { branch },
      include: { updatedBy: { select: { id: true, name: true, fullName: true } } }
    });
    if (!map) throw new AppError("Mapa da filial não encontrado.", 404, "NOT_FOUND");
    return res.json({ map });
  } catch (error) {
    return next(error);
  }
});

yardMapRoutes.post("/", requirePermission("yard:map-edit"), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) throw new AppError("Usuário não autenticado.", 401, "UNAUTHORIZED");
    const branch = branchValue(req.body?.branch);
    const name = cleanText(req.body?.name, 120);
    if (!name) throw new AppError("Nome do mapa é obrigatório.", 400, "BAD_REQUEST");
    const existing = await prisma.yardMap.findUnique({ where: { branch }, select: { id: true } });
    if (existing) throw new AppError("Já existe um mapa para esta filial.", 409, "MAP_ALREADY_EXISTS");
    const document = req.body?.document ? validateYardMapDocument(req.body.document) : createEmptyYardMapDocument();
    const map = await prisma.yardMap.create({
      data: { branch, name, document, createdById: authReq.user.id, updatedById: authReq.user.id }
    });
    return res.status(201).json({ map });
  } catch (error) {
    return next(error);
  }
});

yardMapRoutes.put("/:id", requirePermission("yard:map-edit"), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) throw new AppError("Usuário não autenticado.", 401, "UNAUTHORIZED");
    const revision = Number(req.body?.revision);
    if (!Number.isInteger(revision) || revision < 1) throw new AppError("Revisão do mapa inválida.", 400, "BAD_REQUEST");
    const document = validateYardMapDocument(req.body?.document);
    const name = cleanText(req.body?.name, 120);
    const result = await prisma.yardMap.updateMany({
      where: { id: req.params.id, revision },
      data: { document, ...(name ? { name } : {}), updatedById: authReq.user.id, revision: { increment: 1 } }
    });
    if (result.count === 0) throw new AppError("O mapa foi alterado por outro usuário. Recarregue antes de salvar.", 409, "REVISION_CONFLICT");
    const map = await prisma.yardMap.findUnique({ where: { id: req.params.id } });
    return res.json({ map });
  } catch (error) {
    return next(error);
  }
});

yardMapRoutes.post("/:id/reference-image", requirePermission("yard:map-edit"), handleImageUpload, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) throw new AppError("Usuário não autenticado.", 401, "UNAUTHORIZED");
    if (!req.file) throw new AppError("Selecione uma imagem válida.", 400, "BAD_REQUEST");
    const map = await prisma.yardMap.findUnique({ where: { id: req.params.id } });
    if (!map) throw new AppError("Mapa não encontrado.", 404, "NOT_FOUND");
    const document = validateYardMapDocument(map.document);
    const directory = path.resolve(process.cwd(), "uploads", "yard-maps");
    await mkdir(directory, { recursive: true });
    const fileName = `${map.branch.toLowerCase()}-${randomUUID()}.jpg`;
    await sharp(req.file.buffer).rotate().resize({ width: 4096, height: 4096, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toFile(path.join(directory, fileName));
    const nextDocument = {
      ...document,
      settings: { ...document.settings, background: { ...document.settings.background, url: `/uploads/yard-maps/${fileName}`, visible: true } }
    };
    const updated = await prisma.yardMap.update({
      where: { id: map.id },
      data: { document: nextDocument, updatedById: authReq.user.id, revision: { increment: 1 } }
    });
    return res.json({ map: updated });
  } catch (error) {
    return next(error);
  }
});
