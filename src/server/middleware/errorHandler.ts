import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;

  constructor(message: string, statusCode = 500, code?: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
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
