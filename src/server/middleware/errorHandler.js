export class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode = 500, code, details) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}
export function errorHandler(err, _req, res, _next) {
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
