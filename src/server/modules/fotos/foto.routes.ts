import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";

export const fotoRoutes = Router();

const uploadsDir = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 80 * 1024 * 1024,
    files: 20
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("video/")) {
      cb(new AppError("Somente arquivos de imagem ou video sao permitidos", 400, "BAD_REQUEST") as unknown as Error);
      return;
    }

    cb(null, true);
  }
});

function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item ?? ""));
  if (value === undefined || value === null) return [];
  return [String(value)];
}

function buildCompressedFileName(originalName: string) {
  const parsed = path.parse(originalName);
  const baseName = (parsed.name || "foto").replace(/[^\w.-]+/g, "_");
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}.jpg`;
}

function buildMediaFileName(originalName: string, extension?: string) {
  const parsed = path.parse(originalName);
  const baseName = (parsed.name || "midia").replace(/[^\w.-]+/g, "_");
  const ext = (extension || parsed.ext || ".bin").toLowerCase();
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}${ext.startsWith(".") ? ext : `.${ext}`}`;
}

async function compressAndSaveImage(file: Express.Multer.File) {
  const filename = buildCompressedFileName(file.originalname);
  const filePath = path.join(uploadsDir, filename);

  await sharp(file.buffer)
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({
      quality: 72,
      mozjpeg: true
    })
    .toFile(filePath);

  return {
    filename,
    filePath
  };
}

function runFfmpeg(inputPath: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-vf",
      "scale=min(1280\\,iw):-2",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "28",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputPath
    ], {
      windowsHide: true,
      stdio: "ignore"
    });

    ffmpeg.once("error", reject);
    ffmpeg.once("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error("Falha ao comprimir video"));
      }
    });
  });
}

async function saveVideo(file: Express.Multer.File) {
  const originalFilename = buildMediaFileName(file.originalname);
  const originalPath = path.join(uploadsDir, originalFilename);
  await fs.promises.writeFile(originalPath, file.buffer);

  const compressedFilename = buildMediaFileName(file.originalname, ".mp4");
  const compressedPath = path.join(uploadsDir, compressedFilename);

  try {
    await runFfmpeg(originalPath, compressedPath);
    await fs.promises.unlink(originalPath).catch(() => undefined);
    return {
      filename: compressedFilename,
      filePath: compressedPath
    };
  } catch {
    await fs.promises.unlink(compressedPath).catch(() => undefined);
    return {
      filename: originalFilename,
      filePath: originalPath
    };
  }
}

async function processAndSaveMedia(file: Express.Multer.File) {
  if (file.mimetype.startsWith("image/")) {
    return compressAndSaveImage(file);
  }

  return saveVideo(file);
}

function removeFiles(filePaths: string[]) {
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
        throw new AppError("Inspeção não encontrada", 404, "NOT_FOUND");
      }

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) {
        throw new AppError("Nenhum arquivo enviado", 400, "BAD_REQUEST");
      }

      const legendas = normalizeArray(req.body.legenda);
      const pontoCriticoIds = normalizeArray(req.body.pontoCriticoId);
      const compressedFiles: Array<{ filename: string; filePath: string }> = [];

      try {
        for (const file of files) {
          compressedFiles.push(await processAndSaveMedia(file));
        }

        const fotos = await prisma.$transaction(async (tx: typeof prisma) => {
          const created: Array<{
            id: string;
            inspecaoId: string;
            pontoCriticoId: string | null;
            imageUrl: string;
            fileName: string;
            legenda: string | null;
            createdAt: Date;
          }> = [];

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
          fotos: fotos.map((foto: {
            id: string;
            inspecaoId: string;
            pontoCriticoId: string | null;
            imageUrl: string;
            fileName: string;
            legenda: string | null;
            createdAt: Date;
          }) => ({
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
  } catch (error) {
    return next(error);
  }
});
