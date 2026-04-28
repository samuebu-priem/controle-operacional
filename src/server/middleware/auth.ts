import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "../lib/jwt.js";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Token de autenticação ausente",
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
      message: "Token inválido ou expirado",
      code: "UNAUTHORIZED"
    });
  }
}
