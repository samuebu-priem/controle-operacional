import { verifyAuthToken } from "../lib/jwt.js";
export function requireAuth(req, res, next) {
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
    }
    catch {
        return res.status(401).json({
            message: "Token inválido ou expirado",
            code: "UNAUTHORIZED"
        });
    }
}
