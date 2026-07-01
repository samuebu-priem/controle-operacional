import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { signAuthToken } from "../../lib/jwt";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";

export const authRoutes = Router();

function getEffectiveRole(user: { role?: string | null }) {
  const normalizedRole = (user.role ?? "INSPETOR").toUpperCase();
  return normalizedRole === "GESTOR" ? "GESTOR" : "INSPETOR";
}

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

    const role = getEffectiveRole(user);
    const token = signAuthToken({
      sub: user.id,
      name: user.name,
      email: user.email,
      role
    });

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        fullName: user.fullName,
        jobTitle: user.jobTitle,
        email: user.email,
        role
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
        fullName: true,
        jobTitle: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "NOT_FOUND");
    }

    const role = getEffectiveRole(user);

    return res.json({
      user: {
        ...user,
        role
      }
    });
  } catch (error) {
    return next(error);
  }
});

authRoutes.patch("/me/profile", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      throw new AppError("UsuÃ¡rio nÃ£o autenticado", 401, "UNAUTHORIZED");
    }

    const { fullName, jobTitle } = req.body ?? {};

    if (typeof fullName !== "string" || typeof jobTitle !== "string") {
      throw new AppError("Nome completo e funÃ§Ã£o sÃ£o obrigatÃ³rios", 400, "BAD_REQUEST");
    }

    const cleanFullName = fullName.trim();
    const cleanJobTitle = jobTitle.trim();

    if (!cleanFullName || !cleanJobTitle) {
      throw new AppError("Nome completo e funÃ§Ã£o sÃ£o obrigatÃ³rios", 400, "BAD_REQUEST");
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
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const role = getEffectiveRole(user);

    return res.json({ user: { ...user, role } });
  } catch (error) {
    return next(error);
  }
});
