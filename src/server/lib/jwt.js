import jwt from "jsonwebtoken";
const fallbackSecret = "dev-only-secret-change-in-production";
function getSecret() {
    return process.env.JWT_SECRET || fallbackSecret;
}
export function signAuthToken(payload) {
    return jwt.sign(payload, getSecret(), {
        expiresIn: "12h"
    });
}
export function verifyAuthToken(token) {
    const decoded = jwt.verify(token, getSecret());
    if (!decoded?.sub || !decoded?.name || !decoded?.email) {
        throw new Error("Invalid token payload");
    }
    return {
        sub: decoded.sub,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role
    };
}
