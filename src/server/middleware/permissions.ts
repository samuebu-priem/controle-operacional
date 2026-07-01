import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth";

export type UserRole = "INSPETOR" | "GESTOR";

export function normalizeUserRole(value?: string | null): UserRole {
  const normalized = (value ?? "INSPETOR").toUpperCase();
  return normalized === "GESTOR" ? "GESTOR" : "INSPETOR";
}

export function requireRole(requiredRole: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const role = normalizeUserRole(req.user?.role);

    if (role !== requiredRole) {
      return res.status(403).json({
        message: "Acesso negado",
        code: "FORBIDDEN"
      });
    }

    return next();
  };
}

export const requireGestor = requireRole("GESTOR");
