import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth";

export type UserRole = "INSPETOR" | "GESTOR";
export type Permission =
  | "yard:view"
  | "yard:search"
  | "yard:update"
  | "yard:history"
  | "yard:stale";

const rolePermissions: Record<UserRole, ReadonlySet<Permission>> = {
  INSPETOR: new Set(["yard:view", "yard:search", "yard:update", "yard:history"]),
  GESTOR: new Set(["yard:view", "yard:search", "yard:update", "yard:history", "yard:stale"])
};

export function normalizeUserRole(value?: string | null): UserRole {
  const normalized = (value ?? "INSPETOR").toUpperCase();
  return normalized === "GESTOR" ? "GESTOR" : "INSPETOR";
}

export function requireRole(requiredRole: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Usuário não autenticado",
        code: "UNAUTHORIZED"
      });
    }

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

export function hasPermission(role: string | null | undefined, permission: Permission) {
  const normalized = role?.toUpperCase();
  if (normalized !== "INSPETOR" && normalized !== "GESTOR") return false;
  return rolePermissions[normalized].has(permission);
}

export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Usuário não autenticado",
        code: "UNAUTHORIZED"
      });
    }

    if (!hasPermission(req.user?.role, permission)) {
      return res.status(403).json({
        message: "Você não tem permissão para realizar esta ação.",
        code: "FORBIDDEN"
      });
    }

    return next();
  };
}
