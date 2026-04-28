import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { signAuthToken } from "../../lib/jwt";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";

export const authRoutes = Router();

authRoutes.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      throw new AppError("E-mail e senha são obrigatórios", 400, "BAD_REQUEST");
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new AppError("Credenciais inválidas", 401, "UNAUTHORIZED");
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new AppError("Credenciais inválidas", 401, "UNAUTHORIZED");
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
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      throw new AppError("Usuário não autenticado", 401, "UNAUTHORIZED");
    }

    const user = await prisma.user.findUnique({
      where: { id: authReq.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "NOT_FOUND");
    }

    return res.json({
      user
    });
  } catch (error) {
    return next(error);
  }
});
