import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
export const fotoRoutes = Router();
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const safeName = file.originalname.replace(/[^\w.-]+/g, "_");
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
    }
});
const upload = multer({
    storage,
    limits: {
        fileSize: 8 * 1024 * 1024,
        files: 20
    },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            cb(new AppError("Somente arquivos de imagem são permitidos", 400, "BAD_REQUEST"));
            return;
        }
        cb(null, true);
    }
});
function normalizeArray(value) {
    if (Array.isArray(value))
        return value.map((item) => String(item ?? ""));
    if (value === undefined || value === null)
        return [];
    return [String(value)];
}
fotoRoutes.post("/inspecoes/:id/fotos", upload.array("files[]", 20), async (req, res, next) => {
    try {
        const inspecao = await prisma.inspecao.findUnique({
            where: { id: req.params.id }
        });
        if (!inspecao) {
            throw new AppError("Inspeção não encontrada", 404, "NOT_FOUND");
        }
        const files = req.files ?? [];
        if (files.length === 0) {
            throw new AppError("Nenhuma imagem enviada", 400, "BAD_REQUEST");
        }
        const legendas = normalizeArray(req.body.legenda);
        const pontoCriticoIds = normalizeArray(req.body.pontoCriticoId);
        const fotos = await prisma.$transaction(async (tx) => {
            const created = [];
            for (let index = 0; index < files.length; index += 1) {
                const file = files[index];
                const legenda = legendas[index] ? legendas[index].trim() : null;
                const pontoCriticoId = pontoCriticoIds[index] ? pontoCriticoIds[index].trim() : null;
                const foto = await tx.fotoInspecao.create({
                    data: {
                        inspecaoId: req.params.id,
                        pontoCriticoId: pontoCriticoId || null,
                        imageUrl: `/uploads/${file.filename}`,
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
    }
    catch (error) {
        return next(error);
    }
});
fotoRoutes.delete("/fotos/:fotoId", async (req, res, next) => {
    try {
        const foto = await prisma.fotoInspecao.findUnique({
            where: { id: req.params.fotoId }
        });
        if (!foto) {
            throw new AppError("Foto não encontrada", 404, "NOT_FOUND");
        }
        const filePath = path.resolve(process.cwd(), foto.imageUrl.replace(/^\//, ""));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        await prisma.fotoInspecao.delete({
            where: { id: req.params.fotoId }
        });
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
});
