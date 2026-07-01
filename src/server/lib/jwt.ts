import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

const fallbackSecret = "dev-only-secret-change-in-production";

export interface AuthTokenPayload {
  sub: string;
  name: string;
  email: string;
  role?: string;
}

function getSecret() {
  return process.env.JWT_SECRET || fallbackSecret;
}

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getSecret(), {
    expiresIn: "12h"
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, getSecret()) as JwtPayload & AuthTokenPayload;

  if (!decoded?.sub || !decoded?.name || !decoded?.email) {
    throw new Error("Invalid token payload");
  }

  return {
    sub: decoded.sub,
    name: decoded.name,
    email: decoded.email
  };
}
